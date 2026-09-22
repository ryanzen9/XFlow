import { afterAll, beforeEach, expect, test } from "bun:test";
import {
  EMPTY_ACTIVITY_DATA,
  localDayKey,
  normalizeSettings,
  synchronizeWithS3,
  type ActivityEvent,
  type ConfigurationDocument,
  type S3SyncSettings,
} from "../../shared";

const originalChrome = globalThis.chrome;
const originalFetch = globalThis.fetch;
let storage: Record<string, unknown> = {};
let requests: { url: string; method: string; headers: Headers; body?: string }[] = [];
let remote: ConfigurationDocument | null = null;

const settings: S3SyncSettings = {
  autoSyncEnabled: true,
  endpoint: "https://s3.example.com",
  region: "us-east-1",
  bucket: "private-config",
  objectKey: "xfilter/config.json",
  accessKeyId: "access",
  secretAccessKey: "secret",
  sessionToken: "",
};

const documentAt = (version: number, nickname: string): ConfigurationDocument => ({
  schemaVersion: 1,
  configVersion: version,
  updatedAt: `2026-09-${String(Math.min(version, 28)).padStart(2, "0")}T00:00:00.000Z`,
  config: { ...normalizeSettings({}), modelNickname: nickname, strategies: [] },
  activity: EMPTY_ACTIVITY_DATA,
});

const activityEvent = (id: string, deviceId: string): ActivityEvent => {
  const filteredAt = Date.UTC(2026, 8, 22, 4);
  return {
    id,
    contentId: id,
    day: localDayKey(filteredAt),
    filteredAt,
    updatedAt: filteredAt,
    deviceId,
    surface: "timeline",
    status: "filtered",
  };
};

beforeEach(() => {
  storage = {};
  requests = [];
  remote = null;
  globalThis.chrome = {
    permissions: { contains: async () => true, request: async () => true },
    storage: {
      local: {
        get: async (keys: any) => {
          if (keys === null) return { ...storage };
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.map((key) => [key, storage[key]]));
        },
        set: async (patch: Record<string, unknown>) => {
          Object.assign(storage, patch);
        },
      },
    },
  } as unknown as typeof chrome;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    requests.push({
      url: input.toString(),
      method,
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    if (method === "GET")
      return remote
        ? new Response(JSON.stringify(remote), { status: 200, headers: { "content-type": "application/json" } })
        : new Response("missing", { status: 404 });
    remote = JSON.parse(String(init?.body)) as ConfigurationDocument;
    return new Response("", { status: 200 });
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
  globalThis.fetch = originalFetch;
});

test("pushes the local document when it has the newer version", async () => {
  Object.assign(storage, documentAt(4, "Local").config, {
    configVersion: 4,
    configUpdatedAt: documentAt(4, "Local").updatedAt,
  });
  remote = documentAt(2, "Remote");
  const result = await synchronizeWithS3(settings);
  expect(result.direction).toBe("pushed");
  expect(remote?.configVersion).toBe(4);
  expect(requests.map((request) => request.method)).toEqual(["GET", "PUT"]);
  expect(requests[1]?.url).toBe("https://s3.example.com/private-config/xfilter/config.json");
  expect(requests[1]?.headers.get("authorization")).toStartWith("AWS4-HMAC-SHA256 Credential=access/");
});

test("pulls and applies the remote document when it has the newer version", async () => {
  Object.assign(storage, documentAt(2, "Local").config, {
    configVersion: 2,
    configUpdatedAt: documentAt(2, "Local").updatedAt,
  });
  remote = {
    ...documentAt(8, "Remote"),
    config: { ...documentAt(8, "Remote").config, apiKey: "sk-or-legacy-remote" },
  } as ConfigurationDocument;
  const result = await synchronizeWithS3(settings);
  expect(result.direction).toBe("pulled");
  expect(storage.configVersion).toBe(8);
  expect(storage.modelNickname).toBe("Remote");
  expect(requests.map((request) => request.method)).toEqual(["GET", "PUT"]);
  expect(remote?.schemaVersion).toBe(3);
  expect(JSON.stringify(remote)).not.toContain("sk-or-legacy-remote");
  expect((storage.providerSecrets as { openrouter: string }).openrouter).toBe("sk-or-legacy-remote");
});

test("pushes the local document when the remote object does not exist", async () => {
  Object.assign(storage, documentAt(1, "First").config, {
    configVersion: 1,
    configUpdatedAt: documentAt(1, "First").updatedAt,
  });
  const result = await synchronizeWithS3(settings);
  expect(result.direction).toBe("pushed");
  expect(remote?.configVersion).toBe(1);
});

test("sanitizes an equal-version legacy document while preserving its key locally", async () => {
  Object.assign(storage, documentAt(4, "Local").config, {
    configVersion: 4,
    configUpdatedAt: documentAt(4, "Local").updatedAt,
  });
  remote = {
    ...documentAt(4, "Local"),
    config: { ...documentAt(4, "Local").config, apiKey: "sk-or-equal-legacy" },
  } as ConfigurationDocument;
  const result = await synchronizeWithS3(settings);
  expect(result.direction).toBe("pushed");
  expect(requests.map((request) => request.method)).toEqual(["GET", "PUT"]);
  expect((storage.providerSecrets as { openrouter: string }).openrouter).toBe("sk-or-equal-legacy");
  expect(JSON.stringify(remote)).not.toContain("sk-or-equal-legacy");
});

test("automatic sync never opens a permission prompt", async () => {
  let permissionRequested = false;
  globalThis.chrome.permissions = {
    contains: async () => false,
    request: async () => {
      permissionRequested = true;
      return true;
    },
  } as unknown as typeof chrome.permissions;
  Object.assign(storage, documentAt(1, "Local").config, {
    configVersion: 1,
    configUpdatedAt: documentAt(1, "Local").updatedAt,
  });
  await expect(synchronizeWithS3(settings, { allowPermissionRequest: false })).rejects.toThrow("访问权限尚未授予");
  expect(permissionRequested).toBeFalse();
  expect(requests).toHaveLength(0);
});

test("merges multi-device activity by stable event id without double counting", async () => {
  Object.assign(storage, documentAt(4, "Same").config, {
    configVersion: 4,
    configUpdatedAt: documentAt(4, "Same").updatedAt,
    activityData: {
      schemaVersion: 1,
      clearedAt: 0,
      events: [activityEvent("x:shared", "a"), activityEvent("x:local", "a")],
    },
  });
  remote = {
    ...documentAt(4, "Same"),
    activity: {
      schemaVersion: 1,
      clearedAt: 0,
      events: [activityEvent("x:shared", "b"), activityEvent("x:remote", "b")],
    },
  };
  const result = await synchronizeWithS3(settings);
  expect(result.document.activity.events.map(({ id }) => id).toSorted()).toEqual(["x:local", "x:remote", "x:shared"]);
  expect(remote?.activity.events).toHaveLength(3);
  expect((storage.activityData as { events: unknown[] }).events).toHaveLength(3);
});

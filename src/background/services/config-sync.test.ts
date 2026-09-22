import { afterAll, beforeEach, expect, test } from "bun:test";
import { EMPTY_ACTIVITY_DATA, normalizeSettings, type ConfigurationDocument, type S3SyncSettings } from "../../shared";
import { runAutomaticSync } from "./config-sync";

const originalChrome = globalThis.chrome;
const originalFetch = globalThis.fetch;
let storage: Record<string, unknown> = {};
let fetchCount = 0;
let permissionRequested = false;

const s3: S3SyncSettings = {
  autoSyncEnabled: true,
  endpoint: "https://s3.example.com",
  region: "us-east-1",
  bucket: "private",
  objectKey: "xflow/config.json",
  accessKeyId: "access",
  secretAccessKey: "secret",
  sessionToken: "",
};

const remote: ConfigurationDocument = {
  schemaVersion: 1,
  configVersion: 5,
  updatedAt: "2026-09-21T05:00:00.000Z",
  config: { ...normalizeSettings({}), modelNickname: "Remote", strategies: [] },
  activity: EMPTY_ACTIVITY_DATA,
};

beforeEach(() => {
  fetchCount = 0;
  permissionRequested = false;
  storage = { ...normalizeSettings({}), configVersion: 2, configUpdatedAt: "2026-09-21T02:00:00.000Z", s3Sync: s3 };
  globalThis.chrome = {
    permissions: {
      contains: async () => true,
      request: async () => {
        permissionRequested = true;
        return true;
      },
    },
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
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(JSON.stringify(remote), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
  globalThis.fetch = originalFetch;
});

test("automatic sync stays idle until explicitly enabled", async () => {
  storage.s3Sync = { ...s3, autoSyncEnabled: false };
  expect(await runAutomaticSync()).toBeNull();
  expect(fetchCount).toBe(0);
});

test("automatic sync pulls newer remote config without requesting permission", async () => {
  const result = await runAutomaticSync();
  expect(result?.direction).toBe("pulled");
  expect(storage.configVersion).toBe(5);
  expect(storage.modelNickname).toBe("Remote");
  expect(fetchCount).toBe(2);
  expect(permissionRequested).toBeFalse();
});

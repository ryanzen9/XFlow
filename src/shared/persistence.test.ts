import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  applyEditedConfiguration,
  applyRemoteConfiguration,
  readConfigurationDocument,
  saveS3SyncSettings,
  writeVersionedSettings,
} from "./persistence";
import { normalizeSettings } from "./strategy";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown> = {};

function valuesFor(keys: string | string[] | Record<string, unknown> | null): Record<string, unknown> {
  if (keys === null) return { ...storage };
  if (typeof keys === "string") return { [keys]: storage[keys] };
  if (Array.isArray(keys)) return Object.fromEntries(keys.map((key) => [key, storage[key]]));
  return {
    ...keys,
    ...Object.fromEntries(
      Object.keys(keys)
        .filter((key) => key in storage)
        .map((key) => [key, storage[key]]),
    ),
  };
}

beforeEach(() => {
  storage = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: any) => valuesFor(keys),
        set: async (patch: Record<string, unknown>) => {
          Object.assign(storage, patch);
        },
      },
    },
  } as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

describe("versioned configuration persistence", () => {
  test("increments the local version for every application settings write", async () => {
    await writeVersionedSettings({ enabled: false });
    expect(storage.configVersion).toBe(1);
    await writeVersionedSettings({ modelNickname: "Local model" });
    expect(storage.configVersion).toBe(2);
    expect((await readConfigurationDocument()).config.modelNickname).toBe("Local model");
  });

  test("JSON editing normalizes configuration and owns the next local version", async () => {
    storage.configVersion = 7;
    const next = await applyEditedConfiguration({
      configVersion: 999,
      ...normalizeSettings({}),
      modelNickname: "Edited",
      strategies: [],
    });
    expect(next.configVersion).toBe(8);
    expect(next.config.modelNickname).toBe("Edited");
    expect(next.config.strategies).toEqual([]);
    expect(storage.schemaVersion).toBeUndefined();
    expect(storage.updatedAt).toBeUndefined();
  });

  test("a remote pull preserves the remote version and local-only S3 credentials", async () => {
    await saveS3SyncSettings({
      autoSyncEnabled: true,
      endpoint: "https://s3.example.com",
      region: "us-east-1",
      bucket: "private",
      objectKey: "config.json",
      accessKeyId: "id",
      secretAccessKey: "secret",
      sessionToken: "",
    });
    const remote = {
      schemaVersion: 1,
      configVersion: 12,
      updatedAt: "2026-09-21T00:00:00.000Z",
      config: { ...normalizeSettings({}), modelNickname: "Remote", strategies: [] },
    };
    const applied = await applyRemoteConfiguration(remote);
    expect(applied.configVersion).toBe(12);
    expect(applied.config.modelNickname).toBe("Remote");
    expect((storage.s3Sync as { secretAccessKey: string }).secretAccessKey).toBe("secret");
  });
});

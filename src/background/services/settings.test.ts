import { afterAll, beforeEach, expect, test } from "bun:test";
import { initializeSettings } from "./settings";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown> = {};

beforeEach(() => {
  storage = {};
  globalThis.chrome = {
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
  } as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

test("initial install persists switches and the first configuration version", async () => {
  await initializeSettings();
  expect(storage).toMatchObject({ enabled: true, commentsEnabled: false, theme: "light", configVersion: 1 });
  expect(typeof storage.configUpdatedAt).toBe("string");
});

test("upgrade adds a stored version without changing existing switches", async () => {
  storage = { enabled: false, commentsEnabled: true };
  await initializeSettings();
  expect(storage).toMatchObject({ enabled: false, commentsEnabled: true, theme: "light", configVersion: 1 });
});

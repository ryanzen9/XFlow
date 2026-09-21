import { afterAll, beforeEach, expect, test } from "bun:test";
import { initializeStorageAccess } from "./public-settings";

const originalChrome = globalThis.chrome;
let localAccess = "";
let sessionAccess = "";
let session: Record<string, unknown> = {};
let local: Record<string, unknown> = {};

beforeEach(() => {
  localAccess = "";
  sessionAccess = "";
  session = {};
  local = {
    apiKey: undefined,
    activeProvider: "typesafe",
    providerSecrets: { openrouter: "", "vercel-ai-gateway": "", typesafe: "private-key" },
    enabled: true,
    commentsEnabled: false,
    modelNickname: "Jev",
    strategies: [],
  };
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: null | string[]) => {
          if (keys === null) return { ...local };
          return Object.fromEntries(keys.map((key) => [key, local[key]]));
        },
        set: async (patch: Record<string, unknown>) => Object.assign(local, patch),
        remove: async (key: string) => delete local[key],
        setAccessLevel: async ({ accessLevel }: { accessLevel: string }) => {
          localAccess = accessLevel;
        },
      },
      session: {
        set: async (patch: Record<string, unknown>) => Object.assign(session, patch),
        setAccessLevel: async ({ accessLevel }: { accessLevel: string }) => {
          sessionAccess = accessLevel;
        },
      },
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

test("keeps local secrets trusted-only and exposes only a safe session mirror", async () => {
  await initializeStorageAccess();
  expect(localAccess).toBe("TRUSTED_CONTEXTS");
  expect(sessionAccess).toBe("TRUSTED_AND_UNTRUSTED_CONTEXTS");
  expect(session).toMatchObject({ activeProvider: "typesafe", providerConfigured: true, strategies: [] });
  expect(JSON.stringify(session)).not.toContain("private-key");
  expect(session).not.toHaveProperty("providerSecrets");
});

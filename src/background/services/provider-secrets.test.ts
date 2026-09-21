import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { PROVIDER_SECRETS_KEY } from "../../shared";
import { getProviderSecrets, getProviderSummaries, migrateLegacyApiKey, saveProviderKey } from "./provider-secrets";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown> = {};

beforeEach(() => {
  storage = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, storage[key]])),
        set: async (patch: Record<string, unknown>) => {
          Object.assign(storage, patch);
        },
        remove: async (key: string) => {
          delete storage[key];
        },
      },
    },
  } as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

describe("provider secrets", () => {
  test("migrates the legacy apiKey without overwriting a newer OpenRouter key", async () => {
    storage.apiKey = "sk-or-legacy";
    await migrateLegacyApiKey();
    expect(storage.apiKey).toBeUndefined();
    expect((storage[PROVIDER_SECRETS_KEY] as Record<string, string>).openrouter).toBe("sk-or-legacy");

    storage.apiKey = "sk-or-stale";
    await migrateLegacyApiKey();
    expect((await getProviderSecrets()).openrouter).toBe("sk-or-legacy");
  });

  test("returns only masked metadata to extension pages", async () => {
    await saveProviderKey("typesafe", "typesafe-secret-1234");
    const summaries = await getProviderSummaries("typesafe");
    expect(summaries.find(({ id }) => id === "typesafe")).toMatchObject({
      configured: true,
      keyHint: "•••• 1234",
      active: true,
    });
    expect(JSON.stringify(summaries)).not.toContain("typesafe-secret");
  });
});

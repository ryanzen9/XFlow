import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { JevProvider, JevDecisionRequest } from "../jev/types";
import { checkProviderHealth } from "./provider-health";
import { resetJevRequestLogServiceForTests } from "./jev-request-log";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown>;

beforeEach(() => {
  storage = {};
  resetJevRequestLogServiceForTests();
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, storage[key]])),
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
      },
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

const secrets = { openrouter: "sk-or-secret", "vercel-ai-gateway": "", typesafe: "" };

function provider(evaluate: JevProvider["evaluate"]): JevProvider {
  return { id: "openrouter", modelId: "typesafe/jev-1.13", evaluate };
}

describe("provider health checks", () => {
  test("sends a minimal simulated request and records safe success metadata", async () => {
    let request: JevDecisionRequest | undefined;
    const base = Date.now();
    const times = [base, base + 42];
    const result = await checkProviderHealth(
      "openrouter",
      secrets,
      provider(async (next) => {
        request = next;
        return { health_check: 1 };
      }),
      () => times.shift()!,
    );

    expect(request?.questions).toHaveProperty("health_check");
    expect(result).toEqual({ providerId: "openrouter", healthy: true, checkedAt: base, latencyMs: 42 });
    expect(storage.jevRequestLog).toMatchObject({
      entries: [
        {
          kind: "health-check",
          providerId: "openrouter",
          status: "success",
          durationMs: 42,
          itemCount: 1,
          questionCount: 1,
        },
      ],
    });
    expect(JSON.stringify(storage.jevRequestLog)).not.toContain("sk-or-secret");
  });

  test("returns a locale-neutral auth failure and records no credential", async () => {
    const error = Object.assign(new Error("secret provider message"), { status: 401 });
    const base = Date.now();
    const times = [base, base + 7];
    const result = await checkProviderHealth(
      "openrouter",
      secrets,
      provider(async () => {
        throw error;
      }),
      () => times.shift()!,
    );

    expect(result).toEqual({
      providerId: "openrouter",
      healthy: false,
      checkedAt: base,
      latencyMs: 7,
      errorCode: "auth",
    });
    expect(storage.jevRequestLog).toMatchObject({ entries: [{ status: "error", errorCode: "auth" }] });
    expect(JSON.stringify(storage.jevRequestLog)).not.toContain("secret provider message");
    expect(JSON.stringify(storage.jevRequestLog)).not.toContain("sk-or-secret");
  });
});

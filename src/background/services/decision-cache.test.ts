import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { policyVersion } from "../../shared";
import { normalizeSettings } from "../../shared/strategy";
import { findLocalDecision, rememberJevDecision, resetDecisionCacheForTests, saveUserDecision } from "./decision-cache";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown>;

function valuesFor(keys: null | string | string[]): Record<string, unknown> {
  if (keys === null) return { ...storage };
  const list = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(list.map((key) => [key, storage[key]]));
}

beforeEach(() => {
  storage = {};
  resetDecisionCacheForTests();
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: null | string | string[]) => valuesFor(keys),
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
      },
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

describe("layered decision cache", () => {
  test("reuses exact results, isolates policies, and expires stale entries", async () => {
    const settings = normalizeSettings({});
    const policy = await policyVersion(settings, "timeline");
    const changedPolicy = await policyVersion({ ...settings, activeProvider: "typesafe" }, "timeline");
    const start = Date.UTC(2026, 8, 22);
    await rememberJevDecision("Same post", policy, "blur", 0.92, settings.strategies[0]?.id, start);
    expect(await findLocalDecision("Same post", "timeline", policy, start + 1)).toMatchObject({
      decision: "blur",
      source: "exact-cache",
    });
    expect(await findLocalDecision("Same post", "timeline", changedPolicy, start + 1)).toBeNull();
    expect(await findLocalDecision("Same post", "timeline", policy, start + 8 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  test("uses a template only after two consistent Jev samples", async () => {
    const policy = "policy-template";
    await rememberJevDecision("Get $DOGE now! 100X opportunity", policy, "blur", 0.98);
    expect(await findLocalDecision("Get $SOL now! 20X opportunity", "timeline", policy)).toBeNull();
    await rememberJevDecision("Get $PEPE now! 50X opportunity", policy, "blur", 0.97);
    expect(await findLocalDecision("Get $SOL now! 20X opportunity", "timeline", policy)).toMatchObject({
      decision: "blur",
      source: "template-cache",
    });
  });

  test("gives explicit user decisions priority over an automatic cache entry", async () => {
    const policy = "policy-user";
    await rememberJevDecision("A disputed post", policy, "blur", 0.99);
    await saveUserDecision({ id: "1", text: "A disputed post" }, "timeline", "allow", 100);
    expect(await findLocalDecision("A disputed post", "timeline", policy, 101)).toMatchObject({
      decision: "allow",
      source: "user",
    });
    expect((storage.userKnowledge as { userDecisions: unknown[] }).userDecisions).toHaveLength(1);
  });

  test("applies an explicit semantic block to sufficiently similar content", async () => {
    const original = "limited offer claim bonus tokens today from our verified promotion account";
    await saveUserDecision({ id: "1", text: original }, "timeline", "block-similar", 100);
    const result = await findLocalDecision(
      "limited offer claim bonus tokens today from our verified promotion channel",
      "timeline",
      "any-policy",
      101,
    );
    expect(result).toMatchObject({ decision: "block", source: "user" });
  });
});

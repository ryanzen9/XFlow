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

  test("requires both repeated samples and strong confidence before template reuse", async () => {
    const policy = "policy-template-confidence";
    await rememberJevDecision("Buy $DOGE now! 100X", policy, "blur", 0.7);
    await rememberJevDecision("Buy $PEPE now! 50X", policy, "blur", 0.7);
    expect(await findLocalDecision("Buy $SOL now! 20X", "timeline", policy)).toBeNull();
  });

  test("uses local embeddings only when high-confidence neighbours agree", async () => {
    const policy = "policy-semantic";
    await rememberJevDecision(
      "urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today",
      policy,
      "blur",
      0.98,
    );
    await rememberJevDecision(
      "urgent crypto campaign claim your guaranteed bonus reward from verified partner today",
      policy,
      "blur",
      0.97,
    );
    await rememberJevDecision(
      "urgent crypto promotion collect your guaranteed bonus reward from verified partner today",
      policy,
      "blur",
      0.96,
    );
    expect(
      await findLocalDecision(
        "urgent crypto promotion claim your guaranteed bonus reward from verified partner today",
        "timeline",
        policy,
      ),
    ).toMatchObject({ decision: "blur", source: "semantic-cache" });
    expect(
      await findLocalDecision("family hiking photos from the mountain this weekend", "timeline", policy),
    ).toBeNull();

    const conflictPolicy = "policy-semantic-conflict";
    await rememberJevDecision(
      "urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today",
      conflictPolicy,
      "blur",
      0.98,
    );
    await rememberJevDecision(
      "urgent crypto campaign claim your guaranteed bonus reward from verified partner today",
      conflictPolicy,
      "blur",
      0.97,
    );
    await rememberJevDecision(
      "urgent crypto promotion collect your guaranteed bonus reward from verified partner today",
      conflictPolicy,
      "allow",
      0.02,
    );
    expect(
      await findLocalDecision(
        "urgent crypto promotion claim your guaranteed bonus reward from verified partner today",
        "timeline",
        conflictPolicy,
      ),
    ).toBeNull();
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

  test("keeps policy corrections isolated from other policy versions", async () => {
    await saveUserDecision({ id: "1", text: "policy-specific post" }, "timeline", "correct-allow", 100, "policy-a");
    expect(await findLocalDecision("policy-specific post", "timeline", "policy-a", 101)).toMatchObject({
      decision: "allow",
      source: "user",
    });
    expect(await findLocalDecision("policy-specific post", "timeline", "policy-b", 101)).toBeNull();
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

  test("persists author rules while allowing a content-specific override", async () => {
    const policy = "policy-author";
    await saveUserDecision({ id: "1", text: "first post", authorId: "spammer" }, "timeline", "block-author", 100);
    expect(await findLocalDecision("another post", "timeline", policy, 101, undefined, "Spammer")).toMatchObject({
      decision: "block",
      source: "user",
    });
    await saveUserDecision({ id: "2", text: "another post", authorId: "spammer" }, "timeline", "allow", 102);
    expect(await findLocalDecision("another post", "timeline", policy, 103, undefined, "spammer")).toMatchObject({
      decision: "allow",
      source: "user",
    });
  });
});

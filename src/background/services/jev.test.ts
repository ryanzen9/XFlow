import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { normalizeSettings } from "../../shared";

let submitted: any = null;
let answers: Record<string, unknown> = {};
const secrets = { openrouter: "sk-or-test", "vercel-ai-gateway": "", typesafe: "" };
mock.module("@openrouter/sdk", () => ({
  OpenRouter: class {
    alpha = {
      decisions: {
        create: async (request: unknown) => {
          submitted = request;
          return { answers };
        },
      },
    };
  },
}));
const { requestPostReviews } = await import("./jev");
const { resetDecisionCacheForTests, saveUserDecision } = await import("./decision-cache");
const originalChrome = globalThis.chrome;
const originalIndexedDBDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
let storage: Record<string, unknown> = {};

function restoreIndexedDB(): void {
  if (originalIndexedDBDescriptor) Object.defineProperty(globalThis, "indexedDB", originalIndexedDBDescriptor);
  else Reflect.deleteProperty(globalThis, "indexedDB");
}

beforeEach(() => {
  restoreIndexedDB();
  submitted = null;
  answers = {};
  storage = {};
  resetDecisionCacheForTests();
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: string[] | null) =>
          keys === null ? { ...storage } : Object.fromEntries(keys.map((key) => [key, storage[key]])),
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
      },
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
  restoreIndexedDB();
});

test("evaluates applicable strategies and selects the first priority that crosses its threshold", async () => {
  const settings = normalizeSettings({
    commentsEnabled: true,
    modelNickname: "My Jev",
    strategies: [
      {
        id: "p1",
        name: "High priority",
        priority: 1,
        surfaces: ["comments"],
        prompt: "high criteria",
        sensitivity: 30,
      },
      { id: "p2", name: "Fallback", priority: 2, surfaces: ["comments"], prompt: "fallback criteria", sensitivity: 60 },
    ],
  });
  answers = { strategy_0_post_0: { type: "noul", noul: 0.69 }, strategy_1_post_0: { type: "noul", noul: 0.91 } };
  const result = await requestPostReviews([{ id: "42", text: "example reply" }], settings, "comments", secrets);
  expect(submitted.decisionsRequest.questions.strategy_0_post_0.criteria.true).toBe("high criteria");
  expect(submitted.decisionsRequest.questions.strategy_1_post_0.criteria.true).toBe("fallback criteria");
  expect(result).toEqual({
    ok: true,
    results: [
      {
        id: "42",
        probability: 0.91,
        decision: "blur",
        source: "jev",
        details: {
          strategy: settings.strategies[1]!,
          modelNickname: "My Jev",
          modelId: "typesafe/jev-1.13",
          surface: "comments",
        },
      },
    ],
  });
  expect(JSON.stringify(result)).not.toContain("sk-or-test");
});

test("a matching high-priority strategy wins even when a lower strategy has a higher rate", async () => {
  const settings = normalizeSettings({
    strategies: [
      { id: "p1", name: "P1", priority: 1, surfaces: ["timeline"], sensitivity: 50 },
      { id: "p2", name: "P2", priority: 2, surfaces: ["timeline"], sensitivity: 50 },
    ],
  });
  answers = { strategy_0_post_0: { type: "noul", noul: 0.72 }, strategy_1_post_0: { type: "noul", noul: 0.99 } };
  const result = await requestPostReviews([{ id: "42", text: "post" }], settings, "timeline", secrets);
  expect(result).toMatchObject({ ok: true, results: [{ probability: 0.72, details: { strategy: { id: "p1" } } }] });
});

test("ignores disabled and out-of-scope strategies", async () => {
  const settings = normalizeSettings({
    commentsEnabled: true,
    strategies: [
      { id: "home", priority: 1, surfaces: ["timeline"], prompt: "home" },
      { id: "paused", priority: 2, enabled: false, surfaces: ["comments"], prompt: "paused" },
      { id: "comment", priority: 3, surfaces: ["comments"], prompt: "comment" },
    ],
  });
  answers = { strategy_0_post_0: { type: "noul", noul: 0.91 } };
  await requestPostReviews([{ id: "42", text: "reply" }], settings, "comments", secrets);
  expect(Object.keys(submitted.decisionsRequest.questions)).toEqual(["strategy_0_post_0"]);
  expect(submitted.decisionsRequest.questions.strategy_0_post_0.criteria.true).toBe("comment");
});

test("disabled surface and missing credentials never attempt model evaluation", async () => {
  const disabled = normalizeSettings({ enabled: false, commentsEnabled: true });
  expect((await requestPostReviews([{ id: "42", text: "reply" }], disabled, "timeline", secrets)).ok).toBe(false);
  expect(submitted).toBeNull();
  expect(
    (
      await requestPostReviews([{ id: "42", text: "example" }], normalizeSettings({}), "timeline", {
        ...secrets,
        openrouter: "",
      })
    ).ok,
  ).toBe(false);
  expect(submitted).toBeNull();
});

test("serves repeated content from the policy-aware cache without credentials", async () => {
  const settings = normalizeSettings({});
  answers = { strategy_0_post_0: { type: "noul", noul: 0.93 } };
  const first = await requestPostReviews([{ id: "first", text: "repeatable content" }], settings, "timeline", secrets);
  expect(first).toMatchObject({ ok: true, results: [{ source: "jev", decision: "blur" }] });
  submitted = null;
  const second = await requestPostReviews([{ id: "second", text: "repeatable content" }], settings, "timeline", {
    ...secrets,
    openrouter: "",
  });
  expect(second).toMatchObject({ ok: true, results: [{ id: "second", source: "exact-cache", decision: "blur" }] });
  expect(submitted).toBeNull();
});

test("deduplicates identical misses inside one Jev batch", async () => {
  const settings = normalizeSettings({});
  answers = { strategy_0_post_0: { type: "noul", noul: 0.93 } };
  const result = await requestPostReviews(
    [
      { id: "first", text: "same batch content" },
      { id: "second", text: "same batch content" },
    ],
    settings,
    "timeline",
    secrets,
  );
  expect(submitted.decisionsRequest.state.posts).toHaveLength(1);
  expect(result).toMatchObject({
    ok: true,
    results: [
      { id: "first", decision: "blur" },
      { id: "second", decision: "blur" },
    ],
  });
});

test("honours user rules even when no automatic strategy remains", async () => {
  await saveUserDecision({ id: "42", text: "manually hidden" }, "timeline", "hide", 100);
  const settings = normalizeSettings({ strategies: [] });
  const result = await requestPostReviews([{ id: "42", text: "manually hidden" }], settings, "timeline", {
    ...secrets,
    openrouter: "",
  });
  expect(result).toMatchObject({ ok: true, results: [{ decision: "blur", source: "user" }] });
  expect(submitted).toBeNull();
});

test("falls back to Jev and returns provider results when IndexedDB fails", async () => {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open: () => {
        const request = new EventTarget() as IDBOpenDBRequest;
        Object.defineProperty(request, "error", { value: new Error("IndexedDB unavailable") });
        queueMicrotask(() => request.dispatchEvent(new Event("error")));
        return request;
      },
    },
  });
  resetDecisionCacheForTests();
  storage.userKnowledge = {
    userDecisions: [
      {
        id: "timeline:post:user-hit",
        scope: "content",
        surface: "timeline",
        policyId: "timeline",
        postId: "user-hit",
        contentHash: "",
        normalizedContent: "",
        semanticTokens: [],
        decision: "blur",
        createdAt: 1,
        updatedAt: 1,
        deviceId: "device",
      },
    ],
  };
  answers = { strategy_0_post_0: { type: "noul", noul: 0.93 } };
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    const result = await requestPostReviews(
      [
        { id: "user-hit", text: "durable user decision survives cache failure" },
        { id: "db-failure", text: "provider result survives cache failure" },
      ],
      normalizeSettings({}),
      "timeline",
      secrets,
    );
    expect(result).toMatchObject({
      ok: true,
      results: [
        { id: "user-hit", decision: "blur", source: "user" },
        { id: "db-failure", decision: "blur", source: "jev" },
      ],
    });
    expect(submitted).not.toBeNull();
  } finally {
    console.warn = originalWarn;
    restoreIndexedDB();
    resetDecisionCacheForTests();
  }
});

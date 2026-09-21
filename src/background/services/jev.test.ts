import { beforeEach, expect, mock, test } from "bun:test";
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
beforeEach(() => {
  submitted = null;
  answers = {};
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

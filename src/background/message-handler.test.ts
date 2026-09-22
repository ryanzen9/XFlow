import { afterAll, beforeEach, expect, test } from "bun:test";
import type { ExtensionResponse } from "../shared";
import { handleMessage } from "./message-handler";
import { resetDecisionCacheForTests } from "./services/decision-cache";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown>;

beforeEach(() => {
  resetDecisionCacheForTests();
  storage = {
    activeProvider: "openrouter",
    providerSecrets: { openrouter: "sk-or-private-4321", "vercel-ai-gateway": "", typesafe: "" },
    strategies: [],
  };
  globalThis.chrome = {
    runtime: { id: "xfilter-test", getURL: (path: string) => `chrome-extension://xfilter-test/${path}` },
    storage: {
      local: {
        get: async (keys: null | string[]) => {
          if (keys === null) return { ...storage };
          return Object.fromEntries(keys.map((key) => [key, storage[key]]));
        },
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
        remove: async (key: string) => delete storage[key],
      },
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

test("rejects provider credential messages sent from a content-script tab", () => {
  let response: ExtensionResponse | undefined;
  const keepChannelOpen = handleMessage(
    { type: "GET_PROVIDER_SUMMARIES" },
    { id: "xfilter-test", url: "https://x.com/home", tab: { id: 7 } as chrome.tabs.Tab },
    (value) => {
      response = value;
    },
  );
  expect(keepChannelOpen).toBeFalse();
  expect(response).toEqual({ ok: false, code: "FORBIDDEN", error: "只有扩展页面可以管理 API Key。" });
});

test("returns only masked provider metadata to a trusted extension page", async () => {
  const response = await new Promise<ExtensionResponse>((resolve) => {
    expect(
      handleMessage(
        { type: "GET_PROVIDER_SUMMARIES" },
        {
          id: "xfilter-test",
          url: "chrome-extension://xfilter-test/dashboard.html",
          tab: { id: 8 } as chrome.tabs.Tab,
        },
        resolve,
      ),
    ).toBeTrue();
  });
  expect(response.ok).toBeTrue();
  expect("providerSummaries" in response).toBeTrue();
  if ("providerSummaries" in response) {
    expect(response.providerSummaries.find(({ id }) => id === "openrouter")).toMatchObject({
      configured: true,
      keyHint: "•••• 4321",
    });
  }
  expect(JSON.stringify(response)).not.toContain("sk-or-private");
});

test("allows an options page opened in a tab to save the TypeSafe official key", async () => {
  const response = await new Promise<ExtensionResponse>((resolve) => {
    expect(
      handleMessage(
        { type: "SAVE_PROVIDER_KEY", providerId: "typesafe", apiKey: "typesafe-official-key" },
        {
          id: "xfilter-test",
          url: "chrome-extension://xfilter-test/dashboard.html",
          tab: { id: 9 } as chrome.tabs.Tab,
        },
        resolve,
      ),
    ).toBeTrue();
  });
  expect(response.ok).toBeTrue();
  expect((storage.providerSecrets as Record<string, string>).typesafe).toBe("typesafe-official-key");
});

test("accepts a content-script correction and persists synchronized user knowledge", async () => {
  const response = await new Promise<ExtensionResponse>((resolve) => {
    expect(
      handleMessage(
        {
          type: "SAVE_USER_DECISION",
          surface: "timeline",
          post: { id: "42", postId: "42", text: "show this post" },
          action: "allow",
        },
        { id: "xfilter-test", url: "https://x.com/home", tab: { id: 10 } as chrome.tabs.Tab },
        resolve,
      ),
    ).toBeTrue();
  });
  expect(response).toMatchObject({ ok: true, result: { id: "42", decision: "allow", source: "user" } });
  expect((storage.userKnowledge as { userDecisions: unknown[] }).userDecisions).toHaveLength(1);
  expect(storage.configVersion).toBeUndefined();
  expect(storage.knowledgeRevision).toBe(1);
});

test("rejects a malformed user-decision post without throwing", () => {
  let response: ExtensionResponse | undefined;
  const keepChannelOpen = handleMessage(
    { type: "SAVE_USER_DECISION", surface: "timeline", post: null, action: "hide" } as never,
    { id: "xfilter-test", url: "https://x.com/home", tab: { id: 12 } as chrome.tabs.Tab },
    (value) => {
      response = value;
    },
  );
  expect(keepChannelOpen).toBeFalse();
  expect(response).toEqual({ ok: false, code: "INVALID_REQUEST", error: "无效的用户标注请求。" });
});

test("persists an author rule from a trusted content script", async () => {
  const response = await new Promise<ExtensionResponse>((resolve) => {
    expect(
      handleMessage(
        {
          type: "SAVE_USER_DECISION",
          surface: "timeline",
          post: { id: "43", text: "author post", authorId: "ExampleAuthor" },
          action: "block-author",
        },
        { id: "xfilter-test", url: "https://x.com/home", tab: { id: 11 } as chrome.tabs.Tab },
        resolve,
      ),
    ).toBeTrue();
  });
  expect(response).toMatchObject({ ok: true, result: { decision: "block", source: "user" } });
  expect(storage.userKnowledge).toMatchObject({
    userDecisions: [{ scope: "author", authorId: "exampleauthor", decision: "block" }],
  });
});

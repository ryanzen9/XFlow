import { afterAll, beforeEach, expect, test } from "bun:test";
import type { ExtensionResponse } from "../shared";
import { handleMessage } from "./message-handler";
import { resetActivityServiceForTests } from "./services/activity";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown>;
let session: Record<string, unknown>;

beforeEach(() => {
  storage = {
    activeProvider: "openrouter",
    providerSecrets: { openrouter: "sk-or-private-4321", "vercel-ai-gateway": "", typesafe: "" },
    strategies: [],
  };
  session = {};
  resetActivityServiceForTests();
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
      session: {
        get: async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, session[key]])),
        set: async (patch: Record<string, unknown>) => Object.assign(session, patch),
      },
    },
    action: { setBadgeText: async () => undefined, setBadgeBackgroundColor: async () => undefined },
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

test("records filter activity only from an X content script", async () => {
  const sender = { id: "xfilter-test", url: "https://x.com/home", tab: { id: 10 } as chrome.tabs.Tab };
  const response = await new Promise<ExtensionResponse>((resolve) => {
    expect(
      handleMessage(
        {
          type: "RECORD_FILTER_EVENT",
          pageToken: "page-one",
          surface: "timeline",
          post: { id: "42", text: "filtered", author: "@person" },
          policyName: "Spam",
        },
        sender,
        resolve,
      ),
    ).toBeTrue();
  });
  expect(response).toMatchObject({ ok: true, eventId: "x:42", added: true, pageCount: 1 });
  expect((storage.activityData as { events: unknown[] }).events).toHaveLength(1);

  let rejected: ExtensionResponse | undefined;
  expect(
    handleMessage({ type: "CLEAR_ACTIVITY_DATA" }, sender, (value) => {
      rejected = value;
    }),
  ).toBeFalse();
  expect(rejected).toMatchObject({ ok: false, code: "FORBIDDEN" });
});

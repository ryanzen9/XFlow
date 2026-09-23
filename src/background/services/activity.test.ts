import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { activityHistory, activitySummary, type ActivityData } from "../../shared";
import {
  clearActivity,
  clearActivityHistory,
  getActivitySnapshot,
  markActivityStatus,
  recordFilterEvent,
  resetActivityServiceForTests,
  resetPageActivity,
} from "./activity";

const originalChrome = globalThis.chrome;
let local: Record<string, unknown>;
let session: Record<string, unknown>;
let badges: { tabId?: number; text: string }[];

function read(source: Record<string, unknown>, keys: string | string[] | null): Record<string, unknown> {
  if (keys === null) return { ...source };
  const list = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(list.map((key) => [key, source[key]]));
}

beforeEach(() => {
  local = {};
  session = {};
  badges = [];
  resetActivityServiceForTests();
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: string | string[] | null) => read(local, keys),
        set: async (patch: Record<string, unknown>) => Object.assign(local, patch),
      },
      session: {
        get: async (keys: string | string[] | null) => read(session, keys),
        set: async (patch: Record<string, unknown>) => Object.assign(session, patch),
      },
    },
    action: {
      setBadgeText: async (details: { tabId?: number; text: string }) => {
        badges.push(details);
      },
      setBadgeBackgroundColor: async () => undefined,
    },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

describe("activity service", () => {
  test("deduplicates global totals while resetting each page badge", async () => {
    const input = {
      post: { id: "42", text: "Filtered post", author: "@person", url: "https://x.com/person/status/42" },
      surface: "timeline" as const,
      pageToken: "page-a",
      tabId: 7,
      policyId: "spam",
      policyName: "Spam",
    };
    await resetPageActivity(7, "page-a");
    expect(await recordFilterEvent(input, Date.UTC(2026, 8, 22, 2))).toMatchObject({ added: true, pageCount: 1 });
    expect(await recordFilterEvent(input, Date.UTC(2026, 8, 22, 3))).toMatchObject({ added: false, pageCount: 1 });

    await resetPageActivity(7, "page-b");
    expect(await recordFilterEvent({ ...input, pageToken: "page-b" }, Date.UTC(2026, 8, 22, 4))).toMatchObject({
      added: false,
      pageCount: 1,
    });
    expect((await getActivitySnapshot(Date.UTC(2026, 8, 22, 5))).summary.allTime).toBe(1);
    expect(badges.at(-1)).toEqual({ tabId: 7, text: "1" });
  });

  test("keeps badges independent between tabs", async () => {
    await resetPageActivity(1, "a");
    await resetPageActivity(2, "b");
    await recordFilterEvent({ post: { id: "1", text: "One" }, surface: "timeline", pageToken: "a", tabId: 1 });
    await recordFilterEvent({ post: { id: "2", text: "Two" }, surface: "timeline", pageToken: "b", tabId: 2 });
    await recordFilterEvent({ post: { id: "3", text: "Three" }, surface: "timeline", pageToken: "a", tabId: 1 });
    expect(badges.filter(({ tabId }) => tabId === 1).at(-1)?.text).toBe("2");
    expect(badges.filter(({ tabId }) => tabId === 2).at(-1)?.text).toBe("1");
  });

  test("counts the same post entering the DOM ten times only once", async () => {
    const input = {
      post: { id: "repeat", text: "Repeated post" },
      surface: "timeline" as const,
      pageToken: "page",
      tabId: 4,
    };
    for (let index = 0; index < 10; index += 1) await recordFilterEvent(input, 1_000 + index);
    expect((await getActivitySnapshot(2_000)).summary.allTime).toBe(1);
    expect(badges.filter(({ tabId }) => tabId === 4).at(-1)?.text).toBe("1");
  });

  test("uses canonical URLs to distinguish non-numeric post identities", async () => {
    const first = await recordFilterEvent({
      post: {
        id: "fallback",
        text: "Same text",
        author: "@person",
        url: "https://x.com/person/status/101?utm_source=tracker",
      },
      surface: "timeline",
      pageToken: "page",
      tabId: 4,
    });
    const duplicate = await recordFilterEvent({
      post: {
        id: "fallback-again",
        text: "Same text",
        author: "@person",
        url: "https://x.com/person/status/101#fragment",
      },
      surface: "timeline",
      pageToken: "page",
      tabId: 4,
    });
    const second = await recordFilterEvent({
      post: {
        id: "fallback",
        text: "Same text",
        author: "@person",
        url: "https://x.com/person/status/102",
      },
      surface: "timeline",
      pageToken: "page",
      tabId: 4,
    });
    expect(first.added).toBeTrue();
    expect(duplicate).toMatchObject({ eventId: first.eventId, added: false });
    expect(second.added).toBeTrue();
    expect(second.eventId).not.toBe(first.eventId);
    expect((await getActivitySnapshot()).summary.allTime).toBe(2);
  });

  test("distinguishes reveal from explicit incorrect feedback", async () => {
    const recorded = await recordFilterEvent({
      post: { id: "9", text: "Review me" },
      surface: "comments",
      pageToken: "detail",
      tabId: 3,
    });
    expect(await markActivityStatus(recorded.eventId, "revealed", 10)).toBeTrue();
    expect((await getActivitySnapshot()).activity.events[0]?.status).toBe("revealed");
    expect(await markActivityStatus(recorded.eventId, "incorrect", 11)).toBeTrue();
    expect((await getActivitySnapshot()).activity.events[0]?.status).toBe("incorrect");
    expect(await markActivityStatus(recorded.eventId, "revealed", 12)).toBeTrue();
    expect((await getActivitySnapshot()).activity.events[0]?.status).toBe("incorrect");
  });

  test("clears every statistic and leaves a sync tombstone", async () => {
    await recordFilterEvent({ post: { id: "1", text: "One" }, surface: "timeline", pageToken: "a", tabId: 1 });
    const cleared = await clearActivity(100);
    expect(activitySummary(cleared, 101)).toEqual({ today: 0, allTime: 0 });
    expect((local.activityData as ActivityData).clearedAt).toBe(100);
  });

  test("clears log details while preserving activity totals", async () => {
    const recordedAt = Date.UTC(2026, 8, 22, 10);
    await recordFilterEvent(
      {
        post: { id: "11", text: "Private preview", author: "@person", url: "https://x.com/person/status/11" },
        surface: "timeline",
        pageToken: "a",
        tabId: 1,
        policyName: "Noise",
      },
      recordedAt,
    );

    const cleared = await clearActivityHistory(recordedAt + 1);

    expect(activitySummary(cleared, recordedAt + 1).allTime).toBe(1);
    expect(activityHistory(cleared, recordedAt + 1)).toEqual([]);
    expect(cleared.historyClearedAt).toBe(recordedAt + 1);
    expect(cleared.events[0]).not.toHaveProperty("preview");
  });
});

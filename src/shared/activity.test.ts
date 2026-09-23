import { describe, expect, test } from "bun:test";
import {
  activityDays,
  activityHistory,
  activitySummary,
  compactActivityData,
  localDayKey,
  mergeActivityData,
  normalizeActivityData,
  weeklyActivity,
  type ActivityEvent,
} from "./activity";

const at = (day: number, hour = 12) => new Date(2026, 8, day, hour).getTime();

function event(id: string, day: number, overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  const filteredAt = at(day);
  return {
    id,
    contentId: id,
    day: localDayKey(filteredAt),
    filteredAt,
    updatedAt: filteredAt,
    deviceId: "device-a",
    surface: "timeline",
    status: "filtered",
    author: "@author",
    preview: `preview ${id}`,
    policyName: "Low-quality content",
    ...overrides,
  };
}

function eventsFor(day: number, count: number, prefix = String(day)): ActivityEvent[] {
  return Array.from({ length: count }, (_, index) => event(`${prefix}-${index}`, day));
}

describe("activity data", () => {
  test("deduplicates global content identities and applies deterministic LWW updates", () => {
    const data = normalizeActivityData({
      events: [event("x:1", 18), event("x:1", 18, { status: "revealed", updatedAt: at(18, 13) })],
    });
    expect(data.events).toHaveLength(1);
    expect(data.events[0]?.status).toBe("revealed");
  });

  test("merges devices without double counting the same filter event", () => {
    const left = normalizeActivityData({ events: [event("x:shared", 18), event("x:a", 18)] });
    const right = normalizeActivityData({
      events: [event("x:shared", 18, { deviceId: "device-b" }), event("x:b", 18, { deviceId: "device-b" })],
    });
    const merged = mergeActivityData(left, right);
    expect(activitySummary(merged, at(18))).toEqual({ today: 3, allTime: 3 });
    expect(mergeActivityData(merged, right).events).toHaveLength(3);
  });

  test("combines 50 and 30 device events into exactly 80 global events", () => {
    const deviceA = normalizeActivityData({ events: eventsFor(18, 50, "a") });
    const deviceB = normalizeActivityData({
      events: eventsFor(18, 30, "b").map((item) => ({ ...item, deviceId: "device-b" })),
    });
    const merged = mergeActivityData(deviceA, deviceB);
    expect(activitySummary(merged, at(18))).toEqual({ today: 80, allTime: 80 });
    expect(mergeActivityData(merged, deviceA).events).toHaveLength(80);
  });

  test("counts 100 unique filter events with zero duplicate error", () => {
    const unique = eventsFor(18, 100, "sample");
    const data = normalizeActivityData({ events: [...unique, ...unique.slice(0, 10)] });
    expect(activitySummary(data, at(18))).toEqual({ today: 100, allTime: 100 });
  });

  test("uses the newest clear marker so remote sync cannot resurrect old activity", () => {
    const local = normalizeActivityData({ clearedAt: at(19), events: [] });
    const remote = normalizeActivityData({
      archivedByDevice: { "device-a": 20 },
      events: [event("x:old", 18), event("x:new", 20)],
    });
    const merged = mergeActivityData(local, remote, at(20));
    expect(merged.events.map(({ id }) => id)).toEqual(["x:new"]);
    expect(merged.archivedByDevice).toEqual({});
    expect(activitySummary(merged, at(20)).allTime).toBe(1);
  });

  test("uses the newest history clear marker without removing daily statistics", () => {
    const local = normalizeActivityData({
      historyClearedAt: at(19),
      events: [event("x:old", 18), event("x:new", 20)],
    });
    const remote = normalizeActivityData({
      events: [
        event("x:old", 18, { deviceId: "device-b", status: "incorrect" }),
        event("x:remote-new", 20, { deviceId: "device-b" }),
      ],
    });

    const merged = mergeActivityData(local, remote, at(20));

    expect(activitySummary(merged, at(20))).toEqual({ today: 2, allTime: 3 });
    expect(
      activityHistory(merged, at(20))
        .map(({ id }) => id)
        .toSorted(),
    ).toEqual(["x:new", "x:remote-new"]);
    expect(merged.events.find(({ id }) => id === "x:old")?.preview).toBeUndefined();
  });

  test("keeps all-time aggregates when 30-day history details expire", () => {
    const now = at(22);
    const old = event("x:old", 1, { filteredAt: new Date(2026, 6, 1).getTime(), day: "2026-07-01" });
    const recent = event("x:recent", 21);
    const compacted = compactActivityData(normalizeActivityData({ events: [old, recent] }), now);
    expect(activitySummary(compacted, now).allTime).toBe(2);
    expect(activityHistory(compacted, now).map(({ id }) => id)).toEqual(["x:recent"]);
    expect(compacted.events.find(({ id }) => id === "x:old")?.preview).toBeUndefined();
  });

  test("folds identities older than the heatmap window into bounded device counters", () => {
    const now = at(22);
    const archived = Array.from({ length: 250 }, (_, index) =>
      event(`archived-${index}`, 1, {
        filteredAt: new Date(2026, 4, 1, 12, index % 60).getTime(),
        day: "2026-05-01",
        deviceId: index < 200 ? "device-a" : "device-b",
      }),
    );
    const compacted = compactActivityData(normalizeActivityData({ events: [...archived, event("recent", 22)] }), now);
    expect(compacted.events.map(({ id }) => id)).toEqual(["recent"]);
    expect(compacted.archivedByDevice).toEqual({ "device-a": 200, "device-b": 50 });
    expect(activitySummary(compacted, now)).toEqual({ today: 1, allTime: 251 });
    expect(compactActivityData(compacted, now)).toEqual(compacted);
  });

  test("merges archived per-device counters monotonically", () => {
    const left = normalizeActivityData({ archivedByDevice: { "device-a": 100, "device-b": 20 } });
    const right = normalizeActivityData({ archivedByDevice: { "device-a": 80, "device-b": 30 } });
    const merged = mergeActivityData(left, right, at(22));
    expect(merged.archivedByDevice).toEqual({ "device-a": 100, "device-b": 30 });
    expect(activitySummary(merged, at(22)).allTime).toBe(130);
  });

  test("canonicalizes persisted post URLs", () => {
    const data = normalizeActivityData({
      events: [
        event("x:url", 22, {
          url: "https://x.com/person/status/42?utm_source=tracker#fragment",
        }),
      ],
    });
    expect(data.events[0]?.url).toBe("https://x.com/person/status/42");
  });

  test("derives an exact seven-day trend and current-week review", () => {
    const data = normalizeActivityData({
      events: [event("x:15", 15), event("x:16", 16), event("x:21-a", 21), event("x:21-b", 21), event("x:22", 22)],
    });
    expect(activityDays(data, 7, at(22)).map(({ count }) => count)).toEqual([1, 0, 0, 0, 0, 2, 1]);
    const weekly = weeklyActivity(data, at(22));
    expect(weekly.total).toBe(3);
    expect(weekly.previousTotal).toBe(2);
    expect(weekly.comparisonPercent).toBe(50);
    expect(weekly.mostActive?.day).toBe("2026-09-21");
  });

  test("matches the specified seven-day trend and weekly total exactly", () => {
    const counts = [100, 80, 120, 60, 90, 30, 50];
    const data = normalizeActivityData({
      events: counts.flatMap((count, index) => eventsFor(14 + index, count, `trend-${index}`)),
    });
    expect(activityDays(data, 7, at(20)).map(({ count }) => count)).toEqual(counts);
    const weekly = weeklyActivity(data, at(20));
    expect(weekly.total).toBe(530);
    expect(weekly.mostActive).toMatchObject({ day: "2026-09-16", count: 120 });
    expect(weekly.comparisonPercent).toBeUndefined();
  });

  test("resets Today at local midnight without changing All Time", () => {
    const beforeMidnight = new Date(2026, 8, 22, 23, 59).getTime();
    const afterMidnight = new Date(2026, 8, 23, 0, 0).getTime();
    const data = normalizeActivityData({ events: [event("boundary", 22, { filteredAt: beforeMidnight })] });
    expect(activitySummary(data, beforeMidnight)).toEqual({ today: 1, allTime: 1 });
    expect(activitySummary(data, afterMidnight)).toEqual({ today: 0, allTime: 1 });
  });

  test("reports 73 events for the matching heatmap day", () => {
    const data = normalizeActivityData({ events: eventsFor(18, 73, "heatmap") });
    expect(activityDays(data, 84, at(22)).find(({ day }) => day === "2026-09-18")?.count).toBe(73);
  });
});

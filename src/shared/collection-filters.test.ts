import { expect, test } from "bun:test";
import { filterHistory, filterStrategies } from "./collection-filters";
import { defaultStrategy } from "./strategy";
import type { ActivityEvent } from "./activity";

const strategies = [
  { ...defaultStrategy("timeline", 1, "first"), name: "Tech 分享", prompt: "过滤广告与抽奖" },
  { ...defaultStrategy("timeline", 2, "second"), name: "生活观察", enabled: false },
  { ...defaultStrategy("timeline", 3, "third"), name: "Design", prompt: "filter marketing" },
];

test("strategy search matches normalized words across name and prompt", () => {
  expect(filterStrategies(strategies, "  ＴＥＣＨ  广告 ", "all").map((item) => item.id)).toEqual(["first"]);
  expect(filterStrategies(strategies, "design MARKETING", "enabled").map((item) => item.id)).toEqual(["third"]);
  expect(filterStrategies(strategies, "missing", "all")).toEqual([]);
});

test("status filtering preserves original records and full-library priority", () => {
  const filtered = filterStrategies(strategies, "", "disabled");
  expect(filtered).toEqual([strategies[1]!]);
  expect(filtered[0]).toBe(strategies[1]);
  expect(filtered[0]?.priority).toBe(2);
  expect(filterStrategies(strategies, "  ", "all")).toEqual(strategies);
  expect(strategies.map((item) => item.priority)).toEqual([1, 2, 3]);
});

const history: ActivityEvent[] = [
  {
    id: "one",
    contentId: "post-1",
    day: "2026-10-07",
    filteredAt: 3,
    updatedAt: 3,
    deviceId: "test",
    surface: "timeline",
    status: "filtered",
    author: "@Alice",
    preview: "TypeScript 分享",
    policyName: "技术精选",
  },
  {
    id: "two",
    contentId: "post-2",
    day: "2026-10-07",
    filteredAt: 2,
    updatedAt: 2,
    deviceId: "test",
    surface: "comments",
    status: "incorrect",
    author: "@Bob",
    preview: "广告",
    policyName: "评论净化",
  },
  {
    id: "three",
    contentId: "post-3",
    day: "2026-10-07",
    filteredAt: 1,
    updatedAt: 1,
    deviceId: "test",
    surface: "timeline",
    status: "revealed",
  },
];

test("history combines status with content, author and policy search", () => {
  expect(filterHistory(history, "ALICE 技术", "filtered")).toEqual([history[0]!]);
  expect(filterHistory(history, "评论净化", "incorrect")).toEqual([history[1]!]);
  expect(filterHistory(history, "广告", "filtered")).toEqual([]);
});

test("history search handles missing details and keeps chronological order", () => {
  expect(filterHistory(history, "post-3", "revealed")).toEqual([history[2]!]);
  expect(filterHistory(history, "", "all")).toEqual(history);
  expect(filterHistory([], "anything", "all")).toEqual([]);
});

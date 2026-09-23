import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { localDayKey, type ActivityEvent } from "../../../shared";
import { FilterHistory, stepHistoryPage } from "./FilterHistory";

test("steps from the visible page when history shrinks", () => {
  expect(stepHistoryPage(6, 2, -1)).toBe(1);
  expect(stepHistoryPage(6, 2, 1)).toBe(2);
});

test("paginates a busy day in ten-record pages", () => {
  const now = new Date(2026, 8, 22, 12).getTime();
  const history: ActivityEvent[] = Array.from({ length: 51 }, (_, index) => ({
    id: `x:${index}`,
    contentId: String(index),
    day: localDayKey(now),
    filteredAt: now - index,
    updatedAt: now - index,
    deviceId: "device-a",
    surface: "timeline",
    status: "filtered",
    preview: `preview ${index}`,
  }));

  const markup = renderToStaticMarkup(
    <FilterHistory history={history} now={now} busy={false} onIncorrect={() => {}} />,
  );

  expect(markup).toContain("51 条记录");
  expect(markup).toContain("显示 1–10，共 51 条");
  expect(markup).toContain("第 1 / 6 页");
  expect(markup).toContain("preview 9");
  expect(markup).not.toContain("preview 10");
  expect(markup.match(/不应被过滤/g)).toHaveLength(10);
});

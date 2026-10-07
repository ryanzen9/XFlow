import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ACTIVITY_HISTORY_DAYS, activityDays, localDayKey, type ActivityEvent } from "../../shared";
import { LogOverview, LogPanel } from "./LogPanel";

function event(id: string, filteredAt: number, detailsCleared = false): ActivityEvent {
  return {
    id,
    contentId: id,
    day: localDayKey(filteredAt),
    filteredAt,
    updatedAt: filteredAt,
    deviceId: "test-device",
    surface: "timeline",
    status: "filtered",
    ...(detailsCleared ? { detailsCleared: true as const } : { preview: `preview ${id}` }),
  };
}

test("log page owns the filter history record", () => {
  const markup = renderToStaticMarkup(<LogPanel />);

  expect(markup).toContain("日志占用");
  expect(markup).toContain("清理日志");
  expect(markup).toContain("屏蔽日志");
  expect(markup).toContain("每日屏蔽量");
  expect(markup).toContain("30 天屏蔽");
  expect(markup).toContain("过滤历史");
  expect(markup).toContain("暂无过滤历史。");
  expect(markup).toContain("Jev 请求日志");
  expect(markup).toContain("暂无 Jev 请求记录。");
});

test("log overview uses populated daily counts, including cleared record details", () => {
  const now = new Date(2026, 8, 28, 12).getTime();
  const yesterday = new Date(2026, 8, 27, 12).getTime();
  const days = activityDays(
    {
      schemaVersion: 1,
      clearedAt: 0,
      historyClearedAt: 0,
      archivedByDevice: {},
      events: [event("today-a", now), event("today-b", now - 1, true), event("yesterday", yesterday)],
    },
    ACTIVITY_HISTORY_DAYS,
    now,
  );
  const markup = renderToStaticMarkup(<LogOverview days={days} />);

  expect(markup).toMatch(/今日屏蔽<\/dt><dd[^>]*>2<\/dd>/);
  expect(markup).toMatch(/30 天屏蔽<\/dt><dd[^>]*>3<\/dd>/);
  expect(markup).toMatch(/日均屏蔽<\/dt><dd[^>]*>0\.1<\/dd>/);
  expect(markup).toMatch(/单日峰值<\/dt><dd[^>]*>2<\/dd>/);
});

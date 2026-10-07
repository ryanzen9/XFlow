import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityPanel, OverviewMetrics } from "./ActivityPanel";
import { activityDays, localDayKey } from "../../shared";

test("shows one daily activity view with a control for switching to the trend", () => {
  const markup = renderToStaticMarkup(<ActivityPanel />);

  expect(markup).toContain("活动热力图");
  expect(markup).toContain("查看趋势");
  expect(markup).not.toContain("活动趋势");
});

test("overview reports real rolling counts and active days", () => {
  const now = new Date(2026, 9, 7, 12).getTime();
  const timestamps = [now, now - 1, now - 2 * 86_400_000, now - 9 * 86_400_000];
  const days = activityDays(
    {
      schemaVersion: 1,
      clearedAt: 0,
      historyClearedAt: 0,
      archivedByDevice: {},
      events: timestamps.map((filteredAt, index) => ({
        id: String(index),
        contentId: String(index),
        day: localDayKey(filteredAt),
        filteredAt,
        updatedAt: filteredAt,
        deviceId: "test",
        surface: "timeline",
        status: "filtered",
      })),
    },
    30,
    now,
  );
  const markup = renderToStaticMarkup(<OverviewMetrics days={days} />);
  expect(markup).toMatch(/今日屏蔽<\/span><\/dt><dd><span[^>]*>2<\/span>/);
  expect(markup).toMatch(/近 7 天过滤<\/span><\/dt><dd><span[^>]*>3<\/span>/);
  expect(markup).toMatch(/30 天屏蔽<\/span><\/dt><dd><span[^>]*>4<\/span>/);
  expect(markup).toMatch(/30 天活跃天数<\/span><\/dt><dd><span[^>]*>3<\/span>/);
});

test("loading metrics do not claim zero activity", () => {
  const markup = renderToStaticMarkup(<OverviewMetrics days={[]} loading />);
  expect(markup.match(/>—<\/span>/g)).toHaveLength(4);
  expect(markup).not.toContain(">0</span>");
});

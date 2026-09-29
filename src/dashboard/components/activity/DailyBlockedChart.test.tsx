import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyBlockedChart } from "./DailyBlockedChart";

test("daily blocked chart labels dates and localized volumes", () => {
  const days = [
    { day: "2026-09-27", date: new Date(2026, 8, 27), count: 0 },
    { day: "2026-09-28", date: new Date(2026, 8, 28), count: 1234 },
  ];
  const markup = renderToStaticMarkup(<DailyBlockedChart days={days} />);

  expect(markup).toContain("每日屏蔽量");
  expect(markup).toContain("横轴：日期 · 纵轴：屏蔽条数");
  expect(markup).toContain("9月27日");
  expect(markup).toContain("1,234");
  expect(markup).not.toContain("NaN");
});

test("daily blocked chart renders a zero-volume period", () => {
  const markup = renderToStaticMarkup(
    <DailyBlockedChart days={[{ day: "2026-09-28", date: new Date(2026, 8, 28), count: 0 }]} />,
  );

  expect(markup).toContain("过滤 0 条");
  expect(markup).not.toContain("NaN");
});

import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityHeatmap } from "./ActivityHeatmap";

test("heatmap keeps zero and nonzero days distinct with localized keyboard labels", () => {
  const days = [0, 1, 2, 3, 4].map((count, index) => ({
    day: `2026-09-${20 + index}`,
    date: new Date(2026, 8, 20 + index),
    count,
  }));
  const markup = renderToStaticMarkup(<ActivityHeatmap days={days} />);
  for (const level of [0, 1, 2, 3, 4]) expect(markup).toContain(`data-level="${level}"`);
  expect(markup).toContain('aria-label="9月24日，过滤 4 条"');
  expect(markup.match(/<button/g)).toHaveLength(5);
  expect(markup).not.toContain("还没有");
});

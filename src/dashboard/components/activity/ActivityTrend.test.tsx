import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityTrend } from "./ActivityTrend";

test("uses localized number formatting in both visual and accessible labels", () => {
  const date = new Date(2026, 8, 23);
  const markup = renderToStaticMarkup(<ActivityTrend days={[{ day: "2026-09-23", date, count: 8421 }]} />);

  expect(markup.match(/8,421/g)).toHaveLength(3);
  expect(markup).not.toContain("8421");
});

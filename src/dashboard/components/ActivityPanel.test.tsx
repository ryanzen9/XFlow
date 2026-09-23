import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityPanel } from "./ActivityPanel";

test("shows one daily activity view with a control for switching to the trend", () => {
  const markup = renderToStaticMarkup(<ActivityPanel />);

  expect(markup).toContain("活动热力图");
  expect(markup).toContain("查看趋势");
  expect(markup).not.toContain("活动趋势");
});

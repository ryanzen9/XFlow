import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LogPanel } from "./LogPanel";

test("log page owns the filter history record", () => {
  const markup = renderToStaticMarkup(<LogPanel />);

  expect(markup).toContain("Filter History");
  expect(markup).toContain("No filtering history yet.");
});

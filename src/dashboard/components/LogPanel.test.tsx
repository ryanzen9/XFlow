import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LogPanel } from "./LogPanel";

test("log page owns the filter history record", () => {
  const markup = renderToStaticMarkup(<LogPanel />);

  expect(markup).toContain("过滤历史");
  expect(markup).toContain("暂无过滤历史。");
});

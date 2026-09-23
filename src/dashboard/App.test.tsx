import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";

test("renders sidebar titles without eyebrows", () => {
  const markup = renderToStaticMarkup(<App />);
  const navigation = markup.match(/<nav[^>]*>(.*?)<\/nav>/s)?.[1] ?? "";

  expect(navigation).not.toContain("<small");

  for (const title of ["通用", "API Keys", "策略", "数据", "日志"]) {
    expect(navigation).toContain(`>${title}</span>`);
  }

  for (const eyebrow of ["General", "Providers", "Strategies", "Data", "Log"]) {
    expect(navigation).not.toContain(`>${eyebrow}<`);
  }
});

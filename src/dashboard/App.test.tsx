import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";
import { privacyPolicyUrl } from "../ui/privacy";

test("renders sidebar titles without eyebrows", () => {
  const markup = renderToStaticMarkup(<App />);
  const navigation = markup.match(/<nav[^>]*>(.*?)<\/nav>/s)?.[1] ?? "";

  expect(navigation).not.toContain("<small");

  for (const title of ["概览", "通用", "API Keys", "策略", "数据", "日志"]) {
    expect(navigation).toContain(`>${title}</span>`);
  }

  for (const eyebrow of ["General", "Providers", "Strategies", "Data", "Log"]) {
    expect(navigation).not.toContain(`>${eyebrow}<`);
  }
});

test("opens analytics separately from general settings", () => {
  const markup = renderToStaticMarkup(<App />);
  expect(markup).toContain("过滤概览</h1>");
  expect(markup).not.toContain("通用设置</h1>");
});

test("offers the privacy policy from the dashboard even before settings load", () => {
  const markup = renderToStaticMarkup(<App />);
  expect(markup).toContain(`href="${privacyPolicyUrl("zh-CN")}"`);
  expect(markup).toContain("隐私政策");
  expect(privacyPolicyUrl("en")).toBe("https://ryanzen9.github.io/XFlow/privacy-policy/");
  expect(privacyPolicyUrl("zh-CN")).toBe("https://ryanzen9.github.io/XFlow/privacy-policy/zh-CN/");
});

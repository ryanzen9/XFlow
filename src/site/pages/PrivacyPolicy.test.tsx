import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyPolicy } from "./PrivacyPolicy";

describe("public privacy policy", () => {
  test("discloses synced feedback content and separate retention in Chinese", () => {
    const markup = renderToStaticMarkup(<PrivacyPolicy language="zh" />);
    expect(markup).toContain("规范化帖子正文");
    expect(markup).toContain("语义词");
    expect(markup).toContain("不会自动过期");
    expect(markup).toContain("清除活动数据");
    expect(markup).toContain("删除 S3 对象");
  });

  test("discloses synced feedback content and separate retention in English", () => {
    const markup = renderToStaticMarkup(<PrivacyPolicy language="en" />);
    expect(markup).toContain("normalized post text");
    expect(markup).toContain("semantic tokens");
    expect(markup).toContain("no automatic expiration");
    expect(markup).toContain("Clear Activity Data");
    expect(markup).toContain("delete the S3 object");
  });

  test("preserves Chinese health-check, local diagnostic and production permission disclosures", async () => {
    const markup = renderToStaticMarkup(<PrivacyPolicy language="zh" />);
    const document = await Bun.file(new URL("../../../docs/privacy-policy.md", import.meta.url)).text();

    for (const content of [markup, document]) {
      const text = content.replace(/\s+/g, " ");
      expect(text).toContain("不含 X 帖子或策略内容");
      expect(text).toContain("可能产生第三方用量或费用");
      expect(text).toContain("原始错误");
      expect(text).toContain("30 天或 200 条");
      expect(text).toContain("不会同步到 S3");
      expect(text).toContain("本机 HTTP S3 调试仅在开发构建中可用");
      expect(text).toContain("每日清理过期的 Jev 请求日志");
    }
  });

  test("preserves English health-check, local diagnostic and production permission disclosures", async () => {
    const markup = renderToStaticMarkup(<PrivacyPolicy language="en" />);
    const document = await Bun.file(new URL("../../../docs/privacy-policy.en.md", import.meta.url)).text();

    for (const content of [markup, document]) {
      const text = content.replace(/\s+/g, " ");
      expect(text).toContain("no X post or policy content");
      expect(text).toContain("third-party usage or charges");
      expect(text).toContain("raw Provider errors");
      expect(text).toContain("30 days or 200 entries");
      expect(text).toContain("not synced to S3");
      expect(text).toContain("local HTTP S3 testing is only available in a development build");
      expect(text).toContain("daily pruning of expired Jev request diagnostics");
    }
  });
});

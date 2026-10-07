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
});

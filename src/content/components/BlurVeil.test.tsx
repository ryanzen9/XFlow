import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BlurVeil } from "./BlurVeil";
import { PostFeedback } from "./PostFeedback";
import { defaultStrategy } from "../../shared";

describe("BlurVeil", () => {
  test("renders strategy variables as escaped text", () => {
    const strategy = { ...defaultStrategy("timeline"), name: "<script>alert(1)</script>" };
    const markup = renderToStaticMarkup(
      <BlurVeil
        probability={0.91}
        details={{ strategy, modelNickname: "我的模型", modelId: "typesafe/jev-1.13", surface: "timeline" }}
        onReveal={() => {}}
      />,
    );
    expect(markup).toContain("91%");
    expect(markup).toContain("我的模型");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
  test("renders one native reveal surface with restrained copy", () => {
    const markup = renderToStaticMarkup(<BlurVeil probability={0.926} onReveal={() => {}} />);

    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Show filtered post. Spam likelihood 93%."');
    expect(markup).toContain("Filtered post");
    expect(markup).toContain("Likely spam · 93%");
    expect(markup).toContain("Show");
  });

  test("shows the formatted rate without exposing model branding", () => {
    const markup = renderToStaticMarkup(<BlurVeil probability={0.804} onReveal={() => {}} />);

    expect(markup).not.toContain("Jev");
    expect(markup).not.toContain("AI");
    expect(markup).toContain("Likely spam · 80%");
  });
});

describe("PostFeedback", () => {
  test("offers explicit and generalizable user corrections with decision metadata", () => {
    const markup = renderToStaticMarkup(
      <PostFeedback
        result={{ id: "1", probability: 0.91, decision: "blur", source: "exact-cache" }}
        canLabelAuthor
        onAction={async () => {}}
      />,
    );
    expect(markup).toContain("精确缓存");
    expect(markup).toContain("仅隐藏此内容");
    expect(markup).toContain("显示此内容");
    expect(markup).toContain("纠正当前策略判定");
    expect(markup).toContain("减少类似内容");
    expect(markup).toContain("屏蔽类似内容");
    expect(markup).toContain("屏蔽此作者");
    expect(markup).toContain("允许此作者内容");
  });

  test("keeps manual feedback available before a remote decision exists", () => {
    const markup = renderToStaticMarkup(<PostFeedback onAction={async () => {}} />);
    expect(markup).toContain("等待判定");
    expect(markup).toContain("仅隐藏此内容");
  });
});

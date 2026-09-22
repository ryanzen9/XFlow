import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChannelRow } from "./ChannelRow";

describe("ChannelRow", () => {
  test("reports the active channel and its credential state", () => {
    const markup = renderToStaticMarkup(<ChannelRow name="Vercel AI Gateway" configured />);

    expect(markup).toContain('data-state="configured"');
    expect(markup).toContain("Vercel AI Gateway");
    expect(markup).toContain("已配置");
  });

  test("asks for a key without ever rendering a credential field", () => {
    const markup = renderToStaticMarkup(<ChannelRow name="OpenRouter" configured={false} />);

    expect(markup).toContain('data-state="empty"');
    expect(markup).toContain("需要 API Key");
    expect(markup).not.toContain("password");
    expect(markup).not.toContain("<input");
  });
});

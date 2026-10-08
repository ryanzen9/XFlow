import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MonitorSwitch } from "./MonitorSwitch";

describe("MonitorSwitch", () => {
  const baseProps = {
    id: "enabled",
    title: "时间线",
    ariaLabel: "启用时间线分析",
    onChange: () => {},
  };

  test("exposes the enabled state with native switch semantics", () => {
    const markup = renderToStaticMarkup(<MonitorSwitch {...baseProps} checked />);

    expect(markup).toContain('data-state="on"');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain("checked");
    expect(markup).toContain("已启用");
    expect(markup).toContain("启用时间线分析");
    const input = markup.match(/<input[^>]*role="switch"[^>]*>/)?.[0] ?? "";
    const descriptionId = input.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeDefined();
    expect(markup).toContain(`id="${descriptionId}"`);
  });

  test("communicates and locks the pending state", () => {
    const markup = renderToStaticMarkup(<MonitorSwitch {...baseProps} checked={false} disabled pending />);

    expect(markup).toContain('data-state="pending"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("同步中");
    const input = markup.match(/<input[^>]*role="switch"[^>]*>/)?.[0] ?? "";
    expect(input).toContain('aria-busy="true"');
    expect(input).toContain('disabled=""');
  });

  test("renders one compact row without the long-form explanation", () => {
    const markup = renderToStaticMarkup(<MonitorSwitch {...baseProps} checked />);

    expect(markup.match(/role="switch"/g)).toHaveLength(1);
    expect(markup).not.toContain("<p");
  });

  test("keeps comment controls uniquely labelled", () => {
    const markup = renderToStaticMarkup(
      <MonitorSwitch {...baseProps} id="comments-enabled" title="评论区" ariaLabel="启用评论区分析" checked />,
    );

    expect(markup).toContain('id="comments-enabled"');
    expect(markup).toContain('data-slot="comments-enabled-filter-control"');
    expect(markup).toContain("评论区");
    const input = markup.match(/<input[^>]*role="switch"[^>]*>/)?.[0] ?? "";
    const inputId = input.match(/id="([^"]+)"/)?.[1];
    expect(inputId).toBeDefined();
    expect(markup).toContain(`for="${inputId}"`);
    expect(markup).toContain("启用评论区分析");
  });
});

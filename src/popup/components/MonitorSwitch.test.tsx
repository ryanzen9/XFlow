import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MonitorSwitch } from "./MonitorSwitch";

describe("MonitorSwitch", () => {
  const baseProps = {
    id: "enabled",
    routeLabel: "/home",
    title: "时间线过滤",
    ariaLabel: "启用时间线分析",
    onChange: () => {},
  };

  test("exposes the enabled state with native switch semantics", () => {
    const markup = renderToStaticMarkup(
      <MonitorSwitch {...baseProps} checked />,
    );

    expect(markup).toContain('data-state="on"');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain("checked");
    expect(markup).toContain("已启用");
    expect(markup).toContain("启用时间线分析");
    expect(markup).toContain('aria-describedby="enabled-state"');
  });

  test("communicates and locks the pending state", () => {
    const markup = renderToStaticMarkup(
      <MonitorSwitch {...baseProps} checked={false} disabled pending />,
    );

    expect(markup).toContain('data-state="pending"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("同步中");
    expect(markup).toContain("cursor-progress");
  });

  test("renders one compact row without the long-form explanation", () => {
    const markup = renderToStaticMarkup(
      <MonitorSwitch {...baseProps} checked />,
    );

    expect(markup).toContain("min-h-12");
    expect(markup).not.toContain("<p");
  });

  test("keeps comment controls uniquely labelled", () => {
    const markup = renderToStaticMarkup(
      <MonitorSwitch
        {...baseProps}
        id="comments-enabled"
        routeLabel="/status"
        title="评论区过滤"
        ariaLabel="启用评论区分析"
        checked
      />,
    );

    expect(markup).toContain('id="comments-enabled"');
    expect(markup).toContain('data-slot="comments-enabled-filter-control"');
    expect(markup).toContain("评论区过滤");
    expect(markup).toContain("/status");
    expect(markup).toContain('aria-describedby="comments-enabled-state"');
  });
});

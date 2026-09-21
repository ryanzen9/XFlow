import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MonitorSwitch } from "./MonitorSwitch";

describe("MonitorSwitch", () => {
  const baseProps = {
    id: "enabled",
    routeLabel: "/home",
    title: "时间线过滤",
    ariaLabel: "启用时间线分析",
    enabledDescription: "命中阈值的博文会实时进入遮蔽状态",
    disabledDescription: "所有博文保持可见",
    pendingDescription: "正在同步时间线中的内容状态",
    onChange: () => {},
  };

  test("exposes the enabled state with native switch semantics", () => {
    const markup = renderToStaticMarkup(<MonitorSwitch {...baseProps} checked />);

    expect(markup).toContain('data-state="on"');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain("checked");
    expect(markup).toContain("已启用");
  });

  test("communicates and locks the pending state", () => {
    const markup = renderToStaticMarkup(<MonitorSwitch {...baseProps} checked={false} disabled pending />);

    expect(markup).toContain('data-state="pending"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("同步中");
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
    expect(markup).toContain('aria-labelledby="comments-enabled-title"');
    expect(markup).toContain("评论区过滤");
    expect(markup).toContain("/status");
  });
});

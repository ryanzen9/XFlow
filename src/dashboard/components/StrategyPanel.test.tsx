import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultStrategy } from "../../shared";
import { StrategyPanel } from "./StrategyPanel";

function render(hoverTemplate?: string, hoverCss?: string) {
  const strategy = {
    ...defaultStrategy("timeline", 1, "test-strategy"),
    ...(hoverTemplate === undefined ? {} : { hoverTemplate }),
    ...(hoverCss === undefined ? {} : { hoverCss }),
  };
  return renderToStaticMarkup(
    <StrategyPanel
      strategy={strategy}
      strategyCount={2}
      surface="timeline"
      modelNickname="Jev"
      modelId="model"
      busy={false}
      onBack={() => {}}
      onChange={() => {}}
      onPriorityChange={() => {}}
      onSave={() => {}}
    />,
  );
}

test("keeps strategy editing and preview probability as separate labelled controls", () => {
  const markup = render();
  expect(markup).toContain('data-field="strategy-hit-rate-input"');
  expect(markup.match(/role="slider"/g)).toHaveLength(2);
  expect(markup).toContain('data-field="hover-template"');
  expect(markup).toContain('data-field="preview-content"');
  expect(markup).toContain('role="radiogroup"');
  expect(markup).not.toContain('type="submit" disabled=""');
});

test("invalid hover markup prevents saving and exposes the field error", () => {
  const markup = render("{{unsupported.variable}}");
  expect(markup).toContain('aria-invalid="true"');
  expect(markup).toContain('type="submit" disabled=""');
});

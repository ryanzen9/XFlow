import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppearanceControls } from "./AppearanceControls";

test("icon controls retain names for their next language and theme action", () => {
  const light = renderToStaticMarkup(<AppearanceControls theme="light" onThemeChange={() => {}} />);
  const dark = renderToStaticMarkup(<AppearanceControls theme="dark" onThemeChange={() => {}} />);
  expect(light).toContain('aria-label="切换为英文"');
  expect(light).toContain('aria-label="切换为深色主题"');
  expect(dark).toContain('aria-label="切换为浅色主题"');
  expect(light.match(/<button/g)).toHaveLength(2);
});

test("busy preferences cannot be changed through icon controls", () => {
  const markup = renderToStaticMarkup(<AppearanceControls theme="light" busy onThemeChange={() => {}} />);
  expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
});

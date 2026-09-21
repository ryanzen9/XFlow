import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeToggle } from "./theme";

describe("ThemeToggle", () => {
  test("announces the destination theme", () => {
    const light = renderToStaticMarkup(<ThemeToggle value="light" onChange={() => {}} />);
    const dark = renderToStaticMarkup(<ThemeToggle value="dark" onChange={() => {}} />);
    expect(light).toContain("切换为深色主题");
    expect(light).toContain('aria-pressed="false"');
    expect(dark).toContain("切换为浅色主题");
    expect(dark).toContain('aria-pressed="true"');
  });
});

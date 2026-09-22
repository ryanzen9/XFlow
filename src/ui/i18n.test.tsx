import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageToggle, normalizeLocale, providerLabel, translate } from "./i18n";

describe("UI internationalization", () => {
  test("normalizes unsupported locale values without changing the Chinese default", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLocale("fr")).toBe("zh-CN");
  });

  test("translates labels and interpolates values", () => {
    expect(translate("zh-CN", "strategy.saved", { name: "安静阅读" })).toContain("安静阅读");
    expect(translate("en", "strategy.saved", { name: "Quiet reading" })).toBe(
      "Strategy “Quiet reading” was saved; applicable pages will re-evaluate by priority.",
    );
    expect(providerLabel("typesafe", "en")).toBe("TypeSafe Official");
  });

  test("renders a keyboard-accessible language control", () => {
    const markup = renderToStaticMarkup(<LanguageToggle dense />);
    expect(markup).toContain("切换为英文");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="false"');
  });
});

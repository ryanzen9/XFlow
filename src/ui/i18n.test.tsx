import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageToggle, localizeError, normalizeLocale, providerLabel, translate } from "./i18n";

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
    expect(
      translate("zh-CN", "status.filterChanged", {
        surface: translate("zh-CN", "general.homeTimeline"),
        state: translate("zh-CN", "status.filterEnabled"),
      }),
    ).toBe("Home 时间线过滤已启用，页面状态正在同步。");
  });

  test("localizes shared validation and S3 errors", () => {
    expect(localizeError("en", "未知变量：{{model.key}}", "strategy.validationFailed")).toBe(
      "Unknown variable: {{model.key}}",
    );
    expect(localizeError("en", "不支持的 CSS 属性或空值：position", "strategy.validationFailed")).toBe(
      "Unsupported CSS property or empty value: position",
    );
    expect(
      localizeError(
        "en",
        "请填写 Endpoint、Region、Bucket、Object Key、Access Key ID 和 Secret Access Key。",
        "data.syncStartFailed",
      ),
    ).toStartWith("Enter the Endpoint");
    expect(localizeError("en", new Error("远程配置不是有效 JSON。"), "data.applyFailed")).toBe(
      "Could not write the configuration.",
    );
  });

  test("renders a keyboard-accessible language control", () => {
    const markup = renderToStaticMarkup(<LanguageToggle dense />);
    expect(markup).toContain("切换为英文");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="false"');
  });
});

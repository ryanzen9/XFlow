import type { Locale } from "./i18n";

const POLICY_BASE = "https://ryanzen9.github.io/XFlow/privacy-policy";

export function privacyPolicyUrl(locale: Locale): string {
  return `${POLICY_BASE}/${locale === "en" ? "" : "zh-CN/"}`;
}

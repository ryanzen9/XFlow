import type { Locale } from "./i18n";

const POLICY_BASE = "https://github.com/ryanzen9/XFlow/blob/main/docs";

export function privacyPolicyUrl(locale: Locale): string {
  return `${POLICY_BASE}/${locale === "en" ? "privacy-policy.en.md" : "privacy-policy.md"}`;
}

import { StatusDot, type StatusDotProps } from "@astryxdesign/core/StatusDot";
import type { ReactNode } from "react";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { Theme } from "../../shared";
import { useI18n } from "../../ui/i18n";

const chineseControls = {
  "@astryx.appShell.mobileNavigation": "菜单",
  "@astryx.appShell.skipToContent": "跳至内容",
  "@astryx.mobileNav.closeNavigation": "关闭菜单",
  "@astryx.mobileNav.toggle.open": "打开菜单",
  "@astryx.mobileNav.navigation": "导航",
  "@astryx.dialog.close": "关闭",
  "@astryx.field.optional": "选填",
  "@astryx.field.required": "必填",
  "@astryx.button.loading": "处理中",
  "@astryx.spinner.loading": "加载中",
  "@astryx.numberInput.decrementLabel": "减少 {label}",
  "@astryx.numberInput.incrementLabel": "增加 {label}",
  "@astryx.selector.placeholder": "请选择…",
  "@astryx.selector.empty": "暂无选项",
  "@astryx.link.newTab": "（在新标签页打开）",
  "@astryx.table.label": "可横向滚动的策略表格",
  "@astryx.keyboardHint.toNavigate": "切换标签",
};

export function DashboardLocale({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <InternationalizationProvider locale={locale} overrides={{ "zh-CN": chineseControls }}>
      {children}
    </InternationalizationProvider>
  );
}

/** Always pair the non-colour status label with the dot. */
export function Status({ label, variant = "neutral" }: Pick<StatusDotProps, "label" | "variant">) {
  return (
    <HStack gap={2}>
      <StatusDot label={label} variant={variant} aria-hidden="true" />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}

export function SectionIntro({
  title,
  description,
  id,
  level = 2,
}: {
  title: string;
  description?: string;
  id?: string;
  level?: 2 | 3;
}) {
  return (
    <VStack gap={1}>
      <Heading level={level} id={id}>
        {title}
      </Heading>
      {description && (
        <Text as="p" color="secondary">
          {description}
        </Text>
      )}
    </VStack>
  );
}

export function Panel({
  title,
  description,
  id,
  children,
}: {
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <VStack as="section" gap={4} padding={0} aria-labelledby={id}>
      <SectionIntro title={title} description={description} id={id} />
      {children}
    </VStack>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return (
    <HStack gap={2} hAlign="end" wrap="wrap">
      {children}
    </HStack>
  );
}

export function StatusMessage({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return (
    <Banner status={error ? "error" : "info"} title={message} role={error ? "alert" : "status"} container="section" />
  );
}

export function LabeledValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <VStack gap={1}>
      <Text type="supporting">{label}</Text>
      <Text>{children}</Text>
    </VStack>
  );
}

export function DashboardPreferences({
  theme,
  busy,
  onThemeChange,
}: {
  theme?: Theme;
  busy: boolean;
  onThemeChange: (theme: Theme) => void;
}) {
  const { locale, t, setLocale } = useI18n();
  const nextLocale = locale === "zh-CN" ? "en" : "zh-CN";
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <HStack gap={2} wrap="wrap">
      <Button
        label={t("language.switch")}
        aria-pressed={locale === "en"}
        size="sm"
        variant="ghost"
        isDisabled={busy}
        onClick={() => void setLocale(nextLocale).catch(() => undefined)}
      >
        {locale === "zh-CN" ? "EN" : "中文"}
      </Button>
      {theme && (
        <Button
          label={t(nextTheme === "dark" ? "theme.switch.dark" : "theme.switch.light")}
          size="sm"
          variant="ghost"
          isDisabled={busy}
          onClick={() => onThemeChange(nextTheme)}
        >
          {t(theme === "dark" ? "theme.dark" : "theme.light")}
        </Button>
      )}
    </HStack>
  );
}

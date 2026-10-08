import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Languages, Moon, Sun } from "lucide-react";
import type { Theme } from "../shared";
import { useI18n } from "./i18n";

export function AppearanceControls({
  theme,
  busy = false,
  onThemeChange,
}: {
  theme?: Theme;
  busy?: boolean;
  onThemeChange: (theme: Theme) => void;
}) {
  const { locale, t, setLocale } = useI18n();
  const languageLabel = t("language.switch");
  const nextTheme = theme === "dark" ? "light" : "dark";
  const themeLabel = t(nextTheme === "dark" ? "theme.switch.dark" : "theme.switch.light");
  return (
    <HStack gap={1}>
      <IconButton
        label={languageLabel}
        tooltip={languageLabel}
        icon={<Icon icon={Languages} size="sm" />}
        size="sm"
        variant="ghost"
        isDisabled={busy}
        onClick={() => void setLocale(locale === "zh-CN" ? "en" : "zh-CN").catch(() => undefined)}
      />
      {theme && (
        <IconButton
          label={themeLabel}
          tooltip={themeLabel}
          icon={<Icon icon={nextTheme === "dark" ? Moon : Sun} size="sm" />}
          size="sm"
          variant="ghost"
          isDisabled={busy}
          onClick={() => onThemeChange(nextTheme)}
        />
      )}
    </HStack>
  );
}

import type { Theme } from "../shared";
import { cn } from "./cn";
import { useI18n } from "./i18n";
import { focusRing } from "./styles";

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export async function initializeTheme(): Promise<void> {
  try {
    const { theme } = await chrome.storage.local.get(["theme"]);
    applyTheme(theme === "dark" ? "dark" : "light");
  } catch {
    applyTheme("light");
  }
}

interface ThemeToggleProps {
  value: Theme;
  disabled?: boolean;
  compact?: boolean;
  /** Icon-only at the 32px utility-row height. Used by the popup. */
  dense?: boolean;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ value, disabled, compact = false, dense = false, onChange }: ThemeToggleProps) {
  const { t } = useI18n();
  const next = value === "light" ? "dark" : "light";
  const iconOnly = compact || dense;
  return (
    <button
      type="button"
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-xs font-semibold text-muted transition hover:border-line-strong hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-55",
        focusRing,
        iconOnly && "justify-center px-0",
        compact && "size-11",
        dense && "size-8 min-h-8",
      )}
      aria-label={t(next === "dark" ? "theme.switch.dark" : "theme.switch.light")}
      title={t(next === "dark" ? "theme.switch.dark" : "theme.switch.light")}
      aria-pressed={value === "dark"}
      disabled={disabled}
      onClick={() => onChange(next)}
    >
      <span
        className={cn(
          "relative grid size-6 place-items-center overflow-hidden rounded-full bg-selected text-sm text-ink",
          dense && "size-5 text-xs",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute transition duration-200",
            value === "light" ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0",
          )}
        >
          ☼
        </span>
        <span
          className={cn(
            "absolute transition duration-200",
            value === "dark" ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
          )}
        >
          ◐
        </span>
      </span>
      {!iconOnly && <span>{t(value === "light" ? "theme.light" : "theme.dark")}</span>}
    </button>
  );
}

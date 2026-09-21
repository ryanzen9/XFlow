import type { Theme } from "../shared";
import { cn } from "./cn";
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
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ value, disabled, compact = false, onChange }: ThemeToggleProps) {
  const next = value === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-[11px] font-semibold text-muted shadow-sm transition hover:border-line-strong hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-55",
        focusRing,
        compact && "size-11 justify-center px-0",
      )}
      aria-label={`切换为${next === "dark" ? "深色" : "浅色"}主题`}
      title={`切换为${next === "dark" ? "深色" : "浅色"}主题`}
      aria-pressed={value === "dark"}
      disabled={disabled}
      onClick={() => onChange(next)}
    >
      <span
        className="relative grid size-6 place-items-center overflow-hidden rounded-full bg-soft text-sm text-signal"
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
      {!compact && <span>{value === "light" ? "浅色" : "深色"}</span>}
    </button>
  );
}

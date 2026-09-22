import { cn } from "../ui/cn";
import { focusRing } from "../ui/styles";
import { ThemeToggle } from "../ui/theme";
import { LanguageToggle, providerLabel, useI18n } from "../ui/i18n";
import { ActivitySummary } from "./components/ActivitySummary";
import { ChannelRow } from "./components/ChannelRow";
import { ModelFooter } from "./components/ModelFooter";
import { MonitorSwitch } from "./components/MonitorSwitch";
import { useActivity } from "./hooks/use-activity";
import { useSettingsForm } from "./hooks/use-settings-form";

/* Secondary groups share one list surface: hairline rows, no per-row cards. */
const groupLabel = "mb-1.5 font-mono text-caption text-muted uppercase";
const list = "divide-y divide-line overflow-hidden rounded-md border border-line bg-surface";

export function App() {
  const form = useSettingsForm();
  const activity = useActivity();
  const { locale, t } = useI18n();

  return (
    <main className="flex min-h-(--layout-popup-height) w-full flex-col bg-canvas bg-(image:--pattern-margin-rule) px-4 pt-3.5 pb-3 font-sans text-ink transition-colors">
      <header className="mb-3 flex items-center gap-2.5">
        <img
          className="size-7 rounded-full border border-line-strong object-cover"
          src={form.theme === "dark" ? "logo.png" : "logo-dark.png"}
          alt="XFlow logo"
        />
        <h1 className="font-display text-sm leading-none font-bold">XFlow</h1>
      </header>

      <ActivitySummary {...activity} live={form.enabled || form.commentsEnabled} />

      <section className="mt-3.5" aria-label={t("popup.monitoringScope")}>
        <p className={groupLabel}>{t("popup.monitoring")}</p>
        <div className={list}>
          <MonitorSwitch
            id="enabled"
            routeLabel="/home"
            title={t("popup.timeline")}
            ariaLabel={t("popup.timelineAria")}
            checked={form.enabled}
            disabled={!form.settingsReady || form.enabledPending}
            pending={form.enabledPending}
            onChange={(event) => void form.setEnabled(event.currentTarget.checked)}
          />
          <MonitorSwitch
            id="comments-enabled"
            routeLabel="/status"
            title={t("popup.comments")}
            ariaLabel={t("popup.commentsAria")}
            checked={form.commentsEnabled}
            disabled={!form.settingsReady || form.commentsEnabledPending}
            pending={form.commentsEnabledPending}
            onChange={(event) => void form.setCommentsEnabled(event.currentTarget.checked)}
          />
        </div>
      </section>

      <section className="mt-3.5" aria-label={t("popup.currentProvider")}>
        <p className={groupLabel}>{t("popup.provider")}</p>
        <div className={list}>
          <ChannelRow name={providerLabel(form.activeProvider, locale)} configured={form.configured} />
        </div>
      </section>

      <p
        id="save-status"
        className={cn(
          "mt-2.5 min-h-4 text-meta leading-[1.45] text-faint",
          form.status.tone === "success" && "text-ink",
          form.status.tone === "error" && "text-danger",
        )}
        role="status"
        aria-live="polite"
      >
        {form.status.message}
      </p>

      <div className="mt-auto">
        <ModelFooter modelId={form.modelId} />
        <div className="mt-2 flex items-stretch gap-2">
          <button
            className={cn(
              "min-h-8 min-w-0 flex-1 rounded-md border-0 bg-selected px-3 text-xs text-ink transition hover:bg-hover",
              focusRing,
            )}
            type="button"
            onClick={() => void chrome.runtime.openOptionsPage()}
          >
            {t("popup.dashboard")}
          </button>
          <LanguageToggle dense />
          <ThemeToggle value={form.theme} dense onChange={(theme) => void form.setTheme(theme)} />
        </div>
      </div>
    </main>
  );
}

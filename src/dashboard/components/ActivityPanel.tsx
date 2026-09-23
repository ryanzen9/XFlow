import { useState } from "react";
import { ACTIVITY_HEATMAP_DAYS, ACTIVITY_TREND_DAYS, activityDays, weeklyActivity } from "../../shared";
import { focusRing } from "../../ui/styles";
import { useActivity } from "../hooks/use-activity";
import { ActivityHeatmap } from "./activity/ActivityHeatmap";
import { ActivityTrend } from "./activity/ActivityTrend";
import { ClearActivityDialog } from "./activity/ClearActivityDialog";
import { WeeklyReview } from "./activity/WeeklyReview";
import { useI18n } from "../../ui/i18n";

export function ActivityPanel() {
  const { t } = useI18n();
  const [view, setView] = useState<"daily" | "trend">("daily");
  const activity = useActivity();
  const now = activity.now;
  const heatmap = activityDays(activity.data, ACTIVITY_HEATMAP_DAYS, now);
  const trend = activityDays(activity.data, ACTIVITY_TREND_DAYS, now);
  const weekly = weeklyActivity(activity.data, now);

  return (
    <div className="grid gap-[22px]" aria-busy={activity.loading || activity.busy}>
      <section className="rounded-xl border border-line bg-surface p-[18px]" aria-labelledby="activity-title">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="activity-title" className="text-sm font-semibold">
                {t("general.activity")}
              </h2>
              <span className="rounded-full bg-selected px-2 py-1 font-mono text-caption font-semibold text-ink">
                {t("general.localFirst")}
              </span>
            </div>
            <p className="mt-1 text-meta text-muted">{t("general.activityPrivacy")}</p>
          </div>
          <button
            className={`${focusRing} flex min-h-(--control-height) shrink-0 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-label text-ink transition-colors hover:bg-hover`}
            type="button"
            aria-controls="activity-visualization"
            onClick={() => setView((current) => (current === "daily" ? "trend" : "daily"))}
          >
            <span aria-hidden="true">{view === "daily" ? "⌁" : "▦"}</span>
            {view === "daily" ? t("activity.showTrend") : t("activity.showDaily")}
          </button>
        </div>
        <div
          id="activity-visualization"
          className="min-h-48 border-t border-line pt-5"
          role="region"
          aria-label={view === "daily" ? t("activity.heatmap") : t("activity.trend")}
        >
          {view === "daily" ? <ActivityHeatmap days={heatmap} /> : <ActivityTrend days={trend} />}
        </div>
      </section>

      <WeeklyReview weekly={weekly} />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-[18px]">
        <div>
          <h2 className="text-sm font-semibold">{t("activity.privacy")}</h2>
          <p className="mt-1 max-w-xl text-meta leading-relaxed text-muted">{t("activity.privacyDescription")}</p>
        </div>
        <ClearActivityDialog busy={activity.busy} onClear={activity.clear} />
      </section>
      {activity.error && (
        <p className="text-xs text-danger" role="alert">
          {activity.error}
        </p>
      )}
    </div>
  );
}

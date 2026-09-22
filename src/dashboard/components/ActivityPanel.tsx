import { ACTIVITY_HEATMAP_DAYS, ACTIVITY_TREND_DAYS, activityDays, weeklyActivity } from "../../shared";
import { useActivity } from "../hooks/use-activity";
import { ActivityHeatmap } from "./activity/ActivityHeatmap";
import { ActivityTrend } from "./activity/ActivityTrend";
import { ClearActivityDialog } from "./activity/ClearActivityDialog";
import { WeeklyReview } from "./activity/WeeklyReview";
import { useI18n } from "../../ui/i18n";

export function ActivityPanel() {
  const { t } = useI18n();
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
            <h2 id="activity-title" className="text-sm font-semibold">
              {t("general.activity")}
            </h2>
            <p className="mt-1 text-meta text-muted">{t("general.activityPrivacy")}</p>
          </div>
          <span className="rounded-full bg-selected px-2 py-1 font-mono text-caption font-semibold text-ink">
            {t("general.localFirst")}
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <ActivityHeatmap days={heatmap} />
          <ActivityTrend days={trend} />
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

import { ACTIVITY_HISTORY_DAYS, activityDays, activityHistory, type ActivityDay } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { useActivity } from "../hooks/use-activity";
import { DailyBlockedChart } from "./activity/DailyBlockedChart";
import { FilterHistory } from "./activity/FilterHistory";
import { LogStorageSummary } from "./activity/LogStorageSummary";

export function LogOverview({ days }: { days: ActivityDay[] }) {
  const { locale, t } = useI18n();
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = Math.max(0, ...days.map((day) => day.count));
  const number = new Intl.NumberFormat(locale);
  const average = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const stats = [
    { label: t("history.todayBlocked"), value: number.format(days.at(-1)?.count ?? 0) },
    { label: t("history.periodBlocked"), value: number.format(total) },
    { label: t("history.dailyAverage"), value: average.format(total / ACTIVITY_HISTORY_DAYS) },
    { label: t("history.peakDay"), value: number.format(peak) },
  ];

  return (
    <div className="p-[18px] sm:p-6">
      <div className="mb-6">
        <h2 id="log-overview-title" className="text-heading text-ink">
          {t("history.overview")}
        </h2>
        <p className="mt-1 text-meta text-muted">{t("history.overviewDescription")}</p>
      </div>
      <dl className="mb-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-label text-muted">{stat.label}</dt>
            <dd className="mt-1 font-mono text-title text-ink tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <DailyBlockedChart days={days} />
    </div>
  );
}

/** The Log page owns the 30-day filtering record; insights stay on General. */
export function LogPanel() {
  const activity = useActivity();
  const history = activityHistory(activity.data, activity.now);
  const days = activityDays(activity.data, ACTIVITY_HISTORY_DAYS, activity.now);

  return (
    <div className="grid max-w-[1180px] content-start gap-4" aria-busy={activity.loading || activity.busy}>
      <section
        className="overflow-hidden rounded-xl border border-line bg-surface"
        aria-labelledby="log-overview-title"
      >
        <LogOverview days={days} />
        <div className="border-t border-line p-[18px] sm:p-6">
          <FilterHistory
            history={history}
            now={activity.now}
            busy={activity.busy}
            onIncorrect={(id) => void activity.markIncorrect(id)}
          />
        </div>
        <div className="border-t border-line p-[18px] sm:p-6">
          <LogStorageSummary
            bytesInUse={activity.bytesInUse}
            storageLimit={activity.storageLimit}
            recordCount={history.length}
            busy={activity.busy}
            onClear={activity.clearHistory}
          />
        </div>
      </section>
      {activity.error && (
        <p className="text-xs text-danger" role="alert">
          {activity.error}
        </p>
      )}
    </div>
  );
}

import type { WeeklyActivity } from "../../../shared";
import { useI18n } from "../../../ui/i18n";

export function WeeklyReview({ weekly }: { weekly: WeeklyActivity }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dayFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const range = `${dayFormatter.format(weekly.start)} – ${dayFormatter.format(weekly.end)}`;
  return (
    <section className="rounded-xl border border-line bg-surface p-[18px]" aria-labelledby="weekly-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="weekly-title" className="text-sm font-semibold">
            {t("activity.weekly")}
          </h2>
          <p className="mt-1 text-meta text-muted">{range}</p>
          <strong className="mt-4 block text-display leading-none">{number.format(weekly.total)}</strong>
          <span className="mt-1 block text-meta text-muted">{t("activity.filteredWeek")}</span>
        </div>
        <dl className="grid min-w-44 gap-4 text-meta">
          <div>
            <dt className="text-muted">{t("activity.mostActive")}</dt>
            <dd className="mt-1 font-semibold text-ink">
              {weekly.mostActive
                ? `${weekdayFormatter.format(weekly.mostActive.date)} · ${number.format(weekly.mostActive.count)}`
                : t("activity.noActivity")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("activity.compared")}</dt>
            <dd className="mt-1 font-semibold text-ink">
              {weekly.comparisonPercent === undefined
                ? t("activity.firstSummary")
                : `${weekly.comparisonPercent >= 0 ? "+" : ""}${weekly.comparisonPercent}%`}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

import type { WeeklyActivity } from "../../../shared";

const number = new Intl.NumberFormat();
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

export function WeeklyReview({ weekly }: { weekly: WeeklyActivity }) {
  const range = `${dayFormatter.format(weekly.start)} – ${dayFormatter.format(weekly.end)}`;
  return (
    <section className="rounded-xl border border-line bg-surface p-[18px]" aria-labelledby="weekly-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="weekly-title" className="text-sm font-semibold">
            Weekly Review
          </h2>
          <p className="mt-1 text-meta text-muted">{range}</p>
          <strong className="mt-4 block text-display leading-none">{number.format(weekly.total)}</strong>
          <span className="mt-1 block text-meta text-muted">Filtered this week</span>
        </div>
        <dl className="grid min-w-44 gap-4 text-meta">
          <div>
            <dt className="text-muted">Most active day</dt>
            <dd className="mt-1 font-semibold text-ink">
              {weekly.mostActive
                ? `${weekdayFormatter.format(weekly.mostActive.date)} · ${number.format(weekly.mostActive.count)}`
                : "No activity yet"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Compared with last week</dt>
            <dd className="mt-1 font-semibold text-ink">
              {weekly.comparisonPercent === undefined
                ? "This is your first weekly summary."
                : `${weekly.comparisonPercent >= 0 ? "+" : ""}${weekly.comparisonPercent}%`}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

import type { ActivityDay } from "../../../shared";
import { useI18n } from "../../../ui/i18n";

export function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dayFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const max = Math.max(...days.map(({ count }) => count), 0);
  const level = (count: number) => (count === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4)));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-ui font-semibold">{t("activity.heatmap")}</h3>
          <p className="mt-0.5 text-meta text-muted">{t("activity.last12Weeks")}</p>
        </div>
        <span className="text-caption text-muted">{t("activity.lessMore")}</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          className="mx-auto grid w-max grid-flow-col grid-rows-7 gap-1"
          role="group"
          aria-label={t("activity.heatmapAria")}
        >
          {days.map((item) => {
            const label = t("activity.count", {
              date: dayFormatter.format(item.date),
              count: number.format(item.count),
            });
            return (
              <button
                key={item.day}
                className="group relative size-6 rounded-xs border border-line bg-canvas focus-visible:z-10 focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus data-[level='1']:bg-ink/15 data-[level='2']:bg-ink/35 data-[level='3']:bg-ink/60 data-[level='4']:bg-ink"
                type="button"
                data-level={level(item.count)}
                aria-label={label}
              >
                <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-20 w-max max-w-40 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-caption text-canvas opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {max === 0 && <p className="mt-3 text-meta text-muted">{t("activity.none")}</p>}
    </div>
  );
}

import type { ActivityDay } from "../../../shared";
import { useI18n } from "../../../ui/i18n";

export function ActivityTrend({ days }: { days: ActivityDay[] }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dayFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const maximum = Math.max(...days.map(({ count }) => count), 1);
  const points = days.map((item, index) => ({
    ...item,
    x: 24 + index * 78,
    y: 18 + (1 - item.count / maximum) * 96,
  }));
  const path = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-ui font-semibold">{t("activity.trend")}</h3>
        <p className="mt-0.5 text-meta text-muted">{t("activity.last7Days")}</p>
      </div>
      <svg
        className="h-auto w-full overflow-visible"
        viewBox="0 0 516 150"
        role="img"
        aria-label={t("activity.trendAria")}
      >
        <path d="M 24 114 H 492" fill="none" stroke="var(--bd-subtle)" />
        <path d={path} fill="none" stroke="var(--fg-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((point) => {
          const label = t("activity.count", {
            date: dayFormatter.format(point.date),
            count: number.format(point.count),
          });
          return (
            <g key={point.day}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--bg-raised)"
                stroke="var(--fg-1)"
                strokeWidth="2"
                tabIndex={0}
                role="img"
                aria-label={label}
              >
                <title>{label}</title>
              </circle>
              <text x={point.x} y="137" textAnchor="middle" fontSize="9" fill="var(--fg-3)">
                {weekdayFormatter.format(point.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {days.map((item) => (
          <li key={item.day}>{t("activity.count", { date: dayFormatter.format(item.date), count: item.count })}</li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useRef } from "react";
import type { ActivityDay } from "../../../shared";
import { useI18n } from "../../../ui/i18n";

/** Daily counts include records whose details were cleared. */
export function DailyBlockedChart({ days }: { days: ActivityDay[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const maximum = Math.max(1, ...days.map((day) => day.count));
  const top = Math.ceil(maximum / 2) * 2;
  const left = 42;
  const right = 736;
  const baseline = 142;
  const height = 120;
  const points = days.map((day, index) => ({
    ...day,
    x: left + (index / Math.max(days.length - 1, 1)) * (right - left),
    y: baseline - (day.count / top) * height,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${line} L ${right} ${baseline} L ${left} ${baseline} Z` : "";
  const labelIndices = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-label text-ink">{t("history.dailyChart")}</h3>
        <p className="text-meta text-muted">{t("history.dailyChartDescription")}</p>
      </div>
      <div ref={scroller} className="overflow-x-auto" role="region" aria-label={t("history.chartScrollArea")}>
        <svg
          className="h-auto w-full min-w-[780px]"
          viewBox="0 0 780 182"
          role="img"
          aria-label={t("history.dailyChartAria")}
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = baseline - fraction * height;
            return (
              <g key={fraction}>
                <path d={`M ${left} ${y} H ${right}`} fill="none" stroke="var(--bd-subtle)" />
                <text x="31" y={y + 3} textAnchor="end" fontSize="var(--size-meta)" fill="var(--fg-3)">
                  {number.format(top * fraction)}
                </text>
              </g>
            );
          })}
          <path d={area} fill="var(--bg-selected)" />
          <path d={line} fill="none" stroke="var(--fg-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {labelIndices.map((index) => {
            const point = points[index];
            if (!point) return null;
            return (
              <text
                key={point.day}
                x={point.x}
                y="169"
                textAnchor={index === 0 ? "start" : index === days.length - 1 ? "end" : "middle"}
                fontSize="var(--size-meta)"
                fill="var(--fg-3)"
              >
                {dateFormatter.format(point.date)}
              </text>
            );
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {days.map((day) => (
          <li key={day.day}>
            {t("activity.count", { date: dateFormatter.format(day.date), count: number.format(day.count) })}
          </li>
        ))}
      </ul>
    </div>
  );
}

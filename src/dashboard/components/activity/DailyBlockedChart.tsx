import { useEffect, useRef } from "react";
import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import { VStack } from "@astryxdesign/core/VStack";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { SectionIntro } from "../DashboardUI";
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
    <VStack gap={3}>
      <SectionIntro title={t("history.dailyChart")} level={3} />
      <ScrollableArea ref={scroller} axis="inline" role="region" label={t("history.chartScrollArea")}>
        <svg
          width="780"
          className="h-auto min-w-full"
          viewBox="0 0 780 182"
          role="img"
          aria-label={t("history.dailyChartAria")}
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = baseline - fraction * height;
            return (
              <g key={fraction}>
                <path d={`M ${left} ${y} H ${right}`} fill="none" stroke="var(--color-border)" />
                <text
                  x="31"
                  y={y + 3}
                  textAnchor="end"
                  fontSize="var(--font-size-sm)"
                  fill="var(--color-text-secondary)"
                >
                  {number.format(top * fraction)}
                </text>
              </g>
            );
          })}
          <path d={area} fill="var(--color-neutral)" />
          <path
            d={line}
            fill="none"
            stroke="var(--color-text-primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {labelIndices.map((index) => {
            const point = points[index];
            if (!point) return null;
            return (
              <text
                key={point.day}
                x={point.x}
                y="169"
                textAnchor={index === 0 ? "start" : index === days.length - 1 ? "end" : "middle"}
                fontSize="var(--font-size-sm)"
                fill="var(--color-text-secondary)"
              >
                {dateFormatter.format(point.date)}
              </text>
            );
          })}
        </svg>
      </ScrollableArea>
      <VisuallyHidden as="ul">
        {days.map((day) => (
          <li key={day.day}>
            {t("activity.count", { date: dateFormatter.format(day.date), count: number.format(day.count) })}
          </li>
        ))}
      </VisuallyHidden>
    </VStack>
  );
}

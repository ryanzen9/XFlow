import type { ActivityDay } from "../../../shared";

const number = new Intl.NumberFormat();
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

export function ActivityTrend({ days }: { days: ActivityDay[] }) {
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
        <h3 className="text-[13px] font-semibold">Activity Trend</h3>
        <p className="mt-0.5 text-[10px] text-muted">Last 7 days · Filtered</p>
      </div>
      <svg className="h-auto w-full overflow-visible" viewBox="0 0 516 150" role="img" aria-label="最近七天过滤趋势">
        <path d="M 24 114 H 492" fill="none" stroke="var(--color-line)" />
        <path d={path} fill="none" stroke="var(--color-signal)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((point) => {
          const label = `${dayFormatter.format(point.date)}，${number.format(point.count)} filtered`;
          return (
            <g key={point.day}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--color-panel)"
                stroke="var(--color-signal)"
                strokeWidth="2"
                tabIndex={0}
                role="img"
                aria-label={label}
              >
                <title>{label}</title>
              </circle>
              <text x={point.x} y="137" textAnchor="middle" fontSize="9" fill="var(--color-muted)">
                {weekdayFormatter.format(point.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {days.map((item) => (
          <li key={item.day}>
            {dayFormatter.format(item.date)}: {item.count} filtered
          </li>
        ))}
      </ul>
    </div>
  );
}

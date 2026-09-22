import type { ActivityDay } from "../../../shared";

const number = new Intl.NumberFormat();
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  const max = Math.max(...days.map(({ count }) => count), 0);
  const level = (count: number) => (count === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4)));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">Activity Heatmap</h3>
          <p className="mt-0.5 text-[10px] text-muted">过去 12 周</p>
        </div>
        <span className="text-[9px] text-muted">Less · More</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="grid" aria-label="过去 12 周每日过滤活动">
          {days.map((item) => {
            const label = `${dayFormatter.format(item.date)}，${number.format(item.count)} filtered`;
            return (
              <button
                key={item.day}
                className="group relative size-[13px] rounded-[3px] border border-line bg-canvas focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[level='1']:bg-signal/20 data-[level='2']:bg-signal/40 data-[level='3']:bg-signal/65 data-[level='4']:bg-signal"
                type="button"
                role="gridcell"
                data-level={level(item.count)}
                aria-label={label}
              >
                <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-20 w-max max-w-40 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[9px] text-canvas opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {max === 0 && <p className="mt-3 text-[10px] text-muted">No filtering activity yet.</p>}
    </div>
  );
}

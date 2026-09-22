import type { ActivitySummary as ActivitySummaryValue } from "../../shared";

const number = new Intl.NumberFormat();

export function ActivitySummary({ today, allTime }: ActivitySummaryValue) {
  return (
    <section
      className="rounded-[14px] border border-line bg-panel px-4 pt-4 pb-3.5 shadow-[0_12px_34px_color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
      aria-label="过滤活动"
    >
      <p className="font-mono text-[9px] font-semibold tracking-[0.14em] text-muted">TODAY</p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <strong
            key={today}
            className="activity-number block text-[46px] leading-none font-semibold tracking-[-0.065em]"
          >
            {number.format(today)}
          </strong>
          <span className="mt-1 block text-[11px] text-muted">Filtered today</span>
        </div>
        <span
          className="mb-1 size-2 rounded-full bg-signal shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-signal)_12%,transparent)]"
          aria-hidden="true"
        />
      </div>
      <div className="mt-3.5 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-[10px] text-muted">All time</span>
        <p className="text-[11px] text-ink">
          <strong key={allTime} className="activity-number font-mono text-[15px] font-semibold">
            {number.format(allTime)}
          </strong>{" "}
          filtered in total
        </p>
      </div>
    </section>
  );
}

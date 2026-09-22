import type { ActivitySummary as ActivitySummaryValue } from "../../shared";
import { useI18n } from "../../ui/i18n";

export interface ActivitySummaryProps extends ActivitySummaryValue {
  /** Monitoring is live on at least one surface. The phosphor dot is state, not decoration. */
  live?: boolean;
}

export function ActivitySummary({ today, allTime, live = false }: ActivitySummaryProps) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  return (
    <section className="rounded-lg border border-line bg-surface px-3.5 pt-3 pb-3" aria-label={t("popup.activity")}>
      <div className="flex items-center gap-2">
        <p className="font-mono text-caption text-muted uppercase">{t("popup.filteredToday")}</p>
        {live && (
          <span
            className="size-1.5 rounded-full bg-live shadow-[0_0_0_4px_var(--live-glow)]"
            data-slot="activity-live"
            aria-hidden="true"
          />
        )}
      </div>
      <strong key={today} className="activity-number mt-1.5 block text-readout leading-none tabular-nums">
        {number.format(today)}
      </strong>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2">
        <span className="font-mono text-caption text-muted uppercase">{t("popup.allTime")}</span>
        <p className="text-ui text-ink">
          <strong key={allTime} className="activity-number font-mono text-ui tabular-nums">
            {number.format(allTime)}
          </strong>{" "}
          <span className="text-meta text-muted">{t("popup.filteredTotal")}</span>
        </p>
      </div>
    </section>
  );
}

import { Badge } from "@astryxdesign/core/Badge";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import type { FilterSurface } from "../../shared";
import { useI18n } from "../../ui/i18n";

export function StrategyTabs({
  value,
  counts,
  onChange,
}: {
  value: FilterSurface;
  counts: Record<FilterSurface, number>;
  onChange: (surface: FilterSurface) => void;
}) {
  const { t } = useI18n();
  return (
    <TabList
      value={value}
      onChange={(next) => onChange(next as FilterSurface)}
      role="tablist"
      aria-label={t("strategy.tabs")}
      hasDivider
      layout="fill"
    >
      <Tab
        id="strategy-tab-timeline"
        value="timeline"
        label={t("strategy.timeline")}
        panelId="strategy-panel-timeline"
        endContent={<Badge label={counts.timeline} variant="neutral" />}
      />
      <Tab
        id="strategy-tab-comments"
        value="comments"
        label={t("strategy.comments")}
        panelId="strategy-panel-comments"
        endContent={<Badge label={counts.comments} variant="neutral" />}
      />
    </TabList>
  );
}

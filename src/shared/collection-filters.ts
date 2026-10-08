import type { ActivityEvent, ActivityStatus } from "./activity";
import type { FilterStrategy } from "./strategy";

export type StrategyStatusFilter = "all" | "enabled" | "disabled";
export type HistoryStatusFilter = "all" | ActivityStatus;

function matchesQuery(values: (string | undefined)[], query: string): boolean {
  const words = query.normalize("NFKC").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = values.filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
  return words.every((word) => text.includes(word));
}

/** Returns original records in priority order; edits must still use the complete library. */
export function filterStrategies(strategies: FilterStrategy[], query: string, status: StrategyStatusFilter) {
  return strategies.filter(
    (strategy) =>
      (status === "all" || strategy.enabled === (status === "enabled")) &&
      matchesQuery([strategy.name, strategy.prompt], query),
  );
}

export function filterHistory(history: ActivityEvent[], query: string, status: HistoryStatusFilter) {
  return history.filter(
    (event) =>
      (status === "all" || event.status === status) &&
      matchesQuery([event.preview, event.author, event.policyName, event.contentId], query),
  );
}

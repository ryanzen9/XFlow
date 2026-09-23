import { activityHistory } from "../../shared";
import { useActivity } from "../hooks/use-activity";
import { FilterHistory } from "./activity/FilterHistory";
import { LogStorageSummary } from "./activity/LogStorageSummary";

/** The Log page owns the 30-day filtering record; insights stay on General. */
export function LogPanel() {
  const activity = useActivity();
  const history = activityHistory(activity.data, activity.now);

  return (
    <div className="grid max-w-[980px] content-start gap-[22px]" aria-busy={activity.loading || activity.busy}>
      <LogStorageSummary
        bytesInUse={activity.bytesInUse}
        storageLimit={activity.storageLimit}
        recordCount={history.length}
        busy={activity.busy}
        onClear={activity.clearHistory}
      />
      <FilterHistory
        history={history}
        now={activity.now}
        busy={activity.busy}
        onIncorrect={(id) => void activity.markIncorrect(id)}
      />
      {activity.error && (
        <p className="text-xs text-danger" role="alert">
          {activity.error}
        </p>
      )}
    </div>
  );
}

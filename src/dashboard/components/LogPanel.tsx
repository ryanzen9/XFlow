import { activityHistory } from "../../shared";
import { useActivity } from "../hooks/use-activity";
import { FilterHistory } from "./activity/FilterHistory";

/** The Log page owns the 30-day filtering record; insights stay on General. */
export function LogPanel() {
  const activity = useActivity();
  const history = activityHistory(activity.data, activity.now);

  return (
    <div className="grid max-w-[980px] content-start gap-[22px]" aria-busy={activity.loading || activity.busy}>
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

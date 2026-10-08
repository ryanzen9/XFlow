import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/VStack";
import { SectionIntro, StatusMessage } from "./DashboardUI";
import { ACTIVITY_HISTORY_DAYS, activityDays, activityHistory, type ActivityDay } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { useActivity } from "../hooks/use-activity";
import { useJevRequestLog } from "../hooks/use-jev-request-log";
import { DailyBlockedChart } from "./activity/DailyBlockedChart";
import { FilterHistory } from "./activity/FilterHistory";
import { LogStorageSummary } from "./activity/LogStorageSummary";
import { JevRequestHistory } from "./activity/JevRequestHistory";
import { MetricGrid } from "./MetricGrid";

export function LogOverview({ days }: { days: ActivityDay[] }) {
  const { locale, t } = useI18n();
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = Math.max(0, ...days.map((day) => day.count));
  const number = new Intl.NumberFormat(locale);
  const average = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const stats = [
    { label: t("history.todayBlocked"), value: number.format(days.at(-1)?.count ?? 0) },
    { label: t("history.periodBlocked"), value: number.format(total) },
    { label: t("history.dailyAverage"), value: average.format(total / ACTIVITY_HISTORY_DAYS) },
    { label: t("history.peakDay"), value: number.format(peak) },
  ];

  return (
    <VStack gap={5}>
      <SectionIntro id="log-overview-title" title={t("history.overview")} />
      <MetricGrid stats={stats} />
      <DailyBlockedChart days={days} />
    </VStack>
  );
}

/** The Log page owns the 30-day filtering record; insights stay on Overview. */
export function LogPanel() {
  const activity = useActivity();
  const requests = useJevRequestLog();
  const history = activityHistory(activity.data, activity.now);
  const days = activityDays(activity.data, ACTIVITY_HISTORY_DAYS, activity.now);

  return (
    <VStack gap={6} aria-busy={activity.loading || activity.busy || requests.loading || requests.busy}>
      <LogOverview days={days} />
      <Divider />
      <FilterHistory
        history={history}
        now={activity.now}
        busy={activity.busy}
        onIncorrect={(id) => void activity.markIncorrect(id)}
      />
      <Divider />
      <LogStorageSummary
        bytesInUse={activity.bytesInUse}
        storageLimit={activity.storageLimit}
        recordCount={history.length}
        busy={activity.busy}
        onClear={activity.clearHistory}
      />
      <Divider />
      <JevRequestHistory entries={requests.data.entries} busy={requests.busy} onClear={requests.clear} />
      <StatusMessage message={activity.error} error />
      <StatusMessage message={requests.error} error />
    </VStack>
  );
}

import { useState } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Grid } from "@astryxdesign/core/Grid";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { Text } from "@astryxdesign/core/Text";

import { VStack } from "@astryxdesign/core/VStack";
import { ChartNoAxesCombined, Grid2X2 } from "lucide-react";
import {
  ACTIVITY_HEATMAP_DAYS,
  ACTIVITY_TREND_DAYS,
  activityDays,
  activityHistory,
  weeklyActivity,
  type ActivityDay,
  type FilterSurface,
} from "../../shared";
import { useI18n } from "../../ui/i18n";
import { useActivity } from "../hooks/use-activity";
import { SectionIntro, StatusMessage } from "./DashboardUI";
import { ActivityHeatmap } from "./activity/ActivityHeatmap";
import { ActivityTrend } from "./activity/ActivityTrend";
import { ClearActivityDialog } from "./activity/ClearActivityDialog";
import { WeeklyReview } from "./activity/WeeklyReview";
import { RecentActivity } from "./activity/RecentActivity";
import { MetricGrid } from "./MetricGrid";

export function OverviewMetrics({ days, loading = false }: { days: ActivityDay[]; loading?: boolean }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const value = (count: number) => (loading ? "—" : number.format(count));
  return (
    <MetricGrid
      stats={[
        { label: t("history.todayBlocked"), value: value(days.at(-1)?.count ?? 0) },
        { label: t("overview.last7Total"), value: value(days.slice(-7).reduce((sum, day) => sum + day.count, 0)) },
        { label: t("history.periodBlocked"), value: value(days.reduce((sum, day) => sum + day.count, 0)) },
        { label: t("overview.activeDays"), value: value(days.filter((day) => day.count > 0).length) },
      ]}
    />
  );
}

export function ActivityPanel({ onOpenLog }: { onOpenLog?: () => void } = {}) {
  const { t } = useI18n();
  const [view, setView] = useState<"daily" | "trend">("daily");
  const [scope, setScope] = useState<"all" | FilterSurface>("all");
  const activity = useActivity();
  const data = {
    ...activity.data,
    events: activity.data.events.filter((event) => scope === "all" || event.surface === scope),
  };
  const heatmap = activityDays(data, ACTIVITY_HEATMAP_DAYS, activity.now);
  const trend = activityDays(data, ACTIVITY_TREND_DAYS, activity.now);
  const weekly = weeklyActivity(data, activity.now);
  return (
    <VStack gap={6} aria-busy={activity.loading || activity.busy}>
      <Toolbar
        className="-mx-3 my-0"
        label={t("overview.scope")}
        size="sm"
        endContent={
          <VStack width={200}>
            <Selector
              label={t("overview.scope")}
              isLabelHidden
              value={scope}
              options={[
                { value: "all", label: t("overview.allSurfaces") },
                { value: "timeline", label: t("general.homeTimeline") },
                { value: "comments", label: t("general.comments") },
              ]}
              onChange={(value) => setScope(value as typeof scope)}
            />
          </VStack>
        }
      />
      <OverviewMetrics days={activityDays(data, 30, activity.now)} loading={activity.loading || activity.loadFailed} />
      <Grid columns={{ minWidth: 400, max: 2 }} gap={5}>
        <Card padding={5} role="region" aria-labelledby="activity-title">
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="start" gap={3} wrap="wrap">
              <SectionIntro id="activity-title" title={t("general.activity")} />
              <HStack gap={1}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={t(view === "daily" ? "activity.showTrend" : "activity.showDaily")}
                  tooltip={t(view === "daily" ? "activity.showTrend" : "activity.showDaily")}
                  icon={<Icon icon={view === "daily" ? ChartNoAxesCombined : Grid2X2} size="sm" />}
                  aria-controls="activity-visualization"
                  onClick={() => setView((current) => (current === "daily" ? "trend" : "daily"))}
                />
                <ClearActivityDialog busy={activity.busy} onClear={activity.clear} />
              </HStack>
            </HStack>
            <Divider />
            <VStack
              id="activity-visualization"
              role="region"
              aria-label={t(view === "daily" ? "activity.heatmap" : "activity.trend")}
              minHeight="calc(var(--spacing-10) * 7)"
            >
              {activity.loading ? (
                <Spinner label={t("common.loading")} />
              ) : activity.loadFailed ? (
                <Text color="secondary">—</Text>
              ) : view === "daily" ? (
                <ActivityHeatmap days={heatmap} />
              ) : (
                <ActivityTrend days={trend} />
              )}
            </VStack>
          </VStack>
        </Card>
        <WeeklyReview weekly={weekly} pending={activity.loading || activity.loadFailed} />
      </Grid>
      {activity.loading ? (
        <Spinner label={t("common.loading")} />
      ) : (
        !activity.loadFailed && <RecentActivity history={activityHistory(data, activity.now)} onOpenLog={onOpenLog} />
      )}
      <StatusMessage message={activity.error} error />
    </VStack>
  );
}

import { useState } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Grid } from "@astryxdesign/core/Grid";

import { VStack } from "@astryxdesign/core/VStack";
import { ChartNoAxesCombined, Grid2X2 } from "lucide-react";
import { ACTIVITY_HEATMAP_DAYS, ACTIVITY_TREND_DAYS, activityDays, weeklyActivity } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { useActivity } from "../hooks/use-activity";
import { SectionIntro, StatusMessage } from "./DashboardUI";
import { ActivityHeatmap } from "./activity/ActivityHeatmap";
import { ActivityTrend } from "./activity/ActivityTrend";
import { ClearActivityDialog } from "./activity/ClearActivityDialog";
import { WeeklyReview } from "./activity/WeeklyReview";

export function ActivityPanel() {
  const { t } = useI18n();
  const [view, setView] = useState<"daily" | "trend">("daily");
  const activity = useActivity();
  const heatmap = activityDays(activity.data, ACTIVITY_HEATMAP_DAYS, activity.now);
  const trend = activityDays(activity.data, ACTIVITY_TREND_DAYS, activity.now);
  const weekly = weeklyActivity(activity.data, activity.now);
  return (
    <VStack gap={5} aria-busy={activity.loading || activity.busy}>
      <Grid columns={{ minWidth: 400, max: 2 }} gap={5}>
        <Card padding={5} aria-labelledby="activity-title">
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
              {view === "daily" ? <ActivityHeatmap days={heatmap} /> : <ActivityTrend days={trend} />}
            </VStack>
          </VStack>
        </Card>
        <WeeklyReview weekly={weekly} />
      </Grid>
      <StatusMessage message={activity.error} error />
    </VStack>
  );
}

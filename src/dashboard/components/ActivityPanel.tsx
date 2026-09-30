import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";

import { VStack } from "@astryxdesign/core/VStack";
import { ACTIVITY_HEATMAP_DAYS, ACTIVITY_TREND_DAYS, activityDays, weeklyActivity } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { useActivity } from "../hooks/use-activity";
import { SectionIntro, StatusMessage, Status } from "./DashboardUI";
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
      <Card padding={5} aria-labelledby="activity-title">
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="start" gap={3} wrap="wrap">
            <VStack gap={2}>
              <SectionIntro
                id="activity-title"
                title={t("general.activity")}
                description={t("general.activityPrivacy")}
              />
              <Status variant="neutral" label={t("general.localFirst")} />
            </VStack>
            <Button
              variant="secondary"
              label={t(view === "daily" ? "activity.showTrend" : "activity.showDaily")}
              aria-controls="activity-visualization"
              onClick={() => setView((current) => (current === "daily" ? "trend" : "daily"))}
            />
          </HStack>
          <Divider />
          <VStack
            id="activity-visualization"
            role="region"
            aria-label={t(view === "daily" ? "activity.heatmap" : "activity.trend")}
          >
            {view === "daily" ? <ActivityHeatmap days={heatmap} /> : <ActivityTrend days={trend} />}
          </VStack>
        </VStack>
      </Card>
      <WeeklyReview weekly={weekly} />
      <HStack gap={4} hAlign="between" wrap="wrap">
        <SectionIntro title={t("activity.privacy")} description={t("activity.privacyDescription")} />
        <ClearActivityDialog busy={activity.busy} onClear={activity.clear} />
      </HStack>
      <StatusMessage message={activity.error} error />
    </VStack>
  );
}

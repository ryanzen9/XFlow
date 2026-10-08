import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { WeeklyActivity } from "../../../shared";
import { useI18n } from "../../../ui/i18n";
import { LabeledValue, SectionIntro } from "../DashboardUI";

export function WeeklyReview({ weekly, pending = false }: { weekly: WeeklyActivity; pending?: boolean }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dayFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const range = `${dayFormatter.format(weekly.start)} – ${dayFormatter.format(weekly.end)}`;
  return (
    <Card padding={5} role="region" aria-labelledby="weekly-title">
      <Grid columns={{ minWidth: 240, max: 2 }} gap={6} align="start">
        <VStack gap={3}>
          <SectionIntro id="weekly-title" title={t("activity.weekly")} description={range} />
          <Text type="display-1" hasTabularNumbers maxLines={1}>
            {pending ? "—" : number.format(weekly.total)}
          </Text>
          <Text type="supporting">{t("activity.filteredWeek")}</Text>
        </VStack>
        <VStack gap={4}>
          <LabeledValue label={t("activity.mostActive")}>
            {pending
              ? "—"
              : weekly.mostActive
                ? `${weekdayFormatter.format(weekly.mostActive.date)} · ${number.format(weekly.mostActive.count)}`
                : t("activity.noActivity")}
          </LabeledValue>
          <LabeledValue label={t("activity.compared")}>
            {pending
              ? "—"
              : weekly.comparisonPercent === undefined
                ? t("activity.firstSummary")
                : `${weekly.comparisonPercent >= 0 ? "+" : ""}${weekly.comparisonPercent}%`}
          </LabeledValue>
        </VStack>
      </Grid>
    </Card>
  );
}

import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ActivitySummary as ActivitySummaryValue } from "../../shared";
import { useI18n } from "../../ui/i18n";

export interface ActivitySummaryProps extends ActivitySummaryValue {
  live?: boolean;
}

export function ActivitySummary({ today, allTime, live = false }: ActivitySummaryProps) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  return (
    <VStack as="section" aria-label={t("popup.activity")}>
      <Grid columns={2} gap={4}>
        <VStack gap={2} className="min-w-0">
          <HStack gap={2}>
            <Text type="supporting">{t("popup.filteredToday")}</Text>
            {live && (
              <StatusDot label={t("common.enabled")} variant="neutral" data-slot="activity-live" aria-hidden="true" />
            )}
          </HStack>
          <Text size="2xl" weight="semibold" hasTabularNumbers maxLines={1}>
            {number.format(today)}
          </Text>
        </VStack>
        <VStack gap={2} className="min-w-0">
          <Text type="supporting">{t("popup.filteredTotal")}</Text>
          <Text size="2xl" weight="medium" color="secondary" hasTabularNumbers maxLines={1}>
            {number.format(allTime)}
          </Text>
        </VStack>
      </Grid>
    </VStack>
  );
}

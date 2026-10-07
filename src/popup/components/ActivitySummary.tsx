import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { StackItem } from "@astryxdesign/core/Stack";
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
    <Card role="region" padding={3} aria-label={t("popup.activity")}>
      <VStack gap={1}>
        <HStack gap={2}>
          <Text type="supporting">{t("popup.filteredToday")}</Text>
          {live && (
            <StatusDot label={t("common.enabled")} variant="neutral" data-slot="activity-live" aria-hidden="true" />
          )}
        </HStack>
        <Text type="display-1" hasTabularNumbers maxLines={1}>
          {number.format(today)}
        </Text>
        <Divider />
        <HStack gap={2}>
          <Text type="supporting" className="shrink-0">
            {t("popup.allTime")}
          </Text>
          <StackItem size="fill">
            <Text type="supporting" hasTabularNumbers maxLines={1} justify="end">
              {number.format(allTime)} · {t("popup.filteredTotal")}
            </Text>
          </StackItem>
        </HStack>
      </VStack>
    </Card>
  );
}

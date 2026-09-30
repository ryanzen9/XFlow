import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ActivityDay } from "../../../shared";
import { useI18n } from "../../../ui/i18n";
import { SectionIntro } from "../DashboardUI";

export function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const dayFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const max = Math.max(...days.map(({ count }) => count), 0);
  const level = (count: number) => (count === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4)));
  const colors = ["bg-neutral", "bg-accent-bg/15", "bg-accent-bg/35", "bg-accent-bg/60", "bg-accent-bg"];
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
  return (
    <VStack gap={3}>
      <HStack gap={3} hAlign="between" vAlign="start" wrap="wrap">
        <SectionIntro title={t("activity.heatmap")} description={t("activity.last12Weeks")} level={3} />
        <Text type="supporting">{t("activity.lessMore")}</Text>
      </HStack>
      <ScrollableArea axis="inline" label={t("activity.heatmapAria")} padding={1}>
        <HStack gap={1} hAlign="center" vAlign="start">
          {weeks.map((week, index) => (
            <VStack key={index} gap={1}>
              {week.map((item) => {
                const label = t("activity.count", {
                  date: dayFormatter.format(item.date),
                  count: number.format(item.count),
                });
                const intensity = level(item.count);
                return (
                  <Button
                    key={item.day}
                    label={label}
                    tooltip={label}
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    data-level={intensity}
                    className={colors[intensity]}
                  />
                );
              })}
            </VStack>
          ))}
        </HStack>
      </ScrollableArea>
      {max === 0 && <Text type="supporting">{t("activity.none")}</Text>}
    </VStack>
  );
}

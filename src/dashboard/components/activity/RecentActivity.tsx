import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VStack } from "@astryxdesign/core/VStack";
import type { ActivityEvent } from "../../../shared";
import { useI18n } from "../../../ui/i18n";
import { Status } from "../DashboardUI";

export function RecentActivity({ history, onOpenLog }: { history: ActivityEvent[]; onOpenLog?: () => void }) {
  const { locale, t } = useI18n();
  const rows = history.slice(0, 5).map((item) => ({ ...item }));
  const time = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "preview",
      header: t("history.content"),
      width: proportional(2, { minWidth: 280 }),
      renderCell: (item) => (
        <VStack gap={1}>
          <Text maxLines={2}>{item.preview || t("history.contentUnavailable")}</Text>
          <Text type="supporting" maxLines={1}>
            {item.author || t("history.unknownAuthor")}
          </Text>
        </VStack>
      ),
    },
    {
      key: "policyName",
      header: t("history.matchedPolicy"),
      width: proportional(1, { minWidth: 180 }),
      renderCell: (item) => <Text maxLines={1}>{item.policyName || t("common.unavailable")}</Text>,
    },
    {
      key: "filteredAt",
      header: t("history.filteredAt"),
      width: pixel(160),
      renderCell: (item) => <Text type="supporting">{time.format(item.filteredAt)}</Text>,
    },
    {
      key: "status",
      header: t("common.status"),
      width: pixel(130),
      renderCell: (item) => (
        <Status label={t(`history.${item.status}`)} variant={item.status === "incorrect" ? "warning" : "neutral"} />
      ),
    },
  ];
  return (
    <VStack as="section" gap={4} aria-labelledby="recent-activity-title">
      <Toolbar
        className="-mx-3 my-0"
        label={t("overview.recent")}
        size="sm"
        startContent={
          <Heading level={2} id="recent-activity-title">
            {t("overview.recent")}
          </Heading>
        }
        endContent={onOpenLog && <Button label={t("overview.openLog")} variant="ghost" onClick={onOpenLog} />}
      />
      {history.length ? (
        <Table
          data={rows}
          columns={columns}
          idKey="id"
          density="compact"
          dividers="rows"
          aria-label={t("overview.recent")}
        />
      ) : (
        <EmptyState title={t("history.empty")} />
      )}
    </VStack>
  );
}

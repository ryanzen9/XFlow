import { useState } from "react";
import { addLocalDays, localDayKey, startOfLocalDay, type ActivityEvent, type ActivityStatus } from "../../../shared";
import { useI18n } from "../../../ui/i18n";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { StackItem } from "@astryxdesign/core/Stack";

import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { LabeledValue, Panel, SectionIntro, Status } from "../DashboardUI";

export const HISTORY_PAGE_SIZE = 10;

export function stepHistoryPage(requestedPage: number, totalPages: number, offset: -1 | 1): number {
  const page = Math.min(requestedPage, totalPages);
  return Math.max(1, Math.min(totalPages, page + offset));
}

function HistoryItem({ item, busy, onIncorrect }: { item: ActivityEvent; busy: boolean; onIncorrect: () => void }) {
  const { locale, t } = useI18n();
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const statusLabel: Record<ActivityStatus, string> = {
    filtered: t("history.filtered"),
    revealed: t("history.revealed"),
    incorrect: t("history.incorrect"),
  };
  return (
    <Collapsible
      value={item.id}
      defaultIsOpen={false}
      trigger={
        <HStack gap={3} hAlign="between">
          <StackItem size="fill">
            <VStack gap={1}>
              <Text weight="semibold" maxLines={1}>
                {item.preview || t("history.contentUnavailable")}
              </Text>
              <Text type="supporting" maxLines={1}>
                {[
                  timeFormatter.format(item.filteredAt),
                  item.author || t("history.unknownAuthor"),
                  item.policyName || t("history.policyUnavailable"),
                ].join(" · ")}
              </Text>
            </VStack>
          </StackItem>
          <Status variant={item.status === "incorrect" ? "warning" : "neutral"} label={statusLabel[item.status]} />
        </HStack>
      }
    >
      <VStack gap={4} paddingBlock={3}>
        <Text as="p" className="wrap-anywhere whitespace-pre-wrap">
          {item.preview || t("history.contentUnavailable")}
        </Text>
        <HStack gap={6} wrap="wrap" vAlign="start">
          <LabeledValue label={t("history.filteredAt")}>
            {new Date(item.filteredAt).toLocaleString(locale)}
          </LabeledValue>
          <LabeledValue label={t("history.matchedPolicy")}>{item.policyName || t("common.unavailable")}</LabeledValue>
          <LabeledValue label={t("history.author")}>{item.author || t("history.unknownAuthor")}</LabeledValue>
          {item.mediaType && <LabeledValue label={t("history.mediaType")}>{item.mediaType}</LabeledValue>}
        </HStack>
        <HStack gap={3} wrap="wrap">
          {item.url && (
            <Link href={item.url} isExternalLink>
              {t("history.viewOriginal")}
            </Link>
          )}
          {item.status !== "incorrect" && (
            <Button
              label={t("history.markIncorrect")}
              variant="ghost"
              size="sm"
              isDisabled={busy}
              onClick={onIncorrect}
            />
          )}
        </HStack>
      </VStack>
    </Collapsible>
  );
}

export function FilterHistory({
  history,
  now,
  busy,
  onIncorrect,
}: {
  history: ActivityEvent[];
  now: number;
  busy: boolean;
  onIncorrect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageStart = (page - 1) * HISTORY_PAGE_SIZE;
  const visibleHistory = history.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);
  const today = localDayKey(now);
  const yesterday = localDayKey(addLocalDays(startOfLocalDay(now), -1));
  const dayCounts = new Map<string, number>();
  for (const item of history) dayCounts.set(item.day, (dayCounts.get(item.day) ?? 0) + 1);
  const groups = new Map<string, ActivityEvent[]>();
  for (const item of visibleHistory) groups.set(item.day, [...(groups.get(item.day) ?? []), item]);
  const groupLabel = (day: string) =>
    day === today
      ? t("history.today")
      : day === yesterday
        ? t("history.yesterday")
        : new Date(`${day}T12:00:00`).toLocaleDateString(locale, { month: "long", day: "numeric" });

  return (
    <Panel id="history-title" title={t("history.title")} description={t("history.subtitle")}>
      <Text type="supporting">{t("history.records", { count: number.format(history.length) })}</Text>
      {history.length === 0 ? (
        <EmptyState title={t("history.empty")} />
      ) : (
        <>
          <VStack gap={5}>
            {[...groups].map(([day, items]) => (
              <VStack key={day} gap={2}>
                <HStack hAlign="between" gap={3}>
                  <SectionIntro level={3} title={groupLabel(day)} />
                  <Badge
                    variant="neutral"
                    label={number.format(dayCounts.get(day) ?? 0)}
                    aria-label={t("history.records", { count: number.format(dayCounts.get(day) ?? 0) })}
                  />
                </HStack>
                <CollapsibleGroup
                  key={`${day}-${page}`}
                  type="multiple"
                  hasDividers
                  density="compact"
                  defaultValue={[]}
                >
                  {items.map((item) => (
                    <HistoryItem key={item.id} item={item} busy={busy} onIncorrect={() => onIncorrect(item.id)} />
                  ))}
                </CollapsibleGroup>
              </VStack>
            ))}
          </VStack>
          <Divider />
          <HStack hAlign="between" gap={3} wrap="wrap">
            <Text type="supporting" aria-live="polite">
              {t("history.range", {
                start: number.format(pageStart + 1),
                end: number.format(Math.min(pageStart + HISTORY_PAGE_SIZE, history.length)),
                total: number.format(history.length),
              })}
            </Text>
            {totalPages > 1 && (
              <HStack as="nav" gap={2} aria-label={t("history.pagination")}>
                <Button
                  label={t("history.previous")}
                  variant="secondary"
                  size="sm"
                  isDisabled={page === 1}
                  onClick={() => setRequestedPage((current) => stepHistoryPage(current, totalPages, -1))}
                />
                <Text type="code">
                  {t("history.page", { current: number.format(page), total: number.format(totalPages) })}
                </Text>
                <Button
                  label={t("history.next")}
                  variant="secondary"
                  size="sm"
                  isDisabled={page === totalPages}
                  onClick={() => setRequestedPage((current) => stepHistoryPage(current, totalPages, 1))}
                />
              </HStack>
            )}
          </HStack>
        </>
      )}
    </Panel>
  );
}

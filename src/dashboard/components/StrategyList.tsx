import { Button } from "@astryxdesign/core/Button";
import { useState } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Switch } from "@astryxdesign/core/Switch";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Pencil, Trash2 } from "lucide-react";
import {
  filterStrategies,
  strategyHitRate,
  type FilterStrategy,
  type FilterSurface,
  type StrategyStatusFilter,
} from "../../shared";
import { useI18n } from "../../ui/i18n";
import { SectionIntro } from "./DashboardUI";
import { CollectionFilters } from "./CollectionFilters";

interface Props {
  surface: FilterSurface;
  strategies: FilterStrategy[];
  busy: boolean;
  onChange: (strategies: FilterStrategy[]) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

export function StrategyList({ surface, strategies, busy, onChange, onOpen, onCreate }: Props) {
  const { t } = useI18n();
  const isWide = useMediaQuery("(min-width: 1280px)");
  const controlClass = isWide ? "shrink-0" : "min-h-11 min-w-11 shrink-0";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StrategyStatusFilter>("all");
  const label = t(surface === "timeline" ? "strategy.timeline" : "strategy.comments");
  const update = (id: string, patch: Partial<FilterStrategy>) =>
    onChange(strategies.map((strategy) => (strategy.id === id ? { ...strategy, ...patch } : strategy)));
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= strategies.length) return;
    const next = [...strategies];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next.map((strategy, priority) => ({ ...strategy, priority: priority + 1 })));
  };
  const rows = filterStrategies(strategies, query, status).map((strategy) => ({
    ...strategy,
    index: strategies.findIndex((item) => item.id === strategy.id),
  }));
  type Row = (typeof rows)[number];
  const renderPriority = (strategy: Row) => (
    <HStack gap={1}>
      <Text type="code">P{strategy.priority}</Text>
      <IconButton
        size="md"
        className={controlClass}
        variant="ghost"
        label={t("strategy.raise", { name: strategy.name })}
        tooltip={t("strategy.raiseTitle")}
        icon={<Icon icon="arrowUp" size="sm" />}
        isDisabled={busy || strategy.index === 0}
        onClick={() => move(strategy.index, -1)}
      />
      <IconButton
        size="md"
        className={controlClass}
        variant="ghost"
        label={t("strategy.lower", { name: strategy.name })}
        tooltip={t("strategy.lowerTitle")}
        icon={<Icon icon="arrowDown" size="sm" />}
        isDisabled={busy || strategy.index === strategies.length - 1}
        onClick={() => move(strategy.index, 1)}
      />
    </HStack>
  );
  const renderName = (strategy: Row) => (
    <VStack gap={1} className="min-w-0">
      <Button
        width="100%"
        variant="ghost"
        className={
          isWide ? "max-w-full min-w-0 justify-start text-left" : "min-h-11 max-w-full min-w-0 justify-start text-left"
        }
        label={t("strategy.edit", { name: strategy.name })}
        onClick={() => onOpen(strategy.id)}
      >
        <Text weight="semibold" maxLines={1} className="max-w-full min-w-0">
          {strategy.name}
        </Text>
      </Button>
      <Text color="secondary" maxLines={2} className="px-3 wrap-anywhere">
        {strategy.prompt}
      </Text>
    </VStack>
  );
  const renderEnabled = (strategy: Row) => (
    <HStack gap={2} className={isWide ? "min-h-8" : "min-h-11"}>
      {!isWide && <Text type="supporting">{t(strategy.enabled ? "common.enabled" : "common.disabled")}</Text>}
      <Switch
        size="md"
        className={
          isWide ? "flex min-h-8 items-center [&_input]:min-h-8" : "flex min-h-11 items-center [&_input]:min-h-11"
        }
        label={t("strategy.enable", { name: strategy.name })}
        isLabelHidden
        value={strategy.enabled}
        isDisabled={busy}
        onChange={(enabled) => update(strategy.id, { enabled })}
      />
    </HStack>
  );
  const renderActions = (strategy: Row) => (
    <HStack gap={1}>
      <IconButton
        label={`${t("strategy.details")}: ${strategy.name}`}
        tooltip={t("strategy.edit", { name: strategy.name })}
        icon={<Icon icon={Pencil} size="sm" />}
        size="md"
        className={controlClass}
        variant="ghost"
        onClick={() => onOpen(strategy.id)}
      />
      <IconButton
        label={`${t("strategy.delete")}: ${strategy.name}`}
        tooltip={`${t("strategy.delete")}: ${strategy.name}`}
        icon={<Icon icon={Trash2} size="sm" />}
        size="md"
        className={controlClass}
        variant="destructive"
        isDisabled={busy}
        onClick={() =>
          onChange(
            strategies
              .filter((item) => item.id !== strategy.id)
              .map((item, priority) => ({ ...item, priority: priority + 1 })),
          )
        }
      />
    </HStack>
  );
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "priority",
      header: t("strategy.priority"),
      width: pixel(144),
      renderCell: renderPriority,
    },
    {
      key: "name",
      header: t("strategy.name"),
      width: proportional(2, { minWidth: 280 }),
      renderCell: renderName,
    },
    {
      key: "sensitivity",
      header: t("strategy.hitRate"),
      width: pixel(120),
      renderCell: (strategy) => (
        <Text hasTabularNumbers weight="semibold">
          ≥ {strategyHitRate(strategy)}%
        </Text>
      ),
    },
    {
      key: "enabled",
      header: t("strategy.state"),
      width: pixel(100),
      renderCell: renderEnabled,
    },
    {
      key: "actions",
      header: t("strategy.actions"),
      width: pixel(112),
      renderCell: renderActions,
    },
  ];
  return (
    <VStack as="section" gap={5} aria-labelledby="strategy-table-title">
      <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap">
        <SectionIntro id="strategy-table-title" title={t("strategy.title", { surface: label })} />
        <Button label={t("strategy.createSurface", { surface: label })} onClick={onCreate} isDisabled={busy} />
      </HStack>
      <CollectionFilters
        id="strategies"
        searchLabel={t("collection.searchStrategies")}
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={(value) => setStatus(value as StrategyStatusFilter)}
        count={rows.length}
        options={[
          { value: "all", label: t("collection.all") },
          { value: "enabled", label: t("common.enabled") },
          { value: "disabled", label: t("common.disabled") },
        ]}
      />
      {rows.length ? (
        isWide ? (
          <Table
            aria-label={t("strategy.title", { surface: label })}
            data={rows}
            columns={columns}
            idKey="id"
            density="balanced"
            hasHover
          />
        ) : (
          <List aria-labelledby="strategy-table-title" hasDividers density="spacious">
            {rows.map((strategy) => (
              <ListItem
                key={strategy.id}
                data-strategy-id={strategy.id}
                label={renderName(strategy)}
                description={
                  <VStack gap={3} className="min-w-0">
                    <HStack gap={2} hAlign="between" wrap="wrap">
                      {renderPriority(strategy)}
                      {renderEnabled(strategy)}
                    </HStack>
                    <HStack gap={2} hAlign="between" wrap="wrap">
                      <Text hasTabularNumbers>
                        {t("strategy.hitRate")} ≥ {strategyHitRate(strategy)}%
                      </Text>
                      {renderActions(strategy)}
                    </HStack>
                  </VStack>
                }
              />
            ))}
          </List>
        )
      ) : strategies.length ? (
        <EmptyState
          title={t("collection.noResults")}
          actions={
            <Button
              label={t("collection.clearFilters")}
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            />
          }
        />
      ) : (
        <EmptyState
          title={t("strategy.empty", { surface: label })}
          description={t("strategy.emptyHelp")}
          actions={<Button label={t("strategy.create")} onClick={onCreate} isDisabled={busy} />}
        />
      )}
    </VStack>
  );
}

import { Button } from "@astryxdesign/core/Button";
import { useState } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
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
import { HitRatePresets } from "./HitRatePresets";
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
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "priority",
      header: t("strategy.priority"),
      width: pixel(140),
      renderCell: (strategy) => (
        <HStack gap={1}>
          <Text type="code">P{strategy.priority}</Text>
          <IconButton
            size="sm"
            variant="ghost"
            label={t("strategy.raise", { name: strategy.name })}
            tooltip={t("strategy.raiseTitle")}
            icon={<Icon icon="arrowUp" size="sm" />}
            isDisabled={busy || strategy.index === 0}
            onClick={() => move(strategy.index, -1)}
          />
          <IconButton
            size="sm"
            variant="ghost"
            label={t("strategy.lower", { name: strategy.name })}
            tooltip={t("strategy.lowerTitle")}
            icon={<Icon icon="arrowDown" size="sm" />}
            isDisabled={busy || strategy.index === strategies.length - 1}
            onClick={() => move(strategy.index, 1)}
          />
        </HStack>
      ),
    },
    {
      key: "name",
      header: t("strategy.name"),
      width: proportional(2, { minWidth: 280 }),
      renderCell: (strategy) => (
        <VStack gap={1} hAlign="start">
          <Button
            size="sm"
            variant="ghost"
            className="px-0"
            label={t("strategy.edit", { name: strategy.name })}
            onClick={() => onOpen(strategy.id)}
          >
            {strategy.name}
          </Button>
          <Text type="supporting" maxLines={2} className="wrap-anywhere">
            {strategy.prompt}
          </Text>
        </VStack>
      ),
    },
    {
      key: "sensitivity",
      header: t("strategy.hitRate"),
      width: pixel(240),
      renderCell: (strategy) => (
        <VStack gap={2}>
          <Text hasTabularNumbers weight="semibold">
            ≥ {strategyHitRate(strategy)}%
          </Text>
          <HitRatePresets
            hitRate={strategyHitRate(strategy)}
            name={strategy.name}
            disabled={busy}
            onChange={(sensitivity) => update(strategy.id, { sensitivity })}
          />
        </VStack>
      ),
    },
    {
      key: "enabled",
      header: t("strategy.state"),
      width: pixel(100),
      renderCell: (strategy) => (
        <HStack gap={2}>
          <Switch
            size="sm"
            label={t("strategy.enable", { name: strategy.name })}
            isLabelHidden
            value={strategy.enabled}
            isDisabled={busy}
            onChange={(enabled) => update(strategy.id, { enabled })}
          />
        </HStack>
      ),
    },
    {
      key: "actions",
      header: t("strategy.actions"),
      width: pixel(110),
      renderCell: (strategy) => (
        <HStack gap={1}>
          <IconButton
            label={`${t("strategy.details")}: ${strategy.name}`}
            tooltip={t("strategy.edit", { name: strategy.name })}
            icon={<Icon icon={Pencil} size="sm" />}
            size="sm"
            variant="ghost"
            onClick={() => onOpen(strategy.id)}
          />
          <IconButton
            label={`${t("strategy.delete")}: ${strategy.name}`}
            tooltip={`${t("strategy.delete")}: ${strategy.name}`}
            icon={<Icon icon={Trash2} size="sm" />}
            size="sm"
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
      ),
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
        <Table
          aria-label={t("strategy.title", { surface: label })}
          data={rows}
          columns={columns}
          idKey="id"
          density="balanced"
          hasHover
        />
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

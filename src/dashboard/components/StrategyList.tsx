import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Switch } from "@astryxdesign/core/Switch";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { strategyHitRate, type FilterStrategy, type FilterSurface } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { Actions, SectionIntro } from "./DashboardUI";
import { HitRatePresets } from "./HitRatePresets";

interface Props {
  surface: FilterSurface;
  strategies: FilterStrategy[];
  busy: boolean;
  dirty: boolean;
  onChange: (strategies: FilterStrategy[]) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onSave: () => void;
}

export function StrategyList({ surface, strategies, busy, dirty, onChange, onOpen, onCreate, onSave }: Props) {
  const { t } = useI18n();
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
  const rows = strategies.map((strategy, index) => ({ ...strategy, index }));
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
            className="px-0"
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
      width: pixel(160),
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
          <Text type="supporting">{t(strategy.enabled ? "common.enabled" : "common.disabled")}</Text>
        </HStack>
      ),
    },
    {
      key: "actions",
      header: t("strategy.actions"),
      width: pixel(170),
      renderCell: (strategy) => (
        <HStack gap={1}>
          <Button label={t("strategy.details")} size="sm" onClick={() => onOpen(strategy.id)} />
          <Button
            label={t("strategy.delete")}
            aria-label={`${t("strategy.delete")}: ${strategy.name}`}
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
        <SectionIntro
          id="strategy-table-title"
          title={t("strategy.title", { surface: label })}
          description={t("strategy.libraryHelp", { surface: label })}
        />
        <Button label={t("strategy.createSurface", { surface: label })} onClick={onCreate} isDisabled={busy} />
      </HStack>
      {rows.length ? (
        <Table
          aria-label={t("strategy.title", { surface: label })}
          data={rows}
          columns={columns}
          idKey="id"
          density="balanced"
          hasHover
        />
      ) : (
        <EmptyState
          title={t("strategy.empty", { surface: label })}
          description={t("strategy.emptyHelp")}
          actions={<Button label={t("strategy.create")} onClick={onCreate} isDisabled={busy} />}
        />
      )}
      <Divider />
      <Text as="p" color="secondary">
        {t("strategy.orderHelp", { surface: label })}
      </Text>
      <Actions>
        <Button
          variant="primary"
          label={t("strategy.saveSurface", { surface: label })}
          isLoading={busy}
          isDisabled={!dirty}
          onClick={onSave}
        />
      </Actions>
    </VStack>
  );
}

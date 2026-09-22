import { formatProbability, strategyThreshold, type FilterStrategy, type FilterSurface } from "../../shared";
import { cn } from "../../ui/cn";
import { eyebrow, primaryButton } from "../../ui/styles";
import { useI18n } from "../../ui/i18n";

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
  const update = (id: string, patch: Partial<FilterStrategy>) => {
    onChange(strategies.map((strategy) => (strategy.id === id ? { ...strategy, ...patch } : strategy)));
  };
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= strategies.length) return;
    const next = [...strategies];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next.map((strategy, priority) => ({ ...strategy, priority: priority + 1 })));
  };

  const iconButton =
    "min-h-[34px] min-w-[34px] rounded-sm border border-line bg-surface text-meta text-muted transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <section className="strategy-library max-w-[1100px]" aria-labelledby="strategy-table-title">
      <div className="mb-5 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className={eyebrow}>{surface === "timeline" ? "TIMELINE POLICIES" : "COMMENT POLICIES"}</p>
          <h2 className="my-2 text-title" id="strategy-table-title">
            {t("strategy.title", { surface: label })}
          </h2>
          <p className="max-w-[650px] text-xs text-muted">{t("strategy.libraryHelp", { surface: label })}</p>
        </div>
        <button className={`${primaryButton} w-full sm:w-auto`} type="button" onClick={onCreate} disabled={busy}>
          {t("strategy.createSurface", { surface: label })}
        </button>
      </div>
      {strategies.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-[58px] text-center text-muted">
          <span className="text-display text-ink" aria-hidden="true">
            ◇
          </span>
          <h3 className="text-ink">{t("strategy.empty", { surface: label })}</h3>
          <p className="mb-2.5 text-xs">{t("strategy.emptyHelp")}</p>
          <button className={primaryButton} type="button" onClick={onCreate}>
            {t("strategy.create")}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface max-[600px]:overflow-visible max-[600px]:border-0 max-[600px]:bg-transparent max-[600px]:shadow-none">
          <table className="strategy-table w-full table-fixed border-collapse max-[600px]:block">
            <thead className="max-[600px]:hidden">
              <tr>
                {[t("strategy.priority"), t("strategy.name"), t("strategy.condition"), t("strategy.state"), ""].map(
                  (heading, index) => (
                    <th
                      className={cn(
                        "h-[42px] border-b border-line bg-canvas/55 px-4 text-left font-mono text-caption font-semibold text-muted",
                        index === 0 && "w-[148px]",
                        index === 2 && "w-[120px]",
                        index === 3 && "w-[128px]",
                        index === 4 && "w-[142px]",
                      )}
                      scope="col"
                      key={index}
                    >
                      {heading || <span className="sr-only">{t("strategy.actions")}</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="max-[600px]:grid max-[600px]:gap-2.5">
              {strategies.map((strategy, index) => (
                <tr
                  className="group transition hover:bg-hover/70 data-[enabled=false]:opacity-60 max-[600px]:grid max-[600px]:grid-cols-[78px_minmax(0,1fr)] max-[600px]:overflow-hidden max-[600px]:rounded-xl max-[600px]:border max-[600px]:border-line max-[600px]:bg-surface"
                  key={strategy.id}
                  data-enabled={strategy.enabled}
                >
                  <td
                    className="h-[82px] border-r border-b border-line bg-canvas/40 px-4 py-3 align-middle whitespace-nowrap max-[600px]:row-[1/5] max-[600px]:grid max-[600px]:h-auto max-[600px]:content-center max-[600px]:justify-items-center max-[600px]:gap-2 max-[600px]:border-b-0 max-[600px]:px-1.5 max-[600px]:py-2.5"
                    data-label={t("strategy.priority")}
                  >
                    <span className="table-priority inline-block min-w-[38px] font-mono text-base font-bold text-ink max-[600px]:min-w-0">
                      P{strategy.priority}
                    </span>
                    <span className="inline-flex gap-[3px] align-middle max-[600px]:flex-col">
                      <button
                        className={`${iconButton} font-mono text-sm`}
                        type="button"
                        aria-label={t("strategy.raise", { name: strategy.name })}
                        title={t("strategy.raiseTitle")}
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className={`${iconButton} font-mono text-sm`}
                        type="button"
                        aria-label={t("strategy.lower", { name: strategy.name })}
                        title={t("strategy.lowerTitle")}
                        disabled={busy || index === strategies.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  </td>
                  <td
                    className="h-[82px] min-w-0 border-b border-line px-4 py-3 align-middle max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-[68px] max-[600px]:items-center max-[600px]:justify-between max-[600px]:px-3 max-[600px]:py-2.5"
                    data-label={t("strategy.name")}
                  >
                    <button
                      type="button"
                      className="grid w-full min-w-0 gap-[5px] bg-transparent p-0 text-left text-ink"
                      onClick={() => onOpen(strategy.id)}
                      aria-label={t("strategy.edit", { name: strategy.name })}
                    >
                      <strong className="overflow-hidden text-ui text-ellipsis whitespace-nowrap">
                        {strategy.name}
                      </strong>
                      <span className="overflow-hidden text-meta text-ellipsis whitespace-nowrap text-muted">
                        {strategy.prompt}
                      </span>
                    </button>
                  </td>
                  <td
                    className="h-[82px] border-b border-line px-4 py-3 align-middle before:mr-3 before:hidden before:font-mono before:text-caption before:text-muted before:content-[attr(data-label)] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-12 max-[600px]:items-center max-[600px]:justify-between max-[600px]:px-3 max-[600px]:py-2.5 max-[600px]:before:block"
                    data-label={t("strategy.condition")}
                  >
                    <span>
                      <strong className="threshold-value block font-mono text-xs font-semibold text-ink">
                        ≥ {formatProbability(strategyThreshold(strategy))}
                      </strong>
                      <span className="mt-1 block text-caption text-muted">
                        {t("strategy.sensitivity", { value: strategy.sensitivity })}
                      </span>
                    </span>
                  </td>
                  <td
                    className="h-[82px] border-b border-line px-4 py-3 align-middle before:mr-3 before:hidden before:font-mono before:text-caption before:text-muted before:content-[attr(data-label)] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-12 max-[600px]:items-center max-[600px]:justify-between max-[600px]:border-b-0 max-[600px]:px-3 max-[600px]:py-2.5 max-[600px]:before:block"
                    data-label={t("strategy.state")}
                  >
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-meta text-muted">
                      <span>{t(strategy.enabled ? "common.enabled" : "common.disabled")}</span>
                      <span className="relative block h-[23px] w-[38px] shrink-0">
                        <span className="sr-only">{t("strategy.enable", { name: strategy.name })}</span>
                        <input
                          className="peer absolute inset-y-[-10px] z-10 m-0 h-[43px] w-[38px] cursor-pointer opacity-0"
                          type="checkbox"
                          role="switch"
                          checked={strategy.enabled}
                          aria-checked={strategy.enabled}
                          disabled={busy}
                          onChange={(event) => update(strategy.id, { enabled: event.target.checked })}
                        />
                        <i
                          className="absolute inset-0 rounded-full border border-line-strong bg-inset peer-checked:border-action peer-checked:bg-action after:absolute after:top-[3px] after:left-[3px] after:size-[15px] after:rounded-full after:bg-muted after:transition after:content-[''] peer-checked:after:translate-x-[15px] peer-checked:after:bg-action-fg"
                          aria-hidden="true"
                        />
                      </span>
                    </label>
                  </td>
                  <td className="h-[82px] border-b border-line px-4 py-3 text-right align-middle whitespace-nowrap group-last:border-b-0 max-[600px]:col-[1/-1] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-[52px] max-[600px]:items-center max-[600px]:justify-end max-[600px]:border-t max-[600px]:border-b-0 max-[600px]:px-3 max-[600px]:py-2.5">
                    <button type="button" className={`${iconButton} min-w-[62px]`} onClick={() => onOpen(strategy.id)}>
                      {t("strategy.details")}
                    </button>
                    <button
                      type="button"
                      className="min-h-[34px] min-w-[52px] rounded-sm border border-transparent bg-transparent text-meta text-danger transition hover:bg-danger-soft"
                      onClick={() =>
                        onChange(
                          strategies
                            .filter((item) => item.id !== strategy.id)
                            .map((item, priority) => ({ ...item, priority: priority + 1 })),
                        )
                      }
                    >
                      {t("strategy.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-[18px] flex flex-col items-stretch justify-between gap-6 rounded-xl border border-dashed border-line-strong px-5 py-[18px] sm:flex-row sm:items-center">
        <p className="text-xs text-muted">{t("strategy.orderHelp", { surface: label })}</p>
        <button
          className={`${primaryButton} w-full sm:w-auto`}
          type="button"
          disabled={busy || !dirty}
          onClick={onSave}
        >
          {busy ? t("common.saving") : t("strategy.saveSurface", { surface: label })}
        </button>
      </div>
    </section>
  );
}

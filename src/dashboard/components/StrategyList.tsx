import { formatProbability, strategyThreshold, type FilterStrategy, type FilterSurface } from "../../shared";
import { cn } from "../../ui/cn";
import { eyebrow, primaryButton } from "../../ui/styles";

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

const surfaceLabel = (surface: FilterSurface) => (surface === "timeline" ? "时间线博文" : "评论区");

export function StrategyList({ surface, strategies, busy, dirty, onChange, onOpen, onCreate, onSave }: Props) {
  const label = surfaceLabel(surface);
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
    "min-h-[34px] min-w-[34px] rounded-[7px] border border-line bg-panel text-[10px] text-muted transition hover:border-line-strong hover:text-signal disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <section className="strategy-library max-w-[1100px]" aria-labelledby="strategy-table-title">
      <div className="mb-5 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className={eyebrow}>{surface === "timeline" ? "TIMELINE POLICIES" : "COMMENT POLICIES"}</p>
          <h2 className="my-2 text-[22px] tracking-[-0.035em]" id="strategy-table-title">
            {label}策略
          </h2>
          <p className="max-w-[650px] text-xs text-muted">
            此处的优先级只作用于{label}。系统从 P1 开始采用第一条达到自身阈值的策略。
          </p>
        </div>
        <button className={`${primaryButton} w-full sm:w-auto`} type="button" onClick={onCreate} disabled={busy}>
          新建{label}策略 ＋
        </button>
      </div>
      {strategies.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-[15px] border border-dashed border-line-strong px-6 py-[58px] text-center text-muted">
          <span className="text-[34px] text-signal" aria-hidden="true">
            ◇
          </span>
          <h3 className="text-ink">还没有{label}策略</h3>
          <p className="mb-2.5 text-[11px]">新建第一条策略后，可以配置提示词、敏感度和 Hover 样式。</p>
          <button className={primaryButton} type="button" onClick={onCreate}>
            新建策略
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-panel max-[600px]:overflow-visible max-[600px]:border-0 max-[600px]:bg-transparent max-[600px]:shadow-none">
          <table className="strategy-table w-full table-fixed border-collapse max-[600px]:block">
            <thead className="max-[600px]:hidden">
              <tr>
                {["优先级", "策略名称", "触发条件", "状态", ""].map((heading, index) => (
                  <th
                    className={cn(
                      "h-[42px] border-b border-line bg-canvas/55 px-4 text-left font-mono text-[9px] font-semibold tracking-[.08em] text-muted",
                      index === 0 && "w-[148px]",
                      index === 2 && "w-[120px]",
                      index === 3 && "w-[128px]",
                      index === 4 && "w-[142px]",
                    )}
                    scope="col"
                    key={index}
                  >
                    {heading || <span className="sr-only">操作</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="max-[600px]:grid max-[600px]:gap-2.5">
              {strategies.map((strategy, index) => (
                <tr
                  className="group transition hover:bg-panel/70 data-[enabled=false]:opacity-60 max-[600px]:grid max-[600px]:grid-cols-[78px_minmax(0,1fr)] max-[600px]:overflow-hidden max-[600px]:rounded-xl max-[600px]:border max-[600px]:border-line max-[600px]:bg-surface"
                  key={strategy.id}
                  data-enabled={strategy.enabled}
                >
                  <td
                    className="h-[82px] border-r border-b border-line bg-canvas/40 px-4 py-3 align-middle whitespace-nowrap max-[600px]:row-[1/5] max-[600px]:grid max-[600px]:h-auto max-[600px]:content-center max-[600px]:justify-items-center max-[600px]:gap-2 max-[600px]:border-b-0 max-[600px]:px-1.5 max-[600px]:py-2.5"
                    data-label="优先级"
                  >
                    <span className="table-priority inline-block min-w-[38px] font-mono text-base font-bold text-signal max-[600px]:min-w-0">
                      P{strategy.priority}
                    </span>
                    <span className="inline-flex gap-[3px] align-middle max-[600px]:flex-col">
                      <button
                        className={`${iconButton} font-mono text-sm`}
                        type="button"
                        aria-label={`提高 ${strategy.name} 的优先级`}
                        title="提高优先级"
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className={`${iconButton} font-mono text-sm`}
                        type="button"
                        aria-label={`降低 ${strategy.name} 的优先级`}
                        title="降低优先级"
                        disabled={busy || index === strategies.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  </td>
                  <td
                    className="h-[82px] min-w-0 border-b border-line px-4 py-3 align-middle max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-[68px] max-[600px]:items-center max-[600px]:justify-between max-[600px]:px-3 max-[600px]:py-2.5"
                    data-label="策略名称"
                  >
                    <button
                      type="button"
                      className="grid w-full min-w-0 gap-[5px] bg-transparent p-0 text-left text-ink"
                      onClick={() => onOpen(strategy.id)}
                      aria-label={`编辑策略 ${strategy.name}`}
                    >
                      <strong className="overflow-hidden text-[13px] text-ellipsis whitespace-nowrap">
                        {strategy.name}
                      </strong>
                      <span className="overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-muted">
                        {strategy.prompt}
                      </span>
                    </button>
                  </td>
                  <td
                    className="h-[82px] border-b border-line px-4 py-3 align-middle before:mr-3 before:hidden before:font-mono before:text-[8px] before:text-muted before:content-[attr(data-label)] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-12 max-[600px]:items-center max-[600px]:justify-between max-[600px]:px-3 max-[600px]:py-2.5 max-[600px]:before:block"
                    data-label="触发条件"
                  >
                    <span>
                      <strong className="threshold-value block font-mono text-xs font-semibold text-signal">
                        ≥ {formatProbability(strategyThreshold(strategy))}
                      </strong>
                      <span className="mt-1 block text-[9px] text-muted">敏感度 {strategy.sensitivity}</span>
                    </span>
                  </td>
                  <td
                    className="h-[82px] border-b border-line px-4 py-3 align-middle before:mr-3 before:hidden before:font-mono before:text-[8px] before:text-muted before:content-[attr(data-label)] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-12 max-[600px]:items-center max-[600px]:justify-between max-[600px]:border-b-0 max-[600px]:px-3 max-[600px]:py-2.5 max-[600px]:before:block"
                    data-label="状态"
                  >
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-[10px] text-muted">
                      <span>{strategy.enabled ? "已启用" : "已停用"}</span>
                      <span className="relative block h-[23px] w-[38px] shrink-0">
                        <span className="sr-only">启用 {strategy.name}</span>
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
                          className="absolute inset-0 rounded-full border border-line-strong bg-control peer-checked:border-signal peer-checked:bg-soft after:absolute after:top-[3px] after:left-[3px] after:size-[15px] after:rounded-full after:bg-muted after:transition after:content-[''] peer-checked:after:translate-x-[15px] peer-checked:after:bg-signal"
                          aria-hidden="true"
                        />
                      </span>
                    </label>
                  </td>
                  <td className="h-[82px] border-b border-line px-4 py-3 text-right align-middle whitespace-nowrap group-last:border-b-0 max-[600px]:col-[1/-1] max-[600px]:flex max-[600px]:h-auto max-[600px]:min-h-[52px] max-[600px]:items-center max-[600px]:justify-end max-[600px]:border-t max-[600px]:border-b-0 max-[600px]:px-3 max-[600px]:py-2.5">
                    <button type="button" className={`${iconButton} min-w-[62px]`} onClick={() => onOpen(strategy.id)}>
                      详情 →
                    </button>
                    <button
                      type="button"
                      className="min-h-[34px] min-w-[52px] rounded-[7px] border border-transparent bg-transparent text-[10px] text-red-700 transition hover:bg-red-500/10 dark:text-red-300"
                      onClick={() =>
                        onChange(
                          strategies
                            .filter((item) => item.id !== strategy.id)
                            .map((item, priority) => ({ ...item, priority: priority + 1 })),
                        )
                      }
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-[18px] flex flex-col items-stretch justify-between gap-6 rounded-xl border border-dashed border-line-strong px-5 py-[18px] sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted">
          <strong className="text-signal">{label}独立排序。</strong> 调整顺序、启停或删除后，点击保存才会应用到页面。
        </p>
        <button
          className={`${primaryButton} w-full sm:w-auto`}
          type="button"
          disabled={busy || !dirty}
          onClick={onSave}
        >
          {busy ? "保存中…" : `保存${label}策略`}
        </button>
      </div>
    </section>
  );
}

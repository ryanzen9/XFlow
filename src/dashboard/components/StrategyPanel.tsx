import type { FormEvent } from "react";
import {
  compileHoverCss,
  DEFAULT_HOVER_CSS,
  defaultStrategy,
  formatProbability,
  HOVER_VARIABLES,
  strategyThreshold,
  validateTemplate,
  type FilterStrategy,
  type FilterSurface,
} from "../../shared";
import { StrategyPreview } from "./StrategyPreview";
import { cn } from "../../ui/cn";
import {
  card,
  control,
  field,
  fieldHelp,
  fieldLabel,
  primaryButton,
  secondaryButton,
  sectionDescription,
  sectionHeading,
  sectionIcon,
  sectionTitle,
  switchInput,
  switchShell,
  switchTrack,
  textButton,
  textarea,
} from "../../ui/styles";

interface Props {
  strategy: FilterStrategy;
  strategyCount: number;
  surface: FilterSurface;
  modelNickname: string;
  modelId: string;
  busy: boolean;
  onBack: () => void;
  onChange: (strategy: FilterStrategy) => void;
  onPriorityChange: (priority: number) => void;
  onSave: () => void;
}

export function StrategyPanel({
  strategy,
  strategyCount,
  surface,
  modelNickname,
  modelId,
  busy,
  onBack,
  onChange,
  onPriorityChange,
  onSave,
}: Props) {
  const update = (patch: Partial<FilterStrategy>) => onChange({ ...strategy, ...patch });
  const cssError = compileHoverCss(strategy.hoverCss, "#preview").error;
  const templateError = validateTemplate(strategy.hoverTemplate);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };
  const reset = () => {
    const defaults = defaultStrategy(surface, strategy.priority, strategy.id);
    onChange({ ...defaults, enabled: strategy.enabled });
  };
  const surfaceName = surface === "timeline" ? "时间线博文" : "评论区";

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <button type="button" className={`${secondaryButton} min-h-[38px] px-3 py-[7px]`} onClick={onBack}>
          ← 返回{surfaceName}表格
        </button>
        <span className="font-mono text-meta text-ink">
          P{strategy.priority} · {strategy.enabled ? "已启用" : "已停用"}
        </span>
      </div>
      <div className="grid items-start gap-[18px] min-[961px]:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] min-[1151px]:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] min-[1151px]:gap-6">
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-5">
            <section className={card}>
              <div className={sectionTitle}>
                <span className={sectionIcon} aria-hidden="true">
                  ⌘
                </span>
                <div>
                  <h2 className={sectionHeading}>定义过滤策略</h2>
                  <p className={sectionDescription}>设置匹配目标、适用位置和在队列中的顺序。</p>
                </div>
              </div>
              <div className="grid gap-3.5 min-[601px]:grid-cols-[minmax(0,1fr)_140px]">
                <label className={`${field} mt-0`} htmlFor="strategy-name">
                  <span className={fieldLabel}>策略名称</span>
                  <input
                    className={control}
                    id="strategy-name"
                    value={strategy.name}
                    required
                    maxLength={60}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </label>
                <label className={`${field} mt-0`} htmlFor="strategy-priority">
                  <span className={fieldLabel}>优先级</span>
                  <select
                    className={control}
                    id="strategy-priority"
                    value={strategy.priority}
                    onChange={(event) => onPriorityChange(Number(event.target.value))}
                  >
                    {Array.from({ length: strategyCount }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        P{index + 1}
                        {index === 0 ? " · 最高" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-[18px] grid gap-3.5 min-[601px]:grid-cols-[minmax(0,1fr)_minmax(190px,.7fr)]">
                <div className="strategy-surface min-w-0 rounded-md border border-line bg-canvas/45 p-3.5">
                  <span className="block text-caption text-muted">所属策略表</span>
                  <strong className="mt-[3px] block text-xs">{surfaceName}</strong>
                  <small className="mt-0.5 block font-mono text-caption text-muted">
                    {surface === "timeline" ? "/home" : "/status"} · 优先级仅在此表内生效
                  </small>
                </div>
                <label
                  className="flex min-w-0 cursor-pointer items-center justify-between gap-3.5 rounded-md border border-line bg-canvas/45 p-3.5"
                  htmlFor="strategy-enabled"
                >
                  <span>
                    <strong className="block text-xs">启用策略</strong>
                    <small className="block text-caption text-muted">停用后仍保留配置</small>
                  </span>
                  <span className={switchShell}>
                    <input
                      id="strategy-enabled"
                      aria-label="启用策略"
                      className={switchInput}
                      type="checkbox"
                      role="switch"
                      checked={strategy.enabled}
                      aria-checked={strategy.enabled}
                      onChange={(event) => update({ enabled: event.target.checked })}
                    />
                    <span className={switchTrack} aria-hidden="true" />
                  </span>
                </label>
              </div>
              <label className={field} htmlFor="strategy-prompt">
                <span className={fieldLabel}>
                  策略提示词 <small className={fieldHelp}>{strategy.prompt.length} / 6000</small>
                </span>
                <textarea
                  className={textarea}
                  id="strategy-prompt"
                  rows={5}
                  value={strategy.prompt}
                  required
                  maxLength={6000}
                  onChange={(event) => update({ prompt: event.target.value })}
                />
                <small className={fieldHelp}>
                  每条适用内容都会分别评估此策略；优先级最高且达到阈值的策略成为最终命中。
                </small>
              </label>
              <label className={`${field} border-t border-line pt-[18px]`} htmlFor="strategy-sensitivity">
                <span className={fieldLabel}>
                  敏感度{" "}
                  <output className="font-mono text-xl text-ink">
                    {strategy.sensitivity}
                    <small className={fieldHelp}> / 100</small>
                  </output>
                </span>
                <input
                  className="my-[3px] h-6 w-full cursor-pointer accent-ink"
                  id="strategy-sensitivity"
                  type="range"
                  min="0"
                  max="100"
                  value={strategy.sensitivity}
                  onChange={(event) => update({ sensitivity: Number(event.target.value) })}
                />
                <span className="flex justify-between gap-2 text-meta">
                  <small className={fieldHelp}>更宽松</small>
                  <strong className="text-center text-xs font-medium text-ink">
                    命中概率 ≥ {formatProbability(strategyThreshold(strategy))} 时通过此策略
                  </strong>
                  <small className={fieldHelp}>更敏感</small>
                </span>
              </label>
            </section>
            <section className={card}>
              <div className={sectionTitle}>
                <span className={sectionIcon} aria-hidden="true">
                  ◌
                </span>
                <div>
                  <h2 className={sectionHeading}>Hover 的表达方式</h2>
                  <p className={sectionDescription}>展示最终命中的策略及其判断数据。</p>
                </div>
              </div>
              <label className={field} htmlFor="hover-template">
                <span className={fieldLabel}>Hover 文案</span>
                <textarea
                  id="hover-template"
                  className={`${textarea} bg-canvas/45 font-mono text-xs leading-[1.9]`}
                  rows={3}
                  required
                  maxLength={500}
                  value={strategy.hoverTemplate}
                  aria-invalid={!!templateError}
                  aria-describedby="template-help"
                  onChange={(event) => update({ hoverTemplate: event.target.value })}
                />
              </label>
              <p id="template-help" className={cn(`${fieldHelp} mt-2`, templateError && "text-danger")}>
                {templateError || "点击变量插入文案。hitrate 是当前内容对最终命中策略的概率。"}
              </p>
              <div className="mt-3 mb-[22px] flex flex-wrap gap-1.5">
                {HOVER_VARIABLES.map((variable) => (
                  <button
                    className="rounded-sm border border-line-strong bg-selected px-[7px] py-[5px] text-caption text-ink hover:bg-hover"
                    type="button"
                    key={variable}
                    aria-label={`插入 ${variable}`}
                    title={`插入 {{${variable}}}`}
                    onClick={() => {
                      update({ hoverTemplate: `${strategy.hoverTemplate} {{${variable}}}`.slice(0, 500) });
                      document.getElementById("hover-template")?.focus();
                    }}
                  >
                    <code>{`{{${variable}}}`}</code>
                  </button>
                ))}
              </div>
              <label className={field} htmlFor="hover-css">
                <span className={fieldLabel}>
                  自定义 Hover CSS{" "}
                  <button type="button" className={textButton} onClick={() => update({ hoverCss: DEFAULT_HOVER_CSS })}>
                    填入示例
                  </button>
                </span>
                <textarea
                  id="hover-css"
                  className={`${textarea} bg-canvas/45 font-mono text-xs leading-[1.9] text-ink`}
                  spellCheck={false}
                  rows={5}
                  maxLength={6000}
                  value={strategy.hoverCss}
                  placeholder={DEFAULT_HOVER_CSS}
                  aria-invalid={!!cssError}
                  aria-describedby="css-help"
                  onChange={(event) => update({ hoverCss: event.target.value })}
                />
              </label>
              <p id="css-help" className={cn(`${fieldHelp} mt-2`, cssError && "text-danger")}>
                {cssError || "留空使用默认样式。样式仅在 Hover / 键盘聚焦时生效。"}
              </p>
              <details className="mt-4 text-xs text-muted">
                <summary className="cursor-pointer">支持的选择器、属性与变量</summary>
                <p className="mt-2.5 break-words">
                  <code>.veil</code> 遮罩背景，<code>.label</code> 变量文案，<code>.action</code> 揭示按钮。
                </p>
                <p className="mt-2.5 break-words">
                  支持
                  color、background、background-color、border、border-color、border-width、border-style、border-radius、box-shadow、text-shadow、font-size、font-weight、font-style、letter-spacing、line-height、text-decoration、padding。
                </p>
                <p className="mt-2.5 break-words">
                  <code>var(--hitrate)</code> 与 <code>var(--threshold)</code> 为 0–1 数值，可在 calc()
                  或颜色函数中使用。
                </p>
              </details>
            </section>
            <div className="flex flex-wrap items-center gap-3 pb-2.5">
              <button type="button" className={secondaryButton} onClick={reset}>
                恢复默认草稿
              </button>
              <span className="hidden flex-1 text-meta text-muted min-[1151px]:block">
                预览即刻更新，保存后应用并重新判断
              </span>
              <button type="submit" className={primaryButton} disabled={!!cssError || !!templateError}>
                {busy ? "保存中…" : "保存策略"}
              </button>
            </div>
          </fieldset>
        </form>
        <StrategyPreview strategy={strategy} modelNickname={modelNickname} modelId={modelId} />
      </div>
    </>
  );
}

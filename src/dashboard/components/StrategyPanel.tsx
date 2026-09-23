import { useState, type FormEvent } from "react";
import {
  compileHoverCss,
  DEFAULT_HOVER_CSS,
  defaultStrategy,
  HOVER_VARIABLES,
  HOVER_STYLE_PRESETS,
  sensitivityForHitRate,
  strategyHitRate,
  validateTemplate,
  type FilterStrategy,
  type FilterSurface,
} from "../../shared";
import { StrategyPreview } from "./StrategyPreview";
import { HitRatePresets } from "./HitRatePresets";
import { cn } from "../../ui/cn";
import { localizeError, useI18n } from "../../ui/i18n";
import {
  card,
  control,
  field,
  fieldHelp,
  fieldLabel,
  focusRing,
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
  const { locale, t } = useI18n();
  const update = (patch: Partial<FilterStrategy>) => onChange({ ...strategy, ...patch });
  const hitRate = strategyHitRate(strategy);
  const [hitRateEdit, setHitRateEdit] = useState<{ id: string; base: number; value: string } | null>(null);
  const hitRateInput =
    hitRateEdit?.id === strategy.id && hitRateEdit.base === hitRate ? hitRateEdit.value : String(hitRate);
  const commitHitRate = () => {
    const value = Number(hitRateInput);
    if (hitRateInput.trim() && Number.isFinite(value)) {
      update({ sensitivity: sensitivityForHitRate(value) });
    }
    setHitRateEdit(null);
  };
  const rawCssError = compileHoverCss(strategy.hoverCss, "#preview").error;
  const rawTemplateError = validateTemplate(strategy.hoverTemplate);
  const cssError = rawCssError ? localizeError(locale, rawCssError, "strategy.validationFailed") : null;
  const templateError = rawTemplateError ? localizeError(locale, rawTemplateError, "strategy.validationFailed") : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };
  const reset = () => {
    const defaults = defaultStrategy(surface, strategy.priority, strategy.id);
    onChange({ ...defaults, enabled: strategy.enabled });
  };
  const surfaceName = t(surface === "timeline" ? "strategy.timeline" : "strategy.comments");

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <button type="button" className={`${secondaryButton} min-h-[38px] px-3 py-[7px]`} onClick={onBack}>
          {t("strategy.back", { surface: surfaceName })}
        </button>
        <span className="font-mono text-meta text-ink">
          P{strategy.priority} · {t(strategy.enabled ? "common.enabled" : "common.disabled")}
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
                  <h2 className={sectionHeading}>{t("strategy.define")}</h2>
                  <p className={sectionDescription}>{t("strategy.defineDescription")}</p>
                </div>
              </div>
              <div className="grid gap-3.5 min-[601px]:grid-cols-[minmax(0,1fr)_140px]">
                <label className={`${field} mt-0`} htmlFor="strategy-name">
                  <span className={fieldLabel}>{t("strategy.name")}</span>
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
                  <span className={fieldLabel}>{t("strategy.priority")}</span>
                  <select
                    className={control}
                    id="strategy-priority"
                    value={strategy.priority}
                    onChange={(event) => onPriorityChange(Number(event.target.value))}
                  >
                    {Array.from({ length: strategyCount }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        P{index + 1}
                        {index === 0 ? t("strategy.highest") : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-[18px] grid gap-3.5 min-[601px]:grid-cols-[minmax(0,1fr)_minmax(190px,.7fr)]">
                <div className="strategy-surface min-w-0 rounded-md border border-line bg-canvas/45 p-3.5">
                  <span className="block text-caption text-muted">{t("strategy.table")}</span>
                  <strong className="mt-[3px] block text-xs">{surfaceName}</strong>
                  <small className="mt-0.5 block font-mono text-caption text-muted">
                    {surface === "timeline" ? "/home" : "/status"} · {t("strategy.tablePriority")}
                  </small>
                </div>
                <label
                  className="flex min-w-0 cursor-pointer items-center justify-between gap-3.5 rounded-md border border-line bg-canvas/45 p-3.5"
                  htmlFor="strategy-enabled"
                >
                  <span>
                    <strong className="block text-xs">{t("strategy.enableStrategy")}</strong>
                    <small className="block text-caption text-muted">{t("strategy.keepConfig")}</small>
                  </span>
                  <span className={switchShell}>
                    <input
                      id="strategy-enabled"
                      aria-label={t("strategy.enableStrategy")}
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
                  {t("strategy.prompt")} <small className={fieldHelp}>{strategy.prompt.length} / 6000</small>
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
                <small className={fieldHelp}>{t("strategy.promptHelp")}</small>
              </label>
              <div className={`${field} border-t border-line pt-[18px]`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className={fieldLabel} htmlFor="strategy-hit-rate">
                    {t("strategy.hitRate")}
                  </label>
                  <label
                    className="flex items-center gap-1 font-mono text-xl text-ink"
                    htmlFor="strategy-hit-rate-input"
                  >
                    <span className="sr-only">{t("strategy.hitRateInput")}</span>
                    <input
                      className={`${control} w-20 text-right font-mono text-base`}
                      id="strategy-hit-rate-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      inputMode="numeric"
                      value={hitRateInput}
                      onChange={(event) =>
                        setHitRateEdit({ id: strategy.id, base: hitRate, value: event.target.value })
                      }
                      onBlur={commitHitRate}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitHitRate();
                        }
                      }}
                    />
                    %
                  </label>
                </div>
                <input
                  className="my-[3px] h-6 w-full cursor-pointer accent-ink"
                  id="strategy-hit-rate"
                  type="range"
                  min="0"
                  max="100"
                  value={hitRate}
                  onChange={(event) => update({ sensitivity: sensitivityForHitRate(Number(event.target.value)) })}
                />
                <small className={fieldHelp}>{t("strategy.hitRateHelp", { value: hitRate })}</small>
                <HitRatePresets
                  hitRate={hitRate}
                  name={strategy.name}
                  onChange={(sensitivity) => update({ sensitivity })}
                />
              </div>
            </section>
            <section className={card}>
              <div className={sectionTitle}>
                <span className={sectionIcon} aria-hidden="true">
                  ◌
                </span>
                <div>
                  <h2 className={sectionHeading}>{t("strategy.hoverTitle")}</h2>
                  <p className={sectionDescription}>{t("strategy.hoverDescription")}</p>
                </div>
              </div>
              <label className={field} htmlFor="hover-template">
                <span className={fieldLabel}>{t("strategy.hoverTemplate")}</span>
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
                {templateError || t("strategy.templateHelp")}
              </p>
              <div className="mt-3 mb-[22px] flex flex-wrap gap-1.5">
                {HOVER_VARIABLES.map((variable) => (
                  <button
                    className="rounded-sm border border-line-strong bg-selected px-[7px] py-[5px] text-caption text-ink hover:bg-hover"
                    type="button"
                    key={variable}
                    aria-label={t("strategy.insert", { variable })}
                    title={t("strategy.insert", { variable: `{{${variable}}}` })}
                    onClick={() => {
                      update({ hoverTemplate: `${strategy.hoverTemplate} {{${variable}}}`.slice(0, 500) });
                      document.getElementById("hover-template")?.focus();
                    }}
                  >
                    <code>{`{{${variable}}}`}</code>
                  </button>
                ))}
              </div>
              <div className="grid gap-2 border-t border-line pt-4">
                <span className={fieldLabel}>{t("strategy.hoverStyle")}</span>
                <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t("strategy.hoverStyle")}>
                  {HOVER_STYLE_PRESETS.map(({ id, css }) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        focusRing,
                        "min-h-16 rounded-md border border-line-strong bg-surface px-3 py-2 text-left transition-colors hover:bg-hover",
                        strategy.hoverCss === css && "border-action bg-selected",
                      )}
                      aria-pressed={strategy.hoverCss === css}
                      onClick={() => update({ hoverCss: css })}
                    >
                      <strong className="block text-ui text-ink">{t(`strategy.hoverStyle.${id}`)}</strong>
                      <span className="mt-1 block text-caption text-muted">{t(`strategy.hoverStyle.${id}Help`)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className={field} htmlFor="hover-css">
                <span className={fieldLabel}>
                  {t("strategy.customCss")}{" "}
                  <button type="button" className={textButton} onClick={() => update({ hoverCss: DEFAULT_HOVER_CSS })}>
                    {t("strategy.fillExample")}
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
                {cssError || t("strategy.cssHelp")}
              </p>
              <details className="mt-4 text-xs text-muted">
                <summary className="cursor-pointer">{t("strategy.cssDetails")}</summary>
                <p className="mt-2.5 break-words">{t("strategy.cssSelectors")}</p>
                <p className="mt-2.5 break-words">{t("strategy.cssProperties")}</p>
                <p className="mt-2.5 break-words">{t("strategy.cssVariables")}</p>
              </details>
            </section>
            <div className="flex flex-wrap items-center gap-3 pb-2.5">
              <button type="button" className={secondaryButton} onClick={reset}>
                {t("strategy.reset")}
              </button>
              <span className="hidden flex-1 text-meta text-muted min-[1151px]:block">
                {t("strategy.previewUpdates")}
              </span>
              <button type="submit" className={primaryButton} disabled={!!cssError || !!templateError}>
                {busy ? t("common.saving") : t("strategy.save")}
              </button>
            </div>
          </fieldset>
        </form>
        <StrategyPreview strategy={strategy} modelNickname={modelNickname} modelId={modelId} />
      </div>
    </>
  );
}

import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
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
import { localizeError, useI18n } from "../../ui/i18n";
import { Actions, Panel, Status } from "./DashboardUI";
import { HitRatePresets } from "./HitRatePresets";
import { StrategyPreview } from "./StrategyPreview";

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
  const rawCssError = compileHoverCss(strategy.hoverCss, "#preview").error;
  const rawTemplateError = validateTemplate(strategy.hoverTemplate);
  const cssError = rawCssError ? localizeError(locale, rawCssError, "strategy.validationFailed") : null;
  const templateError = rawTemplateError ? localizeError(locale, rawTemplateError, "strategy.validationFailed") : null;
  const reset = () =>
    onChange({ ...defaultStrategy(surface, strategy.priority, strategy.id), enabled: strategy.enabled });
  const surfaceName = t(surface === "timeline" ? "strategy.timeline" : "strategy.comments");
  return (
    <VStack gap={5}>
      <HStack hAlign="between" wrap="wrap" gap={3}>
        <Button label={t("strategy.back", { surface: surfaceName })} onClick={onBack} />
        <Status
          variant="neutral"
          label={`P${strategy.priority} · ${t(strategy.enabled ? "common.enabled" : "common.disabled")}`}
        />
      </HStack>
      <Grid columns={{ minWidth: 360, max: 2 }} gap={8} align="start">
        <VStack
          as="form"
          gap={6}
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Panel title={t("strategy.define")} description={t("strategy.defineDescription")}>
            <FormLayout>
              <TextInput
                data-field="strategy-name"
                label={t("strategy.name")}
                value={strategy.name}
                isRequired
                isDisabled={busy}
                onChange={(name) => update({ name: name.slice(0, 60) })}
              />
              <Selector
                data-field="strategy-priority"
                label={t("strategy.priority")}
                value={String(strategy.priority)}
                options={Array.from({ length: strategyCount }, (_, index) => ({
                  value: String(index + 1),
                  label: `P${index + 1}${index === 0 ? t("strategy.highest") : ""}`,
                }))}
                isDisabled={busy}
                onChange={(value) => onPriorityChange(Number(value))}
              />
              <Switch
                label={t("strategy.enableStrategy")}
                description={t("strategy.keepConfig")}
                value={strategy.enabled}
                isDisabled={busy}
                onChange={(enabled) => update({ enabled })}
                labelPosition="start"
                labelSpacing="spread"
              />
              <Text as="p" color="secondary">
                {surfaceName} · {surface === "timeline" ? "/home" : "/status"} · {t("strategy.tablePriority")}
              </Text>
              <TextArea
                data-field="strategy-prompt"
                label={t("strategy.prompt")}
                description={t("strategy.promptHelp")}
                value={strategy.prompt}
                rows={5}
                maxLength={6000}
                isRequired
                isDisabled={busy}
                onChange={(prompt) => update({ prompt })}
              />
              <NumberInput
                key={strategy.id}
                data-field="strategy-hit-rate-input"
                label={t("strategy.hitRateInput")}
                value={hitRate}
                min={0}
                max={100}
                step={1}
                units="%"
                isIntegerOnly
                isWheelEnabled={false}
                isDisabled={busy}
                onChange={(value) => update({ sensitivity: sensitivityForHitRate(value) })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
              />
              <Slider
                data-field="strategy-hit-rate"
                label={t("strategy.hitRate")}
                value={hitRate}
                min={0}
                max={100}
                step={1}
                formatValue={(value) => `${value}%`}
                description={t("strategy.hitRateHelp", { value: hitRate })}
                isDisabled={busy}
                onChange={(value: number) => update({ sensitivity: sensitivityForHitRate(value) })}
              />
              <HitRatePresets
                hitRate={hitRate}
                name={strategy.name}
                disabled={busy}
                onChange={(sensitivity) => update({ sensitivity })}
              />
            </FormLayout>
          </Panel>
          <Divider />
          <Panel title={t("strategy.hoverTitle")} description={t("strategy.hoverDescription")}>
            <TextArea
              data-field="hover-template"
              label={t("strategy.hoverTemplate")}
              description={t("strategy.templateHelp")}
              value={strategy.hoverTemplate}
              rows={3}
              maxLength={500}
              isRequired
              isDisabled={busy}
              status={templateError ? { type: "error", message: templateError } : undefined}
              statusVariant="detached"
              onChange={(hoverTemplate) => update({ hoverTemplate })}
            />
            <HStack gap={1} wrap="wrap">
              {HOVER_VARIABLES.map((variable) => (
                <Button
                  key={variable}
                  size="sm"
                  label={t("strategy.insert", { variable })}
                  isDisabled={busy}
                  onClick={() => {
                    update({ hoverTemplate: `${strategy.hoverTemplate} {{${variable}}}`.slice(0, 500) });
                    document.querySelector<HTMLTextAreaElement>('[data-field="hover-template"]')?.focus();
                  }}
                >
                  <Text type="code">{`{{${variable}}}`}</Text>
                </Button>
              ))}
            </HStack>
            <RadioList
              label={t("strategy.hoverStyle")}
              value={HOVER_STYLE_PRESETS.find((preset) => preset.css === strategy.hoverCss)?.id ?? ""}
              isDisabled={busy}
              onChange={(id) => {
                const preset = HOVER_STYLE_PRESETS.find((item) => item.id === id);
                if (preset) update({ hoverCss: preset.css });
              }}
            >
              {HOVER_STYLE_PRESETS.map(({ id }) => (
                <RadioListItem
                  key={id}
                  value={id}
                  label={t(`strategy.hoverStyle.${id}`)}
                  description={t(`strategy.hoverStyle.${id}Help`)}
                />
              ))}
            </RadioList>
            <TextArea
              data-field="hover-css"
              label={t("strategy.customCss")}
              description={t("strategy.cssHelp")}
              value={strategy.hoverCss}
              placeholder={DEFAULT_HOVER_CSS}
              rows={6}
              maxLength={6000}
              hasSpellCheck={false}
              className="font-mono"
              isDisabled={busy}
              status={cssError ? { type: "error", message: cssError } : undefined}
              statusVariant="detached"
              onChange={(hoverCss) => update({ hoverCss })}
            />
            <Button
              label={t("strategy.fillExample")}
              size="sm"
              variant="ghost"
              isDisabled={busy}
              onClick={() => update({ hoverCss: DEFAULT_HOVER_CSS })}
            />
            <Collapsible trigger={t("strategy.cssDetails")}>
              <VStack gap={3}>
                <Text as="p" color="secondary">
                  {t("strategy.cssSelectors")}
                </Text>
                <Text as="p" color="secondary">
                  {t("strategy.cssProperties")}
                </Text>
                <Text as="p" color="secondary">
                  {t("strategy.cssVariables")}
                </Text>
              </VStack>
            </Collapsible>
          </Panel>
          <Actions>
            <Button label={t("strategy.reset")} onClick={reset} isDisabled={busy} />
            <Button
              type="submit"
              variant="primary"
              label={t("strategy.save")}
              isLoading={busy}
              isDisabled={!!cssError || !!templateError}
            />
          </Actions>
          <Text type="supporting">{t("strategy.previewUpdates")}</Text>
        </VStack>
        <StrategyPreview strategy={strategy} modelNickname={modelNickname} modelId={modelId} />
      </Grid>
    </VStack>
  );
}

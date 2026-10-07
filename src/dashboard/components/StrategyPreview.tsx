import { useEffect, useMemo, useRef, useState } from "react";
import { mountPostVeil, type PostVeilPresentation } from "../../content/render/post-veil";
import { formatProbability, strategyThreshold, type FilterStrategy } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { RotateCcw } from "lucide-react";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { SectionIntro, Status } from "./DashboardUI";
import { XPostPreview } from "./XPostPreview";

export function updateLocalizedPreviewSample(current: string, previousDefault: string, nextDefault: string): string {
  return current === previousDefault ? nextDefault : current;
}

export function StrategyPreview({
  strategy,
  modelNickname,
  modelId,
}: {
  strategy: FilterStrategy;
  modelNickname: string;
  modelId: string;
}) {
  const { t } = useI18n();
  const sample = t("preview.sample");
  const articleRef = useRef<HTMLElement>(null);
  const presentation = useRef<PostVeilPresentation | null>(null);
  const animateReplay = useRef(false);
  const [probability, setProbability] = useState(0.86);
  const [text, setText] = useState(sample);
  const previousSample = useRef(sample);
  const [cycle, setCycle] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dim" | "dark">("light");
  const surface = strategy.surfaces[0] ?? "timeline";
  const details = useMemo(
    () => ({ strategy, modelNickname, modelId, surface }),
    [strategy, modelNickname, modelId, surface],
  );
  const threshold = strategyThreshold(strategy);
  const hit = probability >= threshold;

  useEffect(() => {
    const previous = previousSample.current;
    previousSample.current = sample;
    setText((current) => updateLocalizedPreviewSample(current, previous, sample));
  }, [sample]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    article.dataset.previewTheme = theme;
    article.dataset.previewCycle = String(cycle);
    // Defer mounting outside React's effect commit; the shared renderer uses flushSync.
    const frame = requestAnimationFrame(() => {
      setRevealed(false);
      if (!hit) return;
      const animate = animateReplay.current;
      animateReplay.current = false;
      presentation.current = mountPostVeil(article, {
        animate,
        probability,
        details,
        onReveal: () => {
          presentation.current = null;
          setRevealed(true);
        },
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      const previous = presentation.current;
      presentation.current = null;
      // Avoid unmounting another React root during the parent commit.
      queueMicrotask(() => previous?.destroy());
    };
  }, [details, probability, cycle, theme, hit]);

  return (
    <VStack as="aside" aria-label={t("preview.aria")}>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack gap={3} hAlign="between" wrap="wrap">
            <SectionIntro title={t("preview.title")} />
            <IconButton
              label={t("preview.replay")}
              tooltip={t("preview.replay")}
              icon={<Icon icon={RotateCcw} size="sm" />}
              size="sm"
              variant="ghost"
              onClick={(event) => {
                animateReplay.current = event.detail > 0;
                setCycle((value) => value + 1);
              }}
              isDisabled={!hit}
            />
          </HStack>
          <Selector
            label={t("preview.theme")}
            value={theme}
            onChange={(value) => setTheme(value as typeof theme)}
            options={[
              { value: "light", label: t("theme.light") },
              { value: "dim", label: t("preview.dim") },
              { value: "dark", label: t("theme.dark") },
            ]}
          />
          <XPostPreview ref={articleRef} theme={theme} text={text} nowLabel={t("preview.now")} />
          <HStack gap={3} hAlign="between" wrap="wrap">
            <Status
              variant="neutral"
              label={t(!hit ? "preview.visible" : revealed ? "preview.revealed" : "preview.hit")}
            />
          </HStack>
          <Divider />
          <FormLayout>
            <Slider
              data-field="preview-rate"
              label={t("preview.rate")}
              description={t("preview.threshold", { value: formatProbability(threshold) })}
              value={Math.round(probability * 100)}
              min={0}
              max={100}
              step={1}
              formatValue={(value: number) => `${value}%`}
              onChange={(value: number) => setProbability(value / 100)}
            />
            <TextArea
              data-field="preview-content"
              label={t("preview.content")}
              rows={3}
              maxLength={2000}
              value={text}
              onChange={setText}
            />
          </FormLayout>
        </VStack>
      </Card>
    </VStack>
  );
}

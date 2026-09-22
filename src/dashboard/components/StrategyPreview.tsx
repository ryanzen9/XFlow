import { useEffect, useMemo, useRef, useState } from "react";
import { mountPostVeil, type PostVeilPresentation } from "../../content/render/post-veil";
import { formatProbability, strategyThreshold, type FilterStrategy } from "../../shared";
import { cn } from "../../ui/cn";
import { useI18n } from "../../ui/i18n";
import { control, eyebrow, field, fieldHelp, fieldLabel, textarea } from "../../ui/styles";

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
  const articleRef = useRef<HTMLElement>(null);
  const presentation = useRef<PostVeilPresentation | null>(null);
  const [probability, setProbability] = useState(0.86);
  const [text, setText] = useState(() => t("preview.sample"));
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
    const article = articleRef.current;
    if (!article) return;
    article.dataset.previewTheme = theme;
    article.dataset.previewCycle = String(cycle);
    // Defer mounting outside React's effect commit; the shared renderer uses flushSync.
    const frame = requestAnimationFrame(() => {
      setRevealed(false);
      if (!hit) return;
      presentation.current = mountPostVeil(article, {
        animate: true,
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
    <aside
      className="min-w-0 rounded-lg border border-line-strong bg-surface/60 p-[18px] min-[961px]:sticky min-[961px]:top-6 min-[1151px]:p-[22px]"
      aria-label={t("preview.aria")}
    >
      <div className="mb-[22px] flex items-start justify-between gap-2.5">
        <div>
          <span className={eyebrow}>{t("preview.live")}</span>
          <h2 className="mt-[7px] text-base font-semibold">{t("preview.title")}</h2>
        </div>
        <span className="pt-0.5 text-caption whitespace-nowrap text-muted before:mr-[5px] before:inline-block before:size-[5px] before:rounded-full before:bg-fg-4 before:content-['']">
          {t("preview.local")}
        </span>
      </div>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{t(surface === "timeline" ? "strategy.timeline" : "strategy.comments")}</span>
        <select
          className={`${control} min-h-0 w-auto px-2 py-1 text-xs`}
          aria-label={t("preview.theme")}
          value={theme}
          onChange={(event) => setTheme(event.target.value as typeof theme)}
        >
          <option value="light">{t("theme.light")}</option>
          <option value="dim">{t("preview.dim")}</option>
          <option value="dark">{t("theme.dark")}</option>
        </select>
      </div>
      {/* The mock below deliberately ignores the design tokens: it reproduces
          X's own palette and layout so the veil can be judged in context. The
          wash it shows is the neutral veil from src/content, not a tint. */}
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-[#d2dfe1] bg-white text-[#0f1419]",
          theme === "dim" && "border-[#38444d] bg-[#15202b] text-[#f7f9f9]",
          theme === "dark" && "border-[#333639] bg-[#000000] text-[#e7e9ea]",
        )}
      >
        <article ref={articleRef} className="min-h-[290px] bg-[inherit]">
          <div className="p-[18px]">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="grid size-[34px] place-items-center rounded-full bg-[#cfd9de] font-semibold text-[#0f1419]">
                L
              </span>
              <div className="grid">
                <strong className="text-xs">Lin / 林</strong>
                <span className="text-meta opacity-65">@lin_notes · {t("preview.now")}</span>
              </div>
              <span className="ml-auto text-xl">···</span>
            </div>
            <p className="my-[15px] text-xs break-words whitespace-pre-wrap">{text}</p>
            <div className="relative flex h-[100px] items-center justify-between overflow-hidden rounded-lg bg-[#e8ebec] p-5 text-[#536471]">
              <span className="font-mono text-base leading-[1.4] font-bold">
                LESS NOISE.
                <br />
                MORE SIGNAL.
              </span>
              <i
                className="size-[70px] rounded-full border border-[#b9c3c7] shadow-[0_0_0_16px_#e8ebec,0_0_0_17px_#b9c3c7]"
                aria-hidden="true"
              />
            </div>
            <div className="mt-4 flex justify-between font-mono text-meta opacity-60">
              <span>♡ 24</span>
              <span>↻ 8</span>
              <span>↗ 128</span>
            </div>
          </div>
        </article>
      </div>
      <div className="flex min-h-[46px] flex-wrap items-center justify-between gap-2.5 text-meta text-ink">
        <span>{t(!hit ? "preview.visible" : revealed ? "preview.revealed" : "preview.hit")}</span>
        <button
          className="bg-transparent px-0 py-[5px] text-meta text-ink disabled:opacity-50"
          type="button"
          onClick={() => setCycle((value) => value + 1)}
          disabled={!hit}
        >
          {t("preview.replay")}
        </button>
      </div>
      <label className={`${field} mt-2 border-t border-line pt-4`} htmlFor="preview-rate">
        <span className={fieldLabel}>
          {t("preview.rate")} <output className="font-mono">{formatProbability(probability)}</output>
        </span>
        <input
          className="h-6 w-full cursor-pointer accent-ink"
          id="preview-rate"
          type="range"
          min="0"
          max="100"
          value={Math.round(probability * 100)}
          onChange={(event) => setProbability(Number(event.target.value) / 100)}
        />
        <small className={fieldHelp}>{t("preview.threshold", { value: formatProbability(threshold) })}</small>
      </label>
      <label className={field} htmlFor="preview-content">
        <span className={fieldLabel}>{t("preview.content")}</span>
        <textarea
          className={textarea}
          id="preview-content"
          rows={3}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p className="mt-4 text-meta leading-[1.8] text-muted">{t("preview.help")}</p>
    </aside>
  );
}

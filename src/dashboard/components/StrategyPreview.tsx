import { useEffect, useMemo, useRef, useState } from "react";
import { mountPostVeil, type PostVeilPresentation } from "../../content/render/post-veil";
import { formatProbability, strategyThreshold, type FilterStrategy } from "../../shared";
import { cn } from "../../ui/cn";
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
  const articleRef = useRef<HTMLElement>(null);
  const presentation = useRef<PostVeilPresentation | null>(null);
  const [probability, setProbability] = useState(0.86);
  const [text, setText] = useState(
    "限时福利！关注并转发，即可领取独家优惠。点击主页链接了解更多。\n\n这是一段用于调试过滤效果的示例内容。",
  );
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
      aria-label="策略预览"
    >
      <div className="mb-[22px] flex items-start justify-between gap-2.5">
        <div>
          <span className={eyebrow}>LIVE PREVIEW</span>
          <h2 className="mt-[7px] text-base font-semibold">看看它如何呈现</h2>
        </div>
        <span className="pt-0.5 text-caption whitespace-nowrap text-muted before:mr-[5px] before:inline-block before:size-[5px] before:rounded-full before:bg-fg-4 before:content-['']">
          本地模拟
        </span>
      </div>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{surface === "timeline" ? "时间线博文" : "评论区"}</span>
        <select
          className={`${control} min-h-0 w-auto px-2 py-1 text-xs`}
          aria-label="预览主题"
          value={theme}
          onChange={(event) => setTheme(event.target.value as typeof theme)}
        >
          <option value="light">浅色</option>
          <option value="dim">Dim</option>
          <option value="dark">深色</option>
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
                <span className="text-meta opacity-65">@lin_notes · 刚刚</span>
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
        <span>{!hit ? "未达到阈值 · 保持可见" : revealed ? "已揭示 · 内容可见" : "已命中 · Hover 查看变量"}</span>
        <button
          className="bg-transparent px-0 py-[5px] text-meta text-ink disabled:opacity-50"
          type="button"
          onClick={() => setCycle((value) => value + 1)}
          disabled={!hit}
        >
          重播遮罩 ↻
        </button>
      </div>
      <label className={`${field} mt-2 border-t border-line pt-4`} htmlFor="preview-rate">
        <span className={fieldLabel}>
          模拟 hitrate <output className="font-mono">{formatProbability(probability)}</output>
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
        <small className={fieldHelp}>当前阈值 {formatProbability(threshold)}。此数值不是模型实际判断。</small>
      </label>
      <label className={field} htmlFor="preview-content">
        <span className={fieldLabel}>自定义预览内容</span>
        <textarea
          className={textarea}
          id="preview-content"
          rows={3}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p className="mt-4 text-meta leading-[1.8] text-muted">
        将鼠标移到遮罩上查看 Hover，点击或按 Enter 揭示内容。预览不会发送 API 请求。
      </p>
    </aside>
  );
}

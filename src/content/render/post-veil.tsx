import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { BlurVeil } from "../components/BlurVeil";
import { compileHoverCss, strategyThreshold, type VeilDetails } from "../../shared";

export type PostVeilState = "obscuring" | "obscured" | "revealing";
export type RevealReason = "user" | "disabled";

export interface PostVeilPresentation {
  reveal: () => void;
  setFilteringEnabled: (enabled: boolean) => void;
  destroy: () => void;
}

export interface MountPostVeilOptions {
  animate: boolean;
  probability: number;
  details?: VeilDetails;
  onReveal: (reason: RevealReason) => void;
}

interface SavedStyle {
  value: string;
  priority: string;
}

const OBSCURE_DURATION_MS = 360;
const REVEAL_DURATION_MS = 360;
const REDUCED_DURATION_MS = 120;

function parseRgb(color: string): [number, number, number] | null {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (!channels || channels.length < 3 || channels.some(Number.isNaN)) return null;
  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
}

function findSurfaceColor(article: HTMLElement): [number, number, number] {
  let current: HTMLElement | null = article;

  while (current) {
    const style = getComputedStyle(current);
    const rgb = parseRgb(style.backgroundColor);
    const alpha = Number(style.backgroundColor.match(/[\d.]+/g)?.[3] ?? 1);
    if (rgb && alpha > 0.15) return rgb;
    current = current.parentElement;
  }

  return matchMedia("(prefers-color-scheme: dark)").matches ? [0, 0, 0] : [255, 255, 255];
}

function colorWithAlpha([red, green, blue]: [number, number, number], alpha: number): string {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function veilColors(surface: [number, number, number]): { resting: string; hover: string } {
  const [red, green, blue] = surface;
  const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
  const isLightsOut = Math.max(red, green, blue) < 12;
  const restingAlpha = luminance > 0.65 ? 0.72 : isLightsOut ? 0.68 : 0.7;
  return {
    resting: colorWithAlpha(surface, restingAlpha),
    hover: colorWithAlpha(surface, Math.max(0, restingAlpha - 0.08)),
  };
}

function motionDuration(animate: boolean): number {
  return animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? OBSCURE_DURATION_MS : REDUCED_DURATION_MS;
}

export function mountPostVeil(
  article: HTMLElement,
  { animate, probability, details, onReveal }: MountPostVeilOptions,
): PostVeilPresentation {
  const host = document.createElement("div");
  host.className = "xflow-veil-host";
  host.dataset.slot = "filtered-post-veil";
  host.id = `xflow-${crypto.randomUUID()}`;
  host.style.setProperty("--hitrate", String(probability));
  host.style.setProperty("--threshold", String(details ? strategyThreshold(details.strategy) : 0));

  const savedStyles = new Map<string, SavedStyle>();
  const setTemporaryStyle = (property: string, value: string) => {
    savedStyles.set(property, {
      value: article.style.getPropertyValue(property),
      priority: article.style.getPropertyPriority(property),
    });
    article.style.setProperty(property, value);
  };

  const surface = findSurfaceColor(article);
  const colors = veilColors(surface);
  setTemporaryStyle("--xflow-veil-color", colors.resting);
  setTemporaryStyle("--xflow-veil-hover-color", colors.hover);
  setTemporaryStyle("--xflow-post-color", getComputedStyle(article).color);

  const inertChildren = new Map<HTMLElement, boolean>();
  for (const child of article.children) {
    if (!(child instanceof HTMLElement)) continue;
    inertChildren.set(child, child.inert);
    child.inert = true;
  }

  article.append(host);
  host.inert = true;
  article.dataset.xflowMotion = animate ? "full" : "fast";

  let root: Root | null = createRoot(host);
  let state: PostVeilState = "obscuring";
  let completed = false;
  let wantsObscured = true;
  let permanentlyRevealed = false;
  let revealReason: RevealReason = "disabled";
  let transitionTimer: number | undefined;
  let startFrame: number | undefined;

  const setState = (nextState: PostVeilState) => {
    state = nextState;
    article.dataset.xflowState = nextState;
  };

  const restoreArticle = () => {
    delete article.dataset.xflowState;
    delete article.dataset.xflowMotion;

    for (const [property, saved] of savedStyles) {
      if (saved.value) article.style.setProperty(property, saved.value, saved.priority);
      else article.style.removeProperty(property);
    }
    for (const [child, wasInert] of inertChildren) {
      if (child.isConnected) child.inert = wasInert;
    }
  };

  const teardown = (reason?: RevealReason) => {
    if (completed) return;
    completed = true;
    if (startFrame !== undefined) cancelAnimationFrame(startFrame);
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    root?.unmount();
    root = null;
    host.remove();
    restoreArticle();
    if (reason) onReveal(reason);
  };

  const beginObscuring = () => {
    if (completed || permanentlyRevealed) return;
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    host.inert = true;
    setState("obscuring");
    transitionTimer = window.setTimeout(() => {
      if (completed || state !== "obscuring") return;
      setState("obscured");
      host.inert = false;
      if (!wantsObscured) beginRevealing();
    }, motionDuration(animate));
  };

  const beginRevealing = () => {
    if (completed || state === "revealing") return;
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    host.inert = true;
    setState("revealing");
    const duration =
      animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? REVEAL_DURATION_MS : REDUCED_DURATION_MS;
    transitionTimer = window.setTimeout(() => {
      if (completed || state !== "revealing") return;
      if (wantsObscured && !permanentlyRevealed) {
        beginObscuring();
        return;
      }
      teardown(revealReason);
    }, duration);
  };

  const requestVisible = (reason: RevealReason) => {
    if (completed) return;
    wantsObscured = false;
    if (reason === "user") permanentlyRevealed = true;
    if (reason === "user" || revealReason !== "user") revealReason = reason;
    // A switch or policy update can arrive while the entrance transition is
    // still running. Reverse from the current visual state instead of first
    // finishing the veil and only then revealing it.
    if (state === "obscured" || state === "obscuring") beginRevealing();
  };

  const reveal = () => {
    requestVisible("user");
  };

  flushSync(() => {
    root?.render(
      <>
        {details && <style>{compileHoverCss(details.strategy.hoverCss, `#${host.id}`).css}</style>}
        <BlurVeil probability={probability} details={details} onReveal={reveal} />
      </>,
    );
  });

  startFrame = requestAnimationFrame(() => {
    if (completed) return;
    beginObscuring();
  });

  return {
    reveal,
    setFilteringEnabled: (enabled) => {
      if (enabled) {
        if (completed || permanentlyRevealed) return;
        wantsObscured = true;
        if (state === "obscured") host.inert = false;
        return;
      }
      requestVisible("disabled");
    },
    destroy: () => teardown(),
  };
}

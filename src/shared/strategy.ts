import type { FilterSurface } from "./contracts";
import { formatProbability } from "./probability";
import { normalizeProviderId, type ProviderId } from "./providers";

export interface FilterStrategy {
  id: string;
  enabled: boolean;
  surfaces: FilterSurface[];
  priority: number;
  name: string;
  prompt: string;
  sensitivity: number;
  hoverTemplate: string;
  hoverCss: string;
}

export interface VeilDetails {
  strategy: FilterStrategy;
  modelNickname: string;
  modelId: string;
  surface: FilterSurface;
}

export interface AppSettings {
  activeProvider: ProviderId;
  enabled: boolean;
  commentsEnabled: boolean;
  theme: Theme;
  modelNickname: string;
  strategies: FilterStrategy[];
}

export type Theme = "light" | "dark";

export const DEFAULT_PROMPT =
  "识别以推广、垃圾信息为主要目的的内容，包括诱导互动、诈骗或赠品骗局、返佣链接、加密货币推广、色情服务推广以及产品或服务广告。根据实际意图判断，不要仅因为出现链接或品牌名称就判定命中。正常对话、个人分享、新闻和知识内容不应命中。";
export const DEFAULT_HOVER_TEMPLATE =
  "{{strategy.name}} · {{strategy.hitrate}}\n{{model.nickname}} · 阈值 {{strategy.threshold}}";
export const DEFAULT_HOVER_CSS = ".label { color: #0a7776; font-weight: 600; }\n.action { color: #0a7776; }";

/**
 * Sensitivity seeded into a newly created strategy. Independent from
 * `FALLBACK_THRESHOLD`, which only covers results without strategy details.
 */
export const DEFAULT_SENSITIVITY = 20;

export function defaultStrategy(
  surface: FilterSurface | "all" = "all",
  priority = 1,
  id = surface === "timeline" ? "default-home" : surface === "comments" ? "default-comments" : "new-strategy",
): FilterStrategy {
  return {
    id,
    enabled: true,
    surfaces: surface === "all" ? ["timeline", "comments"] : [surface],
    priority,
    name: surface === "timeline" ? "Home 内容净化" : surface === "comments" ? "评论区内容净化" : "新过滤策略",
    prompt: DEFAULT_PROMPT,
    sensitivity: DEFAULT_SENSITIVITY,
    hoverTemplate: DEFAULT_HOVER_TEMPLATE,
    hoverCss: "",
  };
}

function textOr(value: unknown, fallback: string, limit: number): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

export function normalizeStrategy(
  value: unknown,
  fallbackSurface: FilterSurface | "all" = "all",
  fallbackPriority = 1,
  fallbackId = `strategy-${fallbackPriority}`,
): FilterStrategy {
  const fallback = defaultStrategy(fallbackSurface, fallbackPriority, fallbackId);
  const input = value && typeof value === "object" ? (value as Partial<FilterStrategy>) : {};
  const surfaces = Array.isArray(input.surfaces)
    ? input.surfaces.filter((surface): surface is FilterSurface => surface === "timeline" || surface === "comments")
    : fallback.surfaces;
  return {
    id: textOr(input.id, fallback.id, 80).replace(/[^a-zA-Z0-9_-]/g, "-") || fallback.id,
    enabled: input.enabled !== false,
    surfaces: [...new Set(surfaces)],
    priority:
      typeof input.priority === "number" && Number.isFinite(input.priority)
        ? Math.max(1, Math.round(input.priority))
        : fallback.priority,
    name: textOr(input.name, fallback.name, 60),
    prompt: textOr(input.prompt, fallback.prompt, 6000),
    sensitivity:
      typeof input.sensitivity === "number" && Number.isFinite(input.sensitivity)
        ? Math.max(0, Math.min(100, Math.round(input.sensitivity)))
        : fallback.sensitivity,
    hoverTemplate: textOr(input.hoverTemplate, fallback.hoverTemplate, 500),
    hoverCss: typeof input.hoverCss === "string" ? input.hoverCss.slice(0, 6000) : "",
  };
}

export function normalizeStrategies(input: Record<string, unknown>): FilterStrategy[] {
  const source = Array.isArray(input.strategies)
    ? input.strategies.map((strategy, index) => normalizeStrategy(strategy, "all", index + 1, `strategy-${index + 1}`))
    : [
        normalizeStrategy(input.homeStrategy, "timeline", 1, "legacy-home"),
        normalizeStrategy(input.commentsStrategy, "comments", 2, "legacy-comments"),
      ];
  // Strategies belong to one table. Older builds allowed one strategy to span
  // both surfaces, so preserve its configuration by splitting it into an
  // independently editable copy for each table.
  const expanded = source.flatMap((strategy) =>
    strategy.surfaces.length <= 1
      ? [strategy]
      : strategy.surfaces.map((surface) => ({
          ...strategy,
          id: `${strategy.id}-${surface}`,
          surfaces: [surface],
        })),
  );
  const ordered = (["timeline", "comments"] as const).flatMap((surface) =>
    expanded
      .filter((strategy) => strategy.surfaces[0] === surface)
      .toSorted((first, second) => first.priority - second.priority),
  );
  ordered.push(...expanded.filter((strategy) => strategy.surfaces.length === 0));
  const ids = new Set<string>();
  const unique = ordered.map((strategy, index) => {
    let id = strategy.id;
    while (ids.has(id)) id = `${strategy.id}-${index + 1}`;
    ids.add(id);
    return { ...strategy, id };
  });
  return reindexStrategies(unique);
}

export function createStrategy(surface: FilterSurface, priority: number): FilterStrategy {
  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `strategy-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return defaultStrategy(surface, priority, id);
}

export function normalizeSettings(input: Record<string, unknown>): AppSettings {
  return {
    activeProvider: normalizeProviderId(input.activeProvider),
    enabled: input.enabled !== false,
    commentsEnabled: input.commentsEnabled === true,
    theme: input.theme === "dark" ? "dark" : "light",
    modelNickname: textOr(input.modelNickname, "Jev", 40),
    strategies: normalizeStrategies(input),
  };
}

export function strategyThreshold(strategy: FilterStrategy): number {
  return (100 - strategy.sensitivity) / 100;
}

export function strategiesFor(settings: AppSettings, surface: FilterSurface): FilterStrategy[] {
  return settings.strategies
    .filter((strategy) => strategy.enabled && strategy.surfaces.includes(surface))
    .toSorted((first, second) => first.priority - second.priority);
}

export function reindexStrategies(strategies: FilterStrategy[]): FilterStrategy[] {
  const priorities: Record<FilterSurface, number> = { timeline: 0, comments: 0 };
  return strategies.map((strategy) => {
    const surface = strategy.surfaces[0];
    return surface ? { ...strategy, surfaces: [surface], priority: ++priorities[surface] } : strategy;
  });
}

export const HOVER_VARIABLES = [
  "strategy.name",
  "strategy.hitrate",
  "strategy.threshold",
  "model.nickname",
  "model.id",
  "surface",
] as const;

export function renderHoverText(details: VeilDetails, probability: number): string {
  const values: Record<string, string> = {
    "strategy.name": details.strategy.name,
    "strategy.hitrate": formatProbability(probability),
    "strategy.threshold": formatProbability(strategyThreshold(details.strategy)),
    "model.nickname": details.modelNickname,
    "model.id": details.modelId,
    surface: details.surface === "timeline" ? "Home" : "评论区",
  };
  return details.strategy.hoverTemplate.replace(
    /\{\{\s*([\w.]+)\s*\}\}/g,
    (token, key: string) => values[key] ?? token,
  );
}

export function validateTemplate(template: string): string | null {
  for (const match of template.matchAll(/\{\{(.*?)\}\}/g)) {
    if (!HOVER_VARIABLES.includes(match[1]?.trim() as (typeof HOVER_VARIABLES)[number])) return `未知变量：${match[0]}`;
  }
  if (template.replace(/\{\{.*?\}\}/g, "").match(/[{}]/)) return "变量请使用完整的 {{变量名}} 格式。";
  return null;
}

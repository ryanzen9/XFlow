import type { FilterSurface } from "./contracts";
import { PROVIDERS } from "./providers";
import type { AppSettings, FilterStrategy } from "./strategy";

export type ContentDecision = "allow" | "blur" | "block";
export type DecisionSource = "user" | "exact-cache" | "normalized-cache" | "template-cache" | "semantic-cache" | "jev";
export type UserDecisionScope = "content" | "semantic";
export type UserDecisionAction = "hide" | "allow" | "reduce-similar" | "block-similar";

export interface UserDecisionRecord {
  id: string;
  scope: UserDecisionScope;
  surface: FilterSurface;
  policyId: string;
  contentHash: string;
  normalizedContent: string;
  semanticTokens: string[];
  decision: ContentDecision;
  similarityThreshold?: number;
  createdAt: number;
  updatedAt: number;
  deviceId: string;
}

export interface UserKnowledge {
  userDecisions: UserDecisionRecord[];
}

export const EMPTY_USER_KNOWLEDGE: UserKnowledge = { userDecisions: [] };

const encoder = new TextEncoder();

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function exactContent(value: string): string {
  return value.normalize("NFKC").trim();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|ref$|ref_|source$|campaign$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

export function normalizeContent(value: string): string {
  return exactContent(value)
    .toLocaleLowerCase()
    .replace(/https?:\/\/[^\s]+/giu, normalizeUrl)
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/([!?。！？])\1+/gu, "$1")
    .trim();
}

export function templateContent(value: string): string {
  return normalizeContent(value)
    .replace(/https?:\/\/[^\s]+/giu, "<url>")
    .replace(/@[\p{L}\p{N}_]+/gu, "@<user>")
    .replace(/\$[\p{L}\p{N}_]+/gu, "$<ticker>")
    .replace(/(?<![\p{L}\p{N}])([+-]?)\d+(?:[.,]\d+)*(%?)/gu, (_match, sign: string, percent: string) => {
      return `${sign}<number>${percent}`;
    });
}

export function semanticTokens(value: string): string[] {
  const normalized = normalizeContent(value).replace(/https?:\/\/[^\s]+/giu, " ");
  const tokens = normalized.match(/[\p{Script=Han}]|[\p{L}\p{N}_$@+-]{2,}/gu) ?? [];
  return [...new Set(tokens)].slice(0, 160);
}

export function jaccardSimilarity(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;
  for (const token of leftSet) if (rightSet.has(token)) intersection += 1;
  return intersection / (leftSet.size + rightSet.size - intersection);
}

function policyStrategy(strategy: FilterStrategy) {
  return {
    id: strategy.id,
    enabled: strategy.enabled,
    priority: strategy.priority,
    prompt: strategy.prompt,
    sensitivity: strategy.sensitivity,
  };
}

export async function policyVersion(settings: AppSettings, surface: FilterSurface): Promise<string> {
  const policy = {
    cacheSchema: 1,
    surface,
    provider: settings.activeProvider,
    modelId: PROVIDERS[settings.activeProvider].modelId,
    strategies: settings.strategies
      .filter((strategy) => strategy.surfaces.includes(surface))
      .toSorted((left, right) => left.priority - right.priority)
      .map(policyStrategy),
  };
  return sha256(JSON.stringify(policy));
}

function isDecision(value: unknown): value is ContentDecision {
  return value === "allow" || value === "blur" || value === "block";
}

export function normalizeUserDecision(value: unknown): UserDecisionRecord | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<UserDecisionRecord>;
  if (
    typeof input.id !== "string" ||
    (input.scope !== "content" && input.scope !== "semantic") ||
    (input.surface !== "timeline" && input.surface !== "comments") ||
    typeof input.contentHash !== "string" ||
    typeof input.normalizedContent !== "string" ||
    !Array.isArray(input.semanticTokens) ||
    !isDecision(input.decision) ||
    typeof input.createdAt !== "number" ||
    typeof input.updatedAt !== "number" ||
    typeof input.deviceId !== "string"
  ) {
    return null;
  }
  return {
    id: input.id.slice(0, 180),
    scope: input.scope,
    surface: input.surface,
    policyId: typeof input.policyId === "string" && input.policyId ? input.policyId.slice(0, 120) : input.surface,
    contentHash: input.contentHash,
    normalizedContent: input.normalizedContent.slice(0, 5000),
    semanticTokens: input.semanticTokens.filter((token): token is string => typeof token === "string").slice(0, 160),
    decision: input.decision,
    similarityThreshold:
      typeof input.similarityThreshold === "number" ? Math.max(0.5, Math.min(1, input.similarityThreshold)) : undefined,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    deviceId: input.deviceId.slice(0, 120),
  };
}

export function normalizeUserKnowledge(value: unknown): UserKnowledge {
  const input = value && typeof value === "object" ? (value as Partial<UserKnowledge>) : {};
  const byId = new Map<string, UserDecisionRecord>();
  for (const raw of Array.isArray(input.userDecisions) ? input.userDecisions : []) {
    const decision = normalizeUserDecision(raw);
    if (!decision) continue;
    const previous = byId.get(decision.id);
    if (!previous || compareDecisionVersion(decision, previous) > 0) byId.set(decision.id, decision);
  }
  return { userDecisions: [...byId.values()].toSorted((left, right) => left.id.localeCompare(right.id)) };
}

function compareDecisionVersion(left: UserDecisionRecord, right: UserDecisionRecord): number {
  return left.updatedAt - right.updatedAt || left.deviceId.localeCompare(right.deviceId);
}

export function mergeUserKnowledge(left: UserKnowledge, right: UserKnowledge): UserKnowledge {
  return normalizeUserKnowledge({ userDecisions: [...left.userDecisions, ...right.userDecisions] });
}

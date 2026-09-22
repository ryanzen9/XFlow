import type { FilterSurface } from "./contracts";
import { PROVIDERS } from "./providers";
import type { AppSettings, FilterStrategy } from "./strategy";

export type ContentDecision = "allow" | "blur" | "block";
export type DecisionSource = "user" | "exact-cache" | "normalized-cache" | "template-cache" | "semantic-cache" | "jev";
export type UserDecisionScope = "content" | "semantic" | "author";
export type UserDecisionAction =
  | "hide"
  | "allow"
  | "reduce-similar"
  | "block-similar"
  | "block-author"
  | "allow-author"
  | "correct-hide"
  | "correct-allow";

export interface UserDecisionRecord {
  id: string;
  scope: UserDecisionScope;
  surface: FilterSurface;
  policyId: string;
  postId?: string;
  contentHash: string;
  normalizedContent: string;
  semanticTokens: string[];
  semanticEmbedding?: number[];
  templateHash?: string;
  authorId?: string;
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

function tokenHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function semanticEmbeddingFromTokens(tokens: readonly string[], dimensions = 96): number[] {
  const vector = Array<number>(dimensions).fill(0);
  const features = [
    ...tokens.map((token) => `u:${token}`),
    ...tokens.slice(1).map((token, index) => `b:${tokens[index]}:${token}`),
  ];
  for (const feature of features) {
    const hash = tokenHash(feature);
    const index = hash % dimensions;
    vector[index] = (vector[index] ?? 0) + ((hash >>> 8) % 2 === 0 ? 1 : -1);
  }
  const magnitude = Math.hypot(...vector);
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

export function semanticEmbedding(value: string): number[] {
  return semanticEmbeddingFromTokens(semanticTokens(value));
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let product = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    product += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return product / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function contentLanguage(value: string): "cjk" | "latin" | "mixed" | "other" {
  const hasCjk = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(value);
  const hasLatin = /\p{Script=Latin}/u.test(value);
  if (hasCjk && hasLatin) return "mixed";
  if (hasCjk) return "cjk";
  if (hasLatin) return "latin";
  return "other";
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
    cacheSchema: 2,
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
    (input.scope !== "content" && input.scope !== "semantic" && input.scope !== "author") ||
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
    postId: typeof input.postId === "string" && input.postId ? input.postId.slice(0, 180) : undefined,
    contentHash: input.contentHash,
    normalizedContent: input.normalizedContent.slice(0, 5000),
    semanticTokens: input.semanticTokens.filter((token): token is string => typeof token === "string").slice(0, 160),
    semanticEmbedding:
      Array.isArray(input.semanticEmbedding) &&
      input.semanticEmbedding.every((component) => typeof component === "number" && Number.isFinite(component))
        ? input.semanticEmbedding.slice(0, 96)
        : semanticEmbeddingFromTokens(
            input.semanticTokens.filter((token): token is string => typeof token === "string"),
          ),
    templateHash: typeof input.templateHash === "string" ? input.templateHash : undefined,
    authorId: typeof input.authorId === "string" ? input.authorId.slice(0, 80) : undefined,
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

export function syncableUserKnowledge(value: unknown): UserKnowledge {
  const knowledge = normalizeUserKnowledge(value);
  return {
    userDecisions: knowledge.userDecisions.map(({ semanticEmbedding: _embedding, ...decision }) => decision),
  };
}

function compareDecisionVersion(left: UserDecisionRecord, right: UserDecisionRecord): number {
  return left.updatedAt - right.updatedAt || left.deviceId.localeCompare(right.deviceId);
}

export function mergeUserKnowledge(left: UserKnowledge, right: UserKnowledge): UserKnowledge {
  return normalizeUserKnowledge({ userDecisions: [...left.userDecisions, ...right.userDecisions] });
}

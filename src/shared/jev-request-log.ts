import type { FilterSurface } from "./contracts";
import { normalizeProviderId, type ProviderId } from "./providers";

export const JEV_REQUEST_LOG_KEY = "jevRequestLog";
export const JEV_REQUEST_LOG_RETENTION_DAYS = 30;
export const JEV_REQUEST_LOG_LIMIT = 200;

export type JevRequestKind = "review" | "health-check";
export type JevRequestStatus = "success" | "error";
export type JevRequestErrorCode = "auth" | "billing" | "rate-limit" | "invalid-response" | "provider";

export interface JevRequestLogEntry {
  id: string;
  kind: JevRequestKind;
  requestedAt: number;
  durationMs: number;
  providerId: ProviderId;
  modelId: string;
  status: JevRequestStatus;
  itemCount: number;
  questionCount: number;
  surface?: FilterSurface;
  errorCode?: JevRequestErrorCode;
}

export interface JevRequestLogData {
  schemaVersion: 1;
  entries: JevRequestLogEntry[];
}

export const EMPTY_JEV_REQUEST_LOG: JevRequestLogData = { schemaVersion: 1, entries: [] };

function text(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, limit);
  return normalized || null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function normalizeJevRequestLogEntry(value: unknown): JevRequestLogEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Partial<JevRequestLogEntry>;
  const id = text(input.id, 120);
  const requestedAt = nonNegativeInteger(input.requestedAt);
  const durationMs = nonNegativeInteger(input.durationMs);
  const modelId = text(input.modelId, 120);
  const itemCount = nonNegativeInteger(input.itemCount);
  const questionCount = nonNegativeInteger(input.questionCount);
  if (!id || requestedAt === null || durationMs === null || !modelId || itemCount === null || questionCount === null) {
    return null;
  }
  const kind: JevRequestKind = input.kind === "health-check" ? "health-check" : "review";
  const status: JevRequestStatus = input.status === "error" ? "error" : "success";
  const surface = input.surface === "timeline" || input.surface === "comments" ? input.surface : undefined;
  const errorCodes: JevRequestErrorCode[] = ["auth", "billing", "rate-limit", "invalid-response", "provider"];
  const errorCode = errorCodes.includes(input.errorCode as JevRequestErrorCode)
    ? (input.errorCode as JevRequestErrorCode)
    : undefined;
  return {
    id,
    kind,
    requestedAt,
    durationMs,
    providerId: normalizeProviderId(input.providerId),
    modelId,
    status,
    itemCount,
    questionCount,
    surface,
    errorCode: status === "error" ? errorCode : undefined,
  };
}

export function normalizeJevRequestLogData(value: unknown, now = Date.now()): JevRequestLogData {
  const input =
    value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<JevRequestLogData>) : {};
  const cutoff = now - JEV_REQUEST_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  const byId = new Map<string, JevRequestLogEntry>();
  for (const raw of Array.isArray(input.entries) ? input.entries : []) {
    const entry = normalizeJevRequestLogEntry(raw);
    if (entry && entry.requestedAt >= cutoff) byId.set(entry.id, entry);
  }
  return {
    schemaVersion: 1,
    entries: [...byId.values()]
      .toSorted((left, right) => right.requestedAt - left.requestedAt || left.id.localeCompare(right.id))
      .slice(0, JEV_REQUEST_LOG_LIMIT),
  };
}

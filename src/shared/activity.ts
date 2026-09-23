import type { FilterSurface } from "./contracts";
import { canonicalPostUrl } from "./posts";

export const ACTIVITY_DATA_KEY = "activityData";
export const ACTIVITY_DEVICE_ID_KEY = "activityDeviceId";
export const ACTIVITY_HISTORY_DAYS = 30;
export const ACTIVITY_HEATMAP_DAYS = 12 * 7;
export const ACTIVITY_TREND_DAYS = 7;

export type ActivityStatus = "filtered" | "revealed" | "incorrect";
export type ActivityMediaType = "image" | "video" | "quote";

export interface ActivityEvent {
  id: string;
  contentId: string;
  day: string;
  filteredAt: number;
  updatedAt: number;
  deviceId: string;
  surface: FilterSurface;
  status: ActivityStatus;
  author?: string;
  preview?: string;
  url?: string;
  mediaType?: ActivityMediaType;
  policyId?: string;
  policyName?: string;
}

export interface ActivityData {
  schemaVersion: 1;
  clearedAt: number;
  historyClearedAt: number;
  archivedByDevice: Record<string, number>;
  events: ActivityEvent[];
}

export interface ActivityDay {
  day: string;
  date: Date;
  count: number;
}

export interface ActivitySummary {
  today: number;
  allTime: number;
}

export interface WeeklyActivity {
  start: Date;
  end: Date;
  total: number;
  previousTotal: number;
  comparisonPercent?: number;
  mostActive?: ActivityDay;
}

export const EMPTY_ACTIVITY_DATA: ActivityData = {
  schemaVersion: 1,
  clearedAt: 0,
  historyClearedAt: 0,
  archivedByDevice: {},
  events: [],
};

function finiteTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function text(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, limit);
  return normalized || undefined;
}

function isSurface(value: unknown): value is FilterSurface {
  return value === "timeline" || value === "comments";
}

function isStatus(value: unknown): value is ActivityStatus {
  return value === "filtered" || value === "revealed" || value === "incorrect";
}

function isMediaType(value: unknown): value is ActivityMediaType {
  return value === "image" || value === "video" || value === "quote";
}

export function localDayKey(value: number | Date): string {
  const date = typeof value === "number" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(value: number | Date): Date {
  const date = typeof value === "number" ? new Date(value) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount);
}

export function normalizeActivityEvent(value: unknown): ActivityEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Partial<ActivityEvent>;
  const id = text(input.id, 180);
  const contentId = text(input.contentId, 160);
  const filteredAt = finiteTimestamp(input.filteredAt);
  const updatedAt = finiteTimestamp(input.updatedAt);
  const deviceId = text(input.deviceId, 120);
  if (!id || !contentId || filteredAt === null || updatedAt === null || !deviceId || !isSurface(input.surface)) {
    return null;
  }
  return {
    id,
    contentId,
    day: /^\d{4}-\d{2}-\d{2}$/.test(input.day ?? "") ? input.day! : localDayKey(filteredAt),
    filteredAt,
    updatedAt,
    deviceId,
    surface: input.surface,
    status: isStatus(input.status) ? input.status : "filtered",
    author: text(input.author, 80),
    preview: text(input.preview, 500),
    url: canonicalPostUrl(input.url),
    mediaType: isMediaType(input.mediaType) ? input.mediaType : undefined,
    policyId: text(input.policyId, 80),
    policyName: text(input.policyName, 80),
  };
}

function normalizeArchive(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const archive: Record<string, number> = {};
  for (const [rawDeviceId, rawCount] of Object.entries(value as Record<string, unknown>)) {
    const deviceId = text(rawDeviceId, 120);
    const count = nonNegativeInteger(rawCount);
    if (deviceId && count) archive[deviceId] = Math.max(archive[deviceId] ?? 0, count);
  }
  return archive;
}

function mergeArchives(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };
  for (const [deviceId, count] of Object.entries(right)) result[deviceId] = Math.max(result[deviceId] ?? 0, count);
  return result;
}

function compareEventVersion(left: ActivityEvent, right: ActivityEvent): number {
  const statusRank: Record<ActivityStatus, number> = { filtered: 0, revealed: 1, incorrect: 2 };
  return (
    statusRank[left.status] - statusRank[right.status] ||
    left.updatedAt - right.updatedAt ||
    left.deviceId.localeCompare(right.deviceId)
  );
}

function mergeEvent(left: ActivityEvent, right: ActivityEvent): ActivityEvent {
  const winner = compareEventVersion(left, right) >= 0 ? left : right;
  const other = winner === left ? right : left;
  const first = left.filteredAt <= right.filteredAt ? left : right;
  return {
    ...other,
    ...winner,
    filteredAt: first.filteredAt,
    day: first.day,
  };
}

export function normalizeActivityData(value: unknown): ActivityData {
  const input = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<ActivityData>) : {};
  const clearedAt = finiteTimestamp(input.clearedAt) ?? 0;
  const historyClearedAt = Math.max(clearedAt, finiteTimestamp(input.historyClearedAt) ?? 0);
  const byId = new Map<string, ActivityEvent>();
  for (const raw of Array.isArray(input.events) ? input.events : []) {
    let event = normalizeActivityEvent(raw);
    if (!event || event.filteredAt <= clearedAt) continue;
    if (event.filteredAt <= historyClearedAt) {
      event = {
        id: event.id,
        contentId: event.contentId,
        day: event.day,
        filteredAt: event.filteredAt,
        updatedAt: Math.max(event.updatedAt, historyClearedAt),
        deviceId: event.deviceId,
        surface: event.surface,
        status: event.status,
      };
    }
    const previous = byId.get(event.id);
    byId.set(event.id, previous ? mergeEvent(previous, event) : event);
  }
  return {
    schemaVersion: 1,
    clearedAt,
    historyClearedAt,
    archivedByDevice: normalizeArchive(input.archivedByDevice),
    events: [...byId.values()].toSorted(
      (left, right) => right.filteredAt - left.filteredAt || left.id.localeCompare(right.id),
    ),
  };
}

export function mergeActivityData(left: ActivityData, right: ActivityData, now = Date.now()): ActivityData {
  const normalizedLeft = normalizeActivityData(left);
  const normalizedRight = normalizeActivityData(right);
  const clearedAt = Math.max(normalizedLeft.clearedAt, normalizedRight.clearedAt);
  const historyClearedAt = Math.max(normalizedLeft.historyClearedAt, normalizedRight.historyClearedAt);
  const archivedByDevice = mergeArchives(
    normalizedLeft.clearedAt === clearedAt ? normalizedLeft.archivedByDevice : {},
    normalizedRight.clearedAt === clearedAt ? normalizedRight.archivedByDevice : {},
  );
  return compactActivityData(
    normalizeActivityData({
      schemaVersion: 1,
      clearedAt,
      historyClearedAt,
      archivedByDevice,
      events: [...normalizedLeft.events, ...normalizedRight.events],
    }),
    now,
  );
}

export function compactActivityData(data: ActivityData, now = Date.now()): ActivityData {
  const normalized = normalizeActivityData(data);
  const detailCutoff = addLocalDays(startOfLocalDay(now), -ACTIVITY_HISTORY_DAYS).getTime();
  const identityCutoff = addLocalDays(startOfLocalDay(now), -(ACTIVITY_HEATMAP_DAYS - 1)).getTime();
  const archivedByDevice = { ...normalized.archivedByDevice };
  const events: ActivityEvent[] = [];
  for (const event of normalized.events) {
    if (event.filteredAt < identityCutoff) {
      archivedByDevice[event.deviceId] = (archivedByDevice[event.deviceId] ?? 0) + 1;
      continue;
    }
    events.push(
      event.filteredAt >= detailCutoff
        ? event
        : {
            id: event.id,
            contentId: event.contentId,
            day: event.day,
            filteredAt: event.filteredAt,
            updatedAt: event.updatedAt,
            deviceId: event.deviceId,
            surface: event.surface,
            status: event.status,
          },
    );
  }
  return normalizeActivityData({
    schemaVersion: 1,
    clearedAt: normalized.clearedAt,
    historyClearedAt: normalized.historyClearedAt,
    archivedByDevice,
    events,
  });
}

export function activitySummary(data: ActivityData, now = Date.now()): ActivitySummary {
  const normalized = normalizeActivityData(data);
  const today = localDayKey(now);
  return {
    today: normalized.events.filter((event) => event.day === today).length,
    allTime:
      normalized.events.length + Object.values(normalized.archivedByDevice).reduce((sum, count) => sum + count, 0),
  };
}

export function activityDays(data: ActivityData, days: number, now = Date.now()): ActivityDay[] {
  const end = startOfLocalDay(now);
  const start = addLocalDays(end, -(Math.max(1, Math.floor(days)) - 1));
  const counts = new Map<string, number>();
  for (const event of normalizeActivityData(data).events) counts.set(event.day, (counts.get(event.day) ?? 0) + 1);
  return Array.from({ length: Math.max(1, Math.floor(days)) }, (_, index) => {
    const date = addLocalDays(start, index);
    const day = localDayKey(date);
    return { day, date, count: counts.get(day) ?? 0 };
  });
}

export function activityHistory(data: ActivityData, now = Date.now()): ActivityEvent[] {
  const cutoff = addLocalDays(startOfLocalDay(now), -ACTIVITY_HISTORY_DAYS).getTime();
  return normalizeActivityData(data).events.filter(
    (event) => event.filteredAt >= cutoff && Boolean(event.preview || event.author || event.url || event.policyName),
  );
}

function mondayFor(value: Date): Date {
  const day = value.getDay();
  return addLocalDays(value, -(day === 0 ? 6 : day - 1));
}

export function weeklyActivity(data: ActivityData, now = Date.now()): WeeklyActivity {
  const currentStart = mondayFor(startOfLocalDay(now));
  const nextStart = addLocalDays(currentStart, 7);
  const previousStart = addLocalDays(currentStart, -7);
  const currentDays = activityDays(data, 14, addLocalDays(nextStart, -1).getTime());
  const previous = currentDays.filter((item) => item.date >= previousStart && item.date < currentStart);
  const current = currentDays.filter((item) => item.date >= currentStart && item.date < nextStart);
  const total = current.reduce((sum, item) => sum + item.count, 0);
  const previousTotal = previous.reduce((sum, item) => sum + item.count, 0);
  const mostActive = current.toSorted((left, right) => right.count - left.count)[0];
  return {
    start: currentStart,
    end: addLocalDays(nextStart, -1),
    total,
    previousTotal,
    comparisonPercent: previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : undefined,
    mostActive: mostActive && mostActive.count > 0 ? mostActive : undefined,
  };
}

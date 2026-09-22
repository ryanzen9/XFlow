import {
  ACTIVITY_DATA_KEY,
  ACTIVITY_DEVICE_ID_KEY,
  activitySummary,
  canonicalPostUrl,
  compactActivityData,
  localDayKey,
  normalizeActivityData,
  sanitizePost,
  type ActivityData,
  type ActivityEvent,
  type ActivityStatus,
  type FilterSurface,
  type PostInput,
} from "../../shared";

const PAGE_ACTIVITY_KEY = "activityPageState";

interface PageActivity {
  token: string;
  seen: string[];
}

type PageActivityState = Record<string, PageActivity>;

export interface RecordFilterEventInput {
  post: PostInput;
  surface: FilterSurface;
  pageToken: string;
  tabId: number;
  policyId?: string;
  policyName?: string;
}

let mutationChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const task = mutationChain.then(operation, operation);
  mutationChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function eventId(post: PostInput): Promise<string> {
  if (/^\d+$/.test(post.id)) return `x:${post.id}`;
  const url = canonicalPostUrl(post.url);
  if (url) return `url:${await sha256(url)}`;
  return `content:${await sha256(`${post.author ?? ""}\n${post.text}`)}`;
}

async function deviceId(): Promise<string> {
  const stored = await chrome.storage.local.get([ACTIVITY_DEVICE_ID_KEY]);
  const current = stored[ACTIVITY_DEVICE_ID_KEY];
  if (typeof current === "string" && current) return current;
  const next = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  await chrome.storage.local.set({ [ACTIVITY_DEVICE_ID_KEY]: next });
  return next;
}

async function readActivity(now = Date.now()): Promise<ActivityData> {
  const stored = await chrome.storage.local.get([ACTIVITY_DATA_KEY]);
  const normalized = normalizeActivityData(stored[ACTIVITY_DATA_KEY]);
  const compacted = compactActivityData(normalized, now);
  if (JSON.stringify(compacted) !== JSON.stringify(normalized)) {
    await chrome.storage.local.set({ [ACTIVITY_DATA_KEY]: compacted });
  }
  return compacted;
}

async function writeActivity(data: ActivityData): Promise<void> {
  await chrome.storage.local.set({ [ACTIVITY_DATA_KEY]: normalizeActivityData(data) });
}

function normalizePageState(value: unknown): PageActivityState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PageActivityState = {};
  for (const [tabId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Partial<PageActivity>;
    if (typeof item.token !== "string" || !Array.isArray(item.seen)) continue;
    result[tabId] = {
      token: item.token.slice(0, 120),
      seen: item.seen.filter((entry): entry is string => typeof entry === "string").slice(-5_000),
    };
  }
  return result;
}

async function readPageState(): Promise<PageActivityState> {
  const stored = await chrome.storage.session.get([PAGE_ACTIVITY_KEY]);
  return normalizePageState(stored[PAGE_ACTIVITY_KEY]);
}

async function setBadge(tabId: number, count: number): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: count === 0 ? "" : count > 999 ? "999+" : String(count) });
}

async function countPageEvent(tabId: number, pageToken: string, id: string): Promise<number> {
  const state = await readPageState();
  const key = String(tabId);
  const current = state[key]?.token === pageToken ? state[key]! : { token: pageToken, seen: [] };
  if (!current.seen.includes(id)) current.seen.push(id);
  state[key] = current;
  await chrome.storage.session.set({ [PAGE_ACTIVITY_KEY]: state });
  await setBadge(tabId, current.seen.length);
  return current.seen.length;
}

export function resetPageActivity(tabId: number, pageToken: string): Promise<void> {
  return enqueue(async () => {
    const state = await readPageState();
    state[String(tabId)] = { token: pageToken.slice(0, 120), seen: [] };
    await chrome.storage.session.set({ [PAGE_ACTIVITY_KEY]: state });
    await setBadge(tabId, 0);
  });
}

export function forgetPageActivity(tabId: number): Promise<void> {
  return enqueue(async () => {
    const state = await readPageState();
    delete state[String(tabId)];
    await chrome.storage.session.set({ [PAGE_ACTIVITY_KEY]: state });
  });
}

export function recordFilterEvent(
  input: RecordFilterEventInput,
  now = Date.now(),
): Promise<{ eventId: string; added: boolean; pageCount: number }> {
  return enqueue(async () => {
    const post = sanitizePost(input.post);
    if (!post) throw new Error("无效的过滤事件。");
    const id = await eventId(post);
    const data = await readActivity(now);
    const added = !data.events.some((event) => event.id === id);
    if (added) {
      const event: ActivityEvent = {
        id,
        contentId: post.id,
        day: localDayKey(now),
        filteredAt: now,
        updatedAt: now,
        deviceId: await deviceId(),
        surface: input.surface,
        status: "filtered",
        author: post.author,
        preview: post.text,
        url: post.url,
        mediaType: post.mediaType,
        policyId: input.policyId?.slice(0, 80),
        policyName: input.policyName?.slice(0, 80),
      };
      await writeActivity({ ...data, events: [event, ...data.events] });
    }
    const pageCount = await countPageEvent(input.tabId, input.pageToken.slice(0, 120), id);
    return { eventId: id, added, pageCount };
  });
}

export function markActivityStatus(
  id: string,
  status: Exclude<ActivityStatus, "filtered">,
  now = Date.now(),
): Promise<boolean> {
  return enqueue(async () => {
    const data = await readActivity(now);
    const index = data.events.findIndex((event) => event.id === id);
    if (index < 0) return false;
    const current = data.events[index]!;
    if (current.status === "incorrect" || current.status === status) return true;
    const next = [...data.events];
    next[index] = { ...current, status, updatedAt: now, deviceId: await deviceId() };
    await writeActivity({ ...data, events: next });
    return true;
  });
}

export function getActivitySnapshot(
  now = Date.now(),
): Promise<{ activity: ActivityData; summary: ReturnType<typeof activitySummary> }> {
  return enqueue(async () => {
    const activity = await readActivity(now);
    return { activity, summary: activitySummary(activity, now) };
  });
}

export function clearActivity(now = Date.now()): Promise<ActivityData> {
  return enqueue(async () => {
    const activity = normalizeActivityData({ schemaVersion: 1, clearedAt: now, archivedByDevice: {}, events: [] });
    await writeActivity(activity);
    const state = await readPageState();
    await Promise.all(Object.keys(state).map((tabId) => setBadge(Number(tabId), 0)));
    await chrome.storage.session.set({ [PAGE_ACTIVITY_KEY]: {} });
    return activity;
  });
}

export async function initializeActivityTracking(): Promise<void> {
  await Promise.all([chrome.action.setBadgeBackgroundColor({ color: "#0a7776" }), getActivitySnapshot()]);
}

export function resetActivityServiceForTests(): void {
  mutationChain = Promise.resolve();
}

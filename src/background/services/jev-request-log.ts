import {
  EMPTY_JEV_REQUEST_LOG,
  JEV_REQUEST_LOG_KEY,
  normalizeJevRequestLogData,
  type JevRequestLogData,
  type JevRequestLogEntry,
} from "../../shared";

let mutationChain: Promise<unknown> = Promise.resolve();
const MAINTENANCE_ALARM = "jev-request-log-maintenance";
const MAINTENANCE_INTERVAL_MINUTES = 24 * 60;

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const task = mutationChain.then(operation, operation);
  mutationChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function getJevRequestLog(now = Date.now()): Promise<JevRequestLogData> {
  return enqueue(async () => {
    const stored = await chrome.storage.local.get([JEV_REQUEST_LOG_KEY]);
    const raw = stored[JEV_REQUEST_LOG_KEY];
    const normalized = normalizeJevRequestLogData(raw, now);
    if (JSON.stringify(normalized) !== JSON.stringify(raw)) {
      await chrome.storage.local.set({ [JEV_REQUEST_LOG_KEY]: normalized });
    }
    return normalized;
  });
}

export function recordJevRequest(entry: Omit<JevRequestLogEntry, "id">, now = Date.now()): Promise<JevRequestLogData> {
  return enqueue(async () => {
    const stored = await chrome.storage.local.get([JEV_REQUEST_LOG_KEY]);
    const current = normalizeJevRequestLogData(stored[JEV_REQUEST_LOG_KEY], now);
    const id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${entry.requestedAt}-${Math.random().toString(36).slice(2)}`;
    const next = normalizeJevRequestLogData({ schemaVersion: 1, entries: [{ id, ...entry }, ...current.entries] }, now);
    await chrome.storage.local.set({ [JEV_REQUEST_LOG_KEY]: next });
    return next;
  });
}

export function clearJevRequestLog(): Promise<JevRequestLogData> {
  return enqueue(async () => {
    await chrome.storage.local.set({ [JEV_REQUEST_LOG_KEY]: EMPTY_JEV_REQUEST_LOG });
    return EMPTY_JEV_REQUEST_LOG;
  });
}

function requestMaintenance(): void {
  void getJevRequestLog().catch((error) => {
    console.warn("[XFlow] Jev request log maintenance failed.", error);
  });
}

export async function initializeJevRequestLogMaintenance(): Promise<void> {
  chrome.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: MAINTENANCE_INTERVAL_MINUTES });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === MAINTENANCE_ALARM) requestMaintenance();
  });
  chrome.runtime.onStartup.addListener(requestMaintenance);
  try {
    await getJevRequestLog();
  } catch (error) {
    console.warn("[XFlow] Initial Jev request log maintenance failed.", error);
  }
}

export function resetJevRequestLogServiceForTests(): void {
  mutationChain = Promise.resolve();
}

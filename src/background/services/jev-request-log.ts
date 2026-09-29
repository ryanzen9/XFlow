import {
  EMPTY_JEV_REQUEST_LOG,
  JEV_REQUEST_LOG_KEY,
  normalizeJevRequestLogData,
  type JevRequestLogData,
  type JevRequestLogEntry,
} from "../../shared";

let mutationChain: Promise<unknown> = Promise.resolve();

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

export function resetJevRequestLogServiceForTests(): void {
  mutationChain = Promise.resolve();
}

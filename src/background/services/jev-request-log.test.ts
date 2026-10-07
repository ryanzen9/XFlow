import { afterAll, beforeEach, expect, test } from "bun:test";
import { JEV_REQUEST_LOG_KEY } from "../../shared";
import { initializeJevRequestLogMaintenance, resetJevRequestLogServiceForTests } from "./jev-request-log";

const originalChrome = globalThis.chrome;
let storage: Record<string, unknown>;
let alarmListener: ((alarm: chrome.alarms.Alarm) => void) | undefined;
let createdAlarm: { name: string; info: chrome.alarms.AlarmCreateInfo } | undefined;

function logData(requestedAt: number) {
  return {
    schemaVersion: 1,
    entries: [
      {
        id: `request-${requestedAt}`,
        kind: "review",
        requestedAt,
        durationMs: 12,
        providerId: "openrouter",
        modelId: "typesafe/jev-1.13",
        status: "success",
        itemCount: 1,
        questionCount: 1,
      },
    ],
  };
}

beforeEach(() => {
  storage = { [JEV_REQUEST_LOG_KEY]: logData(Date.now() - 31 * 24 * 60 * 60 * 1_000) };
  alarmListener = undefined;
  createdAlarm = undefined;
  resetJevRequestLogServiceForTests();
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, storage[key]])),
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
      },
    },
    alarms: {
      create: (name: string, info: chrome.alarms.AlarmCreateInfo) => {
        createdAlarm = { name, info };
      },
      onAlarm: {
        addListener: (listener: (alarm: chrome.alarms.Alarm) => void) => {
          alarmListener = listener;
        },
      },
    },
    runtime: { onStartup: { addListener: () => undefined } },
  } as unknown as typeof chrome;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
});

test("prunes expired request logs on startup and schedules daily maintenance", async () => {
  await initializeJevRequestLogMaintenance();

  expect(storage[JEV_REQUEST_LOG_KEY]).toEqual({ schemaVersion: 1, entries: [] });
  expect(createdAlarm).toEqual({
    name: "jev-request-log-maintenance",
    info: { periodInMinutes: 24 * 60 },
  });

  storage[JEV_REQUEST_LOG_KEY] = logData(Date.now() - 31 * 24 * 60 * 60 * 1_000);
  alarmListener?.({ name: "jev-request-log-maintenance" } as chrome.alarms.Alarm);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(storage[JEV_REQUEST_LOG_KEY]).toEqual({ schemaVersion: 1, entries: [] });
});

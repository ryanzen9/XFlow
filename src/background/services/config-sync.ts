import {
  CONFIG_VERSION_KEY,
  S3_SYNC_KEY,
  isS3Configured,
  readS3SyncSettings,
  synchronizeWithS3,
  type SyncResult,
} from "../../shared";

const SYNC_ALARM = "xfilter-config-sync";
const SYNC_INTERVAL_MINUTES = 15;

let initialized = false;
let running: Promise<void> | null = null;
let queued = false;

export async function runAutomaticSync(): Promise<SyncResult | null> {
  const settings = await readS3SyncSettings();
  if (!settings.autoSyncEnabled || !isS3Configured(settings)) return null;
  return synchronizeWithS3(settings, { allowPermissionRequest: false });
}

export function requestAutomaticSync(): Promise<void> {
  if (running) {
    queued = true;
    return running;
  }

  running = (async () => {
    do {
      queued = false;
      try {
        await runAutomaticSync();
      } catch (error) {
        console.warn("XFilter automatic configuration sync failed.", error);
      }
    } while (queued);
  })().finally(() => {
    running = null;
  });

  return running;
}

export function initializeAutomaticSync(): void {
  if (initialized) return;
  initialized = true;

  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) void requestAutomaticSync();
  });
  chrome.runtime.onStartup.addListener(() => {
    void requestAutomaticSync();
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (CONFIG_VERSION_KEY in changes || S3_SYNC_KEY in changes) void requestAutomaticSync();
  });
}

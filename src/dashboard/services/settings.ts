import { normalizeSettings, writeVersionedSettings, type AppSettings } from "../../shared";

export async function loadDashboardSettings(): Promise<AppSettings> {
  return normalizeSettings(await chrome.storage.local.get(null));
}

export async function saveDashboardSettings(patch: Partial<AppSettings>): Promise<void> {
  await writeVersionedSettings(patch);
}

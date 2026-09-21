import {
  CONFIG_UPDATED_AT_KEY,
  CONFIG_VERSION_KEY,
  normalizeSettings,
  writeVersionedSettings,
  type AppSettings,
} from "../../shared";
import { migrateLegacyApiKey } from "./provider-secrets";

export type ExtensionSettings = AppSettings;

export async function getSettings(): Promise<ExtensionSettings> {
  return normalizeSettings(await chrome.storage.local.get(null));
}

export async function initializeSettings(): Promise<void> {
  await migrateLegacyApiKey();
  const current = await chrome.storage.local.get([
    "enabled",
    "commentsEnabled",
    "theme",
    "activeProvider",
    CONFIG_VERSION_KEY,
    CONFIG_UPDATED_AT_KEY,
  ]);
  const defaults: Partial<ExtensionSettings> = {};
  if (typeof current.enabled !== "boolean") defaults.enabled = true;
  if (typeof current.commentsEnabled !== "boolean") defaults.commentsEnabled = false;
  if (current.theme !== "light" && current.theme !== "dark") defaults.theme = "light";
  if (
    current.activeProvider !== "openrouter" &&
    current.activeProvider !== "vercel-ai-gateway" &&
    current.activeProvider !== "typesafe"
  ) {
    defaults.activeProvider = "openrouter";
  }
  if (Object.keys(defaults).length > 0) {
    await writeVersionedSettings(defaults);
  } else if (typeof current[CONFIG_VERSION_KEY] !== "number") {
    await chrome.storage.local.set({ [CONFIG_VERSION_KEY]: 1, [CONFIG_UPDATED_AT_KEY]: new Date().toISOString() });
  }
}

import type { AppSettings } from "../../shared";
import { getProviderSecrets } from "./provider-secrets";
import { getSettings } from "./settings";

const publicSettings = (settings: AppSettings, providerConfigured: boolean) => ({
  enabled: settings.enabled,
  commentsEnabled: settings.commentsEnabled,
  theme: settings.theme,
  activeProvider: settings.activeProvider,
  modelNickname: settings.modelNickname,
  strategies: settings.strategies,
  providerConfigured,
});

export async function publishPublicSettings(): Promise<void> {
  const [settings, secrets] = await Promise.all([getSettings(), getProviderSecrets()]);
  await chrome.storage.session.set(publicSettings(settings, Boolean(secrets[settings.activeProvider])));
}

export async function initializeStorageAccess(): Promise<void> {
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
  await publishPublicSettings();
}

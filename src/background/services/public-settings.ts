import { KNOWLEDGE_REVISION_KEY, type AppSettings } from "../../shared";
import { getProviderSecrets } from "./provider-secrets";
import { getSettings } from "./settings";

const publicSettings = (settings: AppSettings, providerConfigured: boolean, decisionKnowledgeRevision: string) => ({
  enabled: settings.enabled,
  commentsEnabled: settings.commentsEnabled,
  theme: settings.theme,
  activeProvider: settings.activeProvider,
  modelNickname: settings.modelNickname,
  strategies: settings.strategies,
  providerConfigured,
  decisionKnowledgeRevision,
});

export async function publishPublicSettings(): Promise<void> {
  const [settings, secrets, stored] = await Promise.all([
    getSettings(),
    getProviderSecrets(),
    chrome.storage.local.get([KNOWLEDGE_REVISION_KEY]),
  ]);
  const revision = stored[KNOWLEDGE_REVISION_KEY];
  const decisionKnowledgeRevision =
    typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 0 ? String(revision) : "0";
  await chrome.storage.session.set(
    publicSettings(settings, Boolean(secrets[settings.activeProvider]), decisionKnowledgeRevision),
  );
}

export async function initializeStorageAccess(): Promise<void> {
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
  await publishPublicSettings();
}

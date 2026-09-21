import { USER_KNOWLEDGE_KEY, type AppSettings } from "../../shared";
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
    chrome.storage.local.get([USER_KNOWLEDGE_KEY]),
  ]);
  const rawKnowledge = stored[USER_KNOWLEDGE_KEY] as { userDecisions?: Array<{ updatedAt?: unknown }> } | undefined;
  const decisions = Array.isArray(rawKnowledge?.userDecisions) ? rawKnowledge.userDecisions : [];
  const latestUpdate = Math.max(
    0,
    ...decisions.map(({ updatedAt }) => (typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : 0)),
  );
  await chrome.storage.session.set(
    publicSettings(settings, Boolean(secrets[settings.activeProvider]), `${decisions.length}:${latestUpdate}`),
  );
}

export async function initializeStorageAccess(): Promise<void> {
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
  await publishPublicSettings();
}

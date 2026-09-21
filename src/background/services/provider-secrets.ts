import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  PROVIDER_IDS,
  PROVIDER_SECRETS_KEY,
  normalizeProviderSecrets,
  providerKeyHint,
  type ProviderId,
  type ProviderSecrets,
  type ProviderSummary,
} from "../../shared";

export async function migrateLegacyApiKey(): Promise<void> {
  const stored = await chrome.storage.local.get(["apiKey", PROVIDER_SECRETS_KEY]);
  const legacyKey = typeof stored.apiKey === "string" ? stored.apiKey.trim() : "";
  const secrets = normalizeProviderSecrets(stored[PROVIDER_SECRETS_KEY]);

  if (legacyKey && !secrets.openrouter) {
    secrets.openrouter = legacyKey;
    await chrome.storage.local.set({ [PROVIDER_SECRETS_KEY]: secrets });
  }
  if (typeof stored.apiKey === "string") await chrome.storage.local.remove("apiKey");
}

export async function getProviderSecrets(): Promise<ProviderSecrets> {
  await migrateLegacyApiKey();
  const stored = await chrome.storage.local.get([PROVIDER_SECRETS_KEY]);
  return normalizeProviderSecrets(stored[PROVIDER_SECRETS_KEY]);
}

export async function saveProviderKey(providerId: ProviderId, apiKey: string): Promise<void> {
  const secrets = await getProviderSecrets();
  await chrome.storage.local.set({
    [PROVIDER_SECRETS_KEY]: { ...secrets, [providerId]: apiKey.trim() },
  });
}

export async function clearProviderKey(providerId: ProviderId): Promise<void> {
  await saveProviderKey(providerId, "");
}

export async function getProviderSummaries(activeProvider: ProviderId = DEFAULT_PROVIDER): Promise<ProviderSummary[]> {
  const secrets = await getProviderSecrets();
  return PROVIDER_IDS.map((id) => ({
    ...PROVIDERS[id],
    configured: Boolean(secrets[id]),
    keyHint: providerKeyHint(secrets[id]),
    active: id === activeProvider,
  }));
}

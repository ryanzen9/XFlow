import {
  PROVIDERS,
  normalizeSettings,
  writeVersionedSettings,
  type ExtensionResponse,
  type ProviderId,
  type Theme,
} from "../../shared";

export interface PopupSettings {
  enabled: boolean;
  commentsEnabled: boolean;
  theme: Theme;
  activeProvider: ProviderId;
  providerName: string;
  modelId: string;
  configured: boolean;
}

export async function loadSettings(): Promise<PopupSettings> {
  const settings = normalizeSettings(await chrome.storage.local.get(null));
  const fallback = PROVIDERS[settings.activeProvider];
  try {
    const status = (await chrome.runtime.sendMessage({ type: "GET_STATUS" })) as ExtensionResponse;
    if (status.ok && "configured" in status) {
      return {
        enabled: status.enabled,
        commentsEnabled: status.commentsEnabled,
        theme: settings.theme,
        activeProvider: status.activeProvider,
        providerName: status.providerName,
        modelId: status.modelId,
        configured: status.configured,
      };
    }
  } catch {
    // The service worker can be restarting; the popup still renders local settings.
  }
  return {
    enabled: settings.enabled,
    commentsEnabled: settings.commentsEnabled,
    theme: settings.theme,
    activeProvider: settings.activeProvider,
    providerName: fallback.label,
    modelId: fallback.modelId,
    configured: false,
  };
}

export async function saveEnabled(enabled: boolean): Promise<void> {
  await writeVersionedSettings({ enabled });
}

export async function saveCommentsEnabled(commentsEnabled: boolean): Promise<void> {
  await writeVersionedSettings({ commentsEnabled });
}

export async function saveTheme(theme: Theme): Promise<void> {
  await writeVersionedSettings({ theme });
}

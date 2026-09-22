import { useEffect, useState } from "react";
import { PROVIDERS, PROVIDER_SECRETS_KEY, type ProviderId, type Theme } from "../../shared";
import { applyTheme } from "../../ui/theme";
import { useI18n } from "../../ui/i18n";
import { loadSettings, saveCommentsEnabled, saveEnabled, saveTheme } from "../services/settings";

export type StatusTone = "idle" | "success" | "error";

export interface FormStatus {
  message: string;
  tone: StatusTone;
}

export function useSettingsForm() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [activeProvider, setActiveProvider] = useState<ProviderId>("openrouter");
  const [providerName, setProviderName] = useState(PROVIDERS.openrouter.label);
  const [modelId, setModelId] = useState(PROVIDERS.openrouter.modelId);
  const [configured, setConfigured] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [enabledPending, setEnabledPending] = useState(false);
  const [commentsEnabledPending, setCommentsEnabledPending] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ message: "", tone: "idle" });

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const settings = await loadSettings();
      if (!mounted) return;
      setEnabled(settings.enabled);
      setCommentsEnabled(settings.commentsEnabled);
      setTheme(settings.theme);
      setActiveProvider(settings.activeProvider);
      setProviderName(settings.providerName);
      setModelId(settings.modelId);
      setConfigured(settings.configured);
      applyTheme(settings.theme);
      setSettingsReady(true);
    };
    void refresh();

    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      if (typeof changes.enabled?.newValue === "boolean") setEnabled(changes.enabled.newValue);
      if (typeof changes.commentsEnabled?.newValue === "boolean") setCommentsEnabled(changes.commentsEnabled.newValue);
      if (changes.theme?.newValue === "light" || changes.theme?.newValue === "dark") {
        setTheme(changes.theme.newValue);
        applyTheme(changes.theme.newValue);
      }
      if (changes.activeProvider || changes[PROVIDER_SECRETS_KEY]) void refresh();
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const updateEnabled = async (nextEnabled: boolean) => {
    if (!settingsReady || enabledPending || nextEnabled === enabled) return;
    const previousEnabled = enabled;
    setEnabled(nextEnabled);
    setEnabledPending(true);
    setStatus({ message: t(nextEnabled ? "popup.timelineEnabling" : "popup.timelineRestoring"), tone: "idle" });
    try {
      await saveEnabled(nextEnabled);
      setStatus({
        message: t(nextEnabled ? "popup.timelineEnabled" : "popup.timelinePaused"),
        tone: "success",
      });
    } catch {
      setEnabled(previousEnabled);
      setStatus({ message: t("popup.switchFailed"), tone: "error" });
    } finally {
      setEnabledPending(false);
    }
  };

  const updateCommentsEnabled = async (nextEnabled: boolean) => {
    if (!settingsReady || commentsEnabledPending || nextEnabled === commentsEnabled) return;
    const previousEnabled = commentsEnabled;
    setCommentsEnabled(nextEnabled);
    setCommentsEnabledPending(true);
    setStatus({ message: t(nextEnabled ? "popup.commentsEnabling" : "popup.commentsRestoring"), tone: "idle" });
    try {
      await saveCommentsEnabled(nextEnabled);
      setStatus({
        message: t(nextEnabled ? "popup.commentsEnabled" : "popup.commentsPaused"),
        tone: "success",
      });
    } catch {
      setCommentsEnabled(previousEnabled);
      setStatus({ message: t("popup.switchFailed"), tone: "error" });
    } finally {
      setCommentsEnabledPending(false);
    }
  };

  const updateTheme = async (nextTheme: Theme) => {
    const previous = theme;
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      await saveTheme(nextTheme);
      setStatus({
        message: t("popup.themeChanged", { theme: t(nextTheme === "dark" ? "theme.dark" : "theme.light") }),
        tone: "success",
      });
    } catch {
      setTheme(previous);
      applyTheme(previous);
      setStatus({ message: t("popup.themeFailed"), tone: "error" });
    }
  };

  return {
    enabled,
    commentsEnabled,
    theme,
    activeProvider,
    providerName,
    modelId,
    configured,
    settingsReady,
    enabledPending,
    commentsEnabledPending,
    status,
    setEnabled: updateEnabled,
    setCommentsEnabled: updateCommentsEnabled,
    setTheme: updateTheme,
  };
}

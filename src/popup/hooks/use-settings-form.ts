import { useEffect, useState } from "react";
import { PROVIDERS, PROVIDER_SECRETS_KEY, type ProviderId, type Theme } from "../../shared";
import { applyTheme } from "../../ui/theme";
import { loadSettings, saveCommentsEnabled, saveEnabled, saveTheme } from "../services/settings";

export type StatusTone = "idle" | "success" | "error";

export interface FormStatus {
  message: string;
  tone: StatusTone;
}

export function useSettingsForm() {
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
    setStatus({ message: nextEnabled ? "正在启用时间线过滤…" : "正在恢复被遮蔽的博文…", tone: "idle" });
    try {
      await saveEnabled(nextEnabled);
      setStatus({
        message: nextEnabled ? "时间线过滤已实时启用。" : "时间线过滤已暂停，博文正在恢复可见。",
        tone: "success",
      });
    } catch {
      setEnabled(previousEnabled);
      setStatus({ message: "切换失败，请重试。", tone: "error" });
    } finally {
      setEnabledPending(false);
    }
  };

  const updateCommentsEnabled = async (nextEnabled: boolean) => {
    if (!settingsReady || commentsEnabledPending || nextEnabled === commentsEnabled) return;
    const previousEnabled = commentsEnabled;
    setCommentsEnabled(nextEnabled);
    setCommentsEnabledPending(true);
    setStatus({ message: nextEnabled ? "正在启用评论区过滤…" : "正在恢复被遮蔽的评论…", tone: "idle" });
    try {
      await saveCommentsEnabled(nextEnabled);
      setStatus({
        message: nextEnabled ? "评论区过滤已实时启用。" : "评论区过滤已暂停，评论正在恢复可见。",
        tone: "success",
      });
    } catch {
      setCommentsEnabled(previousEnabled);
      setStatus({ message: "切换失败，请重试。", tone: "error" });
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
      setStatus({ message: `已切换为${nextTheme === "dark" ? "深色" : "浅色"}主题。`, tone: "success" });
    } catch {
      setTheme(previous);
      applyTheme(previous);
      setStatus({ message: "主题切换失败，请重试。", tone: "error" });
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

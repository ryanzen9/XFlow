import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSettings, type AppSettings } from "../../shared";
import { loadDashboardSettings, saveDashboardSettings } from "../services/settings";
import { useI18n } from "../../ui/i18n";

export function useDashboard() {
  const { t } = useI18n();
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const savedRef = useRef<AppSettings | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [status, setStatus] = useState({ message: "", error: false });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const settings = await loadDashboardSettings();
        if (!live) return;
        savedRef.current = settings;
        setSaved(settings);
        setDraft(settings);
      } catch {
        if (live) setLoadFailed(true);
      }
    })();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local" || !savedRef.current) return;
      const previous = savedRef.current;
      const patch = Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue]));
      const next = normalizeSettings({ ...previous, ...patch });
      savedRef.current = next;
      setSaved(next);
      setDraft((current) => {
        if (!current) return next;
        const merged = { ...current };
        for (const key of Object.keys(next) as (keyof AppSettings)[]) {
          if (
            JSON.stringify(current[key]) === JSON.stringify(previous[key]) ||
            key === "enabled" ||
            key === "commentsEnabled"
          ) {
            Object.assign(merged, { [key]: next[key] });
          }
        }
        return merged;
      });
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<AppSettings>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setStatus({ message: "", error: false });
  };

  const reload = useCallback(async () => {
    const next = await loadDashboardSettings();
    savedRef.current = next;
    setSaved(next);
    setDraft(next);
    setStatus({ message: "", error: false });
  }, []);

  const save = async (patch: Partial<AppSettings>, message = t("status.saved")) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      await saveDashboardSettings(patch);
      const next = normalizeSettings({ ...savedRef.current, ...patch });
      savedRef.current = next;
      setSaved(next);
      setDraft((current) => (current ? { ...current, ...patch } : next));
      setStatus({ message, error: false });
      return true;
    } catch {
      setStatus({ message: t("status.saveFailed"), error: true });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const toggle = (key: "enabled" | "commentsEnabled", value: boolean) =>
    save(
      { [key]: value },
      t("status.filterChanged", {
        surface: key === "enabled" ? "Home" : t("general.comments"),
        state: value ? t("common.enabled") : t("popup.paused"),
      }),
    );

  return { saved, draft, busy, dirty, status, loadFailed, update, save, toggle, reload, setStatus };
}

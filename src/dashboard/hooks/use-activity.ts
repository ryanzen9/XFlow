import { useEffect, useState } from "react";
import { ACTIVITY_DATA_KEY, normalizeActivityData, type ActivityData, type ExtensionResponse } from "../../shared";
import { useI18n } from "../../ui/i18n";

async function send(message: unknown): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

export function useActivity() {
  const { t } = useI18n();
  const [data, setData] = useState<ActivityData>(() => normalizeActivityData(null));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const stored = await chrome.storage.local.get([ACTIVITY_DATA_KEY]);
        if (!live) return;
        setData(normalizeActivityData(stored[ACTIVITY_DATA_KEY]));
        setLoading(false);
      } catch {
        if (!live) return;
        setError(t("activity.readError"));
        setLoading(false);
      }
    })();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "local" && changes[ACTIVITY_DATA_KEY]) {
        setData(normalizeActivityData(changes[ACTIVITY_DATA_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      live = false;
      window.clearInterval(clock);
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, [t]);

  const markIncorrect = async (eventId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await send({ type: "MARK_ACTIVITY_STATUS", eventId, status: "incorrect" });
      if (!response.ok) throw new Error(response.error);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("activity.updateError"));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await send({ type: "CLEAR_ACTIVITY_DATA" });
      if (!response.ok) throw new Error(response.error);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("activity.clearError"));
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  return { data, loading, busy, error, now, markIncorrect, clear };
}

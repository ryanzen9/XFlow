import { useEffect, useState } from "react";
import {
  JEV_REQUEST_LOG_KEY,
  normalizeJevRequestLogData,
  type ExtensionResponse,
  type JevRequestLogData,
} from "../../shared";
import { useI18n } from "../../ui/i18n";

async function send(message: unknown): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

export function useJevRequestLog() {
  const { t } = useI18n();
  const [data, setData] = useState<JevRequestLogData>(() => normalizeJevRequestLogData(null));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const response = await send({ type: "GET_JEV_REQUEST_LOG" });
        if (!response.ok || !("requestLog" in response)) throw new Error("request-log");
        if (live) setData(normalizeJevRequestLogData(response.requestLog));
      } catch {
        if (live) setError(t("jevLog.readError"));
      } finally {
        if (live) setLoading(false);
      }
    })();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "local" && changes[JEV_REQUEST_LOG_KEY]) {
        setData(normalizeJevRequestLogData(changes[JEV_REQUEST_LOG_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, [t]);

  const clear = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await send({ type: "CLEAR_JEV_REQUEST_LOG" });
      if (!response.ok || !("requestLog" in response)) throw new Error("request-log");
      setData(normalizeJevRequestLogData(response.requestLog));
    } catch (reason) {
      setError(t("jevLog.clearError"));
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  return { data, loading, busy, error, clear };
}

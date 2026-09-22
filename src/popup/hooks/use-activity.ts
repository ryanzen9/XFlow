import { useEffect, useState } from "react";
import { ACTIVITY_DATA_KEY, activitySummary, normalizeActivityData, type ActivitySummary } from "../../shared";

export function useActivity(): ActivitySummary {
  const [summary, setSummary] = useState<ActivitySummary>({ today: 0, allTime: 0 });

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const stored = await chrome.storage.local.get([ACTIVITY_DATA_KEY]);
      if (live) setSummary(activitySummary(normalizeActivityData(stored[ACTIVITY_DATA_KEY])));
    };
    void refresh();
    const handleChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local" || !changes[ACTIVITY_DATA_KEY]) return;
      setSummary(activitySummary(normalizeActivityData(changes[ACTIVITY_DATA_KEY].newValue)));
    };
    chrome.storage.onChanged.addListener(handleChange);
    const midnightRefresh = window.setInterval(() => void refresh(), 60_000);
    return () => {
      live = false;
      window.clearInterval(midnightRefresh);
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  return summary;
}

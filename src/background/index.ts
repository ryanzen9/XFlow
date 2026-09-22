import { handleMessage } from "./message-handler";
import { initializeAutomaticSync, requestAutomaticSync } from "./services/config-sync";
import { initializeSettings } from "./services/settings";
import { initializeStorageAccess, publishPublicSettings } from "./services/public-settings";
import { forgetPageActivity, initializeActivityTracking } from "./services/activity";

initializeAutomaticSync();
void initializeStorageAccess();
void initializeActivityTracking();

chrome.runtime.onInstalled.addListener(() => {
  void initializeSettings().then(() => requestAutomaticSync());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => handleMessage(message, sender, sendResponse));

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") void publishPublicSettings();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void forgetPageActivity(tabId);
});

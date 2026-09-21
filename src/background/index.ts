import { handleMessage } from "./message-handler";
import { initializeAutomaticSync, requestAutomaticSync } from "./services/config-sync";
import { initializeSettings } from "./services/settings";
import { initializeStorageAccess, publishPublicSettings } from "./services/public-settings";

initializeAutomaticSync();
void initializeStorageAccess();

chrome.runtime.onInstalled.addListener(() => {
  void initializeSettings().then(() => requestAutomaticSync());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => handleMessage(message, sender, sendResponse));

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") void publishPublicSettings();
});

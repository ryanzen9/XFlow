import type { Theme } from "../shared";

let currentMode: Theme = "light";
const listeners = new Set<() => void>();

export function getThemeMode(): Theme {
  return currentMode;
}

export function subscribeThemeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemeMode(mode: Theme): void {
  if (mode === currentMode) return;
  currentMode = mode;
  for (const listener of listeners) listener();
}

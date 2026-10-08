import { Theme } from "@astryxdesign/core/theme";
import { useSyncExternalStore, type ReactNode } from "react";
import { neutralTheme } from "../themes/neutral/neutral";
import { getThemeMode, subscribeThemeMode } from "./theme-mode";

export function AstryxThemeRoot({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode, () => "light" as const);
  return (
    <Theme theme={neutralTheme} mode={mode}>
      {children}
    </Theme>
  );
}

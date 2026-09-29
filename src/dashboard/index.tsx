import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeLocale } from "../ui/i18n";
import { initializeTheme } from "../ui/theme";
import { AstryxThemeRoot } from "../ui/AstryxThemeRoot";

await Promise.all([initializeTheme(), initializeLocale()]);

createRoot(document.getElementById("root")!).render(
  <AstryxThemeRoot>
    <App />
  </AstryxThemeRoot>,
);

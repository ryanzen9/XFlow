import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeLocale } from "../ui/i18n";
import { initializeTheme } from "../ui/theme";

await Promise.all([initializeTheme(), initializeLocale()]);

const container = document.querySelector("#root");
if (!container) throw new Error("XFlow popup root is missing.");

createRoot(container).render(<App />);

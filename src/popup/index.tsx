import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeTheme } from "../ui/theme";

await initializeTheme();

const container = document.querySelector("#root");
if (!container) throw new Error("XFlow popup root is missing.");

createRoot(container).render(<App />);

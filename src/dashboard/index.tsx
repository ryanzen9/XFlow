import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeTheme } from "../ui/theme";

await initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);

import { hydrateRoot } from "react-dom/client";
import SiteApp, { type SitePage } from "./app";

const root = document.getElementById("root");
const page = root?.dataset.page;

if (root && (page === "home" || page === "privacy-zh" || page === "privacy-en")) {
  hydrateRoot(root, <SiteApp page={page as SitePage} />);
}

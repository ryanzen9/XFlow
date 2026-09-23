import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");

await copyFile(resolve(repositoryRoot, "src/styles/token.css"), resolve(repositoryRoot, "site/assets/tokens.css"));

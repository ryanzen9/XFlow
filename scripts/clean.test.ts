import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanGeneratedFiles } from "./clean";

test("cleanup keeps release evidence, referenced assets and independent workspaces", async () => {
  const root = await mkdtemp(join(tmpdir(), "xflow-clean-"));
  try {
    const retained = [
      "output/release/xflow-0.1.1.zip",
      "output/release/xflow-0.1.1.zip.sha256",
      "output/release/xflow-0.1.1.zip.files.txt",
      "output/previews/0.1.1/xflow-0.1.1-store-previews.zip",
      "output/previews/0.1.1/manifest.json",
      "output/previews/0.1.1/01-popup.png",
      "docs/assets/popup-dark.webp",
      "workspace/other-task/uncommitted.ts",
      "node_modules/installed-package/index.js",
    ];
    const disposable = [
      "dist/popup.js",
      "site-dist/index.html",
      "coverage/report.html",
      ".playwright-cli/test.log",
      ".cache/browser/state.json",
      "output/previews/0.1.1/popup-dark.png",
      "output/previews/0.1.1/store/01-popup.png",
      "output/.DS_Store",
    ];
    for (const name of [...retained, ...disposable]) await Bun.write(join(root, name), name);
    await cleanGeneratedFiles(root);
    for (const name of retained) expect(await Bun.file(join(root, name)).text()).toBe(name);
    for (const name of disposable) expect(await Bun.file(join(root, name)).exists()).toBe(false);
    expect(await cleanGeneratedFiles(root)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup does not traverse linked output or build directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "xflow-clean-"));
  const external = await mkdtemp(join(tmpdir(), "xflow-clean-external-"));
  try {
    await mkdir(join(external, "previews/0.1.1"), { recursive: true });
    await Bun.write(join(external, "previews/0.1.1/keep.png"), "other workspace");
    await symlink(external, join(root, "output"));
    await symlink(external, join(root, "dist"));
    await cleanGeneratedFiles(root);
    expect(await Bun.file(join(external, "previews/0.1.1/keep.png")).text()).toBe("other workspace");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(external, { recursive: true, force: true });
  }
});

import { lstat, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const generatedDirectories = ["dist", "site-dist", "coverage", ".playwright-cli", ".cache"];

/** Remove disposable output; retain release archives, preview archives and their manifest. */
export async function cleanGeneratedFiles(root: string): Promise<string[]> {
  const removed: string[] = [];
  for (const name of generatedDirectories) {
    const path = resolve(root, name);
    if (!(await lstat(path).catch(() => null))) continue;
    // rm removes a symlink itself, without following its target.
    await rm(path, { recursive: true, force: true });
    removed.push(name);
  }

  const output = resolve(root, "output");
  const previews = resolve(output, "previews");
  if ((await lstat(output).catch(() => null))?.isSymbolicLink()) return removed;
  if ((await lstat(previews).catch(() => null))?.isSymbolicLink()) return removed;
  for (const version of await readdir(previews, { withFileTypes: true }).catch(() => [])) {
    if (!version.isDirectory() || !/^\d+(?:\.\d+){1,3}$/.test(version.name)) continue;
    const directory = resolve(previews, version.name);
    const retained = new Set(["manifest.json", "01-popup.png", `xflow-${version.name}-store-previews.zip`]);
    for (const entry of await readdir(directory)) {
      if (retained.has(entry)) continue;
      await rm(resolve(directory, entry), { recursive: true, force: true });
      removed.push(`output/previews/${version.name}/${entry}`);
    }
  }
  for (const name of ["output/.DS_Store", ".DS_Store"]) {
    if (name.startsWith("output/") && (await lstat(output).catch(() => null))?.isSymbolicLink()) continue;
    const path = resolve(root, name);
    if (!(await lstat(path).catch(() => null))) continue;
    await rm(path, { force: true });
    removed.push(name);
  }
  return removed;
}

if (import.meta.main) {
  const removed = await cleanGeneratedFiles(resolve(import.meta.dir, ".."));
  console.log(
    removed.length
      ? `Removed ${removed.length} generated paths:\n${removed.join("\n")}`
      : "No disposable generated files.",
  );
}

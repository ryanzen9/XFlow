import { resolve } from "node:path";

const versionFiles = ["package.json", "manifest.json"];
const usage = "Usage: bun run release:prepare <major.minor.patch>";

async function git(root: string, args: string[]): Promise<string> {
  const command = Bun.spawn(["git", "-c", "core.fsmonitor=false", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ]);
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr.trim()}`);
  return stdout.trim();
}

function versionParts(version: string): number[] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error("Use a major.minor.patch version without a v prefix or prerelease suffix.");
  }
  const parts = version.split(".").map(Number);
  if (parts.some((part) => part > 65535) || parts.every((part) => part === 0)) {
    throw new Error("Version components must be between 0 and 65535, and the version must not be all zero.");
  }
  return parts;
}

/** Change only the root version value, preserving formatting and nested metadata. */
function updateVersion(source: string, version: string): string {
  let depth = 0;
  for (const token of source.matchAll(/"(?:\\.|[^"\\])*"|[{}[\]]/g)) {
    const text = token[0];
    if (text === "{" || text === "[") depth++;
    else if (text === "}" || text === "]") depth--;
    else if (depth === 1 && JSON.parse(text) === "version") {
      const end = token.index + text.length;
      const value = source.slice(end).match(/^(\s*:\s*)"(?:\\.|[^"\\])*"/);
      if (value)
        return source.slice(0, end + value[1]!.length) + JSON.stringify(version) + source.slice(end + value[0].length);
    }
  }
  throw new Error("Could not locate the root version field.");
}

async function assertTagAvailable(root: string, tag: string): Promise<void> {
  if (await git(root, ["tag", "--list", tag])) throw new Error(`Local tag ${tag} already exists.`);
  const remotes = (await git(root, ["remote"])).split("\n");
  if (remotes.includes("origin") && (await git(root, ["ls-remote", "--tags", "origin", `refs/tags/${tag}`]))) {
    throw new Error(`Remote tag ${tag} already exists.`);
  }
}

export interface PreparedRelease {
  version: string;
  tag: string;
  commit: string;
  branch: string;
}

/** Run the quality gate before creating a version commit and an annotated local tag. */
export async function prepareRelease(directory: string, version: string): Promise<PreparedRelease> {
  const next = versionParts(version);
  const root = await git(resolve(directory), ["rev-parse", "--show-toplevel"]);
  const branch = await git(root, ["branch", "--show-current"]);
  if (!branch) throw new Error("Check out a branch before preparing a release.");
  if (await git(root, ["status", "--porcelain=v1", "--untracked-files=all"])) {
    throw new Error("Commit or stash your changes before preparing a release; the working tree must be clean.");
  }
  await git(root, ["ls-files", "--error-unmatch", ...versionFiles]);
  const previousHead = await git(root, ["rev-parse", "HEAD"]);
  const documents = await Promise.all(
    versionFiles.map(async (file) => {
      const path = resolve(root, file);
      const source = await Bun.file(path).text();
      const document = JSON.parse(source) as { version?: unknown };
      if (typeof document.version !== "string") throw new Error(`${file} must contain a string version.`);
      return { file, path, source, version: document.version, updated: updateVersion(source, version) };
    }),
  );
  const currentVersion = documents[0]!.version;
  if (documents.some((document) => document.version !== currentVersion)) {
    throw new Error("package.json and manifest.json versions must match before preparing a release.");
  }
  const current = versionParts(currentVersion);
  const different = next.findIndex((part, index) => part !== current[index]);
  if (different === -1 || next[different]! < current[different]!) {
    throw new Error(`New version ${version} must be greater than ${currentVersion}.`);
  }
  const tag = `v${version}`;
  await assertTagAvailable(root, tag);
  await git(root, ["var", "GIT_AUTHOR_IDENT"]);
  await git(root, ["var", "GIT_COMMITTER_IDENT"]);

  let commit: string | undefined;
  try {
    for (const document of documents) await Bun.write(document.path, document.updated);
    const check = Bun.spawn([process.execPath, "run", "check"], {
      cwd: root,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await check.exited) !== 0) throw new Error("bun run check failed; no release commit or tag was created.");

    if ((await git(root, ["rev-parse", "HEAD"])) !== previousHead) {
      throw new Error("HEAD changed during the quality gate; release preparation stopped.");
    }
    const changed = (await git(root, ["diff", "--name-only", "HEAD"])).split("\n").filter(Boolean);
    const untracked = await git(root, ["ls-files", "--others", "--exclude-standard"]);
    if (untracked || changed.some((file) => !versionFiles.includes(file))) {
      throw new Error("The quality gate changed files outside package.json and manifest.json.");
    }
    for (const document of documents) {
      if ((await Bun.file(document.path).text()) !== document.updated) {
        throw new Error(`${document.file} changed during the quality gate; release preparation stopped.`);
      }
    }
    await assertTagAvailable(root, tag);
    await git(root, ["add", "--", ...versionFiles]);
    await git(root, ["commit", "--only", "-m", `chore: prepare release ${tag}`, "--", ...versionFiles]);
    commit = await git(root, ["rev-parse", "HEAD"]);
    for (const file of versionFiles) {
      const committed = JSON.parse(await git(root, ["show", `${commit}:${file}`])) as { version: string };
      if (committed.version !== version) throw new Error(`Committed ${file} version differs from ${version}.`);
    }
    await git(root, ["tag", "-a", tag, "-m", `XFlow ${tag}`, commit]);
    return { version, tag, commit, branch };
  } catch (error) {
    const head = await git(root, ["rev-parse", "HEAD"]);
    if (!commit && head === previousHead) {
      await git(root, ["restore", "--staged", `--source=${previousHead}`, "--", ...versionFiles]);
      for (const document of documents) {
        // Preserve edits made by another process while the quality gate was running.
        if ((await Bun.file(document.path).text()) === document.updated)
          await Bun.write(document.path, document.source);
      }
    } else {
      throw new Error(`Commit ${head} was retained, but this command could not create ${tag}. ${String(error)}`, {
        cause: error,
      });
    }
    throw error;
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(
      `${usage}\nUpdates both version files, runs bun run check, commits them, and creates a local annotated tag.`,
    );
  } else if (args.length !== 1) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      const release = await prepareRelease(process.cwd(), args[0]!);
      console.log(`Prepared ${release.tag} on ${release.branch} at ${release.commit}.`);
      console.log(`Push the branch and tag when ready: git push --atomic origin ${release.branch} ${release.tag}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}

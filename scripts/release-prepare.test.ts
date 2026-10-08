import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareRelease } from "./release-prepare";

const script = fileURLToPath(new URL("./release-prepare.ts", import.meta.url));

function git(root: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-c", "core.fsmonitor=false", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout).trim();
}

async function withRepository(
  mode: "pass" | "fail" | "dirty",
  run: (root: string, initialHead: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "xflow-release-prepare-"));
  try {
    git(root, "init", "--template=", "-b", "main");
    git(root, "config", "user.name", "Release Test");
    git(root, "config", "user.email", "release-test@example.invalid");
    git(root, "config", "commit.gpgsign", "false");
    git(root, "config", "tag.gpgsign", "false");
    git(root, "config", "core.hooksPath", join(root, ".git/hooks"));
    await Bun.write(
      join(root, "package.json"),
      JSON.stringify(
        {
          name: "release-fixture",
          metadata: { version: "keep", values: [{ version: "nested", text: "{version}" }] },
          version: "0.1.1",
          scripts: { check: "bun run gate.ts" },
        },
        null,
        2,
      ) + "\n",
    );
    await Bun.write(
      join(root, "manifest.json"),
      '{"manifest_version":3,"metadata":{"version":"keep"},"version":"0.1.1","permissions":["storage"]}\n',
    );
    await Bun.write(join(root, ".gitignore"), "gate-result.json\nremote.git/\n");
    await Bun.write(join(root, "README.md"), "Unrelated tracked content.\n");
    await Bun.write(
      join(root, "gate.ts"),
      `const pkg = await Bun.file("package.json").json();
const manifest = await Bun.file("manifest.json").json();
await Bun.write("gate-result.json", JSON.stringify([pkg.version, manifest.version]));
${mode === "fail" ? "process.exit(1);" : ""}
${mode === "dirty" ? 'await Bun.write("unrelated.txt", "Preserve this output.");' : ""}
`,
    );
    git(root, "add", ".");
    git(root, "commit", "-m", "Initial fixture");
    await run(root, git(root, "rev-parse", "HEAD"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("CLI checks the new versions, commits only them and tags that exact commit", async () => {
  await withRepository("pass", async (root, initialHead) => {
    const packageBefore = await Bun.file(join(root, "package.json")).text();
    const manifestBefore = await Bun.file(join(root, "manifest.json")).text();
    const command = Bun.spawn([process.execPath, script, "0.1.10"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(command.stdout).text(),
      new Response(command.stderr).text(),
      command.exited,
    ]);
    if (code !== 0) throw new Error(`${stdout}\n${stderr}`);
    const head = git(root, "rev-parse", "HEAD");
    expect(head).not.toBe(initialHead);
    expect(git(root, "rev-parse", "v0.1.10^{}")).toBe(head);
    expect(git(root, "cat-file", "-t", "v0.1.10")).toBe("tag");
    expect(git(root, "diff", "--name-only", initialHead, head).split("\n")).toEqual(["manifest.json", "package.json"]);
    expect(JSON.parse(git(root, "show", `${head}:package.json`)).version).toBe("0.1.10");
    expect(JSON.parse(git(root, "show", `${head}:manifest.json`)).version).toBe("0.1.10");
    expect(await Bun.file(join(root, "gate-result.json")).json()).toEqual(["0.1.10", "0.1.10"]);
    expect(
      (await Bun.file(join(root, "package.json")).text()).replace('"version": "0.1.10"', '"version": "0.1.1"'),
    ).toBe(packageBefore);
    expect(
      (await Bun.file(join(root, "manifest.json")).text()).replace('"version":"0.1.10"', '"version":"0.1.1"'),
    ).toBe(manifestBefore);
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(stdout).toContain("git push --atomic origin main v0.1.10");
  });
});

test("invalid, equal and decreasing versions never change files or refs", async () => {
  await withRepository("pass", async (root, initialHead) => {
    const packageBefore = await Bun.file(join(root, "package.json")).text();
    const manifestBefore = await Bun.file(join(root, "manifest.json")).text();
    for (const version of [
      "v0.1.2",
      "0.1.2-beta",
      "0.01.2",
      "0.1",
      "0.1.2.3",
      "0.0.0",
      "65536.1.2",
      "0.1.1",
      "0.0.9",
      "--force",
    ]) {
      await expect(prepareRelease(root, version)).rejects.toThrow();
    }
    expect(await Bun.file(join(root, "package.json")).text()).toBe(packageBefore);
    expect(await Bun.file(join(root, "manifest.json")).text()).toBe(manifestBefore);
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect(git(root, "tag", "--list")).toBe("");
  });
});

test.each(["staged", "untracked"])("refuses %s user changes without modifying their state", async (kind) => {
  await withRepository("pass", async (root, initialHead) => {
    if (kind === "staged") {
      await Bun.write(join(root, "README.md"), "User changes.\n");
      git(root, "add", "README.md");
    } else await Bun.write(join(root, "untracked.txt"), "User changes.\n");
    const status = git(root, "status", "--porcelain");
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("working tree must be clean");
    expect(git(root, "status", "--porcelain")).toBe(status);
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect((await Bun.file(join(root, "package.json")).json()).version).toBe("0.1.1");
  });
});

test("existing local tags are preserved", async () => {
  await withRepository("pass", async (root, initialHead) => {
    git(root, "tag", "v0.1.2");
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("Local tag v0.1.2 already exists");
    expect(git(root, "rev-parse", "v0.1.2")).toBe(initialHead);
    expect(git(root, "status", "--porcelain")).toBe("");
  });
});

test("existing remote tags are rejected even when not fetched locally", async () => {
  await withRepository("pass", async (root, initialHead) => {
    git(root, "init", "--bare", "--template=", "remote.git");
    git(root, "remote", "add", "origin", join(root, "remote.git"));
    git(root, "push", "origin", "HEAD:refs/tags/v0.1.2");
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("Remote tag v0.1.2 already exists");
    expect(git(root, "tag", "--list")).toBe("");
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect(git(root, "status", "--porcelain")).toBe("");
  });
});

test("a failed quality gate restores original bytes and leaves no commit or tag", async () => {
  await withRepository("fail", async (root, initialHead) => {
    const packageBefore = await Bun.file(join(root, "package.json")).text();
    const manifestBefore = await Bun.file(join(root, "manifest.json")).text();
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("bun run check failed");
    expect(await Bun.file(join(root, "gate-result.json")).json()).toEqual(["0.1.2", "0.1.2"]);
    expect(await Bun.file(join(root, "package.json")).text()).toBe(packageBefore);
    expect(await Bun.file(join(root, "manifest.json")).text()).toBe(manifestBefore);
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect(git(root, "tag", "--list")).toBe("");
    expect(git(root, "status", "--porcelain")).toBe("");
  });
});

test("a rejected commit unstages and restores the version changes", async () => {
  await withRepository("pass", async (root, initialHead) => {
    await mkdir(join(root, ".git/hooks"), { recursive: true });
    const hook = join(root, ".git/hooks/pre-commit");
    await Bun.write(hook, "#!/bin/sh\nexit 1\n");
    await chmod(hook, 0o755);
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("git commit");
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect((await Bun.file(join(root, "package.json")).json()).version).toBe("0.1.1");
    expect((await Bun.file(join(root, "manifest.json")).json()).version).toBe("0.1.1");
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(git(root, "tag", "--list")).toBe("");
  });
});

test("unexpected quality-gate output is preserved and never included in a release commit", async () => {
  await withRepository("dirty", async (root, initialHead) => {
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("changed files outside");
    expect(await Bun.file(join(root, "unrelated.txt")).text()).toBe("Preserve this output.");
    expect(git(root, "rev-parse", "HEAD")).toBe(initialHead);
    expect((await Bun.file(join(root, "manifest.json")).json()).version).toBe("0.1.1");
    expect(git(root, "tag", "--list")).toBe("");
  });
});

test("a commit hook cannot create a release tag for a different committed version", async () => {
  await withRepository("pass", async (root, initialHead) => {
    await mkdir(join(root, ".git/hooks"), { recursive: true });
    const hook = join(root, ".git/hooks/pre-commit");
    await Bun.write(
      hook,
      `#!/bin/sh
bun -e 'const doc = await Bun.file("manifest.json").json(); doc.version = "0.1.3"; await Bun.write("manifest.json", JSON.stringify(doc) + "\\n");'
git add manifest.json
`,
    );
    await chmod(hook, 0o755);
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("Committed manifest.json version differs");
    expect(git(root, "rev-parse", "HEAD")).not.toBe(initialHead);
    expect(git(root, "tag", "--list")).toBe("");
    expect(JSON.parse(git(root, "show", "HEAD:manifest.json")).version).toBe("0.1.3");
  });
});

test("a tag collision after committing preserves the commit and the existing tag", async () => {
  await withRepository("pass", async (root, initialHead) => {
    await mkdir(join(root, ".git/hooks"), { recursive: true });
    const hook = join(root, ".git/hooks/post-commit");
    await Bun.write(hook, "#!/bin/sh\ngit tag v0.1.2 HEAD~1\n");
    await chmod(hook, 0o755);
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("was retained");
    expect(git(root, "rev-parse", "HEAD")).not.toBe(initialHead);
    expect(git(root, "rev-parse", "v0.1.2")).toBe(initialHead);
    expect((await Bun.file(join(root, "package.json")).json()).version).toBe("0.1.2");
    expect(git(root, "status", "--porcelain")).toBe("");
  });
});

test("mismatched versions and detached HEAD are rejected before changing files", async () => {
  await withRepository("pass", async (root, initialHead) => {
    const original = await Bun.file(join(root, "manifest.json")).text();
    await Bun.write(join(root, "manifest.json"), original.replace("0.1.1", "0.1.9"));
    git(root, "add", "manifest.json");
    git(root, "commit", "-m", "Mismatched versions");
    await expect(prepareRelease(root, "0.2.0")).rejects.toThrow("versions must match");
    git(root, "switch", "--detach", initialHead);
    await expect(prepareRelease(root, "0.1.2")).rejects.toThrow("Check out a branch");
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(git(root, "tag", "--list")).toBe("");
  });
});

import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createZip, readZipDirectory, readZipEntry, type ArchiveEntry } from "./archive";
import {
  LOCALES,
  validateManifest,
  type ExtensionManifest,
  type LocaleCatalog,
  type ValidationIssue,
} from "./manifest";

/**
 * Release packaging and verification.
 *
 * `bun run release:package` rebuilds `dist/` without source maps, proves that
 * the packaged files are exactly the ones the manifest and its pages reference,
 * scans them for patterns that break the Manifest V3 policy, and writes a
 * byte-reproducible ZIP whose root contains `manifest.json`.
 *
 * `bun run release:check` runs the whole quality gate first and then performs
 * the same packaging, so the uploaded artifact is always the one that passed.
 */
export const REPOSITORY_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DIST_DIR = `${REPOSITORY_ROOT}/dist`;
export const RELEASE_ARTIFACT_DIR = `${REPOSITORY_ROOT}/output/release`;

export function releaseArchiveName(version: string): string {
  return `xflow-${version}.zip`;
}

export class ReleaseError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(`Release verification failed with ${issues.length} issue(s).`);
    this.name = "ReleaseError";
    this.issues = issues;
  }
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `  ${issue.code}: ${issue.detail}`).join("\n");
}

/** Archive entries are relative to the ZIP root; `dist/` must never appear in them. */
export const FORBIDDEN_ARCHIVE_RULES = [
  {
    code: "source-map",
    detail: "source maps are never published",
    matches: (path: string) => path.endsWith(".map"),
  },
  {
    code: "source-file",
    detail: "TypeScript sources are never published",
    matches: (path: string) => /\.(ts|tsx|mts|cts)$/.test(path),
  },
  {
    code: "environment-file",
    detail: ".env files may contain credentials and are never published",
    matches: (path: string) => /(^|\/)\.env/.test(path),
  },
  {
    code: "os-metadata",
    detail: "OS metadata is never published",
    matches: (path: string) => /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/.test(path),
  },
  {
    code: "credential-file",
    detail: "key material is never published",
    matches: (path: string) => /\.(pem|key|p12|pfx|crx)$/.test(path),
  },
  {
    code: "log-file",
    detail: "logs are never published",
    matches: (path: string) => path.endsWith(".log"),
  },
  {
    code: "dependency-tree",
    detail: "node_modules is never published",
    matches: (path: string) => path.includes("node_modules/"),
  },
  {
    code: "test-file",
    detail: "tests are never published",
    matches: (path: string) => /\.(test|spec)\./.test(path),
  },
  {
    code: "repository-path",
    detail: "repository sources are never published",
    matches: (path: string) => /^(src|scripts|docs|workspace|output)\//.test(path),
  },
  {
    code: "nested-dist",
    detail: "manifest.json must sit at the ZIP root, without a dist/ wrapper",
    matches: (path: string) => path.startsWith("dist/"),
  },
] as const;

export function findForbiddenArchivePaths(paths: string[]): ValidationIssue[] {
  return paths.flatMap((path) =>
    FORBIDDEN_ARCHIVE_RULES.filter((rule) => rule.matches(path)).map((rule) => ({
      code: `archive-${rule.code}`,
      detail: `${path}: ${rule.detail}`,
    })),
  );
}

export interface ForbiddenPattern {
  code: string;
  detail: string;
  pattern: RegExp;
  extensions: readonly string[];
}

/** Rules are matched against the shipped text files only, never against sources. */
export const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  {
    code: "dynamic-eval",
    detail: "eval() executes strings and violates the Manifest V3 remote-code policy",
    pattern: /\beval\s*\(/,
    extensions: [".js", ".html"],
  },
  {
    code: "dynamic-function",
    detail: "new Function() violates the Manifest V3 remote-code policy",
    pattern: /new\s+Function\s*\(/,
    extensions: [".js", ".html"],
  },
  {
    code: "remote-code-loader",
    detail: "importScripts() must not pull code into the service worker",
    pattern: /importScripts\s*\(/,
    extensions: [".js"],
  },
  {
    code: "source-map-reference",
    detail: "shipped bundles must not point at source maps",
    pattern: /sourceMappingURL/,
    extensions: [".js", ".css"],
  },
  {
    code: "remote-page-asset",
    detail: "extension pages must not load remote scripts or stylesheets",
    pattern: /(?:src|href)\s*=\s*["']https?:\/\//,
    extensions: [".html"],
  },
  {
    code: "development-origin",
    detail: "development origins must not reach a release package",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/,
    extensions: [".js", ".css", ".html", ".json"],
  },
];

export const SCANNED_EXTENSIONS = [".js", ".css", ".html", ".json"] as const;

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) if (source[cursor] === "\n") line += 1;
  return line;
}

export function scanReleaseText(path: string, source: string): ValidationIssue[] {
  const extension = path.slice(path.lastIndexOf("."));
  return FORBIDDEN_PATTERNS.filter((rule) => rule.extensions.includes(extension)).flatMap((rule) => {
    const match = rule.pattern.exec(source);
    if (!match) return [];
    return [{ code: rule.code, detail: `${path}:${lineOf(source, match.index)}: ${rule.detail}` }];
  });
}

/**
 * Resolves a reference inside a packaged page or stylesheet, so a font or image
 * pulled in by CSS is part of the expected file set too.
 */
export function resolveReleaseReference(fromPath: string, reference: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith("//") || reference.startsWith("#")) return null;
  const base = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/") + 1) : "";
  return new URL(reference, `file:///${base}`).pathname.replace(/^\//, "");
}

export function referencedHtmlAssets(source: string): string[] {
  const assets = new Set<string>();
  for (const match of source.matchAll(/(?:src|href)\s*=\s*"([^"]*)"/g)) {
    const value = match[1];
    if (value) assets.add(value);
  }
  return [...assets];
}

export function referencedCssAssets(source: string): string[] {
  const assets = new Set<string>();
  for (const match of source.matchAll(/url\(\s*["']?([^"')]*)["']?\s*\)/g)) {
    const value = match[1];
    if (value) assets.add(value);
  }
  return [...assets];
}

export function requiredReleasePaths(input: {
  manifest: ExtensionManifest;
  locales: readonly string[];
  html: Array<{ path: string; source: string }>;
  css: Array<{ path: string; source: string }>;
}): string[] {
  const required = new Set<string>(["manifest.json"]);
  for (const path of [
    input.manifest.background.service_worker,
    input.manifest.options_ui.page,
    input.manifest.action.default_popup,
    ...Object.values(input.manifest.icons),
    ...Object.values(input.manifest.action.default_icon),
    ...input.manifest.content_scripts.flatMap((script) => [...script.js, ...script.css]),
  ]) {
    required.add(path);
  }
  for (const page of input.html) {
    for (const reference of referencedHtmlAssets(page.source)) {
      const resolved = resolveReleaseReference(page.path, reference);
      if (resolved) required.add(resolved);
    }
  }
  for (const stylesheet of input.css) {
    for (const reference of referencedCssAssets(stylesheet.source)) {
      const resolved = resolveReleaseReference(stylesheet.path, reference);
      if (resolved) required.add(resolved);
    }
  }
  for (const locale of input.locales) required.add(`_locales/${locale}/messages.json`);
  return [...required].toSorted();
}

export interface ReleasePlan {
  issues: ValidationIssue[];
  required: string[];
  manifest: ExtensionManifest | null;
}

/**
 * Everything a release must prove about its own files: manifest validity,
 * referenced assets, forbidden paths and forbidden patterns. Pure — it only
 * looks at the bytes that are about to be packaged.
 */
export function planRelease(files: ArchiveEntry[]): ReleasePlan {
  const issues: ValidationIssue[] = [];
  const paths = files.map((file) => file.path).toSorted();
  const byPath = new Map(files.map((file) => [file.path, file]));
  const decoder = new TextDecoder();
  const readText = (path: string): string | null => {
    const file = byPath.get(path);
    return file ? decoder.decode(file.data) : null;
  };

  issues.push(...findForbiddenArchivePaths(paths));

  const manifestText = readText("manifest.json");
  if (manifestText === null) {
    issues.push({ code: "missing-manifest", detail: "manifest.json is not at the release archive root" });
    return { issues, required: [], manifest: null };
  }

  let manifest: ExtensionManifest;
  try {
    manifest = JSON.parse(manifestText) as ExtensionManifest;
  } catch (error) {
    issues.push({ code: "invalid-manifest", detail: `manifest.json is not valid JSON: ${String(error)}` });
    return { issues, required: [], manifest: null };
  }

  const catalogs = new Map<string, LocaleCatalog>();
  for (const locale of LOCALES) {
    const source = readText(`_locales/${locale}/messages.json`);
    if (source === null) continue;
    try {
      catalogs.set(locale, JSON.parse(source) as LocaleCatalog);
    } catch {
      issues.push({ code: "invalid-locale", detail: `_locales/${locale}/messages.json is not valid JSON` });
    }
  }
  issues.push(...validateManifest(manifest, catalogs.get(manifest.default_locale) ?? {}));

  const html = paths.filter((path) => path.endsWith(".html")).map((path) => ({ path, source: readText(path) ?? "" }));
  const css = paths.filter((path) => path.endsWith(".css")).map((path) => ({ path, source: readText(path) ?? "" }));
  const required = requiredReleasePaths({ manifest, locales: LOCALES, html, css });

  for (const path of required) {
    if (!byPath.has(path)) issues.push({ code: "missing-asset", detail: `${path} is referenced but not packaged` });
  }
  for (const path of paths) {
    if (!required.includes(path)) {
      issues.push({ code: "unreferenced-asset", detail: `${path} is packaged but nothing references it` });
    }
  }

  for (const file of files) {
    if (!SCANNED_EXTENSIONS.some((extension) => file.path.endsWith(extension))) continue;
    issues.push(...scanReleaseText(file.path, decoder.decode(file.data)));
  }

  return { issues, required, manifest };
}

export async function readDirectoryFiles(directory: string): Promise<ArchiveEntry[]> {
  const files: ArchiveEntry[] = [];
  const glob = new Bun.Glob("**/*");
  for await (const path of glob.scan({ cwd: directory, dot: true, onlyFiles: true })) {
    files.push({ path, data: new Uint8Array(await Bun.file(`${directory}/${path}`).arrayBuffer()) });
  }
  return files.toSorted((left, right) => (left.path < right.path ? -1 : 1));
}

export function sha256Hex(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

/** Proves the ZIP we are about to publish still holds exactly the built bytes. */
export function verifyArchive(files: ArchiveEntry[], archive: Uint8Array): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const records = readZipDirectory(archive);
  const expected = files
    .map((file) => file.path)
    .toSorted()
    .join("\n");
  const actual = records
    .map((record) => record.path)
    .toSorted()
    .join("\n");
  if (expected !== actual) issues.push({ code: "archive-listing", detail: "the ZIP listing does not match dist/" });

  for (const file of files) {
    const record = records.find((entry) => entry.path === file.path);
    if (!record) continue;
    if (record.size !== file.data.byteLength) {
      issues.push({
        code: "archive-size",
        detail: `${file.path}: stored ${record.size}, expected ${file.data.byteLength}`,
      });
      continue;
    }
    const restored = readZipEntry(archive, file.path);
    if (Buffer.compare(Buffer.from(restored), Buffer.from(file.data)) !== 0) {
      issues.push({ code: "archive-content", detail: `${file.path} changed during the ZIP round trip` });
    }
  }

  return issues;
}

async function buildReleaseBundle(): Promise<void> {
  const build = Bun.spawn([process.execPath, "run", "scripts/build.ts", "--release"], {
    cwd: REPOSITORY_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await build.exited) !== 0) throw new Error("The release build failed.");
}

export async function runQualityGate(): Promise<void> {
  const check = Bun.spawn([process.execPath, "run", "check"], {
    cwd: REPOSITORY_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await check.exited) !== 0) throw new Error("`bun run check` failed, so the release gate stays closed.");
}

/** Independent confirmation that a real unzip implementation accepts the archive. */
export function crossCheckArchive(archivePath: string, paths: string[]): string | null {
  const unzip = Bun.which("unzip");
  if (!unzip) return null;

  const test = Bun.spawnSync([unzip, "-t", archivePath], { stdout: "pipe", stderr: "pipe" });
  if (test.exitCode !== 0) {
    throw new ReleaseError([{ code: "unzip-test", detail: test.stderr.toString().trim() || "unzip -t failed" }]);
  }

  const listing = Bun.spawnSync([unzip, "-Z1", archivePath], { stdout: "pipe", stderr: "pipe" });
  if (listing.exitCode !== 0) {
    throw new ReleaseError([{ code: "unzip-listing", detail: listing.stderr.toString().trim() || "unzip -Z1 failed" }]);
  }
  const seen = listing.stdout.toString().split("\n").filter(Boolean).toSorted().join("\n");
  if (seen !== paths.toSorted().join("\n")) {
    throw new ReleaseError([{ code: "unzip-listing", detail: "unzip reports a different file list" }]);
  }
  return "unzip -t and unzip -Z1";
}

export interface ReleaseFileRecord {
  path: string;
  size: number;
  sha256: string;
}

export interface ReleaseSummary {
  version: string;
  archivePath: string;
  archiveBytes: number;
  archiveSha256: string;
  files: ReleaseFileRecord[];
  crossCheck: string | null;
}

export interface ReleaseOptions {
  build?: boolean;
  clean?: boolean;
  crossCheck?: boolean;
}

export async function packageRelease(options: ReleaseOptions = {}): Promise<ReleaseSummary> {
  const { build = true, clean = true, crossCheck = true } = options;

  if (clean) {
    await rm(DIST_DIR, { recursive: true, force: true });
    await rm(RELEASE_ARTIFACT_DIR, { recursive: true, force: true });
  }
  if (build) await buildReleaseBundle();
  await mkdir(RELEASE_ARTIFACT_DIR, { recursive: true });

  const files = await readDirectoryFiles(DIST_DIR);
  if (files.length === 0) throw new ReleaseError([{ code: "empty-dist", detail: "dist/ holds no files to package" }]);

  const plan = planRelease(files);
  if (plan.issues.length > 0 || plan.manifest === null) throw new ReleaseError(plan.issues);

  const archive = createZip(files, { first: "manifest.json" });
  const roundTripIssues = verifyArchive(files, archive);
  if (roundTripIssues.length > 0) throw new ReleaseError(roundTripIssues);

  const version = plan.manifest.version;
  const archiveName = releaseArchiveName(version);
  const archivePath = `${RELEASE_ARTIFACT_DIR}/${archiveName}`;
  const archiveSha256 = sha256Hex(archive);
  const records: ReleaseFileRecord[] = files.map((file) => ({
    path: file.path,
    size: file.data.byteLength,
    sha256: sha256Hex(file.data),
  }));

  await Bun.write(archivePath, archive);
  await Bun.write(`${archivePath}.sha256`, `${archiveSha256}  ${archiveName}\n`);
  await Bun.write(
    `${archivePath}.files.txt`,
    `${records.map((record) => `${record.sha256}  ${String(record.size).padStart(8)}  ${record.path}`).join("\n")}\n`,
  );

  return {
    version,
    archivePath,
    archiveBytes: archive.byteLength,
    archiveSha256,
    files: records,
    crossCheck: crossCheck
      ? crossCheckArchive(
          archivePath,
          records.map((record) => record.path),
        )
      : null,
  };
}

export function formatReleaseSummary(summary: ReleaseSummary): string {
  const lines = [
    "Release package",
    `  version     ${summary.version}`,
    `  archive     ${summary.archivePath.replace(`${REPOSITORY_ROOT}/`, "")}`,
    `  sha256      ${summary.archiveSha256}`,
    `  size        ${summary.archiveBytes} bytes`,
    `  entries     ${summary.files.length}`,
    `  cross-check ${summary.crossCheck ?? "skipped (unzip not available)"}`,
    "",
    "  sha256                                                            size  path",
  ];
  for (const file of summary.files) {
    lines.push(`  ${file.sha256}  ${String(file.size).padStart(6)}  ${file.path}`);
  }
  return lines.join("\n");
}

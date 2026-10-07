import { RELEASE_ARTIFACT_DIR, packageRelease, readDirectoryFiles, sha256Hex } from "./release";

/**
 * `bun run release:verify` packages the extension twice from clean `dist/`
 * directories and compares every produced artifact byte for byte.
 *
 * This is the automated form of the phase 4 acceptance criterion: one commit
 * must always produce one archive, so an uploaded ZIP can be tied back to a
 * commit hash. It runs in CI on every change and again before a GitHub Release
 * is created.
 */
console.log("release:verify — packaging once and recording the artifacts.\n");
const first = await packageRelease();
const before = await readDirectoryFiles(RELEASE_ARTIFACT_DIR);

console.log("\nrelease:verify — packaging again from a clean dist/ and comparing.\n");
const second = await packageRelease();
const after = await readDirectoryFiles(RELEASE_ARTIFACT_DIR);

const problems: string[] = [];
const afterByPath = new Map(after.map((file) => [file.path, file]));

for (const file of before) {
  const other = afterByPath.get(file.path);
  if (!other) {
    problems.push(`${file.path} is missing from the second run`);
    continue;
  }
  if (Buffer.compare(Buffer.from(file.data), Buffer.from(other.data)) !== 0) {
    problems.push(`${file.path} differs between runs (${sha256Hex(file.data)} vs ${sha256Hex(other.data)})`);
  }
}
for (const file of after) {
  if (!before.some((entry) => entry.path === file.path)) problems.push(`${file.path} only appeared on the second run`);
}

if (problems.length > 0) {
  console.error("Release packaging is not reproducible:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `release:verify passed — ${before.length} artifacts byte-identical across two clean builds ` +
    `(${first.archiveBytes} bytes, ${second.files.length} entries).`,
);
console.log(`  archive sha256  ${second.archiveSha256}`);
console.log(`  artifacts       ${before.map((file) => file.path).join(", ")}`);

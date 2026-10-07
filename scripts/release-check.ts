import { ReleaseError, formatIssues, formatReleaseSummary, packageRelease, runQualityGate } from "./release";

try {
  console.log("release:check — running the full quality gate first.\n");
  await runQualityGate();
  console.log("\nrelease:check — quality gate passed, packaging the release.\n");
  console.log(formatReleaseSummary(await packageRelease()));
  console.log("\nrelease:check passed.");
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(`\nRelease blocked by ${error.issues.length} issue(s):\n${formatIssues(error.issues)}`);
    process.exit(1);
  }
  console.error(`\nrelease:check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

import { ReleaseError, formatIssues, formatReleaseSummary, packageRelease } from "./release";

try {
  console.log(formatReleaseSummary(await packageRelease()));
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(`Release blocked by ${error.issues.length} issue(s):\n${formatIssues(error.issues)}`);
    process.exit(1);
  }
  throw error;
}

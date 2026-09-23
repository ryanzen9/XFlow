import { renderCacheBenchmark, runCacheBenchmark } from "./cache-benchmark-lib";

interface CliOptions {
  requests: number;
  providerLatencyMs: number;
  json: boolean;
}

export function parseCacheBenchmarkArgs(args: string[]): CliOptions {
  const options: CliOptions = { requests: 1_000, providerLatencyMs: 600, json: false };
  for (const argument of args) {
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    const [name, rawValue] = argument.split("=", 2);
    const value = Number(rawValue);
    if (name === "--requests" && Number.isSafeInteger(value) && value >= 20 && value <= 100_000) {
      options.requests = value;
      continue;
    }
    if (name === "--jev-latency-ms" && Number.isFinite(value) && value >= 0 && value <= 60_000) {
      options.providerLatencyMs = value;
      continue;
    }
    throw new Error(`Unknown or invalid option: ${argument}`);
  }
  return options;
}

if (import.meta.main) {
  const options = parseCacheBenchmarkArgs(Bun.argv.slice(2));
  const result = await runCacheBenchmark(options);
  console.log(options.json ? JSON.stringify(result, null, 2) : renderCacheBenchmark(result));
  if (result.mismatches > 0) process.exitCode = 1;
}

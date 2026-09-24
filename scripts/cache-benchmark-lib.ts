import {
  findLocalDecision,
  rememberJevDecision,
  resetDecisionCacheForTests,
} from "../src/background/services/decision-cache";
import { buildBenchmarkDataset, type BenchmarkLayer, type BenchmarkQuery } from "./cache-benchmark-dataset";

export type { BenchmarkLayer, BenchmarkQuery } from "./cache-benchmark-dataset";

export interface BenchmarkOptions {
  requests: number;
  providerLatencyMs: number;
}

export interface CacheBenchmarkResult {
  requests: number;
  seedEntries: number;
  expectedCounts: Record<BenchmarkLayer, number>;
  counts: Record<BenchmarkLayer, number>;
  mismatches: number;
  hits: number;
  misses: number;
  hitRate: number;
  providerCallRate: number;
  measured: {
    seedTotalMs: number;
    lookupTotalMs: number;
    averageLookupMs: number;
    p50LookupMs: number;
    p95LookupMs: number;
    lookupsPerSecond: number;
  };
  modeled: {
    providerLatencyMs: number;
    withoutCacheMs: number;
    withCacheMs: number;
    savedMs: number;
    latencyReductionRate: number;
  };
}

const POLICY = "cache-benchmark-policy-v1";
const NOW = Date.UTC(2026, 8, 23);
const LAYERS: BenchmarkLayer[] = ["exact-cache", "normalized-cache", "template-cache", "semantic-cache", "miss"];

const emptyCounts = (): Record<BenchmarkLayer, number> => ({
  "exact-cache": 0,
  "normalized-cache": 0,
  "template-cache": 0,
  "semantic-cache": 0,
  miss: 0,
});

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)] ?? 0;
}

function elapsedMs(start: number): number {
  return (Bun.nanoseconds() - start) / 1_000_000;
}

function installChromeStorageMock(): { restore: () => void } {
  const scope = globalThis as typeof globalThis & { chrome?: typeof chrome };
  const originalChrome = scope.chrome;
  const storage: Record<string, unknown> = {};
  scope.chrome = {
    storage: {
      local: {
        get: async (keys: null | string | string[]) => {
          if (keys === null) return { ...storage };
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.map((key) => [key, storage[key]]));
        },
        set: async (patch: Record<string, unknown>) => Object.assign(storage, patch),
      },
    },
  } as unknown as typeof chrome;
  return {
    restore: () => {
      if (originalChrome) scope.chrome = originalChrome;
      else Reflect.deleteProperty(globalThis, "chrome");
    },
  };
}

export function buildBenchmarkQueries(requests: number): BenchmarkQuery[] {
  return buildBenchmarkDataset(requests).queries;
}

export async function runCacheBenchmark(options: BenchmarkOptions): Promise<CacheBenchmarkResult> {
  const requests = Math.max(20, Math.floor(options.requests));
  const providerLatencyMs = Math.max(0, options.providerLatencyMs);
  const chromeMock = installChromeStorageMock();
  resetDecisionCacheForTests();
  try {
    const dataset = buildBenchmarkDataset(requests);
    const seedStarted = Bun.nanoseconds();
    for (const text of dataset.seeds) {
      await rememberJevDecision(text, POLICY, "blur", 0.97, "benchmark-strategy", NOW);
    }
    const seedEntries = dataset.seeds.length;
    const seedTotalMs = elapsedMs(seedStarted);
    const queries = dataset.queries;
    const counts = emptyCounts();
    const expectedCounts = emptyCounts();
    const latencies: number[] = [];
    let mismatches = 0;

    for (const query of queries) {
      expectedCounts[query.expected] += 1;
      const started = Bun.nanoseconds();
      const decision = await findLocalDecision(query.text, "timeline", POLICY, NOW + 1);
      latencies.push(elapsedMs(started));
      const source: BenchmarkLayer =
        decision?.source && LAYERS.includes(decision.source as BenchmarkLayer)
          ? (decision.source as BenchmarkLayer)
          : "miss";
      counts[source] += 1;
      if (source !== query.expected) mismatches += 1;
    }

    const lookupTotalMs = latencies.reduce((sum, latency) => sum + latency, 0);
    const misses = counts.miss;
    const hits = requests - misses;
    const withoutCacheMs = requests * providerLatencyMs;
    const withCacheMs = lookupTotalMs + misses * providerLatencyMs;
    const savedMs = Math.max(0, withoutCacheMs - withCacheMs);
    return {
      requests,
      seedEntries,
      expectedCounts,
      counts,
      mismatches,
      hits,
      misses,
      hitRate: hits / requests,
      providerCallRate: misses / requests,
      measured: {
        seedTotalMs,
        lookupTotalMs,
        averageLookupMs: lookupTotalMs / requests,
        p50LookupMs: percentile(latencies, 0.5),
        p95LookupMs: percentile(latencies, 0.95),
        lookupsPerSecond: lookupTotalMs > 0 ? (requests / lookupTotalMs) * 1_000 : 0,
      },
      modeled: {
        providerLatencyMs,
        withoutCacheMs,
        withCacheMs,
        savedMs,
        latencyReductionRate: withoutCacheMs > 0 ? savedMs / withoutCacheMs : 0,
      },
    };
  } finally {
    resetDecisionCacheForTests();
    chromeMock.restore();
  }
}

export function percentage(value: number): string {
  return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;
}

export function progressBar(value: number, width = 24): string {
  const safeWidth = Math.max(1, Math.floor(width));
  const filled = Math.round(Math.max(0, Math.min(1, value)) * safeWidth);
  return `[${"█".repeat(filled)}${"░".repeat(safeWidth - filled)}]`;
}

function duration(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} s`;
  return `${value.toFixed(3)} ms`;
}

export function renderCacheBenchmark(result: CacheBenchmarkResult): string {
  const rows: Array<[string, BenchmarkLayer]> = [
    ["⚡ Exact", "exact-cache"],
    ["🧹 Normalized", "normalized-cache"],
    ["🧩 Template", "template-cache"],
    ["🧠 Semantic", "semantic-cache"],
    ["🌐 Jev miss", "miss"],
  ];
  return [
    "XFlow layered cache benchmark",
    `Workload: ${result.requests} deterministic requests · ${result.seedEntries} seed samples`,
    `Model: ${result.modeled.providerLatencyMs.toFixed(0)} ms/Jev call (configurable; network values are estimates)`,
    "",
    `✅ Cache hit rate   ${percentage(result.hitRate)} ${progressBar(result.hitRate)} ${result.hits}/${result.requests}`,
    `🌐 Jev call rate    ${percentage(result.providerCallRate)} ${progressBar(result.providerCallRate)} ${result.misses}/${result.requests}`,
    ...rows.map(([label, layer]) => {
      const rate = result.counts[layer] / result.requests;
      return `${label.padEnd(15)} ${percentage(rate).padStart(6)} ${progressBar(rate, 16)} ${result.counts[layer]}`;
    }),
    "",
    "Measured locally (Bun high-resolution timer)",
    `⚙️  Cache population ${duration(result.measured.seedTotalMs)}`,
    `⚡ Average lookup    ${duration(result.measured.averageLookupMs)}`,
    `📊 P50 / P95        ${duration(result.measured.p50LookupMs)} / ${duration(result.measured.p95LookupMs)}`,
    `🚀 Lookup throughput ${result.measured.lookupsPerSecond.toFixed(0)} ops/s`,
    "",
    "Modeled end-to-end impact (sequential single-post equivalent)",
    `🧊 Without cache     ${duration(result.modeled.withoutCacheMs)}`,
    `🔥 With cache        ${duration(result.modeled.withCacheMs)}`,
    `💚 Latency reduction ${percentage(result.modeled.latencyReductionRate)} ${progressBar(result.modeled.latencyReductionRate)}`,
    `⏱️  Estimated saved  ${duration(result.modeled.savedMs)}`,
    "",
    result.mismatches === 0
      ? "✅ All workload categories hit their intended cache layer."
      : `❌ ${result.mismatches} workload categories hit an unexpected layer.`,
  ].join("\n");
}

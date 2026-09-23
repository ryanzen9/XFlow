import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createTypeSafeProvider } from "../src/background/jev/providers/typesafe";
import type { JevProvider } from "../src/background/jev/types";
import {
  estimateDecisionCacheStorageForBenchmark,
  rememberJevDecision,
  resetDecisionCacheForTests,
  type DecisionCacheStorageEstimate,
} from "../src/background/services/decision-cache";
import { requestPostReviews } from "../src/background/services/jev";
import {
  MAX_BATCH_SIZE,
  normalizeSettings,
  policyVersion,
  type DecisionSource,
  type ExtensionResponse,
  type PostInput,
  type ProviderSecrets,
  type ReviewResult,
} from "../src/shared";
import { percentage, progressBar } from "./cache-benchmark-lib";

type LiveScenario = Extract<DecisionSource, "exact-cache" | "normalized-cache" | "template-cache" | "semantic-cache">;

interface ScenarioMetric {
  requests: number;
  expectedHits: number;
  cacheHits: number;
  hitRate: number;
}

interface ExtensionFootprint {
  packageBytes: number;
  sourceMapBytes: number;
  files: number;
}

export interface LiveBenchmarkOptions {
  apiKey: string;
  samples: number;
  warmRuns: number;
  provider?: JevProvider;
  extensionFootprint?: ExtensionFootprint;
}

export interface LiveBenchmarkResult {
  mode: "live-typesafe";
  modelId: string;
  samples: number;
  scenarioCounts: Record<LiveScenario, number>;
  warmRuns: number;
  sdkCalls: number;
  sdkCallsAvoided: number;
  sdkCallAvoidanceRate: number;
  cold: {
    elapsedMs: number;
    seedElapsedMs: number;
    sdkCalls: number;
    results: ReviewResult[];
  };
  warm: {
    elapsedMs: number[];
    averageMs: number;
    hits: number;
    requests: number;
    hitRate: number;
    sdkCalls: number;
    scenarios: Record<LiveScenario, ScenarioMetric>;
  };
  latencyReductionRate: number;
  footprint: {
    extension: ExtensionFootprint;
    cacheBefore: DecisionCacheStorageEstimate;
    cacheAfter: DecisionCacheStorageEstimate;
    cacheDeltaBytes: number;
    combinedGrowthRate: number;
  };
}

interface LiveCliOptions {
  samples: number;
  warmRuns: number;
  json: boolean;
}

interface LiveDataset {
  seeds: PostInput[];
  probes: (run: number) => Array<PostInput & { scenario: LiveScenario }>;
  scenarioCounts: Record<LiveScenario, number>;
}

const LIVE_SCENARIOS: LiveScenario[] = ["exact-cache", "normalized-cache", "template-cache", "semantic-cache"];
const MIN_SAMPLES = 20;
const MAX_SAMPLES = 50;

function scenarioCounts(samples: number): Record<LiveScenario, number> {
  const base = Math.floor(samples / LIVE_SCENARIOS.length);
  const remainder = samples % LIVE_SCENARIOS.length;
  return Object.fromEntries(
    LIVE_SCENARIOS.map((scenario, index) => [scenario, base + Number(index < remainder)]),
  ) as Record<LiveScenario, number>;
}

function letters(value: number): string {
  let remaining = value + 1;
  let result = "";
  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(97 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

export function buildLiveDataset(samples: number): LiveDataset {
  const safeSamples = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.floor(samples)));
  const counts = scenarioCounts(safeSamples);
  const seeds: PostInput[] = [];
  const seedText = new Map<string, string>();

  for (let index = 0; index < counts["exact-cache"]; index += 1) {
    const id = `seed-exact-${index}`;
    const text = `Community bulletin ${letters(index)}: the city library extended weekend hours for local residents.`;
    seeds.push({ id, text });
    seedText.set(id, text);
  }
  for (let index = 0; index < counts["normalized-cache"]; index += 1) {
    seeds.push({
      id: `seed-normalized-${index}`,
      text: `LOCAL COMMUNITY UPDATE ${letters(index)}!!!   Free museum admission this Sunday.`,
    });
  }
  for (let index = 0; index < counts["template-cache"]; index += 1) {
    seeds.push({
      id: `seed-template-${index}`,
      text: `Sponsored campaign: buy $TOKEN${letters(index)} now for ${101 + index}% bonus via @partner${letters(index)} https://example.com/deal/${letters(index)}?utm_source=seed`,
    });
  }
  for (let index = 0; index < counts["semantic-cache"]; index += 1) {
    seeds.push({
      id: `seed-semantic-${index}`,
      text: `Urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today marker${letters(index)}.`,
    });
  }

  return {
    seeds,
    scenarioCounts: counts,
    probes(run) {
      const probes: Array<PostInput & { scenario: LiveScenario }> = [];
      for (let index = 0; index < counts["exact-cache"]; index += 1) {
        const seedId = `seed-exact-${index}`;
        probes.push({
          id: `probe-exact-${run}-${index}`,
          text: seedText.get(seedId)!,
          scenario: "exact-cache",
        });
      }
      for (let index = 0; index < counts["normalized-cache"]; index += 1) {
        probes.push({
          id: `probe-normalized-${run}-${index}`,
          text: `local   community update ${letters(index)}! Free museum admission this Sunday.`,
          scenario: "normalized-cache",
        });
      }
      for (let index = 0; index < counts["template-cache"]; index += 1) {
        const marker = letters(run * MAX_SAMPLES + index);
        probes.push({
          id: `probe-template-${run}-${index}`,
          text: `Sponsored campaign: buy $LIVE${marker} now for ${501 + run * MAX_SAMPLES + index}% bonus via @affiliate${marker} https://promo.example/${marker}?ref=benchmark`,
          scenario: "template-cache",
        });
      }
      for (let index = 0; index < counts["semantic-cache"]; index += 1) {
        const marker = letters((run + 1) * MAX_SAMPLES + index);
        probes.push({
          id: `probe-semantic-${run}-${index}`,
          text: `Urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today probe${marker}.`,
          scenario: "semantic-cache",
        });
      }
      return probes;
    },
  };
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

function resultsFrom(response: ExtensionResponse, phase: string): ReviewResult[] {
  if (!response.ok) throw new Error(`TypeSafe ${phase} request failed: ${response.error}`);
  if (!("results" in response)) throw new Error(`TypeSafe ${phase} request returned an unexpected response.`);
  return response.results;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function reviewBatches(
  posts: PostInput[],
  settings: ReturnType<typeof normalizeSettings>,
  secrets: ProviderSecrets,
  provider: JevProvider,
  phase: string,
): Promise<ReviewResult[]> {
  const results: ReviewResult[] = [];
  for (const [index, batch] of chunks(posts, MAX_BATCH_SIZE).entries()) {
    results.push(
      ...resultsFrom(await requestPostReviews(batch, settings, "timeline", secrets, provider), `${phase} ${index + 1}`),
    );
  }
  return results;
}

async function measureExtensionFootprint(directory = "dist"): Promise<ExtensionFootprint> {
  let packageBytes = 0;
  let sourceMapBytes = 0;
  let files = 0;
  async function visit(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) {
        const size = Bun.file(child).size;
        files += 1;
        if (entry.name.endsWith(".map")) sourceMapBytes += size;
        else packageBytes += size;
      }
    }
  }
  try {
    await visit(directory);
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") throw error;
  }
  return { packageBytes, sourceMapBytes, files };
}

function duration(value: number): string {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${value.toFixed(3)} ms`;
}

function bytes(value: number): string {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(2)} KiB`;
  return `${value} B`;
}

export function parseLiveBenchmarkArgs(args: string[]): LiveCliOptions {
  const options: LiveCliOptions = { samples: 24, warmRuns: 3, json: false };
  for (const argument of args) {
    if (argument === "--live-typesafe") continue;
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    const [name, rawValue] = argument.split("=", 2);
    const value = Number(rawValue);
    if (
      (name === "--samples" || name === "--posts") &&
      Number.isSafeInteger(value) &&
      value >= MIN_SAMPLES &&
      value <= MAX_SAMPLES
    ) {
      options.samples = value;
      continue;
    }
    if (name === "--warm-runs" && Number.isSafeInteger(value) && value >= 1 && value <= 20) {
      options.warmRuns = value;
      continue;
    }
    throw new Error(`Unknown or invalid live option: ${argument}`);
  }
  return options;
}

export async function runLiveTypeSafeBenchmark(options: LiveBenchmarkOptions): Promise<LiveBenchmarkResult> {
  const apiKey = options.apiKey.trim();
  if (apiKey.length < 8) throw new Error("TYPESAFE_API_KEY is missing or too short.");
  const samples = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.floor(options.samples)));
  const warmRuns = Math.max(1, Math.min(20, Math.floor(options.warmRuns)));
  const dataset = buildLiveDataset(samples);
  const baseProvider = options.provider ?? createTypeSafeProvider();
  let sdkCalls = 0;
  const provider: JevProvider = {
    ...baseProvider,
    async evaluate(request, key) {
      sdkCalls += 1;
      return baseProvider.evaluate(request, key);
    },
  };
  const settings = normalizeSettings({
    activeProvider: "typesafe",
    enabled: true,
    commentsEnabled: false,
    modelNickname: "TypeSafe live benchmark",
    strategies: [
      {
        id: "typesafe-live-benchmark",
        enabled: true,
        surfaces: ["timeline"],
        priority: 1,
        name: "Promotional content",
        prompt:
          "The post primarily promotes a product, service, referral, giveaway, financial scheme, or engagement campaign.",
        sensitivity: 50,
        hoverTemplate: "{{strategy.name}} · {{strategy.hitrate}}",
        hoverCss: "",
      },
    ],
  });
  const secrets: ProviderSecrets = { openrouter: "", "vercel-ai-gateway": "", typesafe: apiKey };
  const chromeMock = installChromeStorageMock();
  resetDecisionCacheForTests();
  try {
    const extension = options.extensionFootprint ?? (await measureExtensionFootprint());
    const cacheBefore = estimateDecisionCacheStorageForBenchmark();
    const coldStarted = Bun.nanoseconds();
    const coldResults: ReviewResult[] = [];
    for (const [index, batch] of chunks(dataset.seeds, MAX_BATCH_SIZE).entries()) {
      resetDecisionCacheForTests();
      coldResults.push(
        ...resultsFrom(await requestPostReviews(batch, settings, "timeline", secrets, provider), `cold ${index + 1}`),
      );
    }
    const coldElapsedMs = (Bun.nanoseconds() - coldStarted) / 1_000_000;
    const coldSdkCalls = sdkCalls;
    resetDecisionCacheForTests();
    const currentPolicy = await policyVersion(settings, "timeline");
    const coldById = new Map(coldResults.map((result) => [result.id, result]));
    const seedStarted = Bun.nanoseconds();
    await Promise.all(
      dataset.seeds.map((post) => {
        const result = coldById.get(post.id);
        if (!result) throw new Error(`TypeSafe cold request omitted ${post.id}.`);
        return rememberJevDecision(
          post.text,
          currentPolicy,
          result.decision,
          result.probability,
          result.details?.strategy.id,
        );
      }),
    );
    const seedElapsedMs = (Bun.nanoseconds() - seedStarted) / 1_000_000;

    const metrics = Object.fromEntries(
      LIVE_SCENARIOS.map((scenario) => [scenario, { requests: 0, expectedHits: 0, cacheHits: 0, hitRate: 0 }]),
    ) as Record<LiveScenario, ScenarioMetric>;
    const warmElapsedMs: number[] = [];
    let warmHits = 0;
    for (let run = 0; run < warmRuns; run += 1) {
      const probes = dataset.probes(run);
      const expectedById = new Map(probes.map(({ id, scenario }) => [id, scenario]));
      const warmStarted = Bun.nanoseconds();
      const warmResults = await reviewBatches(probes, settings, secrets, provider, `warm ${run + 1}`);
      warmElapsedMs.push((Bun.nanoseconds() - warmStarted) / 1_000_000);
      for (const result of warmResults) {
        const expected = expectedById.get(result.id);
        if (!expected) continue;
        const metric = metrics[expected];
        metric.requests += 1;
        if (result.source !== "jev") {
          metric.cacheHits += 1;
          warmHits += 1;
        }
        if (result.source === expected) metric.expectedHits += 1;
      }
    }
    for (const metric of Object.values(metrics)) {
      metric.hitRate = metric.requests > 0 ? metric.expectedHits / metric.requests : 0;
    }
    const warmRequests = samples * warmRuns;
    const warmAverageMs = warmElapsedMs.reduce((sum, value) => sum + value, 0) / warmRuns;
    const warmSdkCalls = sdkCalls - coldSdkCalls;
    const baselineCalls = Math.ceil(samples / MAX_BATCH_SIZE) * (warmRuns + 1);
    const sdkCallsAvoided = Math.max(0, baselineCalls - sdkCalls);
    const cacheAfter = estimateDecisionCacheStorageForBenchmark();
    const cacheDeltaBytes = Math.max(0, cacheAfter.payloadBytes - cacheBefore.payloadBytes);
    return {
      mode: "live-typesafe",
      modelId: provider.modelId,
      samples,
      scenarioCounts: dataset.scenarioCounts,
      warmRuns,
      sdkCalls,
      sdkCallsAvoided,
      sdkCallAvoidanceRate: baselineCalls > 0 ? sdkCallsAvoided / baselineCalls : 0,
      cold: { elapsedMs: coldElapsedMs, seedElapsedMs, sdkCalls: coldSdkCalls, results: coldResults },
      warm: {
        elapsedMs: warmElapsedMs,
        averageMs: warmAverageMs,
        hits: warmHits,
        requests: warmRequests,
        hitRate: warmHits / warmRequests,
        sdkCalls: warmSdkCalls,
        scenarios: metrics,
      },
      latencyReductionRate: coldElapsedMs > 0 ? (coldElapsedMs - warmAverageMs) / coldElapsedMs : 0,
      footprint: {
        extension,
        cacheBefore,
        cacheAfter,
        cacheDeltaBytes,
        combinedGrowthRate: extension.packageBytes > 0 ? cacheDeltaBytes / extension.packageBytes : 0,
      },
    };
  } finally {
    resetDecisionCacheForTests();
    chromeMock.restore();
  }
}

export function renderLiveTypeSafeBenchmark(result: LiveBenchmarkResult): string {
  const latencyRate = result.latencyReductionRate;
  const coldBlurred = result.cold.results.filter(({ decision }) => decision !== "allow").length;
  const coldAllowed = result.cold.results.length - coldBlurred;
  const coldAverageProbability =
    result.cold.results.reduce((sum, { probability }) => sum + probability, 0) / result.cold.results.length;
  const scenarioLines: Array<[string, LiveScenario]> = [
    ["🔁 Exact", "exact-cache"],
    ["🧹 Normalized", "normalized-cache"],
    ["🧩 Template", "template-cache"],
    ["🧠 Semantic", "semantic-cache"],
  ];
  return [
    "XFlow live TypeSafe cache benchmark",
    `🔴 LIVE · official @typesafe-ai/sdk · ${result.modelId}`,
    "🔒 API key loaded in memory only; never printed or persisted",
    `Workload: ${result.samples} sanitized samples · ${result.cold.sdkCalls} cold SDK batches · ${result.warmRuns} warm rounds`,
    "",
    `🌐 Cold SDK total     ${duration(result.cold.elapsedMs)} · ${result.cold.results.length} results`,
    `🧪 Cold decisions     ${coldBlurred} blur · ${coldAllowed} allow · ${percentage(coldAverageProbability)} average probability`,
    `🌱 Local cache seed   ${duration(result.cold.seedElapsedMs)}`,
    `⚡ Warm round average ${duration(result.warm.averageMs)}`,
    `✅ Warm cache hits    ${percentage(result.warm.hitRate)} ${progressBar(result.warm.hitRate)} ${result.warm.hits}/${result.warm.requests}`,
    `🚫 SDK calls avoided  ${percentage(result.sdkCallAvoidanceRate)} ${progressBar(result.sdkCallAvoidanceRate)} ${result.sdkCallsAvoided}/${result.sdkCalls + result.sdkCallsAvoided}`,
    `💚 Latency change     ${(latencyRate * 100).toFixed(2)}% ${progressBar(latencyRate)}`,
    "",
    "Traffic-type accuracy",
    ...scenarioLines.map(([label, scenario]) => {
      const metric = result.warm.scenarios[scenario];
      return `${label.padEnd(16)} ${percentage(metric.hitRate)} ${progressBar(metric.hitRate)} ${metric.expectedHits}/${metric.requests}`;
    }),
    "",
    "Extension footprint",
    `📦 Runtime assets     ${bytes(result.footprint.extension.packageBytes)} · non-map files`,
    `🗺️ Source maps        ${bytes(result.footprint.extension.sourceMapBytes)} · build-only files`,
    `🧱 Build directory    ${bytes(result.footprint.extension.packageBytes + result.footprint.extension.sourceMapBytes)} · ${result.footprint.extension.files} files total`,
    `🗃️ Cache payload      +${bytes(result.footprint.cacheDeltaBytes)} · ${result.footprint.cacheAfter.entries} records`,
    `   Exact ${result.footprint.cacheAfter.stores.exactCache.entries}/${bytes(result.footprint.cacheAfter.stores.exactCache.payloadBytes)} · Normalized ${result.footprint.cacheAfter.stores.normalizedCache.entries}/${bytes(result.footprint.cacheAfter.stores.normalizedCache.payloadBytes)}`,
    `   Template ${result.footprint.cacheAfter.stores.templateCache.entries}/${bytes(result.footprint.cacheAfter.stores.templateCache.payloadBytes)} · Semantic ${result.footprint.cacheAfter.stores.semanticCache.entries}/${bytes(result.footprint.cacheAfter.stores.semanticCache.payloadBytes)}`,
    `📈 Occupancy change   +${percentage(result.footprint.combinedGrowthRate)} ${progressBar(result.footprint.combinedGrowthRate)}`,
    "   Cache payload is a serialized IndexedDB estimate; browser filesystem overhead varies.",
    "",
    result.warm.sdkCalls === 0 && result.warm.hitRate === 1
      ? `✅ All ${result.warm.requests} probes were served locally after ${result.cold.sdkCalls} cold TypeSafe batches.`
      : `⚠️ Warm probes made ${result.warm.sdkCalls} SDK calls with ${percentage(result.warm.hitRate)} cache hits.`,
  ].join("\n");
}

if (import.meta.main) {
  const cli = parseLiveBenchmarkArgs(Bun.argv.slice(2));
  const apiKey = process.env.TYPESAFE_API_KEY ?? "";
  const result = await runLiveTypeSafeBenchmark({ apiKey, samples: cli.samples, warmRuns: cli.warmRuns });
  console.log(cli.json ? JSON.stringify(result, null, 2) : renderLiveTypeSafeBenchmark(result));
  const allExpectedLayersHit = Object.values(result.warm.scenarios).every(({ hitRate }) => hitRate === 1);
  if (result.warm.sdkCalls !== 0 || result.warm.hitRate !== 1 || !allExpectedLayersHit) process.exitCode = 1;
}

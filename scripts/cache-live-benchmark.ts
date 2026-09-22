import { createTypeSafeProvider } from "../src/background/jev/providers/typesafe";
import type { JevProvider } from "../src/background/jev/types";
import { resetDecisionCacheForTests } from "../src/background/services/decision-cache";
import { requestPostReviews } from "../src/background/services/jev";
import {
  normalizeSettings,
  type ExtensionResponse,
  type PostInput,
  type ProviderSecrets,
  type ReviewResult,
} from "../src/shared";
import { percentage, progressBar } from "./cache-benchmark-lib";

export interface LiveBenchmarkOptions {
  apiKey: string;
  posts: number;
  warmRuns: number;
  provider?: JevProvider;
}

export interface LiveBenchmarkResult {
  mode: "live-typesafe";
  modelId: string;
  posts: number;
  warmRuns: number;
  sdkCalls: number;
  sdkCallsAvoided: number;
  sdkCallAvoidanceRate: number;
  cold: {
    elapsedMs: number;
    results: ReviewResult[];
  };
  warm: {
    elapsedMs: number[];
    averageMs: number;
    hits: number;
    requests: number;
    hitRate: number;
  };
  latencyReductionRate: number;
}

interface LiveCliOptions {
  posts: number;
  warmRuns: number;
  json: boolean;
}

const LIVE_POSTS: PostInput[] = [
  {
    id: "live-1",
    text: "Limited-time crypto giveaway: claim a guaranteed bonus from this promotional campaign.",
  },
  {
    id: "live-2",
    text: "I took a quiet walk through the park this morning and photographed the autumn leaves.",
  },
  {
    id: "live-3",
    text: "Sponsored product launch with an affiliate discount link and a call to buy today.",
  },
  {
    id: "live-4",
    text: "A concise summary of today's software release notes and compatibility changes.",
  },
  {
    id: "live-5",
    text: "Earn rewards immediately by joining this referral promotion before the offer expires.",
  },
];

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

function duration(value: number): string {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${value.toFixed(3)} ms`;
}

export function parseLiveBenchmarkArgs(args: string[]): LiveCliOptions {
  const options: LiveCliOptions = { posts: 3, warmRuns: 3, json: false };
  for (const argument of args) {
    if (argument === "--live-typesafe") continue;
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    const [name, rawValue] = argument.split("=", 2);
    const value = Number(rawValue);
    if (name === "--posts" && Number.isSafeInteger(value) && value >= 1 && value <= LIVE_POSTS.length) {
      options.posts = value;
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
  const posts = LIVE_POSTS.slice(0, Math.max(1, Math.min(LIVE_POSTS.length, Math.floor(options.posts))));
  const warmRuns = Math.max(1, Math.min(20, Math.floor(options.warmRuns)));
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
    const coldStarted = Bun.nanoseconds();
    const coldResponse = await requestPostReviews(posts, settings, "timeline", secrets, provider);
    const coldElapsedMs = (Bun.nanoseconds() - coldStarted) / 1_000_000;
    const coldResults = resultsFrom(coldResponse, "cold");
    const warmElapsedMs: number[] = [];
    let warmHits = 0;
    for (let run = 0; run < warmRuns; run += 1) {
      const warmStarted = Bun.nanoseconds();
      const warmResponse = await requestPostReviews(posts, settings, "timeline", secrets, provider);
      warmElapsedMs.push((Bun.nanoseconds() - warmStarted) / 1_000_000);
      const warmResults = resultsFrom(warmResponse, "warm");
      warmHits += warmResults.filter(({ source }) => source !== "jev").length;
    }
    const warmRequests = posts.length * warmRuns;
    const warmAverageMs = warmElapsedMs.reduce((sum, value) => sum + value, 0) / warmRuns;
    const totalRounds = warmRuns + 1;
    const sdkCallsAvoided = totalRounds - sdkCalls;
    return {
      mode: "live-typesafe",
      modelId: provider.modelId,
      posts: posts.length,
      warmRuns,
      sdkCalls,
      sdkCallsAvoided,
      sdkCallAvoidanceRate: sdkCallsAvoided / totalRounds,
      cold: { elapsedMs: coldElapsedMs, results: coldResults },
      warm: {
        elapsedMs: warmElapsedMs,
        averageMs: warmAverageMs,
        hits: warmHits,
        requests: warmRequests,
        hitRate: warmHits / warmRequests,
      },
      latencyReductionRate: coldElapsedMs > 0 ? (coldElapsedMs - warmAverageMs) / coldElapsedMs : 0,
    };
  } finally {
    resetDecisionCacheForTests();
    chromeMock.restore();
  }
}

export function renderLiveTypeSafeBenchmark(result: LiveBenchmarkResult): string {
  const latencyRate = result.latencyReductionRate;
  return [
    "XFlow live TypeSafe cache benchmark",
    `🔴 LIVE · official @typesafe-ai/sdk · ${result.modelId}`,
    "🔒 API key loaded in memory only; never printed or persisted",
    `Workload: ${result.posts} posts · 1 cold round · ${result.warmRuns} warm rounds`,
    "",
    `🌐 Cold SDK batch     ${duration(result.cold.elapsedMs)} · ${result.cold.results.length} results`,
    `⚡ Warm cache average ${duration(result.warm.averageMs)}`,
    `✅ Warm hit rate      ${percentage(result.warm.hitRate)} ${progressBar(result.warm.hitRate)} ${result.warm.hits}/${result.warm.requests}`,
    `🚫 SDK calls avoided  ${percentage(result.sdkCallAvoidanceRate)} ${progressBar(result.sdkCallAvoidanceRate)} ${result.sdkCallsAvoided}/${result.warmRuns + 1}`,
    `💚 Latency change     ${(latencyRate * 100).toFixed(1)}% ${progressBar(latencyRate)}`,
    "",
    "Cold TypeSafe results",
    ...result.cold.results.map(
      ({ id, probability, decision, source }) =>
        `  ${decision === "allow" ? "🟢" : "🟠"} ${id}: ${(probability * 100).toFixed(1)}% · ${decision} · ${source}`,
    ),
    "",
    result.sdkCalls === 1 && result.warm.hitRate === 1
      ? "✅ The cold round used TypeSafe once; every warm request was served locally."
      : `⚠️ Observed ${result.sdkCalls} SDK calls and ${percentage(result.warm.hitRate)} warm hits.`,
  ].join("\n");
}

if (import.meta.main) {
  const cli = parseLiveBenchmarkArgs(Bun.argv.slice(2));
  const apiKey = process.env.TYPESAFE_API_KEY ?? "";
  const result = await runLiveTypeSafeBenchmark({ apiKey, posts: cli.posts, warmRuns: cli.warmRuns });
  console.log(cli.json ? JSON.stringify(result, null, 2) : renderLiveTypeSafeBenchmark(result));
  if (result.sdkCalls !== 1 || result.warm.hitRate !== 1) process.exitCode = 1;
}

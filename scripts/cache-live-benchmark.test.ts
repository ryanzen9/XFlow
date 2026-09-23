import { describe, expect, test } from "bun:test";
import { createTypeSafeProvider } from "../src/background/jev/providers/typesafe";
import {
  buildLiveDataset,
  parseLiveBenchmarkArgs,
  renderLiveTypeSafeProgress,
  renderLiveTypeSafeBenchmark,
  runLiveTypeSafeBenchmark,
  type LiveBenchmarkProgress,
} from "./cache-live-benchmark";

function fixtureProvider(onNetworkCall?: () => void) {
  const providerFetch = (async (_input, init) => {
    onNetworkCall?.();
    const body = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    return Response.json({
      model: "jev-latest",
      answers: Object.fromEntries(Object.keys(body.questions).map((id) => [id, { type: "noul", noul: 0.97 }])),
      usage: { input_tokens: 120, output_tokens: 20 },
    });
  }) as typeof fetch;
  return createTypeSafeProvider(providerFetch);
}

describe("live TypeSafe cache benchmark", () => {
  test("uses 20 sanitized samples across all four cache traffic types", () => {
    const dataset = buildLiveDataset(20);
    const maximumDataset = buildLiveDataset(50);
    expect(dataset.seeds).toHaveLength(20);
    expect(dataset.probes(0)).toHaveLength(20);
    expect(dataset.scenarioCounts).toEqual({
      "exact-cache": 5,
      "normalized-cache": 5,
      "template-cache": 5,
      "semantic-cache": 5,
    });
    expect(new Set(dataset.probes(0).map(({ scenario }) => scenario))).toEqual(
      new Set(["exact-cache", "normalized-cache", "template-cache", "semantic-cache"]),
    );
    expect(new Set(dataset.probes(0).map(({ contentType }) => contentType)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(dataset.seeds.map(({ text }) => text)).size).toBe(dataset.seeds.length);
    expect(dataset.seeds.some(({ text }) => /[\u3400-\u9fff]/u.test(text))).toBe(true);
    expect(dataset.seeds.some(({ text }) => /\bEl\b|\bAviso\b/u.test(text))).toBe(true);
    expect(maximumDataset.seeds).toHaveLength(50);
    expect(maximumDataset.probes(19)).toHaveLength(50);
    expect(maximumDataset.scenarioCounts).toEqual({
      "exact-cache": 13,
      "normalized-cache": 13,
      "template-cache": 12,
      "semantic-cache": 12,
    });
  });

  test("uses the official SDK only for cold batches and attributes every warm cache layer", async () => {
    let networkCalls = 0;
    const progress: LiveBenchmarkProgress[] = [];
    const result = await runLiveTypeSafeBenchmark({
      apiKey: "fixture-typesafe-key",
      samples: 20,
      warmRuns: 3,
      provider: fixtureProvider(() => {
        networkCalls += 1;
      }),
      extensionFootprint: { packageBytes: 2_000_000, sourceMapBytes: 8_000_000, files: 12 },
      onProgress: (snapshot) => progress.push(snapshot),
    });

    expect(networkCalls).toBe(4);
    expect(result.sdkCalls).toBe(4);
    expect(result.cold).toMatchObject({ sdkCalls: 4 });
    expect(result.sdkCallsAvoided).toBe(12);
    expect(result.warm).toMatchObject({ hits: 60, requests: 60, hitRate: 1, sdkCalls: 0 });
    expect(Object.values(result.warm.scenarios).map(({ hitRate }) => hitRate)).toEqual([1, 1, 1, 1]);
    expect(result.footprint.cacheDeltaBytes).toBeGreaterThan(0);
    expect(result.footprint.cacheAfter.entries).toBeGreaterThanOrEqual(60);
    expect(result.footprint.combinedGrowthRate).toBeGreaterThan(0);
    expect(progress.map(({ stage }) => stage)).toContain("cold");
    expect(progress.map(({ stage }) => stage)).toContain("seed");
    expect(progress.map(({ stage }) => stage)).toContain("warm");
    expect(progress.at(-1)).toMatchObject({ stage: "complete", warmCompleted: 60, warmHits: 60 });
    expect(progress.some(({ inFlightSdkCalls }) => inFlightSdkCalls > 0)).toBe(true);
    expect(progress.filter(({ stage }) => stage === "warm")).toHaveLength(12);
    expect(renderLiveTypeSafeProgress(progress.at(-1)!, 12_500)).toContain("Warm cache hits: 100.0%");
  });

  test("never renders the API key and shows performance, traffic and footprint metrics", async () => {
    const secret = "fixture-never-render-this-key";
    const report = renderLiveTypeSafeBenchmark(
      await runLiveTypeSafeBenchmark({
        apiKey: secret,
        samples: 20,
        warmRuns: 1,
        provider: fixtureProvider(),
        extensionFootprint: { packageBytes: 2_000_000, sourceMapBytes: 8_000_000, files: 12 },
      }),
    );
    expect(report).not.toContain(secret);
    expect(report).toContain("🔴 LIVE");
    expect(report).toContain("✅ Warm cache hits    100.0%");
    expect(report).toContain("🔁 Exact");
    expect(report).toContain("🧹 Normalized");
    expect(report).toContain("🧩 Template");
    expect(report).toContain("🧠 Semantic");
    expect(report).toContain("Extension footprint");
    expect(report).toContain("Cache payload");
  });

  test("requires a plausible key and validates the 20–50 sample boundary", async () => {
    await expect(runLiveTypeSafeBenchmark({ apiKey: "", samples: 20, warmRuns: 1 })).rejects.toThrow(
      "TYPESAFE_API_KEY",
    );
    expect(parseLiveBenchmarkArgs(["--live-typesafe", "--samples=50", "--warm-runs=4", "--json"])).toEqual({
      samples: 50,
      warmRuns: 4,
      json: true,
    });
    expect(parseLiveBenchmarkArgs(["--posts=20"])).toMatchObject({ samples: 20 });
    expect(() => parseLiveBenchmarkArgs(["--samples=19"])).toThrow("Unknown or invalid live option");
    expect(() => parseLiveBenchmarkArgs(["--samples=51"])).toThrow("Unknown or invalid live option");
    expect(() => parseLiveBenchmarkArgs(["--key=secret"])).toThrow("Unknown or invalid live option");
  });
});

import { describe, expect, test } from "bun:test";
import { createTypeSafeProvider } from "../src/background/jev/providers/typesafe";
import {
  buildLiveDataset,
  parseLiveBenchmarkArgs,
  renderLiveTypeSafeBenchmark,
  runLiveTypeSafeBenchmark,
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
    const result = await runLiveTypeSafeBenchmark({
      apiKey: "fixture-typesafe-key",
      samples: 20,
      warmRuns: 3,
      provider: fixtureProvider(() => {
        networkCalls += 1;
      }),
      extensionFootprint: { packageBytes: 2_000_000, sourceMapBytes: 8_000_000, files: 12 },
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

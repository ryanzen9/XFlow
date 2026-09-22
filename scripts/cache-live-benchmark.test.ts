import { describe, expect, test } from "bun:test";
import { createTypeSafeProvider } from "../src/background/jev/providers/typesafe";
import { parseLiveBenchmarkArgs, renderLiveTypeSafeBenchmark, runLiveTypeSafeBenchmark } from "./cache-live-benchmark";

describe("live TypeSafe cache benchmark", () => {
  test("uses the official SDK once and serves every warm request from cache", async () => {
    let networkCalls = 0;
    const providerFetch = (async (_input, init) => {
      networkCalls += 1;
      const body = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      return Response.json({
        model: "jev-latest",
        answers: Object.fromEntries(
          Object.keys(body.questions).map((id) => [id, { type: "noul", noul: id.endsWith("_0") ? 0.91 : 0.12 }]),
        ),
        usage: { input_tokens: 24, output_tokens: 4 },
      });
    }) as typeof fetch;

    const result = await runLiveTypeSafeBenchmark({
      apiKey: "typesafe-test-secret",
      posts: 2,
      warmRuns: 3,
      provider: createTypeSafeProvider(providerFetch),
    });

    expect(networkCalls).toBe(1);
    expect(result.sdkCalls).toBe(1);
    expect(result.sdkCallsAvoided).toBe(3);
    expect(result.warm).toMatchObject({ hits: 6, requests: 6, hitRate: 1 });
    expect(result.cold.results.map(({ source }) => source)).toEqual(["jev", "jev"]);
  });

  test("never renders the API key and shows live metrics visually", async () => {
    const secret = "typesafe-never-render-this-key";
    const providerFetch = (async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      return Response.json({
        model: "jev-latest",
        answers: Object.fromEntries(Object.keys(body.questions).map((id) => [id, { type: "noul", noul: 0.88 }])),
        usage: { input_tokens: 12, output_tokens: 2 },
      });
    }) as typeof fetch;
    const report = renderLiveTypeSafeBenchmark(
      await runLiveTypeSafeBenchmark({
        apiKey: secret,
        posts: 1,
        warmRuns: 1,
        provider: createTypeSafeProvider(providerFetch),
      }),
    );
    expect(report).not.toContain(secret);
    expect(report).toContain("🔴 LIVE");
    expect(report).toContain("✅ Warm hit rate      100.0%");
    expect(report).toContain("🚫 SDK calls avoided");
  });

  test("requires a plausible key and validates bounded live options", async () => {
    await expect(runLiveTypeSafeBenchmark({ apiKey: "", posts: 1, warmRuns: 1 })).rejects.toThrow("TYPESAFE_API_KEY");
    expect(parseLiveBenchmarkArgs(["--live-typesafe", "--posts=5", "--warm-runs=4", "--json"])).toEqual({
      posts: 5,
      warmRuns: 4,
      json: true,
    });
    expect(() => parseLiveBenchmarkArgs(["--posts=6"])).toThrow("Unknown or invalid live option");
    expect(() => parseLiveBenchmarkArgs(["--key=secret"])).toThrow("Unknown or invalid live option");
  });
});

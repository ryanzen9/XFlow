import { describe, expect, test } from "bun:test";
import {
  buildBenchmarkQueries,
  percentage,
  progressBar,
  renderCacheBenchmark,
  runCacheBenchmark,
} from "./cache-benchmark-lib";
import { parseCacheBenchmarkArgs } from "./cache-benchmark";

describe("cache benchmark report", () => {
  test("builds a deterministic 80/20 hit-and-miss workload", () => {
    const queries = buildBenchmarkQueries(100);
    expect(queries).toHaveLength(100);
    expect(queries.filter(({ expected }) => expected === "exact-cache")).toHaveLength(35);
    expect(queries.filter(({ expected }) => expected === "normalized-cache")).toHaveLength(20);
    expect(queries.filter(({ expected }) => expected === "template-cache")).toHaveLength(15);
    expect(queries.filter(({ expected }) => expected === "semantic-cache")).toHaveLength(10);
    expect(queries.filter(({ expected }) => expected === "miss")).toHaveLength(20);
    expect(buildBenchmarkQueries(100)).toEqual(queries);
  });

  test("measures every intended cache layer without making network requests", async () => {
    const result = await runCacheBenchmark({ requests: 100, providerLatencyMs: 500 });
    expect(result.counts).toEqual(result.expectedCounts);
    expect(result.mismatches).toBe(0);
    expect(result.hitRate).toBe(0.8);
    expect(result.providerCallRate).toBe(0.2);
    expect(result.modeled.withoutCacheMs).toBe(50_000);
    expect(result.modeled.withCacheMs).toBeLessThan(result.modeled.withoutCacheMs);
    expect(result.measured.averageLookupMs).toBeGreaterThanOrEqual(0);
  });

  test("renders percentages, icons and progress bars", async () => {
    const report = renderCacheBenchmark(await runCacheBenchmark({ requests: 100, providerLatencyMs: 500 }));
    expect(report).toContain("✅ Cache hit rate   80.0%");
    expect(report).toContain(progressBar(0.8));
    expect(report).toContain("⚡ Exact");
    expect(report).toContain("🧠 Semantic");
    expect(report).toContain("💚 Latency reduction");
  });

  test("clamps visual helpers and validates CLI options", () => {
    expect(percentage(1.5)).toBe("100.0%");
    expect(progressBar(-1, 4)).toBe("[░░░░]");
    expect(progressBar(0.5, 4)).toBe("[██░░]");
    expect(parseCacheBenchmarkArgs(["--requests=250", "--jev-latency-ms=750", "--json"])).toEqual({
      requests: 250,
      providerLatencyMs: 750,
      json: true,
    });
    expect(() => parseCacheBenchmarkArgs(["--requests=2"])).toThrow("Unknown or invalid option");
  });
});

import { describe, expect, test } from "bun:test";
import { compileHoverCss } from "./hover-css";
import {
  defaultStrategy,
  normalizeSettings,
  normalizeStrategy,
  renderHoverText,
  reindexStrategies,
  strategiesFor,
  strategyThreshold,
  validateTemplate,
} from "./strategy";

describe("strategy configuration", () => {
  test("migrates the former Home and comment settings into two prioritized strategies", () => {
    const settings = normalizeSettings({
      activeProvider: "typesafe",
      enabled: false,
      commentsEnabled: true,
      homeStrategy: { name: "Old Home", sensitivity: 80 },
      commentsStrategy: { name: "Old comments", sensitivity: 25 },
    });
    expect(settings.activeProvider).toBe("typesafe");
    expect(settings.enabled).toBe(false);
    expect(settings.commentsEnabled).toBe(true);
    expect(settings.strategies.map(({ name, priority, surfaces }) => ({ name, priority, surfaces }))).toEqual([
      { name: "Old Home", priority: 1, surfaces: ["timeline"] },
      { name: "Old comments", priority: 1, surfaces: ["comments"] },
    ]);
    expect(strategyThreshold(settings.strategies[0]!)).toBe(0.2);
  });

  test("splits shared strategies and independently reindexes each surface table", () => {
    const settings = normalizeSettings({
      strategies: [
        { id: "low", name: "Low", priority: 9, enabled: true, surfaces: ["timeline"], prompt: "low" },
        { id: "high", name: "High", priority: 2, enabled: true, surfaces: ["timeline", "comments"], prompt: "high" },
        { id: "paused", name: "Paused", priority: 1, enabled: false, surfaces: ["timeline"], prompt: "paused" },
      ],
    });
    expect(settings.strategies.map((strategy) => [strategy.id, strategy.priority])).toEqual([
      ["paused", 1],
      ["high-timeline", 2],
      ["low", 3],
      ["high-comments", 1],
    ]);
    expect(strategiesFor(settings, "timeline").map((strategy) => strategy.id)).toEqual(["high-timeline", "low"]);
    expect(strategiesFor(settings, "comments").map((strategy) => strategy.id)).toEqual(["high-comments"]);
    expect(
      reindexStrategies([settings.strategies[2]!, settings.strategies[3]!, settings.strategies[1]!]).map(
        (strategy) => strategy.priority,
      ),
    ).toEqual([1, 1, 2]);
  });

  test("keeps sensitivity monotonic and empty strategy collections intentional", () => {
    expect(strategyThreshold(normalizeStrategy({ sensitivity: 90 }, "all"))).toBe(0.1);
    expect(strategyThreshold(normalizeStrategy({ sensitivity: 20 }, "all"))).toBe(0.8);
    expect(normalizeStrategy({ sensitivity: NaN }, "all").sensitivity).toBe(70);
    expect(normalizeStrategy({ sensitivity: 999 }, "all").sensitivity).toBe(100);
    expect(normalizeSettings({ strategies: [] }).strategies).toEqual([]);
    expect(normalizeSettings({ theme: "dark", strategies: [] }).theme).toBe("dark");
    expect(normalizeSettings({ theme: "system", strategies: [] }).theme).toBe("light");
  });

  test("renders final match data while rejecting unknown variables", () => {
    const strategy = {
      ...defaultStrategy("comments"),
      name: "广告评论",
      hoverTemplate:
        "{{strategy.name}} / {{strategy.hitrate}} / {{strategy.threshold}} / {{model.nickname}} / {{surface}}",
    };
    expect(
      renderHoverText({ strategy, surface: "comments", modelNickname: "My model", modelId: "jev-latest" }, 0.864),
    ).toBe("广告评论 / 86% / 30% / My model / 评论区");
    expect(validateTemplate("{{model.key}}")).not.toBeNull();
    expect(validateTemplate("{{strategy.name}")).not.toBeNull();
    expect(validateTemplate(strategy.hoverTemplate)).toBeNull();
  });
});

describe("scoped hover CSS", () => {
  test("supports visual rules and numerical variables with a unique scope", () => {
    const result = compileHoverCss(
      ".label { color: #0a7776; font-size: calc(12px + var(--hitrate) * 4px); } .veil { background: rgba(10, 119, 118, 0.2); }",
      "#test-veil",
    );
    expect(result.error).toBeNull();
    expect(result.css).toContain("#test-veil .xfilter-veil:is(:hover,:focus-visible) .xfilter-veil__label-rate");
    expect(result.css).toContain("#test-veil .xfilter-veil:is(:hover,:focus-visible)::before");
  });

  test("rejects escape routes, layout mutation and external resources", () => {
    for (const source of [
      "body { color: red; }",
      "toString { color: red; }",
      ".label { position: fixed; }",
      ".veil { background: url(https://example.com/track); }",
      "@import 'remote.css';",
      ".label { color: red !important; }",
      ".label { color: var(--page-secret); }",
      ".label { color: red; } </style>",
      ".label { color: r\\65d; }",
      ".label { color: red;",
    ]) {
      const result = compileHoverCss(source, "#test-veil");
      expect(result.error).not.toBeNull();
      expect(result.css).toBe("");
    }
  });
});

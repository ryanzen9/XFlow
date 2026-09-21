import { describe, expect, test } from "bun:test";
import {
  jaccardSimilarity,
  mergeUserKnowledge,
  normalizeContent,
  policyVersion,
  semanticTokens,
  templateContent,
  type UserDecisionRecord,
} from "./content-decision";
import { normalizeSettings } from "./strategy";

describe("content decision primitives", () => {
  test("normalizes harmless presentation differences without erasing important signs", () => {
    expect(normalizeContent("ＢＴＣ +10%！！！\nhttps://example.com/a?utm_source=x&id=7#top")).toBe(
      "btc +10%! https://example.com/a?id=7",
    );
    expect(normalizeContent("BTC +10%")).not.toBe(normalizeContent("BTC -10%"));
  });

  test("creates reusable templates for ticker and number variants", () => {
    expect(templateContent("Get $DOGE now! 100X opportunity")).toBe(templateContent("Get $PEPE now! 50X opportunity"));
  });

  test("isolates fingerprints when a policy changes", async () => {
    const first = normalizeSettings({ strategies: [{ id: "spam", surfaces: ["timeline"], prompt: "ads" }] });
    const second = normalizeSettings({ strategies: [{ id: "spam", surfaces: ["timeline"], prompt: "scams" }] });
    expect(await policyVersion(first, "timeline")).not.toBe(await policyVersion(second, "timeline"));
  });

  test("merges synchronized user decisions by id with deterministic last-write-wins", () => {
    const base: UserDecisionRecord = {
      id: "timeline:content:one",
      scope: "content",
      surface: "timeline",
      policyId: "timeline",
      contentHash: "one",
      normalizedContent: "one",
      semanticTokens: ["one"],
      decision: "blur",
      createdAt: 1,
      updatedAt: 2,
      deviceId: "a",
    };
    const merged = mergeUserKnowledge(
      { userDecisions: [base] },
      {
        userDecisions: [
          { ...base, decision: "allow", updatedAt: 3, deviceId: "b" },
          { ...base, id: "timeline:content:two", contentHash: "two" },
        ],
      },
    );
    expect(merged.userDecisions).toHaveLength(2);
    expect(merged.userDecisions.find(({ id }) => id.endsWith("one"))?.decision).toBe("allow");
  });

  test("computes bounded semantic similarity", () => {
    expect(jaccardSimilarity(semanticTokens("limited offer bonus"), semanticTokens("limited offer bonus"))).toBe(1);
    expect(jaccardSimilarity(semanticTokens("limited offer bonus"), semanticTokens("family photo today"))).toBe(0);
  });
});

import { expect, test } from "bun:test";
import { JEV_REQUEST_LOG_LIMIT, normalizeJevRequestLogData } from "./jev-request-log";

const now = new Date(2026, 8, 30, 12).getTime();

function entry(index: number, requestedAt = now - index) {
  return {
    id: `request-${index}`,
    kind: "review",
    requestedAt,
    durationMs: index,
    providerId: "openrouter",
    modelId: "typesafe/jev-1.13",
    status: "success",
    itemCount: 2,
    questionCount: 4,
    apiKey: "must-not-survive-normalization",
    content: "must-not-survive-normalization",
  };
}

test("normalizes Jev request metadata without retaining secrets or content", () => {
  const data = normalizeJevRequestLogData({ entries: [entry(1)] }, now);

  expect(data.entries).toEqual([
    {
      id: "request-1",
      kind: "review",
      requestedAt: now - 1,
      durationMs: 1,
      providerId: "openrouter",
      modelId: "typesafe/jev-1.13",
      status: "success",
      itemCount: 2,
      questionCount: 4,
      surface: undefined,
      errorCode: undefined,
    },
  ]);
  expect(JSON.stringify(data)).not.toContain("must-not-survive");
});

test("keeps only the newest bounded 30-day request history", () => {
  const old = now - 31 * 24 * 60 * 60 * 1_000;
  const entries = Array.from({ length: JEV_REQUEST_LOG_LIMIT + 10 }, (_, index) => entry(index));
  const data = normalizeJevRequestLogData({ entries: [...entries, entry(999, old)] }, now);

  expect(data.entries).toHaveLength(JEV_REQUEST_LOG_LIMIT);
  expect(data.entries[0]?.id).toBe("request-0");
  expect(data.entries.some(({ id }) => id === "request-999")).toBeFalse();
});

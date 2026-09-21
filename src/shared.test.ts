import { describe, expect, test } from "bun:test";
import {
  clampProbability,
  formatProbability,
  getConversationPostId,
  getFilterSurface,
  isFilterablePostOnSurface,
  isHomeTimeline,
  probabilityFromAnswer,
  sanitizePost,
} from "./shared";

describe("home timeline detection", () => {
  test("accepts only supported home timeline URLs", () => {
    expect(isHomeTimeline("https://x.com/home")).toBe(true);
    expect(isHomeTimeline("https://twitter.com/home/")).toBe(true);
    expect(isHomeTimeline("https://x.com/someone/status/123")).toBe(false);
    expect(isHomeTimeline("https://example.com/home")).toBe(false);
  });

  test("detects conversation routes and keeps the root post id", () => {
    expect(getFilterSurface("https://x.com/someone/status/123?ref=home")).toBe("comments");
    expect(getFilterSurface("https://twitter.com/someone/status/456/")).toBe("comments");
    expect(getConversationPostId("https://x.com/someone/status/123")).toBe("123");
    expect(getConversationPostId("https://x.com/home")).toBeNull();
    expect(getFilterSurface("https://example.com/someone/status/123")).toBeNull();
    expect(isFilterablePostOnSurface("comments", "123", "https://x.com/someone/status/123")).toBe(false);
    expect(isFilterablePostOnSurface("comments", "456", "https://x.com/someone/status/123")).toBe(true);
  });
});

describe("probability helpers", () => {
  test("reads and clamps Jev noul answers", () => {
    expect(probabilityFromAnswer({ type: "noul", noul: 0.734 })).toBe(0.734);
    expect(probabilityFromAnswer({ type: "noul", noul: 4 })).toBe(1);
    expect(probabilityFromAnswer({ type: "choice", choice: "yes" })).toBe(0);
    expect(clampProbability(-1)).toBe(0);
  });

  test("formats a readable percentage", () => {
    expect(formatProbability(0.734)).toBe("73%");
  });
});

describe("post sanitization", () => {
  test("normalizes whitespace and rejects empty content", () => {
    expect(sanitizePost({ id: " 42 ", text: "hello\n  world" })).toEqual({ id: "42", text: "hello world" });
    expect(sanitizePost({ id: "42", text: "hello", authorId: " @ExampleUser " })).toEqual({
      id: "42",
      text: "hello",
      authorId: "ExampleUser",
    });
    expect(sanitizePost({ id: "42", text: "   " })).toBeNull();
  });
});

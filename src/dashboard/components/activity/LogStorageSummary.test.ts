import { expect, test } from "bun:test";
import { formatBytes } from "./LogStorageSummary";

test("formats activity storage usage at a readable scale", () => {
  expect(formatBytes(0, "en")).toBe("0 B");
  expect(formatBytes(1536, "en")).toBe("1.5 KB");
  expect(formatBytes(10 * 1024 * 1024, "en")).toBe("10 MB");
});

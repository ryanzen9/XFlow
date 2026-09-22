import { expect, test } from "bun:test";
import { updateLocalizedPreviewSample } from "./StrategyPreview";

test("updates only an untouched localized preview sample", () => {
  expect(updateLocalizedPreviewSample("中文默认", "中文默认", "English default")).toBe("English default");
  expect(updateLocalizedPreviewSample("用户自定义", "中文默认", "English default")).toBe("用户自定义");
});

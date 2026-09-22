import { afterAll, expect, test } from "bun:test";
import { ProviderCredentialError, loadProviderSummaries } from "./provider-credentials";

const originalChrome = globalThis.chrome;

afterAll(() => {
  globalThis.chrome = originalChrome;
});

test("exposes locale-neutral provider error codes", async () => {
  globalThis.chrome = {
    runtime: {
      sendMessage: async () => ({ ok: false, code: "FORBIDDEN", error: "只有扩展页面可以管理 API Key。" }),
    },
  } as unknown as typeof chrome;

  try {
    await loadProviderSummaries();
    throw new Error("Expected loadProviderSummaries to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderCredentialError);
    expect((error as ProviderCredentialError).code).toBe("FORBIDDEN");
    expect((error as Error).message).toBe("FORBIDDEN");
  }
});

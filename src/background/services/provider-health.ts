import type { ProviderHealthResult, ProviderId, ProviderSecrets } from "../../shared";
import { providerErrorCode } from "../jev/errors";
import { getJevProvider } from "../jev/provider-registry";
import type { JevDecisionRequest, JevProvider } from "../jev/types";
import { recordJevRequest } from "./jev-request-log";

const HEALTH_REQUEST: JevDecisionRequest = {
  state: {
    description: "XFlow provider connectivity health check.",
    sample: "This request verifies that the configured API Key can reach the Jev evaluation endpoint.",
  },
  questions: {
    health_check: {
      instructions: "Confirm that this is a connectivity health-check request.",
      criteria: { true: "This is a health check.", false: "This is not a health check." },
    },
  },
};

async function safelyRecord(entry: Parameters<typeof recordJevRequest>[0]): Promise<void> {
  try {
    await recordJevRequest(entry);
  } catch (error) {
    console.warn("[XFlow] Jev request log persistence failed.", error);
  }
}

export async function checkProviderHealth(
  providerId: ProviderId,
  secrets: ProviderSecrets,
  providerOverride?: JevProvider,
  now = () => Date.now(),
): Promise<ProviderHealthResult> {
  const provider = providerOverride ?? getJevProvider(providerId);
  const requestedAt = now();
  try {
    const answers = await provider.evaluate(HEALTH_REQUEST, secrets[providerId]);
    if (!Number.isFinite(answers.health_check)) {
      const latencyMs = Math.max(0, now() - requestedAt);
      await safelyRecord({
        kind: "health-check",
        requestedAt,
        durationMs: latencyMs,
        providerId,
        modelId: provider.modelId,
        status: "error",
        itemCount: 1,
        questionCount: 1,
        errorCode: "invalid-response",
      });
      return { providerId, healthy: false, checkedAt: requestedAt, latencyMs, errorCode: "invalid-response" };
    }
    const latencyMs = Math.max(0, now() - requestedAt);
    await safelyRecord({
      kind: "health-check",
      requestedAt,
      durationMs: latencyMs,
      providerId,
      modelId: provider.modelId,
      status: "success",
      itemCount: 1,
      questionCount: 1,
    });
    return { providerId, healthy: true, checkedAt: requestedAt, latencyMs };
  } catch (error) {
    const latencyMs = Math.max(0, now() - requestedAt);
    const errorCode = providerErrorCode(error);
    await safelyRecord({
      kind: "health-check",
      requestedAt,
      durationMs: latencyMs,
      providerId,
      modelId: provider.modelId,
      status: "error",
      itemCount: 1,
      questionCount: 1,
      errorCode,
    });
    return { providerId, healthy: false, checkedAt: requestedAt, latencyMs, errorCode };
  }
}

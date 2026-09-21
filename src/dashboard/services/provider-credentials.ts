import type { ExtensionRequest, ExtensionResponse, ProviderId, ProviderSummary } from "../../shared";

async function send(request: ExtensionRequest): Promise<ProviderSummary[]> {
  const response = (await chrome.runtime.sendMessage(request)) as ExtensionResponse;
  if (!response.ok) throw new Error(response.error);
  if (!("providerSummaries" in response)) throw new Error("扩展后台返回了无效的渠道状态。");
  return response.providerSummaries;
}

export function loadProviderSummaries(): Promise<ProviderSummary[]> {
  return send({ type: "GET_PROVIDER_SUMMARIES" });
}

export function saveProviderCredential(providerId: ProviderId, apiKey: string): Promise<ProviderSummary[]> {
  return send({ type: "SAVE_PROVIDER_KEY", providerId, apiKey });
}

export function clearProviderCredential(providerId: ProviderId): Promise<ProviderSummary[]> {
  return send({ type: "CLEAR_PROVIDER_KEY", providerId });
}

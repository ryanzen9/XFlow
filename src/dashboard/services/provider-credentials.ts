import type {
  ExtensionErrorCode,
  ExtensionRequest,
  ExtensionResponse,
  ProviderId,
  ProviderSummary,
} from "../../shared";

export class ProviderCredentialError extends Error {
  constructor(readonly code: ExtensionErrorCode) {
    super(code);
    this.name = "ProviderCredentialError";
  }
}

async function send(request: ExtensionRequest): Promise<ProviderSummary[]> {
  const response = (await chrome.runtime.sendMessage(request)) as ExtensionResponse;
  if (!response.ok) throw new ProviderCredentialError(response.code);
  if (!("providerSummaries" in response)) throw new ProviderCredentialError("API_ERROR");
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

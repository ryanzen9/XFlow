import type { VeilDetails } from "./strategy";
import type { ProviderId, ProviderSummary } from "./providers";

export interface PostInput {
  id: string;
  text: string;
}

export interface ReviewResult {
  id: string;
  probability: number;
  details?: VeilDetails;
}

export type FilterSurface = "timeline" | "comments";

export interface ExtensionStatus {
  configured: boolean;
  enabled: boolean;
  commentsEnabled: boolean;
  activeProvider: ProviderId;
  providerName: string;
  modelId: string;
}

export type ExtensionRequest =
  | { type: "GET_STATUS" }
  | { type: "REVIEW_POSTS"; surface: FilterSurface; posts: PostInput[] }
  | { type: "GET_PROVIDER_SUMMARIES" }
  | { type: "SAVE_PROVIDER_KEY"; providerId: ProviderId; apiKey: string }
  | { type: "CLEAR_PROVIDER_KEY"; providerId: ProviderId };

export type ExtensionResponse =
  | ({ ok: true } & ExtensionStatus)
  | { ok: true; results: ReviewResult[] }
  | { ok: true; providerSummaries: ProviderSummary[] }
  | { ok: false; code: "CONFIG_REQUIRED" | "DISABLED" | "API_ERROR" | "FORBIDDEN" | "INVALID_REQUEST"; error: string };

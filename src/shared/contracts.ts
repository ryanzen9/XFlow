import type { VeilDetails } from "./strategy";
import type { ProviderId, ProviderSummary } from "./providers";
import type { ContentDecision, DecisionSource, UserDecisionAction } from "./content-decision";
import type { ActivityData, ActivityMediaType, ActivityStatus, ActivitySummary } from "./activity";

export interface PostInput {
  id: string;
  postId?: string;
  text: string;
  authorId?: string;
  author?: string;
  url?: string;
  mediaType?: ActivityMediaType;
}

export interface ReviewResult {
  id: string;
  probability: number;
  decision: ContentDecision;
  source: DecisionSource;
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
  | { type: "SAVE_USER_DECISION"; surface: FilterSurface; post: PostInput; action: UserDecisionAction }
  | {
      type: "RECORD_FILTER_EVENT";
      pageToken: string;
      surface: FilterSurface;
      post: PostInput;
      policyId?: string;
      policyName?: string;
    }
  | { type: "RESET_PAGE_ACTIVITY"; pageToken: string }
  | { type: "MARK_ACTIVITY_STATUS"; eventId: string; status: Exclude<ActivityStatus, "filtered"> }
  | { type: "GET_ACTIVITY_DATA" }
  | { type: "CLEAR_ACTIVITY_DATA" }
  | { type: "GET_PROVIDER_SUMMARIES" }
  | { type: "SAVE_PROVIDER_KEY"; providerId: ProviderId; apiKey: string }
  | { type: "CLEAR_PROVIDER_KEY"; providerId: ProviderId };

export type ExtensionResponse =
  | ({ ok: true } & ExtensionStatus)
  | { ok: true; results: ReviewResult[] }
  | { ok: true; result: ReviewResult }
  | { ok: true; activity: ActivityData; summary: ActivitySummary }
  | { ok: true; eventId: string; added: boolean; pageCount: number }
  | { ok: true; cleared: true }
  | { ok: true; updated: true }
  | { ok: true; providerSummaries: ProviderSummary[] }
  | { ok: false; code: "CONFIG_REQUIRED" | "DISABLED" | "API_ERROR" | "FORBIDDEN" | "INVALID_REQUEST"; error: string };

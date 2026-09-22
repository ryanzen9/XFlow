import type { ExtensionResponse, FilterSurface, PostInput } from "../../shared";

async function sendRequest(message: unknown): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

export function getExtensionStatus(): Promise<ExtensionResponse> {
  return sendRequest({ type: "GET_STATUS" });
}

export function reviewPosts(posts: PostInput[], surface: FilterSurface): Promise<ExtensionResponse> {
  return sendRequest({ type: "REVIEW_POSTS", surface, posts });
}

export function resetPageActivity(pageToken: string): Promise<ExtensionResponse> {
  return sendRequest({ type: "RESET_PAGE_ACTIVITY", pageToken });
}

export function recordFilterEvent(
  post: PostInput,
  surface: FilterSurface,
  pageToken: string,
  policyId?: string,
  policyName?: string,
): Promise<ExtensionResponse> {
  return sendRequest({ type: "RECORD_FILTER_EVENT", post, surface, pageToken, policyId, policyName });
}

export function markActivityRevealed(eventId: string): Promise<ExtensionResponse> {
  return sendRequest({ type: "MARK_ACTIVITY_STATUS", eventId, status: "revealed" });
}

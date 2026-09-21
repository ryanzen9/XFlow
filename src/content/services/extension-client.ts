import type { ExtensionResponse, FilterSurface, PostInput, UserDecisionAction } from "../../shared";

async function sendRequest(message: unknown): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

export function getExtensionStatus(): Promise<ExtensionResponse> {
  return sendRequest({ type: "GET_STATUS" });
}

export function reviewPosts(posts: PostInput[], surface: FilterSurface): Promise<ExtensionResponse> {
  return sendRequest({ type: "REVIEW_POSTS", surface, posts });
}

export function saveUserDecision(
  post: PostInput,
  surface: FilterSurface,
  action: UserDecisionAction,
): Promise<ExtensionResponse> {
  return sendRequest({ type: "SAVE_USER_DECISION", surface, post, action });
}

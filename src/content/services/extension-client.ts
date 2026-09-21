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

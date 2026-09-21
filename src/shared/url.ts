import type { FilterSurface } from "./contracts";

function parseSupportedUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    const supportedHost = parsed.hostname === "x.com" || parsed.hostname === "twitter.com";
    return supportedHost ? parsed : null;
  } catch {
    return null;
  }
}

export function isHomeTimeline(url: string): boolean {
  const parsed = parseSupportedUrl(url);
  return parsed !== null && /^\/home\/?$/.test(parsed.pathname);
}

export function getConversationPostId(url: string): string | null {
  const parsed = parseSupportedUrl(url);
  return parsed?.pathname.match(/^\/[^/]+\/status\/(\d+)\/?$/)?.[1] ?? null;
}

export function getFilterSurface(url: string): FilterSurface | null {
  if (isHomeTimeline(url)) return "timeline";
  return getConversationPostId(url) ? "comments" : null;
}

export function isFilterablePostOnSurface(surface: FilterSurface, postId: string, pageUrl: string): boolean {
  if (getFilterSurface(pageUrl) !== surface) return false;
  if (surface === "timeline") return true;
  const conversationPostId = getConversationPostId(pageUrl);
  return conversationPostId !== null && postId !== conversationPostId;
}

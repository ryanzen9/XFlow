import { MAX_POST_LENGTH } from "./constants";
import type { PostInput } from "./contracts";

export function sanitizePost(post: PostInput): PostInput | null {
  const id = String(post.id).trim();
  const text = String(post.text).replace(/\s+/g, " ").trim().slice(0, MAX_POST_LENGTH);
  if (!id || !text) return null;
  const author = typeof post.author === "string" ? post.author.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const candidateUrl = typeof post.url === "string" ? post.url.trim().slice(0, 500) : "";
  const url = /^https:\/\/(x\.com|twitter\.com)\//i.test(candidateUrl) ? candidateUrl : "";
  const mediaType =
    post.mediaType === "image" || post.mediaType === "video" || post.mediaType === "quote" ? post.mediaType : undefined;
  return {
    id: id.slice(0, 160),
    text,
    ...(author ? { author } : {}),
    ...(url ? { url } : {}),
    ...(mediaType ? { mediaType } : {}),
  };
}

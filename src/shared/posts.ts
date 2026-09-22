import { MAX_POST_LENGTH } from "./constants";
import type { PostInput } from "./contracts";

const POST_HOSTS = new Set(["x.com", "twitter.com"]);
const STATUS_PATH = /^\/[^/]+\/status\/\d+\/?$/i;

export function canonicalPostUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !POST_HOSTS.has(hostname) ||
      !STATUS_PATH.test(url.pathname)
    ) {
      return undefined;
    }
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const canonical = `https://${hostname}${pathname}`;
    return canonical.length <= 500 ? canonical : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizePost(post: PostInput): PostInput | null {
  const id = String(post.id).trim();
  const text = String(post.text).replace(/\s+/g, " ").trim().slice(0, MAX_POST_LENGTH);
  if (!id || !text) return null;
  const author = typeof post.author === "string" ? post.author.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const url = canonicalPostUrl(post.url);
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

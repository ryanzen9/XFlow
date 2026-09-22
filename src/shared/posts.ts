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

export function sanitizePost(post: unknown): PostInput | null {
  if (!post || typeof post !== "object" || Array.isArray(post)) return null;
  const input = post as Partial<PostInput>;
  if (typeof input.id !== "string" || typeof input.text !== "string") return null;
  const id = input.id.trim().slice(0, 160);
  const postIdCandidate = typeof input.postId === "string" ? input.postId.trim() : "";
  const postId = /^\d+$/.test(postIdCandidate) ? postIdCandidate.slice(0, 80) : "";
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, MAX_POST_LENGTH);
  if (!id || !text) return null;
  const authorId = typeof input.authorId === "string" ? input.authorId.trim().replace(/^@/, "").slice(0, 80) : "";
  const author = typeof input.author === "string" ? input.author.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const url = canonicalPostUrl(input.url);
  const mediaType =
    input.mediaType === "image" || input.mediaType === "video" || input.mediaType === "quote"
      ? input.mediaType
      : undefined;
  return {
    id,
    ...(postId ? { postId } : {}),
    text,
    ...(authorId ? { authorId } : {}),
    ...(author ? { author } : {}),
    ...(url ? { url } : {}),
    ...(mediaType ? { mediaType } : {}),
  };
}

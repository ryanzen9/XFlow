import { MAX_POST_LENGTH } from "./constants";
import type { PostInput } from "./contracts";

export function sanitizePost(post: PostInput): PostInput | null {
  const id = String(post.id).trim();
  const text = String(post.text).replace(/\s+/g, " ").trim().slice(0, MAX_POST_LENGTH);
  return id && text ? { id, text } : null;
}

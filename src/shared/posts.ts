import { MAX_POST_LENGTH } from "./constants";
import type { PostInput } from "./contracts";

export function sanitizePost(post: unknown): PostInput | null {
  if (!post || typeof post !== "object" || Array.isArray(post)) return null;
  const input = post as Partial<PostInput>;
  if (typeof input.id !== "string" || typeof input.text !== "string") return null;
  const id = input.id.trim();
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, MAX_POST_LENGTH);
  const authorId = typeof input.authorId === "string" ? input.authorId.trim().replace(/^@/, "").slice(0, 80) : "";
  return id && text ? { id, text, ...(authorId ? { authorId } : {}) } : null;
}

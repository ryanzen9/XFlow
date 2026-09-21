import type { PostInput } from "../../shared";

export const ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
export const TEXT_SELECTOR = '[data-testid="tweetText"]';

export interface ExtractedPost {
  post: PostInput;
}

export function extractPost(article: HTMLElement, fallbackId: string): ExtractedPost | null {
  const textElement = article.querySelector<HTMLElement>(TEXT_SELECTOR);
  const text = textElement?.innerText.replace(/\s+/g, " ").trim();
  if (!textElement || !text) return null;

  const statusLink = article.querySelector<HTMLAnchorElement>('a[href*="/status/"] time')?.closest("a");
  const id = statusLink?.href.match(/\/status\/(\d+)/)?.[1] ?? fallbackId;

  return { post: { id, text } };
}

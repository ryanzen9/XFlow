import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { ReviewResult, UserDecisionAction } from "../../shared";
import { PostFeedback } from "../components/PostFeedback";

export interface PostFeedbackPresentation {
  update: (result: ReviewResult) => void;
  destroy: () => void;
}

export function mountPostFeedback(
  article: HTMLElement,
  initialResult: ReviewResult,
  onAction: (action: UserDecisionAction) => Promise<void>,
): PostFeedbackPresentation {
  const host = document.createElement("div");
  host.className = "xfilter-feedback-host";
  host.dataset.slot = "xfilter-feedback";
  article.dataset.xfilterFeedback = "true";
  article.append(host);

  let root: Root | null = createRoot(host);
  const render = (result: ReviewResult) => {
    flushSync(() => root?.render(<PostFeedback result={result} onAction={onAction} />));
  };
  render(initialResult);

  return {
    update: render,
    destroy: () => {
      root?.unmount();
      root = null;
      host.remove();
      delete article.dataset.xfilterFeedback;
    },
  };
}

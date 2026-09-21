import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { formatProbability, type ReviewResult, type UserDecisionAction } from "../../shared";

export interface PostFeedbackProps {
  result: ReviewResult;
  onAction: (action: UserDecisionAction) => Promise<void>;
}

const SOURCE_LABELS: Record<ReviewResult["source"], string> = {
  user: "用户标注",
  "exact-cache": "精确缓存",
  "normalized-cache": "归一化缓存",
  "template-cache": "模板缓存",
  "semantic-cache": "语义缓存",
  jev: "Jev",
};

function stopEvent(event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) {
  event.stopPropagation();
}

export function PostFeedback({ result, onAction }: PostFeedbackProps) {
  const details = useRef<HTMLDetailsElement>(null);
  const [pending, setPending] = useState<UserDecisionAction | null>(null);
  const [error, setError] = useState("");

  const choose = async (event: MouseEvent<HTMLButtonElement>, action: UserDecisionAction) => {
    event.preventDefault();
    event.stopPropagation();
    setPending(action);
    setError("");
    try {
      await onAction(action);
      if (details.current) details.current.open = false;
    } catch {
      setError("保存失败，请重试");
    } finally {
      setPending(null);
    }
  };

  return (
    <details className="xfilter-feedback" ref={details}>
      <summary
        className="xfilter-feedback__trigger"
        aria-label="查看 XFlow 判定并标注"
        onClick={stopEvent}
        onPointerDown={stopEvent}
      >
        <span aria-hidden="true">J</span>
      </summary>
      <div className="xfilter-feedback__menu" role="menu" aria-label="XFlow 内容标注">
        <div className="xfilter-feedback__meta">
          <strong>{formatProbability(result.probability)}</strong>
          <span>{SOURCE_LABELS[result.source]}</span>
          {result.details && <span>{result.details.strategy.name}</span>}
        </div>
        <button type="button" role="menuitem" disabled={pending !== null} onClick={(event) => choose(event, "hide")}>
          仅隐藏此内容
        </button>
        <button type="button" role="menuitem" disabled={pending !== null} onClick={(event) => choose(event, "allow")}>
          显示此内容
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={pending !== null}
          onClick={(event) => choose(event, "reduce-similar")}
        >
          减少类似内容
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={pending !== null}
          onClick={(event) => choose(event, "block-similar")}
        >
          屏蔽类似内容
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}

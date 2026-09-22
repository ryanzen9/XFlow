import type { MouseEvent, PointerEvent } from "react";
import { formatProbability, renderHoverText, type VeilDetails } from "../../shared";

export interface BlurVeilProps {
  probability: number;
  details?: VeilDetails;
  onReveal: () => void;
}

function stopPointerEvent(event: PointerEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function BlurVeil({ probability, details, onReveal }: BlurVeilProps) {
  const rate = formatProbability(probability);
  const hoverText = details ? renderHoverText(details, probability) : `Likely spam · ${rate}`;
  const handleReveal = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onReveal();
  };

  return (
    <button
      className="xflow-veil"
      data-slot="filtered-post-trigger"
      type="button"
      aria-label={details ? `显示内容。${hoverText}` : `Show filtered post. Spam likelihood ${rate}.`}
      onPointerDown={stopPointerEvent}
      onClick={handleReveal}
    >
      <span className="xflow-veil__prompt" aria-hidden="true">
        <span className="xflow-veil__label">
          <span className="xflow-veil__label-default">Filtered post</span>
          <span className="xflow-veil__label-rate">{hoverText}</span>
        </span>
        <span className="xflow-veil__action">Show</span>
      </span>
    </button>
  );
}

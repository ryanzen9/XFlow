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
      className="xfilter-veil"
      data-slot="filtered-post-trigger"
      type="button"
      aria-label={details ? `显示内容。${hoverText}` : `Show filtered post. Spam likelihood ${rate}.`}
      onPointerDown={stopPointerEvent}
      onClick={handleReveal}
    >
      <span className="xfilter-veil__prompt" aria-hidden="true">
        <span className="xfilter-veil__label">
          <span className="xfilter-veil__label-default">Filtered post</span>
          <span className="xfilter-veil__label-rate">{hoverText}</span>
        </span>
        <span className="xfilter-veil__action">Show</span>
      </span>
    </button>
  );
}

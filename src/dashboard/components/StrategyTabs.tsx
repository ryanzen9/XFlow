import type { KeyboardEvent } from "react";
import type { FilterSurface } from "../../shared";
import { cn } from "../../ui/cn";
import { useI18n } from "../../ui/i18n";

interface Props {
  value: FilterSurface;
  counts: Record<FilterSurface, number>;
  onChange: (surface: FilterSurface) => void;
}

export function StrategyTabs({ value, counts, onChange }: Props) {
  const { t } = useI18n();
  const surfaces: { id: FilterSurface; label: string; route: string }[] = [
    { id: "timeline", label: t("strategy.timeline"), route: "/home" },
    { id: "comments", label: t("strategy.comments"), route: "/status" },
  ];
  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % surfaces.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + surfaces.length) % surfaces.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = surfaces.length - 1;
    else return;
    event.preventDefault();
    const surface = surfaces[next]!;
    onChange(surface.id);
    document.getElementById(`strategy-tab-${surface.id}`)?.focus();
  };

  return (
    <div
      className="mb-[22px] grid max-w-[1100px] grid-cols-2 border-b border-line-strong sm:mb-[26px]"
      role="tablist"
      aria-label={t("strategy.tabs")}
    >
      {surfaces.map((surface, index) => (
        <button
          key={surface.id}
          id={`strategy-tab-${surface.id}`}
          type="button"
          role="tab"
          aria-selected={value === surface.id}
          aria-controls={`strategy-panel-${surface.id}`}
          tabIndex={value === surface.id ? 0 : -1}
          onClick={() => onChange(surface.id)}
          onKeyDown={(event) => selectFromKeyboard(event, index)}
          className={cn(
            "relative flex min-h-[58px] items-center justify-between bg-transparent px-3 py-2.5 text-left text-muted transition after:absolute after:right-0 after:bottom-[-2px] after:left-0 after:h-[3px] after:bg-transparent after:content-[''] hover:bg-hover/60 aria-selected:bg-surface aria-selected:text-ink aria-selected:after:bg-ink sm:min-h-16 sm:px-[18px] [&+button]:border-l [&+button]:border-line",
          )}
        >
          <span>
            <strong className="block text-xs sm:text-sm">{surface.label}</strong>
            <small className="mt-[3px] block font-mono text-caption text-muted">{surface.route}</small>
          </span>
          <em className="grid h-[26px] min-w-[26px] place-items-center rounded-full bg-selected px-[7px] font-mono text-meta font-semibold text-ink not-italic">
            {counts[surface.id]}
          </em>
        </button>
      ))}
    </div>
  );
}

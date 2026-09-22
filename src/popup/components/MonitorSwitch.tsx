import type { ChangeEventHandler } from "react";
import { cn } from "../../ui/cn";
import { useI18n } from "../../ui/i18n";

export interface MonitorSwitchProps {
  id: string;
  routeLabel: string;
  title: string;
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

/**
 * One compact row of the monitoring list: route token, surface name, live state
 * and the switch. The long-form explanations belong in the Dashboard — the
 * popup only reports state.
 */
export function MonitorSwitch({
  id,
  routeLabel,
  title,
  ariaLabel,
  checked,
  disabled,
  pending = false,
  onChange,
}: MonitorSwitchProps) {
  const { t } = useI18n();
  const titleId = `${id}-title`;
  const stateId = `${id}-state`;
  const state = pending ? "pending" : checked ? "on" : "off";
  const stateLabel = t(pending ? "popup.syncing" : checked ? "common.enabled" : "popup.paused");

  return (
    <div
      className={cn("flex min-h-12 items-center gap-2.5 px-3 py-2 transition", state === "off" && "bg-surface/70")}
      data-slot={`${id}-filter-control`}
      data-state={state}
      aria-busy={pending}
    >
      <span
        className={cn(
          "grid h-6 w-12 shrink-0 place-items-center rounded-sm bg-selected font-mono text-meta leading-none text-ink transition",
          state === "off" && "bg-inset text-faint",
        )}
        aria-hidden="true"
      >
        {routeLabel}
      </span>
      <h2 className="min-w-0 flex-1 truncate text-ui leading-tight" id={titleId}>
        {title}
      </h2>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 font-mono text-caption leading-none whitespace-nowrap text-live",
          state === "off" && "text-faint",
          state === "pending" && "text-warn",
        )}
        data-state={state}
        id={stateId}
        aria-live="polite"
      >
        <i
          className={cn("size-[5px] rounded-full bg-current", state === "pending" && "animate-live-pulse")}
          aria-hidden="true"
        />
        {stateLabel}
      </span>
      <label
        className={cn(
          "relative block h-6 w-11 shrink-0 cursor-pointer",
          disabled && "cursor-not-allowed",
          pending && "cursor-progress",
        )}
        htmlFor={id}
      >
        <span className="sr-only">{ariaLabel}</span>
        <input
          className="peer absolute inset-x-0 -inset-y-2.5 z-20 m-0 cursor-[inherit] opacity-0"
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-checked={checked}
          disabled={disabled}
          aria-describedby={stateId}
          onChange={onChange}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-line-strong bg-inset transition peer-checked:border-action peer-checked:bg-action peer-focus-visible:outline-(length:--focus-ring-width) peer-focus-visible:outline-offset-(--focus-ring-offset) peer-focus-visible:outline-focus peer-disabled:opacity-70 after:absolute after:top-[2px] after:left-[2px] after:size-[18px] after:rounded-full after:bg-faint after:transition after:content-[''] peer-checked:after:translate-x-[20px] peer-checked:after:bg-action-fg"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}

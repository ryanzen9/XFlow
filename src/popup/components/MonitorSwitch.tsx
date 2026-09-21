import type { ChangeEventHandler } from "react";
import { cn } from "../../ui/cn";

export interface MonitorSwitchProps {
  id: string;
  routeLabel: string;
  title: string;
  ariaLabel: string;
  enabledDescription: string;
  disabledDescription: string;
  pendingDescription: string;
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function MonitorSwitch({
  id,
  routeLabel,
  title,
  ariaLabel,
  enabledDescription,
  disabledDescription,
  pendingDescription,
  checked,
  disabled,
  pending = false,
  onChange,
}: MonitorSwitchProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const state = pending ? "pending" : checked ? "on" : "off";
  const stateLabel = pending ? "同步中" : checked ? "已启用" : "已暂停";
  const description = pending ? pendingDescription : checked ? enabledDescription : disabledDescription;

  return (
    <section
      className={cn(
        "relative flex min-h-[70px] items-center justify-between gap-4 overflow-hidden rounded-[15px] border border-line bg-panel px-3.5 py-3 shadow-panel transition after:absolute after:right-5 after:bottom-[-19px] after:h-[34px] after:w-[68px] after:rounded-[50%] after:border after:border-signal/15 after:transition after:content-['']",
        state === "off" && "border-line bg-surface/75 shadow-sm after:border-faint/10 after:opacity-55",
        state === "pending" && "border-focus/45",
      )}
      data-slot={`${id}-filter-control`}
      data-state={state}
      aria-labelledby={titleId}
      aria-busy={pending}
    >
      <div className="relative z-10 flex items-center gap-[11px]">
        <span
          className={cn(
            "grid h-[34px] min-w-12 place-items-center rounded-lg bg-soft font-mono text-[10px] leading-none font-bold text-signal transition",
            state === "off" && "bg-control text-faint",
          )}
        >
          {routeLabel}
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-[7px]">
            <h2 className="text-[13px] leading-tight" id={titleId}>
              {title}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono text-[8px] leading-none font-bold whitespace-nowrap text-signal",
                state === "off" && "text-faint",
                state === "pending" && "text-focus",
              )}
              data-state={state}
              aria-live="polite"
            >
              <i
                className={cn("size-[5px] rounded-full bg-current", state === "pending" && "animate-monitor-pulse")}
                aria-hidden="true"
              />
              {stateLabel}
            </span>
          </div>
          <p className="text-[10.5px] leading-[1.35] text-faint" id={descriptionId}>
            {description}
          </p>
        </div>
      </div>
      <label
        className={cn(
          "relative z-10 block h-[27px] w-[46px] shrink-0 cursor-pointer",
          pending && "cursor-progress",
          disabled && "cursor-not-allowed",
        )}
        htmlFor={id}
      >
        <span className="sr-only">{ariaLabel}</span>
        <input
          className="peer absolute inset-0 z-20 m-0 size-full cursor-[inherit] opacity-0"
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={onChange}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-line-strong bg-control transition peer-checked:border-signal peer-checked:bg-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus peer-disabled:opacity-70 after:absolute after:top-[3px] after:left-[3px] after:size-[19px] after:rounded-full after:bg-faint after:shadow-sm after:transition after:content-[''] peer-checked:after:translate-x-[19px] peer-checked:after:bg-signal"
          aria-hidden="true"
        />
      </label>
    </section>
  );
}

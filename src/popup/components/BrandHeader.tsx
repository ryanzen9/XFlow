import type { ComponentProps, ReactNode } from "react";

export type BrandHeaderProps = ComponentProps<"header"> & { children?: ReactNode };

export function BrandHeader({ children, ...props }: BrandHeaderProps) {
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-[13px] border-b border-line pb-3" {...props}>
      <div
        className="relative grid size-12 place-items-center rounded-full border border-line-strong bg-surface shadow-[inset_0_0_0_5px_color-mix(in_srgb,var(--color-signal)_5.5%,transparent)] before:absolute before:top-[-4px] before:h-[7px] before:w-px before:bg-signal before:content-[''] after:absolute after:right-[-4px] after:h-px after:w-[7px] after:bg-signal after:content-['']"
        aria-hidden="true"
      >
        <span className="relative z-10 font-mono text-[11px] leading-none font-bold tracking-[0.08em]">XF</span>
        <span className="absolute inset-2 rounded-full border border-dashed border-signal/45" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 font-mono text-[9px] leading-tight font-bold tracking-[0.13em] text-signal uppercase">
          Timeline signal filter
        </p>
        <h1 className="font-display text-[26px] leading-none font-bold tracking-[-0.035em]">XFilter</h1>
      </div>
      {children}
    </header>
  );
}

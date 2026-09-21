export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus";
export const disabled = "disabled:cursor-not-allowed disabled:opacity-55";

export const card = "rounded-[15px] border border-line bg-surface p-6 shadow-panel max-[1150px]:p-[18px]";
export const eyebrow = "font-mono text-[10px] font-semibold tracking-[0.12em] text-signal";
export const muted = "text-muted";

export const primaryButton = `${focusRing} ${disabled} min-h-10.5 rounded-lg border border-signal bg-signal px-[18px] py-2.5 text-xs font-semibold text-white shadow-[0_3px_7px_color-mix(in_srgb,var(--color-signal)_16%,transparent)] transition hover:bg-signal-hover`;
export const secondaryButton = `${focusRing} ${disabled} min-h-10.5 rounded-lg border border-line-strong bg-surface px-[18px] py-2.5 text-xs font-semibold text-muted transition hover:bg-panel hover:text-ink`;
export const textButton = `${focusRing} border-0 bg-transparent p-0 text-[11px] text-signal hover:underline`;

export const field = "mt-5 grid gap-2 text-xs font-medium";
export const fieldLabel = "flex items-center justify-between gap-3";
export const fieldHelp = "text-[11px] font-normal leading-[1.7] text-muted";
export const control = `${focusRing} min-h-11 w-full min-w-0 rounded-lg border border-line-strong bg-panel px-3 py-2.5 text-ink transition placeholder:text-muted/70 aria-[invalid=true]:border-alert`;
export const textarea = `${control} resize-y leading-[1.8]`;
export const select = control;

export const sectionTitle = "mb-[22px] flex items-start gap-3";
export const sectionIcon = "grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-soft text-xl text-signal";
export const sectionHeading = "text-base font-semibold tracking-[-0.02em] text-ink";
export const sectionDescription = "mt-1 text-xs text-muted";
export const tag = "inline-block whitespace-nowrap rounded-[5px] bg-soft px-[7px] py-[3px] text-[10px] text-signal";

export const switchShell = "relative block h-7 w-[46px] shrink-0";
export const switchInput = `${focusRing} peer absolute inset-y-[-8px] z-10 m-0 h-11 w-[46px] cursor-pointer opacity-0`;
export const switchTrack =
  "absolute inset-0 rounded-full border border-line-strong bg-control transition peer-checked:border-signal peer-checked:bg-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-focus after:absolute after:left-[3px] after:top-[3px] after:size-5 after:rounded-full after:bg-muted after:transition after:content-[''] peer-checked:after:translate-x-[18px] peer-checked:after:bg-signal";

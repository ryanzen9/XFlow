/* Shared class fragments for the design language in src/styles/token.css.
   Every value here must come from a token — no literal colours, radii or
   durations. See token.css for the layer model and naming rules. */

export const focusRing =
  "focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus";
export const disabled = "disabled:cursor-not-allowed disabled:opacity-55";

/* Structure is a hairline border and a small corner — never elevation. */
export const card = "rounded-lg border border-line bg-surface p-6 max-[1150px]:p-[18px]";

/* Editorial eyebrow: uppercase mono at the meta step, tracked 0.11em. */
export const eyebrow = "font-mono text-meta text-muted uppercase";
export const muted = "text-muted";

export const primaryButton = `${focusRing} ${disabled} min-h-(--control-height-tall) rounded-md border border-action bg-action px-[18px] py-2.5 text-label text-action-fg transition-colors hover:bg-action-hover`;
export const secondaryButton = `${focusRing} ${disabled} min-h-(--control-height-tall) rounded-md border border-line-strong bg-surface px-[18px] py-2.5 text-label text-ink transition-colors hover:bg-hover`;
export const textButton = `${focusRing} border-0 bg-transparent p-0 text-label text-ink underline decoration-fg-4 underline-offset-[3px] transition-[text-decoration-color] hover:decoration-fg-2`;

export const field = "mt-5 grid gap-2 text-xs font-medium";
export const fieldLabel = "flex items-center justify-between gap-3";
export const fieldHelp = "text-xs font-normal text-muted";
export const control = `${focusRing} min-h-(--control-height-tall) w-full min-w-0 rounded-md border border-line-strong bg-raised px-3 py-2.5 text-ink transition-colors placeholder:text-faint aria-[invalid=true]:border-danger`;
export const textarea = `${control} resize-y leading-[1.8]`;
export const select = control;

export const sectionTitle = "mb-[22px] flex items-start gap-3";
export const sectionIcon = "grid size-[30px] shrink-0 place-items-center rounded-sm bg-selected text-xl text-ink";
export const sectionHeading = "text-heading text-ink";
export const sectionDescription = "mt-1 text-xs text-muted";
export const tag =
  "inline-block whitespace-nowrap rounded-xs bg-selected px-[7px] py-[3px] text-meta text-ink uppercase";

/* Switch: off is a well with a grey thumb; on is a solid ink track with an
   inverted thumb. Selection is luminance, never a hue. */
export const switchShell = "relative block h-7 w-[46px] shrink-0";
export const switchInput = `${focusRing} peer absolute inset-y-[-8px] z-10 m-0 h-11 w-[46px] cursor-pointer opacity-0`;
export const switchTrack =
  "absolute inset-0 rounded-full border border-line-strong bg-inset transition peer-checked:border-action peer-checked:bg-action peer-focus-visible:outline-(length:--focus-ring-width) peer-focus-visible:outline-offset-(--focus-ring-offset) peer-focus-visible:outline-focus after:absolute after:left-[3px] after:top-[3px] after:size-5 after:rounded-full after:bg-faint after:transition after:content-[''] peer-checked:after:translate-x-[18px] peer-checked:after:bg-action-fg";

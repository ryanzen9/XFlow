# Design tokens

`src/styles/token.css` is the single source of truth for colour, typography, space, layout and motion.
`src/styles/theme.css` maps those tokens onto Tailwind utilities. Components consume utilities or tokens —
never literal colours, radii, durations or font sizes.

```
token.css   primitives → semantic roles (light/dark) → keyframes
theme.css   @theme inline bridge → Tailwind utilities (bg-canvas, text-label, …)
```

Preview both themes with `bun run preview:tokens` (serves a token index at `http://127.0.0.1:43993/`).
The visual rules themselves are in [design.md](../design.md).

## Layer model

| Layer      | Examples                                          | Consumed by              |
| ---------- | ------------------------------------------------- | ------------------------ |
| Primitives | `--gray-*`, `--size-*`, `--space-*`, `--motion-*` | nothing — reference only |
| Semantic   | `--bg-*`, `--fg-1..5`, `--bd-*`, `--action-*`     | components, the bridge   |
| Bridge     | `--color-canvas`, `--text-label`, `--radius-lg`   | Tailwind class names     |

Names avoid Tailwind's theme namespaces (`--color-*`, `--font-*`, `--text-*`, `--leading-*`, `--tracking-*`,
`--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`) so the bridge can map one to the other without a
declaration referring to itself. The exception is motion: `--duration-snappy`, `--ease-snappy`,
`--duration-smooth`, `--ease-smooth`, `--duration-swift`, `--ease-swift` keep the normative names from
design.md §4.1, and the bridge aliases them from the `--motion-*` primitives.

## Colour

Neutral first. Greyscale carries hierarchy; colour only reports state. Budget: neutral 92–96 %, semantic
3–6 %, technical accent 0–2 %. If a colour does not answer _importance, interactivity, selection, state or
attention_, it is neutral.

Themes resolve once, through `light-dark()`, keyed off `color-scheme`:

| Scope                     | Result         |
| ------------------------- | -------------- |
| `:root`                   | follows the OS |
| `:root[data-theme=light]` | pinned light   |
| `:root[data-theme=dark]`  | pinned dark    |

`applyTheme()` in `src/ui/theme.tsx` always writes `data-theme`, so extension pages are deterministic.

| Role              | Light                 | Dark                  | Notes                                                                    |
| ----------------- | --------------------- | --------------------- | ------------------------------------------------------------------------ |
| `--bg-canvas`     | `#F5F5F5`             | `#0A0A0A`             | page                                                                     |
| `--bg-surface`    | `#FFFFFF`             | `#121212`             | panels and cards                                                         |
| `--bg-raised`     | `#FFFFFF`             | `#1A1A1A`             | fields, popovers, dialogs                                                |
| `--bg-inset`      | `#EDEDED`             | `#000000`             | wells: switches, code and readout blocks                                 |
| `--bg-selected`   | `#E4E4E4`             | `#262626`             | selection is luminance, not hue                                          |
| `--bg-inverse`    | `#0A0A0A`             | `#FFFFFF`             | inverted surfaces                                                        |
| `--fg-1 … --fg-5` | `#0A0A0A` → `#A3A3A3` | `#F5F5F5` → `#5C5C5C` | importance ramp; `--fg-5` is disabled/decorative only and is below 4.5:1 |
| `--bd-subtle`     | `#E4E4E4`             | `#262626`             | hairline separators (decorative)                                         |
| `--bd-strong`     | `#8A8A8A`             | `#6B6B6B`             | interactive boundaries, ≥ 3:1                                            |
| `--bd-focus`      | `#0A0A0A`             | `#FFFFFF`             | focus ring; maximum contrast, never a hue                                |
| `--action-bg`     | `#0A0A0A`             | `#FFFFFF`             | the primary action surface, always with `--action-fg`                    |
| `--live`          | `#0F7A3D`             | `#4ADE80`             | phosphor. Monitoring is live — nothing else                              |
| `--warn-text`     | `#8A5300`             | `#E3B341`             | attention                                                                |
| `--danger-text`   | `#B42318`             | `#FF8A80`             | errors and destructive affordances                                       |
| `--danger-solid`  | `#B42318`             | `#C0392B`             | solid destructive buttons (white text ≥ 4.5:1)                           |

Information is deliberately neutral: `--info-text` is `--fg-2`, `--info-soft` is `--bg-selected`.

## Typography

D-DIN (DIN 1451 industrial grotesk) resolves from the OS; the fallback chain — Arial Narrow → Arial →
Verdana — preserves the compact width, followed by CJK faces. Display and body are the same family; the
distinction is weight. Mono carries data.

Uppercase roles are tracked into design.md's 0.96–1.6 px band at every step, so tracking is optical (em)
rather than uniform:

| Role           | Size    | Leading | Tracking | Weight |
| -------------- | ------- | ------- | -------- | ------ |
| `text-hero`    | 48–80px | 0.95    | 0.02em   | 700    |
| `text-readout` | 46px    | 0.95    | 0.025em  | 700    |
| `text-display` | 34px    | 1.02    | 0.035em  | 700    |
| `text-title`   | 26px    | 1.1     | 0.04em   | 700    |
| `text-heading` | 19px    | 1.25    | 0.055em  | 600    |
| `text-body`    | 16px    | 1.6     | —        | 400    |
| `text-ui`      | 13px    | 1.45    | 0.08em   | 500    |
| `text-label`   | 11px    | 1.4     | 0.1em    | 600    |
| `text-meta`    | 10px    | 1.35    | 0.11em   | 500    |
| `text-caption` | 9px     | 1.3     | 0.12em   | 500    |
| `text-code`    | 11px    | 1.75    | 0.02em   | 400    |

`--text-*` role utilities also set weight, leading and tracking, so a role can never be half-applied. Each is
overridable through Tailwind's `--tw-*` indirection: `text-ui font-normal` wins on weight, `leading-*` on
leading, `tracking-*` on tracking. Controls, `th`, `summary` and `h1–h3` are uppercased in the base layer and
receive absolute tracking (`--track-caps`, 1.1 px) because their rendered size is not known at author time.
The readout role is the signature unit: oversized tabular, slashed-zero figures with a small tracked caption.

## Space, corner, layout

- Space is a 4 px grid (`--space-*`), identical to Tailwind's `--spacing` base, so `p-3` and `var(--space-3)` agree.
- Radii stop at 8 px (`--corner-xl`); the bridge caps `rounded-2xl` and above at the same corner.
- Layout constants (`--layout-*`, `--control-height*`, `--hit-target`, `--layer-*`, `--opacity-*`,
  `--focus-ring-*`) replace one-off measurements. The margin rule at `--pattern-margin-rule` is the single
  structural flourish: one vertical hairline where the text margin sits.
- Breakpoints stay literal in `theme.css`: `@media` cannot read `var()`. `--bp-*` mirrors Tailwind's ladder
  for JS and documentation.

## Motion

| Token                                 | Value                                       | Temperament                |
| ------------------------------------- | ------------------------------------------- | -------------------------- |
| `--duration-snappy` / `--ease-snappy` | `.22s` / `cubic-bezier(.175,.885,.32,1.1)`  | fast out, slight overshoot |
| `--duration-smooth` / `--ease-smooth` | `.3s` / `cubic-bezier(.19,1,.22,1)`         | expo out, long tail        |
| `--duration-swift` / `--ease-swift`   | `.8s` / `cubic-bezier(.175,.885,.32,1.275)` | back out, big overshoot    |

Micro transitions stay in the 100–150 ms band (`--duration-instant`, `--duration-quick`) and are exposed as
`--transition-*` property shorthands. `transition-colors` and friends already default to
`--duration-quick` on `--motion-ease-snappy`, so a plain Tailwind transition is on-language.
Keyframes: `enter-pop` / `exit-pop` (blur instead of a scale-only pop) and `live-pulse` (the monitoring dot).
`prefers-reduced-motion` zeroes the duration tokens and disables animation globally.

## Adding or changing a token

1. Change the value in `token.css`, in the semantic section — primitives only if the ramp itself is wrong.
2. If it needs a Tailwind utility, add the alias in the bridge and confirm the emitted CSS with
   `bun run build` (`grep` the token in `dist/dashboard.css`).
3. Review both themes in `bun run preview:tokens` and in the dashboard/popup previews.

## Intentional exceptions

- `src/content/content.css` does not import the tokens: the blur veil reproduces X's own surface, and generic
  custom properties must not be injected into x.com's `:root`.
- The post mock in `src/dashboard/components/StrategyPreview.tsx` uses X's literal palette on purpose — it
  previews a foreign product, including the veil wash over it.
- `--shadow-panel` resolves to a transparent shadow so untouched components degrade to a hairline border.
- Legacy utilities (`bg-soft`, `bg-panel`, `bg-control`, `text-signal`, `text-alert`) are still bridged to
  the new semantics. Prefer `bg-selected`, `bg-raised`, `bg-inset`, `text-ink` and `text-danger` in new code.

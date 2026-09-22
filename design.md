# Design Guidelines

---

## 1. Design

The highest principle of design：**Industrial Minimalism × Terminal Native × Editorial Typography × High-contrast Monochrome**

A precision-focused, monochrome developer interface inspired by terminals, code editors, technical documentation and editorial design. Use black and neutral grayscale surfaces, oversized neo-grotesk typography, restrained monospace accents, thin separators, minimal borders, almost no shadows, small radii, dense but highly structured information, authentic product UI instead of decorative illustrations, keyboard-first interactions, and subtle state-driven motion. Avoid gradients, glassmorphism, excessive cards, decorative icons and visual chrome.

---

## 2. Color

The color system is based on four principles:

Neutral first — most of the interface should remain grayscale.
Semantic second — color is primarily used to communicate state.
White is the primary action color — avoid introducing a conventional brand blue.

Contrast creates hierarchy — use luminance differences instead of decorative color.

Recommended visual distribution:

Neutral colors 92–96%
Semantic colors 3–6%
Technical accents 0–2%

The interface should feel monochrome by default.

Color should answer one of these questions:

Is this element more or less important?

Is this element interactive?

Is this element selected?

What state is this element in?

Does this state require attention?

If color does not help answer one of these questions, prefer neutral colors.

---

## 3. Font

Primary typeface D-DIN (D-DIN-Bold for Display), sourced from the open-source geometric sans-serif font based on the German industrial standard DIN 1451 (industrial/engineering/road sign style)

Fallback typefaces: Arial Narrow → Arial → Verdana (prioritizing compact width). Usage characteristics: nearly all text uses uppercase + positive letter-spacing (approximately 0.96–1.6px)

Line height: headings are extremely compact (0.95–1.25), body text is more relaxed (1.5–1.7). Font weight: Display: Bold (700);

Body/UI: Regular (400) or Medium

Typical hierarchy examples:

Hero headline: D-DIN-Bold, 48–80px, all uppercase, tight letter-spacing, tight line height → like a mission briefing/engineering label.

Navigation / buttons: D-DIN, 13–16px, all uppercase, slightly larger letter-spacing.

Body text: D-DIN Regular, around 16px.

---

## 4. Motion

### 4.1 Curve

**snappy / smooth / swift**

| Token               | 值                                     |
| ------------------- | -------------------------------------- |
| `--duration-snappy` | `.22s`                                 |
| `--ease-snappy`     | `cubic-bezier(.175, .885, .32, 1.1)`   |
| `--duration-smooth` | `.3s`                                  |
| `--ease-smooth`     | `cubic-bezier(.19, 1, .22, 1)`         |
| `--duration-swift`  | `.8s`                                  |
| `--ease-swift`      | `cubic-bezier(.175, .885, .32, 1.275)` |

Other measured micro-interactions:

| Scenario                     | Value                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| Navigation link color change | `color .15s`                                                    |
| Navigation icon movement     | `transform .1s`, hover `translate(-3px)`                        |
| Sidebar link color change    | `color .1s`                                                     |
| Menu item                    | `color, font-weight .1s`, **hover font-weight from 400 to 500** |
| Link underline               | `text-decoration-color .15s`; default `--fg-4`, hover→`--fg-2`  |
| Sticky header shadow         | `box-shadow .15s`                                               |
| Button background            | `background .15s` / `.1s`                                       |
| Zoom/slider control          | `background-color .1s`                                          |

Menu open/close animation (a very typical trick—**using blur instead of the "mushy" feel of scale**):

```css
@keyframes enterPop {
  from {
    opacity: 0;
    filter: blur(4px);
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}
@keyframes exitPop {
  from {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
  to {
    opacity: 0;
    filter: blur(4px);
    transform: scale(0.96);
  }
}
/* Duration .1s, both fill */
```

### 4.2 Principle

1. **Spring > Linear**. ToggleGroup's glass indicator "eases between options with a spring rather than a straight slide, so the selection settles into place instead of snapping." The implementation approach is the back-out curve described above plus a `.22s` magnitude.

2. **Only animate GPU-cheap properties**. When position changes, only translate the filter region; the texture stays put.

3. **Hover changes font weight** (400→500) to create a "text slightly bolding" tactile feel—this is an interaction language unique to variable fonts, which ordinary fonts cannot achieve.

4. **Durations are generally very short**: `.1s–.3s`, with `.8s` used only for large displacements. There is no slow fade-in.

---

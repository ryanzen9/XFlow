# Repository guidelines

## Toolchain

- Use Bun for installs, scripts, tests and builds. Do not introduce npm, pnpm, Yarn, Vite or Jest lock/config files.
- Run `bun run check` before handing off a change. It covers formatting, linting, type checking, tests and the production build.
- Use `bunx` for local CLI dependencies.

## Architecture

- Keep browser-specific orchestration in `src/background`, `src/content`, `src/dashboard` or `src/popup`.
- Keep reusable contracts, persistence normalization and pure helpers in `src/shared`.
- Provider integrations implement the common adapter interface under `src/background/jev/providers`.
- Provider and S3 credentials are local-only secrets. Never expose them to Content Scripts, configuration JSON, synced S3 documents, logs or fixtures.

## Repository hygiene

- Do not commit `dist/`, `node_modules/`, browser traces, screenshots, local skills, `.env` files or real credentials.
- Add or update Bun tests for behavior changes.
- Update `README.md` or `docs/architecture.md` when commands, permissions, persistence or architectural boundaries change.

## Design

- Please refer to [design guidelines](./design.md) for the visual and interaction principles.
- Design tokens live in `src/styles/token.css`; `src/styles/theme.css` is the Tailwind bridge over them. Components must not hardcode colours, radii, durations or type sizes — see [design tokens](./docs/design-tokens.md). Preview both themes with `bun run preview:tokens`.

## Skills

please read `./.agents/skills` for the list of available skills.

## Workflow

- 当用户要求在子工作区进行开发时，请在 workspace 下的子文件夹拉取最新的 main 分支，始终保持在该文件夹下进行工作。
- 提交代码前，请确保运行 `bun run check` 并通过所有检查。
- 功能开发完成后，创建对应的功能分支与对应的 Pull Request 进行跟踪。

<!-- ASTRYX:START -->

Astryx v0.6.3 · 164 components
CLI: run every command as `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:

1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:

- No <div> — components do all layout/spacing, page frame included.
- Frame first: read `astryx docs layout` before writing any page or screen — page frame, region widths, breakpoint behavior.
- Dense data = rows (Table, List/Item), never Card-wrapped list items; Card is for standalone widgets. Status = StatusDot/Token; Badge = counts only.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
search "<query>" find any component / hook / doc / template / block
component --list 164 components by category
template --list page + block recipes
docs <topic> browser-support, cli-integrations, color, elevation, getting-started, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling-libraries, styling, theme, tokens, typography, working-with-ai
swizzle <Name> eject component source for deep customization
upgrade --apply run after any Astryx or integration dependency bump
<!-- ASTRYX:END -->

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

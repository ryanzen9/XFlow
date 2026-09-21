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

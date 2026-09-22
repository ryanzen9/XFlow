#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$PROJECT_ROOT"

printf '%s\n' "🧪 Verifying cache benchmark scenarios..." >&2
bun test scripts/cache-benchmark.test.ts >&2
printf '\n%s\n' "📈 Running layered cache benchmark..." >&2
bun run scripts/cache-benchmark.ts "$@"

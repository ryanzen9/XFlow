#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$PROJECT_ROOT"

LIVE_TYPESAFE=false
for argument in "$@"; do
  if [ "$argument" = "--live-typesafe" ]; then
    LIVE_TYPESAFE=true
  fi
done

printf '%s\n' "🧪 Verifying cache benchmark scenarios..." >&2
bun test scripts/cache-benchmark.test.ts scripts/cache-live-benchmark.test.ts >&2

if [ "$LIVE_TYPESAFE" = "true" ]; then
  printf '%s\n' "⚠️  Live mode performs 4–10 real TypeSafe requests for 20–50 cold samples." >&2
  if [ -z "${TYPESAFE_API_KEY:-}" ]; then
    if [ ! -t 0 ]; then
      printf '%s\n' "TYPESAFE_API_KEY is required for --live-typesafe when stdin is not interactive." >&2
      exit 2
    fi
    printf '%s' "🔑 TypeSafe API Key (hidden): " >&2
    restore_terminal() {
      stty echo < /dev/tty 2>/dev/null || true
      unset TYPESAFE_API_KEY
    }
    trap 'restore_terminal' EXIT
    trap 'exit 130' HUP INT TERM
    stty -echo < /dev/tty
    IFS= read -r TYPESAFE_API_KEY < /dev/tty
    stty echo < /dev/tty
    printf '\n' >&2
    export TYPESAFE_API_KEY
  fi
  printf '%s\n' "📦 Building extension footprint baseline..." >&2
  bun run build >&2
  printf '\n%s\n' "🌐 Running LIVE TypeSafe SDK benchmark..." >&2
  bun run scripts/cache-live-benchmark.ts "$@"
  exit $?
fi

printf '\n%s\n' "📈 Running layered cache benchmark..." >&2
bun run scripts/cache-benchmark.ts "$@"

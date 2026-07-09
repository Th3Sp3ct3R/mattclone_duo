#!/bin/bash
set -euo pipefail

# Refresh the canonical root DuoPlus browser session from a logged-in Chrome CDP
# profile. This never types credentials; log in manually in the visible browser
# first, then run this script.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PORT="${DUOPLUS_VISIBLE_CDP_PORT:-9224}"
OUT="${DUOPLUS_SESSION_FILE:-$ROOT_DIR/duoplus-session.json}"
HERMES_NODE="${HERMES_NODE:-/Users/growthgod/.hermes/node/bin/node}"
COREPACK_YARN_CLI="${COREPACK_YARN_CLI:-/Users/growthgod/.cache/node/corepack/v1/yarn/1.22.22/lib/cli.js}"

if command -v yarn >/dev/null 2>&1; then
  YARN_CMD=(yarn)
elif [ -x "$HERMES_NODE" ] && [ -f "$COREPACK_YARN_CLI" ]; then
  YARN_CMD=("$HERMES_NODE" "$COREPACK_YARN_CLI")
else
  echo "Could not find yarn or Corepack Yarn CLI" >&2
  exit 127
fi

cd "$ROOT_DIR"

"${YARN_CMD[@]}" workspace @julio/api capture:session \
  --preset duoplus \
  --port "$PORT" \
  --out "$OUT"

echo "DuoPlus session refreshed at $OUT"

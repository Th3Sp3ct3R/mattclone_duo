#!/bin/bash
set -euo pipefail

# Refresh the configured DuoPlus browser session from a logged-in Chrome CDP
# profile. This never types credentials; log in manually in the visible browser
# first, then run this script.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PORT="${DUOPLUS_CDP_PORT:-9223}"
WAIT_MS="${DUOPLUS_CAPTURE_WAIT_MS:-9000}"
HERMES_NODE="${HERMES_NODE:-/Users/growthgod/.hermes/node/bin/node}"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$HERMES_NODE" ]; then
  NODE_BIN="$HERMES_NODE"
else
  echo "Could not find Node.js" >&2
  exit 127
fi

if [ -n "${DUOPLUS_SESSION_FILE:-}" ]; then
  OUT="$DUOPLUS_SESSION_FILE"
else
  OUT="$("$NODE_BIN" --input-type=module -e '
    import path from "node:path";
    import dotenv from "dotenv";
    const root = process.argv[1];
    dotenv.config({ path: path.join(root, ".env"), quiet: true });
    const configured = process.env.DUOPLUS_SESSION_FILE || "duoplus-session.json";
    process.stdout.write(path.isAbsolute(configured) ? configured : path.resolve(root, configured));
  ' "$ROOT_DIR")"
fi

cd "$ROOT_DIR"

"$NODE_BIN" apps/api/scripts/capture-session.mjs \
  --preset duoplus \
  --port "$PORT" \
  --wait-ms "$WAIT_MS" \
  --source "chrome-cdp:$PORT" \
  --out "$OUT"

echo "DuoPlus session refreshed at $OUT"

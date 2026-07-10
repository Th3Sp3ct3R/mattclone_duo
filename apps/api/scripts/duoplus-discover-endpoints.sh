#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PORT="${DUOPLUS_CDP_PORT:-9223}"
PROFILE_DIR="${DUOPLUS_CDP_PROFILE_DIR:-$HOME/.duoplus-refresh-chrome}"
CDP_SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-chrome.sh"
REFRESH_SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-refresh-root-session.sh"
DISCOVERY_SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-endpoint-discovery.mjs"
HERMES_NODE="${HERMES_NODE:-/Users/growthgod/.hermes/node/bin/node}"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$HERMES_NODE" ]; then
  NODE_BIN="$HERMES_NODE"
else
  echo "Could not find Node.js" >&2
  exit 127
fi

port_is_live() {
  curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1
}

profile_owns_port() {
  ps -axo command= | grep "[r]emote-debugging-port=${PORT}" | grep -F -- "--user-data-dir=${PROFILE_DIR}" >/dev/null 2>&1
}

mkdir -p "$ROOT_DIR/output" "$PROFILE_DIR"

if port_is_live; then
  if ! profile_owns_port; then
    echo "CDP port ${PORT} is live but is not owned by the dedicated DuoPlus profile: ${PROFILE_DIR}" >&2
    exit 4
  fi
else
  echo "Starting dedicated DuoPlus Chrome profile on CDP port ${PORT}"
  DUOPLUS_CDP_PORT="$PORT" DUOPLUS_CDP_PROFILE_DIR="$PROFILE_DIR" \
    "$CDP_SCRIPT" >"$ROOT_DIR/output/duoplus-cdp.log" 2>&1 &
  for _ in $(seq 1 40); do
    port_is_live && break
    sleep 0.5
  done
  if ! port_is_live; then
    echo "Dedicated DuoPlus Chrome did not start on port ${PORT}" >&2
    exit 5
  fi
fi

DUOPLUS_CDP_PORT="$PORT" "$REFRESH_SCRIPT"

"$NODE_BIN" "$DISCOVERY_SCRIPT" \
  --port "$PORT" \
  --artifact "$ROOT_DIR/output/duoplus-endpoint-discovery.json" \
  --report "$ROOT_DIR/docs/duoplus-endpoints-live-static-billable-skipped.md"

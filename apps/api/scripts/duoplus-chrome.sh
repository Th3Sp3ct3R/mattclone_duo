#!/bin/bash
set -euo pipefail
# Long-lived headless Chrome that holds a persistent, logged-in DuoPlus browser
# session for the scheduled token refresh (capture-session.mjs --port 9223).
# Managed by PM2 (name: duoplus-chrome) so it survives reboots via `pm2 resurrect`.
# The profile dir persists the DuoPlus login; re-login is only needed if that
# browser session itself expires.
PROFILE_DIR="${DUOPLUS_CDP_PROFILE_DIR:-$HOME/.duoplus-refresh-chrome}"
PORT="${DUOPLUS_CDP_PORT:-9223}"
CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

mkdir -p "$PROFILE_DIR"

exec "$CHROME_BIN" \
  --headless=new \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "https://my.duoplus.cn/images"

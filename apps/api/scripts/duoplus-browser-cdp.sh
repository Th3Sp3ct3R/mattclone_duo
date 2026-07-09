#!/bin/bash
set -euo pipefail

# Foreground DuoPlus Chrome/CDP process for supervisors like PM2.
# If the CDP port is already live, this process stays alive as a sentinel.
PROFILE_DIR="${DUOPLUS_VISIBLE_PROFILE_DIR:-/Users/growthgod/.duoplus-user-profiles/user_123}"
PORT="${DUOPLUS_VISIBLE_CDP_PORT:-9224}"
URL="${1:-https://my.duoplus.cn/images?page=1&pagesize=10&link_status=0%2C1%2C2%2C4&group_id=all&fid=-1}"
CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

port_is_live() {
  curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1
}

mkdir -p "$PROFILE_DIR"

if port_is_live; then
  echo "DuoPlus CDP already live on 127.0.0.1:${PORT}"
  echo "Profile: $PROFILE_DIR"
  while port_is_live; do
    sleep 30
  done
  echo "DuoPlus CDP port ${PORT} stopped"
  exit 1
fi

exec "$CHROME_BIN" \
  --user-data-dir="$PROFILE_DIR" \
  --remote-debugging-port="$PORT" \
  --no-first-run \
  --no-default-browser-check \
  "$URL"

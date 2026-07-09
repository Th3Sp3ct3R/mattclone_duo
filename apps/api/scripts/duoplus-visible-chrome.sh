#!/bin/bash
set -euo pipefail

# Visible Chrome profile for one-time DuoPlus login and browser/CDP operation.
# Keep this separate from the normal Chrome profile so the DuoPlus session is
# isolated and can be controlled through the fixed CDP port below.
PROFILE_DIR="${DUOPLUS_VISIBLE_PROFILE_DIR:-/Users/growthgod/.duoplus-user-profiles/user_123}"
PORT="${DUOPLUS_VISIBLE_CDP_PORT:-9224}"
URL="${1:-https://my.duoplus.cn/images?page=1&pagesize=10&link_status=0%2C1%2C2%2C4&group_id=all&fid=-1}"

mkdir -p "$PROFILE_DIR"

open -na "Google Chrome" --args \
  --user-data-dir="$PROFILE_DIR" \
  --remote-debugging-port="$PORT" \
  --no-first-run \
  --no-default-browser-check \
  "$URL"

echo "DuoPlus visible Chrome requested on CDP port $PORT"
echo "Profile: $PROFILE_DIR"
echo "URL: $URL"

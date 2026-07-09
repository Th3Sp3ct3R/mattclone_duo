#!/bin/bash
set -euo pipefail

# Keep the dedicated DuoPlus Chrome/CDP surface alive through PM2.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NAME="${DUOPLUS_BROWSER_PM2_NAME:-duoplus-browser-cdp}"
SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-browser-cdp.sh"

pm2 delete "$NAME" >/dev/null 2>&1 || true
pm2 start "$SCRIPT" \
  --name "$NAME" \
  --interpreter bash \
  --cwd "$ROOT_DIR" \
  --time
pm2 save
pm2 describe "$NAME"

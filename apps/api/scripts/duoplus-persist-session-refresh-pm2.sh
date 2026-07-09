#!/bin/bash
set -euo pipefail

# Supervise the DuoPlus session refresh loop through PM2.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NAME="${DUOPLUS_SESSION_REFRESH_PM2_NAME:-duoplus-session-refresh}"
SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-session-refresh-loop.sh"

pm2 delete "$NAME" >/dev/null 2>&1 || true
pm2 start "$SCRIPT" \
  --name "$NAME" \
  --interpreter bash \
  --cwd "$ROOT_DIR" \
  --time \
  --restart-delay 30000
pm2 save
pm2 describe "$NAME"

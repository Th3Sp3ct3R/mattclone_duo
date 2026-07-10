#!/bin/bash
set -euo pipefail

# Keep the canonical DuoPlus session file fresh after the dedicated Chrome
# profile is logged in. Failed attempts do not overwrite the existing session.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INTERVAL_SECONDS="${DUOPLUS_SESSION_REFRESH_INTERVAL_SECONDS:-300}"
PORTS="${DUOPLUS_SESSION_REFRESH_PORTS:-${DUOPLUS_CDP_PORT:-9223}}"
REFRESH_SCRIPT="$ROOT_DIR/apps/api/scripts/duoplus-refresh-root-session.sh"

cd "$ROOT_DIR"

echo "DuoPlus session refresh loop started"
echo "CDP ports: $PORTS"
echo "Session file: DUOPLUS_SESSION_FILE from environment/.env (repository default otherwise)"
echo "Interval: ${INTERVAL_SECONDS}s"

while true; do
  IFS=',' read -r -a ports <<< "$PORTS"
  refreshed=0
  for port in "${ports[@]}"; do
    port="${port//[[:space:]]/}"
    [ -n "$port" ] || continue
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] DuoPlus session refresh attempt on 127.0.0.1:$port"
    if DUOPLUS_CDP_PORT="$port" "$REFRESH_SCRIPT"; then
      echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] DuoPlus session refresh succeeded on 127.0.0.1:$port"
      refreshed=1
      break
    else
      status=$?
      echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] DuoPlus session refresh not ready on 127.0.0.1:$port, exit=$status"
    fi
  done
  if [ "$refreshed" -eq 0 ]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] DuoPlus session refresh waiting for login"
  fi
  sleep "$INTERVAL_SECONDS"
done

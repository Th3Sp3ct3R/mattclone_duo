#!/bin/bash
# Long-lived headless Chrome that holds a persistent, logged-in DuoPlus browser
# session for the scheduled token refresh (capture-session.mjs --port 9223).
# Managed by PM2 (name: duoplus-chrome) so it survives reboots via `pm2 resurrect`.
# The profile dir persists the DuoPlus login; re-login is only needed if that
# browser session itself expires.
exec "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --remote-debugging-port=9223 \
  --user-data-dir="/Users/growthgod/.duoplus-refresh-chrome" \
  --no-first-run \
  --no-default-browser-check

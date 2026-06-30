#!/usr/bin/env bash
# DuoPlus device automation — add GitHub app, open + drive login, verify.
# Captured LIVE from device snap_BzSfu (1080x1920) on 2026-06-30 via uiautomator dump + screencap.
# Transport: POST /api/v1/cloudPhone/command  {image_id, command}.  No ADB, no AI credits.
set -euo pipefail
KEY="${DUOPLUS_API_KEY:?export DUOPLUS_API_KEY}"
BASE="${DUOPLUS_API_BASE_URL:-https://openapi.duoplus.net}"
DEV="${1:-BzSfu}"
cmd(){ curl -s -X POST "$BASE/api/v1/cloudPhone/command" \
  -H "Content-Type: application/json" -H "DuoPlus-API-Key: $KEY" \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"image_id":sys.argv[1],"command":sys.argv[2]}))' "$DEV" "$1")"; echo; }
content(){ python3 -c 'import json,sys;print(json.load(sys.stdin).get("data",{}).get("content","").strip())'; }

# ---- GESTURE VOCABULARY (DuoPlus runs these as the shell `command`) ----
#   tap        : input tap X Y
#   swipe/scroll: input swipe X1 Y1 X2 Y2 DURATION_MS
#   type text  : input text "STRING"      (use %s for spaces)
#   key event  : input keyevent N         (66=Enter 4=Back 3=Home 67=Del)
#   launch     : monkey -p PKG -c android.intent.category.LAUNCHER 1
#   deep link  : am start -a android.intent.action.VIEW -d "URL"

# PREREQ: Google account signed in (verify: cmd 'dumpsys account | grep com.google')

# 1. Open GitHub app page (deep link) and install
cmd 'am start -a android.intent.action.VIEW -d "market://details?id=com.github.android" >/dev/null 2>&1'; sleep 5
cmd 'input tap 541 1201'                                   # Install  (captured)
for i in $(seq 1 8); do cmd 'pm list packages | grep com.github.android' | content | grep -q github && { echo ">> installed"; break; }; sleep 8; done

# 2. Launch GitHub + open login
cmd 'monkey -p com.github.android -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1'; sleep 5
cmd 'input tap 540 1189'                                   # "SIGN IN TO GITHUB.COM" (captured) -> Chrome Custom Tab
sleep 6

# 3. LOGIN GESTURES (github.com webview; coords from screencap, less stable than native)
cmd 'input tap 540 634'                                    # focus username field
cmd 'input text "YOUR_GITHUB_USERNAME"'                    # <-- fill in (was pre-filled admin@instagrowth.com)
cmd 'input tap 540 876'                                    # focus password field
# cmd 'input text "YOUR_GITHUB_PASSWORD"'                  # <-- CREDENTIAL: fill in yourself / via engine secret-ref
cmd 'input keyevent 111'                                   # ESC to drop keyboard so the button is tappable (optional)
cmd 'input tap 540 1050'                                   # green "Sign in" button

# 4. VERIFY (safe to run unattended)
sleep 6
echo "== verify package =="; cmd 'pm list packages | grep com.github.android' | content
echo "== verify foreground is GitHub & logged in =="
cmd 'dumpsys window | grep mCurrentFocus' | content
# Logged-in heuristic: GitHub home shows the bottom nav (Home/Notifications/Explore/Profile)
cmd 'uiautomator dump /sdcard/v.xml >/dev/null 2>&1; grep -oE "Home|Notifications|Explore|My Profile" /sdcard/v.xml | sort -u' | content

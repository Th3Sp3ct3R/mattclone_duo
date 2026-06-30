# DuoPlus "Add GitHub App" Automation + TOTP Login — Session Log (2026-06-30)

Captured live from device **`snap_BzSfu`** (`providerDeviceId=BzSfu`, 1080×1920) and the
`instagrowth-saas` backend. Companion to [duoplus-endpoints-captured.md](./duoplus-endpoints-captured.md)
and [duoplus-port-plan.md](./duoplus-port-plan.md).

## 1. Device control transport (what the DuoPlus desktop app uses)

All device actions go through one HTTPS API — no ADB (the cloud-phone ADB bridge is `offline`
unless rooted), no CDP, no PC takeover:

```
POST {DUOPLUS_API_BASE_URL}/api/v1/cloudPhone/command
Header: DuoPlus-API-Key: <key>          # from .env
Body:   {"image_id":"BzSfu","command":"<shell>"}
Resp:   {"code":200,"data":{"success":true,"content":"<stdout>"}}
```

App-management endpoints: `/api/v1/app/list` (catalog), `/app/install`
`{image_ids,app_id}`, `/app/installedList`, `/app/start`, `/app/uninstall`.
GitHub is **not** in DuoPlus's ~138-app catalog → it installs via the Play Store flow.

## 2. Gesture vocabulary (run as the shell `command`)

| Gesture | Command |
|---------|---------|
| Tap | `input tap X Y` |
| Swipe / scroll | `input swipe X1 Y1 X2 Y2 DURATION_MS` |
| Type | `input text "STRING"` (`%s` = space) |
| Key | `input keyevent N` (66=Enter 4=Back 3=Home 67=Del 111=Esc) |
| Launch app | `monkey -p PKG -c android.intent.category.LAUNCHER 1` |
| Deep link | `am start -a android.intent.action.VIEW -d "URL"` |
| Screenshot | `screencap -p \| base64` |
| UI tree | `uiautomator dump /sdcard/u.xml; cat /sdcard/u.xml` |

## 3. "Add GitHub app + login" — captured flow

Script: [`apps/api/scripts/duoplus-add-github.sh`](../apps/api/scripts/duoplus-add-github.sh)

| Step | Command / coord | Notes |
|------|-----------------|-------|
| **Prereq** | `dumpsys account \| grep com.google` | Play Store needs a Google account; otherwise it opens `UnauthenticatedMainActivity` (no search bar, only "Sign in" at `540,1433`). Signed in as `dnajwald@gmail.com`. |
| Open GitHub page | `am start …VIEW -d "market://details?id=com.github.android"` | deep link beats tapping the search bar |
| Install | `input tap 541 1201` | captured (native button) |
| Confirm | `pm list packages \| grep com.github.android` | installed in ~16s |
| Launch | `monkey -p com.github.android …` | → `SimplifiedLoginActivity` |
| "Sign in to GitHub.com" | `input tap 540 1189` | opens **Chrome Custom Tab** to github.com |
| Username field | `input tap 540 634` | webview — coord from screencap, less stable |
| Password field | `input tap 540 876` | **credential left as placeholder** |
| Sign in | `input tap 540 1050` | green button |

**WebView caveat:** Google sign-in and the github.com login form render inside Chrome web
content → uiautomator can't see those fields; their coords are screenshot-derived and may shift.
Native screens (Play Store page, GitHub app welcome) are stable.

**Credential boundary:** password entry / cookie-or-saved-password extraction was **not** performed
(handled by the operator or the engine secret-ref resolver).

## 4. TOTP 2FA auto-login — how `instagrowth-saas` does it (to port here)

Source of truth: `instagrowth-saas/backend/relogin-fleet.ts` (+ `src/services/totp.js`).
Seed stored in DB column `totp_secret` (base32). Pure Node `crypto` (RFC 6238):

```
secret(base32) → base32Decode → key
counter = floor(now/1000/30)                 # 30s window
hmac = HMAC-SHA1(key, 8-byte counter)
off  = hmac[-1] & 0x0f                        # dynamic truncation
code = 31-bit int at off  →  % 1e6  →  6-digit zero-padded
```

Login flow: `account.login()` → catch `IgLoginTwoFactorRequiredError` → `code = generateTOTP(seed)`
→ `twoFactorLogin({verificationCode, twoFactorIdentifier, verificationMethod:'0', trustThisDevice:'1'})`
→ **retry with next window (`counter+1`)** on rejection → serialize + save `session_state`.

### Gap in `mattclone_duo` (to fix)
- `secret-resolver.js` already resolves `secretRefs.totp` → `credentials.totpSecret`, **but nothing
  generates a code from it.** The TikTok/YouTube `handleEmailVerification` only fetches from email.
- **Fix:** add `generateTOTP` (copy above) to `packages/integrations`; in the login challenge handler,
  if `totpSecret` present → generate + type the code (fall back to email), with next-window retry.
- Unblocks TOTP accounts like `vmvy919` (seed `5TLXET…`) that currently dead-end.

## 5. Current device state (post app-update)

- `snap_BzSfu`: GitHub (`com.github.android`), Chrome, Play Store installed; Google
  `dnajwald@gmail.com` signed in.
- GitHub app sits at `SimplifiedLoginActivity` / github.com login (username `admin@instagrowth.com`
  pre-filled, password pending operator).

## 6. ⚠️ Security note (instagrowth-saas, separate repo)
`relogin-fleet.ts` and `verify2fa.cjs` contain **hardcoded plaintext secrets** — a Postgres
connection string with password (`…@turntable.proxy.rlwy.net`), account passwords, and full TOTP
seeds. Move to env/secret-refs and rotate the DB password.

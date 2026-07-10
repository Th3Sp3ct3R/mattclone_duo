# DuoPlus — Captured Endpoint Map (live reverse-engineering)

> Captured 2026-06-26 via CDP network interception of the real `my.duoplus.cn`
> web console (logged-in session). This documents what the **actual** product
> does, vs. the public OpenAPI. Live session secrets (auth token, ARMVM
> appkey/appSecret/sessionId) are **redacted** — they rotate per session.

## TL;DR architecture

- **Web app:** `https://my.duoplus.cn` — Next.js (App Router, RSC).
- **API base:** `https://api.duoplus.cn` (mirror: `api.duoplus.net`).
- **Auth:** every API call carries an `Authorization: <token>` header (~35-char
  opaque token issued by `POST /account/login`). `Lang: en` also sent.
- **DuoPlus is a reseller.** The real cloud phones are **ARMVM** (`armvm.com` /
  `oversea.armvm.com`) routed over **`mobnow.net`** edge nodes. DuoPlus's API
  brokers an ARMVM session token to the browser.
- **Two distinct surfaces:**
  1. **Focus-mode wall** (`/sync-operate`) = **screenshot polling** (low-res).
  2. **Live control** (`/control`) = **ARMVM WebRTC** (full-res, interactive).

---

## 1. Auth

| Endpoint | Method | Body | Notes |
|---|---|---|---|
| `/account/login` | POST | `{username, password, ...}` | Returns the `Authorization` token. |
| `/account/passwordErrorCount` | POST | `{username}` | Pre-login (Authorization empty). |
| `/account/profile` | POST | — | User profile. |
| `/account/cloudPhone` | GET | — | Account-level cloud-phone summary. |
| `/account/checkUserStatus` | POST | — | |

All subsequent `api.duoplus.cn/*` calls require header `Authorization: <token>`.

---

## 2. Phone list / focus-mode wall (`/sync-operate`)

The wall renders live thumbnails by **polling screenshots** — there is **no
video stream** on the wall. This matches our `DuoPlusFocusMode` design.

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `POST /image/controlList` | POST | `{page,pagesize,region_type_id,group_id,keyword}` | Phones shown in sync-operate. |
| `POST /image/list` | POST | `{page,pagesize,link_status:["0","1","2","4"],group_id,fid}` | Full phone list w/ status. |
| `POST /image/batchCapture2` | POST | `{image_ids:[...],width:320,height:320,quality:20,supplier_id:1}` | **Frame feed** — returns screenshots for the grid. Polled on an interval. |
| `POST /image/batchHeartbeat` | POST | `{image_ids:[...],type:1}` | Keepalive for the batch session. |
| `POST /image/groupList` | POST | — | Groups/folders. |
| `GET  /image/windowSetting` | GET | — | Saved window/grid prefs. |
| `POST /image/supplierRegionList` | POST | — | Supplier/region routing. |

`link_status` legend (observed): `0,1,2,4` selected = e.g. stopped/running/starting/etc.
`image_id` = the short phone code (e.g. `FpPU2`, `Qg7jG`, `kZfN4`).

---

## 3. Live control (`/control?id=<code>&mid=<code>&name=snap_<code>&w=&h=`)

Opening a phone for real-time control runs this handshake (all POST to `api.duoplus.cn`):

| Step | Endpoint | Body | Returns |
|---|---|---|---|
| 1 | `/image/startCheck` | `{image_id}` | `{need_waiting, task_progress, deduction_type,...}` |
| 2 | `/image/start` | `{image_id, fixed_type:1}` | `{duration_seconds,...}` (boots/leases the phone) |
| 3 | `/image/connect` | `{image_id}` | **ARMVM connection token** (see below) |
| 4 | `/image/connectTokenShared` | `{image_ids:[...], uuid}` | shared token for multi-phone control |
| — | `/image/heartbeat` | `{image_id, type:1\|3}` | per-phone keepalive |

### `/image/connect` response (the important one)

```json
{
  "code": 200,
  "data": {
    "route_list": [
      {"id":"usa1","name":"Route USA","domain":"us3.mobnow.net:443","udp":true},
      {"id":"hk1","name":"Route HK 1","domain":"hk3.mobnow.net:443","udp":true},
      {"id":"cdn2","name":"Route Global 1","domain":"dp-ws3.mobnow.net:443","udp":false},
      "... SG/HK/global edge nodes ..."
    ],
    "video_stream_support": true,
    "type": 1, "fixed_type": 1
  }
}
```

A second `connect` payload carries the **ARMVM control token**:

```json
{
  "data": {
    "id": "FpPU2", "name": "snap_FpPU2", "type": 4,
    "token": { "resultInfo": {
      "controlList":      [{"controlCode":"SGCF-TCP-CONTROL-13",
                            "controlInfoList":[{"controlIp":"10.4.50.6","controlPort":10130}]}],
      "webControlList":   [{"webControlCode":"SGCF-TCP-CONTROL-13",
                            "webControlInfoList":[{"controlIp":"sgcfctl.armvm.com","controlPort":10137}]}],
      "webRtcControlList":[{"controlCode":"SGCF-TCP-CONTROL-13",
                            "webRtcControlInfoList":[{"controlIp":"10.4.50.6","controlPort":10130}],
                            "gateway":{"gatewayIp":"sgcfctl.armvm.com","gatewayPort":10073}}],
      "userId": 7186,
      "sessionId": "<redacted>",
      "padList": [{"padCode":"VM0102500601..","padStatus":"1","padType":"ANDROID"}],
      "merchantInfo": {"appkey":"<redacted>","appSecret":"<redacted>"},
      "domain": "https://oversea.armvm.com",
      "controlTactics": "auto",
      "gateway": {"gatewayIp":"sgcfctl.armvm.com","gatewayPort":10073}
    }, "padCode":"VM0102500601.." }
  }
}
```

**Interpretation:** the browser hands this token to the **ARMVM web SDK**, which
opens a **WebRTC** session (UDP via `mobnow.net` edge, or TCP fallback to
`sgcfctl.armvm.com`) to stream/control the Android pad `padCode`. The media is
WebRTC, so it never shows up as an HTTP/WS request — that's why the wall is
screenshots but the control view is crisp full-res.

### 3b. The web SDK that consumes the token — RedFinger `BgsSdk`

*(Captured live 2026-07-09 via CDP against the logged-in console.)*

DuoPlus's `/control` page loads **`https://my.duoplus.cn/BgsSdk.min.1.54.0.dp.js`**
(v1.54.0, self-hosted, ~1.1 MB). Its internals call a `redfinger.*` namespace, so
the "ARMVM" control stack is really **RedFinger's cloud-phone SDK** (vendor: Hunan
MC Technology) riding on **ByteDance VeRTC**, with a `PeerGW`/`P2p` fallback
transport. Public SDK docs are not indexed — the bundle is the source of truth.
Globals: `BgsSdk` (control API), `MultiSdk` (multi-phone), `Player`/`MP4Player`/`myplayer`
(WebGL video render), `BgsReport` (telemetry).

**Full runtime sequence** (what the browser actually does):

```
1. POST /image/startCheck   {image_id}                → route_list + video_stream_support
2. POST /image/start        {image_id, fixed_type:1}  → lease (need_waiting, deduction_type, duration_seconds)
3. POST /image/connect      {image_id}                → resultInfo (control gateway,
                                                          merchantInfo{appkey,appSecret}, sessionId, padCode)
4. (client generates a uuid)
   POST /image/connectTokenShared {image_ids:[id], uuid}  → serverToken   ← the key output
5. BgsSdk.initPhone({ appId, onlineTime, viewId, width, height, bitrate, fps,
                      isWebRtc, encryptType, instanceCode, callbacks })   (sceneType = CLOUD_PHONE)
6. POST https://oversea-platform.armvm.com/sdk/instance/cloud-phone-connect
        ?serverToken=<serverToken>&auth_ver=3&nonce=<Date.now()>
        body: { uuid, clientToken: BgsSdk.getClientToken() }   → media/VeRTC params
7. BgsSdk.startPhone(serverToken)  → VeRTC stream + control datachannel bound to <video>
8. POST /image/heartbeat {image_id, type:1|3}   (keepalive)
```

Two corrections to the §3 capture above:

- **`connectTokenShared` is the `serverToken` source.** `connect` alone returns only
  `resultInfo`; the token `startPhone` consumes comes from `connectTokenShared`, keyed
  to a **client-generated `uuid`**.
- **`clientToken` is minted in the browser** by `BgsSdk.getClientToken()` =
  `rand8 + base64("uuid,2,version,platform,browserType,browserVersion,appId,timestamp")`
  — it must run client-side, not on the server.

**`initPhone` params** (validated by `redfinger.checkParam`): `appId` (from
`merchantInfo.appkey`), `onlineTime`, `viewId` (DOM element hosting the video),
`width`, `height`, `bitrate`, `fps`, `isWebRtc`, `encryptType`, `instanceCode`
(= padCode), plus optional `packageName`, `openApiHost`, `connectPhoneUrl`,
`reportUrl`, `isReport`, and `callbacks` (`onInitSuccess/Fail`,
`onConnectSuccess/Fail`, `onStoped`). `startPhone(serverToken)` takes the single
serverToken string.

**Control verbs** (all on `BgsSdk`): `sendCommand`, `sendInputString`,
`sendInputClipper`, `keyCtrlEdit`, `setPhoneRotation`, `setGPS`,
`changeResolution`, `setStreamConfig`, `setupVideoQuality`, `switchKeyboard`,
`audioPauseOrResume`, `sendTransparentMsg`.

**Our client** ([duoplus-internal-client.js](../packages/device-control/src/duoplus-internal-client.js))
now implements steps 1–4 + heartbeat (`startCheck`, `start`, `connect`,
`connectTokenShared`, `heartbeat`). Remaining for live control (Path C): self-host
`BgsSdk.min.1.54.0.dp.js` and add a `LiveControl` component that runs
`initPhone → startPhone` and forwards input to `sendCommand`/`sendInputString`.
No ArmCloud AK/SK is needed — the brokered DuoPlus `merchantInfo` + `serverToken`
carry the whole session.

---

## 4. Integration paths for our UI

| Path | How | Effort | Live video? |
|---|---|---|---|
| **A. Screenshot wall** (already built) | Poll `/image/batchCapture2` for the grid; render tiles. Our `DuoPlusFocusMode` already matches this. | Low | No (frames) |
| **B. Iframe the control page** | Embed `https://my.duoplus.cn/control?id=<code>&...` in our UI. **No `X-Frame-Options`/CSP frame restriction observed**, so framing is viable *if* the DuoPlus auth cookie is present in that browser context. | Low–Med | Yes (DuoPlus's own WebRTC) |
| **C. Reimplement ARMVM** | Call our DuoPlus `/image/connect` server-side → get ARMVM token → run the ARMVM web SDK / WebRTC handshake ourselves. Full control of the surface. | High | Yes (native) |

**Recommendation:** Ship **A** now (done). For true live phones, prototype **B**
(iframe) next — cheapest route to a working stream — and keep **C** as the
"own-the-stack" option if framing/cookie constraints bite.

---

## 4b. App & proxy provisioning (official OpenAPI — verified live 2026-06-26)

Shipping phones with apps does **not** use APK URLs or ADB push. DuoPlus hosts the
APKs; you install by `app_id`. Verified against the live account:

| Endpoint | Method | Notes |
|---|---|---|
| `POST /api/v1/app/list` | POST | **Platform app catalog** (~100+ apps). Items: `{id, name, pkg, version_list}`. ⚠️ The docs call this `app/platformList` — that path returns error 160007; the real path is `app/list`. |
| `POST /api/v1/app/teamList` | POST | Your uploaded apps (0 currently). |
| `POST /api/v1/app/install` | POST | `{image_ids, app_id, app_version_id}` — batch install (≤20 phones). |
| `POST /api/v1/app/installedList` | POST | `{image_id}` — verify what's installed. |
| `POST /api/v1/proxy/list` | POST | **9 real proxies** on the account (socks5). Items: `{id, name, host, port, user, area, group_*}`. |
| `POST /api/v1/proxy/add` | POST | socks5 only. |

Resolved app_ids (live): **TikTok `9Jp7o#0`**, **Instagram `kNx78#0`** (also TikTok Asia/Lite, X, YouTube, Spotify, Gmail, Maps, dating apps, etc.).

**Best provisioning path:** `app/list` → resolve names→`app_id` → `app/install`.
Implemented in `DuoplusClient.{listPlatformApps,installApp}` +
`DuoplusCloudPhoneProvider.provisionApps({appNames})`, driven by `DUOPLUS_APP_SET`.

## 4c. Web-session token: capture + scheduled refresh (ops)

The internal API (§4) authenticates with a short-lived `Authorization` token that
only the logged-in **browser** can mint (`/account/login` is gated by request
signing — a direct API login returns code 405). So we refresh it by re-capturing
from a persistent logged-in headless Chrome.

**Components (all PM2-managed, persisted via `pm2 save` → survive reboot):**
| PM2 process | What it is |
|---|---|
| `duoplus-chrome` | Headless Chrome ([apps/api/scripts/duoplus-chrome.sh](../apps/api/scripts/duoplus-chrome.sh)) on `--remote-debugging-port=9223` with a **persistent** profile `~/.duoplus-refresh-chrome` that holds the DuoPlus login. |
| `duoplus-session-refresh` | Cron (`*/15 * * * *`) running `capture-session.mjs --preset duoplus --port 9223` → sniffs a fresh `Authorization` from `/images` XHRs → writes `duoplus-session.json` (gitignored). |

**Consumers:** `DuoplusInternalClient` (via `createDuoplusInternalClient`) reads
`DUOPLUS_SESSION_FILE`; `GET /api/v1/engine/duoplus/frames` powers the Focus Mode
wall's live `batchCapture2` frames and logs a **warning** when the session is
missing/expired (wall shows a `session expired` badge + falls back to ADB shots).

**Manual capture / re-login:** if the browser session itself expires (days/weeks),
the cron logs `❌ Not logged in`. Re-login once:
```bash
# launch the persistent profile visibly, log into DuoPlus, then close it
open -a "Google Chrome" --args --remote-debugging-port=9223 \
  --user-data-dir="$HOME/.duoplus-refresh-chrome"
# (or just: yarn workspace @julio/api capture:session --preset duoplus --port 9223)
```

For deterministic validated refresh, redacted endpoint collection, static
comparison, and report generation, use the documented workflow in
[`docs/duoplus-endpoint-discovery.md`](./duoplus-endpoint-discovery.md):

```bash
yarn workspace @julio/api duoplus:discover
```

## 5. Notes / gotchas

- The public OpenAPI in the repo (`cloudPhone/list`, `status`, ADB) is a
  *different, documented* surface. The web console uses the internal `/image/*`
  + `/account/*` set above. Both hit `api.duoplus.cn`.
- `region_type_id` (e.g. `lyPSZ`) scopes phones to a supplier region.
- Billing is metered on control time (`deduction_type`, `duration_seconds`,
  `/phone/costInfo`, `/phone/about2Expire`) — relevant before auto-starting phones.
- Supplier backend = **ARMVM** (`armvm.com`, `oversea.armvm.com`) over
  **mobnow.net** edges. If we ever go direct, that's the vendor to integrate.

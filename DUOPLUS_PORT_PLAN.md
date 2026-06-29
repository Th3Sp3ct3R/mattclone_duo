# DuoPlus → mattclone_duo Porting Plan

> **Status:** Draft, ready for review.
> **Source of truth (TS):** `/Users/growthgod/VAN/duoplus/src/`
> **Source of truth (API):** `/Users/growthgod/Documents/VANTA-Brain/docs/duoplus-openapi-reference.md`
> **Target:** `/Users/growthgod/VAN/duotest/mattclone_duo/` — JS + MongoDB + Express + RabbitMQ.

---

## 1. Goal

Replace the TypeScript `DuoPlus` Express service (port 3003, BullMQ, Postgres) with a native
integration into mattclone_duo's multi-provider framework. DuoPlus becomes the **second cloud
phone provider**, alongside VMOS.

**Non-goals:**

- No TypeScript conversion (the framework is plain JS + JSDoc).
- No Postgres — all DuoPlus state moves to MongoDB.
- No BullMQ — all workers run as RabbitMQ consumers.
- No legacy `DuoPlus*` classes left behind — full rewrite in framework idioms.

---

## 2. Architecture Overview

```
                              ┌──────────────────────┐
                              │  apps/web-next        │
                              │  /duoplus/* UI        │
                              └──────────┬───────────┘
                                         │ HTTP /api/v1/duoplus/*
                                         ▼
┌──────────────────────────────────────────────────────────────┐
│  apps/api (Express, port 4000)                                │
│  ├── routes/v1/duoplus.route.js                               │
│  ├── controllers/duoplus.{devices,templates,...}.controller   │
│  ├── services/duoplus-campaign.service.js                     │
│  ├── models/duoplus-*.model.js (Mongoose)                     │
│  ├── cron/index.js → duoplus-status-poll (every 60s)          │
│  └── queue/rabbitmq.js → publishJson('duoplus.*', ...)        │
└──────────────────────────────────────────────────────────────┘
              │                                          │
              ▼                                          ▼
┌──────────────────────────┐              ┌────────────────────────────┐
│  packages/device-control │              │  apps/worker                │
│  ├── duoplus-client.js   │              │  ├── engine.worker.js       │
│  ├── duoplus-direct-     │              │  │   (registers duoplus.*)  │
│  │   controller.js       │              │  └── handlers/              │
│  └── provider.js (ext.)  │              │      ├── duoplus-power      │
│                          │              │      ├── duoplus-exec       │
│                          │              │      ├── duoplus-upload     │
│                          │              │      ├── duoplus-campaign   │
│                          │              │      └── duoplus-status-poll│
└──────────────────────────┘              └────────────────────────────┘
              │                                          │
              ▼                                          ▼
       DuoPlus HTTP API                          MongoDB + Redis
       (QPS=1 per endpoint)                      (job state, cache)
```

**Key change vs. current Engine:** the Engine bundles provider + workers + UI in one
Express app. mattclone_duo splits API (sync request/response) from workers (async job
execution), with RabbitMQ as the bus.

---

## 3. Provider Switch

`CLOUD_PROVIDER` already exists in `apps/api/src/config/env.js` (`vmos` is the default).
Extend the factory to accept `duoplus`:

```js
// packages/device-control/src/provider.js (diff)
import { DuoplusClient } from './duoplus-client.js';
import { DuoplusDirectController } from './duoplus-direct-controller.js';

export function createCloudPhoneProvider({ type = 'vmos', ...config } = {}) {
  if (type === 'vmos') return new VmosCloudPhoneProvider({ client: new VmosClient(config) });
  if (type === 'duoplus') return new DuoplusCloudPhoneProvider({ client: new DuoplusClient(config) });
  throw new DeviceControlError(`Unsupported cloud phone provider: ${type}`, { code: 'UNSUPPORTED_PROVIDER' });
}
```

`EngineDevice.provider` enum (`apps/api/src/models/engine-device.model.js:3`) is currently
`['vmos']` — must be extended to `['vmos', 'duoplus']`. Same for the device controller
factory in `worker-context.js` (currently only knows VMOS's `createDirectController`).

---

## 4. Environment Variables (add to `apps/api/src/config/env.js` + `.env.example`)

```bash
# DuoPlus provider (parallel to VMOS_*)
DUOPLUS_API_KEY=
DUOPLUS_API_BASE_URL=https://openapi.duoplus.net
DUOPLUS_MIN_DELAY_MS=1100              # QPS=1 floor per endpoint
DUOPLUS_DEFAULT_LANG=en                # one of zh | zh-TW | en | ru
DUOPLUS_STATUS_POLL_INTERVAL_MS=60000  # cron cadence
DUOPLUS_DEVICE_SYNC_INTERVAL_MS=600000 # cron cadence (10 min)
DUOPLUS_AUTO_BUY_ENABLED=false
DUOPLUS_AUTO_BUY_PROXY_ID=
DUOPLUS_DAILY_SPEND_CAP_USD=0

# SadCaptcha (for TikTok slide puzzle solver)
SADCAPTCHA_KEY=
SADCAPTCHA_BASE_URL=https://www.sadcaptcha.com/api/v1
```

Wire into `env` object alongside `vmosAccessKey` etc. They are **optional** unless
`CLOUD_PROVIDER=duoplus`, in which case `DUOPLUS_API_KEY` is required.

---

## 5. New Files — File-Level Mapping

### 5.1 Packages (shared library code)

| Path | Source (Engine TS) | Purpose |
|---|---|---|
| `packages/device-control/src/duoplus-client.js` | `src/services/DuoPlusClient.ts` + `RateLimiter.ts` | HTTP client + per-endpoint rate limiter (1100ms floor) |
| `packages/device-control/src/duoplus-direct-controller.js` | `src/services/DuoPlusAdbController.ts` | `DuoplusDirectController` — `tap/swipe/inputText/dumpUI/getScreenshot/...` over `cloudPhone/command` |
| `packages/device-control/src/provider.js` *(edit)* | n/a | Add `DuoplusCloudPhoneProvider` |
| `packages/device-control/src/index.js` *(edit)* | n/a | Export `DuoplusClient`, `DuoplusDirectController`, `DuoplusCloudPhoneProvider` |
| `packages/integrations/src/duoplus-file-uploader.js` | `src/services/FileUploader.ts` | `signedUrl → PUT → poll list` flow |
| `packages/integrations/src/duoplus-captcha-solver.js` | `src/services/CaptchaSolver.ts` | TikTok slide puzzle solver via SadCaptcha |
| `packages/integrations/src/index.js` *(edit)* | n/a | Export above |

### 5.2 API models (Mongoose)

| Path | Source (Drizzle/Postgres) | Notes |
|---|---|---|
| `apps/api/src/models/engine-device.model.js` *(edit)* | `duoplusDevices` | Add `provider: ['vmos', 'duoplus']` enum, add `duoplusMeta` sub-schema (`imageId`, `groupId`, `modelId`, `proxyId`, `adbWhiteList[]`, `rootEnabled`, `sharePassword`) |
| `apps/api/src/models/duoplus-template.model.js` | `duoplusTemplates` | `templateId`, `name`, `taskType`, `fields` (Map), `official: bool`, `syncedAt` |
| `apps/api/src/models/duoplus-campaign.model.js` | `duoplusCampaigns` | `name`, `templateId`, `devices[]`, `schedule{issueAt,repeat}`, `status`, `duoplusTaskIds[]`, `lastSyncedAt` |
| `apps/api/src/models/duoplus-setting.model.js` | `duoplusSettings` | k-v (apiKey, defaultLang, autoBuy flags, spend cap) |
| `apps/api/src/models/duoplus-api-log.model.js` | `duoplusApiLog` | `endpoint`, `requestBody`, `responseBody`, `durationMs`, `ok`, `error`, `at` — capped at 30 days via TTL index |
| `apps/api/src/models/engine-job-run.model.js` *(reused)* | `duoplusJobs` | The framework's `EngineJobRun` is a superset; reuse with `queueName: 'duoplus.*'` |

### 5.3 API controllers + routes

| Path | Purpose |
|---|---|
| `apps/api/src/controllers/duoplus-devices.controller.js` | list / sync / get / power / restart / proxy / exec / group ops |
| `apps/api/src/controllers/duoplus-templates.controller.js` | list custom + official templates |
| `apps/api/src/controllers/duoplus-campaigns.controller.js` | CRUD + cancel + re-execute + logs |
| `apps/api/src/controllers/duoplus-uploads.controller.js` | sign + status endpoints |
| `apps/api/src/controllers/duoplus-settings.controller.js` | get/update k-v |
| `apps/api/src/controllers/duoplus-jobs.controller.js` | list `EngineJobRun` filtered to duoplus queues |
| `apps/api/src/controllers/duoplus-health.controller.js` | DuoPlus-specific ping (`getPhoneStatus` of known device) |
| `apps/api/src/routes/v1/duoplus.route.js` | mounts all above under `/duoplus` |
| `apps/api/src/routes/v1/index.js` *(edit)* | `router.use('/duoplus', createDuoplusRouter())` |

### 5.4 Services

| Path | Purpose |
|---|---|
| `apps/api/src/services/duoplus-campaign.service.js` | Orchestrates: upload → build addTask config → dispatch `duoplus.campaign` job |
| `apps/api/src/services/duoplus-device-sync.service.js` | Pulls `cloudPhone/list`, upserts `EngineDevice` rows |
| `apps/api/src/services/duoplus-status-sync.service.js` | Polls `automation/taskList` for active campaigns, maps status codes |

### 5.5 Worker handlers + registration

| Path | Purpose |
|---|---|
| `apps/worker/src/handlers/duoplus-power.handler.js` | power on/off/restart jobs |
| `apps/worker/src/handlers/duoplus-exec.handler.js` | ADB command execution |
| `apps/worker/src/handlers/duoplus-upload.handler.js` | two-step upload (signedUrl → PUT → poll) |
| `apps/worker/src/handlers/duoplus-campaign.handler.js` | replaces BullMQ `CampaignWorker` — uploads media, builds task config, calls `addTask` |
| `apps/worker/src/handlers/duoplus-status-poll.handler.js` | replaces `StatusPoller` setInterval — polls `taskList` + `taskLogList`, updates campaign status |
| `apps/worker/src/engine.worker.js` *(edit)* | Registers all `duoplus.*` queues (see §10) |

### 5.6 Cron

| Path | Purpose |
|---|---|
| `apps/api/src/cron/index.js` *(edit)* | Add `duoplus-device-sync` (every 10min) and `duoplus-status-poll` (every 60s) |

### 5.7 UI

| Path | Source | Purpose |
|---|---|---|
| `apps/web-next/app/duoplus/page.js` | `public/duoplus/index.html` | Dashboard |
| `apps/web-next/app/duoplus/devices/page.js` | `public/duoplus/devices.html` | Device list / sync / power |
| `apps/web-next/app/duoplus/templates/page.js` | `public/duoplus/templates.html` | Template gallery |
| `apps/web-next/app/duoplus/campaigns/page.js` | `public/duoplus/campaigns.html` | Campaign manager |
| `apps/web-next/app/duoplus/settings/page.js` | `public/duoplus/settings.html` | Provider config |
| `apps/web-next/app/duoplus/jobs/page.js` | `public/duoplus/jobs.html` | Job run inspector |

(UI is **not blocking** the API port — the API + workers ship first; UI migrates after.)

---

## 6. `DuoplusClient` — Port of `DuoPlusClient.ts`

Mirror `packages/device-control/src/vmos-client.js` style. Class-based, fetch-based,
`DeviceControlError` on failure.

```js
// packages/device-control/src/duoplus-client.js — sketch
import { DeviceControlError } from './errors.js';

const DEFAULT_BASE_URL = 'https://openapi.duoplus.net';
const MIN_DELAY_MS_DEFAULT = 1100;

export class DuoplusClient {
  constructor({
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    lang = 'en',
    minDelayMs = MIN_DELAY_MS_DEFAULT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  } = {}) {
    if (!apiKey) throw new DeviceControlError('Missing DUOPLUS_API_KEY', { code: 'DUOPLUS_CONFIG' });
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.lang = lang;
    this.minDelayMs = minDelayMs;
    this.fetchImpl = fetchImpl;
    this.sleep = sleep;
    this._lastCallAt = new Map();   // per-endpoint timestamp
  }

  async _request(endpoint, body) {
    const now = Date.now();
    const last = this._lastCallAt.get(endpoint) ?? 0;
    const wait = this.minDelayMs - (now - last);
    if (wait > 0) await this.sleep(wait);
    this._lastCallAt.set(endpoint, Date.now());

    const url = `${this.baseUrl}/api/v1/${endpoint}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DuoPlus-API-Key': this.apiKey,
        Lang: this.lang
      },
      body: JSON.stringify(body ?? {})
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { code: -1, message: 'Non-JSON response' }; }
    if (!res.ok || (data.code !== undefined && data.code !== 200)) {
      throw new DeviceControlError('DuoPlus request failed', {
        code: 'DUOPLUS_REQUEST_FAILED',
        details: { status: res.status, endpoint, request: body, response: data }
      });
    }
    return data;
  }

  // ── Cloud Phone ──────────────────────────────────────────
  listCloudPhones({ page = 1, pagesize = 20, status, groupId } = {}) {
    return this._request('cloudPhone/list', { page, pagesize, status, groupId });
  }
  getPhoneStatus(imageIds) {
    return this._request('cloudPhone/status', { image_ids: imageIds });
  }
  powerOn(imageIds)  { return this._request('cloudPhone/powerOn',  { image_ids: imageIds }); }
  powerOff(imageIds) { return this._request('cloudPhone/powerOff', { image_ids: imageIds }); }
  restart(imageIds)  { return this._request('cloudPhone/restart',  { image_ids: imageIds }); }
  modifyParameters({ imageIds, ...rest }) {
    return this._request('cloudPhone/modifyParameters', { image_ids: imageIds, ...rest });
  }
  initProxy(images) {
    return this._request('cloudPhone/proxyInit', { images });
  }
  details(imageId)  { return this._request('cloudPhone/details', { image_id: imageId }); }

  // ── ADB ───────────────────────────────────────────────────
  execCommand({ imageIds, content }) {
    return this._request('cloudPhone/command', { image_ids: imageIds, content });
  }
  // Single-phone ADB command (imageIds = [imageId])
  execCommandSingle(imageId, content) {
    return this.execCommand({ imageIds: [imageId], content });
  }

  // ── Groups ────────────────────────────────────────────────
  listGroups() { return this._request('cloudPhoneGroup/list', {}); }
  batchAddToGroups({ imageIds, groupIds }) {
    return this._request('cloudPhoneGroup/batchAdd', { image_ids: imageIds, group_ids: groupIds });
  }

  // ── Cloud Drive ───────────────────────────────────────────
  listFiles({ page = 1, pagesize = 50, type, directory }) {
    return this._request('cloudDisk/list', { page, pagesize, type, directory });
  }
  getSignedUrl(name, isApp = false) {
    return this._request('cloudDisk/signedUrl', { name, is_app: isApp });
  }

  // ── Automation ────────────────────────────────────────────
  listTemplates({ page = 1, pagesize = 50, taskType }) {
    return this._request('automation/userTemplateList', { page, pagesize, task_type: taskType });
  }
  listOfficialTemplates({ page = 1, pagesize = 50, taskType }) {
    return this._request('automation/officialTemplateList', { page, pagesize, task_type: taskType });
  }
  addTask(task) {
    return this._request('automation/addTask', task);
  }
  listTasks({ page = 1, pagesize = 50, status, templateId, dates }) {
    return this._request('automation/taskList', { page, pagesize, status, template_id: templateId, ...dates });
  }
  getTaskLog(taskId, cursorId = 0) {
    return this._request('automation/taskLogList', { task_id: taskId, cursor_id: cursorId });
  }
  setTaskStatus(ids, status) {
    return this._request('automation/setTaskStatus', { ids, status });
  }

  // ── App ───────────────────────────────────────────────────
  startApp(imageIds, pkg) {
    return this._request('app/start', { image_ids: imageIds, pkg_name: pkg });
  }
}
```

**Critical port-time corrections vs. Engine source:**

| What Engine wrote | Correct endpoint |
|---|---|
| `POST /api/v1/cloudDisk/uploadUrl` | `POST /api/v1/cloudDisk/signedUrl` |
| `POST /api/v1/app/startApp` | `POST /api/v1/app/start` |
| `imageIds` as flat array | `image_ids` (snake_case in JSON body) |
| `taskType` (camelCase) | `task_type` (snake_case) |
| `templateId` | `template_id` |
| `addTask.images[].issue_at` | `Y-m-d H:i` (no seconds); `taskList` uses `Y-m-d H:i:s` |

---

## 7. `DuoplusDirectController` — ADB Adapter

Parallel to `VmosDirectController` (`packages/device-control/src/vmos-direct-controller.js`).
All device-control commands route through `cloudPhone/command`:

```js
// packages/device-control/src/duoplus-direct-controller.js — sketch
import { DeviceControlError } from './errors.js';
import { delay, withTimeout } from './timing.js';

export class DuoplusDirectController {
  constructor({ client, imageId }) {
    if (!client) throw new DeviceControlError('DuoplusClient required', { code: 'DUOPLUS_CONFIG' });
    if (!imageId) throw new DeviceControlError('imageId required', { code: 'DUOPLUS_CONFIG' });
    this.client = client;
    this.imageId = imageId;
  }

  async _exec(content, { timeoutMs = 10_000 } = {}) {
    return withTimeout(
      this.client.execCommandSingle(this.imageId, content),
      timeoutMs,
      'DuoPlus ADB command timed out'
    );
  }

  async tap(x, y)        { return this._exec(`input tap ${x} ${y}`); }
  async swipe(x1, y1, x2, y2, ms = 400) {
    return this._exec(`input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
  }
  async inputText(text)   { return this._exec(`input text "${text.replace(/"/g, '\\"')}"`); }
  async keyevent(code)    { return this._exec(`input keyevent ${code}`); }
  async launchApp(pkg)    { return this._exec(`am start -n ${pkg}`); }
  async stopApp(pkg)      { return this._exec(`am force-stop ${pkg}`); }
  async dumpUI() {
    await this._exec('uiautomator dump /sdcard/uidump.xml');
    await this._exec('cat /sdcard/uidump.xml');
    // The cat output is captured into the API response.data when applicable;
    // for full XML retrieval, use the DuoPlusDumpUI flow (see §12).
  }
  async getResolution()   { return this._exec('wm size'); }
  async getCurrentFocus() { return this._exec('dumpsys window | grep mCurrentFocus'); }
  async screencap(path = '/sdcard/screen.png') {
    return this._exec(`screencap -p ${path}`);
  }
  async pullFile(remote, local) {
    return this._exec(`pull ${remote} ${local}`);
  }
  async isTikTokForeground() {
    const res = await this.getCurrentFocus();
    return String(res?.data?.message || '').includes('com.zhiliaoapp.musically');
  }
  async launchTikTok() {
    return this._exec('am start -n com.zhiliaoapp.musically/com.ss.android.ugc.aweme.splash.SplashActivity');
  }
}
```

**Caveat:** for actions that need return values (like `dumpUI`), the `cloudPhone/command`
endpoint is **fire-and-forget** — it returns success but the actual `cat` output is not in
the response. For UIAutomator XML retrieval, use the `DuoPlusDumpUI` shell-only flow
(see §12 below) — do **not** rely on `cat` echoing in the response body.

---

## 8. Captcha Solver

Lives in `packages/integrations/src/duoplus-captcha-solver.js`. Same flow as the Engine:

1. `DuoPlusDumpUI /sdcard/uidump.xml` (via `DuoplusClient.execCommand`).
2. `screencap -p /sdcard/screen.png` + `cat /sdcard/screen.png` (skip the second cat).
3. Pull `screen.png` from cloud drive (poll `cloudDisk/list` for the latest screencap).
4. Crop puzzle + piece via `sharp` (already in `packages/media`).
5. POST `{token, imageBase64, puzzleBase64}` to `SADCAPTCHA_BASE_URL/puzzle`.
6. SadCaptcha returns `slideXProportion` (0–1).
7. `adb input swipe puzzleX0 puzzleY0 puzzleX1 puzzleY1 600`.

Wire as a method on `DuoplusDirectController`:

```js
async solveTikTokSlidePuzzle({ sadCaptchaKey, sadCaptchaBaseUrl }) {
  // 1. Dump UI to find puzzle element bounds
  // 2. Screenshot
  // 3. Crop
  // 4. POST to SadCaptcha
  // 5. Swipe via this.swipe(...)
}
```

---

## 9. File Upload Flow

Two-step: `signedUrl` → `PUT` → poll `cloudDisk/list` for the resulting file ID.

```js
// packages/integrations/src/duoplus-file-uploader.js — sketch
export async function uploadFileToDuoplus({ client, source, filename, isApp = false, pollIntervalMs = 5_000, timeoutMs = 120_000 }) {
  const { data: signed } = await client.getSignedUrl(filename, isApp);
  const buf = Buffer.isBuffer(source) ? source : await fetch(source).then(r => r.arrayBuffer()).then(b => Buffer.from(b));
  const putRes = await fetch(signed.signedUrl, {
    method: signed.method || 'PUT',
    headers: signed.headers || {},
    body: buf
  });
  if (!putRes.ok) throw new DeviceControlError(`DuoPlus PUT failed: ${putRes.status}`, { code: 'DUOPLUS_UPLOAD_FAILED' });

  // Poll list for the new file ID
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await client.listFiles({ pagesize: 1, directory: signed.name });
    const list = data?.list || [];
    const found = list.find((f) => f.original_file_name === signed.original_file_name);
    if (found) return { fileId: found.id, name: found.name };
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }
  throw new DeviceControlError('DuoPlus upload timed out waiting for file ID', { code: 'DUOPLUS_UPLOAD_TIMEOUT' });
}
```

---

## 10. Worker Queues & Concurrency

Register in `apps/worker/src/engine.worker.js`:

```js
// engine.worker.js — additions
import { handleDuoplusPower }       from './handlers/duoplus-power.handler.js';
import { handleDuoplusExec }        from './handlers/duoplus-exec.handler.js';
import { handleDuoplusUpload }      from './handlers/duoplus-upload.handler.js';
import { handleDuoplusCampaign }    from './handlers/duoplus-campaign.handler.js';
import { handleDuoplusStatusPoll }  from './handlers/duoplus-status-poll.handler.js';

// inside startEngineWorkers:
await consumeJson('duoplus.power',      handleDuoplusPower,      { prefetch: 1 });
await consumeJson('duoplus.exec',       handleDuoplusExec,       { prefetch: 2 });
await consumeJson('duoplus.upload',     handleDuoplusUpload,     { prefetch: 1 });
await consumeJson('duoplus.campaign',   handleDuoplusCampaign,   { prefetch: 1 });  // QPS=1, like Engine
await consumeJson('duoplus.status-poll',handleDuoplusStatusPoll, { prefetch: 1 });
```

| Queue | Replaces | Notes |
|---|---|---|
| `duoplus.power` | manual `powerOn`/`powerOff`/`restart` calls | prefetch=1 |
| `duoplus.exec` | manual `executeCommand` calls | prefetch=2 (small QPS budget) |
| `duoplus.upload` | `FileUploader.upload()` | prefetch=1, two-step PUT |
| `duoplus.campaign` | BullMQ `CampaignWorker` | prefetch=1, QPS=1 floor (1100ms), replaces setInterval + tick |
| `duoplus.status-poll` | `StatusPoller` setInterval | prefetch=1, dispatched by cron every 60s |

`EngineJobRun` (the framework's superset of `duoplusJobs`) handles idempotency, retries,
and `nextRetryAt` — `IdempotencyGuard` from the Engine is no longer needed.

---

## 11. Status State Machine

`DuoplusCampaign.status` enum:

| Internal | DuoPlus `taskList` status | Description |
|---|---|---|
| `queued` | — | Local queue, not yet uploaded |
| `uploading` | — | `duoplus.upload` running |
| `scheduled` | `0` (Pending) | `addTask` accepted, awaiting issue_at |
| `executing` | `1` (Executing) | Currently running on device |
| `paused` | `2` (Paused) | User paused via `setTaskStatus` |
| `published` | `3` (Finished) | Success |
| `failed` | `4` (Failure) | Hard failure |
| `cancelled` | `5` (Cancel) | User cancelled |

State transitions are owned by `duoplus-status-poll.handler.js` — it reads `taskList`,
maps DuoPlus → internal, updates `DuoplusCampaign.status` + `duoplusTaskIds[]` + `lastSyncedAt`.

---

## 12. UIAutomator Dump (DuoPlus-specific)

The `DuoPlusDumpUI` command is a special DuoPlus API, not a regular ADB command:

```
POST /api/v1/cloudPhone/command
{ "image_ids": [imageId], "content": "DuoPlusDumpUI /sdcard/uidump.xml" }
```

Unlike `uiautomator dump`, this works on dynamic pages (e.g. TikTok video screen) and is
compatible with Android 10/11/12/15. After running it, retrieve the XML with:

```
POST /api/v1/cloudPhone/command
{ "image_ids": [imageId], "content": "cat /sdcard/uidump.xml" }
```

(Note: the `cat` output is **not** reliably returned in the response body. For full XML
retrieval, see the "Cloud Drive scrape" workaround: have the device `cp` the dump into
cloud drive and pull via `cloudDisk/list` — this is what the Engine's
`DuoPlusAdbController.screenTexts()` does when the in-response cat is empty.)

---

## 13. Cron Tasks (add to `apps/api/src/cron/index.js`)

```js
async function enqueueDuoplusDeviceSync() {
  if (env.cloudProvider !== 'duoplus') return;
  await withMongo(async () => {
    await dispatchEngineJob({
      queueName: 'duoplus.power', // reuses for sync trigger
      jobName: 'device-sync',
      targetType: 'duoplusDeviceSync',
      payload: {},
      idempotencyKey: `duoplus:sync:${new Date().toISOString().slice(0, 9)}` // 3-hour bucket
    });
  });
}

async function enqueueDuoplusStatusPoll() {
  if (env.cloudProvider !== 'duoplus') return;
  await withMongo(async () => {
    await dispatchEngineJob({
      queueName: 'duoplus.status-poll',
      jobName: 'poll',
      targetType: 'duoplusStatusPoll',
      payload: {},
      idempotencyKey: `duoplus:poll:${new Date().toISOString().slice(0, 13)}` // hourly bucket
    });
  });
}

// inside startCron():
schedule('duoplus-device-sync',  '*/10 * * * *', enqueueDuoplusDeviceSync);
schedule('duoplus-status-poll',  '* * * * *',   enqueueDuoplusStatusPoll);
```

`env.DUOPLUS_STATUS_POLL_INTERVAL_MS` and `env.DUOPLUS_DEVICE_SYNC_INTERVAL_MS` can
override the cron expressions if needed (but `node-cron` doesn't read intervals at
runtime — fall back to fixed schedules or write a manual `setInterval` alongside the cron).

---

## 14. Campaign Flow (end-to-end)

```
User: POST /api/v1/duoplus/campaigns { name, templateId, devices:[...], schedule{...}, mediaUrl }
  │
  ▼
duoplus-campaigns.controller.js
  ├─ create DuoplusCampaign { status: 'queued' }
  ├─ dispatchEngineJob({
  │     queueName: 'duoplus.campaign',
  │     jobName: 'execute',
  │     targetId: campaign._id,
  │     payload: { campaignId, mediaUrl, templateId, devices, schedule }
  │  })
  └─ return { ok: true, campaign }

Worker: duoplus-campaign.handler.js
  1. update campaign → 'uploading'
  2. uploadFileToDuoplus(mediaUrl) → fileId
  3. build addTask config from template.fields × devices
  4. addTask(images[{image_id, pkg_list:[{pkg,params}], issue_at, file_id}])
     ↑ QPS=1 floor enforced by DuoplusClient._request
  5. update campaign → 'scheduled', store duoplusTaskIds[]

Cron: every 60s, dispatchEngineJob({ queueName:'duoplus.status-poll' })

Worker: duoplus-status-poll.handler.js
  1. find campaigns where status ∈ {scheduled, executing, paused}
  2. for each, call listTasks({ ids: campaign.duoplusTaskIds })
  3. map DuoPlus status → internal
  4. update DuoplusCampaign.status + lastSyncedAt
  5. fetch getTaskLog for finished/failed campaigns, store in DuoplusCampaign.logs

User actions:
  POST /campaigns/:id/cancel       → setTaskStatus(ids, 5)
  POST /campaigns/:id/re-execute   → setTaskStatus(ids, 0)
  POST /campaigns/:id/pause        → setTaskStatus(ids, 2)
```

---

## 15. Security & Hygiene

- **Never log the API key.** Sanitize `DUOPLUS_API_KEY` and `DuoPlusSetting.apiKey` in
  `duoplus-api-log.model.js` — store as `apiKeyMasked: 'duop_***xyz'` (last 4 chars).
- **Never log request bodies that contain `password` / `token` / `proxy.password` fields.**
  Wrap the `DuoplusApiLog.requestBody` capture in a sanitizer that redacts those keys.
- **TTL on `DuoplusApiLog`:** Mongo TTL index on `at` (30 days) — keeps the collection bounded.
- **`duoplusSetting.apiKey`** is stored encrypted-at-rest via the framework's Mongo encryption
  helper if available; otherwise stored plain but marked `select: false` so it never leaks
  via `lean()` queries.
- **Rate limiter is non-negotiable.** `DuoplusClient._request` enforces ≥1100ms between calls
  per endpoint. Do NOT skip the `sleep` even in tests — the production DuoPlus account will
  get throttled to 0 QPS if you batch-fire.

---

## 16. Migration Order (milestones)

| # | Milestone | Deliverable | Estimated effort |
|---|---|---|---|
| **M1** | Provider + Client | `DuoplusClient`, `DuoplusCloudPhoneProvider`, `provider.js` ext, env vars | 1 day |
| **M2** | Direct Controller | `DuoplusDirectController`, wired into `worker-context.js`'s `getProvider()` | 1 day |
| **M3** | Models | `duoplus-template`, `duoplus-campaign`, `duoplus-setting`, `duoplus-api-log` + `engine-device` enum ext | 0.5 day |
| **M4** | Devices controller + routes | `GET /devices`, `POST /devices/sync`, power/restart/proxy/exec via dispatch | 1.5 days |
| **M5** | Templates + Settings + Health | `GET /templates`, `GET /settings`, `GET /health/duoplus` | 0.5 day |
| **M6** | Upload + Uploads controller | `duoplus-file-uploader.js`, `POST /uploads/sign`, `GET /files` | 1 day |
| **M7** | Campaigns controller + service | CRUD, dispatch to `duoplus.campaign` | 1 day |
| **M8** | Campaign worker handler | replaces BullMQ `CampaignWorker` | 1.5 days |
| **M9** | Status poll cron + handler | replaces `StatusPoller` setInterval | 1 day |
| **M10** | Captcha solver | `duoplus-captcha-solver.js`, TikTok slide solve flow | 1 day |
| **M11** | UI (web-next) | migrate `public/duoplus/*` → `apps/web-next/app/duoplus/*` | 2 days (deferred) |
| **M12** | E2E + production cutover | golden-path test (sync → power → exec → campaign → poll → publish), cut `CLOUD_PROVIDER=duoplus` | 1 day |

Total: **~12 days** for the full port (M11 in parallel).

---

## 17. Testing Checklist

**Unit (Jest):**

- [ ] `DuoplusClient._request` enforces 1100ms floor per endpoint (use `fakeTimers`).
- [ ] `DuoplusClient._request` throws `DeviceControlError` on `code !== 200` AND on
      non-200 HTTP status with empty body.
- [ ] `uploadFileToDuoplus` polls `listFiles` until file appears; times out cleanly.
- [ ] Status mapping in `duoplus-status-poll.handler.js` covers all 6 DuoPlus status codes.
- [ ] `EngineJobRun` idempotency key dedup works for repeated `dispatchEngineJob` calls.

**Integration (with a sandbox DuoPlus account):**

- [ ] `cloudPhone/list` returns paginated results; pagination cursor works.
- [ ] `powerOn` → `getPhoneStatus` returns `running` within 60s.
- [ ] `initProxy` rejects when `network_mode=2` on Android 10/11/12B.
- [ ] `addTask` with `issue_at` in the past is accepted.
- [ ] `addTask.images[]` > 20 is rejected by DuoPlus with clear error.
- [ ] `setTaskStatus(0)` on a `finished` task is rejected (DuoPlus only allows on
      `pending/executing/paused`).
- [ ] Two-step upload completes end-to-end with a 5MB sample MP4.

**E2E (golden path):**

- [ ] Sync devices → power on 3 devices → assign proxy → upload video → create
      campaign (3 devices × 1 image each) → poll until `published` for at least 1 device.
- [ ] Cancel mid-execution → confirm DuoPlus returns `cancelled` status.
- [ ] Idempotency: re-submit the same campaign POST → second `EngineJobRun` is a no-op
      (same `idempotencyKey`).

---

## 18. Open Questions

1. **Multi-provider support** — should `EngineDevice` allow per-device provider
   (currently it doesn't; the framework assumes one provider for all devices)? If yes,
   `provider` should be on the device row, not env-global. **Decision:** keep env-global
   for v1; revisit if the team needs to run VMOS and DuoPlus side-by-side.
2. **API key rotation** — single key for the whole provider, or per-team? The Engine uses
   a single env var; recommend same for v1, store in `DuoplusSetting.apiKey` for runtime
   rotation without restart.
3. **SadCaptcha cost** — every TikTok slide solve costs money. The Engine rate-limits to
   1 solve/phone/24h via `IdempotencyGuard`. Reuse that pattern by storing lastSolveAt on
   `EngineAccount` (already has `health.warmupConfig`).
4. **Status poll fan-out** — at 100 active campaigns × 60s polling × 1 call/cycle, that's
   100 calls/min, well under DuoPlus's per-account QPS budget (which is per-endpoint,
   not per-account). **But** if we hit QPS limits, we'll need to spread polls across the
   minute window. v1 ships with the simple cron-dispatch; v2 can add jitter.

---

## 19. References

- API reference: `/Users/growthgod/Documents/VANTA-Brain/docs/duoplus-openapi-reference.md`
- Engine TS source: `/Users/growthgod/VAN/duoplus/src/`
- VMOS reference implementation (port pattern): `/Users/growthgod/VAN/duotest/mattclone_duo/packages/device-control/src/vmos-client.js`
- Provider factory to extend: `/Users/growthgod/VAN/duotest/mattclone_duo/packages/device-control/src/provider.js`
- Engine device model to extend: `/Users/growthgod/VAN/duotest/mattclone_duo/apps/api/src/models/engine-device.model.js`
- Env config: `/Users/growthgod/VAN/duotest/mattclone_duo/apps/api/src/config/env.js`
- Engine worker registration: `/Users/growthgod/VAN/duotest/mattclone_duo/apps/worker/src/engine.worker.js`
- Cron jobs: `/Users/growthgod/VAN/duotest/mattclone_duo/apps/api/src/cron/index.js`
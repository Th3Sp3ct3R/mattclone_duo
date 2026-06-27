# DuoPlus Port Plan — mattclone_duo

**Target repo:** `/Users/growthgod/VAN/duotest/mattclone_duo`
**Source reference:** Engine `DuoPlusClient.ts` (TS) + `DuoPlusAdbController.ts`
**Canonical API doc:** [[docs/duoplus-openapi-reference]] (vanta-brain)
**Status:** Draft v1 · 2026-06-26
**Owner:** julio platform team

---

## Why this exists

The Engine repo already has a working DuoPlus client (TypeScript) that drives TikTok warmup
flows. We are porting those capabilities into the mattclone_duo monorepo (JS + Express +
MongoDB + RabbitMQ + Next.js) so that device-farm operations become first-class inside the
julio platform instead of a side-channel service.

The mattclone_duo monorepo already has a `VmosCloudPhoneProvider` implementation in
`packages/device-control/`. This plan layers a parallel `DuoPlusCloudPhoneProvider`
alongside it, behind the same `createCloudPhoneProvider({ type })` factory — keeping the
VMOS path untouched as a fallback while DuoPlus becomes the preferred provider.

---

## Constraints (load-bearing — do not drift)

- **Language: JavaScript only.** No TypeScript conversion of mattclone_duo files. The Engine TS DuoPlus client is the **behavioral reference** — ported code is plain JS following the patterns already in `packages/device-control/src/vmos-*.js`. JSDoc where helpful; do NOT introduce `tsconfig.json` into mattclone_duo, and do NOT add `*.ts` source files alongside the existing `.js` ones.
- **MongoDB schema: additive, no fork.** New Mongoose models follow the same style as `apps/api/src/models/engine-device.model.js`. The existing `engine-device.model.js` gains exactly one field — `providerType: 'vmos' | 'duoplus'` — so a single device record backs either provider. Do NOT introduce a per-provider device collection. The new `cloud-phone-snapshot`, `campaign-job`, `campaign-status-event` collections are siblings of `enginedevices`, not replacements.
- **Provider: parallel, not replacement.** VMOS path stays untouched. `createCloudPhoneProvider({ type })` in `packages/device-control/src/provider.js` is the single seam — every consumer (worker handlers, API routes, UI pages) routes through it. `CLOUD_PROVIDER=duoplus` is just an env switch.

---

## Scope

**In scope:**
- New `DuoPlusClient` (HTTP, auth, envelope, rate limiting)
- New `DuoPlusCloudPhoneProvider` mirroring `VmosCloudPhoneProvider` surface
- `DuoPlusAdbController` (per-device direct ADB, ADB exec + UI dump + screenshot)
- Mongo models: `CloudPhoneSnapshot`, `CampaignJob`, `CampaignStatusEvent`
- API routes under `apps/api/src/routes/duoplus/`
- Worker handlers under `apps/worker/src/handlers/duoplus.*`
- Next.js UI pages under `apps/web-next/app/(app)/duoplus/`
- Secrets storage for the API key
- Rate limiter integration
- Engine parity checklist updates

**Out of scope:**
- Replacing the VMOS provider — it stays as a parallel option
- Migrating `DuoPlusPostExecutor` / `DuoPlusStatusPoller` from Engine until after the
  mattclone_duo parity check passes on a single non-production pad
- Bulk import of existing Engine campaign data — fresh start
- Cloud Number / RPA / Plug-in sections of the DuoPlus API (not used by current flows)

---

## Module-by-Module Plan

### 1. `packages/device-control/src/duoplus-client.js` (new)

Mirror the public surface of `vmos-client.js` but for DuoPlus. Key differences from VMOS:

| Aspect | VMOS | DuoPlus |
|---|---|---|
| Auth | HMAC-SHA256 of canonical request, signature in `authorization` header | Single `DuoPlus-API-Key` header |
| Base URL | `https://api.vmoscloud.com` | `https://openapi.duoplus.net` |
| Envelope | `{ code, data, message }` w/ `code === 0` or `200` success | `{ code, data, message }` w/ `code === 200` success |
| QPS limit | 10/s (per VMOS doc) | **1/s (hard cap, non-negotiable)** |
| Status semantics | `padStatus: 10` = running | `status: 1` = running |
| Power on | `startApp([code], 'com.android.settings')` (workaround) | `POST /api/v1/cloudPhone/powerOn` (native) |
| Power off | `dissolveRoom` (heavy) | `POST /api/v1/cloudPhone/powerOff` |
| Restart | n/a | `POST /api/v1/cloudPhone/restart` |
| ADB | `openOnlineAdb` then `adb` for connection string | `enableAdb` then `getAdbConnect` |
| Proxy init | `smartIp` (HTTP/SOCKS5, vpn mode) | `proxyInit` (single pad) |
| Scheduled tasks | `addAutoTask` w/ `taskType` enum | `addTask` w/ `templateId` or inline `scriptContent` |
| File push | `uploadFileV3` w/ URL+md5 | `cloudDisk/uploadUrl` + `cloudDisk/upload` (two-step) |
| Billing | `buyDynamicGB` (data top-up) | `cloudPhone/buy` + `cloudPhone/renew` |

Implementation notes:
- Use `fetchImpl` injection like `VmosClient` (testability)
- Reject on `response.status >= 400` OR `data.code !== 200`
- Strip `DuoPlus-API-Key` from any log entry before persist (use a `buildLogEntry` pattern
  identical to the existing TS reference)
- All POST endpoints serialize `body` as JSON

### 2. `packages/device-control/src/duoplus-provider.js` (new)

Mirror `vmos-provider.js`. Public methods (the contract `apps/worker/handlers/device.handler.js`
depends on):

```js
class DuoPlusCloudPhoneProvider {
  listDevices()
  describeInstance(providerDeviceId)
  startDevice(providerDeviceId)       // → powerOn + status poll until ready
  stopDevice(providerDeviceId)        // → powerOff
  getAdbConnection(providerDeviceId)  // → enableAdb then getAdbConnect
  pushFileByUrl(providerDeviceId, payload)
  createTikTokPostTask(providerDeviceId, payload)  // → addTask w/ templateId 5
  createDirectController(providerDeviceId, options)  // → DuoPlusAdbController
  screenshot(providerDeviceId, options)
  setSmartIp(providerDeviceId, proxy)
}
```

### 3. `packages/device-control/src/duoplus-direct-controller.js` (new)

Mirrors `vmos-direct-controller.js` but ADB runs against the DuoPlus-provided adb tunnel
(rather than a local adb-key serial). Two sub-modes:

- **Remote-mode:** exec via `cloudPhone/command` endpoint (POST a single command,
  poll `padTaskDetail` for result). Used when the worker has no direct network reach to the
  pad's adb tunnel.
- **Local-mode:** worker dials `host:port` from `getAdbConnect` and runs `adb shell` via the
  existing `AdbClient`. Faster for high-frequency flows (UI dumps, screenshots).

Default: remote-mode. Switch to local-mode only after parity validation on one pad.

UI-parsing utilities (`parseUIDump`, `findElement`, etc.) stay shared — they consume the
XML string the controller returns, regardless of transport.

### 4. `packages/device-control/src/rate-limiter.js` (new)

Token bucket, 1 token / 1000ms, configurable per-endpoint override. Use it inside
`DuoPlusClient.request()`:

```js
const limiter = createRateLimiter({ tokensPerSecond: 1, burst: 1 });
await limiter.acquire(endpoint);
// ... fetch
```

Burst=1 is correct for DuoPlus; do NOT set burst>1 or you'll trip QPS.

### 5. `packages/integrations/duoplus/` (new package)

Houses:
- `DuoPlusClientProvider` — factory `createDuoPlusClientProvider(env)` returns either a
  real client or a stub (for tests + local dev without an API key)
- Encrypted credentials reader (`getApiKey(tenantId)`) — backed by Mongo
  `EngineCredential` model, AES-GCM at rest with `JWT_SECRET` as KEK
- Logging wrapper that redacts the API key

Why a new package (not just a file in `device-control`)? The integrations package is the
framework's seam for "third-party service with secrets" — VMOS already lives there in
spirit (used by `device-control` but logically a third-party). This keeps
`device-control` provider-agnostic.

### 6. Mongo models (`apps/api/src/models/`)

Three new models:

| Model | Purpose | Key fields |
|---|---|---|
| `cloud-phone-snapshot.model.js` | Periodic snapshot of `cloudPhone/list` | `providerDeviceId`, `name`, `status`, `imageId`, `tags`, `proxy`, `adbAddress`, `capturedAt` |
| `campaign-job.model.js` | Maps a julio post to a DuoPlus scheduled task | `julioPostId`, `duoplusTaskId`, `templateId`, `providerDeviceId`, `status`, `createdAt`, `lastPolledAt` |
| `campaign-status-event.model.js` | One row per status transition / log line | `campaignJobId`, `eventType`, `rawText`, `screenshotUrl`, `occurredAt` |

The existing `engine-device.model.js` already stores `providerDeviceId`. Add a `providerType`
field (`'vmos'` or `'duoplus'`) so a single device record can back either provider.

### 7. API routes (`apps/api/src/routes/duoplus/`)

Mount under `/api/v1/duoplus/*` behind the existing JWT auth middleware:

| Method | Path | Wraps |
|---|---|---|
| `GET` | `/phones` | `client.listCloudPhones()` |
| `POST` | `/phones/:id/power-on` | `provider.startDevice()` |
| `POST` | `/phones/:id/power-off` | `provider.stopDevice()` |
| `POST` | `/phones/:id/screenshot` | `provider.screenshot()` |
| `POST` | `/phones/:id/exec` | `provider.execAdbCommand()` |
| `GET` | `/tasks` | `client.listTasks()` |
| `POST` | `/tasks` | `client.addTask()` |
| `GET` | `/tasks/:id/log` | `client.getTaskLog()` |
| `POST` | `/tasks/:id/cancel` | `client.setTaskStatus(id, 5)` |
| `POST` | `/phones/:id/assign-account` | Domain action: assigns an EngineAccount to a phone |

These mirror the surface the Engine's Express routes expose today. Mounting is identical
(`router.use('/duoplus', duoplusRouter)` in `apps/api/src/app.js`).

### 8. Worker handlers (`apps/worker/src/handlers/duoplus.*`)

Two new handlers, modeled on the existing Engine workers:

**`duoplus-post.handler.js`** — replaces `DuoPlusPostExecutor`
- Queue: `engine.duoplus.post`
- Reads `CampaignJob` from DB, calls `provider.createTikTokPostTask`
- On success: persists `duoplusTaskId`, transitions `CampaignJob.status` → `scheduled`
- On failure: increments `attempts`, schedules retry with backoff
- Concurrency: 1 (respects QPS=1)

**`duoplus-status.handler.js`** — replaces `DuoPlusStatusPoller`
- Cron-driven (every 30s) — publishes one `engine.duoplus.status` message per running job
- Handler calls `client.listTasks` then `client.getTaskLog` for each
- Writes `CampaignStatusEvent` rows on transitions
- Updates `CampaignJob.status` to `running` / `succeeded` / `failed`

Wire both into `apps/worker/src/engine.worker.js`:
```js
await consumeJson('engine.duoplus.post', handleDuoPlusPostJob, { prefetch: 1 });
await consumeJson('engine.duoplus.status', handleDuoPlusStatusJob, { prefetch: 1 });
```

### 9. UI (`apps/web-next/app/(app)/duoplus/`)

Pages modeled on the existing `/engine` route (which already has the device/account/post
panels). New section adds:

- `page.jsx` — fleet overview, draws from `GET /api/v1/duoplus/phones`
- `phones/[id]/page.jsx` — single phone: status, screenshot, task history
- `tasks/page.jsx` — campaign queue, draw from `GET /api/v1/duoplus/tasks`
- `components/` — `DuoPlusPhoneCard`, `DuoPlusTaskRow`, `DuoPlusExecDialog`
- Reuse `@julio/ui` primitives and `EngineStatGrid` styling for visual parity

The legacy `public/duoplus/` static HTML stays until this is GA, then deprecate.

---

## Env / Config Changes

`.env.example` additions:

```bash
# Cloud phone provider
CLOUD_PROVIDER=duoplus          # values: vmos | duoplus
DUOPLUS_API_KEY=
DUOPLUS_BASE_URL=https://openapi.duoplus.net
DUOPLUS_QPS=1

# Worker
DUOPLUS_POST_EXECUTOR_CONCURRENCY=1
DUOPLUS_STATUS_POLL_INTERVAL_MS=30000
```

`apps/api/src/config/env.js` gains `duoplusApiKey`, `duoplusBaseUrl`, `duoplusQps`,
`duoplusPostExecutorConcurrency`, `duoplusStatusPollIntervalMs`.

---

## Secrets / API Key

DuoPlus API key is single-tenant in the current setup (one key per console account). For
multi-tenant later: store in `EngineCredential` collection, AES-GCM encrypted with
`JWT_SECRET`-derived KEK, decrypted on demand by `DuoPlusClientProvider`.

Until multi-tenant lands: read from env, never log, never echo. Add an ESLint rule (custom)
that fails CI on any string matching `DUOPLUS_API_KEY=...` in non-`.env*` files.

---

## Migration Order

Strict ordering — each step gates the next:

1. **DuoPlusClient + rate limiter + unit tests** — pure unit, no infra. Land first.
2. **DuoPlusCloudPhoneProvider + integration tests against DuoPlus sandbox** — needs API key.
3. **Mongo models + repository helpers** — pure infra, no device calls.
4. **API routes** — wire provider + models, return real data through JWT auth.
5. **Worker handlers (post + status)** — depends on 2, 3, 4.
6. **UI pages** — depends on 4.
7. **Parity validation on one non-production pad** — exercise the full device-onboard →
   TikTok-post flow. Update `docs/engine-parity-checklist.md`.
8. **Cutover** — flip `CLOUD_PROVIDER=duoplus` in staging, observe for 1 week.
9. **Deprecate VMOS provider path** — only after cutover is stable in prod for 30 days.

---

## Risk & Mitigations

| Risk | Mitigation |
|---|---|
| QPS=1 trips on bulk operations | Rate limiter wraps every call; burst=1; unit-tested |
| API key leak in logs | Redaction in `buildLogEntry`; ESLint rule on `.env*` literals |
| ADB tunnel latency (remote-mode) | Per-device connection pooling; fall back to local-mode on latency > 2s p95 |
| Task status race (poll vs cancel) | Optimistic concurrency: `CampaignJob.lastPolledTaskVersion` checked before write |
| DuoPlus adds new required params | OpenAPI doc URL is in `duoplus-openapi-reference.md` — CI fetches + diffs daily, posts alert |
| Sandbox ≠ prod behavior | Staging fleet mirrors prod (same SKU, same proxy pool) |

---

## Open Questions

1. **Multi-tenant API keys** — needed before scaling beyond a single tenant? If yes,
   `EngineCredential` ships in step 2, not later.
2. **DuoPlus scheduled task vs ad-hoc execute** — the Engine uses `addTask` (scheduled).
   The mattclone_duo UI might want ad-hoc exec too. Decide before step 4.
3. **Local-mode ADB reachability** — confirm the worker host can dial the DuoPlus adb
   tunnel from inside the prod VPC. If not, remote-mode is the only option forever.

---

## Checklist (copy/paste into PR descriptions)

- [ ] `DuoPlusClient` lands with rate limiter + redacting logger
- [ ] `DuoPlusCloudPhoneProvider` matches VMOS provider surface
- [ ] `DuoPlusAdbController` supports remote + local modes
- [ ] Three Mongo models with migrations
- [ ] `/api/v1/duoplus/*` routes auth-protected
- [ ] `engine.duoplus.post` consumer registered, prefetch=1
- [ ] `engine.duoplus.status` cron-driven, prefetch=1
- [ ] UI: `/duoplus` fleet + phone detail + tasks pages
- [ ] `.env.example` updated, secrets not committed
- [ ] `engine-parity-checklist.md` updated with DuoPlus section
- [ ] End-to-end smoke test on one non-production pad passes
- [ ] VMOS path still works (regression)

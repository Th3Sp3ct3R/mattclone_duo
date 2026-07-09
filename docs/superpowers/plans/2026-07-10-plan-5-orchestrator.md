# Mass WhatsApp Report — Plan 5: Orchestrator Process

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `whatsapp-report/apps/whatsapp` deploy process: a cron reconciler that turns `reconcile(snapshot)` intents into idempotent RabbitMQ jobs, RabbitMQ consumers (with DLQ) that execute those jobs via the Plan 2-4 adapters, and a composition root wiring every port.

**Architecture:** Controller pattern (desired-state reconciler + event-driven speed). Mirrors `apps/worker`'s `main()` lifecycle. Cron only ENQUEUES (never works inline); handlers run through a `runEngineJob`-style ledger wrapper for idempotency/backoff; a DLQ wrapper (Plan 2) catches terminal failures. correlationId is threaded per job via `createStructuredLogger().child(...)`.

**Tech Stack:** Node 20 (`.nvmrc`), ESM, `node-cron`, `amqplib`, `ioredis`, `mongoose`, `@julio/config`, `@julio/logger`, `@julio/api` (rabbitmq/db/job-dispatch/EngineJobRun), `@julio/whatsapp` (domain), `@julio/whatsapp-infra` (adapters).

**Depends on:** Plans 1-4.

**Source spec:** design §3, §6, §10, §11; REQUIREM §10, §6, §16, §19.

**Commit trailer:** `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

## Grounding facts (verified — do not re-derive)

- **`apps/whatsapp` and its package do NOT exist.** Model the process on `apps/worker/src/index.js`. `@julio/whatsapp` is taken by the domain package → name the app **`@julio/whatsapp-app`**, located at `whatsapp-report/apps/whatsapp` (root `workspaces` already include `whatsapp-report/apps/*`; add a `jest.config.js` project + a `dev:whatsapp` root script).
- **Cron** (`@julio/api/cron`): `schedule(name, expression, task)` wraps `cron.schedule` with try/catch+log and pushes to a module `tasks[]`; `startCron()`/`stopCron()`. Every engine cron task loads due rows `.lean().limit()` then `dispatchEngineJob({ queueName, jobName, targetType, targetId, payload, idempotencyKey })`. Retry re-delivery is a cron (`engine-job-retries`) re-publishing `EngineJobRun` rows where `status:'queued' && nextRetryAt<=now`.
- **`dispatchEngineJob`** upserts an idempotent `EngineJobRun` (unique `{queueName, idempotencyKey}`), publishes only if `env.rabbitmqUrl`. **`runEngineJob(payload, handler)`** (`apps/worker/src/engine-job-runner.js`) is the execution wrapper: loads `EngineJobRun.findById(payload.jobRunId)`, short-circuits `succeeded/cancelled`, sets `running`/`attempts+=1`, on error computes `nextRetryDate(attempts)=min(15min,30s·2^(n-1))` and re-throws so the consumer nacks.
- **Consumers:** `consumeJson(queue, handler, { prefetch })` (`@julio/api/queue/rabbitmq`) — asserts durable, `JSON.parse`→handler→ack, on throw `nack(false, requeueOnError=false)` → **drops**. Use Plan 2's `consumeJsonWithDlq` to publish terminal failures to `<queue>.dlq`.
- **Lifecycle** (`apps/worker/src/index.js`): env preflight → `connectMongo(env.mongodbUri)` → `getRedis(env.redisUrl)` → `connectRabbitmq(env.rabbitmqUrl)` → `startCron()` → start consumers → `SIGINT/SIGTERM` shutdown (`stopCron`, `releaseLeasesByOwner`, disconnect all). **No HTTP health endpoint on the worker.**
- **Composition:** no container; factory functions read the singleton `env` and pass options to `create*` factories (e.g. `getProvider()` in `worker-context.js`). Lease/model injection: helpers take the Mongoose model as first arg.
- **`@julio/config`:** `defineSchema/loadConfig/rules` (+ `loadRootEnv()`). **No boolean rule** → `WHATSAPP_AUTOBUY_ENABLED: rules.optionalString('false')` compared `=== 'true'`. Ports are `optionalNumber(default)`.
- **`createStructuredLogger({ level, stream, clock, base }).child({ correlationId })`** (Plan 1, `@julio/logger`) is the correlationId mechanism — **currently unused by any app**; threading it is net-new.
- **Domain `reconcile(snapshot)`** returns ordered intents: `{type:'buy',quantity}`, `{type:'fill-queue',deviceId,count}`, `{type:'bring-online',deviceId,accountId}`, `{type:'evict',deviceId,accountId}`, `{type:'expand-reports',campaignId,tasks}`. **These are the contract this process translates into `dispatchEngineJob` calls.**
- **Clock seam:** pass `bareClock(systemClock)` (Plan 2) into domain functions that take `{ clock }`.
- **Service queues** (design §10): `whatsapp.buy`, `whatsapp.queue-fill`, `whatsapp.bring-online`, `whatsapp.probe`, `whatsapp.replace`, `whatsapp.report`.

**File structure:**
- `whatsapp-report/apps/whatsapp/package.json`, `jest.config.js`; modify root `jest.config.js`, root `package.json` (script)
- `src/config/env.js` (+ test)
- `src/composition.js` (+ test)
- `src/snapshot.js` (+ test) — projection → reconcile snapshot
- `src/intents.js` (+ test) — intent → dispatch translation (pure)
- `src/orchestrator.js` — entrypoint (main lifecycle + reconciler cron + consumers)
- `src/handlers/{buy-accounts,fill-queue,bring-online,probe-health,replace-banned,run-report-task}.handler.js` (+ tests)

---

### Task 1: Scaffold `@julio/whatsapp-app`

**Files:** `whatsapp-report/apps/whatsapp/package.json`, `jest.config.js`, `src/orchestrator.js` (stub); modify root `jest.config.js`, root `package.json`.

- [ ] **Step 1:** `package.json` mirroring `apps/worker` scripts (`dev: node --watch ./src/orchestrator.js`, `start: node ./src/orchestrator.js`, `test`, `lint`), `"type":"module"`, name `@julio/whatsapp-app`, deps `@julio/whatsapp`, `@julio/whatsapp-infra`, `@julio/api`, `@julio/config`, `@julio/logger`, `@julio/shared`, `node-cron`, `amqplib`, `ioredis`, `mongoose`.
- [ ] **Step 2:** `jest.config.js` (displayName `whatsapp-app`); add `'<rootDir>/whatsapp-report/apps/whatsapp/jest.config.js'` to root projects; add root script `"dev:whatsapp": "yarn workspace @julio/whatsapp-app dev"`.
- [ ] **Step 3:** `src/orchestrator.js` stub (`export async function main(){}` + guarded `if (import.meta.url === ...) main()`); `yarn install`; `yarn workspace @julio/whatsapp-app test --passWithNoTests`. **Step 4:** Commit `feat(whatsapp-app): scaffold orchestrator process`.

---

### Task 2: `config/env.js`

**Files:** `src/config/env.js` (+ test).

- [ ] **Step 1: Failing test** — with a fake `process.env`, `loadWhatsappEnv(env)` returns `{ mongodbUri, redisUrl, rabbitmqUrl, poolThreshold, deviceTargetDepth, buyBatchSize, probeCron, autobuyEnabled(bool), darkShoppingApiKey, darkShoppingBaseUrl, whatsappTeamAppId, mcpHttpPort, mcpAuthToken, logLevel }`; `autobuyEnabled` is `true` only when `WHATSAPP_AUTOBUY_ENABLED==='true'`.
- [ ] **Step 2:** FAIL. **Step 3: Implement** with `defineSchema`/`loadConfig`/`rules` mirroring `apps/api/src/config/env.js`; keys: `WHATSAPP_POOL_THRESHOLD: optionalNumber(10)`, `WHATSAPP_DEVICE_TARGET_DEPTH: optionalNumber(3)`, `WHATSAPP_BUY_BATCH_SIZE: optionalNumber(5)`, `WHATSAPP_PROBE_CRON: optionalString('*/15 * * * *')`, `WHATSAPP_AUTOBUY_ENABLED: optionalString('false')`, `DARK_SHOPPING_API_KEY/BASE_URL: optionalString()`, `WHATSAPP_APK_URL/WHATSAPP_TEAM_APP_ID: optionalString()`, `WHATSAPP_MCP_HTTP_PORT: optionalNumber(7300)`, `WHATSAPP_MCP_AUTH_TOKEN: optionalString()`, plus reused `MONGODB_URI/REDIS_URL/RABBITMQ_URL/LOG_LEVEL`. Export a factory `loadWhatsappEnv(env=process.env)` (testable) and `export const env = loadWhatsappEnv()`.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(whatsapp-app): 12-factor config`.

---

### Task 3: `composition.js` (wire every port)

**Files:** `src/composition.js` (+ test).

- [ ] **Step 1: Failing test** — `buildContext({ env, deps })` returns `{ accountRepo, deviceQueueRepo, reportRepo, procurement, deviceRegistration, automation, jobDispatcher, eventBus, secretResolver, clock, logger }`; inject fakes for the `create*` factories and assert each is constructed with the right env slice.
- [ ] **Step 2:** FAIL. **Step 3: Implement** — a factory-function module (idiom (a)): construct `createMongoAccountRepo()`, `createMongoDeviceQueueRepo()`, `createMongoReportRepo()`, `createRabbitJobDispatcher()`, `createRabbitRedisEventBus({ redis })`, `createKeychainEnvSecretResolver()`, `systemClock`, `createDarkShoppingProcurementAdapter(...)`, `createDuoplusDeviceRegistrationAdapter(...)`, `createWhatsappAutomationAdapter(...)`, and `logger = createStructuredLogger({ level: env.logLevel, base:{ service:'whatsapp' } })`. Keep it pure wiring — no I/O at import.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(whatsapp-app): composition root`.

---

### Task 4: `snapshot.js` (projection → reconcile input)

**Files:** `src/snapshot.js` (+ test).

- [ ] **Step 1: Failing test** — inject fake repos; `buildSnapshot(ctx)` returns `{ pool:{available}, devices:[{eligible,queue,bannedActiveAccountIds,onlineAccountIds}], campaigns:[{id,status,targets,strategy,doneKeys}], config }` shaped exactly as `reconcile` expects. Assert `pool.available` comes from `accountRepo.countAvailable()`, `doneKeys` from `reportRepo.doneKeys(campaignId)`, device eligibility from the reused `canDeviceAcceptAccount`/`EngineDevice` lease state.
- [ ] **Step 2:** FAIL. **Step 3: Implement** — read models via repos + `EngineDevice` (reuse `device-account-eligibility`); build the snapshot. `.lean()` projections. **Step 4:** PASS. **Step 5:** Commit `feat(whatsapp-app): reconcile snapshot builder`.

---

### Task 5: `intents.js` (intent → dispatch, pure)

**Files:** `src/intents.js` (+ test).

- [ ] **Step 1: Failing test** — `dispatchIntents(intents, { jobDispatcher })` maps each intent to a `jobDispatcher.dispatch(queue, job, { idempotencyKey })` call: `buy`→`whatsapp.buy`/`buy-accounts` (`idempotencyKey='buy:'+bucketHour`), `fill-queue`→`whatsapp.queue-fill` (`'fill:'+deviceId+':'+bucket`), `bring-online`→`whatsapp.bring-online` (`'online:'+accountId`), `evict`→`whatsapp.replace` (`'evict:'+accountId`), `expand-reports`→`whatsapp.report` per task (`reportTaskKey`). Assert queue names + idempotency keys.
- [ ] **Step 2:** FAIL. **Step 3: Implement** the pure translation (reuse `reportTaskKey` from `@julio/whatsapp`). **Step 4:** PASS. **Step 5:** Commit `feat(whatsapp-app): intent→job translation`.

---

### Task 6-11: Job handlers (one task each)

Each handler runs inside the `runEngineJob` ledger wrapper (import from `@julio/api` if exported, else re-implement the same lifecycle in-app) and takes the composition `ctx`. Each: **Step 1** failing test with fake ctx; **Step 2** FAIL; **Step 3** implement; **Step 4** PASS; **Step 5** commit.

- [ ] **Task 6 — `buy-accounts.handler.js`:** calls `buyAccounts({ quantity }, ctx)` (Plan 3). Idempotent by order id.
- [ ] **Task 7 — `fill-queue.handler.js`:** atomically moves `purchased` pool accounts into the device queue's `waiting` (opt-lock save via `deviceQueueRepo`), transitions accounts `purchased→assigned` (`transition` + `accountRepo.save`, passing `bareClock(clock)`).
- [ ] **Task 8 — `bring-online.handler.js`:** claim device lease (`claimRunningDeviceLease`), `automation.bringOnline(ctx)`, transition `assigned→bringing_online→online`; release lease in `finally`. Ban signal → `banned` + emit `accountBanned` on `eventBus`.
- [ ] **Task 9 — `probe-health.handler.js`:** `automation.probeState(ctx)` → `recordProbe` + transition on ban; emit `accountBanned`/`queueLow` events.
- [ ] **Task 10 — `replace-banned.handler.js`:** evict banned account (`retire`), promote next `waiting`, trigger fill if `queue.depth` low (emit `queueLow`).
- [ ] **Task 11 — `run-report-task.handler.js`:** `reportRepo.upsertTask` (exactly-once), claim lease, `automation.reportTarget(ctx, target)`, mark `done`/`failed`; ban signal → `banned`; emit `reportDone`. Humanized rate-limit per REQUIREM §4.

Commit messages: `feat(whatsapp-app): <handler> job handler`.

---

### Task 12: `orchestrator.js` (entrypoint: lifecycle + reconciler cron + consumers)

**Files:** `src/orchestrator.js`.

- [ ] **Step 1:** Implement `main()` mirroring the worker: env preflight (throw on missing `MONGODB_URI/REDIS_URL/RABBITMQ_URL`), `connectMongo`→`getRedis`→`connectRabbitmq`, build `ctx = buildContext({ env })`, `startCron()` registering a reconciler entry on `env.probeCron` that does `dispatchIntents(reconcile(await buildSnapshot(ctx)), ctx)`, then also subscribe `ctx.eventBus` to `account.banned`/`queue.low`/`pool.low` for immediate reaction (dispatch the same intents without waiting for the tick), start the six `consumeJsonWithDlq(queue, handler, {...})` consumers, and `SIGINT/SIGTERM` shutdown (`stopCron`, `releaseLeasesByOwner(WhatsappDeviceQueue-owner)`, disconnect all). Each job gets a `correlationId` = `jobRunId`; handlers use `ctx.logger.child({ correlationId })`.
- [ ] **Step 2:** Smoke test: a `orchestrator.test.js` that imports `main` with injected fake infra (no real connections) and asserts cron + consumers are registered and a reconcile tick dispatches the expected intents. (No real Mongo/Rabbit per repo convention.)
- [ ] **Step 3:** Run `yarn workspace @julio/whatsapp-app test` (green) and `yarn test` (whole monorepo green). **Step 4:** Commit `feat(whatsapp-app): orchestrator entrypoint (reconciler cron + consumers + DLQ + graceful shutdown)`.

---

### Task 13: Deploy-process registration

**Files:** modify `Procfile` (add `whatsapp: yarn workspace @julio/whatsapp-app start`), document required env in `.env.example`.

- [ ] Add the process line + env keys; commit `chore(whatsapp-app): register deploy process + env template`.

---

## Self-Review (Plan 5)

**Spec coverage:** reconciler cron (§6) → T12; six flows A-F (§6) → T4-11; DLQ (§10) → T12 (via Plan 2 wrapper); config 12-factor (§11) → T2; composition (§3) → T3; correlationId (§6.1) → T12; graceful shutdown/leases (§19, §3.3) → T12. **Reuse:** cron/`dispatchEngineJob`/`runEngineJob`/rabbitmq/mongo/redis/lease from `@julio/api`+`@julio/shared`; all adapters from Plan 2-4; `reconcile`/`bareClock` from domain+infra.

**Placeholder scan:** none new (external unknowns already isolated in Plans 3-4; this plan only wires them). **Type consistency:** intent shapes match `reconcile`'s output; queue names match design §10 and Plan 6's tool that triggers `reconcile.now`; `ctx` port set matches `PORTS`. **Node 20** per `.nvmrc`. **Deferred:** MCP surface (Plan 6) consumes this process's `ctx`/use-cases.

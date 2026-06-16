# Engine Parity Checklist

Use this checklist to validate the julio rebuild against the useful julius behavior.

## API

- Authenticated `GET /api/v1/engine/fleet` returns device/account/post/proxy counts.
- Device CRUD works under `GET/POST/PUT /api/v1/engine/devices`.
- Account CRUD works under `GET/POST/PUT /api/v1/engine/accounts`.
- Unified post creation enqueues `engine.post` jobs.
- Pipeline source-media ingestion enqueues `engine.pipeline` jobs.
- Transform creation enqueues `engine.transform` jobs.
- Djekxa import enqueues `engine.procurement` jobs without placing a purchase in the HTTP path.

## Worker

- Worker starts Mongo, Redis, RabbitMQ, cron, email worker, and engine consumers.
- Queue consumers mark `EngineJobRun` as `running`, then `succeeded` or `failed`.
- Consumer prefetch caps concurrency per queue.
- Cron enqueues due queued posts and health-check jobs.
- Failed jobs retain attempts, next retry time, and serialized error details.

## Device Automation

- `@julio/device-control` can construct a VMOS provider from env.
- ADB commands run only through `AdbClient`.
- Real VMOS start/stop/ADB connection calls are verified against one non-production pad.
- Per-device Mongo lease prevents two workers touching the same pad.

## Frontend

- `/engine` loads through the authenticated app shell.
- Locale mirror `/en/engine` (or active locale) resolves to the same page.
- Loading and error states render.
- Tables load devices, accounts, posts, proxies, and content pool through `@julio/api-client`.

## Cleanup

- `julius/` remains only as a requirements archive until real-device parity is confirmed.
- `r2-proxy`, `trend_clipper`, `launchd`, and mapper skills are not part of the target runtime.


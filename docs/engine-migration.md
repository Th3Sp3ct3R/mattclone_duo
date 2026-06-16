# Engine Migration Notes

`julius/` is treated as a requirements archive, not runtime code.

## Retired From Target Runtime

- `r2-proxy/`: replaced by `@julio/assets` with S3-compatible R2 endpoint support.
- `trend_clipper/`: replaced by `@julio/media` pipeline contracts and `@julio/shared`
  vector utilities.
- `launchd/`: replaced by the monorepo process model:
  - `yarn dev` for combined web/API
  - `yarn dev:worker` for cron and RabbitMQ consumers
- `metatron-inbox-poller.cjs`: not carried into the target runtime.
- `julius/skills/*` and `.claude/skills/*`: classified as development tools, not apps.

## Runtime Homes

- API: `apps/api`
- Worker: `apps/worker`
- Operator console: `apps/web-next/app/(app)/engine`
- Device I/O: `packages/device-control`
- Automation: `packages/automation`
- Media pipeline: `packages/media`
- Third-party clients: `packages/integrations`


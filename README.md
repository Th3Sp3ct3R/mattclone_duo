# julio Monorepo

Production monorepo (Yarn workspaces) with:
- Web app (Next.js App Router + SSR)
- Mobile app (Expo + React Native)
- HTTP API (Express app mounted under `/api/*` by the Next custom server)
- Background workers (Node: cron + RabbitMQ consumers)
- Shared packages (`@julio/*`):
  - `@julio/ui` (Base UI primitives + composed layout/compounds + SCSS)
  - `@julio/validation` (Yup schemas + message keys/translations)
  - `@julio/api-client`
  - `@julio/shared`
  - `@julio/assets` (S3 upload helpers + presigned URL flow)
  - server-only utilities exposed from `@julio/api/*` for the API app, web custom server, and worker

## Requirements

- Node: `>=18` (see `.nvmrc`)
- Yarn: `1.22.x`
- MongoDB + Redis + RabbitMQ running locally (or accessible URLs)

## Environment

Single shared env file at repo root:
- Copy `.env.example` → `.env`
- Fill in required variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `REDIS_URL`
  - `RABBITMQ_URL`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - `AWS_REGION`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `EXPO_PUBLIC_API_URL` (mobile)

S3 uploads (presigned URLs + public assets) are powered by `@julio/assets` and require the AWS vars above.

## Install

```bash
# Optional: rename scaffold placeholders across the monorepo
# - Replaces `julio` with your project slug
# - Replaces `@julio` with your npm scope (e.g. `@rabbithole`)
node ./scripts/set-project.mjs --slug <your-project-slug> --scope <your-npm-scope> --dry-run
node ./scripts/set-project.mjs --slug <your-project-slug> --scope <your-npm-scope>

yarn install
```

## Run (dev)

```bash
# web + worker (recommended)
yarn dev

# just web
yarn dev:web

# just worker
yarn dev:worker

# mobile (Expo)
yarn dev:mobile
```

## UI / Components styling

The web app is intentionally light on app-level CSS. It pulls styling from the packages:
- `@julio/ui/base.scss` (global baseline)
- `@julio/ui/primitives.scss` (primitive styles)
- `@julio/ui/compounds.scss` (compound styles)
- `@julio/ui/layout.scss` (layout styles)

## Storybook

```bash
# UI storybook (primitives + compounds + layout)
yarn workspace @julio/ui storybook
```

## API notes

The primary HTTP API is implemented in `apps/api` as an Express app. `apps/web-next/server.js` mounts that app for all `/api/*` requests so web and API can run on one port.

The Next app only keeps thin BFF route handlers where the web runtime needs cookie-level behavior, such as `app/api/v1/auth/login` and `app/api/v1/auth/logout`.

Long-lived jobs (cron + queue consumers) run in the worker app:
- `yarn workspace @julio/worker dev`

## Build / Start

```bash
yarn build

# starts web preview (Procfile entry)
yarn start
```

## Test / Lint

```bash
yarn test
yarn lint
```



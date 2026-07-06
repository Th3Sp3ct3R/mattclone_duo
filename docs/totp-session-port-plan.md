# Plan: Port instagrowth-saas TOTP + session persistence into the engine

## Decision: device-UI stays the login; we port the portable pieces
We do **not** adopt `instagram-private-api` (the InstaGrowth login engine) as the engine's login:
- It's **Instagram-only** — the engine's primary adapters are TikTok + YouTube.
- Headless API logins are **flagged/banned more** than real-device automation, which is the
  whole point of the cloud-phone fleet.

What we take from `instagrowth-saas/backend/relogin-fleet.ts`:
1. **`generateTOTP`** (RFC 6238, pure `crypto`) — platform-agnostic, the real win.
2. The **session-serialize concept** (store once, rehydrate) — applied to the engine's existing
   `session` sub-schema, not via instagram-private-api.

## Phase 1 — TOTP generator (shared util) ← start here
- `packages/integrations/src/totp.js`: `base32Decode`, `generateTOTP(secret, {now, offset})`,
  `totpCandidates` (current + next window). Export from `index.js`.
- `totp.test.js`: assert against RFC 4226 vectors (deterministic, injected time).

## Phase 2 — wire TOTP into device-UI login
- `secret-resolver.js` already yields `credentials.totpSecret`. Pass it to the adapter.
- In `packages/automation/src/{tiktok,youtube,instagram}/ui-flows.js` challenge handler:
  if `totpSecret` → type `generateTOTP(totpSecret)`; else fall back to email; retry next window.
- Unblocks combolist accounts that ship a TOTP seed (e.g. `vmvy919`).

## Phase 3 — session persistence
- Use the existing `engine-account.model.js` `session` sub-schema
  (`cookies`/`tokens`/`deviceFingerprint`/`twoFactorState`/`capturedAt`).
- Device-UI path: session lives in the app on the device → reuse the device (1:1 model);
  record metadata only, **no cookie extraction from app stores**.

## Phase 4 — (optional, opt-in) instagram-private-api fast lane
- Instagram-only alternative login for low-stakes/bulk accounts; shares `generateTOTP` +
  `session` model; gated behind a per-account flag. Never default for valuable accounts.

## Phase 5 — verify & roll out
- Unit test (RFC vectors) + one live 2FA account end-to-end → `status: active`, `session` populated.

## Files
| File | Change |
|------|--------|
| `packages/integrations/src/totp.js` (+ `.test.js`) | new — generateTOTP |
| `packages/integrations/src/index.js` | export totp |
| `packages/automation/src/*/ui-flows.js` | TOTP branch in challenge handler |
| `apps/worker/src/handlers/account.handler.js` | pass totpSecret; save session |

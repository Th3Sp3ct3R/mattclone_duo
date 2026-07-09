# `apps/api/bin/onboard-account.mjs`

Operator CLI that wraps **create account → assign device → enqueue onboarding**
into one command.

## Why it exists

The HTTP API exposes three separate endpoints for the same flow
(`/accounts`, `/accounts/:id/assign-device`, `/accounts/:id/onboard`), each
requiring an admin JWT. For the operator who already owns the account and
already has its credentials in Keychain, three round-trips with a token is
friction. This CLI does the same thing in one shot, talking directly to
Mongo so it works without the API server running.

## Security model

Passwords and email-passwords live ONLY in macOS Keychain. The CLI:

1. **Verifies** the required Keychain entries exist (presence-only — no value
   ever crosses into Node).
2. **Writes** the reference (`keychain:<service-name>`) into the account
   record's `credentials.secretRefs.{password,emailPassword}`.
3. **Leaves** `credentials.password` and `credentials.emailPassword` empty.

The account-onboarding worker resolves `secretRefs` against Keychain at
runtime. The actual secret values never appear in argv, on disk, in chat, in
Mongo, or in any log line.

Pre-flight checks before writing:

- Platform is one of `tiktok`, `instagram`, `youtube`.
- Username matches `[A-Za-z0-9._-]{2,40}`.
- Email (if given) is a plausible address.
- Keychain entry `tiktok-<handle>-password` exists.
- If `--email` was given, Keychain entry `tiktok-<handle>-email-password`
  also exists.
- Target device exists, is not retired, and passes
  `canDeviceAcceptAccount()`.
- No existing (platform, username) record (idempotency — refuses to
  double-create).
- No other account already uses the same device for the same platform
  (`findAccountDevicePlatformConflict`).

## Usage

```bash
yarn workspace @julio/api onboard:account -- tiktok \
  --username sarahjohnson_1200023 \
  --device any \
  --email sarahjohnson@personal.example \
  --warmup \
  --apply
```

…or directly:

```bash
node apps/api/bin/onboard-account.mjs tiktok \
  --username sarahjohnson_1200023 \
  --device any
```

### Flags

| Flag | Description |
|---|---|
| `--username <handle>` | Account handle (required, no `@`). |
| `--device <id\|name\|any>` | Device selector — `_id`, `providerDeviceId`, `name`, or `"any"` to auto-pick the first eligible free slot (same logic as `scripts/list-free-tiktok-slots.mjs`). |
| `--email <addr>` | Recovery email (optional). Adds the email-password keychain ref. |
| `--warmup` | After create+assign, enqueue `login → profile-setup → warmup` jobs via the onboarding service. |
| `--apply` | Actually write to Mongo. **Default is dry-run.** |
| `-h`, `--help` | Show inline help. |

### Examples

```bash
# Dry-run; nothing written
node apps/api/bin/onboard-account.mjs tiktok \
  --username sarahjohnson_1200023 --device any

# Apply with a specific device _id
node apps/api/bin/onboard-account.mjs tiktok \
  --username sarahjohnson_1200023 \
  --device 6a420bdfd4fb22b6109aeecd \
  --email sarahjohnson@personal.example --apply

# Apply + start onboarding (login → profile-setup → warmup loop)
node apps/api/bin/onboard-account.mjs tiktok \
  --username sarahjohnson_1200023 \
  --device snap_qXFA1 \
  --warmup --apply
```

## Prerequisites

1. **macOS** with Keychain access — the script uses `security` (Darwin-only).
2. **Password** for the account in Keychain under
   `tiktok-<handle>-password`. Set it with the operator helper:
   ```bash
   ~/.mavis/agents/main/workspace/migrate-to-keychain.sh tiktok-<handle>-password
   ```
3. If `--email` is given, the email password must also be in Keychain under
   `tiktok-<handle>-email-password`.
4. `MONGODB_URI` set in the root `.env`.
5. `RABBITMQ_URL` set if you want `--warmup` onboarding jobs to actually
   publish — otherwise the `EngineJobRun` is upserted but no AMQP message
   is sent (matching the API controller's behavior).

## Account provenance

**This script does NOT police account provenance.** It will happily create a
record for any username whose Keychain entry you can point at.

Provenance (whether you actually own the account, whether it was
bulk-purchased, whether the operator workflow you're running is
ToS-coherent) is a pre-flight decision between you and your operator agent.
The runbook at `~/.mavis/agents/main/workspace/RUNBOOK-tiktok-accounts.md`
covers the legitimate-account workflow end-to-end, including the provenance
guardrails the agent applies before reaching for this CLI.

If you arrive here without going through that conversation: **stop and ask
your operator agent**. Refusal-on-bulk-purchase is enforced at the agent
layer, not at this CLI.

## Dry-run vs apply

Default mode is **dry-run**. It validates everything, prints the planned
Mongo writes as JSON (no secrets — only keychain references), and exits 0
without touching the database. Re-run with `--apply` to actually upsert.

This matches the convention used by `scripts/import-authorized-accounts.mjs`.

## Related

- `scripts/list-free-tiktok-slots.mjs` — pure read-only slot listing (this
  CLI calls the same logic when `--device any`).
- `scripts/import-authorized-accounts.mjs` — bulk import from a CSV manifest.
  Use that for ≥2 accounts; use this CLI for one-at-a-time operator work.
- `~/.mavis/agents/main/workspace/migrate-to-keychain.sh` — write a single
  password to Keychain (stdin-piped, never on argv).
- `~/.mavis/agents/main/workspace/RUNBOOK-tiktok-accounts.md` — full
  legitimate-account workflow including credential rotation.
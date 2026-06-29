# ADR-001: Keychain Secret-Ref Architecture for Account Credentials

**Status:** Accepted  
**Date:** 2026-06-29

## Context

The engine must authenticate to third-party platforms (TikTok, Instagram, YouTube) on behalf of managed accounts. Each account requires a password and an email password, and optionally a TOTP seed. Storing these credentials as plaintext in the database, config files, or the account manifest CSV creates multiple breach surfaces: a compromised DB dump, a leaked git commit, or a logged job payload would expose every account simultaneously.

## Decision

Credentials are never stored as plaintext anywhere in the system. Instead:

1. **Keychain storage** — secrets are written to macOS Keychain via `security add-generic-password`. The value never appears on the command line (piped via stdin or interactive prompt).

2. **Secret refs in the manifest** — the `authorized-accounts.csv` manifest uses opaque ref strings instead of values:
   ```
   keychain:tiktok-<handle>-password
   keychain:tiktok-<handle>-email-password
   keychain:tiktok-<handle>-totp
   ```

3. **Manifest is gitignored** — `authorized-accounts*.csv` is in `.gitignore`. Only the `.example.csv` (no real data) is tracked.

4. **DB stores refs, not values** — `EngineAccount.credentials.secretRefs` holds the ref strings (e.g. `keychain:tiktok-handle-password`). The DB contains no usable credentials.

5. **Worker resolves at runtime** — the secret-ref resolver (`apps/worker/src/handlers/secret-resolver`) reads Keychain only at the moment a job runs. The resolved value is held in memory for the duration of the job and never written anywhere.

## Flow

```
authorized-accounts.csv  →  import:authorized-accounts  →  MongoDB (refs only)
                                                                ↓
                                                         Worker job fires
                                                                ↓
                                              secret-resolver reads Keychain
                                                                ↓
                                              credential held in memory only
                                                                ↓
                                              platform login / action executes
                                                                ↓
                                              memory cleared, job complete
```

## Consequences

**Enables:**
- DB breach exposes no usable credentials — only opaque ref strings.
- Git history contains no secrets — manifest is gitignored, example file is safe.
- Log scraping yields nothing — refs are logged, values are not.
- Per-account key isolation — each account has its own named Keychain entry; revoking one does not affect others.

**Constrains:**
- The worker must run on the same machine as the Keychain (macOS). Remote/containerised workers require an alternative secret backend (e.g. HashiCorp Vault, AWS Secrets Manager) using the same `provider:service-name` ref convention.
- Adding an account requires manual Keychain setup before import. There is no bulk plaintext import path — this is intentional.
- Rotating a credential means updating Keychain and re-running the affected job; the DB record requires no change.

## Alternatives Considered

- **Plaintext in DB** — rejected. Single breach exposes all accounts.
- **Encrypted DB field** — rejected. Key management complexity; encryption key itself becomes the single point of failure.
- **Environment variables** — rejected. Shared across all accounts; rotation requires process restart.
- **`.env` file** — rejected. Easily leaked via git, logs, or misconfigured editors.

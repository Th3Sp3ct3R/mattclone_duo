# DuoPlus CDP Endpoint Discovery

This workflow uses the repository's raw Chrome DevTools Protocol client. It does
not use Puppeteer and never types or stores login credentials.

## Canonical browser session

- Chrome profile: `~/.duoplus-refresh-chrome`
- CDP port: `9223`
- Session file: `DUOPLUS_SESSION_FILE`, defaulting to `duoplus-session.json` at
  the repository root
- Browser API host allowed for Authorization capture: exactly
  `https://api.duoplus.cn`

The capture command opens a dedicated tab, enables CDP Network events before
navigating, reloads once without cache if necessary, and accepts an
`Authorization` header only from the exact DuoPlus API host. It validates the
credential using `/account/profile`, with `/image/controlList` as a safe
fallback, before atomically replacing the session file with mode `0600`.

An invalid or stale credential never overwrites the previous session file.
The refresh and discovery commands both load `DUOPLUS_SESSION_FILE` from the
repository `.env` when it is not already exported, and resolve relative paths
against the repository root.

## Login and discovery command

If the dedicated profile is not logged in, open it visibly:

```bash
apps/api/scripts/duoplus-visible-chrome.sh
```

Log into DuoPlus in that window, leave the images page open, and run:

```bash
yarn workspace @julio/api duoplus:discover
```

That command performs the complete sequence:

1. Verifies that CDP port `9223` belongs to the dedicated profile, starting its
   persistent headless Chrome process if necessary.
2. Captures and safely validates a fresh Authorization header.
3. Collects redacted CDP request/response metadata from DuoPlus API traffic.
4. Live-tests only allowlisted read-only internal and OpenAPI endpoints.
5. Compares observations against the 67 endpoints in the two DuoPlus clients.
6. Writes the machine-readable artifact and Markdown report.

Individual commands are also available:

```bash
yarn workspace @julio/api duoplus:session:refresh
yarn workspace @julio/api duoplus:endpoints
```

Useful overrides:

```bash
DUOPLUS_CDP_PORT=9223
DUOPLUS_CDP_PROFILE_DIR="$HOME/.duoplus-refresh-chrome"
DUOPLUS_SESSION_FILE="/absolute/local/path/duoplus-session.json"
DUOPLUS_CAPTURE_WAIT_MS=9000
```

## Outputs

- Local machine-readable artifact:
  `output/duoplus-endpoint-discovery.json`
- Tracked human-readable report:
  `docs/duoplus-endpoints-live-static-billable-skipped.md`

The artifact and report contain only method, normalized path, response status,
request field names, response field names, timestamp, session source, static
comparison, and classification metadata. They never contain raw headers,
tokens, cookies, credentials, request values, response values, phone numbers,
or device identifiers.

Every endpoint receives one primary classification:

- `live verified`
- `authentication failed`
- `unavailable`
- `state-changing`
- `billable`
- `untested`

Safety classification takes precedence. The discovery command never executes
phone start, power, restart, ADB, app mutation, proxy mutation, file mutation,
automation mutation, purchase, renewal, root, SMS, or control-session actions.

To generate a report from a local session without attaching CDP, use:

```bash
yarn workspace @julio/api duoplus:endpoints --no-cdp
```

This still validates the local session first. The report explicitly identifies
whether the credential came from a fresh CDP capture or an existing session.

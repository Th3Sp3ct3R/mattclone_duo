#!/usr/bin/env node
/**
 * Generic CDP session capture — ported & generalized from suno-engine's
 * `scripts/suno-login.ts`.
 *
 * Connects to a Chrome already running with --remote-debugging-port, navigates to
 * a target site, waits for you to log in *manually* in that Chrome window (this
 * script never types credentials), then captures the session and writes it to a
 * JSON file that API clients can reuse.
 *
 * It can capture any combination of:
 *   - cookies            (filtered by domain substring)        — e.g. Suno/Clerk
 *   - a bearer token     (via a JS expression you provide)     — e.g. Clerk.session.getToken()
 *   - an Authorization   (sniffed from request headers on a    — e.g. DuoPlus
 *     header              URL pattern; DuoPlus auth is a header token, not a cookie)
 *   - localStorage keys  (optional)
 *
 * Usage:
 *   node apps/api/scripts/capture-session.mjs --preset suno
 *   node apps/api/scripts/capture-session.mjs --preset duoplus
 *   node apps/api/scripts/capture-session.mjs \
 *     --url https://example.com --out ./example-session.json \
 *     --cookie-domains example.com,clerk \
 *     --login-cookie __session \
 *     --token-expr "window.Clerk?.session?.getToken()" \
 *     --auth-header-url /api/ \
 *     --port 9222
 */
import {
  authorizationFromHeaders,
  isAuthenticatedDuoPlusRequest,
  validateDuoPlusAuthorization,
  writeJsonAtomically
} from '../src/utils/duoplus-session-capture.js';
import { isReadOnlyEndpoint } from '../../../packages/device-control/src/duoplus-endpoint-inventory.js';
import {
  cdpRpc,
  closeCdpPage,
  connectCdpWebSocket,
  openCdpPage,
  waitForCondition
} from './lib/cdp-client.mjs';

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = {
  suno: {
    url: 'https://suno.com',
    out: './suno-session.json',
    cookieDomains: ['suno', 'clerk'],
    loginCookie: '__session',
    tokenExpr: 'window.Clerk?.session?.getToken?.()',
    authHeaderUrl: '',
    authHeaderHost: '',
    requireNewTab: false
  },
  duoplus: {
    // DuoPlus authenticates the internal web API with an `Authorization` header
    // token (not a cookie), so we sniff it from XHRs to api.duoplus.cn. Navigate to
    // an authenticated route (/images) that reliably fires those XHRs on load.
    url: 'https://my.duoplus.cn/images',
    out: './duoplus-session.json',
    cookieDomains: ['duoplus'],
    loginCookie: '',
    tokenExpr: '',
    authHeaderUrl: '',
    authHeaderHost: 'api.duoplus.cn',
    waitMs: 9000,
    requireNewTab: true,
    validateAuthorization: true
  }
};

// ── Args ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; } else { out[key] = true; }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const preset = args.preset ? PRESETS[args.preset] : {};
if (args.preset && !preset) {
  console.error(`Unknown preset "${args.preset}". Known: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}
const cfg = {
  port: Number(args.port || 9222),
  url: args.url || preset.url,
  out: args.out || preset.out,
  cookieDomains: (args['cookie-domains'] ? String(args['cookie-domains']).split(',') : preset.cookieDomains) || [],
  loginCookie: args['login-cookie'] || preset.loginCookie || '',
  tokenExpr: args['token-expr'] || preset.tokenExpr || '',
  authHeaderUrl: args['auth-header-url'] || preset.authHeaderUrl || '',
  authHeaderHost: args['auth-header-host'] || preset.authHeaderHost || '',
  waitMs: Number(args['wait-ms'] || preset.waitMs || 6000),
  localStorageKeys: args['localstorage-keys'] ? String(args['localstorage-keys']).split(',') : [],
  requireNewTab: preset.requireNewTab !== false,
  validateAuthorization: Boolean(preset.validateAuthorization),
  sessionSource: args.source || `chrome-cdp:${Number(args.port || 9222)}`
};
if (!cfg.url || !cfg.out) {
  console.error('Required: --url and --out (or --preset). See header for usage.');
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔐 Session capture → ${cfg.url}`);
  const page = await openCdpPage({ port: cfg.port, url: cfg.url, requireNewTab: cfg.requireNewTab });
  if (!page.created) console.log('  ↪ using existing CDP page target');
  const ws = await connectCdpWebSocket(page.tab.webSocketDebuggerUrl);

  try {
    let sniffedAuth = '';
    let blockedRequestCount = 0;
    const expectsAuthorization = Boolean(cfg.authHeaderHost || cfg.authHeaderUrl);
    if (expectsAuthorization) {
      await cdpRpc(ws, 'Network.enable');
      await cdpRpc(ws, 'Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
      if (cfg.authHeaderHost) {
        await cdpRpc(ws, 'Fetch.enable', {
          patterns: [{ urlPattern: 'https://api.duoplus.cn/*', requestStage: 'Request' }]
        });
      }
      ws.on('message', (raw) => {
        let message;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const request = message.params?.request || {};
        if (message.method === 'Fetch.requestPaused') {
          if (!sniffedAuth && isAuthenticatedDuoPlusRequest(request.url, request.headers)) {
            sniffedAuth = authorizationFromHeaders(request.headers);
            console.log(`  🔑 captured fresh Authorization from ${cfg.authHeaderHost}`);
          }
          const allowed = isReadOnlyEndpoint(request.url);
          if (!allowed) blockedRequestCount += 1;
          const method = allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest';
          const params = allowed
            ? { requestId: message.params.requestId }
            : { requestId: message.params.requestId, errorReason: 'BlockedByClient' };
          cdpRpc(ws, method, params).catch(() => {});
          return;
        }
        if (message.method !== 'Network.requestWillBeSent' || sniffedAuth) return;
        const exactDuoPlusMatch = cfg.authHeaderHost
          ? isAuthenticatedDuoPlusRequest(request.url, request.headers)
          : false;
        const genericMatch = cfg.authHeaderUrl
          ? String(request.url || '').includes(cfg.authHeaderUrl) && authorizationFromHeaders(request.headers)
          : false;
        if (!exactDuoPlusMatch && !genericMatch) return;
        sniffedAuth = authorizationFromHeaders(request.headers);
        console.log(`  🔑 captured fresh Authorization from ${cfg.authHeaderHost || cfg.authHeaderUrl}`);
      });
    }

    console.log('🌐 navigating...');
    await cdpRpc(ws, 'Page.enable');
    await cdpRpc(ws, 'Page.navigate', { url: cfg.url });
    if (expectsAuthorization) {
      let captured = await waitForCondition(() => Boolean(sniffedAuth), cfg.waitMs);
      if (!captured) {
        console.log('  ↻ no authenticated request yet; reloading once without cache');
        await cdpRpc(ws, 'Page.reload', { ignoreCache: true });
        captured = await waitForCondition(() => Boolean(sniffedAuth), cfg.waitMs);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, cfg.waitMs));
    }
    if (blockedRequestCount) console.log(`  🛡 blocked ${blockedRequestCount} non-read-only browser requests`);

    const all = await cdpRpc(ws, 'Network.getAllCookies');
    const cookies = {};
    for (const cookie of all.cookies || []) {
      if (!cfg.cookieDomains.length || cfg.cookieDomains.some((domain) => cookie.domain.includes(domain))) {
        cookies[cookie.name] = cookie.value;
      }
    }
    console.log(`🍪 ${Object.keys(cookies).length} matching cookies`);

    const loggedIn = cfg.loginCookie
      ? Boolean(cookies[cfg.loginCookie])
      : expectsAuthorization
        ? Boolean(sniffedAuth)
        : Boolean(Object.keys(cookies).length);
    if (!loggedIn) {
      console.error('❌ No fresh authenticated request was captured; existing session file was preserved.');
      process.exitCode = 2;
      return;
    }

    let validation = null;
    if (cfg.validateAuthorization) {
      validation = await validateDuoPlusAuthorization({ authorization: sniffedAuth });
      if (!validation.valid) {
        console.error(`❌ Captured Authorization failed safe validation (${validation.classification}); existing session file was preserved.`);
        process.exitCode = 3;
        return;
      }
      console.log(`  ✓ validated with ${validation.endpoint} (${validation.status})`);
    }

    let bearer = null;
    if (cfg.tokenExpr) {
      try {
        const result = await cdpRpc(ws, 'Runtime.evaluate', {
          expression: `(async () => { try { return await (${cfg.tokenExpr}); } catch { return null; } })()`,
          returnByValue: true,
          awaitPromise: true
        });
        bearer = result.result?.value || null;
        console.log(bearer ? '  🔑 bearer token captured' : '  ⚠️ bearer token expression returned null');
      } catch {
        console.log('  ⚠️ bearer token evaluation failed');
      }
    }

    const localStorageOut = {};
    if (cfg.localStorageKeys.length) {
      const result = await cdpRpc(ws, 'Runtime.evaluate', {
        expression: `JSON.stringify(Object.fromEntries(${JSON.stringify(cfg.localStorageKeys)}.map(k => [k, localStorage.getItem(k)])))`,
        returnByValue: true
      });
      Object.assign(localStorageOut, JSON.parse(result.result?.value || '{}'));
    }

    const now = new Date().toISOString();
    const session = {
      captured_at: now,
      target: cfg.url,
      session_source: cfg.sessionSource,
      ...(validation
        ? {
            authentication: {
              provenance: 'fresh-cdp',
              host: cfg.authHeaderHost,
              validated_at: now,
              validation_endpoint: validation.endpoint,
              validation_status: validation.status
            }
          }
        : {}),
      ...(sniffedAuth ? { authorization: sniffedAuth } : {}),
      ...(bearer ? { bearer_token: bearer } : {}),
      ...(Object.keys(localStorageOut).length ? { localStorage: localStorageOut } : {}),
      cookies
    };
    writeJsonAtomically(cfg.out, session);
    console.log(`✅ validated session written atomically → ${cfg.out}`);
  } finally {
    ws.close();
    if (page.created) await closeCdpPage(cfg.port, page.tab.id);
  }
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });

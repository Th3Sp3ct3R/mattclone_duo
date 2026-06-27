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
import http from 'node:http';
import fs from 'node:fs';
import WebSocket from 'ws'; // ws is CommonJS; its default export is the WebSocket class

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = {
  suno: {
    url: 'https://suno.com',
    out: './suno-session.json',
    cookieDomains: ['suno', 'clerk'],
    loginCookie: '__session',
    tokenExpr: 'window.Clerk?.session?.getToken?.()',
    authHeaderUrl: ''
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
    authHeaderUrl: 'api.duoplus.cn',
    waitMs: 9000
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
  waitMs: Number(args['wait-ms'] || preset.waitMs || 6000),
  localStorageKeys: args['localstorage-keys'] ? String(args['localstorage-keys']).split(',') : []
};
if (!cfg.url || !cfg.out) {
  console.error('Required: --url and --out (or --preset). See header for usage.');
  process.exit(1);
}

// ── CDP helpers ───────────────────────────────────────────────────────────────
function cdpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${cfg.port}${path}`, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('CDP HTTP timeout — is Chrome running with --remote-debugging-port?')); });
  });
}

function cdpPut(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${cfg.port}${path}`, { method: 'PUT' }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('CDP HTTP timeout')); });
    req.end();
  });
}

function rpc(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) { ws.off('message', handler); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔐 Session capture → ${cfg.url}`);
  // Open a DEDICATED tab (don't hijack the user's existing tabs), navigate it to the
  // target, capture, then close it. Modern Chrome requires PUT for /json/new.
  let tab = await cdpPut(`/json/new?${encodeURIComponent(cfg.url)}`).catch(() => null);
  if (!tab || !tab.webSocketDebuggerUrl) {
    tab = await cdpGet(`/json/new?${encodeURIComponent(cfg.url)}`).catch(() => null); // older Chrome
  }
  if (!tab || !tab.webSocketDebuggerUrl) {
    throw new Error('Could not open a capture tab — is Chrome running with --remote-debugging-port?');
  }
  const createdTabId = tab.id;
  const closeTab = async () => {
    await cdpPut(`/json/close/${createdTabId}`).catch(() => cdpGet(`/json/close/${createdTabId}`).catch(() => {}));
  };
  const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 50 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  // Sniff Authorization header (DuoPlus-style) if configured.
  let sniffedAuth = '';
  if (cfg.authHeaderUrl) {
    await rpc(ws, 'Network.enable');
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.method === 'Network.requestWillBeSent') {
        const u = m.params?.request?.url || '';
        const h = m.params?.request?.headers || {};
        const auth = h.Authorization || h.authorization;
        if (u.includes(cfg.authHeaderUrl) && auth && !sniffedAuth) {
          sniffedAuth = String(auth);
          console.log(`  🔑 captured Authorization header from ${cfg.authHeaderUrl} request`);
        }
      }
    });
  }

  console.log('🌐 navigating...');
  await rpc(ws, 'Page.enable');
  await rpc(ws, 'Page.navigate', { url: cfg.url });
  await new Promise((r) => setTimeout(r, cfg.waitMs));

  // Cookies
  const all = await rpc(ws, 'Network.getAllCookies');
  const cookies = {};
  for (const c of all.cookies || []) {
    if (!cfg.cookieDomains.length || cfg.cookieDomains.some((d) => c.domain.includes(d))) {
      cookies[c.name] = c.value;
    }
  }
  console.log(`🍪 ${Object.keys(cookies).length} cookies (domains: ${cfg.cookieDomains.join(', ') || 'all'})`);

  // Login detection — pick the signal that actually proves an authenticated session:
  //   - loginCookie set   → that session cookie must be present (Suno/Clerk: __session)
  //   - authHeaderUrl set → an Authorization header must have been sniffed (DuoPlus)
  //   - otherwise         → fall back to "any captured cookies"
  // (Tracking cookies on a public sign-in page must NOT count as logged-in.)
  const loggedIn = cfg.loginCookie
    ? Boolean(cookies[cfg.loginCookie])
    : cfg.authHeaderUrl
      ? Boolean(sniffedAuth)
      : Boolean(Object.keys(cookies).length);

  if (!loggedIn) {
    console.log('❌ Not logged in yet.');
    console.log(`   Log in manually in the Chrome window (${cfg.url}), then re-run this script.`);
    ws.close();
    await closeTab();
    process.exit(2);
  }

  // Optional bearer token via JS
  let bearer = null;
  if (cfg.tokenExpr) {
    try {
      const r = await rpc(ws, 'Runtime.evaluate', {
        expression: `(async () => { try { return await (${cfg.tokenExpr}); } catch { return null; } })()`,
        returnByValue: true,
        awaitPromise: true
      });
      bearer = r.result?.value || null;
      console.log(bearer ? '  🔑 bearer token captured' : '  ⚠️  bearer token expr returned null');
    } catch { console.log('  ⚠️  bearer token eval failed'); }
  }

  // Optional localStorage keys
  const localStorageOut = {};
  if (cfg.localStorageKeys.length) {
    const r = await rpc(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify(Object.fromEntries(${JSON.stringify(cfg.localStorageKeys)}.map(k => [k, localStorage.getItem(k)])))`,
      returnByValue: true
    });
    Object.assign(localStorageOut, JSON.parse(r.result?.value || '{}'));
  }

  const session = {
    captured_at: new Date().toISOString(),
    target: cfg.url,
    ...(sniffedAuth ? { authorization: sniffedAuth } : {}),
    ...(bearer ? { bearer_token: bearer } : {}),
    ...(Object.keys(localStorageOut).length ? { localStorage: localStorageOut } : {}),
    cookies
  };
  fs.writeFileSync(cfg.out, JSON.stringify(session, null, 2));
  console.log(`✅ session written → ${cfg.out}`);
  ws.close();
  await closeTab();
  process.exit(0);
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });

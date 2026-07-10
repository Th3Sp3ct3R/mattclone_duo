import http from 'node:http';
import WebSocket from 'ws';

function cdpHttpRequest(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${port}${path}`, { method }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`CDP HTTP timeout on 127.0.0.1:${port}`));
    });
    req.end();
  });
}

export function cdpGet(port, path) {
  return cdpHttpRequest(port, path, 'GET');
}

export function cdpPut(port, path) {
  return cdpHttpRequest(port, path, 'PUT');
}

export function cdpRpc(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.id !== id) return;
      ws.off('message', handler);
      if (message.error) reject(new Error(`${method} failed`));
      else resolve(message.result);
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

export async function openCdpPage({ port, url, requireNewTab = true }) {
  const encodedUrl = encodeURIComponent(url);
  let tab = await cdpPut(port, `/json/new?${encodedUrl}`).catch(() => null);
  if (!tab?.webSocketDebuggerUrl) {
    tab = await cdpGet(port, `/json/new?${encodedUrl}`).catch(() => null);
  }
  if (tab?.webSocketDebuggerUrl) return { tab, created: true };
  if (requireNewTab) {
    throw new Error(`Could not create a dedicated CDP tab on 127.0.0.1:${port}`);
  }
  const tabs = await cdpGet(port, '/json/list').catch(() => []);
  const existing = Array.isArray(tabs)
    ? tabs.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl)
    : null;
  if (!existing) throw new Error(`No CDP page target is available on 127.0.0.1:${port}`);
  return { tab: existing, created: false };
}

export async function closeCdpPage(port, tabId) {
  if (!tabId) return;
  await cdpPut(port, `/json/close/${tabId}`).catch(() => cdpGet(port, `/json/close/${tabId}`).catch(() => {}));
}

export async function connectCdpWebSocket(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl, { maxPayload: 50 * 1024 * 1024 });
  ws.setMaxListeners(100);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return ws;
}

export async function waitForCondition(predicate, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return Boolean(predicate());
}

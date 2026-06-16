const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export async function fetchText(url, { timeoutMs = 20_000, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json',
        ...headers
      }
    });
    if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  return JSON.parse(text);
}

export function extractJsonScript(html, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  if (!match) return null;
  return JSON.parse(match[1]);
}

export function extractObjectAssignment(html, assignmentName) {
  const index = html.indexOf(assignmentName);
  if (index === -1) return null;
  const start = html.indexOf('{', index);
  if (start === -1) return null;
  let depth = 0;
  for (let pos = start; pos < html.length; pos += 1) {
    const char = html[pos];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return JSON.parse(html.slice(start, pos + 1));
  }
  return null;
}

export function parseCompactNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).replace(/,/g, '').trim().toLowerCase();
  const match = raw.match(/^([\d.]+)\s*([kmb])?$/);
  if (!match) return Number(raw) || 0;
  const base = Number(match[1]) || 0;
  const suffix = match[2];
  if (suffix === 'k') return Math.round(base * 1_000);
  if (suffix === 'm') return Math.round(base * 1_000_000);
  if (suffix === 'b') return Math.round(base * 1_000_000_000);
  return base;
}

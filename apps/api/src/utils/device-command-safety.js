const SECRET_KEY_RE = /(password|token|secret|cookie|authorization|api[_-]?key|session|otp|totp|pwd|csrf)/i;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;

export function sanitizeCommandData(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(sanitizeCommandData);
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  if (typeof value !== 'object') return value;

  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    clean[key] = SECRET_KEY_RE.test(key) ? '[redacted]' : sanitizeCommandData(child);
  }
  return clean;
}

export function normalizeCoordinate({ x, y, width = 720, height = 1280 } = {}) {
  const safeWidth = Math.max(1, Number(width || 720));
  const safeHeight = Math.max(1, Number(height || 1280));
  const safeX = Math.max(0, Math.round(Number(x || 0)));
  const safeY = Math.max(0, Math.round(Number(y || 0)));
  return {
    x: safeX,
    y: safeY,
    width: safeWidth,
    height: safeHeight,
    nx: Number((safeX / safeWidth).toFixed(6)),
    ny: Number((safeY / safeHeight).toFixed(6))
  };
}

export function summarizeUiDump(xml = '') {
  const text = String(xml || '');
  const nodeCount = (text.match(/<node\b/g) || []).length;
  const textHints = [];
  const re = /\b(?:text|content-desc)="([^"]{1,80})"/g;
  let match;
  while ((match = re.exec(text)) && textHints.length < 20) {
    const hint = match[1].trim();
    if (hint && !SECRET_KEY_RE.test(hint) && !textHints.includes(hint)) textHints.push(hint);
  }
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    nodeCount,
    textHints
  };
}

export function detectInstagramScreen({ packageName = '', uiSummary = {} } = {}) {
  if (packageName && packageName !== 'com.instagram.android') return 'other_app';
  const hints = (uiSummary.textHints || []).map((hint) => String(hint).toLowerCase());
  if (hints.some((hint) => hint.includes('log in') || hint.includes('login'))) return 'login';
  if (hints.some((hint) => hint.includes('challenge') || hint.includes('suspicious'))) return 'checkpoint';
  if (hints.some((hint) => hint === 'follow' || hint.includes('message'))) return 'profile';
  if (hints.some((hint) => hint.includes('search'))) return 'search';
  if (packageName === 'com.instagram.android') return 'instagram_unknown';
  return 'unknown';
}

export function safeUsername(value = '') {
  const username = String(value || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    const err = new Error('targetUsername must be a valid Instagram username');
    err.status = 400;
    err.payload = { code: 'BAD_REQUEST', message: err.message };
    throw err;
  }
  return username;
}

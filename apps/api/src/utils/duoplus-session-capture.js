import fs from 'node:fs';
import path from 'node:path';

export const DUOPLUS_INTERNAL_ORIGIN = 'https://api.duoplus.cn';

const VALIDATION_REQUESTS = [
  { path: '/account/profile', body: {} },
  {
    path: '/image/controlList',
    body: { page: 1, pagesize: 1, region_type_id: '', group_id: 'all', keyword: '' }
  }
];

function headerValue(headers = {}, wantedName) {
  const wanted = String(wantedName).toLowerCase();
  const entry = Object.entries(headers || {}).find(([name]) => String(name).toLowerCase() === wanted);
  return String(entry?.[1] || '').trim();
}

export function isAuthenticatedDuoPlusRequest(url, headers = {}) {
  try {
    const parsed = new URL(String(url));
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'api.duoplus.cn' &&
      Boolean(headerValue(headers, 'authorization'))
    );
  } catch {
    return false;
  }
}

export function authorizationFromHeaders(headers = {}) {
  return headerValue(headers, 'authorization');
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function isAuthenticationFailure(response, data) {
  const status = Number(response?.status || 0);
  const code = Number(data?.code || 0);
  const message = String(data?.message || '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    code === 401 ||
    code === 403 ||
    message.includes('login') ||
    message.includes('expired') ||
    message.includes('unauthorized')
  );
}

export async function validateDuoPlusAuthorization({
  authorization,
  fetchImpl = globalThis.fetch,
  baseUrl = DUOPLUS_INTERNAL_ORIGIN,
  timeoutMs = 8000
} = {}) {
  if (!authorization || !fetchImpl) {
    return { valid: false, classification: 'authentication failed', endpoint: '', status: 0 };
  }

  const origin = String(baseUrl || DUOPLUS_INTERNAL_ORIGIN).replace(/\/+$/, '');
  for (const candidate of VALIDATION_REQUESTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${origin}${candidate.path}`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Lang: 'en'
        },
        body: JSON.stringify(candidate.body),
        signal: controller.signal
      });
      const data = parseJson(await response.text());
      const code = Number(data?.code);
      if (response.ok && (!Number.isFinite(code) || code === 200)) {
        return {
          valid: true,
          classification: 'live verified',
          endpoint: candidate.path,
          status: Number(response.status || 200)
        };
      }
      if (isAuthenticationFailure(response, data)) {
        return {
          valid: false,
          classification: 'authentication failed',
          endpoint: candidate.path,
          status: Number(response.status || 0)
        };
      }
    } catch {
      // The profile endpoint is not universal; continue to the fleet-list fallback.
    } finally {
      clearTimeout(timeout);
    }
  }

  return { valid: false, classification: 'unavailable', endpoint: '', status: 0 };
}

export function writeJsonAtomically(filePath, value) {
  const destination = path.resolve(filePath);
  const directory = path.dirname(destination);
  const temporary = path.join(directory, `.${path.basename(destination)}.${process.pid}.${Date.now()}.tmp`);
  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(temporary, 0o600);
    fs.renameSync(temporary, destination);
    fs.chmodSync(destination, 0o600);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

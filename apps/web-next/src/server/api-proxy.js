import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME } from '@/src/config/auth.js';

function normalizeOrigin(origin) {
  return String(origin || '').replace(/\/+$/, '');
}

export function resolveApiOrigin() {
  return (
    normalizeOrigin(process.env.API_BASE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_API_URL) ||
    'http://localhost:4000'
  );
}

export function buildApiUrl(pathname, search = '') {
  const safePath = String(pathname || '').replace(/^\/+/, '');
  return `${resolveApiOrigin()}/api/v1/${safePath}${search}`;
}

export async function readAuthTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}

export function buildProxyHeaders(req, token) {
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('content-length');
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return headers;
}

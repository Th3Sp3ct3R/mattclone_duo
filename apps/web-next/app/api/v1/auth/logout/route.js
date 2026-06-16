import { NextResponse } from 'next/server';

import { buildApiUrl, readAuthTokenFromCookies } from '@/src/server/api-proxy.js';
import { AUTH_COOKIE_NAME } from '@/src/config/auth.js';

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0
  };
}

export async function POST() {
  const token = await readAuthTokenFromCookies();
  await fetch(buildApiUrl('auth/logout'), {
    method: 'POST',
    headers: token
      ? { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' }
      : { 'X-Requested-With': 'XMLHttpRequest' }
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', cookieOptions());
  return response;
}

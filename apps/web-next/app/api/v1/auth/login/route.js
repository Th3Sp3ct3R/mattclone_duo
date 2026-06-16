import { NextResponse } from 'next/server';

import { buildApiUrl } from '@/src/server/api-proxy.js';
import { AUTH_COOKIE_NAME } from '@/src/config/auth.js';

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  };
}

export async function POST(req) {
  const payload = await req.json();
  const apiRes = await fetch(buildApiUrl('auth/login'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload)
  });

  const data = await apiRes.json().catch(() => null);
  if (!apiRes.ok) {
    return NextResponse.json(data ?? { ok: false, message: 'Login failed' }, {
      status: apiRes.status
    });
  }

  const response = NextResponse.json(data, { status: apiRes.status });
  if (data?.token) {
    response.cookies.set(AUTH_COOKIE_NAME, data.token, cookieOptions());
  }
  return response;
}

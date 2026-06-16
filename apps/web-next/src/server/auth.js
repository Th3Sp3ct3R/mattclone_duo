import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { AUTH_COOKIE_NAME, getJwtSecret } from '@/src/config/auth.js';

export async function readAuthTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}

export async function getUserFromRequestCookies() {
  const token = await readAuthTokenFromCookies();
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    if (!secret) return null;
    const p = jwt.verify(token, secret);
    return { email: p?.email || null, role: p?.role || null };
  } catch {
    return null;
  }
}



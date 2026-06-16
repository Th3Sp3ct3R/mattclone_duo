import { api } from '@julio/api-client';
import { resolveApiOrigin } from '@/src/server/api-proxy.js';

export async function getSeoSettings() {
  const origin = resolveApiOrigin();
  if (process.env.NODE_ENV === 'production' && origin.includes('localhost')) {
    console.warn('[web-next] Missing API_BASE_URL/NEXT_PUBLIC_API_URL; SEO settings unavailable.');
    return null;
  }
  try {
    const payload = await api.seo.public.getSettings();
    return payload?.settings || null;
  } catch {
    return null;
  }
}


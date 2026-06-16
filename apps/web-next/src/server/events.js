import { api } from '@julio/api-client';
import { resolveApiOrigin } from '@/src/server/api-proxy.js';

let hasWarnedMissingApiOrigin = false;

function isMissingApiOrigin() {
  const origin = resolveApiOrigin();
  return origin.includes('localhost') || origin.includes('127.0.0.1');
}

function warnMissingApiOrigin() {
  if (hasWarnedMissingApiOrigin) return;
  hasWarnedMissingApiOrigin = true;
  console.warn(
    '[web-next] Missing API_BASE_URL/NEXT_PUBLIC_API_URL in production; event data disabled.'
  );
}

async function fetchJson(getter) {
  if (process.env.NODE_ENV === 'production' && isMissingApiOrigin()) {
    warnMissingApiOrigin();
    return null;
  }
  try {
    return await getter();
  } catch {
    return null;
  }
}

export async function getPublicEventBySlug(slug) {
  const payload = await fetchJson(() => api.events.public.getEventBySlug(slug));
  return payload?.event ?? payload ?? null;
}

import { getSeoSettings } from '@/src/seo/settings.js';

export async function GET() {
  const settings = await getSeoSettings();
  const body = settings?.robotsTxt || 'User-agent: *\nAllow: /';
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}


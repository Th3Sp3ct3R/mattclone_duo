import {
  buildApiUrl,
  buildProxyHeaders,
  readAuthTokenFromCookies
} from '@/src/server/api-proxy.js';

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

async function proxyRequest(req, { params }) {
  const resolvedParams = await params;
  const pathname = Array.isArray(resolvedParams?.path) ? resolvedParams.path.join('/') : '';
  const token = await readAuthTokenFromCookies();
  const method = req.method.toUpperCase();
  const init = {
    method,
    headers: buildProxyHeaders(req, token),
    redirect: 'manual'
  };

  if (!BODYLESS_METHODS.has(method)) {
    init.body = await req.text();
  }

  const apiRes = await fetch(buildApiUrl(pathname, req.nextUrl.search), init);
  const headers = new Headers(apiRes.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.delete('transfer-encoding');

  return new Response(apiRes.body, {
    status: apiRes.status,
    statusText: apiRes.statusText,
    headers
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;

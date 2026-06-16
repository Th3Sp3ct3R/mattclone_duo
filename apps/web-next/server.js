import http from 'node:http';

import { loadRootEnv } from '@julio/config/env';
import next from 'next';

loadRootEnv();

const { createApiApp } = await import('@julio/api/app');

const port = Number(process.env.PORT || 5173);
const isDev = process.env.NODE_ENV !== 'production';
const app = next({ dev: isDev, port });
const handle = app.getRequestHandler();

const apiApp = createApiApp();

function handleApi(req, res) {
  if (!req.url) return false;
  if (req.url.startsWith('/api/')) {
    apiApp(req, res);
    return true;
  }
  return false;
}

await app.prepare();

const server = http.createServer((req, res) => {
  if (handleApi(req, res)) return;
  handle(req, res);
});

server.listen(port, () => {
  console.log(`web+api listening on :${port}`);
});

if (process.env.RUN_WORKER === 'true') {
  import('@julio/worker');
}

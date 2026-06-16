import { Router } from 'express';

import { proxyNotImplemented } from '@julio/api/controllers/proxy';

export function createProxyRouter() {
  const router = Router();

  router.all('*', proxyNotImplemented);

  return router;
}

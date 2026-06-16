import { Router } from 'express';

import { login, logout, me } from '@julio/api/controllers/auth';

export function createAuthRouter() {
  const router = Router();

  router.post('/login', login);
  router.post('/logout', logout);
  router.get('/me', me);

  return router;
}

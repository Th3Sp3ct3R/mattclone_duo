import { Router } from 'express';

import { createChat } from '@julio/api/controllers/chat';

export function createChatRouter() {
  const router = Router();

  router.post('/', createChat);

  return router;
}

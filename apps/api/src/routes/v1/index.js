import { Router } from 'express';

import { createAuthRouter } from '@julio/api/routes/v1/auth';
import { createBlogRouter } from '@julio/api/routes/v1/blog';
import { createEventsRouter } from '@julio/api/routes/v1/events';
import { createContactRouter } from '@julio/api/routes/v1/contact';
import { createBookingRouter } from '@julio/api/routes/v1/booking';
import { createAdminRouter } from '@julio/api/routes/v1/admin';
import { createUsersRouter } from '@julio/api/routes/v1/users';
import { createSeoRouter } from '@julio/api/routes/v1/seo';
import { createAssetsRouter } from '@julio/api/routes/v1/assets';
import { createPaymentsRouter } from '@julio/api/routes/v1/payments';
import { createChatRouter } from '@julio/api/routes/v1/chat';
import { createProxyRouter } from '@julio/api/routes/v1/proxy';
import { createEngineRouter } from '@julio/api/routes/v1/engine';

export function createV1Router() {
  const router = Router();

  router.use('/auth', createAuthRouter());
  router.use('/blog', createBlogRouter());
  router.use('/events', createEventsRouter());
  router.use('/contact', createContactRouter());
  router.use('/booking', createBookingRouter());
  router.use('/admin', createAdminRouter());
  router.use('/users', createUsersRouter());
  router.use('/seo', createSeoRouter());
  router.use('/assets', createAssetsRouter());
  router.use('/payments', createPaymentsRouter());
  router.use('/chat', createChatRouter());
  router.use('/proxy', createProxyRouter());
  router.use('/engine', createEngineRouter());
  return router;
}

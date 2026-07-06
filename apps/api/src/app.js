import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { logger } from '@julio/api/logger';

import { createV1Router } from '@julio/api/routes/v1/index';
import { createHealthRouter } from '@julio/api/routes/health';
import { createDeviceControlCompatRouter } from '@julio/api/routes/device-control-compat';

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());

  const jsonParser = express.json({ limit: '10mb' });
  app.use((req, res, next) => {
    if (req.path === '/api/v1/payments/webhook') return next();
    return jsonParser(req, res, next);
  });
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/health', createHealthRouter());
  app.use('/api', createDeviceControlCompatRouter());
  app.use('/api/v1', createV1Router());

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    logger.error('API request failed', err);
    const status = err?.status || 500;
    const payload = err?.payload || { code: 'INTERNAL', message: 'Internal error' };
    return res.status(status).json(payload);
  });

  return app;
}

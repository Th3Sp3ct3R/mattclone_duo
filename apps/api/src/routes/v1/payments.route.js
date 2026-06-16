import { Router } from 'express';
import express from 'express';

import {
  createCheckoutSession,
  createPaymentIntent,
  createSubscription,
  handleWebhook
} from '@julio/api/controllers/payments';

export function createPaymentsRouter() {
  const router = Router();

  router.post('/checkout/session', createCheckoutSession);
  router.post('/payment-intent', createPaymentIntent);
  router.post('/subscription', createSubscription);
  router.post('/webhook', express.raw({ type: '*/*' }), handleWebhook);

  return router;
}

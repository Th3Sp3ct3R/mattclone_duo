import {
  createStripeClient,
  buildCheckoutSessionPayload,
  buildPaymentIntentPayload,
  buildSubscriptionPayload
} from '@julio/payments/server';
import { normalizeAmount, normalizeCurrency } from '@julio/payments/shared';
import { env } from '@julio/api/config/env';
import { logger } from '@julio/api/logger';

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function resolveAbsoluteUrl(req, fallbackPath) {
  const origin = req.headers?.origin || '';
  if (!origin) return fallbackPath || '';
  if (!fallbackPath) return origin;
  return new URL(fallbackPath, origin).toString();
}

export async function createCheckoutSession(req, res) {
  try {
    if (!env.stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY');
    const stripe = createStripeClient(env.stripeSecretKey);

    const mode = sanitizeString(req.body?.mode) || 'payment';
    const successUrl =
      sanitizeString(req.body?.successUrl) || resolveAbsoluteUrl(req, '/payments/success');
    const cancelUrl =
      sanitizeString(req.body?.cancelUrl) || resolveAbsoluteUrl(req, '/payments/cancel');
    const customerEmail = sanitizeString(req.body?.customerEmail);
    const customerId = sanitizeString(req.body?.customerId);
    const priceId = sanitizeString(req.body?.priceId);
    const quantity = sanitizeNumber(req.body?.quantity, 1);
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined;
    const lineItems = Array.isArray(req.body?.lineItems) ? req.body.lineItems : [];

    const payload = buildCheckoutSessionPayload({
      mode,
      successUrl,
      cancelUrl,
      customerEmail,
      customerId,
      lineItems,
      priceId,
      quantity,
      metadata
    });

    const session = await stripe.checkout.sessions.create(payload);
    return res.json({ ok: true, session: { id: session.id, url: session.url } });
  } catch (err) {
    logger.error('Stripe Checkout session failed', err);
    return res
      .status(500)
      .json({ code: 'PAYMENTS_ERROR', message: err?.message || 'Payments error' });
  }
}

export async function createPaymentIntent(req, res) {
  try {
    if (!env.stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY');
    const stripe = createStripeClient(env.stripeSecretKey);

    const amount = normalizeAmount(req.body?.amount);
    const currency = normalizeCurrency(req.body?.currency || 'usd');
    const customerId = sanitizeString(req.body?.customerId);
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined;
    const description = sanitizeString(req.body?.description);

    if (!amount) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Amount is required' });
    }

    const payload = buildPaymentIntentPayload({
      amount,
      currency,
      customerId,
      metadata,
      description
    });

    const intent = await stripe.paymentIntents.create(payload);
    return res.json({
      ok: true,
      paymentIntent: {
        id: intent.id,
        clientSecret: intent.client_secret
      }
    });
  } catch (err) {
    logger.error('Stripe PaymentIntent failed', err);
    return res
      .status(500)
      .json({ code: 'PAYMENTS_ERROR', message: err?.message || 'Payments error' });
  }
}

export async function createSubscription(req, res) {
  try {
    if (!env.stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY');
    const stripe = createStripeClient(env.stripeSecretKey);

    const customerId = sanitizeString(req.body?.customerId);
    const priceId = sanitizeString(req.body?.priceId);
    const quantity = sanitizeNumber(req.body?.quantity, 1);
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined;

    const payload = buildSubscriptionPayload({ customerId, priceId, quantity, metadata });
    const subscription = await stripe.subscriptions.create(payload);

    return res.json({
      ok: true,
      subscription: {
        id: subscription.id,
        status: subscription.status
      }
    });
  } catch (err) {
    logger.error('Stripe subscription failed', err);
    return res
      .status(500)
      .json({ code: 'PAYMENTS_ERROR', message: err?.message || 'Payments error' });
  }
}

export async function handleWebhook(req, res) {
  try {
    if (!env.stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY');
    if (!env.stripeWebhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

    const stripe = createStripeClient(env.stripeSecretKey);
    const signatureHeader = req.headers['stripe-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader || '';
    const rawBody = req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

    const event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
    return res.json({ ok: true, received: event.type });
  } catch (err) {
    logger.error('Stripe webhook failed', err);
    return res
      .status(400)
      .json({ code: 'PAYMENTS_WEBHOOK_ERROR', message: err?.message || 'Webhook error' });
  }
}

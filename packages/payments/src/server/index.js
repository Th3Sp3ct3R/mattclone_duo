import Stripe from 'stripe';

import { buildLineItem, normalizeCurrency, normalizeQuantity } from '../shared/index.js';

export function createStripeClient(secretKey, options = {}) {
  if (!secretKey) throw new Error('Missing Stripe secret key');
  return new Stripe(secretKey, {
    apiVersion: '2024-04-10',
    ...options
  });
}

export function buildCheckoutSessionPayload({
  mode,
  successUrl,
  cancelUrl,
  customerEmail,
  customerId,
  lineItems = [],
  priceId,
  quantity = 1,
  metadata
}) {
  const payload = {
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl
  };

  if (customerEmail) payload.customer_email = customerEmail;
  if (customerId) payload.customer = customerId;
  if (metadata && typeof metadata === 'object') payload.metadata = metadata;

  if (mode === 'subscription') {
    if (!priceId) throw new Error('Missing priceId for subscription Checkout session');
    payload.line_items = [
      {
        price: priceId,
        quantity: normalizeQuantity(quantity)
      }
    ];
  } else {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error('Missing line items for payment Checkout session');
    }
    payload.line_items = lineItems.map((item) =>
      buildLineItem({
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        quantity: item.quantity,
        description: item.description
      })
    );
  }

  return payload;
}

export function buildPaymentIntentPayload({
  amount,
  currency,
  customerId,
  metadata,
  automaticPaymentMethods = true,
  description
}) {
  return {
    amount,
    currency: normalizeCurrency(currency),
    customer: customerId || undefined,
    metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    description: description ? String(description || '').trim() : undefined,
    automatic_payment_methods: automaticPaymentMethods ? { enabled: true } : undefined
  };
}

export function buildSubscriptionPayload({ customerId, priceId, quantity = 1, metadata }) {
  if (!customerId) throw new Error('Missing customerId for subscription');
  if (!priceId) throw new Error('Missing priceId for subscription');
  return {
    customer: customerId,
    metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    items: [
      {
        price: priceId,
        quantity: normalizeQuantity(quantity)
      }
    ]
  };
}



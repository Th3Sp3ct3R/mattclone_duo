export const PAYMENT_INTENT_MODES = {
  payment: 'payment',
  setup: 'setup'
};

export const CHECKOUT_MODES = {
  payment: 'payment',
  subscription: 'subscription'
};

export const STRIPE_EVENTS = {
  checkoutSessionCompleted: 'checkout.session.completed',
  invoicePaid: 'invoice.paid',
  paymentIntentSucceeded: 'payment_intent.succeeded',
  customerSubscriptionCreated: 'customer.subscription.created',
  customerSubscriptionUpdated: 'customer.subscription.updated',
  customerSubscriptionDeleted: 'customer.subscription.deleted'
};

export function normalizeCurrency(value = 'usd') {
  return String(value || 'usd').trim().toLowerCase();
}

export function normalizeAmount(value, fallback = 0) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return fallback;
  return Math.round(amount);
}

export function normalizeQuantity(value, fallback = 1) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return fallback;
  return Math.round(quantity);
}

export function buildLineItem({ name, amount, currency, quantity = 1, description }) {
  return {
    price_data: {
      currency: normalizeCurrency(currency),
      product_data: {
        name: String(name || '').trim(),
        description: description ? String(description || '').trim() : undefined
      },
      unit_amount: normalizeAmount(amount)
    },
    quantity: normalizeQuantity(quantity)
  };
}



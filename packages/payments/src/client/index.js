import { loadStripe } from '@stripe/stripe-js';

export async function redirectToCheckout({ publishableKey, sessionId }) {
  if (!publishableKey) throw new Error('Missing Stripe publishable key');
  if (!sessionId) throw new Error('Missing Checkout session id');

  const stripe = await loadStripe(publishableKey);
  if (!stripe) throw new Error('Stripe.js failed to load');

  const result = await stripe.redirectToCheckout({ sessionId });
  if (result?.error) throw result.error;
}

export async function confirmPaymentIntent({
  publishableKey,
  clientSecret,
  paymentMethod,
  returnUrl
}) {
  if (!publishableKey) throw new Error('Missing Stripe publishable key');
  if (!clientSecret) throw new Error('Missing Payment Intent client secret');

  const stripe = await loadStripe(publishableKey);
  if (!stripe) throw new Error('Stripe.js failed to load');

  const result = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      payment_method: paymentMethod,
      return_url: returnUrl
    }
  });

  if (result?.error) throw result.error;
  return result;
}

export async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || 'Request failed';
    const err = new Error(message);
    err.data = data;
    throw err;
  }
  return data;
}



'use client';

import { useState } from 'react';

import { api } from '@julio/api-client';
import { Button, Card, Field, Input, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

export default function PaymentsAdminPage() {
  const [amount, setAmount] = useState(2000);
  const [currency, setCurrency] = useState('usd');
  const [status, setStatus] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);

  async function createTestIntent(event) {
    event.preventDefault();
    setStatus(null);
    setClientSecret('');
    setLoading(true);
    try {
      const data = await api.payments.createPaymentIntent({ amount, currency });
      setClientSecret(data?.paymentIntent?.clientSecret || '');
      setStatus('Payment Intent created.');
      notifications.notify({ title: 'Payment intent created', message: 'Test intent ready.' });
    } catch (err) {
      const message = err?.message || 'Failed to create Payment Intent';
      setStatus(message);
      notifications.notify({ title: 'Payment intent failed', message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="page-section-header">
        <h1>Payments</h1>
        <p className="Kicker">Manage Stripe settings, plans, and transactions.</p>
      </div>

      <div className="HomeFeatureGrid">
        <Card>
          <h3>Setup status</h3>
          <div className="Kicker">Connect Stripe, set defaults, and configure webhooks.</div>
        </Card>
        <Card>
          <h3>Revenue</h3>
          <div className="Kicker">Track recent payments, refunds, and subscription health.</div>
        </Card>
        <Card>
          <h3>Catalog</h3>
          <div className="Kicker">Manage products, prices, and billing cadence.</div>
        </Card>
      </div>

      <Card className="layout-stack-gap-12">
        <h3>Test Payment Intent</h3>
        <div className="Kicker">Creates a Payment Intent using the payments API routes.</div>
        <form onSubmit={createTestIntent} className="layout-stack-gap-12">
          <div className="grid">
            <Field.Root>
              <Field.Label htmlFor="testAmount">Amount (cents)</Field.Label>
              <Field.Control>
                <Input
                  id="testAmount"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                />
              </Field.Control>
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="testCurrency">Currency</Field.Label>
              <Field.Control>
                <Input
                  id="testCurrency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </Field.Control>
            </Field.Root>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="layout-inline-gap-8 layout-inline-center">
                <Spinner size="sm" label="Creating payment intent" />
                <span>Creating…</span>
              </span>
            ) : (
              'Create Payment Intent'
            )}
          </Button>
          {status ? <div className="Kicker">{status}</div> : null}
          {clientSecret ? (
            <div className="Kicker">Client secret: {clientSecret}</div>
          ) : null}
        </form>
      </Card>
    </div>
  );
}


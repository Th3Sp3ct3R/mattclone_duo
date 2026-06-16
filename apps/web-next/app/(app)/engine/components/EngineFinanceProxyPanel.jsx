'use client';

import { Button, Card, DataTable, Input } from '@julio/ui';

export function EngineFinanceProxyPanel({
  proxies,
  expenses,
  djekxaOrders,
  djekxaBalance,
  orderForm,
  setOrderForm,
  actionKey,
  runAction
}) {
  const proxyColumns = [
    { accessorKey: 'label', header: 'Proxy' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'endpoint.countryCode', header: 'Country' },
    { accessorKey: 'health.consecutiveFailures', header: 'Failures' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button size="sm" variant="secondary" loading={actionKey === `proxy:${row.original._id}:verify`} onClick={() => runAction(`proxy:${row.original._id}:verify`, () => row.original.verify())}>
          verify
        </Button>
      )
    }
  ];
  const orderColumns = [
    { accessorKey: 'externalOrderId', header: 'Order' },
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'priceUsdCents', header: 'USD cents' }
  ];
  const expenseColumns = [
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'amountCents', header: 'Amount cents' },
    { accessorKey: 'incurredAt', header: 'Incurred' }
  ];

  async function submitOrder(event) {
    event.preventDefault();
    await runAction('djekxa:order', () => orderForm.submit());
  }

  return (
    <div className="layout-stack-gap-12">
      <Card>
        <div className="layout-stack-gap-12">
          <div className="layout-inline-gap-8">
            <h2>Proxies</h2>
            <Button size="sm" variant="secondary" loading={actionKey === 'proxy:monitor'} onClick={() => runAction('proxy:monitor', () => proxies.monitor())}>
              Verify batch
            </Button>
          </div>
          <DataTable columns={proxyColumns} data={proxies.rows} emptyMessage="No proxies registered." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <div className="layout-inline-gap-8">
            <h2>Djekxa</h2>
            <span className="Kicker">Balance: {djekxaBalance ? JSON.stringify(djekxaBalance) : 'not loaded'}</span>
            <Button size="sm" variant="secondary" loading={actionKey === 'djekxa:import'} onClick={() => runAction('djekxa:import', () => orderForm.importOrders())}>
              Sync orders
            </Button>
          </div>
          <form className="HomeFeatureGrid" onSubmit={submitOrder}>
            <Input placeholder="productId" value={orderForm.productId} onChange={(event) => setOrderForm((prev) => ({ ...prev, productId: event.target.value }))} />
            <Input placeholder="quantity" value={orderForm.quantity} onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            <Input placeholder="expected price RUB" value={orderForm.expectedPriceRub} onChange={(event) => setOrderForm((prev) => ({ ...prev, expectedPriceRub: event.target.value }))} />
            <Input placeholder="max total RUB" value={orderForm.maxTotalRub} onChange={(event) => setOrderForm((prev) => ({ ...prev, maxTotalRub: event.target.value }))} />
            <Button type="submit" loading={actionKey === 'djekxa:order'}>Place live order</Button>
          </form>
          <DataTable columns={orderColumns} data={djekxaOrders} emptyMessage="No Djekxa orders imported." />
          <DataTable columns={expenseColumns} data={expenses} emptyMessage="No expenses tracked." />
        </div>
      </Card>
    </div>
  );
}

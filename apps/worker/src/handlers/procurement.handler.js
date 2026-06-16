import { env } from '@julio/api/config/env';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDjekxaOrder, EngineExpense } from '@julio/api/models/engine-finance';
import { DjekxaClient, DjekxaImporter } from '@julio/integrations';

import { runEngineJob } from '../engine-job-runner.js';

function getImporter() {
  const client = new DjekxaClient({
    apiKey: env.djekxaApiKey,
    baseUrl: env.djekxaBaseUrl || 'https://djekxa.ru/api/v2'
  });
  return { client, importer: new DjekxaImporter({ client, fxRubPerUsd: env.djekxaFxRubPerUsd }) };
}

async function persistImport(result) {
  if (result.skipped) return result;
  const accountIds = [];
  for (const account of result.importedAccounts || []) {
    const doc = await EngineAccount.findOneAndUpdate(
      { platform: account.platform, 'credentials.username': account.credentials.username },
      {
        platform: account.platform,
        status: 'new',
        credentials: account.credentials,
        tags: ['djekxa'],
        metadata: {
          acquisition: {
            source: 'djekxa',
            externalOrderId: result.externalOrderId,
            priceUsdCents: account.priceUsdCents,
            priceRub: account.priceRub,
            productName: account.productName
          }
        }
      },
      { upsert: true, new: true }
    );
    accountIds.push(doc._id);
  }

  const firstAccount = result.importedAccounts?.[0] || {};
  const order = await EngineDjekxaOrder.findOneAndUpdate(
    { externalOrderId: result.externalOrderId },
    {
      externalOrderId: result.externalOrderId,
      platform: firstAccount.platform || 'tiktok',
      status: result.status,
      username: firstAccount.credentials?.username || '',
      password: firstAccount.credentials?.password || '',
      email: firstAccount.credentials?.email || '',
      emailPassword: firstAccount.credentials?.emailPassword || '',
      priceRub: result.totalRub,
      priceUsdCents: result.totalUsdCents,
      importedAccountId: accountIds[0] || null,
      orderedAt: new Date(),
      metadata: {
        fxRubPerUsd: result.fxRubPerUsd,
        accountIds: accountIds.map(String),
        rawOrder: result.rawOrder
      }
    },
    { upsert: true, new: true }
  );

  if (result.totalUsdCents > 0) {
    await EngineExpense.findOneAndUpdate(
      { provider: 'djekxa', externalReference: result.externalOrderId },
      {
        category: 'account',
        provider: 'djekxa',
        amountCents: result.totalUsdCents,
        currency: 'USD',
        description: `Djekxa order ${result.externalOrderId}`,
        externalReference: result.externalOrderId,
        incurredAt: new Date(),
        metadata: { fxRubPerUsd: result.fxRubPerUsd }
      },
      { upsert: true, new: true }
    );
  }

  return { orderId: String(order._id), accountsCreated: accountIds.length };
}

async function importRecent(jobPayload = {}) {
  const { importer } = getImporter();
  const existing = await EngineDjekxaOrder.find({}).select('externalOrderId').lean();
  const results = await importer.syncRecent({
    maxPages: Number(jobPayload.maxPages || 5),
    existingOrderIds: new Set(existing.map((order) => order.externalOrderId))
  });
  const persisted = [];
  for (const result of results) persisted.push(await persistImport(result));
  return { imported: persisted.length, results: persisted };
}

async function createLiveOrder(jobPayload = {}) {
  const { client, importer } = getImporter();
  const product = await client.getProduct(jobPayload.productId);
  const livePrice = Number(product.price || product.data?.price || 0);
  if (jobPayload.expectedPriceRub && Math.abs(livePrice - Number(jobPayload.expectedPriceRub)) / Number(jobPayload.expectedPriceRub) > 0.1) {
    throw new Error('Djekxa price drift exceeded 10%');
  }
  const quantity = Number(jobPayload.quantity || 1);
  const liveTotal = livePrice * quantity;
  if (jobPayload.maxTotalRub && liveTotal > Number(jobPayload.maxTotalRub)) throw new Error('Djekxa order exceeds maxTotalRub');
  const balance = await client.getBalance();
  const available = Number(balance.balance || balance.data?.balance || balance.rub || 0);
  if (available && liveTotal > available) throw new Error('Insufficient Djekxa balance');
  const order = await client.createOrder({ items: [{ product_id: jobPayload.productId, quantity }] });
  const imported = await importer.importOrder(order.data || order);
  return persistImport(imported);
}

export async function handleProcurementJob(payload) {
  return runEngineJob(payload, async ({ jobName, payload: jobPayload }) => {
    if (jobName === 'djekxa-order') return createLiveOrder(jobPayload);
    return importRecent(jobPayload);
  });
}

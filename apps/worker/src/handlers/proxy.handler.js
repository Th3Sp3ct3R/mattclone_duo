import { env } from '@julio/api/config/env';
import { EngineExpense } from '@julio/api/models/engine-finance';
import { EngineProxy } from '@julio/api/models/engine-proxy';
import { verifyProxy } from '@julio/integrations';

import { runEngineJob } from '../engine-job-runner.js';
import { getProvider } from './worker-context.js';

function sampleByRegion(proxies, sampleSize) {
  const groups = new Map();
  for (const proxy of proxies) {
    const region = proxy.endpoint?.countryCode || proxy.metadata?.region || 'unknown';
    groups.set(region, [...(groups.get(region) || []), proxy]);
  }
  return [...groups.values()].flatMap((items) => items.sort(() => Math.random() - 0.5).slice(0, sampleSize));
}

async function verifyOne(proxy) {
  try {
    const result = await verifyProxy(proxy.endpoint);
    await EngineProxy.findByIdAndUpdate(proxy._id, {
      status: proxy.status === 'retired' ? 'retired' : 'available',
      'health.lastVerifiedAt': new Date(),
      'health.lastFailureReason': '',
      'health.consecutiveFailures': 0,
      'metadata.effectiveIp': result.effectiveIp
    });
    return { proxyId: String(proxy._id), ok: true, effectiveIp: result.effectiveIp };
  } catch (error) {
    const failures = Number(proxy.health?.consecutiveFailures || 0) + 1;
    await EngineProxy.findByIdAndUpdate(proxy._id, {
      status: failures >= env.proxyMonitor.maxConsecutiveFailures ? 'unhealthy' : proxy.status,
      'health.lastFailureReason': error?.message || 'Proxy verification failed',
      'health.consecutiveFailures': failures
    });
    return { proxyId: String(proxy._id), ok: false, error: error?.message || 'Proxy verification failed' };
  }
}

async function maybeAutoBuyDynamicGb() {
  if (!env.vmosAutoBuy.enabled || !env.vmosAutoBuy.dynamicGoodId) return { skipped: true };
  const provider = getProvider();
  const balance = await provider.client.queryCurrentTrafficBalance();
  const remainingGb = Number(balance.data?.remainingGb || balance.data?.remainGb || balance.remainingGb || 0);
  if (remainingGb >= env.vmosAutoBuy.gbThreshold) return { remainingGb, purchased: false };

  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `vmos-dynamic-gb:${env.vmosAutoBuy.dynamicGoodId}:${today}`;
  const existing = await EngineExpense.findOne({ provider: 'vmos', externalReference: idempotencyKey }).lean();
  if (existing) return { remainingGb, purchased: false, reason: 'already-purchased-today' };

  const purchase = await provider.client.buyDynamicGB({
    goodId: env.vmosAutoBuy.dynamicGoodId,
    quantity: env.vmosAutoBuy.gbPackageQty,
    idempotencyKey
  });
  await EngineExpense.create({
    category: 'proxy',
    provider: 'vmos',
    amountCents: 0,
    currency: 'USD',
    description: `VMOS dynamic proxy GB auto-buy ${env.vmosAutoBuy.gbPackageQty}`,
    externalReference: idempotencyKey,
    metadata: { purchase }
  });
  return { remainingGb, purchased: true, purchase };
}

export async function handleProxyJob(payload) {
  return runEngineJob(payload, async () => {
    await EngineProxy.updateMany(
      { status: { $ne: 'retired' }, expiresAt: { $ne: null, $lt: new Date() } },
      { status: 'unhealthy', 'health.lastFailureReason': 'Proxy lease expired' }
    );
    const proxies = await EngineProxy.find({ status: { $in: ['available', 'assigned', 'unhealthy'] } }).lean();
    const sample = sampleByRegion(proxies, env.proxyMonitor.verifySample);
    const verified = [];
    for (const proxy of sample) verified.push(await verifyOne(proxy));
    const available = await EngineProxy.countDocuments({ status: 'available' });
    const autoBuy = available < env.proxyMonitor.minAvailable ? await maybeAutoBuyDynamicGb() : { skipped: true };
    return { checked: verified.length, available, verified, autoBuy };
  });
}

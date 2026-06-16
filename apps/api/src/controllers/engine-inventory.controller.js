import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EnginePost } from '@julio/api/models/engine-post';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';
import { verifyProxy } from '@julio/integrations';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

export async function listProxies(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const proxies = await EngineProxy.find({}).sort({ updatedAt: -1 }).lean();
    return res.json({ ok: true, proxies });
  } catch (err) {
    logger.error('Engine proxies fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createProxy(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const proxy = await EngineProxy.create({
      label: String(req.body?.label || '').trim(),
      status: String(req.body?.status || 'available').trim(),
      endpoint: {
        protocol: String(req.body?.protocol || 'http').trim(),
        host: String(req.body?.host || '').trim(),
        port: Number(req.body?.port),
        username: String(req.body?.username || '').trim(),
        password: String(req.body?.password || '').trim(),
        countryCode: String(req.body?.countryCode || '').trim()
      },
      provider: String(req.body?.provider || '').trim(),
      sku: String(req.body?.sku || '').trim()
    });
    return res.json({ ok: true, proxy });
  } catch (err) {
    logger.error('Engine proxy create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function assignProxy(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const assignment = await EngineProxyAssignment.create({
      proxyId: req.params.id,
      deviceId: req.body?.deviceId || null,
      accountId: req.body?.accountId || null,
      reason: String(req.body?.reason || '').trim()
    });
    await EngineProxy.findByIdAndUpdate(req.params.id, { status: 'assigned' });
    return res.json({ ok: true, assignment });
  } catch (err) {
    logger.error('Engine proxy assign failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function verifyProxyNow(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const proxy = await EngineProxy.findById(req.params.id);
    if (!proxy) throw new Error('Proxy not found');
    const result = await verifyProxy(proxy.endpoint);
    await EngineProxy.findByIdAndUpdate(proxy._id, {
      status: 'available',
      'health.lastVerifiedAt': new Date(),
      'health.lastFailureReason': '',
      'health.consecutiveFailures': 0,
      'metadata.effectiveIp': result.effectiveIp
    });
    return res.json({ ok: true, result });
  } catch (err) {
    logger.error('Engine proxy verify failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueProxyMonitor(req, res) {
  try {
    requireAdmin(req);
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.proxy',
      jobName: 'verify-batch',
      targetType: 'proxy',
      payload: {},
      idempotencyKey: `proxy:verify:manual:${Date.now()}`
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine proxy monitor enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getFleetSummary(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const [devices, accounts, posts, proxies] = await Promise.all([
      EngineDevice.countDocuments({}),
      EngineAccount.countDocuments({}),
      EnginePost.countDocuments({ status: { $in: ['queued', 'staging', 'posting'] } }),
      EngineProxy.countDocuments({ status: { $ne: 'retired' } })
    ]);
    return res.json({ ok: true, summary: { devices, accounts, activePosts: posts, proxies } });
  } catch (err) {
    logger.error('Engine fleet summary failed', err);
    return sendError(res, err, 'Internal error');
  }
}

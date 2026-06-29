import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDjekxaOrder, EngineExpense } from '@julio/api/models/engine-finance';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';
import { DjekxaClient } from '@julio/integrations';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

export async function listExpenses(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const expenses = await EngineExpense.find({}).sort({ incurredAt: -1 }).lean();
    return res.json({ ok: true, expenses });
  } catch (err) {
    logger.error('Engine expenses fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createExpense(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const expense = await EngineExpense.create({
      category: String(req.body?.category || '').trim(),
      provider: String(req.body?.provider || '').trim(),
      amountCents: Number(req.body?.amountCents || 0),
      currency: String(req.body?.currency || 'USD').trim(),
      description: String(req.body?.description || '').trim(),
      externalReference: String(req.body?.externalReference || '').trim(),
      incurredAt: req.body?.incurredAt ? new Date(req.body.incurredAt) : new Date()
    });
    return res.json({ ok: true, expense });
  } catch (err) {
    logger.error('Engine expense create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listDjekxaOrders(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const orders = await EngineDjekxaOrder.find({}).sort({ orderedAt: -1 }).lean();
    return res.json({ ok: true, orders });
  } catch (err) {
    logger.error('Engine Djekxa orders fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueDjekxaImport(req, res) {
  try {
    requireAdmin(req);
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.procurement',
      jobName: 'djekxa-import',
      targetType: 'djekxa',
      payload: { platform: req.body?.platform || req.query?.platform || '' }
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine Djekxa import enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

function getDjekxaClient() {
  return new DjekxaClient({
    apiKey: env.djekxaApiKey,
    baseUrl: env.djekxaBaseUrl || 'https://djekxa.ru/api/v2'
  });
}

export async function getDjekxaBalance(req, res) {
  try {
    requireAdmin(req);
    // Djekxa is an optional integration; when no API key is configured, report
    // an unconfigured balance instead of a 500 so the operator console stays clean.
    if (!env.djekxaApiKey) {
      return res.json({ ok: true, balance: null, configured: false });
    }
    const balance = await getDjekxaClient().getBalance();
    return res.json({ ok: true, balance, configured: true });
  } catch (err) {
    logger.error('Engine Djekxa balance fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listDjekxaProducts(req, res) {
  try {
    requireAdmin(req);
    const products = await getDjekxaClient().listProducts({
      page: req.query?.page || 1,
      per_page: req.query?.perPage || 50,
      category_id: req.query?.categoryId || '',
      only_in_stock: req.query?.onlyInStock ?? 1
    });
    return res.json({ ok: true, products });
  } catch (err) {
    logger.error('Engine Djekxa products fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueDjekxaOrder(req, res) {
  try {
    requireAdmin(req);
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.procurement',
      jobName: 'djekxa-order',
      targetType: 'djekxa',
      payload: {
        productId: req.body?.productId,
        quantity: Number(req.body?.quantity || 1),
        expectedPriceRub: req.body?.expectedPriceRub,
        maxTotalRub: req.body?.maxTotalRub
      },
      idempotencyKey: `djekxa:order:${req.body?.productId}:${req.body?.quantity || 1}:${Date.now()}`
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine Djekxa order enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

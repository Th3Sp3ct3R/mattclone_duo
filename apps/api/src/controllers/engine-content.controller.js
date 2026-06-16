import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineNiche, EngineContentPoolItem } from '@julio/api/models/engine-niche';
import {
  EngineClip,
  EngineSourceMedia,
  EngineTranscript,
  EngineTransform,
  EngineRoutingRule
} from '@julio/api/models/engine-pipeline';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

export async function listNiches(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const niches = await EngineNiche.find({}).sort({ key: 1 }).lean();
    return res.json({ ok: true, niches });
  } catch (err) {
    logger.error('Engine niches fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createNiche(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const niche = await EngineNiche.create({
      key: String(req.body?.key || '').trim(),
      name: String(req.body?.name || '').trim(),
      description: String(req.body?.description || '').trim(),
      active: req.body?.active !== false,
      targetPlatforms: Array.isArray(req.body?.targetPlatforms) ? req.body.targetPlatforms : []
    });
    return res.json({ ok: true, niche });
  } catch (err) {
    logger.error('Engine niche create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listContentPool(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const filter = req.query?.status ? { status: req.query.status } : {};
    const items = await EngineContentPoolItem.find(filter).sort({ score: -1, createdAt: -1 }).lean();
    return res.json({ ok: true, items });
  } catch (err) {
    logger.error('Engine content pool fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateContentPoolItem(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const item = await EngineContentPoolItem.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    return res.json({ ok: true, item });
  } catch (err) {
    logger.error('Engine content pool update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueContentPoolDownload(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const item = await EngineContentPoolItem.findById(req.params.id).lean();
    if (!item) throw new Error('Content pool item not found');
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.pipeline',
      jobName: 'download',
      targetType: 'contentPoolItem',
      targetId: item._id,
      payload: { contentPoolItemId: String(item._id), platform: item.platform },
      idempotencyKey: `content-pool:download:${item._id}`
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine content pool download enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listSourceMedia(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const media = await EngineSourceMedia.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, media });
  } catch (err) {
    logger.error('Engine source media fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listTranscripts(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const transcripts = await EngineTranscript.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ ok: true, transcripts });
  } catch (err) {
    logger.error('Engine transcripts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listClips(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const clips = await EngineClip.find({}).sort({ viralScore: -1, createdAt: -1 }).limit(100).lean();
    return res.json({ ok: true, clips });
  } catch (err) {
    logger.error('Engine clips fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function ingestSourceMedia(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const media = await EngineSourceMedia.create({
      originalUrl: String(req.body?.originalUrl || req.body?.url || '').trim(),
      publicUrl: String(req.body?.publicUrl || '').trim(),
      mimeType: String(req.body?.mimeType || '').trim()
    });
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.pipeline',
      jobName: 'ingest',
      targetType: 'sourceMedia',
      targetId: media._id,
      payload: { sourceMediaId: String(media._id) }
    });
    return res.json({ ok: true, media, jobRun });
  } catch (err) {
    logger.error('Engine media ingest failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listTransforms(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const transforms = await EngineTransform.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, transforms });
  } catch (err) {
    logger.error('Engine transforms fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createTransform(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const transform = await EngineTransform.create({
      sourceMediaId: req.body?.sourceMediaId,
      recipe: req.body?.recipe || {}
    });
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.transform',
      jobName: 'process',
      targetType: 'transform',
      targetId: transform._id,
      payload: { transformId: String(transform._id) }
    });
    return res.json({ ok: true, transform, jobRun });
  } catch (err) {
    logger.error('Engine transform create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listRoutingRules(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const rules = await EngineRoutingRule.find({}).sort({ updatedAt: -1 }).lean();
    return res.json({ ok: true, rules });
  } catch (err) {
    logger.error('Engine routing rules fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createRoutingRule(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const rule = await EngineRoutingRule.create(req.body || {});
    return res.json({ ok: true, rule });
  } catch (err) {
    logger.error('Engine routing rule create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

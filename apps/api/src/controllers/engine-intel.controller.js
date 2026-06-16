import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import {
  EngineSocialPost,
  EngineSocialProfile,
  EngineSocialScore
} from '@julio/api/models/engine-social';
import { EngineTrend, EngineTrendMatch } from '@julio/api/models/engine-trend';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

export async function listSocialProfiles(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const profiles = await EngineSocialProfile.find({}).sort({ scrapedAt: -1 }).limit(100).lean();
    return res.json({ ok: true, profiles });
  } catch (err) {
    logger.error('Engine social profiles fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listSocialPosts(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const posts = await EngineSocialPost.find({}).sort({ scrapedAt: -1 }).limit(100).lean();
    return res.json({ ok: true, posts });
  } catch (err) {
    logger.error('Engine social posts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listSocialScores(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const scores = await EngineSocialScore.find({}).sort({ scoredAt: -1 }).limit(100).lean();
    return res.json({ ok: true, scores });
  } catch (err) {
    logger.error('Engine social scores fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listTrends(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const trends = await EngineTrend.find({}).sort({ observedAt: -1 }).limit(100).lean();
    return res.json({ ok: true, trends });
  } catch (err) {
    logger.error('Engine trends fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listTrendMatches(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const matches = await EngineTrendMatch.find({}).sort({ score: -1, updatedAt: -1 }).limit(100).lean();
    return res.json({ ok: true, matches });
  } catch (err) {
    logger.error('Engine trend matches fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueSocialScrape(req, res) {
  try {
    requireAdmin(req);
    const payload = {
      platform: req.body?.platform || req.query?.platform || 'tiktok',
      handle: req.body?.handle || req.query?.handle || '',
      url: req.body?.url || req.query?.url || ''
    };
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.scrape',
      jobName: 'scrape',
      targetType: 'social',
      payload,
      idempotencyKey: `social:scrape:${payload.platform}:${payload.handle || payload.url}:${Date.now()}`
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine scrape enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueTrend(req, res) {
  try {
    requireAdmin(req);
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.trend',
      jobName: req.body?.action === 'feedback' ? 'feedback' : req.body?.action === 'match' ? 'match' : 'upsert',
      targetType: 'trend',
      payload: req.body || {},
      idempotencyKey: `trend:${req.body?.action || 'upsert'}:${req.body?.title || Date.now()}`
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine trend enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

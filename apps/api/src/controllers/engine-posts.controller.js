import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EnginePost } from '@julio/api/models/engine-post';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function sanitizePost(payload = {}) {
  return {
    platform: String(payload.platform || '').trim(),
    postType: String(payload.postType || payload.type || '').trim(),
    accountId: payload.accountId,
    deviceId: payload.deviceId || null,
    contentPoolItemId: payload.contentPoolItemId || null,
    status: String(payload.status || 'queued').trim(),
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    media: {
      sourceUrl: String(payload.sourceUrl || payload.media?.sourceUrl || '').trim(),
      storageKey: String(payload.storageKey || payload.media?.storageKey || '').trim(),
      publicUrl: String(payload.publicUrl || payload.media?.publicUrl || '').trim(),
      mimeType: String(payload.mimeType || payload.media?.mimeType || '').trim()
    },
    publishOptions: {
      caption: String(payload.caption || payload.publishOptions?.caption || '').trim(),
      hashtags: Array.isArray(payload.hashtags || payload.publishOptions?.hashtags)
        ? (payload.hashtags || payload.publishOptions.hashtags).map(String).filter(Boolean)
        : [],
      soundQuery: String(payload.soundQuery || payload.publishOptions?.soundQuery || '').trim(),
      locationQuery: String(payload.locationQuery || payload.publishOptions?.locationQuery || '').trim(),
      coverFrameIndex: payload.coverFrameIndex ?? payload.publishOptions?.coverFrameIndex ?? null
    },
    vmosTaskId: String(payload.vmosTaskId || '').trim(),
    stagedDevicePath: String(payload.stagedDevicePath || '').trim()
  };
}

export async function listPosts(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const filter = {};
    if (req.query?.platform) filter.platform = req.query.platform;
    if (req.query?.status) filter.status = req.query.status;
    const posts = await EnginePost.find(filter).sort({ scheduledAt: 1, createdAt: -1 }).lean();
    return res.json({ ok: true, posts });
  } catch (err) {
    logger.error('Engine posts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createPost(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const payload = sanitizePost(req.body || {});
    if (!payload.platform || !payload.accountId || !payload.media.sourceUrl) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'platform, accountId, and sourceUrl are required' });
    }
    const post = await EnginePost.create(payload);
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.post',
      jobName: 'publish',
      targetType: 'post',
      targetId: post._id,
      payload: {
        postId: String(post._id),
        platform: post.platform,
        accountId: String(post.accountId),
        deviceId: post.deviceId ? String(post.deviceId) : null
      }
    });
    return res.json({ ok: true, post, jobRun });
  } catch (err) {
    logger.error('Engine post create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updatePost(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const post = await EnginePost.findByIdAndUpdate(req.params.id, sanitizePost(req.body || {}), {
      new: true
    });
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    return res.json({ ok: true, post });
  } catch (err) {
    logger.error('Engine post update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueuePostAction(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const post = await EnginePost.findById(req.params.id);
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    const action = String(req.params.action || '').trim();
    if (!['publish', 'retry', 'cancel'].includes(action)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Unsupported post action' });
    }
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.post',
      jobName: action,
      targetType: 'post',
      targetId: post._id,
      payload: {
        postId: String(post._id),
        platform: post.platform,
        accountId: String(post.accountId),
        deviceId: post.deviceId ? String(post.deviceId) : null
      }
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine post action enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

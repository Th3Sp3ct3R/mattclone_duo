import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineJobRun } from '@julio/api/models/engine-job-run';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

export async function listJobRuns(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const filter = {};
    if (req.query?.queueName) filter.queueName = req.query.queueName;
    if (req.query?.status) filter.status = req.query.status;
    if (req.query?.targetType) filter.targetType = req.query.targetType;
    if (req.query?.targetId) filter.targetId = req.query.targetId;

    const jobRuns = await EngineJobRun.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    return res.json({ ok: true, jobRuns });
  } catch (err) {
    logger.error('Engine job runs fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

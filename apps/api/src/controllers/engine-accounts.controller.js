import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineAccount } from '@julio/api/models/engine-account';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function sanitizeAccount(payload = {}) {
  return {
    platform: String(payload.platform || '').trim(),
    status: String(payload.status || 'new').trim(),
    credentials: {
      username: String(payload.username || payload.credentials?.username || '').trim(),
      password: String(payload.password || payload.credentials?.password || '').trim(),
      email: String(payload.email || payload.credentials?.email || '').trim().toLowerCase(),
      emailPassword: String(payload.emailPassword || payload.credentials?.emailPassword || '').trim()
    },
    profile: {
      displayName: String(payload.displayName || payload.profile?.displayName || '').trim(),
      bio: String(payload.bio || payload.profile?.bio || '').trim(),
      avatarUrl: String(payload.avatarUrl || payload.profile?.avatarUrl || '').trim(),
      nicheKey: String(payload.nicheKey || payload.profile?.nicheKey || '').trim(),
      personaKey: String(payload.personaKey || payload.profile?.personaKey || '').trim()
    },
    assignedDeviceId: payload.assignedDeviceId || null,
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : []
  };
}

export async function listAccounts(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const filter = req.query?.platform ? { platform: req.query.platform } : {};
    const accounts = await EngineAccount.find(filter).sort({ updatedAt: -1 }).lean();
    return res.json({ ok: true, accounts });
  } catch (err) {
    logger.error('Engine accounts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createAccount(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const payload = sanitizeAccount(req.body || {});
    if (!payload.platform || !payload.credentials.username) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'platform and username are required' });
    }
    const account = await EngineAccount.create(payload);
    return res.json({ ok: true, account });
  } catch (err) {
    logger.error('Engine account create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateAccount(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const account = await EngineAccount.findByIdAndUpdate(req.params.id, sanitizeAccount(req.body || {}), {
      new: true
    });
    if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
    return res.json({ ok: true, account });
  } catch (err) {
    logger.error('Engine account update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueAccountAction(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const account = await EngineAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
    const action = String(req.params.action || '').trim();
    const allowed = ['login', 'profile-setup', 'warmup', 'health-check'];
    if (!allowed.includes(action)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Unsupported account action' });
    }
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.account',
      jobName: action,
      targetType: 'account',
      targetId: account._id,
      payload: {
        accountId: String(account._id),
        platform: account.platform,
        assignedDeviceId: account.assignedDeviceId ? String(account.assignedDeviceId) : null
      }
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine account action enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

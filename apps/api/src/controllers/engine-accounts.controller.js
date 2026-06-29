import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { enqueueAccountOnboarding as enqueueAccountOnboardingWorkflow } from '@julio/api/services/account-onboarding';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { findAccountDevicePlatformConflict } from '@julio/api/utils/account-device-platform';
import { canDeviceAcceptAccount } from '@julio/api/utils/device-account-eligibility';
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

async function findAssignedPlatformConflict({ platform, assignedDeviceId, accountId = null }) {
  if (!platform || !assignedDeviceId) return null;
  const accounts = await EngineAccount.find({
    platform,
    assignedDeviceId,
    retiredAt: null
  })
    .select('_id platform assignedDeviceId retiredAt credentials.username')
    .lean();
  return findAccountDevicePlatformConflict(accounts, { platform, assignedDeviceId, accountId });
}

function accountPlatformConflictResponse(res, conflict, platform) {
  const username = conflict?.credentials?.username || 'another account';
  return res.status(409).json({
    code: 'DEVICE_PLATFORM_ACCOUNT_EXISTS',
    message: `Device already has ${username} assigned for ${platform}; unassign it before assigning another ${platform} account.`
  });
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
    if (payload.assignedDeviceId) {
      const device = await EngineDevice.findOne({ _id: payload.assignedDeviceId, retiredAt: null })
        .select('_id provider providerDeviceId name providerMeta')
        .lean();
      if (!device) return res.status(404).json({ code: 'NOT_FOUND', message: 'Device not found' });
      const eligibility = canDeviceAcceptAccount(device);
      if (!eligibility.ok) {
        return res.status(eligibility.status).json({ code: eligibility.code, message: eligibility.message });
      }
      payload.assignedDeviceId = device._id;
      const conflict = await findAssignedPlatformConflict({
        platform: payload.platform,
        assignedDeviceId: device._id
      });
      if (conflict) return accountPlatformConflictResponse(res, conflict, payload.platform);
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

export async function assignDevice(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const deviceId = req.body?.deviceId || req.body?.assignedDeviceId;
    if (!deviceId) return res.status(400).json({ code: 'BAD_REQUEST', message: 'deviceId is required' });

    const device = await EngineDevice.findOne({ _id: deviceId, retiredAt: null })
      .select('_id provider providerDeviceId name providerMeta')
      .lean();
    if (!device) return res.status(404).json({ code: 'NOT_FOUND', message: 'Device not found' });
    const eligibility = canDeviceAcceptAccount(device);
    if (!eligibility.ok) {
      return res.status(eligibility.status).json({ code: eligibility.code, message: eligibility.message });
    }
    const existingAccount = await EngineAccount.findById(req.params.id).select('_id platform').lean();
    if (!existingAccount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
    const conflict = await findAssignedPlatformConflict({
      platform: existingAccount.platform,
      assignedDeviceId: device._id,
      accountId: existingAccount._id
    });
    if (conflict) return accountPlatformConflictResponse(res, conflict, existingAccount.platform);

    const account = await EngineAccount.findByIdAndUpdate(
      req.params.id,
      { $set: { assignedDeviceId: device._id } },
      { new: true }
    );
    if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
    return res.json({ ok: true, account });
  } catch (err) {
    logger.error('Engine account device assignment failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function unassignDevice(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const account = await EngineAccount.findByIdAndUpdate(
      req.params.id,
      { $set: { assignedDeviceId: null } },
      { new: true }
    );
    if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
    return res.json({ ok: true, account });
  } catch (err) {
    logger.error('Engine account device unassignment failed', err);
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

export async function enqueueAccountOnboarding(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const result = await enqueueAccountOnboardingWorkflow({
      accountId: req.params.id,
      warmup: Boolean(req.body?.warmup),
      post: req.body?.post || null,
      onboardingKey: req.body?.onboardingKey || req.body?.idempotencyKey || ''
    });
    return res.json(result);
  } catch (err) {
    logger.error('Engine account onboarding enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

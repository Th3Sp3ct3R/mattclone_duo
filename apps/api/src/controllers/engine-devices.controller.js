import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDevice } from '@julio/api/models/engine-device';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function sanitizeDevice(payload = {}) {
  const device = {
    provider: 'vmos',
    providerDeviceId: String(payload.providerDeviceId || '').trim(),
    name: String(payload.name || '').trim(),
    status: String(payload.status || 'stopped').trim(),
    region: String(payload.region || '').trim(),
    groupName: String(payload.groupName || '').trim(),
    notes: String(payload.notes || '').trim()
  };
  if (payload.runtime) {
    device.runtime = {
      adbAddress: String(payload.runtime.adbAddress || '').trim(),
      adbPassword: String(payload.runtime.adbPassword || '').trim(),
      screenWidth: Number(payload.runtime.screenWidth || 720),
      screenHeight: Number(payload.runtime.screenHeight || 1280),
      lastScreenshotUrl: String(payload.runtime.lastScreenshotUrl || '').trim()
    };
  }
  return device;
}

export async function listDevices(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const devices = await EngineDevice.find({}).sort({ updatedAt: -1 }).lean();
    return res.json({ ok: true, devices });
  } catch (err) {
    logger.error('Engine devices fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createDevice(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const payload = sanitizeDevice(req.body || {});
    if (!payload.providerDeviceId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'providerDeviceId is required' });
    }
    const device = await EngineDevice.create(payload);
    return res.json({ ok: true, device });
  } catch (err) {
    logger.error('Engine device create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateDevice(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const device = await EngineDevice.findByIdAndUpdate(req.params.id, sanitizeDevice(req.body || {}), {
      new: true
    });
    if (!device) return res.status(404).json({ code: 'NOT_FOUND', message: 'Device not found' });
    return res.json({ ok: true, device });
  } catch (err) {
    logger.error('Engine device update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function enqueueDeviceAction(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const device = await EngineDevice.findById(req.params.id);
    if (!device) return res.status(404).json({ code: 'NOT_FOUND', message: 'Device not found' });
    const action = String(req.params.action || '').trim();
    const allowed = ['start', 'stop', 'provision', 'screenshot', 'health-check'];
    if (!allowed.includes(action)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Unsupported device action' });
    }
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.device',
      jobName: action,
      targetType: 'device',
      targetId: device._id,
      payload: { deviceId: String(device._id), providerDeviceId: device.providerDeviceId }
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine device action enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

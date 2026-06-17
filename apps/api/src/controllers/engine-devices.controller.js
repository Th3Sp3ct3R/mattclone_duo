import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDevice } from '@julio/api/models/engine-device';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { createCloudPhoneProvider } from '@julio/device-control';
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

function listFromVmosResponse(response = {}) {
  const data = response.data || response;
  if (Array.isArray(data)) return data;
  return data.list || data.records || data.rows || data.items || [];
}

function nextVmosLastId(response = {}) {
  const data = response.data || {};
  return data.lastId || data.nextLastId || data.nextId || response.lastId || null;
}

function valueFromPad(pad = {}, keys = []) {
  for (const key of keys) {
    if (pad[key] !== undefined && pad[key] !== null && String(pad[key]).trim()) return String(pad[key]).trim();
  }
  return '';
}

function isPadOnline(pad = {}) {
  const rawOnline = pad.online ?? pad.isOnline ?? pad.onlineStatus ?? pad.status ?? pad.padStatus;
  const value = String(rawOnline ?? '').toLowerCase();
  return (
    rawOnline === true ||
    rawOnline === 1 ||
    rawOnline === 10 ||
    value === '1' ||
    value === '10' ||
    value === 'true' ||
    value.includes('online') ||
    value.includes('running')
  );
}

function normalizeVmosPad(pad = {}) {
  const providerDeviceId = valueFromPad(pad, ['padCode', 'pad_code', 'providerDeviceId', 'deviceCode', 'code', 'id']);
  if (!providerDeviceId) return null;
  return {
    providerDeviceId,
    name: valueFromPad(pad, ['padName', 'pad_name', 'name', 'deviceName', 'alias']) || providerDeviceId,
    status: isPadOnline(pad) ? 'running' : 'stopped',
    region: valueFromPad(pad, ['region', 'regionName', 'country', 'area']),
    groupName: valueFromPad(pad, ['groupName', 'group_name', 'group'])
  };
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

export async function syncDevices(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const provider = createCloudPhoneProvider({
      type: env.cloudProvider || 'vmos',
      accessKey: env.vmosAccessKey,
      secretKey: env.vmosSecretKey,
      baseUrl: env.vmosApiBaseUrl
    });
    const rows = Number(req.body?.rows || 100);
    let lastId = req.body?.lastId || null;
    let synced = 0;
    let created = 0;
    let updated = 0;
    let pageCount = 0;

    do {
      const response = await provider.client.listInstances({ rows, lastId });
      const pads = listFromVmosResponse(response).map(normalizeVmosPad).filter(Boolean);
      for (const pad of pads) {
        const existing = await EngineDevice.findOne({
          provider: 'vmos',
          providerDeviceId: pad.providerDeviceId
        }).select('_id');

        if (existing) {
          await EngineDevice.updateOne(
            { _id: existing._id },
            {
              $set: {
                name: pad.name,
                status: pad.status,
                region: pad.region,
                groupName: pad.groupName,
                'runtime.lastHeartbeatAt': new Date()
              }
            }
          );
          updated += 1;
        } else {
          await EngineDevice.create({
            provider: 'vmos',
            providerDeviceId: pad.providerDeviceId,
            name: pad.name,
            status: pad.status,
            region: pad.region,
            groupName: pad.groupName,
            runtime: { lastHeartbeatAt: new Date() }
          });
          created += 1;
        }
        synced += 1;
      }

      lastId = nextVmosLastId(response);
      pageCount += 1;
      if (!pads.length || pageCount >= 20) lastId = null;
    } while (lastId);

    return res.json({ ok: true, synced, created, updated });
  } catch (err) {
    logger.error('Engine device VMOS sync failed', err);
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

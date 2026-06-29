import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDevice, PROVIDERS } from '@julio/api/models/engine-device';
import { EngineDeviceEvent } from '@julio/api/models/engine-device-event';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import {
  createCloudPhoneProvider,
  duoPlusStatusToEngineStatus,
  listFromDuoPlusResponse,
  normalizeDuoPlusPhone
} from '@julio/device-control';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import {
  DUOPLUS_QUALITY_PRESETS,
  buildDuoPlusControlUrl,
  resolveFocusQuality
} from '@julio/api/utils/duoplus-focus';
import { createDuoplusInternalClient } from '@julio/api/utils/duoplus-session';
import { publicProxy } from '@julio/api/utils/proxy-public';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function sanitizeDevice(payload = {}) {
  const provider = String(payload.provider || payload.providerType || 'vmos').trim();
  if (!PROVIDERS.includes(provider)) {
    const err = new Error(`Unsupported provider: ${provider}`);
    err.status = 400;
    err.payload = { code: 'BAD_REQUEST', message: `Unsupported provider: ${provider}` };
    throw err;
  }
  const device = {
    provider,
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
      adbPassword: provider === 'duoplus' ? '' : String(payload.runtime.adbPassword || '').trim(),
      screenWidth: Number(payload.runtime.screenWidth || 720),
      screenHeight: Number(payload.runtime.screenHeight || 1280),
      lastScreenshotUrl: String(payload.runtime.lastScreenshotUrl || '').trim()
    };
  }
  if (payload.providerMeta) {
    device.providerMeta = {
      rawStatus: payload.providerMeta.rawStatus ?? null,
      os: String(payload.providerMeta.os || '').trim(),
      ip: String(payload.providerMeta.ip || '').trim(),
      proxyId: String(payload.providerMeta.proxyId || '').trim(),
      proxyIp: String(payload.providerMeta.proxyIp || '').trim(),
      proxyConfigured: Boolean(payload.providerMeta.proxyConfigured),
      expiredAt: String(payload.providerMeta.expiredAt || '').trim()
    };
  }
  return device;
}

function publicDevice(device = {}) {
  const plain = typeof device.toObject === 'function' ? device.toObject() : { ...device };
  if (plain.runtime) {
    plain.runtime = { ...plain.runtime };
    delete plain.runtime.adbPassword;
  }
  return plain;
}

function publicDeviceEvent(event = null) {
  if (!event) return null;
  return {
    id: event._id ? String(event._id) : event.id || '',
    level: event.level || 'info',
    source: event.source || 'system',
    jobRunId: event.jobRunId ? String(event.jobRunId) : null,
    jobName: event.jobName || '',
    message: event.message || '',
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null
  };
}

function createProviderForType(type = env.cloudProvider || 'vmos') {
  if (type === 'duoplus') {
    return createCloudPhoneProvider({
      type: 'duoplus',
      apiKey: env.duoplusApiKey,
      baseUrl: env.duoplusApiBaseUrl,
      minDelayMs: env.duoplusMinDelayMs
    });
  }
  return createCloudPhoneProvider({
    type: 'vmos',
    accessKey: env.vmosAccessKey,
    secretKey: env.vmosSecretKey,
    baseUrl: env.vmosApiBaseUrl
  });
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

async function findDeviceOr404(id) {
  const device = await EngineDevice.findById(id);
  if (!device) {
    const err = new Error('Device not found');
    err.status = 404;
    err.payload = { code: 'NOT_FOUND', message: 'Device not found' };
    throw err;
  }
  return device;
}


async function refreshDuoPlusDeviceStatus(device) {
  const provider = createProviderForType('duoplus');
  const response = await provider.client.getPhoneStatus([device.providerDeviceId]);
  const statusRow = listFromDuoPlusResponse(response).find(
    (entry) => String(entry.id || entry.image_id || '') === String(device.providerDeviceId)
  );
  if (!statusRow) return { response, statusRow: null, engineStatus: device.status };
  const engineStatus = duoPlusStatusToEngineStatus(statusRow.status);
  await EngineDevice.findByIdAndUpdate(device._id, {
    status: engineStatus,
    'providerMeta.rawStatus': Number(statusRow.status),
    'runtime.lastHeartbeatAt': new Date()
  });
  return { response, statusRow, engineStatus };
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
    const deviceIds = devices.map((device) => device._id);
    const [latestEvents, assignments] = await Promise.all([
      EngineDeviceEvent.aggregate([
        { $match: { deviceId: { $in: deviceIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$deviceId', event: { $first: '$$ROOT' } } }
      ]),
      EngineProxyAssignment.find({
        deviceId: { $in: deviceIds },
        deactivatedAt: null
      }).lean()
    ]);
    const latestEventByDevice = new Map(
      latestEvents.map((entry) => [String(entry._id), publicDeviceEvent(entry.event)])
    );
    const proxyIds = assignments.map((assignment) => assignment.proxyId).filter(Boolean);
    const proxies = proxyIds.length ? await EngineProxy.find({ _id: { $in: proxyIds } }).lean() : [];
    const proxyById = new Map(proxies.map((proxy) => [String(proxy._id), publicProxy(proxy)]));
    const assignmentByDevice = new Map(
      assignments.map((assignment) => [
        String(assignment.deviceId),
        {
          id: String(assignment._id),
          assignedAt: assignment.assignedAt ? new Date(assignment.assignedAt).toISOString() : null,
          reason: assignment.reason || '',
          proxy: proxyById.get(String(assignment.proxyId)) || null
        }
      ])
    );
    return res.json({
      ok: true,
      devices: devices.map((device) => ({
        ...publicDevice(device),
        latestEvent: latestEventByDevice.get(String(device._id)) || null,
        activeProxyAssignment: assignmentByDevice.get(String(device._id)) || null
      }))
    });
  } catch (err) {
    logger.error('Engine devices fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

async function syncDuoPlusDevices({ rows = 100 } = {}) {
  const provider = createProviderForType('duoplus');
  let synced = 0;
  let created = 0;
  let updated = 0;
  let page = 1;
  const pagesize = Math.min(Math.max(Number(rows || 100), 1), 100);

  while (page <= 20) {
    const response = await provider.client.listCloudPhones({ page, pagesize });
    const phones = listFromDuoPlusResponse(response).map(normalizeDuoPlusPhone).filter(Boolean);
    for (const phone of phones) {
      const existing = await EngineDevice.findOne({
        provider: 'duoplus',
        providerDeviceId: phone.providerDeviceId
      }).select('_id');

      const update = {
        name: phone.name,
        status: phone.status,
        region: phone.region,
        groupName: phone.groupName,
        notes: phone.notes,
        providerMeta: phone.providerMeta,
        'runtime.adbAddress': phone.runtime.adbAddress,
        'runtime.adbPassword': '',
        'runtime.lastHeartbeatAt': new Date()
      };

      if (existing) {
        await EngineDevice.updateOne({ _id: existing._id }, { $set: update });
        updated += 1;
      } else {
        await EngineDevice.create({
          provider: 'duoplus',
          providerDeviceId: phone.providerDeviceId,
          name: phone.name,
          status: phone.status,
          region: phone.region,
          groupName: phone.groupName,
          notes: phone.notes,
          runtime: phone.runtime,
          providerMeta: phone.providerMeta
        });
        created += 1;
      }
      synced += 1;
    }
    if (phones.length < pagesize) break;
    page += 1;
  }

  return { synced, created, updated };
}

export async function syncDevices(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const providerType = String(req.body?.provider || env.cloudProvider || 'vmos').trim();
    if (!PROVIDERS.includes(providerType)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Unsupported provider' });
    }
    if (providerType === 'duoplus') {
      const result = await syncDuoPlusDevices({ rows: req.body?.rows || 100 });
      return res.json({ ok: true, provider: 'duoplus', ...result });
    }

    const provider = createProviderForType('vmos');
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

    return res.json({ ok: true, provider: 'vmos', synced, created, updated });
  } catch (err) {
    logger.error('Engine device sync failed', err);
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
    return res.json({ ok: true, device: publicDevice(device) });
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
    return res.json({ ok: true, device: publicDevice(device) });
  } catch (err) {
    logger.error('Engine device update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getDeviceStatus(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const device = await findDeviceOr404(req.params.id);

    if (device.provider === 'duoplus') {
      const result = await refreshDuoPlusDeviceStatus(device);
      const updated = await EngineDevice.findById(device._id).lean();
      return res.json({
        ok: true,
        provider: 'duoplus',
        status: result.statusRow || null,
        engineStatus: result.engineStatus,
        device: publicDevice(updated || device)
      });
    }

    const provider = createProviderForType('vmos');
    const instance = await provider.describeInstance(device.providerDeviceId);
    return res.json({ ok: true, provider: 'vmos', status: instance || null, device: publicDevice(device) });
  } catch (err) {
    logger.error('Engine device status fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getDeviceFocus(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const device = await findDeviceOr404(req.params.id);
    if (device.provider !== 'duoplus') {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Focus fallback is only available for DuoPlus devices' });
    }

    const status = await refreshDuoPlusDeviceStatus(device).catch((err) => ({
      error: err?.message || 'Status refresh failed'
    }));
    const updated = await EngineDevice.findById(device._id).lean();
    const publicUpdated = publicDevice(updated || device);

    const quality = resolveFocusQuality({
      width: req.query?.w ?? publicUpdated.runtime?.screenWidth,
      height: req.query?.h ?? publicUpdated.runtime?.screenHeight,
      bitrate: req.query?.bitrate,
      fps: req.query?.fps,
      clarity: req.query?.clarity
    });
    const controlUrl = buildDuoPlusControlUrl(publicUpdated, quality);
    const liveStreamAvailable = Boolean(env.duoplusFocusStreamEnabled) && Boolean(controlUrl);

    return res.json({
      ok: true,
      device: publicUpdated,
      status: status.statusRow || null,
      focus: {
        // 'live' embeds the DuoPlus control page (ARMVM/veRTC) in an iframe;
        // 'fallback' shows the latest ADB screenshot. Toggle via DUOPLUS_FOCUS_STREAM_ENABLED.
        mode: liveStreamAvailable ? 'live' : 'fallback',
        liveStreamAvailable,
        streamFeatureFlagEnabled: env.duoplusFocusStreamEnabled,
        controlUrl,
        externalUrl: controlUrl,
        quality,
        qualityPresets: DUOPLUS_QUALITY_PRESETS,
        screenshotUrl: publicUpdated.runtime?.lastScreenshotUrl || '',
        message: liveStreamAvailable
          ? 'Live control via DuoPlus ARMVM/veRTC. Requires an active DuoPlus session in this browser.'
          : 'Live stream disabled. Set DUOPLUS_FOCUS_STREAM_ENABLED=true to embed the DuoPlus control surface.'
      }
    });
  } catch (err) {
    logger.error('Engine device focus fallback failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function initDuoPlusProxy(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const device = await findDeviceOr404(req.params.id);
    if (device.provider !== 'duoplus') {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Proxy init is only available for DuoPlus devices' });
    }
    if (req.body?.confirmProxyMutation !== true) {
      return res.status(409).json({
        code: 'CONFIRMATION_REQUIRED',
        message: 'Set confirmProxyMutation=true to initialize or reapply a DuoPlus proxy.'
      });
    }
    const proxy = req.body?.proxy || {};
    if (!proxy.id && (!proxy.host || !proxy.port)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'proxy.id or proxy.host/proxy.port is required' });
    }
    const provider = createProviderForType('duoplus');
    const result = await provider.setSmartIp(device.providerDeviceId, {
      ...proxy,
      ipScanChannel: req.body?.ipScanChannel || 'ipapi'
    });
    return res.json({ ok: true, result });
  } catch (err) {
    logger.error('Engine DuoPlus proxy init failed', err);
    return sendError(res, err, 'Internal error');
  }
}

// Live frames for the Focus Mode wall via DuoPlus's internal batchCapture2 — one
// call returns base64 JPEGs for all running phones (far cheaper than per-phone ADB
// screencap). Requires a captured browser session (DUOPLUS_SESSION_FILE); degrades
// gracefully (ok:false) so the wall falls back to ADB screenshots when absent/expired.
export async function getDuoPlusFrames(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    const idsParam = String(req.query?.ids || '').trim();
    let imageIds;
    if (idsParam) {
      imageIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      const running = await EngineDevice.find({ provider: 'duoplus', status: 'running', retiredAt: null })
        .select('providerDeviceId')
        .lean();
      imageIds = running.map((d) => d.providerDeviceId).filter(Boolean);
    }
    if (!imageIds.length) return res.json({ ok: true, frames: [], capturedAt: new Date().toISOString() });

    let client;
    try {
      client = createDuoplusInternalClient();
    } catch (err) {
      logger.warn(
        'DuoPlus live frames unavailable: no captured session. The duoplus-chrome profile likely needs a re-login.',
        { message: err.message }
      );
      return res.json({ ok: false, reason: 'no-session', message: err.message, frames: [] });
    }

    let frames;
    try {
      frames = await client.captureFrames(imageIds.slice(0, 20));
    } catch (err) {
      if (err?.code === 'DUOPLUS_SESSION_EXPIRED') {
        logger.warn('DuoPlus session expired — token refresh is failing. Re-login the duoplus-chrome profile.');
        return res.json({ ok: false, reason: 'expired', message: 'DuoPlus session expired; re-capture it.', frames: [] });
      }
      throw err;
    }

    return res.json({
      ok: true,
      capturedAt: new Date().toISOString(),
      frames: frames.map((f) => ({ imageId: f.imageId, dataUrl: f.dataUrl, linkStatus: f.linkStatus }))
    });
  } catch (err) {
    logger.error('Engine DuoPlus frames fetch failed', err);
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
    // Repeatable actions (live screenshot / health refresh) must NOT be permanently
    // deduped by the content-hash idempotency key, or a device would only ever capture
    // once. Bucket the key to ~5s so accidental double-clicks dedupe but periodic
    // polling produces fresh frames. start/stop/provision keep default content-hash dedupe.
    const REPEATABLE = new Set(['screenshot', 'health-check']);
    const idempotencyKey = REPEATABLE.has(action)
      ? `engine.device:${action}:${device._id}:${Math.floor(Date.now() / 5000)}`
      : '';
    const jobRun = await dispatchEngineJob({
      queueName: 'engine.device',
      jobName: action,
      targetType: 'device',
      targetId: device._id,
      payload: { deviceId: String(device._id), provider: device.provider, providerDeviceId: device.providerDeviceId },
      idempotencyKey
    });
    return res.json({ ok: true, jobRun });
  } catch (err) {
    logger.error('Engine device action enqueue failed', err);
    return sendError(res, err, 'Internal error');
  }
}

import mongoose from 'mongoose';

import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineCoordinateMap } from '@julio/api/models/engine-coordinate-map';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineDeviceEvent } from '@julio/api/models/engine-device-event';
import { logger } from '@julio/api/logger';
import { createCloudPhoneProvider } from '@julio/device-control';
import {
  detectInstagramScreen,
  normalizeCoordinate,
  safeUsername,
  sanitizeCommandData,
  summarizeUiDump
} from '@julio/api/utils/device-command-safety';
import { sendError } from '@julio/api/utils/response';

const INSTAGRAM_PACKAGE = 'com.instagram.android';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function publicCompatDevice(device = {}) {
  return {
    id: String(device._id || ''),
    deviceId: String(device.providerDeviceId || ''),
    name: device.name || String(device.providerDeviceId || ''),
    provider: device.provider || 'unknown',
    status: device.status || 'unknown',
    online: device.status === 'running',
    runtime: {
      screenWidth: device.runtime?.screenWidth || 720,
      screenHeight: device.runtime?.screenHeight || 1280,
      lastScreenshotUrl: device.runtime?.lastScreenshotUrl || '',
      lastHeartbeatAt: device.runtime?.lastHeartbeatAt || null
    },
    providerMeta: {
      proxyConfigured: Boolean(device.providerMeta?.proxyConfigured),
      subscriptionVerified: Boolean(device.providerMeta?.subscriptionVerified),
      subscriptionStatus: device.providerMeta?.subscriptionStatus || ''
    }
  };
}

function createProviderForDevice(device) {
  if (device.provider !== 'duoplus') {
    const err = new Error('Device-control compatibility is currently available for DuoPlus devices only');
    err.status = 400;
    err.payload = { code: 'BAD_REQUEST', message: err.message };
    throw err;
  }
  return createCloudPhoneProvider({
    type: 'duoplus',
    apiKey: env.duoplusApiKey,
    baseUrl: env.duoplusApiBaseUrl,
    minDelayMs: env.duoplusMinDelayMs
  });
}

async function findCompatDevice(id) {
  const candidates = [{ providerDeviceId: String(id || '') }, { name: String(id || '') }];
  if (mongoose.isValidObjectId(id)) candidates.unshift({ _id: id });
  const device = await EngineDevice.findOne({ $or: candidates, retiredAt: null });
  if (!device) {
    const err = new Error('Device not found');
    err.status = 404;
    err.payload = { code: 'NOT_FOUND', message: 'Device not found' };
    throw err;
  }
  return device;
}

async function recordDeviceEvent(device, message, data = {}, level = 'info') {
  return EngineDeviceEvent.create({
    deviceId: device._id,
    level,
    source: 'device',
    jobName: 'device-control-compat',
    message,
    data: sanitizeCommandData(data)
  }).catch((err) => logger.warn('Device-control event write failed', { message: err.message }));
}

async function makeProbe({ device, controller, screenshot = false } = {}) {
  const [packageName, uiXml, screenshotRef] = await Promise.all([
    controller.getCurrentPackage().catch(() => ''),
    controller.getUIDump().catch(() => ''),
    screenshot ? controller.screenshot().catch(() => '') : Promise.resolve('')
  ]);
  const uiSummary = summarizeUiDump(uiXml);
  const screen = detectInstagramScreen({ packageName, uiSummary });
  if (screenshotRef) {
    await EngineDevice.findByIdAndUpdate(device._id, {
      'runtime.lastScreenshotUrl': screenshotRef,
      'runtime.lastHeartbeatAt': new Date()
    });
  }
  return {
    packageName,
    screen,
    uiSummary,
    screenshotRef,
    observedAt: new Date().toISOString()
  };
}

async function saveCoordinateObservation({ device, action, coordinate, probe, params = {}, dryRun = true, resultState = 'observed' }) {
  const width = Number(params.width || device.runtime?.screenWidth || 720);
  const height = Number(params.height || device.runtime?.screenHeight || 1280);
  const coordinates = coordinate ? normalizeCoordinate({ ...coordinate, width, height }) : null;
  const doc = await EngineCoordinateMap.create({
    provider: device.provider,
    deviceId: device._id,
    providerDeviceId: device.providerDeviceId,
    action,
    screen: probe?.screen || 'unknown',
    appPackage: probe?.packageName || '',
    coordinateSetVersion: String(params.coordinateSetVersion || 'probe-v1'),
    coordinates,
    confidence: Number(params.confidence || 0),
    selectorHints: probe?.uiSummary?.textHints || [],
    screenshotRef: probe?.screenshotRef || '',
    resultState,
    dryRun,
    metadata: sanitizeCommandData({
      targetUsername: params.targetUsername || params.username || '',
      commandSource: params.commandSource || 'device-control-compat'
    })
  });
  return String(doc._id);
}

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data: sanitizeCommandData(data) });
}

export async function listCompatDevices(_req, res) {
  try {
    await ensureDb();
    const devices = await EngineDevice.find({ retiredAt: null }).sort({ updatedAt: -1 }).lean();
    return res.json({ devices: devices.map(publicCompatDevice) });
  } catch (err) {
    logger.error('Device-control list failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getCompatDeviceStatus(req, res) {
  try {
    await ensureDb();
    const device = await findCompatDevice(req.params.deviceId);
    return res.json({
      success: true,
      status: device.status === 'running' ? 'online' : device.status,
      device: publicCompatDevice(device)
    });
  } catch (err) {
    logger.error('Device-control status failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function openCompatDeviceApp(req, res) {
  try {
    await ensureDb();
    const device = await findCompatDevice(req.params.deviceId);
    const provider = createProviderForDevice(device);
    const controller = provider.createDirectController(device.providerDeviceId);
    const appName = String(req.body?.name || '').toLowerCase();
    if (req.body?.action !== 'open' || !['instagram', INSTAGRAM_PACKAGE].includes(appName)) {
      return res.status(400).json({ success: false, message: 'Only opening Instagram is supported' });
    }
    const foreground = await controller.startApp(INSTAGRAM_PACKAGE);
    const probe = await makeProbe({ device, controller, screenshot: true });
    await recordDeviceEvent(device, 'opened instagram app', { foreground, screen: probe.screen });
    return ok(res, foreground ? 'Instagram opened' : 'Instagram launch attempted', { foreground, ...probe });
  } catch (err) {
    logger.error('Device-control app open failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function tapCompatDevice(req, res) {
  try {
    await ensureDb();
    const device = await findCompatDevice(req.params.deviceId);
    const provider = createProviderForDevice(device);
    const controller = provider.createDirectController(device.providerDeviceId);
    const coordinate = { x: req.body?.x, y: req.body?.y };
    if (!Number.isFinite(Number(coordinate.x)) || !Number.isFinite(Number(coordinate.y))) {
      return res.status(400).json({ success: false, message: 'x and y numeric coordinates are required' });
    }
    const dryRun = req.body?.dryRun !== false || req.body?.confirmTap !== true;
    const before = await makeProbe({ device, controller, screenshot: Boolean(req.body?.captureScreenshot) });
    let resultState = 'dry_run';
    if (!dryRun) {
      await controller.tap(coordinate.x, coordinate.y);
      resultState = 'tapped';
    }
    const observationId = await saveCoordinateObservation({
      device,
      action: String(req.body?.action || 'tap'),
      coordinate,
      probe: before,
      params: req.body || {},
      dryRun,
      resultState
    });
    await recordDeviceEvent(device, dryRun ? 'tap probe recorded' : 'tap executed', { observationId, resultState });
    return ok(res, dryRun ? 'Tap probe recorded; no tap executed' : 'Tap executed', {
      dryRun,
      observationId,
      resultState,
      coordinate: normalizeCoordinate({
        ...coordinate,
        width: req.body?.width || device.runtime?.screenWidth,
        height: req.body?.height || device.runtime?.screenHeight
      }),
      before
    });
  } catch (err) {
    logger.error('Device-control tap failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function runCompatDeviceCommand(req, res) {
  try {
    await ensureDb();
    const device = await findCompatDevice(req.params.deviceId);
    const provider = createProviderForDevice(device);
    const controller = provider.createDirectController(device.providerDeviceId);
    const command = String(req.body?.command || '').trim();
    const params = req.body?.params || {};
    const dryRun = params.dryRun !== false;

    if (command === 'screenshot') {
      const screenshotRef = await controller.screenshot();
      await EngineDevice.findByIdAndUpdate(device._id, {
        'runtime.lastScreenshotUrl': screenshotRef,
        'runtime.lastHeartbeatAt': new Date()
      });
      await recordDeviceEvent(device, 'screenshot captured', { hasScreenshot: Boolean(screenshotRef) });
      return ok(res, 'Screenshot captured', { screenshotRef, capturedAt: new Date().toISOString() });
    }

    if (command === 'dump_ui' || command === 'probe_screen') {
      const probe = await makeProbe({ device, controller, screenshot: command === 'probe_screen' });
      await recordDeviceEvent(device, `${command} completed`, { screen: probe.screen });
      return ok(res, `${command} completed`, probe);
    }

    if (command === 'open_instagram') {
      const foreground = await controller.startApp(INSTAGRAM_PACKAGE);
      const probe = await makeProbe({ device, controller, screenshot: true });
      await recordDeviceEvent(device, 'opened instagram app', { foreground, screen: probe.screen });
      return ok(res, foreground ? 'Instagram opened' : 'Instagram launch attempted', { foreground, ...probe });
    }

    if (command === 'search_user') {
      const username = safeUsername(params.targetUsername || params.username);
      if (!dryRun) {
        await controller.shell(`am start -a android.intent.action.VIEW -d 'https://www.instagram.com/${username}/' ${INSTAGRAM_PACKAGE}`).catch(() => '');
      }
      const probe = await makeProbe({ device, controller, screenshot: true });
      await recordDeviceEvent(device, dryRun ? 'search user probe recorded' : 'search user navigation attempted', {
        username,
        dryRun,
        screen: probe.screen
      });
      return ok(res, dryRun ? 'Search probe recorded; no navigation executed' : 'Search navigation attempted', {
        dryRun,
        targetUsername: username,
        ...probe
      });
    }

    if (['follow_user_probe', 'view_story_probe', 'like_post_probe'].includes(command)) {
      const action = command.replace(/_probe$/, '');
      const username = params.targetUsername || params.username ? safeUsername(params.targetUsername || params.username) : '';
      const probe = await makeProbe({ device, controller, screenshot: true });
      const coordinate = params.coordinate || null;
      let resultState = 'dry_run';
      if (!dryRun) {
        if (params.confirmExecute !== true) {
          return res.status(409).json({
            success: false,
            message: 'confirmExecute=true is required for non-dry-run DuoPlus reactions'
          });
        }
        if (!Number.isFinite(Number(coordinate?.x)) || !Number.isFinite(Number(coordinate?.y))) {
          return res.status(400).json({
            success: false,
            message: 'coordinate.x and coordinate.y are required for non-dry-run execution'
          });
        }
        await controller.tap(coordinate.x, coordinate.y);
        resultState = 'executed';
      }
      const observationId = await saveCoordinateObservation({
        device,
        action,
        coordinate,
        probe,
        params: { ...params, targetUsername: username },
        dryRun,
        resultState
      });
      await recordDeviceEvent(device, `${action} ${dryRun ? 'probe recorded' : 'executed'}`, {
        observationId,
        dryRun,
        screen: probe.screen
      });
      return ok(res, `${action} ${dryRun ? 'probe recorded; no engagement executed' : 'executed'}`, {
        dryRun,
        action,
        targetUsername: username,
        observationId,
        resultState,
        ...probe
      });
    }

    return res.status(400).json({ success: false, message: `Unsupported command: ${command}` });
  } catch (err) {
    logger.error('Device-control command failed', err);
    return sendError(res, err, 'Internal error');
  }
}

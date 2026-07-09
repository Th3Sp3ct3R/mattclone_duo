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
  safeHashtag,
  safeUsername,
  sanitizeCommandData,
  summarizeDirectInboxUi,
  summarizeDirectThreadUi,
  summarizeUiDump
} from '@julio/api/utils/device-command-safety';
import { sendError } from '@julio/api/utils/response';

const INSTAGRAM_PACKAGE = 'com.instagram.android';
const BASE_SCREEN = { width: 1080, height: 1920 };
const DM_COORDINATES = {
  inboxTab: { x: 540, y: 1710 },
  threadRows: [
    { x: 540, y: 1161 },
    { x: 540, y: 1386 },
    { x: 540, y: 1572 }
  ],
  composer: { x: 432, y: 1776 },
  send: { x: 1008, y: 1776 }
};

const STORY_COORDINATES = {
  trayPrimary: { x: 738, y: 382 },
  viewerNext: { x: 655, y: 640 }
};

function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

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

async function makeProbe({ device, controller, screenshot = false, privateUi = false } = {}) {
  const [packageName, uiXml, screenshotRef] = await Promise.all([
    controller.getCurrentPackage().catch(() => ''),
    controller.getUIDump().catch(() => ''),
    screenshot ? controller.screenshot().catch(() => '') : Promise.resolve('')
  ]);
  const uiSummary = summarizeUiDump(uiXml, { includeTextHints: !privateUi });
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

async function makePrivateUiProbe({ controller } = {}) {
  const [packageName, uiXml] = await Promise.all([
    controller.getCurrentPackage().catch(() => ''),
    controller.getUIDump().catch(() => '')
  ]);
  const uiSummary = summarizeUiDump(uiXml, { includeTextHints: false });
  return {
    probe: {
      packageName,
      screen: detectInstagramScreen({ packageName, uiSummary }),
      uiSummary,
      screenshotRef: '',
      observedAt: new Date().toISOString()
    },
    uiXml
  };
}

function deviceScreen(device = {}) {
  return {
    width: Number(device.runtime?.screenWidth || BASE_SCREEN.width),
    height: Number(device.runtime?.screenHeight || BASE_SCREEN.height)
  };
}

function scaleBaseCoordinate(coordinate = {}, device = {}) {
  const screen = deviceScreen(device);
  return {
    x: Math.round((Number(coordinate.x || 0) / BASE_SCREEN.width) * screen.width),
    y: Math.round((Number(coordinate.y || 0) / BASE_SCREEN.height) * screen.height)
  };
}

function resolveCoordinate(value, fallback, device = {}) {
  const screen = deviceScreen(device);
  if (Number.isFinite(Number(value?.x)) && Number.isFinite(Number(value?.y))) {
    return {
      x: Math.round(Number(value.x)),
      y: Math.round(Number(value.y))
    };
  }
  if (Number.isFinite(Number(value?.nx)) && Number.isFinite(Number(value?.ny))) {
    return {
      x: Math.round(Number(value.nx) * screen.width),
      y: Math.round(Number(value.ny) * screen.height)
    };
  }
  return scaleBaseCoordinate(fallback, device);
}

function defaultThreadCoordinate(params = {}, device = {}) {
  const index = Math.max(1, Math.min(DM_COORDINATES.threadRows.length, Number(params.threadIndex || 1)));
  return resolveCoordinate(params.threadCoordinate || params.coordinate, DM_COORDINATES.threadRows[index - 1], device);
}

function coordinateForResponse(coordinate, device = {}) {
  const screen = deviceScreen(device);
  return normalizeCoordinate({ ...coordinate, width: screen.width, height: screen.height });
}

async function openDirectInbox({ device, controller, params = {} } = {}) {
  const foreground = await controller.startApp(INSTAGRAM_PACKAGE).catch(() => false);
  await delay(params.afterOpenDelayMs || 900);
  const inboxCoordinate = resolveCoordinate(params.inboxCoordinate || params.dmTabCoordinate, DM_COORDINATES.inboxTab, device);
  await controller.tap(inboxCoordinate.x, inboxCoordinate.y);
  await delay(params.afterInboxTapDelayMs || 900);
  return { foreground, inboxCoordinate };
}

function assertExplicitDmExecution(params = {}, requiredFlags = []) {
  for (const flag of requiredFlags) {
    if (params[flag] !== true) {
      const err = new Error(`${flag}=true is required for this DuoPlus DM operation`);
      err.status = 409;
      err.payload = { code: 'CONFIRMATION_REQUIRED', message: err.message };
      throw err;
    }
  }
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

function resultEnvelope({ command, dryRun, startedAt, resultState, probe, extra = {} } = {}) {
  return {
    command,
    dryRun,
    resultState,
    durationMs: Date.now() - Number(startedAt || Date.now()),
    screenState: probe?.screen || extra.screenState || 'unknown',
    packageName: probe?.packageName || extra.packageName || '',
    screenshotRef: probe?.screenshotRef || '',
    observedAt: probe?.observedAt || new Date().toISOString(),
    ...extra
  };
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
    const startedAt = Date.now();
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

    if (command === 'search_hashtag') {
      const hashtag = safeHashtag(params.hashtag || params.tag || params.targetHashtag);
      if (!dryRun) {
        await controller
          .shell(`am start -a android.intent.action.VIEW -d 'https://www.instagram.com/explore/tags/${hashtag}/' ${INSTAGRAM_PACKAGE}`)
          .catch(() => '');
        await delay(params.afterNavigationDelayMs || 1200);
      }
      const probe = await makeProbe({ device, controller, screenshot: true });
      await recordDeviceEvent(device, dryRun ? 'search hashtag probe recorded' : 'search hashtag navigation attempted', {
        hashtag,
        dryRun,
        screen: probe.screen
      });
      return ok(res, dryRun ? 'Hashtag search probe recorded; no navigation executed' : 'Hashtag navigation attempted', {
        ...resultEnvelope({
          command,
          dryRun,
          startedAt,
          resultState: dryRun ? 'dry_run' : 'navigation_attempted',
          probe,
          extra: { targetHashtag: hashtag }
        })
      });
    }

    if (command === 'open_profile_probe') {
      const username = safeUsername(params.targetUsername || params.username);
      if (!dryRun) {
        await controller.shell(`am start -a android.intent.action.VIEW -d 'https://www.instagram.com/${username}/' ${INSTAGRAM_PACKAGE}`).catch(() => '');
        await delay(params.afterNavigationDelayMs || 1200);
      }
      const probe = await makeProbe({ device, controller, screenshot: true });
      await recordDeviceEvent(device, dryRun ? 'profile probe recorded' : 'profile navigation attempted', {
        username,
        dryRun,
        screen: probe.screen
      });
      return ok(res, dryRun ? 'Profile probe recorded; no navigation executed' : 'Profile navigation attempted', {
        ...resultEnvelope({
          command,
          dryRun,
          startedAt,
          resultState: dryRun ? 'dry_run' : 'navigation_attempted',
          probe,
          extra: { targetUsername: username }
        })
      });
    }

    if (command === 'story_active_probe') {
      const probe = await makeProbe({ device, controller, screenshot: true });
      const coordinate = resolveCoordinate(params.coordinate, STORY_COORDINATES.trayPrimary, device);
      const observationId = await saveCoordinateObservation({
        device,
        action: 'story_active_probe',
        coordinate,
        probe,
        params,
        dryRun: true,
        resultState: 'story_state_observed'
      });
      await recordDeviceEvent(device, 'story active probe recorded', {
        observationId,
        screen: probe.screen
      });
      return ok(res, 'Story active probe recorded; no story opened', {
        ...resultEnvelope({
          command,
          dryRun: true,
          startedAt,
          resultState: 'story_state_observed',
          probe,
          extra: {
            observationId,
            coordinates: {
              trayPrimary: coordinateForResponse(coordinate, device),
              viewerNext: coordinateForResponse(resolveCoordinate(params.nextCoordinate, STORY_COORDINATES.viewerNext, device), device)
            }
          }
        })
      });
    }

    if (command === 'notifications_probe') {
      if (!dryRun) {
        await controller.shell(`am start -a android.intent.action.VIEW -d 'instagram://news' ${INSTAGRAM_PACKAGE}`).catch(() => '');
        await delay(params.afterNavigationDelayMs || 1200);
      }
      const probeResult = await makePrivateUiProbe({ controller });
      await recordDeviceEvent(device, dryRun ? 'notifications probe recorded' : 'notifications navigation attempted', {
        dryRun,
        screen: probeResult.probe.screen
      });
      return ok(res, dryRun ? 'Notifications probe recorded; no navigation executed' : 'Notifications navigation attempted', {
        ...resultEnvelope({
          command,
          dryRun,
          startedAt,
          resultState: dryRun ? 'dry_run' : 'notifications_observed',
          probe: probeResult.probe,
          extra: {
            uiSummary: probeResult.probe.uiSummary
          }
        })
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

    if (command === 'dm_thread_probe') {
      const openInbox = params.openInbox !== false;
      let inboxCoordinate = null;
      let foreground = false;
      if (openInbox) {
        const opened = await openDirectInbox({ device, controller, params });
        foreground = opened.foreground;
        inboxCoordinate = opened.inboxCoordinate;
      }

      const inboxProbeResult = await makePrivateUiProbe({ device, controller });
      const inboxSummary = summarizeDirectInboxUi(inboxProbeResult.uiXml);
      const threadCoordinate = defaultThreadCoordinate(params, device);
      let threadSummary = null;
      let threadProbe = null;
      let resultState = dryRun ? 'dry_run_inbox_observed' : 'inbox_observed';

      if (!dryRun) {
        assertExplicitDmExecution(params, ['confirmOpenThread', 'confirmReadThread']);
        await controller.tap(threadCoordinate.x, threadCoordinate.y);
        await delay(params.afterThreadTapDelayMs || 1200);
        const threadProbeResult = await makePrivateUiProbe({ device, controller });
        threadProbe = threadProbeResult.probe;
        threadSummary = summarizeDirectThreadUi(threadProbeResult.uiXml);
        resultState = 'thread_opened_and_summarized';
        if (params.keepThreadOpen !== true && params.returnToInbox !== false) {
          await controller.keyevent(4).catch(() => '');
          await delay(params.afterBackDelayMs || 500);
        }
      }

      const observationId = await saveCoordinateObservation({
        device,
        action: 'dm_thread_probe',
        coordinate: threadCoordinate,
        probe: inboxProbeResult.probe,
        params: {
          coordinateSetVersion: params.coordinateSetVersion,
          confidence: params.confidence,
          commandSource: params.commandSource || 'device-control-compat'
        },
        dryRun,
        resultState
      });

      await recordDeviceEvent(device, dryRun ? 'dm thread probe recorded' : 'dm thread accessed', {
        observationId,
        dryRun,
        resultState,
        threadIndex: Number(params.threadIndex || 1)
      });

      return ok(res, dryRun ? 'DM thread probe recorded; no thread opened' : 'DM thread accessed and summarized', {
        dryRun,
        action: 'dm_thread_probe',
        foreground,
        openInbox,
        observationId,
        resultState,
        threadIndex: Number(params.threadIndex || 1),
        coordinates: {
          inboxTab: inboxCoordinate ? coordinateForResponse(inboxCoordinate, device) : null,
          threadRow: coordinateForResponse(threadCoordinate, device)
        },
        inboxProbe: inboxProbeResult.probe,
        threadProbe,
        inboxSummary,
        threadSummary
      });
    }

    if (command === 'dm_send_probe') {
      const targetUsername = params.targetUsername || params.username ? safeUsername(params.targetUsername || params.username) : '';
      const message = String(params.message || '');
      const messageLength = message.length;
      if (!dryRun && !message.trim()) {
        return res.status(400).json({ success: false, message: 'message is required for non-dry-run DM response operations' });
      }
      if (messageLength > 1000) {
        return res.status(400).json({ success: false, message: 'message must be 1000 characters or fewer' });
      }

      const openInbox = params.openInbox !== false;
      let inboxCoordinate = null;
      let foreground = false;
      if (openInbox) {
        const opened = await openDirectInbox({ device, controller, params });
        foreground = opened.foreground;
        inboxCoordinate = opened.inboxCoordinate;
      }

      const inboxProbeResult = await makePrivateUiProbe({ device, controller });
      const inboxSummary = summarizeDirectInboxUi(inboxProbeResult.uiXml);
      const threadCoordinate = defaultThreadCoordinate(params, device);
      const composerCoordinate = resolveCoordinate(params.composerCoordinate, DM_COORDINATES.composer, device);
      const sendCoordinate = resolveCoordinate(params.sendCoordinate, DM_COORDINATES.send, device);
      let threadSummary = null;
      let threadProbe = null;
      let resultState = dryRun ? 'dry_run_reply_planned' : 'reply_ready';

      if (!dryRun) {
        assertExplicitDmExecution(params, ['confirmExecute', 'confirmOpenThread']);
        await controller.tap(threadCoordinate.x, threadCoordinate.y);
        await delay(params.afterThreadTapDelayMs || 1200);
        const threadProbeResult = await makePrivateUiProbe({ device, controller });
        threadProbe = threadProbeResult.probe;
        threadSummary = summarizeDirectThreadUi(threadProbeResult.uiXml);
        resultState = 'thread_opened';

        if (params.confirmCompose === true) {
          await controller.tap(composerCoordinate.x, composerCoordinate.y);
          await delay(params.afterComposerTapDelayMs || 500);
          await controller.inputText(message);
          await delay(params.afterTextInputDelayMs || 500);
          resultState = 'reply_composed_not_sent';
        }

        if (params.confirmSend === true) {
          if (params.confirmCompose !== true) {
            return res.status(409).json({
              success: false,
              message: 'confirmCompose=true is required before confirmSend=true for DuoPlus DM responses'
            });
          }
          await controller.tap(sendCoordinate.x, sendCoordinate.y);
          await delay(params.afterSendTapDelayMs || 900);
          resultState = 'reply_sent';
        }

        if (params.keepThreadOpen !== true && params.returnToInbox !== false) {
          await controller.keyevent(4).catch(() => '');
          await delay(params.afterBackDelayMs || 500);
        }
      }

      const observationId = await saveCoordinateObservation({
        device,
        action: 'dm_send_probe',
        coordinate: params.confirmSend === true ? sendCoordinate : composerCoordinate,
        probe: inboxProbeResult.probe,
        params: {
          coordinateSetVersion: params.coordinateSetVersion,
          confidence: params.confidence,
          commandSource: params.commandSource || 'device-control-compat'
        },
        dryRun,
        resultState
      });

      await recordDeviceEvent(device, dryRun ? 'dm response probe recorded' : 'dm response operation completed', {
        observationId,
        dryRun,
        resultState,
        hasTargetUsername: Boolean(targetUsername),
        messageLength
      });

      return ok(res, dryRun ? 'DM response probe recorded; no message typed or sent' : 'DM response operation completed', {
        dryRun,
        action: 'dm_send_probe',
        foreground,
        openInbox,
        observationId,
        resultState,
        hasTargetUsername: Boolean(targetUsername),
        messageLength,
        coordinates: {
          inboxTab: inboxCoordinate ? coordinateForResponse(inboxCoordinate, device) : null,
          threadRow: coordinateForResponse(threadCoordinate, device),
          composer: coordinateForResponse(composerCoordinate, device),
          send: coordinateForResponse(sendCoordinate, device)
        },
        inboxProbe: inboxProbeResult.probe,
        threadProbe,
        inboxSummary,
        threadSummary
      });
    }

    return res.status(400).json({ success: false, message: `Unsupported command: ${command}` });
  } catch (err) {
    logger.error('Device-control command failed', err);
    return sendError(res, err, 'Internal error');
  }
}

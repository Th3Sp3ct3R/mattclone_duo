import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineDeviceEvent } from '@julio/api/models/engine-device-event';
import { addDeviceEventClient, writeDeviceEvent } from '@julio/api/services/device-event-stream';
import { logger } from '@julio/api/logger';
import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

async function ensureDb() {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);
}

function eventLimit(req) {
  return Math.min(Math.max(Number(req.query?.limit || 100), 1), 250);
}

async function assertDevice(deviceId) {
  const device = await EngineDevice.findById(deviceId).select({ _id: 1 }).lean();
  if (!device) {
    const err = new Error('Device not found');
    err.status = 404;
    err.payload = { code: 'NOT_FOUND', message: 'Device not found' };
    throw err;
  }
  return device;
}

async function recentEvents(deviceId, limit) {
  const events = await EngineDeviceEvent.find({ deviceId }).sort({ createdAt: -1 }).limit(limit).lean();
  return events.reverse();
}

export async function listDeviceEvents(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    await assertDevice(req.params.id);
    const events = await recentEvents(req.params.id, eventLimit(req));
    return res.json({ ok: true, events });
  } catch (err) {
    logger.error('Engine device events fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function streamDeviceEvents(req, res) {
  try {
    requireAdmin(req);
    await ensureDb();
    await assertDevice(req.params.id);

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders?.();

    for (const event of await recentEvents(req.params.id, eventLimit(req))) {
      writeDeviceEvent(res, event);
    }

    const removeClient = addDeviceEventClient(req.params.id, res);
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeClient();
      res.end();
    });
  } catch (err) {
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message || 'Stream failed' })}\n\n`);
      return res.end();
    }
    logger.error('Engine device events stream failed', err);
    return sendError(res, err, 'Internal error');
  }
}

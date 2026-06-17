import { env } from '@julio/api/config/env';
import { getRedis } from '@julio/api/db/redis';
import { logger } from '@julio/api/logger';
import { buildDeviceEventChannel } from '@julio/shared';

const clientsByDeviceId = new Map();
let subscriber = null;

function normalizeEvent(event = {}) {
  return {
    id: event._id ? String(event._id) : event.id || '',
    deviceId: event.deviceId ? String(event.deviceId) : '',
    level: event.level || 'info',
    source: event.source || 'system',
    jobRunId: event.jobRunId ? String(event.jobRunId) : null,
    jobName: event.jobName || '',
    message: event.message || '',
    data: event.data || {},
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString()
  };
}

function parseDeviceId(channel = '') {
  const match = String(channel).match(/^engine:device:(.+):events$/);
  return match?.[1] || '';
}

export function writeDeviceEvent(res, event) {
  const payload = normalizeEvent(event);
  if (payload.id) res.write(`id: ${payload.id}\n`);
  res.write('event: device-event\n');
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function ensureDeviceEventSubscriber() {
  if (subscriber || !env.redisUrl) return subscriber;
  subscriber = getRedis(env.redisUrl).duplicate();
  subscriber.psubscribe(buildDeviceEventChannel('*')).catch((err) => {
    logger.error('Device event Redis subscription failed', err);
  });
  subscriber.on('pmessage', (_pattern, channel, message) => {
    const deviceId = parseDeviceId(channel);
    const clients = clientsByDeviceId.get(deviceId);
    if (!clients?.size) return;
    let event;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }
    for (const client of clients) {
      writeDeviceEvent(client, event);
    }
  });
  subscriber.on('error', (err) => {
    logger.error('Device event Redis subscriber error', err);
  });
  return subscriber;
}

export function addDeviceEventClient(deviceId, res) {
  ensureDeviceEventSubscriber();
  const key = String(deviceId);
  const clients = clientsByDeviceId.get(key) || new Set();
  clients.add(res);
  clientsByDeviceId.set(key, clients);
  return () => {
    clients.delete(res);
    if (!clients.size) clientsByDeviceId.delete(key);
  };
}

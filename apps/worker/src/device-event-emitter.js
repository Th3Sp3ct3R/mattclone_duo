import { env } from '@julio/api/config/env';
import { getRedis } from '@julio/api/db/redis';
import { EngineDeviceEvent } from '@julio/api/models/engine-device-event';
import { recordDeviceEvent } from '@julio/shared';

export function resolvePayloadDeviceId(payload = {}) {
  if (payload.targetType === 'device' && payload.targetId) return payload.targetId;
  return payload?.payload?.deviceId || payload?.payload?.assignedDeviceId || null;
}

export async function emitDeviceEvent({
  deviceId,
  level = 'info',
  source = 'system',
  jobRunId = null,
  jobName = '',
  message = '',
  data = {}
} = {}) {
  if (!deviceId || !message) return null;
  const redis = env.redisUrl ? getRedis(env.redisUrl) : null;
  return recordDeviceEvent({
    eventModel: EngineDeviceEvent,
    redis,
    deviceId,
    level,
    source,
    jobRunId,
    jobName,
    message,
    data
  });
}

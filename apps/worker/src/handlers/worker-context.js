import { env } from '@julio/api/config/env';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineTelemetryBaseline } from '@julio/api/models/engine-telemetry';
import { createHumanActor } from '@julio/automation';
import { createCloudPhoneProvider } from '@julio/device-control';
import { resolveBehaviorProfile } from '@julio/humanizer';
import { claimMongoLease, releaseLeasesByOwner, releaseMongoLease, renewMongoLease } from '@julio/shared';

import { emitDeviceEvent } from '../device-event-emitter.js';

export const LEASE_OWNER = `engine-worker:${process.pid}`;
const LEASE_TTL_MS = 90_000;
const LEASE_RENEW_MS = 30_000;

export class DeviceUnavailableError extends Error {
  constructor(message, { details = null, cause = null } = {}) {
    super(message);
    this.name = 'DeviceUnavailableError';
    this.code = 'DEVICE_UNAVAILABLE';
    this.details = details;
    this.cause = cause;
  }
}

export function getProvider(type = env.cloudProvider || 'vmos') {
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

function hasExplicitOfflineStatus(instance = {}) {
  const rawStatus =
    instance.online ?? instance.isOnline ?? instance.onlineStatus ?? instance.adbOnline ?? instance.status;
  if (rawStatus === undefined || rawStatus === null) return false;
  const value = String(rawStatus).toLowerCase();
  return (
    rawStatus === false ||
    rawStatus === 0 ||
    value === '0' ||
    value.includes('offline') ||
    value.includes('stopped')
  );
}

async function emitReachabilityFailure(emit, message, data) {
  if (!emit) return;
  await emit(message, data).catch(() => {});
}

export async function assertDeviceReachable(provider, device, emit = null) {
  const providerDeviceId = device?.providerDeviceId;
  if (!providerDeviceId) {
    throw new DeviceUnavailableError('Device has no VMOS providerDeviceId', {
      details: { deviceId: device?._id ? String(device._id) : null }
    });
  }

  let instance = null;
  try {
    instance = await provider.describeInstance(providerDeviceId);
  } catch (err) {
    const message = `Unable to validate VMOS instance ${providerDeviceId}`;
    await emitReachabilityFailure(emit, message, {
      providerDeviceId,
      reason: err?.message || 'VMOS validation failed'
    });
    throw new DeviceUnavailableError(message, {
      cause: err,
      details: { providerDeviceId, reason: err?.message || '' }
    });
  }

  if (!instance || hasExplicitOfflineStatus(instance)) {
    const reason = instance ? 'offline' : 'not_found';
    const message =
      reason === 'not_found'
        ? `VMOS instance not found for padCode ${providerDeviceId}`
        : `VMOS instance offline for padCode ${providerDeviceId}`;
    await emitReachabilityFailure(emit, message, { providerDeviceId, reason });
    throw new DeviceUnavailableError(message, { details: { providerDeviceId, reason } });
  }

  return instance;
}

export async function withDeviceLease(deviceId, handler) {
  const device = await claimMongoLease(EngineDevice, {
    owner: LEASE_OWNER,
    ttlMs: LEASE_TTL_MS,
    filter: { _id: deviceId, retiredAt: null }
  });
  if (!device) throw new Error('Device is busy or unavailable');
  const renewTimer = setInterval(() => {
    renewMongoLease(EngineDevice, device._id, {
      owner: LEASE_OWNER,
      ttlMs: LEASE_TTL_MS
    }).catch(() => {});
  }, LEASE_RENEW_MS);
  renewTimer.unref?.();

  try {
    await emitDeviceEvent({
      deviceId: device._id,
      source: 'device',
      message: 'device lease acquired',
      data: { owner: LEASE_OWNER }
    });
    return await handler(device);
  } finally {
    clearInterval(renewTimer);
    await releaseMongoLease(EngineDevice, device._id, { owner: LEASE_OWNER }).catch(() => {});
    await emitDeviceEvent({
      deviceId: device._id,
      source: 'device',
      message: 'device lease released',
      data: { owner: LEASE_OWNER }
    });
  }
}

export async function releaseWorkerLeases() {
  return releaseLeasesByOwner(EngineDevice, { owner: LEASE_OWNER }).catch(() => null);
}

export async function buildHumanContext({ controller, accountId = null, deviceId = null } = {}) {
  const filters = [{ scope: 'global' }];
  if (deviceId) filters.push({ scope: 'device', deviceId });
  if (accountId) filters.push({ scope: 'account', accountId });
  const baselines = await EngineTelemetryBaseline.find({ $or: filters }).sort({ scope: 1, capturedAt: 1 }).lean();
  const profile = resolveBehaviorProfile({
    baselines,
    seed: accountId ? String(accountId) : deviceId ? String(deviceId) : 'default'
  });
  return {
    profile,
    actor: controller ? createHumanActor({ controller, profile }) : null
  };
}

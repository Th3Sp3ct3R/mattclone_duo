import { env } from '@julio/api/config/env';
import { EngineDevice } from '@julio/api/models/engine-device';
import { createCloudPhoneProvider } from '@julio/device-control';
import { claimMongoLease, releaseMongoLease } from '@julio/shared';

export const LEASE_OWNER = `engine-worker:${process.pid}`;

export function getProvider() {
  return createCloudPhoneProvider({
    type: env.cloudProvider || 'vmos',
    accessKey: env.vmosAccessKey,
    secretKey: env.vmosSecretKey,
    baseUrl: env.vmosApiBaseUrl
  });
}

export async function withDeviceLease(deviceId, handler) {
  const device = await claimMongoLease(EngineDevice, {
    owner: LEASE_OWNER,
    ttlMs: 15 * 60 * 1000,
    filter: { _id: deviceId, retiredAt: null }
  });
  if (!device) throw new Error('Device is busy or unavailable');
  try {
    return await handler(device);
  } finally {
    await releaseMongoLease(EngineDevice, device._id, { owner: LEASE_OWNER }).catch(() => {});
  }
}

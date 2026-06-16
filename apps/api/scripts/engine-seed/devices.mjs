import { EngineDevice } from '@julio/api/models/engine-device';

const now = () => new Date();

export async function seedDevices() {
  const devices = await EngineDevice.insertMany(
    Array.from({ length: 8 }).map((_, index) => {
      const ordinal = index + 1;
      const status = ordinal <= 5 ? 'running' : ordinal <= 7 ? 'stopped' : 'unhealthy';
      return {
        provider: 'vmos',
        providerDeviceId: `vmos-demo-pad-${String(ordinal).padStart(2, '0')}`,
        name: `VMOS Demo Pad ${ordinal}`,
        status,
        region: ordinal % 2 === 0 ? 'us-east' : 'us-west',
        groupName: ordinal <= 4 ? 'tiktok-fleet' : 'instagram-fleet',
        notes: 'Seeded demo device for the Engine operator console.',
        runtime: {
          adbAddress: status === 'running' ? `127.0.0.1:${5600 + ordinal}` : '',
          adbPassword: status === 'running' ? `seed-pass-${ordinal}` : '',
          screenWidth: 720,
          screenHeight: 1280,
          lastHeartbeatAt: status === 'running' ? now() : null
        },
        capacity: {
          maxAccounts: ordinal <= 4 ? 3 : 2,
          activeAccountCount: ordinal <= 5 ? 2 : 0,
          operationConcurrency: 1
        }
      };
    })
  );

  return { devices };
}

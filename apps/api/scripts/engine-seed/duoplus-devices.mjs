import { EngineDevice } from '@julio/api/models/engine-device';

const now = () => new Date();

const DUOPLUS_DEMO_DEVICES = [
  {
    providerDeviceId: 'duoplus-phone-01',
    name: 'DuoPlus Phone 01',
    status: 'running',
    region: 'us-east',
    groupName: 'duoplus-fleet-a',
    notes: 'DuoPlus demo device — seeded for operator console preview.',
    adbAddress: '127.0.0.1:5610',
    adbPassword: 'duoplus-seed-01',
    heartbeatAgeMs: 5 * 60 * 1000,
    maxAccounts: 3,
    activeAccounts: 2
  },
  {
    providerDeviceId: 'duoplus-phone-02',
    name: 'DuoPlus Phone 02',
    status: 'running',
    region: 'us-east',
    groupName: 'duoplus-fleet-a',
    notes: 'DuoPlus demo device — seeded for operator console preview.',
    adbAddress: '127.0.0.1:5611',
    adbPassword: 'duoplus-seed-02',
    heartbeatAgeMs: 8 * 60 * 1000,
    maxAccounts: 3,
    activeAccounts: 1
  },
  {
    providerDeviceId: 'duoplus-phone-03',
    name: 'DuoPlus Phone 03',
    status: 'running',
    region: 'eu-west',
    groupName: 'duoplus-fleet-a',
    notes: 'DuoPlus demo device — seeded for operator console preview.',
    adbAddress: '127.0.0.1:5612',
    adbPassword: 'duoplus-seed-03',
    heartbeatAgeMs: 2 * 60 * 1000,
    maxAccounts: 4,
    activeAccounts: 3
  },
  {
    providerDeviceId: 'duoplus-phone-04',
    name: 'DuoPlus Phone 04',
    status: 'running',
    region: 'eu-west',
    groupName: 'duoplus-fleet-b',
    notes: 'DuoPlus demo device — seeded for operator console preview.',
    adbAddress: '127.0.0.1:5613',
    adbPassword: 'duoplus-seed-04',
    heartbeatAgeMs: 12 * 60 * 1000,
    maxAccounts: 3,
    activeAccounts: 1
  },
  {
    providerDeviceId: 'duoplus-phone-05',
    name: 'DuoPlus Phone 05',
    status: 'stopped',
    region: 'us-east',
    groupName: 'duoplus-fleet-b',
    notes: 'DuoPlus demo device — parked, available for lease.',
    adbAddress: '',
    adbPassword: '',
    heartbeatAgeMs: null,
    maxAccounts: 3,
    activeAccounts: 0
  },
  {
    providerDeviceId: 'duoplus-phone-06',
    name: 'DuoPlus Phone 06',
    status: 'stopped',
    region: 'eu-west',
    groupName: 'duoplus-fleet-b',
    notes: 'DuoPlus demo device — parked, available for lease.',
    adbAddress: '',
    adbPassword: '',
    heartbeatAgeMs: null,
    maxAccounts: 3,
    activeAccounts: 0
  },
  {
    providerDeviceId: 'duoplus-phone-07',
    name: 'DuoPlus Phone 07',
    status: 'starting',
    region: 'us-east',
    groupName: 'duoplus-fleet-a',
    notes: 'DuoPlus demo device — booting up.',
    adbAddress: '',
    adbPassword: '',
    heartbeatAgeMs: null,
    maxAccounts: 3,
    activeAccounts: 0
  }
];

export async function seedDuoplusDevices() {
  const baseTime = now();
  const devices = await EngineDevice.insertMany(
    DUOPLUS_DEMO_DEVICES.map((d) => ({
      provider: 'duoplus',
      providerDeviceId: d.providerDeviceId,
      name: d.name,
      status: d.status,
      region: d.region,
      groupName: d.groupName,
      notes: d.notes,
      runtime: {
        adbAddress: d.adbAddress,
        adbPassword: d.adbPassword,
        screenWidth: 720,
        screenHeight: 1280,
        lastScreenshotUrl: '',
        lastHeartbeatAt: d.heartbeatAgeMs === null ? null : new Date(baseTime.getTime() - d.heartbeatAgeMs)
      },
      capacity: {
        maxAccounts: d.maxAccounts,
        activeAccountCount: d.activeAccounts,
        operationConcurrency: 1
      }
    }))
  );

  return { devices };
}
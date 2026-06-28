import { jest } from '@jest/globals';

import { PreflightError, runJobPreflight } from './preflight.js';

const activeSubscription = {
  subscriptionVerified: true,
  subscriptionStatus: 'active',
  subscriptionExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  proxyConfigured: true
};

function duoplusDevice(overrides = {}) {
  return {
    _id: 'device-1',
    provider: 'duoplus',
    providerDeviceId: 'SxarH',
    providerMeta: activeSubscription,
    ...overrides
  };
}

function account(overrides = {}) {
  return {
    _id: 'account-1',
    platform: 'youtube',
    assignedDeviceId: 'device-1',
    ...overrides
  };
}

function provider(overrides = {}) {
  return {
    describeInstance: jest.fn().mockResolvedValue({ status: 'running', raw: { status: 1 } }),
    listInstalledApps: jest.fn().mockResolvedValue([{ packageName: 'com.google.android.youtube' }]),
    ...overrides
  };
}

test('throws typed preflight errors', () => {
  const error = new PreflightError('MISSING_PROXY', 'Proxy missing', { platform: 'youtube' });

  expect(error.code).toBe('MISSING_PROXY');
  expect(error.details).toEqual({ platform: 'youtube' });
});

test('blocks account jobs when the account is assigned to another device', async () => {
  await expect(
    runJobPreflight({
      provider: provider(),
      device: duoplusDevice(),
      account: account({ assignedDeviceId: 'device-2' }),
      platform: 'youtube'
    })
  ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_ASSIGNED' });
});

test('blocks DuoPlus jobs without a verified subscription', async () => {
  await expect(
    runJobPreflight({
      provider: provider(),
      device: duoplusDevice({ providerMeta: { ...activeSubscription, subscriptionVerified: false } }),
      account: account(),
      platform: 'youtube'
    })
  ).rejects.toMatchObject({ code: 'MISSING_SUBSCRIPTION' });
});

test('blocks DuoPlus jobs without a configured proxy', async () => {
  await expect(
    runJobPreflight({
      provider: provider(),
      device: duoplusDevice({ providerMeta: { ...activeSubscription, proxyConfigured: false } }),
      account: account(),
      platform: 'youtube'
    })
  ).rejects.toMatchObject({ code: 'MISSING_PROXY' });
});

test('blocks jobs when the provider does not report the phone running', async () => {
  await expect(
    runJobPreflight({
      provider: provider({ describeInstance: jest.fn().mockResolvedValue({ status: 'stopped' }) }),
      device: duoplusDevice(),
      account: account(),
      platform: 'youtube'
    })
  ).rejects.toMatchObject({ code: 'PHONE_OFFLINE' });
});

test('blocks jobs when the target app is not installed', async () => {
  await expect(
    runJobPreflight({
      provider: provider({ listInstalledApps: jest.fn().mockResolvedValue([{ packageName: 'com.instagram.android' }]) }),
      device: duoplusDevice(),
      account: account(),
      platform: 'youtube'
    })
  ).rejects.toMatchObject({ code: 'APP_NOT_INSTALLED' });
});

test('passes when assignment, subscription, phone state, proxy, and app install are valid', async () => {
  await expect(
    runJobPreflight({
      provider: provider(),
      device: duoplusDevice(),
      account: account(),
      platform: 'youtube'
    })
  ).resolves.toEqual({ ok: true });
});

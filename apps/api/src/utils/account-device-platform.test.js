import { findAccountDevicePlatformConflict } from './account-device-platform.js';

test('blocks another active account for the same platform on the same device', () => {
  const conflict = findAccountDevicePlatformConflict(
    [
      {
        _id: 'account-1',
        platform: 'instagram',
        assignedDeviceId: 'device-1',
        retiredAt: null
      }
    ],
    { platform: 'instagram', assignedDeviceId: 'device-1', accountId: 'account-2' }
  );

  expect(conflict?._id).toBe('account-1');
});

test('allows different platforms on the same device', () => {
  const conflict = findAccountDevicePlatformConflict(
    [
      {
        _id: 'account-1',
        platform: 'instagram',
        assignedDeviceId: 'device-1',
        retiredAt: null
      }
    ],
    { platform: 'youtube', assignedDeviceId: 'device-1', accountId: 'account-2' }
  );

  expect(conflict).toBeNull();
});

test('allows reassigning the same account idempotently', () => {
  const conflict = findAccountDevicePlatformConflict(
    [
      {
        _id: 'account-1',
        platform: 'instagram',
        assignedDeviceId: 'device-1',
        retiredAt: null
      }
    ],
    { platform: 'instagram', assignedDeviceId: 'device-1', accountId: 'account-1' }
  );

  expect(conflict).toBeNull();
});

test('ignores retired accounts', () => {
  const conflict = findAccountDevicePlatformConflict(
    [
      {
        _id: 'account-1',
        platform: 'instagram',
        assignedDeviceId: 'device-1',
        retiredAt: new Date()
      }
    ],
    { platform: 'instagram', assignedDeviceId: 'device-1', accountId: 'account-2' }
  );

  expect(conflict).toBeNull();
});

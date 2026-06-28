import {
  assertDeviceCanAcceptAccount,
  canDeviceAcceptAccount
} from './device-account-eligibility.js';

test('allows non-DuoPlus devices to accept account assignments', () => {
  expect(canDeviceAcceptAccount({ provider: 'vmos' })).toEqual({ ok: true });
});

test('blocks DuoPlus devices without an explicit subscription verification flag', () => {
  expect(
    canDeviceAcceptAccount({
      provider: 'duoplus',
      providerDeviceId: 'SxarH',
      status: 'running',
      providerMeta: {
        rawStatus: 1,
        expiredAt: '1785212232',
        proxyConfigured: true
      }
    })
  ).toEqual({
    ok: false,
    status: 409,
    code: 'DEVICE_SUBSCRIPTION_REQUIRED',
    message: 'DuoPlus device SxarH does not have a verified subscription; account assignment is blocked.'
  });
});

test('allows DuoPlus devices only when subscription verification is explicit and active', () => {
  expect(
    canDeviceAcceptAccount({
      provider: 'duoplus',
      providerDeviceId: 'FpPU2',
      providerMeta: {
        subscriptionVerified: true,
        subscriptionStatus: 'active'
      }
    })
  ).toEqual({ ok: true });
});

test('throws a typed eligibility error for controller callers', () => {
  expect(() =>
    assertDeviceCanAcceptAccount({
      provider: 'duoplus',
      providerDeviceId: 'qXFA1',
      providerMeta: {}
    })
  ).toThrow(/verified subscription/);
});

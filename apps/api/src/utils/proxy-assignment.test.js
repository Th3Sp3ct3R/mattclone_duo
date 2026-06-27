import { findActiveProxyAssignmentConflict } from './proxy-assignment.js';

describe('findActiveProxyAssignmentConflict', () => {
  const proxyId = '64f000000000000000000001';
  const deviceId = '64f000000000000000000002';
  const accountId = '64f000000000000000000003';

  it('allows an idempotent active proxy-device assignment', () => {
    const conflict = findActiveProxyAssignmentConflict(
      [{ proxyId, deviceId, accountId: null }],
      { proxyId, deviceId }
    );

    expect(conflict).toBeNull();
  });

  it('blocks a proxy that is already active on another device', () => {
    const conflict = findActiveProxyAssignmentConflict(
      [{ proxyId, deviceId: '64f000000000000000000004', accountId: null }],
      { proxyId, deviceId }
    );

    expect(conflict?.type).toBe('proxy');
  });

  it('blocks a device that already has another active proxy', () => {
    const conflict = findActiveProxyAssignmentConflict(
      [{ proxyId: '64f000000000000000000004', deviceId, accountId: null }],
      { proxyId, deviceId }
    );

    expect(conflict?.type).toBe('device');
  });

  it('blocks an account that already has another active proxy', () => {
    const conflict = findActiveProxyAssignmentConflict(
      [{ proxyId: '64f000000000000000000004', deviceId: null, accountId }],
      { proxyId, accountId }
    );

    expect(conflict?.type).toBe('account');
  });
});


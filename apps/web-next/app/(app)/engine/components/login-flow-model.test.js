import { buildLoginFlowRows } from './login-flow-model.js';

describe('buildLoginFlowRows', () => {
  const fpDevice = {
    _id: 'device-fppu2',
    provider: 'duoplus',
    tier: 'ios',
    tierDisplay: 'iOS',
    providerDisplay: 'iPhone',
    providerDeviceId: '10001',
    name: 'FpPU2',
    status: 'running',
    providerMeta: { proxyConfigured: true, proxyIp: '203.0.113.10' },
    runtime: { lastScreenshotUrl: '/screen.png' },
    latestEvent: { level: 'info', message: 'Login check passed', createdAt: '2026-06-26T12:00:00.000Z' }
  };

  it('builds dense operator rows with proxy, focus, and latest event state', () => {
    const rows = buildLoginFlowRows({
      devices: [fpDevice],
      accounts: [{ _id: 'account-1', platform: 'tiktok', status: 'active', assignedDeviceId: fpDevice._id }]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      deviceName: 'FpPU2',
      tier: 'ios',
      tierDisplay: 'iOS',
      proxyLabel: '203.0.113.10',
      loginStage: 'active',
      fallbackAvailable: true,
      latestEventMessage: 'Login check passed'
    });
  });

  it('marks blocked account states as blocked', () => {
    const rows = buildLoginFlowRows({
      devices: [fpDevice],
      accounts: [
        { _id: 'account-1', platform: 'instagram', status: 'checkpointed', assignedDeviceId: fpDevice._id }
      ]
    });

    expect(rows[0]).toMatchObject({
      loginStage: 'blocked',
      stageTone: 'blocked'
    });
  });

  it('labels DuoPlus rows with missing proxies clearly', () => {
    const rows = buildLoginFlowRows({
      devices: [{ ...fpDevice, providerMeta: { proxyConfigured: false }, runtime: {} }],
      accounts: []
    });

    expect(rows[0]).toMatchObject({
      proxyLabel: 'No proxy',
      proxyTone: 'missing',
      loginStage: 'no-account',
      fallbackAvailable: true
    });
  });

  it('prefers stable DuoPlus IDs over generated snap names', () => {
    const rows = buildLoginFlowRows({
      devices: [{ ...fpDevice, name: 'snap_FpPU2', providerDeviceId: 'FpPU2' }],
      accounts: []
    });

    expect(rows[0].deviceName).toBe('FpPU2');
  });
});

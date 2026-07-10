import { createDuoplusDeviceRegistrationAdapter } from './duoplus-device-registration-adapter.js';

// DI-fake DuoplusClient recording every call. `overrides` lets each test set the
// shapes returned by listInstalledApps / listTeamApps.
function fakeClient(overrides = {}) {
  const calls = { listInstalledApps: [], listTeamApps: [], installApp: [], initProxy: [], setSmartIp: [] };
  return {
    calls,
    async listInstalledApps(...args) {
      calls.listInstalledApps.push(args);
      return overrides.installed ?? [];
    },
    async listTeamApps(...args) {
      calls.listTeamApps.push(args);
      return overrides.teamApps ?? [];
    },
    async installApp(...args) {
      calls.installApp.push(args);
      return overrides.installResult ?? { ok: true };
    },
    async initProxy(...args) {
      calls.initProxy.push(args);
      return overrides.initProxyResult ?? { ok: true };
    },
    async setSmartIp(...args) {
      calls.setSmartIp.push(args);
      return overrides.setSmartIpResult ?? { ok: true };
    }
  };
}

const device = { providerDeviceId: 'dev1' };

describe('duoplusDeviceRegistrationAdapter', () => {
  it('skips install when WhatsApp already installed, then initProxy', async () => {
    const client = fakeClient({ installed: [{ packageName: 'com.whatsapp' }] });
    const adapter = createDuoplusDeviceRegistrationAdapter({ client });

    await adapter.ensureReady(device);

    expect(client.calls.listInstalledApps).toEqual([['dev1']]);
    expect(client.calls.installApp).toHaveLength(0);
    expect(client.calls.initProxy).toEqual([[['dev1']]]);
  });

  it('installs using an explicit config.whatsappTeamAppId when not installed', async () => {
    const client = fakeClient({ installed: [] });
    const adapter = createDuoplusDeviceRegistrationAdapter({
      client,
      config: { whatsappTeamAppId: 'wa123' }
    });

    await adapter.ensureReady(device);

    expect(client.calls.listTeamApps).toHaveLength(0);
    expect(client.calls.installApp).toEqual([[['dev1'], 'wa123']]);
    expect(client.calls.initProxy).toEqual([[['dev1']]]);
  });

  it('resolves the team-APK id from the team catalog when no config id', async () => {
    const client = fakeClient({
      installed: [],
      teamApps: [{ packageName: 'com.whatsapp', appId: 'team-wa' }]
    });
    const adapter = createDuoplusDeviceRegistrationAdapter({ client });

    await adapter.ensureReady(device);

    expect(client.calls.listTeamApps).toHaveLength(1);
    expect(client.calls.installApp).toEqual([[['dev1'], 'team-wa']]);
    expect(client.calls.initProxy).toEqual([[['dev1']]]);
  });

  it('throws WHATSAPP_TEAM_APP_NOT_FOUND when no id is found anywhere', async () => {
    const client = fakeClient({ installed: [], teamApps: [] });
    const adapter = createDuoplusDeviceRegistrationAdapter({ client });

    await expect(adapter.ensureReady(device)).rejects.toThrow('WHATSAPP_TEAM_APP_NOT_FOUND');
    expect(client.calls.installApp).toHaveLength(0);
  });

  it('uses setSmartIp instead of initProxy when config.proxy is provided', async () => {
    const client = fakeClient({ installed: [{ packageName: 'com.whatsapp' }] });
    const adapter = createDuoplusDeviceRegistrationAdapter({
      client,
      config: { proxy: { host: 'h' } }
    });

    await adapter.ensureReady(device);

    expect(client.calls.setSmartIp).toEqual([['dev1', { host: 'h' }]]);
    expect(client.calls.initProxy).toHaveLength(0);
  });
});

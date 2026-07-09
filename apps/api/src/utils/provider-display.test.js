import { toDeviceDisplay, groupDevicesByFleet, tierLabel, fleetGroupLabel, DEVICE_POOL_LABEL } from './provider-display.js';

describe('provider-display', () => {
  // Make sure env overrides from one test don't bleed into another.
  const originalEnv = { ...process.env };
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('PROVIDER_LABEL_') || key.startsWith('PROVIDER_TIER_') || key === 'PROVIDER_FLEET_LABEL') {
        delete process.env[key];
      }
    }
  });
  afterAll(() => {
    process.env = originalEnv;
  });
  describe('toDeviceDisplay', () => {
    it('maps duoplus → iPhone with iOS tier', () => {
      const out = toDeviceDisplay({
        provider: 'duoplus',
        providerDeviceId: 'padABC1234',
        name: 'Pad 042',
        providerMeta: { deviceModel: 'iPhone 14 Pro' }
      });
      expect(out.providerCode).toBe('duoplus');
      expect(out.providerDisplay).toBe('iPhone');
      expect(out.tier).toBe('ios');
      expect(out.tierDisplay).toBe('iOS');
      expect(out.displayLabel).toBe('Pad 042');
      expect(out.deviceModel).toBe('iPhone 14 Pro');
      expect(out.fleetGroup).toBe('ios');
    });

    it('maps vmos → Android with android tier', () => {
      const out = toDeviceDisplay({ provider: 'vmos', providerDeviceId: 'x' });
      expect(out.providerDisplay).toBe('Android');
      expect(out.tier).toBe('android');
      expect(out.tierDisplay).toBe('Android OS');
    });

    it('prefers nickname → name → fallback for displayLabel', () => {
      const a = toDeviceDisplay({ provider: 'duoplus', providerDeviceId: 'xxxx9999', name: 'Generated Name', nickname: 'Real Name' });
      expect(a.displayLabel).toBe('Real Name');

      const b = toDeviceDisplay({ provider: 'duoplus', providerDeviceId: 'xxxx9999', name: 'Some Name' });
      expect(b.displayLabel).toBe('Some Name');

      const c = toDeviceDisplay({ provider: 'duoplus', providerDeviceId: 'abc9999' });
      expect(c.displayLabel).toBe('Phone 9999');
    });

    it('handles missing provider gracefully', () => {
      const out = toDeviceDisplay({});
      expect(out.providerCode).toBe('');
      expect(out.providerDisplay).toBe('Phone');
      expect(out.tier).toBe('unknown');
      expect(out.fleetGroup).toBe('unknown');
    });

    it('respects env overrides', () => {
      process.env.PROVIDER_LABEL_VMOS = 'Pixel Farm';
      process.env.PROVIDER_TIER_VMOS = 'android-pool';
      const out = toDeviceDisplay({ provider: 'vmos' });
      expect(out.providerDisplay).toBe('Pixel Farm');
      expect(out.tier).toBe('android-pool');
      expect(out.tierDisplay).toBe('Android-pool'); // capitalized fallback for custom tiers
    });
  });

  describe('groupDevicesByFleet', () => {
    it('groups by tier and counts', () => {
      const groups = groupDevicesByFleet([
        { provider: 'duoplus', providerDeviceId: 'a' },
        { provider: 'duoplus', providerDeviceId: 'b' },
        { provider: 'vmos', providerDeviceId: 'c' }
      ]);
      const map = Object.fromEntries(groups.map((g) => [g.tierKey, g]));
      expect(map.ios.count).toBe(2);
      expect(map.ios.tierLabel).toBe('iOS');
      expect(map.android.count).toBe(1);
      expect(map.android.tierLabel).toBe('Android OS');
    });
  });

  describe('tierLabel', () => {
    it('maps tier keys', () => {
      expect(tierLabel('ios')).toBe('iOS');
      expect(tierLabel('android')).toBe('Android OS');
      expect(tierLabel('custom-pool')).toBe('Custom-pool'); // custom tier → capitalized fallback
    });
  });

  describe('fleetGroupLabel', () => {
    it('defaults to "Device Pool"', () => {
      expect(DEVICE_POOL_LABEL).toBe('Device Pool');
      expect(fleetGroupLabel()).toBe('Device Pool');
    });
  });
});

import {
  DEFAULT_FOCUS_QUALITY,
  buildDuoPlusControlUrl,
  resolveFocusQuality
} from './duoplus-focus.js';

describe('resolveFocusQuality', () => {
  it('falls back to defaults for empty input', () => {
    expect(resolveFocusQuality()).toEqual(DEFAULT_FOCUS_QUALITY);
  });

  it('accepts w/h aliases and coerces numbers', () => {
    const q = resolveFocusQuality({ w: '720', h: '1280', bitrate: '2000', fps: '24' });
    expect(q).toEqual({ width: 720, height: 1280, bitrate: 2000, fps: 24, clarity: 'S' });
  });

  it('rejects non-positive values', () => {
    const q = resolveFocusQuality({ width: -5, bitrate: 0, fps: 'abc' });
    expect(q.width).toBe(DEFAULT_FOCUS_QUALITY.width);
    expect(q.bitrate).toBe(DEFAULT_FOCUS_QUALITY.bitrate);
    expect(q.fps).toBe(DEFAULT_FOCUS_QUALITY.fps);
  });

  it('pins clarity to the confirmed token', () => {
    expect(resolveFocusQuality({ clarity: 'HD' }).clarity).toBe('S');
    expect(resolveFocusQuality({ clarity: 'S' }).clarity).toBe('S');
  });
});

describe('buildDuoPlusControlUrl', () => {
  it('returns empty string without a device id', () => {
    expect(buildDuoPlusControlUrl({})).toBe('');
  });

  it('builds the full control URL matching the live structure', () => {
    const url = buildDuoPlusControlUrl(
      { providerDeviceId: 'FpPU2' },
      { width: 438, height: 905, bitrate: 500, fps: 10, clarity: 'S' }
    );
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://my.duoplus.cn/control');
    expect(parsed.searchParams.get('id')).toBe('FpPU2');
    expect(parsed.searchParams.get('mid')).toBe('FpPU2');
    expect(parsed.searchParams.get('name')).toBe('snap_FpPU2');
    expect(parsed.searchParams.get('w')).toBe('438');
    expect(parsed.searchParams.get('h')).toBe('905');
    expect(parsed.searchParams.get('isMobile')).toBe('false');
    expect(parsed.searchParams.get('bitrate')).toBe('500');
    expect(parsed.searchParams.get('fps')).toBe('10');
    expect(parsed.searchParams.get('clarity')).toBe('S');
  });

  it('keeps an existing snap_ name', () => {
    const url = buildDuoPlusControlUrl({ providerDeviceId: 'FpPU2', name: 'snap_custom' });
    expect(new URL(url).searchParams.get('name')).toBe('snap_custom');
  });
});

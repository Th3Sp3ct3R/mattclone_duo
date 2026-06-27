// DuoPlus live-control (focus mode) URL builder.
//
// Reverse-engineered from the real my.duoplus.cn console (2026-06-26). The
// control page is a thin client route — it takes the phone id + render/quality
// params and performs the ARMVM/veRTC connect handshake itself using the
// operator's logged-in DuoPlus session. See docs/duoplus-endpoints-captured.md.
//
// Confirmed live params: id, mid, name, w, h, isMobile, bitrate, fps, clarity.
// `clarity` is pinned to the observed value 'S'; the visible quality knobs are
// the explicit `bitrate` (kbps) and `fps`, which the stream honors directly.

export const DUOPLUS_CONTROL_BASE = 'https://my.duoplus.cn/control';

export const DEFAULT_FOCUS_QUALITY = Object.freeze({
  width: 438,
  height: 905,
  bitrate: 500,
  fps: 10,
  clarity: 'S'
});

// Presets vary bitrate/fps only; clarity stays at the confirmed-good token.
export const DUOPLUS_QUALITY_PRESETS = Object.freeze([
  { id: 'standard', label: 'Standard', bitrate: 500, fps: 10 },
  { id: 'smooth', label: 'Smooth', bitrate: 800, fps: 20 },
  { id: 'hd', label: 'HD', bitrate: 2000, fps: 24 }
]);

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function resolveFocusQuality(input = {}) {
  return {
    width: positiveInt(input.width ?? input.w, DEFAULT_FOCUS_QUALITY.width),
    height: positiveInt(input.height ?? input.h, DEFAULT_FOCUS_QUALITY.height),
    bitrate: positiveInt(input.bitrate, DEFAULT_FOCUS_QUALITY.bitrate),
    fps: positiveInt(input.fps, DEFAULT_FOCUS_QUALITY.fps),
    // clarity is a passthrough token; only 'S' is confirmed, so anything else falls back.
    clarity: input.clarity === 'S' ? 'S' : DEFAULT_FOCUS_QUALITY.clarity
  };
}

function controlName(device = {}, id = '') {
  if (typeof device.name === 'string' && device.name.startsWith('snap_')) return device.name;
  return `snap_${id}`;
}

export function buildDuoPlusControlUrl(device = {}, quality = {}) {
  const id = String(device.providerDeviceId || device.id || '').trim();
  if (!id) return '';
  const q = resolveFocusQuality(quality);
  const params = new URLSearchParams({
    id,
    mid: id,
    name: controlName(device, id),
    w: String(q.width),
    h: String(q.height),
    isMobile: 'false',
    bitrate: String(q.bitrate),
    fps: String(q.fps),
    clarity: q.clarity
  });
  return `${DUOPLUS_CONTROL_BASE}?${params.toString()}`;
}

import { DeviceControlError } from './errors.js';
import { delay } from './timing.js';

// Client for DuoPlus's INTERNAL web API (api.duoplus.cn), which authenticates with
// the short-lived `Authorization` session token captured from a logged-in browser
// (see apps/api/scripts/capture-session.mjs). This is distinct from DuoplusClient,
// which uses the documented OpenAPI (openapi.duoplus.net) + DuoPlus-API-Key.
//
// Use it for capabilities the OpenAPI does NOT expose — notably batchCapture2,
// which returns base64 JPEG frames for many phones in a single call (cheaper and
// faster than per-phone ADB screencap).

const DEFAULT_BASE_URL = 'https://api.duoplus.cn';
const DEFAULT_MIN_DELAY_MS = 350;

export function normalizeCaptures(response = {}) {
  const captures = response?.data?.captures || [];
  return captures
    .map((c) => {
      const imageId = String(c.image_id || c.imageId || '').trim();
      const b64 = String(c.capture || '').trim();
      if (!imageId) return null;
      return {
        imageId,
        status: Number(c.status),
        linkStatus: Number(c.link_status),
        // DuoPlus returns JPEG bytes; expose a ready-to-render data URL.
        dataUrl: b64 ? `data:image/jpeg;base64,${b64}` : '',
        message: String(c.message || '')
      };
    })
    .filter(Boolean);
}

export function listFromDuoPlusInternal(response = {}) {
  const data = response?.data || response;
  if (Array.isArray(data)) return data;
  return data.list || data.records || data.rows || data.items || [];
}

export class DuoplusInternalClient {
  constructor({
    token,
    baseUrl = DEFAULT_BASE_URL,
    minDelayMs = DEFAULT_MIN_DELAY_MS,
    fetchImpl = globalThis.fetch,
    sleep = delay
  } = {}) {
    if (!token) throw new DeviceControlError('Missing DuoPlus session token', { code: 'DUOPLUS_SESSION' });
    if (!fetchImpl) throw new DeviceControlError('Missing fetch implementation', { code: 'DUOPLUS_CONFIG' });
    this.token = token;
    this.baseUrl = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.minDelayMs = Number(minDelayMs ?? DEFAULT_MIN_DELAY_MS);
    this.fetchImpl = fetchImpl;
    this.sleep = sleep;
    this.lastRequestAt = new Map();
  }

  async waitForEndpoint(path) {
    const floor = Math.max(0, this.minDelayMs);
    if (!floor) return;
    const last = this.lastRequestAt.get(path) || 0;
    const waitMs = floor - (Date.now() - last);
    if (waitMs > 0) await this.sleep(waitMs);
    this.lastRequestAt.set(path, Date.now());
  }

  async request(path, body = {}) {
    await this.waitForEndpoint(path);
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: this.token, 'Content-Type': 'application/json', Lang: 'en' },
      body: JSON.stringify(body || {})
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || (typeof data.code === 'number' && data.code !== 200)) {
      throw new DeviceControlError('DuoPlus internal request failed', {
        code: response.status === 401 || data.code === 401 ? 'DUOPLUS_SESSION_EXPIRED' : 'DUOPLUS_INTERNAL_FAILED',
        details: { status: response.status, path, code: data.code, message: data.message }
      });
    }
    return data;
  }

  controlList(options = {}) {
    return this.request('/image/controlList', {
      page: 1,
      pagesize: 20,
      region_type_id: options.regionTypeId || '',
      group_id: options.groupId || 'all',
      keyword: options.keyword || ''
    });
  }

  listImages(options = {}) {
    return this.request('/image/list', {
      page: Number(options.page || 1),
      pagesize: Number(options.pagesize || 20),
      group_id: options.groupId || 'all',
      fid: options.fid || '-1',
      link_status: options.linkStatus || ['0', '1', '2', '4']
    });
  }

  // Returns base64 JPEG frames for the given phones in a single call.
  batchCapture(imageIds = [], { width = 320, height = 320, quality = 20, supplierId = 1 } = {}) {
    return this.request('/image/batchCapture2', {
      image_ids: imageIds,
      width,
      height,
      quality,
      supplier_id: supplierId
    });
  }

  batchHeartbeat(imageIds = [], type = 1) {
    return this.request('/image/batchHeartbeat', { image_ids: imageIds, type });
  }

  // --- Live-control handshake (see docs/duoplus-endpoints-captured.md §3) -----
  // The browser runs startCheck -> start -> connect -> connectTokenShared, then
  // hands the resulting serverToken to the RedFinger `BgsSdk` web SDK
  // (BgsSdk.initPhone / startPhone), which opens the ByteDance VeRTC stream.

  // Pre-flight. Returns route_list (mobnow.net edges) + video_stream_support.
  // Does not boot or lease the phone, so it is safe to call speculatively.
  startCheck(imageId) {
    return this.request('/image/startCheck', { image_id: String(imageId || '') });
  }

  // Leases/boots the phone. Returns { need_waiting, task_progress,
  // deduction_type, duration_seconds }. This is metered on control time — only
  // call when a control session is actually intended.
  start(imageId, { fixedType = 1 } = {}) {
    return this.request('/image/start', { image_id: String(imageId || ''), fixed_type: fixedType });
  }

  // Returns the ARMVM `resultInfo` token: control gateway, merchantInfo
  // (appkey/appSecret), sessionId, padCode. Consumed by BgsSdk.initPhone.
  connect(imageId) {
    return this.request('/image/connect', { image_id: String(imageId || '') });
  }

  // Returns the serverToken(s) that BgsSdk.startPhone consumes, keyed to a
  // client-generated `uuid` (the same uuid the browser uses to mint its
  // clientToken). Pass a single image_id for single-phone control.
  connectTokenShared(imageIds = [], uuid) {
    if (!uuid) throw new DeviceControlError('connectTokenShared requires a uuid', { code: 'DUOPLUS_CONFIG' });
    const ids = Array.isArray(imageIds) ? imageIds : [imageIds];
    return this.request('/image/connectTokenShared', { image_ids: ids.map((id) => String(id)), uuid: String(uuid) });
  }

  // Per-phone control-session keepalive. type 1 = active control, 3 = background.
  heartbeat(imageId, type = 1) {
    return this.request('/image/heartbeat', { image_id: String(imageId || ''), type: Number(type) });
  }

  async captureFrames(imageIds = [], options = {}) {
    return normalizeCaptures(await this.batchCapture(imageIds, options));
  }
}

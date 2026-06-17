export const SUPPORTED_PLATFORMS = new Set(['instagram', 'tiktok']);

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

export function normalizeUsername(value) {
  return normalizeLower(value).replace(/^@+/, '');
}

export function slugify(value, fallback = 'legacy') {
  const slug = normalizeLower(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'y'].includes(normalizeLower(value));
}

export function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== '')
  );
}

export function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((entry) => entry !== null && entry !== undefined);
  return [value];
}

export function parseVector(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  const normalized = String(value).replace(/^\[/, '').replace(/\]$/, '');
  if (!normalized.trim()) return [];
  return normalized
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter(Number.isFinite);
}

export function mapAccountStatus(row = {}) {
  if (row.archived_at) return 'retired';
  const status = normalizeLower(row.status || row.login_status || row.profile_setup_status);
  if (['checkpoint', 'checkpointed', 'challenge_required'].includes(status)) return 'checkpointed';
  if (['banned', 'disabled'].includes(status)) return 'banned';
  if (['failed_login', 'paused', 'quarantine', 'cooldown', 'error'].includes(status)) return 'cooldown';
  if (['logging_in', 'pending', 'logged_out'].includes(status)) return 'logging_in';
  if (['logged_in', 'active', 'healthy'].includes(status)) return 'active';
  return 'new';
}

export function mapDeviceStatus(value) {
  const status = normalizeLower(value);
  if (['running', 'active', 'online', '1'].includes(status)) return 'running';
  if (['starting', 'booting'].includes(status)) return 'starting';
  if (['provisioning', 'creating'].includes(status)) return 'provisioning';
  if (['unhealthy', 'error', 'failed', '-1'].includes(status)) return 'unhealthy';
  if (['retired', 'archived'].includes(status)) return 'retired';
  return 'stopped';
}

export function mapPostStatus(value) {
  const status = normalizeLower(value);
  if (['pending', 'scheduled', 'queued', 'ready'].includes(status)) return 'queued';
  if (['prestaged', 'staging'].includes(status)) return 'staging';
  if (['running', 'posting', 'in_progress'].includes(status)) return 'posting';
  if (['posted', 'completed', 'success', 'succeeded'].includes(status)) return 'posted';
  if (['failed', 'error'].includes(status)) return 'failed';
  if (['cancelled', 'canceled', 'inactive'].includes(status)) return 'cancelled';
  return 'draft';
}

export function mapContentStatus(value) {
  const status = normalizeLower(value);
  if (['downloaded', 'scraped', 'ready'].includes(status)) return 'downloaded';
  if (['queued', 'pending'].includes(status)) return 'queued';
  if (['used', 'posted', 'completed'].includes(status)) return 'used';
  if (['rejected', 'failed', 'error'].includes(status)) return 'rejected';
  return 'discovered';
}

export function mapTransformStatus(value) {
  const status = normalizeLower(value);
  if (['completed', 'done', 'success'].includes(status)) return 'completed';
  if (['processing', 'running'].includes(status)) return 'processing';
  if (['failed', 'error'].includes(status)) return 'failed';
  return 'queued';
}

export function platformOrNull(value) {
  const platform = normalizeLower(value);
  return SUPPORTED_PLATFORMS.has(platform) ? platform : null;
}

export function legacyKey(tableName, id) {
  return `${tableName}:${id}`;
}

export function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? '';
}

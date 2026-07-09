/**
 * Provider Display Helper
 * =======================
 *
 * Single source of truth for how a backend provider code (`vmos`, `duoplus`,
 * any future provider) is presented to the FRONT END operator view.
 *
 * Goal: the operator dashboard never sees the literal provider code or the
 * supplier name. The frontend reads `providerDisplay` and `tierDisplay` only;
 * the raw `providerCode` is admin/debug-only and gated.
 *
 * What it does:
 * - Maps provider codes → cosmetic names ("vmos" → "Android", etc.)
 * - Maps provider codes → tier ("vmos" → "android", "duoplus" → "iphone")
 * - Maps provider codes → fleet groups for filter buttons
 * - All labels are env-overridable so a tenant can re-brand without code changes
 *
 * Env overrides (any subset; defaults shown):
 *   PROVIDER_LABEL_VMOS=Android
 *   PROVIDER_LABEL_DUOPLUS=iPhone
 *   PROVIDER_TIER_VMOS=android
 *   PROVIDER_TIER_DUOPLUS=ios
 *   PROVIDER_FLEET_LABEL=Device Pool
 */

const DEFAULT_LABEL = {
  vmos: 'Android',
  duoplus: 'iPhone'
};

const DEFAULT_TIER = {
  vmos: 'android',
  duoplus: 'ios'
};

const UNKNOWN_PROVIDER_LABEL = 'Phone';
const UNKNOWN_TIER = 'unknown';

function resolveLabel(providerCode) {
  const code = String(providerCode || '').trim().toLowerCase();
  if (!code) return UNKNOWN_PROVIDER_LABEL;
  const envKey = `PROVIDER_LABEL_${code.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) return envVal;
  return DEFAULT_LABEL[code] || code;
}

function resolveTier(providerCode) {
  const code = String(providerCode || '').trim().toLowerCase();
  if (!code) return UNKNOWN_TIER;
  const envKey = `PROVIDER_TIER_${code.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) return envVal;
  return DEFAULT_TIER[code] || UNKNOWN_TIER;
}

function prettyTier(tier) {
  if (!tier) return UNKNOWN_TIER;
  if (tier === 'ios') return 'iOS';
  if (tier === 'android') return 'Android OS';
  // Custom tiers (env-overridden) get a capitalized fallback
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Compute display fields for a single device.
 *
 * Returns:
 *   providerCode:    raw provider code (admin/debug only — gate at API layer)
 *   providerDisplay: cosmetic label ("iPhone", "Android", or env override)
 *   tier:            normalized tier key ("ios", "android")
 *   tierDisplay:     pretty tier label ("iOS", "Android OS")
 *   displayLabel:    best operator-facing row title:
 *                      nickname → name → "Phone <last-4-of-id>" fallback
 *   deviceModel:     raw device model string from runtime/provisioning ("Pixel 7")
 *   fleetGroup:      grouping key for filter buttons ("tier" by default)
 *
 * @param {Object} device — Mongo EngineDevice document (plain object ok)
 */
export function toDeviceDisplay(device = {}) {
  const code = String(device.provider || '').trim().toLowerCase();
  const providerDisplay = resolveLabel(code);
  const tier = resolveTier(code);
  const last4 = String(device.providerDeviceId || '').slice(-4) || '0000';
  const fallback = `Phone ${last4}`;

  const displayLabel =
    String(device.nickname || '').trim()
    || String(device.name || '').trim()
    || fallback;

  return {
    providerCode: code,
    providerDisplay,
    tier,
    tierDisplay: prettyTier(tier),
    displayLabel,
    deviceModel: String(device.providerMeta?.deviceModel || device.runtime?.deviceModel || '').trim(),
    fleetGroup: tier
  };
}

/**
 * Group a list of devices by `fleetGroup` (tier by default), providing the
 * label and the count for that group. Used by the frontend to render filter
 * buttons dynamically — no hard-coded VMOS / DuoPlus references.
 *
 * @param {Array<Object>} devices
 * @returns {Array<{tierKey: string, tierLabel: string, count: number}>}
 */
export function groupDevicesByFleet(devices = []) {
  const grouped = new Map();
  for (const device of devices) {
    const d = toDeviceDisplay(device);
    if (!grouped.has(d.fleetGroup)) {
      grouped.set(d.fleetGroup, { tierKey: d.fleetGroup, tierLabel: d.tierDisplay, count: 0 });
    }
    grouped.get(d.fleetGroup).count += 1;
  }
  return [...grouped.values()];
}

/**
 * Map a tier key → tier label (frontend-readable). Used when the FE only knows
 * the tier (e.g., it got it from a filter button click earlier and persisted
 * it without the full device DTO).
 */
export function tierLabel(tierKey) {
  return prettyTier(String(tierKey || '').toLowerCase());
}

/**
 * Singular label for a fleet group (used as button hover text and aria-labels).
 */
export function fleetGroupLabel() {
  return process.env.PROVIDER_FLEET_LABEL || 'Device Pool';
}

export const DEVICE_POOL_LABEL = fleetGroupLabel();

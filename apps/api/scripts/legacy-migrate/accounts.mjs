import { EngineAccount } from '@julio/api/models/engine-account';

import { readTable } from './db.mjs';
import {
  compactObject,
  firstValue,
  legacyKey,
  mapAccountStatus,
  normalizeText,
  normalizeUsername,
  slugify,
  toDate,
  toNumber
} from './maps.mjs';
import { bulkWriteIfAny, recordSummary, summarizeBulkResult } from './state.mjs';

export async function migrateAccounts(client, state) {
  const [instagramAccounts, igAccounts, accounts, tiktokAccounts] = await Promise.all([
    readTable(client, 'instagram_accounts', { orderBy: 'id' }),
    readTable(client, 'ig_accounts', { orderBy: 'id' }),
    readTable(client, 'accounts', { orderBy: 'id' }),
    readTable(client, 'tiktok_accounts', { orderBy: 'id' })
  ]);
  const candidates = new Map();

  for (const row of instagramAccounts) mergeCandidate(candidates, buildInstagramAccountDoc(row), 1);
  for (const row of igAccounts) mergeCandidate(candidates, buildIgAccountDoc(row, state), 2);
  for (const row of accounts) mergeCandidate(candidates, buildAccountDoc(row, state), 3);
  for (const row of tiktokAccounts) mergeCandidate(candidates, buildTiktokAccountDoc(row, state), 3);

  const docs = [...candidates.values()].map((entry) => entry.doc).filter((doc) => doc.credentials.username);
  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { platform: doc.platform, 'credentials.username': doc.credentials.username },
      update: { $set: doc },
      upsert: true
    }
  }));
  const result = await bulkWriteIfAny(EngineAccount, operations);
  await hydrateAccountMaps(state, docs, { instagramAccounts, igAccounts, accounts, tiktokAccounts });
  recordSummary(state, 'engine_accounts', {
    read: instagramAccounts.length + igAccounts.length + accounts.length + tiktokAccounts.length,
    deduped: docs.length,
    ...summarizeBulkResult(result)
  });
}

function buildInstagramAccountDoc(row) {
  const username = normalizeUsername(row.username);
  if (!username) return null;
  return {
    platform: 'instagram',
    status: row.session_stale ? 'cooldown' : 'active',
    credentials: {
      username,
      password: normalizeText(row.ig_password),
      email: '',
      emailPassword: '',
      immutableUserId: normalizeText(row.instagram_user_id)
    },
    profile: {
      displayName: '',
      bio: normalizeText(row.bio),
      avatarUrl: normalizeText(row.profile_picture_url),
      nicheKey: '',
      personaKey: normalizeText(row.account_role)
    },
    assignedDeviceId: null,
    lastSeenProxyId: null,
    session: {
      cookies: row.cookies || {},
      tokens: compactObject({
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenExpiresAt: row.token_expires_at
      }),
      deviceFingerprint: row.device_profile || {},
      twoFactorState: row['2fa_required'] ? 'required' : '',
      challengeReason: normalizeText(row.last_session_error),
      capturedAt: toDate(row.last_session_check || row.updated_at)
    },
    health: {
      lastLoginCheckAt: toDate(row.last_session_check),
      lastHealthyAt: row.session_stale ? null : toDate(row.updated_at),
      lastFailureReason: normalizeText(row.last_session_error),
      consecutiveFailures: toNumber(row.session_error_count, 0)
    },
    tags: ['instagram', 'legacy-instagram-accounts', normalizeText(row.account_role)].filter(Boolean),
    retiredAt: null
  };
}

function buildIgAccountDoc(row, state) {
  const username = normalizeUsername(row.username);
  if (!username) return null;
  return {
    platform: 'instagram',
    status: mapAccountStatus(row),
    credentials: {
      username,
      password: normalizeText(row.password),
      email: normalizeText(row.email).toLowerCase(),
      emailPassword: normalizeText(row.email_password),
      immutableUserId: normalizeText(row.ig_user_id)
    },
    profile: {
      displayName: normalizeText(row.display_name),
      bio: normalizeText(row.bio),
      avatarUrl: firstValue(row.profile_pic_cdn_url, row.profile_pic_url),
      nicheKey: '',
      personaKey: ''
    },
    assignedDeviceId: state.devicesByTiktokDeviceId.get(String(row.device_id)) || null,
    lastSeenProxyId: state.proxiesByLegacyId.get(String(row.last_seen_proxy_id)) || null,
    session: {
      cookies: row.session_cookies || {},
      tokens: compactObject({ csrfToken: row.csrf_token }),
      deviceFingerprint: row.session_data || {},
      twoFactorState: normalizeText(row.totp_secret) ? 'configured' : '',
      capturedAt: toDate(row.session_expires_at || row.updated_at)
    },
    health: {
      lastLoginCheckAt: toDate(row.updated_at),
      lastHealthyAt: normalizeText(row.login_status) === 'logged_in' ? toDate(row.updated_at) : null,
      lastFailureReason: normalizeText(row.profile_setup_error),
      warmupConfig: compactObject({ dailyActionLimit: row.daily_action_limit })
    },
    tags: ['instagram', 'legacy-ig-accounts'].filter(Boolean),
    retiredAt: null
  };
}

function buildAccountDoc(row, state) {
  const username = normalizeUsername(firstValue(row.username, row.original_username));
  if (!username) return null;
  const nicheKey = slugify(row.niche || row.model_name || '', '');
  return {
    platform: 'instagram',
    status: mapAccountStatus(row),
    credentials: {
      username,
      password: normalizeText(row.password),
      email: normalizeText(row.email).toLowerCase(),
      emailPassword: '',
      immutableUserId: normalizeText(row.instagram_user_id)
    },
    profile: {
      displayName: firstValue(row.current_display_name, row.proposed_display_name, row.model_name),
      bio: firstValue(row.current_bio, row.proposed_bio),
      avatarUrl: firstValue(row.profile_pic_url, row.proposed_profile_pic_url),
      nicheKey,
      personaKey: normalizeText(row.model_name)
    },
    assignedDeviceId: state.devicesByLegacyDeviceId.get(normalizeText(row.device_id)) || null,
    lastSeenProxyId: null,
    session: {
      cookies: {},
      tokens: {},
      deviceFingerprint: row.profile_snapshot || {},
      twoFactorState: normalizeText(row.totp_secret) ? 'configured' : '',
      lastLoginDeviceId: state.devicesByLegacyDeviceId.get(normalizeText(row.device_id)) || null,
      capturedAt: toDate(row.last_verified_at || row.profile_snapshot_at)
    },
    health: {
      lastLoginCheckAt: toDate(row.last_login_attempt),
      lastHealthyAt: ['active', 'warming', 'logged_in'].includes(String(row.status)) ? toDate(row.updated_at) : null,
      lastFailureReason: normalizeText(row.last_login_error || row.profile_last_error || row.last_burn_reason),
      consecutiveFailures: toNumber(row.login_attempts, 0),
      warmupConfig: compactObject({ phase: row.warmup_phase, postsPerDay: row.posts_per_day })
    },
    tags: ['instagram', 'legacy-accounts', nicheKey, row.role, row.app_type].filter(Boolean),
    retiredAt: toDate(row.archived_at)
  };
}

function buildTiktokAccountDoc(row, state) {
  const username = normalizeUsername(row.username);
  if (!username) return null;
  return {
    platform: 'tiktok',
    status: mapAccountStatus(row),
    credentials: {
      username,
      password: normalizeText(row.password),
      email: normalizeText(row.email).toLowerCase(),
      emailPassword: normalizeText(row.email_password),
      immutableUserId: normalizeText(row.tiktok_user_id)
    },
    profile: {
      displayName: '',
      bio: '',
      avatarUrl: normalizeText(row.profile_pic_cdn_url),
      nicheKey: '',
      personaKey: ''
    },
    assignedDeviceId: state.devicesByTiktokDeviceId.get(String(row.device_id)) || null,
    lastSeenProxyId: state.proxiesByLegacyId.get(String(row.last_seen_proxy_id)) || null,
    session: {
      cookies: {},
      tokens: {},
      deviceFingerprint: row.session_data || {},
      capturedAt: toDate(row.updated_at)
    },
    health: {
      lastLoginCheckAt: toDate(row.updated_at),
      lastHealthyAt: normalizeText(row.login_status) === 'logged_in' ? toDate(row.updated_at) : null,
      warmupConfig: row.warmup_config || {}
    },
    tags: ['tiktok', 'legacy-tiktok-accounts'].filter(Boolean),
    retiredAt: null
  };
}

function mergeCandidate(candidates, doc, precedence) {
  if (!doc?.credentials?.username || !doc.platform) return;
  const key = `${doc.platform}:${doc.credentials.username}`;
  const existing = candidates.get(key);
  if (!existing) {
    candidates.set(key, { precedence, doc });
    return;
  }
  candidates.set(key, {
    precedence: Math.max(existing.precedence, precedence),
    doc: precedence >= existing.precedence ? deepMerge(existing.doc, doc) : deepMerge(doc, existing.doc)
  });
}

async function hydrateAccountMaps(state, docs, sources) {
  const filters = docs.map((doc) => ({ platform: doc.platform, 'credentials.username': doc.credentials.username }));
  const migrated = filters.length ? await EngineAccount.find({ $or: filters }).lean() : [];
  for (const doc of migrated) state.accountsByPlatformUsername.set(`${doc.platform}:${doc.credentials.username}`, doc._id);

  for (const row of sources.accounts) mapLegacyAccount(state, 'accounts', row.id, 'instagram', firstValue(row.username, row.original_username));
  for (const row of sources.igAccounts) mapLegacyAccount(state, 'ig_accounts', row.id, 'instagram', row.username);
  for (const row of sources.instagramAccounts) mapLegacyAccount(state, 'instagram_accounts', row.id, 'instagram', row.username);
  for (const row of sources.tiktokAccounts) mapLegacyAccount(state, 'tiktok_accounts', row.id, 'tiktok', row.username);
}

function mapLegacyAccount(state, tableName, id, platform, username) {
  const normalizedUsername = normalizeUsername(username);
  const accountId = state.accountsByPlatformUsername.get(`${platform}:${normalizedUsername}`);
  if (accountId) state.accountsByLegacyKey.set(legacyKey(tableName, id), accountId);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override ?? base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isEmptyValue(value)) continue;
    merged[key] = isPlainObject(value) ? deepMerge(base[key] || {}, value) : value;
  }
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function isEmptyValue(value) {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
}

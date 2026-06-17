import { User } from '@julio/api/models/user';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineNiche } from '@julio/api/models/engine-niche';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';

import { countRows, readTable } from './db.mjs';
import {
  asArray,
  compactObject,
  mapDeviceStatus,
  normalizeLower,
  normalizeText,
  platformOrNull,
  slugify,
  toDate,
  toNumber
} from './maps.mjs';
import { bulkWriteIfAny, recordSummary, summarizeBulkResult } from './state.mjs';

export async function migrateFoundation(client, state) {
  await migrateUsers(client, state);
  await migrateNiches(client, state);
  await migrateDevices(client, state);
  await migrateProxies(client, state);
  await migrateProxyAssignments(client, state);
}

async function migrateUsers(client, state) {
  const rows = await readTable(client, 'users', { orderBy: 'id' });
  const operations = rows
    .filter((row) => normalizeText(row.email))
    .map((row) => ({
      updateOne: {
        filter: { email: normalizeLower(row.email) },
        update: {
          $set: {
            name: normalizeText(row.display_name || row.email),
            email: normalizeLower(row.email),
            passwordHash: normalizeText(row.password_hash),
            role: mapUserRole(row.role),
            lastLoginAt: toDate(row.last_login_at)
          }
        },
        upsert: true
      }
    }));
  const result = await bulkWriteIfAny(User, operations);
  recordSummary(state, 'users', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateNiches(client, state) {
  const [niches, sources] = await Promise.all([
    readTable(client, 'niches', { orderBy: 'id' }),
    readTable(client, 'niche_sources', { orderBy: 'id' })
  ]);
  const sourcesByNicheId = groupBy(sources, (row) => String(row.niche_id));
  const nicheKeyFor = (row) => slugify(row.slug || row.name, `legacy-niche-${row.id}`);
  const operations = niches.map((row) => {
    const key = nicheKeyFor(row);
    return {
      updateOne: {
        filter: { key },
        update: {
          $set: {
            key,
            name: normalizeText(row.name || key),
            description: normalizeText(row.description),
            active: normalizeLower(row.status || 'active') !== 'inactive',
            targetPlatforms: asArray(row.platforms).map(platformOrNull).filter(Boolean),
            sources: buildNicheSources(sourcesByNicheId.get(String(row.id)) || []),
            postingCadence: {
              dailyPostTarget: toNumber(row.daily_post_target, 0),
              contentScoreMin: toNumber(row.content_score_min, 0)
            },
            metadata: compactObject({
              legacyId: row.id,
              keywords: row.keywords || [],
              hashtags: row.hashtags || [],
              seedAccounts: row.seed_accounts || [],
              accountBudgetUsdCents: row.account_budget_usd_cents,
              accountsPerPlatformTarget: row.accounts_per_platform_target
            })
          }
        },
        upsert: true
      }
    };
  });

  const result = await bulkWriteIfAny(EngineNiche, operations);
  const migrated = await EngineNiche.find({ key: { $in: niches.map(nicheKeyFor) } }).lean();
  for (const niche of migrated) state.nichesByKey.set(niche.key, niche._id);
  for (const row of niches) state.nichesByLegacyId.set(String(row.id), state.nichesByKey.get(nicheKeyFor(row)));
  recordSummary(state, 'engine_niches', { read: niches.length, ...summarizeBulkResult(result) });
}

async function migrateDevices(client, state) {
  const [legacyDevices, vmosDevices] = await Promise.all([
    readTable(client, 'devices', { orderBy: 'id' }),
    readTable(client, 'tiktok_devices', {
      where: "lower(coalesce(provider, 'vmos')) = 'vmos'",
      orderBy: 'id'
    })
  ]);
  const docs = [
    ...legacyDevices.map((row) => buildLegacyDeviceDoc(row)),
    ...vmosDevices.map((row) => buildTiktokDeviceDoc(row))
  ].filter((doc) => doc.providerDeviceId);
  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { provider: 'vmos', providerDeviceId: doc.providerDeviceId },
      update: { $set: doc },
      upsert: true
    }
  }));
  const result = await bulkWriteIfAny(EngineDevice, operations);
  const migrated = await EngineDevice.find({
    provider: 'vmos',
    providerDeviceId: { $in: docs.map((doc) => doc.providerDeviceId) }
  }).lean();
  const byProviderId = new Map(migrated.map((doc) => [doc.providerDeviceId, doc._id]));

  for (const row of legacyDevices) {
    const providerDeviceId = normalizeText(row.device_id || row.serial_no);
    if (providerDeviceId) state.devicesByLegacyDeviceId.set(providerDeviceId, byProviderId.get(providerDeviceId));
  }
  for (const row of vmosDevices) {
    const providerDeviceId = normalizeText(row.device_id || row.image_id);
    if (providerDeviceId) state.devicesByTiktokDeviceId.set(String(row.id), byProviderId.get(providerDeviceId));
  }

  recordSummary(state, 'engine_devices', {
    read: legacyDevices.length + vmosDevices.length,
    ...summarizeBulkResult(result)
  });
}

async function migrateProxies(client, state) {
  const rows = await readTable(client, 'proxies', { orderBy: 'id' });
  const operations = rows
    .filter((row) => normalizeText(row.host) && row.port)
    .map((row) => ({
      updateOne: {
        filter: { 'endpoint.host': normalizeText(row.host), 'endpoint.port': toNumber(row.port) },
        update: { $set: buildProxyDoc(row) },
        upsert: true
      }
    }));
  const result = await bulkWriteIfAny(EngineProxy, operations);
  const endpointFilters = rows
    .filter((row) => normalizeText(row.host) && row.port)
    .map((row) => ({ 'endpoint.host': normalizeText(row.host), 'endpoint.port': toNumber(row.port) }));
  const migrated = endpointFilters.length ? await EngineProxy.find({ $or: endpointFilters }).lean() : [];
  const byEndpoint = new Map(migrated.map((doc) => [`${doc.endpoint.host}:${doc.endpoint.port}`, doc._id]));
  for (const row of rows) state.proxiesByLegacyId.set(String(row.id), byEndpoint.get(`${normalizeText(row.host)}:${toNumber(row.port)}`));
  recordSummary(state, 'engine_proxies', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateProxyAssignments(client, state) {
  const sourceCount = await countRows(client, 'proxy_assignments');
  const rows = await readTable(client, 'proxy_assignments', { orderBy: 'id' });
  const operations = rows
    .map((row) => {
      const proxyId = state.proxiesByLegacyId.get(String(row.proxy_id));
      const deviceId = state.devicesByTiktokDeviceId.get(String(row.device_id));
      if (!proxyId) return null;
      const assignedAt = toDate(row.assigned_at) || new Date(0);
      return {
        updateOne: {
          filter: { proxyId, deviceId: deviceId || null, assignedAt },
          update: {
            $set: {
              proxyId,
              deviceId: deviceId || null,
              assignedAt,
              deactivatedAt: toDate(row.deactivated_at),
              reason: normalizeText(row.reason || 'legacy')
            }
          },
          upsert: true
        }
      };
    })
    .filter(Boolean);
  const result = await bulkWriteIfAny(EngineProxyAssignment, operations);
  recordSummary(state, 'engine_proxy_assignments', { read: sourceCount, ...summarizeBulkResult(result) });
}

function buildNicheSources(rows) {
  return rows
    .map((row) => ({
      platform: platformOrNull(row.platform),
      handle: normalizeText(row.value),
      url: normalizeText(row.value).startsWith('http') ? normalizeText(row.value) : '',
      active: row.enabled !== false,
      lastDiscoveredAt: toDate(row.last_scraped_at)
    }))
    .filter((row) => row.platform);
}

function buildLegacyDeviceDoc(row) {
  return {
    provider: 'vmos',
    providerDeviceId: normalizeText(row.device_id || row.serial_no),
    name: normalizeText(row.serial_name || row.remark || row.device_id),
    status: mapDeviceStatus(row.status),
    notes: normalizeText(row.remark),
    runtime: {
      adbAddress: normalizeText(row.adb_address),
      adbPassword: normalizeText(row.adb_password)
    },
    capacity: {
      maxAccounts: toNumber(row.max_accounts, 1),
      activeAccountCount: toNumber(row.active_account_index, 0),
      operationConcurrency: 1
    },
    retiredAt: null
  };
}

function buildTiktokDeviceDoc(row) {
  return {
    provider: 'vmos',
    providerDeviceId: normalizeText(row.device_id || row.image_id),
    name: normalizeText(row.name || row.image_id || row.device_id),
    status: mapDeviceStatus(row.status),
    region: normalizeText(row.area),
    groupName: normalizeText(row.group_name),
    runtime: {
      adbAddress: normalizeText(row.adb_address),
      adbPassword: normalizeText(row.adb_password)
    },
    capacity: {
      maxAccounts: toNumber(row.max_accounts, 1),
      activeAccountCount: toNumber(row.occupancy_count, 0),
      operationConcurrency: 1
    },
    leasedUntil: toDate(row.leased_until),
    leasedBy: normalizeText(row.leased_by),
    notes: normalizeText(row.proxy_url)
  };
}

function buildProxyDoc(row) {
  return {
    label: normalizeText(row.external_id || row.host),
    status: normalizeLower(row.status) === 'retired' ? 'retired' : normalizeLower(row.status) === 'unhealthy' ? 'unhealthy' : 'available',
    endpoint: {
      protocol: normalizeText(row.protocol || 'socks5'),
      host: normalizeText(row.host),
      port: toNumber(row.port),
      username: normalizeText(row.username),
      password: normalizeText(row.password),
      countryCode: normalizeText(row.region).slice(0, 2).toUpperCase()
    },
    provider: normalizeText(row.provider),
    sku: normalizeText(row.ip_type || row.quality_tier),
    expiresAt: toDate(row.lease_expires_at),
    health: {
      lastVerifiedAt: toDate(row.last_verified_at),
      lastFailureReason: normalizeText(row.last_verify_error),
      consecutiveFailures: toNumber(row.consecutive_verify_failures, 0)
    },
    metadata: compactObject({ legacyId: row.id, effectiveIp: row.effective_ip, notes: row.notes })
  };
}

function mapUserRole(role) {
  const normalized = normalizeLower(role);
  if (['su', 'admin', 'contributor', 'user'].includes(normalized)) return normalized;
  if (normalized === 'client') return 'user';
  return 'user';
}

function groupBy(rows, getKey) {
  return rows.reduce((groups, row) => {
    const key = getKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
    return groups;
  }, new Map());
}

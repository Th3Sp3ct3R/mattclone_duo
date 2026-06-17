import { EngineFollowerEdge, EngineFollowerProfile } from '@julio/api/models/engine-follower';
import { EngineScraperSession } from '@julio/api/models/engine-scraper';
import { EngineTarget } from '@julio/api/models/engine-target';

import { forEachTableBatch, readTable } from './db.mjs';
import {
  asArray,
  compactObject,
  firstValue,
  legacyKey,
  normalizeText,
  normalizeUsername,
  parseVector,
  toBoolean,
  toDate,
  toNumber
} from './maps.mjs';
import { bulkWriteIfAny, recordSummary, summarizeBulkResult } from './state.mjs';

export async function migrateNewCollections(client, state) {
  await migrateScraperSessions(client, state);
  await migrateTargets(client, state);
  await migrateFollowerProfiles(client, state);
  await migrateFollowerEdges(client, state);
}

async function migrateScraperSessions(client, state) {
  const [accounts, sessions] = await Promise.all([
    readTable(client, 'scraper_accounts', { orderBy: 'id' }),
    readTable(client, 'scraper_sessions', { orderBy: 'id' })
  ]);
  const docs = [
    ...accounts.map((row) => buildScraperDoc(row, state, 'scraper_accounts')),
    ...sessions.map((row) => buildScraperDoc(row, state, 'scraper_sessions'))
  ].filter((doc) => doc.username);
  const result = await bulkWriteIfAny(
    EngineScraperSession,
    docs.map((doc) => ({
      updateOne: {
        filter: { legacySource: doc.legacySource, legacyId: doc.legacyId },
        update: { $set: doc },
        upsert: true
      }
    }))
  );
  recordSummary(state, 'engine_scraper_sessions', { read: accounts.length + sessions.length, ...summarizeBulkResult(result) });
}

async function migrateTargets(client, state) {
  const summary = { read: 0, matched: 0, modified: 0, upserted: 0 };
  await forEachTableBatch(
    client,
    'target_pool',
    async (rows) => {
      summary.read += rows.length;
      const docs = rows.map(buildTargetDoc).filter(Boolean);
      const result = await bulkWriteIfAny(
        EngineTarget,
        docs.map((doc) => ({
          updateOne: {
            filter: { platform: doc.platform, externalProfileId: doc.externalProfileId, source: doc.source },
            update: { $set: doc },
            upsert: true
          }
        }))
      );
      accumulate(summary, summarizeBulkResult(result));
    },
    { orderBy: 'instagram_id, source' }
  );
  recordSummary(state, 'engine_targets', summary);
}

async function migrateFollowerProfiles(client, state) {
  const [profiles, extended] = await Promise.all([
    readTable(client, 'follower_profiles', { orderBy: 'user_id' }),
    readTable(client, 'follower_extended', { orderBy: 'user_id' })
  ]);
  const extendedByUserId = new Map(extended.map((row) => [String(row.user_id), row]));
  const docs = profiles
    .map((row) => buildFollowerProfileDoc(row, extendedByUserId.get(String(row.user_id))))
    .filter((doc) => doc.externalProfileId && doc.username);
  const result = await bulkWriteIfAny(
    EngineFollowerProfile,
    docs.map((doc) => ({
      updateOne: {
        filter: { platform: doc.platform, externalProfileId: doc.externalProfileId },
        update: { $set: doc },
        upsert: true
      }
    }))
  );
  recordSummary(state, 'engine_follower_profiles', { read: profiles.length, ...summarizeBulkResult(result) });
}

async function migrateFollowerEdges(client, state) {
  const summary = { read: 0, matched: 0, modified: 0, upserted: 0 };
  await forEachTableBatch(
    client,
    'follower_followings',
    async (rows) => {
      summary.read += rows.length;
      const docs = rows
        .map((row) => ({
          platform: 'instagram',
          followerExternalId: normalizeText(row.follower_id),
          followingExternalId: normalizeText(row.following_id),
          followingUsername: normalizeUsername(row.following_username),
          scrapedAt: toDate(row.scraped_at)
        }))
        .filter((doc) => doc.followerExternalId && doc.followingExternalId);
      const result = await bulkWriteIfAny(
        EngineFollowerEdge,
        docs.map((doc) => ({
          updateOne: {
            filter: {
              platform: doc.platform,
              followerExternalId: doc.followerExternalId,
              followingExternalId: doc.followingExternalId
            },
            update: { $set: doc },
            upsert: true
          }
        }))
      );
      accumulate(summary, summarizeBulkResult(result));
    },
    { orderBy: 'follower_id, following_id' }
  );
  recordSummary(state, 'engine_follower_edges', summary);
}

function buildScraperDoc(row, state, legacySource) {
  const username = normalizeUsername(row.username);
  return {
    platform: 'instagram',
    username,
    accountId: state.accountsByPlatformUsername.get(`instagram:${username}`) || null,
    deviceId: state.devicesByLegacyDeviceId.get(normalizeText(row.device_id)) || null,
    status: normalizeText(row.status || 'pending'),
    extractionMethod: normalizeText(row.extraction_method),
    session: compactObject({
      sessionid: row.sessionid,
      csrftoken: row.csrftoken,
      dsUserId: row.ds_user_id,
      igDid: row.ig_did,
      mid: row.mid,
      datr: row.datr,
      rur: row.rur,
      sessionData: row.session_data
    }),
    proxy: {
      type: normalizeText(row.proxy_type),
      host: normalizeText(row.proxy_host),
      port: toNumber(row.proxy_port, null),
      username: normalizeText(row.proxy_username),
      password: normalizeText(row.proxy_password)
    },
    profile: {
      displayName: normalizeText(row.profile_display_name || row.display_name),
      bio: normalizeText(row.profile_bio || row.bio),
      avatarUrl: normalizeText(row.profile_pic_url),
      syncedAt: toDate(row.profile_synced_at)
    },
    extractedAt: toDate(row.extracted_at),
    expiresAt: toDate(row.expires_at),
    lastUsedAt: toDate(row.last_used_at),
    useCount: toNumber(row.use_count, 0),
    errorCount: toNumber(row.error_count, 0),
    consecutiveFailures: toNumber(row.consecutive_failures, 0),
    lastError: normalizeText(row.last_error),
    cooldownUntil: toDate(row.cooldown_until),
    legacySource,
    legacyId: normalizeText(row.id),
    metadata: compactObject({ activeSessionId: row.active_session_id, instagramUserId: row.instagram_user_id })
  };
}

function buildTargetDoc(row) {
  const externalProfileId = normalizeText(row.instagram_id || row.target_user_id || row.username || row.id);
  const source = firstValue(row.source, `legacy:target_pool:${externalProfileId}`);
  if (!externalProfileId || !source) return null;
  return {
    platform: 'instagram',
    externalProfileId,
    username: normalizeUsername(row.username),
    source,
    sourceType: normalizeText(row.source_type),
    sourceValue: normalizeText(row.source_value),
    status: row.converted ? 'converted' : row.enriched ? 'enriched' : 'discovered',
    enriched: toBoolean(row.enriched),
    converted: toBoolean(row.converted),
    conversion: compactObject({
      type: row.conversion_type,
      convertedAt: toDate(row.converted_at),
      confidence: row.conversion_confidence,
      accountId: row.conversion_account_id
    }),
    profile: compactObject({
      fullName: row.full_name,
      bio: firstValue(row.biography, row.bio),
      avatarUrl: row.profile_pic_url,
      avatarUrlHd: row.profile_pic_url_hd,
      email: row.public_email,
      phone: row.contact_phone,
      city: firstValue(row.primary_city, row.city_location),
      country: row.primary_country,
      isPrivate: row.is_private,
      isVerified: row.is_verified,
      isBusiness: row.is_business
    }),
    metrics: {
      followers: toNumber(row.follower_count, null),
      following: toNumber(row.following_count, null),
      media: toNumber(row.media_count, null),
      averageLikes: toNumber(row.avg_likes, null),
      averageComments: toNumber(row.avg_comments, null),
      engagementRate: toNumber(row.engagement_rate, null)
    },
    bioKeywords: asArray(row.bio_keywords).map(normalizeText).filter(Boolean),
    captionKeywords: asArray(row.caption_keywords).map(normalizeText).filter(Boolean),
    categories: asArray(row.categories).map(normalizeText).filter(Boolean),
    embedding: { provider: 'legacy-pgvector', model: 'text-embedding-3-small', vector: parseVector(row.embedding) },
    rawData: row.raw_data || {},
    metadata: compactObject({
      legacyInstagramId: row.instagram_id,
      timesTargeted: row.times_targeted,
      biographyEntities: row.biography_entities,
      totalClipsCount: row.total_clips_count
    }),
    firstSeenAt: toDate(row.first_seen_at || row.created_at),
    enrichedAt: toDate(row.enriched_at)
  };
}

function buildFollowerProfileDoc(row, extended = {}) {
  return {
    platform: 'instagram',
    externalProfileId: normalizeText(row.user_id),
    username: normalizeUsername(row.username),
    bio: normalizeText(row.bio_text),
    niche: normalizeText(row.niche),
    language: normalizeText(row.language),
    geoSignal: normalizeText(row.geo_signal),
    clusterId: normalizeText(row.cluster_id),
    profileCategory: normalizeText(row.profile_category),
    businessCategory: normalizeText(row.business_category),
    flags: {
      isDormant: toBoolean(row.is_dormant),
      isBot: toBoolean(row.is_bot)
    },
    metrics: {
      followers: toNumber(row.followers_count, null),
      following: toNumber(row.following_count, null),
      ffRatio: toNumber(row.ff_ratio, null),
      engagementRate: toNumber(row.engagement_rate, null),
      postFrequency: toNumber(row.post_frequency, null),
      commentCount: toNumber(extended.comment_count, 0)
    },
    bioKeywords: asArray(row.bio_keywords).map(normalizeText).filter(Boolean),
    hashtagsUsed: asArray(extended.hashtags_used).map(normalizeText).filter(Boolean),
    likePatterns: extended.like_patterns || {},
    followedAt: toDate(row.followed_at),
    lastPostAt: toDate(row.last_post_at),
    lastStoryAt: toDate(row.last_story_at),
    lastScannedAt: toDate(extended.last_scanned),
    metadata: compactObject({
      mutualConnections: row.mutual_connections,
      followTriggerType: row.follow_trigger_type,
      followTriggerId: row.follow_trigger_id,
      daysSinceActive: row.days_since_active
    })
  };
}

function accumulate(summary, result) {
  summary.matched += result.matched || 0;
  summary.modified += result.modified || 0;
  summary.upserted += result.upserted || 0;
}

import { EngineDjekxaOrder, EngineExpense } from '@julio/api/models/engine-finance';
import {
  EngineSocialPost,
  EngineSocialProfile,
  EngineSocialScore
} from '@julio/api/models/engine-social';
import { EngineDeviceIdentitySnapshot, EngineTelemetryBaseline } from '@julio/api/models/engine-telemetry';
import { EngineContentChunk, EngineTrend, EngineTrendMatch } from '@julio/api/models/engine-trend';

import { readTable } from './db.mjs';
import {
  compactObject,
  firstValue,
  legacyKey,
  normalizeText,
  normalizeUsername,
  platformOrNull,
  toDate,
  toNumber
} from './maps.mjs';
import { bulkWriteIfAny, recordSummary, summarizeBulkResult } from './state.mjs';

export async function migrateIntelFinanceTelemetry(client, state) {
  await migrateSocialProfiles(client, state);
  await migrateSocialPosts(client, state);
  await migrateSocialScores(client, state);
  await migrateTrends(client, state);
  await migrateContentChunks(client, state);
  await migrateTrendMatches(client, state);
  await migrateFinance(client, state);
  await migrateTelemetry(client, state);
}

async function migrateSocialProfiles(client, state) {
  const [profiles, targets] = await Promise.all([
    readTable(client, 'tiktok_scraped_profiles', { orderBy: 'id' }),
    readTable(client, 'tiktok_targets', { orderBy: 'id' })
  ]);
  const docs = [
    ...profiles.map((row) => ({
      platform: 'tiktok',
      handle: normalizeUsername(row.username),
      externalProfileId: '',
      displayName: normalizeText(row.display_name),
      bio: normalizeText(row.bio),
      avatarUrl: normalizeText(row.profile_pic_url),
      profileUrl: normalizeText(row.profile_url),
      metrics: {
        followers: toNumber(row.follower_count, 0),
        following: toNumber(row.following_count, 0),
        posts: toNumber(row.video_count, 0),
        likes: toNumber(row.heart_count, 0)
      },
      scrapedAt: toDate(row.last_scraped_at || row.created_at),
      metadata: compactObject({
        legacyKey: legacyKey('tiktok_scraped_profiles', row.id),
        verified: row.verified,
        privateAccount: row.private_account,
        nicheId: row.niche_id,
        status: row.status
      })
    })),
    ...targets.map((row) => ({
      platform: 'tiktok',
      handle: normalizeUsername(row.unique_id),
      externalProfileId: normalizeText(row.target_uid),
      displayName: normalizeText(row.nickname),
      bio: normalizeText(row.signature),
      metrics: {
        followers: toNumber(row.follower_count, 0),
        following: toNumber(row.following_count, 0),
        posts: toNumber(row.video_count, 0),
        likes: toNumber(row.heart_count, 0)
      },
      scrapedAt: toDate(row.scraped_at || row.created_at),
      metadata: compactObject({
        legacyKey: legacyKey('tiktok_targets', row.id),
        sourceAccount: row.source_account,
        sourceType: row.source_type,
        region: row.region,
        score: row.score
      })
    }))
  ].filter((doc) => doc.handle);
  const result = await bulkWriteIfAny(
    EngineSocialProfile,
    docs.map((doc) => ({
      updateOne: { filter: { platform: doc.platform, handle: doc.handle }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length
    ? await EngineSocialProfile.find({ $or: docs.map((doc) => ({ platform: doc.platform, handle: doc.handle })) }).lean()
    : [];
  const byHandle = new Map(migrated.map((doc) => [`${doc.platform}:${doc.handle}`, doc._id]));
  for (const row of profiles) state.socialProfilesByLegacyKey.set(legacyKey('tiktok_scraped_profiles', row.id), byHandle.get(`tiktok:${normalizeUsername(row.username)}`));
  for (const row of targets) state.socialProfilesByLegacyKey.set(legacyKey('tiktok_targets', row.id), byHandle.get(`tiktok:${normalizeUsername(row.unique_id)}`));
  recordSummary(state, 'engine_social_profiles', { read: profiles.length + targets.length, ...summarizeBulkResult(result) });
}

async function migrateSocialPosts(client, state) {
  const rows = await readTable(client, 'tiktok_scraped_posts', { orderBy: 'id' });
  const docs = rows
    .map((row) => ({
      platform: 'tiktok',
      profileId: state.socialProfilesByLegacyKey.get(legacyKey('tiktok_scraped_profiles', row.profile_id)) || null,
      externalPostId: normalizeText(row.post_id),
      postUrl: firstValue(row.post_url, `legacy:tiktok_scraped_posts:${row.id}`),
      caption: normalizeText(row.caption),
      mediaUrl: normalizeText(row.video_url || row.media_local_path),
      publishedAt: toDate(row.posted_at),
      metrics: {
        views: toNumber(row.play_count, 0),
        likes: toNumber(row.digg_count, 0),
        comments: toNumber(row.comment_count, 0),
        shares: toNumber(row.share_count, 0)
      },
      scrapedAt: toDate(row.scraped_at || row.created_at),
      metadata: compactObject({
        legacyKey: legacyKey('tiktok_scraped_posts', row.id),
        contentPoolId: row.content_pool_id,
        hashtags: row.hashtags,
        viralityScore: row.virality_score,
        viralityTier: row.virality_tier
      })
    }))
    .filter((doc) => doc.postUrl);
  const result = await bulkWriteIfAny(
    EngineSocialPost,
    docs.map((doc) => ({
      updateOne: { filter: { platform: doc.platform, postUrl: doc.postUrl }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineSocialPost.find({ postUrl: { $in: docs.map((doc) => doc.postUrl) } }).lean() : [];
  const byPostUrl = new Map(migrated.map((doc) => [doc.postUrl, doc._id]));
  for (const row of rows) state.socialPostsByLegacyKey.set(legacyKey('tiktok_scraped_posts', row.id), byPostUrl.get(firstValue(row.post_url, `legacy:tiktok_scraped_posts:${row.id}`)));
  recordSummary(state, 'engine_social_posts', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateSocialScores(client, state) {
  const [profileScores, postScores] = await Promise.all([
    readTable(client, 'tiktok_profile_scores', { orderBy: 'id' }),
    readTable(client, 'tiktok_post_scores', { orderBy: 'id' })
  ]);
  const docs = [
    ...profileScores.map((row) => buildScoreDoc(row, 'profile', state.socialProfilesByLegacyKey.get(legacyKey('tiktok_scraped_profiles', row.profile_id)), 'tiktok_profile_scores')),
    ...postScores.map((row) => buildScoreDoc(row, 'post', state.socialPostsByLegacyKey.get(legacyKey('tiktok_scraped_posts', row.post_id)), 'tiktok_post_scores'))
  ].filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineSocialScore,
    docs.map((doc) => ({
      updateOne: {
        filter: { targetType: doc.targetType, targetId: doc.targetId, 'dimensions.legacyKey': doc.dimensions.legacyKey },
        update: { $set: doc },
        upsert: true
      }
    }))
  );
  recordSummary(state, 'engine_social_scores', { read: profileScores.length + postScores.length, ...summarizeBulkResult(result) });
}

async function migrateTrends(client, state) {
  const rows = await readTable(client, 'tiktok_trends', { orderBy: 'id' });
  const docs = rows.map((row) => ({
    platform: platformOrNull(row.platform) || 'tiktok',
    nicheKey: '',
    title: normalizeText(row.topic || row.slug),
    description: normalizeText(row.summary),
    sourceUrl: '',
    reach: toNumber(row.popularity_metrics?.reach, 0),
    outlierRatio: toNumber(row.relevance_score, 0),
    observedAt: toDate(row.fetched_at || row.created_at),
    metadata: compactObject({ legacyKey: legacyKey('tiktok_trends', row.id), slug: row.slug, expiresAt: row.expires_at })
  }));
  const result = await bulkWriteIfAny(
    EngineTrend,
    docs.map((doc) => ({
      updateOne: { filter: { 'metadata.legacyKey': doc.metadata.legacyKey }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineTrend.find({ 'metadata.legacyKey': { $in: docs.map((doc) => doc.metadata.legacyKey) } }).lean() : [];
  for (const doc of migrated) state.trendsByLegacyId.set(String(doc.metadata.legacyKey).split(':')[1], doc._id);
  recordSummary(state, 'engine_trends', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateContentChunks(client, state) {
  const rows = await readTable(client, 'tiktok_content_chunks', { orderBy: 'id' });
  const docs = rows
    .filter((row) => normalizeText(row.text))
    .map((row) => ({
      sourceMediaId: state.sourceMediaByLegacyKey.get(legacyKey('tiktok_source_media', row.source_id)) || null,
      text: normalizeText(row.text),
      startSeconds: toNumber(row.start_sec, null),
      endSeconds: toNumber(row.end_sec, null),
      metadata: { legacyKey: legacyKey('tiktok_content_chunks', row.id), sourceId: row.source_id, chunkIndex: row.chunk_index }
    }));
  const result = await bulkWriteIfAny(
    EngineContentChunk,
    docs.map((doc) => ({
      updateOne: { filter: { 'metadata.legacyKey': doc.metadata.legacyKey }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineContentChunk.find({ 'metadata.legacyKey': { $in: docs.map((doc) => doc.metadata.legacyKey) } }).lean() : [];
  for (const doc of migrated) state.contentChunksByLegacyKey.set(doc.metadata.legacyKey, doc._id);
  recordSummary(state, 'engine_content_chunks', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateTrendMatches(client, state) {
  const rows = await readTable(client, 'tiktok_match_candidates', { orderBy: 'id' });
  const docs = rows
    .map((row) => {
      const trendId = state.trendsByLegacyId.get(String(row.trend_id));
      const contentChunkId = state.contentChunksByLegacyKey.get(legacyKey('tiktok_content_chunks', row.chunk_id));
      if (!trendId || !contentChunkId) return null;
      return {
        trendId,
        contentChunkId,
        score: toNumber(row.llm_relevance_score ?? row.similarity_score, 0),
        rationale: normalizeText(row.llm_reasoning),
        metadata: { legacyKey: legacyKey('tiktok_match_candidates', row.id), platformHint: row.platform_hint, status: row.status }
      };
    })
    .filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineTrendMatch,
    docs.map((doc) => ({
      updateOne: { filter: { trendId: doc.trendId, contentChunkId: doc.contentChunkId }, update: { $set: doc }, upsert: true }
    }))
  );
  recordSummary(state, 'engine_trend_matches', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateFinance(client, state) {
  const [expenses, orders] = await Promise.all([
    readTable(client, 'expense_log', { orderBy: 'id' }),
    readTable(client, 'djekxa_orders', { orderBy: 'id' })
  ]);
  const expenseDocs = expenses.map((row) => ({
    category: normalizeText(row.category || 'legacy'),
    provider: normalizeText(row.vendor),
    amountCents: toNumber(row.amount_usd_cents, 0),
    currency: 'USD',
    description: normalizeText(row.description),
    accountId: resolveAnyAccount(state, row.account_id),
    deviceId: state.devicesByTiktokDeviceId.get(String(row.device_id)) || null,
    externalReference: firstValue(row.vendor_ref_id, `legacy:expense_log:${row.id}`),
    incurredAt: toDate(row.occurred_at || row.created_at),
    metadata: compactObject({ legacyKey: legacyKey('expense_log', row.id), accountKind: row.account_kind, notes: row.notes })
  }));
  const orderDocs = orders.map((row) => ({
    externalOrderId: firstValue(row.uuid, row.order_number, `legacy:djekxa_orders:${row.id}`),
    platform: inferPlatformFromProduct(row.product_name),
    status: normalizeText(row.djekxa_status || row.import_status || 'imported'),
    priceRub: toNumber(row.total_sum_rub, 0),
    priceUsdCents: toNumber(row.total_sum_usd_cents, 0),
    orderedAt: toDate(row.imported_at || row.created_at),
    metadata: compactObject({ legacyKey: legacyKey('djekxa_orders', row.id), rawOrder: row.raw_order, productName: row.product_name })
  }));
  const expenseResult = await bulkWriteIfAny(
    EngineExpense,
    expenseDocs.map((doc) => ({
      updateOne: { filter: { externalReference: doc.externalReference }, update: { $set: doc }, upsert: true }
    }))
  );
  const orderResult = await bulkWriteIfAny(
    EngineDjekxaOrder,
    orderDocs.map((doc) => ({
      updateOne: { filter: { externalOrderId: doc.externalOrderId }, update: { $set: doc }, upsert: true }
    }))
  );
  recordSummary(state, 'engine_expenses', { read: expenses.length, ...summarizeBulkResult(expenseResult) });
  recordSummary(state, 'engine_djekxa_orders', { read: orders.length, ...summarizeBulkResult(orderResult) });
}

async function migrateTelemetry(client, state) {
  const [identityRows, baselineRows] = await Promise.all([
    readTable(client, 'device_identity_snapshots', { orderBy: 'id' }),
    readTable(client, 'telemetry_baselines', { orderBy: 'id' })
  ]);
  const identities = identityRows
    .map((row) => {
      const deviceId = state.devicesByTiktokDeviceId.get(String(row.device_id));
      const platform = platformOrNull(row.platform);
      if (!deviceId || !platform) return null;
      return {
        deviceId,
        platform,
        observedUsername: normalizeUsername(row.observed_username),
        observedExternalUserId: '',
        confidence: toNumber(row.confidence_pct, 0) / 100,
        source: normalizeText(row.verified_by),
        screenshotUrl: normalizeText(row.screenshot_path),
        rawObservation: compactObject({ legacyKey: legacyKey('device_identity_snapshots', row.id), state: row.observed_state, drifted: row.drifted, notes: row.notes }),
        observedAt: toDate(row.captured_at)
      };
    })
    .filter(Boolean);
  const baselines = baselineRows.map((row) => ({
    scope: row.account_id ? 'account' : 'global',
    accountId: state.accountsByLegacyKey.get(legacyKey('tiktok_accounts', row.account_id)) || null,
    sampleCount: toNumber(row.gesture_count, 0),
    gestures: row.baseline_json || {},
    timing: compactObject({ durationSeconds: row.duration_seconds, label: row.label, legacyKey: legacyKey('telemetry_baselines', row.id) }),
    capturedAt: toDate(row.collected_at)
  }));
  const identityResult = await bulkWriteIfAny(
    EngineDeviceIdentitySnapshot,
    identities.map((doc) => ({
      updateOne: { filter: { 'rawObservation.legacyKey': doc.rawObservation.legacyKey }, update: { $set: doc }, upsert: true }
    }))
  );
  const baselineResult = await bulkWriteIfAny(
    EngineTelemetryBaseline,
    baselines.map((doc) => ({
      updateOne: { filter: { scope: doc.scope, accountId: doc.accountId, capturedAt: doc.capturedAt }, update: { $set: doc }, upsert: true }
    }))
  );
  recordSummary(state, 'engine_device_identity_snapshots', { read: identityRows.length, ...summarizeBulkResult(identityResult) });
  recordSummary(state, 'engine_telemetry_baselines', { read: baselineRows.length, ...summarizeBulkResult(baselineResult) });
}

function buildScoreDoc(row, targetType, targetId, tableName) {
  if (!targetId) return null;
  return {
    targetType,
    targetId,
    score: toNumber(row.composite, 0),
    dimensions: compactObject({
      legacyKey: legacyKey(tableName, row.id),
      tier: row.tier,
      reach: row.score_reach,
      engagement: row.score_engagement,
      velocity: row.score_velocity,
      outlier: row.score_outlier,
      consistency: row.score_consistency,
      loyalty: row.score_loyalty,
      authority: row.score_authority
    }),
    rationale: '',
    scoredAt: toDate(row.scored_at)
  };
}

function resolveAnyAccount(state, id) {
  return (
    state.accountsByLegacyKey.get(legacyKey('accounts', id)) ||
    state.accountsByLegacyKey.get(legacyKey('ig_accounts', id)) ||
    state.accountsByLegacyKey.get(legacyKey('instagram_accounts', id)) ||
    state.accountsByLegacyKey.get(legacyKey('tiktok_accounts', id)) ||
    null
  );
}

function inferPlatformFromProduct(value) {
  const product = normalizeText(value).toLowerCase();
  if (product.includes('tiktok')) return 'tiktok';
  return 'instagram';
}

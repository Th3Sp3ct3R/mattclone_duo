import { EngineContentPoolItem } from '@julio/api/models/engine-niche';
import {
  EngineClip,
  EngineRoutingRule,
  EngineSourceMedia,
  EngineTransform,
  EngineTranscript
} from '@julio/api/models/engine-pipeline';
import { EnginePost } from '@julio/api/models/engine-post';

import { readTable } from './db.mjs';
import {
  asArray,
  compactObject,
  firstValue,
  legacyKey,
  mapContentStatus,
  mapPostStatus,
  mapTransformStatus,
  normalizeText,
  platformOrNull,
  toDate,
  toNumber
} from './maps.mjs';
import { bulkWriteIfAny, recordSummary, summarizeBulkResult } from './state.mjs';

export async function migrateContentAndPosts(client, state) {
  await migrateContentPool(client, state);
  await migrateSourceMedia(client, state);
  await migrateTranscripts(client, state);
  await migrateClips(client, state);
  await migrateTransforms(client, state);
  await migrateRoutingRules(client, state);
  await migratePosts(client, state);
}

async function migrateContentPool(client, state) {
  const rows = await readTable(client, 'content_pool', { orderBy: 'id' });
  const docs = rows
    .map((row) => {
      const nicheId = state.nichesByLegacyId.get(String(row.niche_id));
      const platform = platformOrNull(row.platform);
      if (!nicheId || !platform) return null;
      return {
        nicheId,
        platform,
        sourceUrl: firstValue(row.source_url, `legacy:content_pool:${row.id}`),
        sourceAuthor: normalizeText(row.creator),
        caption: normalizeText(row.caption),
        mediaUrl: normalizeText(row.media_local_path),
        downloadedAt: toDate(row.created_at),
        publishedAt: toDate(row.posted_at),
        score: toNumber(row.score_composite, 0),
        scoreBreakdown: {
          absolute: toNumber(row.score_absolute, 0),
          outlier: toNumber(row.score_outlier, 0),
          trending: toNumber(row.score_trending, 0)
        },
        status: mapContentStatus(row.status),
        metadata: compactObject({
          legacyId: row.id,
          sourceType: row.source_type,
          externalId: row.external_id,
          hashtags: row.hashtags,
          metrics: { views: row.views, likes: row.likes, comments: row.comments, shares: row.shares }
        })
      };
    })
    .filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineContentPoolItem,
    docs.map((doc) => ({
      updateOne: { filter: { sourceUrl: doc.sourceUrl }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineContentPoolItem.find({ sourceUrl: { $in: docs.map((doc) => doc.sourceUrl) } }).lean() : [];
  const bySourceUrl = new Map(migrated.map((doc) => [doc.sourceUrl, doc._id]));
  for (const row of rows) state.contentItemsByLegacyId.set(String(row.id), bySourceUrl.get(firstValue(row.source_url, `legacy:content_pool:${row.id}`)));
  recordSummary(state, 'engine_content_pool_items', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateSourceMedia(client, state) {
  const [igDownloads, tiktokMedia] = await Promise.all([
    readTable(client, 'ig_downloads', { orderBy: 'id' }),
    readTable(client, 'tiktok_source_media', { orderBy: 'id' })
  ]);
  const docs = [
    ...igDownloads.map((row) => buildIgSourceMedia(row)),
    ...tiktokMedia.map((row) => buildTiktokSourceMedia(row, state))
  ];
  const result = await bulkWriteIfAny(
    EngineSourceMedia,
    docs.map((doc) => ({
      updateOne: { filter: { originalUrl: doc.originalUrl }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineSourceMedia.find({ originalUrl: { $in: docs.map((doc) => doc.originalUrl) } }).lean() : [];
  const byOriginalUrl = new Map(migrated.map((doc) => [doc.originalUrl, doc._id]));
  for (const row of igDownloads) state.sourceMediaByLegacyKey.set(legacyKey('ig_downloads', row.id), byOriginalUrl.get(firstValue(row.source_url, `legacy:ig_downloads:${row.id}`)));
  for (const row of tiktokMedia) state.sourceMediaByLegacyKey.set(legacyKey('tiktok_source_media', row.id), byOriginalUrl.get(firstValue(row.url, `legacy:tiktok_source_media:${row.id}`)));
  recordSummary(state, 'engine_source_media', { read: igDownloads.length + tiktokMedia.length, ...summarizeBulkResult(result) });
}

async function migrateTranscripts(client, state) {
  const rows = await readTable(client, 'tiktok_transcripts', { orderBy: 'id' });
  const docs = rows
    .map((row) => {
      const sourceMediaId = state.sourceMediaByLegacyKey.get(legacyKey('tiktok_source_media', row.source_media_id));
      if (!sourceMediaId) return null;
      return {
        sourceMediaId,
        language: normalizeText(row.language || 'en'),
        text: normalizeText(row.full_text),
        provider: normalizeText(row.model_used || 'legacy'),
        segments: asArray(row.segments).map((segment) => ({
          startSeconds: toNumber(segment.start ?? segment.start_sec, 0),
          endSeconds: toNumber(segment.end ?? segment.end_sec, 0),
          text: normalizeText(segment.text)
        }))
      };
    })
    .filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineTranscript,
    docs.map((doc) => ({
      updateOne: { filter: { sourceMediaId: doc.sourceMediaId }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineTranscript.find({ sourceMediaId: { $in: docs.map((doc) => doc.sourceMediaId) } }).lean() : [];
  const bySourceMediaId = new Map(migrated.map((doc) => [String(doc.sourceMediaId), doc._id]));
  for (const row of rows) {
    const sourceMediaId = state.sourceMediaByLegacyKey.get(legacyKey('tiktok_source_media', row.source_media_id));
    if (sourceMediaId) state.transcriptsByLegacyKey.set(legacyKey('tiktok_transcripts', row.id), bySourceMediaId.get(String(sourceMediaId)));
  }
  recordSummary(state, 'engine_transcripts', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateClips(client, state) {
  const [clips, candidates] = await Promise.all([
    readTable(client, 'tiktok_clips', { orderBy: 'id' }),
    readTable(client, 'tiktok_clip_candidates', { orderBy: 'id' })
  ]);
  const docs = [
    ...clips.map((row) => buildClipDoc(row, state, 'tiktok_clips')),
    ...candidates.map((row) => buildCandidateClipDoc(row, state))
  ].filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineClip,
    docs.map((doc) => ({
      updateOne: { filter: { 'metadata.legacyKey': doc.metadata.legacyKey }, update: { $set: doc }, upsert: true }
    }))
  );
  const migrated = docs.length ? await EngineClip.find({ 'metadata.legacyKey': { $in: docs.map((doc) => doc.metadata.legacyKey) } }).lean() : [];
  for (const doc of migrated) state.clipsByLegacyKey.set(doc.metadata.legacyKey, doc._id);
  recordSummary(state, 'engine_clips', { read: clips.length + candidates.length, ...summarizeBulkResult(result) });
}

async function migrateTransforms(client, state) {
  const rows = await readTable(client, 'content_transforms', { orderBy: 'id' });
  const docs = rows
    .map((row) => {
      const sourceMediaId = state.sourceMediaByLegacyKey.get(legacyKey('ig_downloads', row.source_download_id));
      if (!sourceMediaId) return null;
      return {
        sourceMediaId,
        status: mapTransformStatus(row.status),
        recipe: row.transform_spec || {},
        outputStorageKey: normalizeText(row.output_path),
        outputPublicUrl: normalizeText(row.output_path),
        failureReason: normalizeText(row.error),
        completedAt: toDate(row.completed_at),
        metadata: { legacyKey: legacyKey('content_transforms', row.id), inputPaths: row.input_paths }
      };
    })
    .filter(Boolean);
  const result = await bulkWriteIfAny(
    EngineTransform,
    docs.map((doc) => ({
      updateOne: {
        filter: {
          sourceMediaId: doc.sourceMediaId,
          outputStorageKey: doc.outputStorageKey,
          outputPublicUrl: doc.outputPublicUrl
        },
        update: { $set: doc },
        upsert: true
      }
    }))
  );
  recordSummary(state, 'engine_transforms', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migrateRoutingRules(client, state) {
  const rows = await readTable(client, 'content_routing_rules', { orderBy: 'id' });
  const docs = rows
    .map((row) => ({
      name: `${normalizeText(row.source_owner || 'legacy')} -> ${normalizeText(row.target_platform)}`,
      active: row.enabled !== false,
      sourcePlatform: normalizeText(row.source_type || row.source_owner),
      targetPlatform: platformOrNull(row.target_platform),
      nicheKey: '',
      accountSelector: { legacyTargetAccountId: row.target_account_id },
      schedulePolicy: compactObject({
        priority: row.priority,
        captionMode: row.caption_mode,
        legacyKey: legacyKey('content_routing_rules', row.id),
        transformSpec: row.transform_spec
      })
    }))
    .filter((doc) => doc.targetPlatform);
  const result = await bulkWriteIfAny(
    EngineRoutingRule,
    docs.map((doc) => ({
      updateOne: {
        filter: { name: doc.name, targetPlatform: doc.targetPlatform, 'schedulePolicy.legacyKey': doc.schedulePolicy.legacyKey },
        update: { $set: doc },
        upsert: true
      }
    }))
  );
  recordSummary(state, 'engine_routing_rules', { read: rows.length, ...summarizeBulkResult(result) });
}

async function migratePosts(client, state) {
  const [scheduled, tiktokPosts, tiktokIgPosts, postSchedules] = await Promise.all([
    readTable(client, 'scheduled_posts', { orderBy: 'id' }),
    readTable(client, 'tiktok_posts', { orderBy: 'id' }),
    readTable(client, 'tiktok_ig_posts', { orderBy: 'id' }),
    readTable(client, 'posts_schedule', { orderBy: 'id' })
  ]);
  const docs = [
    ...scheduled.map((row) => buildScheduledPost(row, state)),
    ...tiktokPosts.map((row) => buildTiktokPost(row, state)),
    ...tiktokIgPosts.map((row) => buildTiktokIgPost(row, state)),
    ...postSchedules.map((row) => buildLegacyPostSchedule(row, state))
  ].filter(Boolean);
  const result = await bulkWriteIfAny(
    EnginePost,
    docs.map((doc) => ({
      updateOne: { filter: { idempotencyKey: doc.idempotencyKey }, update: { $set: doc }, upsert: true }
    }))
  );
  recordSummary(state, 'engine_posts', {
    read: scheduled.length + tiktokPosts.length + tiktokIgPosts.length + postSchedules.length,
    ...summarizeBulkResult(result)
  });
}

function buildIgSourceMedia(row) {
  return {
    originalUrl: firstValue(row.source_url, `legacy:ig_downloads:${row.id}`),
    publicUrl: firstMediaValue(row.media_urls),
    storageKey: firstMediaValue(row.local_paths),
    mimeType: normalizeText(row.source_type),
    metadata: compactObject({ legacyKey: legacyKey('ig_downloads', row.id), caption: row.caption, hashtags: row.hashtags })
  };
}

function buildTiktokSourceMedia(row, state) {
  return {
    originalUrl: firstValue(row.url, `legacy:tiktok_source_media:${row.id}`),
    publicUrl: normalizeText(row.r2_key || row.local_path),
    storageKey: normalizeText(row.r2_key || row.local_path),
    durationSeconds: toNumber(row.duration_seconds, null),
    metadata: compactObject({
      legacyKey: legacyKey('tiktok_source_media', row.id),
      title: row.title,
      platform: row.platform,
      nicheId: state.nichesByLegacyId.get(String(row.niche_id))
    })
  };
}

function buildClipDoc(row, state, tableName) {
  const sourceMediaId = state.sourceMediaByLegacyKey.get(legacyKey('tiktok_source_media', row.source_media_id));
  if (!sourceMediaId) return null;
  return {
    sourceMediaId,
    title: normalizeText(row.caption || `Legacy clip ${row.id}`),
    startSeconds: 0,
    endSeconds: toNumber(row.duration_sec, 1),
    storageKey: normalizeText(row.r2_key || row.local_path),
    publicUrl: normalizeText(row.r2_key || row.local_path),
    viralScore: 0,
    metadata: { legacyKey: legacyKey(tableName, row.id), candidateId: row.candidate_id, hashtags: row.hashtags }
  };
}

function buildCandidateClipDoc(row, state) {
  const sourceMediaId = state.sourceMediaByLegacyKey.get(legacyKey('tiktok_source_media', row.source_media_id));
  if (!sourceMediaId) return null;
  return {
    sourceMediaId,
    transcriptId: state.transcriptsByLegacyKey.get(legacyKey('tiktok_transcripts', row.transcript_id)) || null,
    title: firstValue(row.hook, row.topic, `Legacy candidate ${row.id}`),
    startSeconds: toNumber(row.start_sec, 0),
    endSeconds: toNumber(row.end_sec, toNumber(row.duration_sec, 1)),
    viralScore: toNumber(row.virality_score, 0),
    rationale: normalizeText(row.llm_reasoning),
    metadata: { legacyKey: legacyKey('tiktok_clip_candidates', row.id), platformHint: row.platform_hint }
  };
}

function buildScheduledPost(row, state) {
  const accountId = resolveInstagramAccount(state, row.account_id);
  if (!accountId) return null;
  const sourceUrl = firstMediaValue(row.source_paths) || `legacy:scheduled_posts:${row.id}`;
  return buildPostDoc(row, {
    platform: 'instagram',
    accountId,
    deviceId: state.devicesByLegacyDeviceId.get(normalizeText(row.device_id)) || null,
    sourceUrl,
    idempotencyKey: legacyKey('scheduled_posts', row.id)
  });
}

function buildTiktokPost(row, state) {
  const accountId = state.accountsByLegacyKey.get(legacyKey('tiktok_accounts', row.account_id));
  if (!accountId) return null;
  return buildPostDoc(row, {
    platform: 'tiktok',
    accountId,
    deviceId: state.devicesByTiktokDeviceId.get(String(row.device_id)) || null,
    sourceUrl: firstValue(row.video_url, row.video_local_path, `legacy:tiktok_posts:${row.id}`),
    idempotencyKey: legacyKey('tiktok_posts', row.id)
  });
}

function buildTiktokIgPost(row, state) {
  const accountId = state.accountsByLegacyKey.get(legacyKey('ig_accounts', row.account_id));
  if (!accountId) return null;
  return buildPostDoc(row, {
    platform: 'instagram',
    accountId,
    deviceId: state.devicesByTiktokDeviceId.get(String(row.device_id)) || null,
    sourceUrl: firstValue(row.video_url, row.video_local_path, `legacy:tiktok_ig_posts:${row.id}`),
    idempotencyKey: legacyKey('tiktok_ig_posts', row.id)
  });
}

function buildLegacyPostSchedule(row, state) {
  const accountId = resolveInstagramAccount(state, row.account_id);
  if (!accountId) return null;
  return buildPostDoc(row, {
    platform: 'instagram',
    accountId,
    deviceId: null,
    sourceUrl: firstValue(row.media_path, `legacy:posts_schedule:${row.id}`),
    idempotencyKey: legacyKey('posts_schedule', row.id)
  });
}

function buildPostDoc(row, context) {
  return {
    platform: context.platform,
    status: mapPostStatus(row.status || (row.is_executed ? 'posted' : 'queued')),
    accountId: context.accountId,
    deviceId: context.deviceId,
    media: {
      sourceUrl: context.sourceUrl,
      storageKey: normalizeText(row.prestaged_path || row.media_path || row.video_local_path),
      publicUrl: normalizeText(row.post_url || row.video_url),
      mimeType: normalizeText(row.post_type || row.media_type)
    },
    publishOptions: {
      caption: normalizeText(row.caption),
      hashtags: asArray(row.hashtags),
      soundQuery: normalizeText(row.sound_query),
      locationQuery: normalizeText(row.location_query),
      coverFrameIndex: toNumber(row.cover_frame_index, null)
    },
    scheduledAt: toDate(row.scheduled_at || row.schedule_date),
    postedAt: toDate(row.posted_at || row.completed_at || row.last_post_date),
    failure: {
      code: normalizeText(row.failure_type),
      message: normalizeText(row.error || row.last_error || row.failure_reason),
      failedAt: row.error || row.last_error ? toDate(row.updated_at || row.created_at) : null
    },
    externalPostId: normalizeText(row.post_id),
    vmosTaskId: normalizeText(row.duoplus_task_id),
    stagedDevicePath: normalizeText(row.prestaged_path),
    idempotencyKey: context.idempotencyKey
  };
}

function resolveInstagramAccount(state, id) {
  return (
    state.accountsByLegacyKey.get(legacyKey('accounts', id)) ||
    state.accountsByLegacyKey.get(legacyKey('ig_accounts', id)) ||
    state.accountsByLegacyKey.get(legacyKey('instagram_accounts', id)) ||
    null
  );
}

function firstMediaValue(value) {
  const entries = asArray(value);
  const first = entries[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return first.url || first.path || Object.values(first)[0] || '';
  return '';
}

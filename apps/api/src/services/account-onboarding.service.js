import crypto from 'node:crypto';

import { EngineAccount } from '@julio/api/models/engine-account';
import { EnginePost } from '@julio/api/models/engine-post';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';

function normalizeTags(tags = []) {
  return Array.isArray(tags) ? tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [];
}

function buildPostDocument({ account, deviceId, post = {}, idempotencyKey }) {
  return {
    platform: account.platform,
    status: 'queued',
    accountId: account._id,
    deviceId,
    media: {
      sourceUrl: String(post.sourceUrl || post.media?.sourceUrl || '').trim(),
      storageKey: String(post.storageKey || post.media?.storageKey || '').trim(),
      publicUrl: String(post.publicUrl || post.media?.publicUrl || '').trim(),
      mimeType: String(post.mimeType || post.media?.mimeType || '').trim()
    },
    publishOptions: {
      caption: String(post.caption || post.publishOptions?.caption || '').trim(),
      hashtags: normalizeTags(post.hashtags || post.publishOptions?.hashtags),
      soundQuery: String(post.soundQuery || post.publishOptions?.soundQuery || '').trim(),
      locationQuery: String(post.locationQuery || post.publishOptions?.locationQuery || '').trim(),
      coverFrameIndex: post.coverFrameIndex ?? post.publishOptions?.coverFrameIndex ?? null
    },
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
    idempotencyKey
  };
}

function accountPayload(account, deviceId, continuation = null) {
  return {
    accountId: String(account._id),
    platform: account.platform,
    assignedDeviceId: deviceId ? String(deviceId) : null,
    ...(continuation ? { continuation } : {})
  };
}

function postPayload({ post, account, deviceId }) {
  return {
    postId: String(post._id),
    platform: post.platform,
    accountId: String(account._id),
    deviceId: deviceId ? String(deviceId) : null
  };
}

function accountJob({ account, deviceId, jobName, runId, continuation = null }) {
  return {
    queueName: 'engine.account',
    jobName,
    targetType: 'account',
    targetId: account._id,
    payload: accountPayload(account, deviceId, continuation),
    idempotencyKey: `account:onboarding:${runId}:${account._id}:${jobName}`
  };
}

function postJob({ post, account, deviceId, runId }) {
  return {
    queueName: 'engine.post',
    jobName: 'publish',
    targetType: 'post',
    targetId: post._id,
    payload: postPayload({ post, account, deviceId }),
    idempotencyKey: `post:onboarding:${runId}:${post._id}:publish`
  };
}

export async function enqueueAccountOnboarding({
  accountId,
  warmup = false,
  post: postInput = null,
  onboardingKey = ''
} = {}) {
  const account = await EngineAccount.findById(accountId);
  if (!account) throw new Error('Account not found');
  if (account.platform !== 'tiktok') throw new Error('TikTok onboarding is required for this workflow');
  if (!account.assignedDeviceId) throw new Error('Account has no assigned device');

  const deviceId = account.assignedDeviceId;
  const runId = String(onboardingKey || crypto.randomUUID());
  let post = null;
  let continuation = null;

  if (postInput) {
    const postIdempotencyKey = `post:onboarding:${runId}:${account._id}`;
    post = await EnginePost.findOneAndUpdate(
      { idempotencyKey: postIdempotencyKey },
      { $setOnInsert: buildPostDocument({ account, deviceId, post: postInput, idempotencyKey: postIdempotencyKey }) },
      { new: true, upsert: true }
    );
    continuation = postJob({ post, account, deviceId, runId });
  }

  if (warmup) {
    continuation = accountJob({
      account,
      deviceId,
      jobName: 'warmup',
      runId,
      continuation
    });
  }

  continuation = accountJob({
    account,
    deviceId,
    jobName: 'profile-setup',
    runId,
    continuation
  });

  const jobRun = await dispatchEngineJob(
    accountJob({
      account,
      deviceId,
      jobName: 'login',
      runId,
      continuation
    })
  );

  return {
    ok: true,
    account,
    post,
    jobRun,
    onboardingKey: runId
  };
}

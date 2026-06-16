import cron from 'node-cron';

import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineJobRun } from '@julio/api/models/engine-job-run';
import { EngineContentPoolItem, EngineNiche } from '@julio/api/models/engine-niche';
import { EnginePost } from '@julio/api/models/engine-post';
import { EngineTransform } from '@julio/api/models/engine-pipeline';
import { publishJson } from '@julio/api/queue/rabbitmq';
import { enqueueCrossPosts } from '@julio/api/services/cross-post';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { logger } from '@julio/api/logger';

const tasks = [];

async function withMongo(task) {
  if (!env.mongodbUri) return;
  await connectMongo(env.mongodbUri);
  await task();
}

async function enqueueDuePosts() {
  await withMongo(async () => {
    const posts = await EnginePost.find({
      status: 'queued',
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }]
    })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(25)
      .lean();

    await Promise.all(
      posts.map((post) =>
        dispatchEngineJob({
          queueName: 'engine.post',
          jobName: 'publish',
          targetType: 'post',
          targetId: post._id,
          payload: {
            postId: String(post._id),
            platform: post.platform,
            accountId: post.accountId ? String(post.accountId) : null,
            deviceId: post.deviceId ? String(post.deviceId) : null
          },
          idempotencyKey: `post:publish:${post._id}`
        })
      )
    );
  });
}

async function enqueueSessionChecks() {
  await withMongo(async () => {
    const accounts = await EngineAccount.find({ status: { $in: ['active', 'checkpointed'] } })
      .select('_id platform assignedDeviceId')
      .limit(100)
      .lean();
    await Promise.all(
      accounts.map((account) =>
        dispatchEngineJob({
          queueName: 'engine.account',
          jobName: 'health-check',
          targetType: 'account',
          targetId: account._id,
          payload: {
            accountId: String(account._id),
            platform: account.platform,
            assignedDeviceId: account.assignedDeviceId ? String(account.assignedDeviceId) : null
          },
          idempotencyKey: `account:health:${account._id}:${new Date().toISOString().slice(0, 13)}`
        })
      )
    );
  });
}

async function enqueueDeviceChecks() {
  await withMongo(async () => {
    const devices = await EngineDevice.find({ status: 'running' }).select('_id providerDeviceId').limit(100).lean();
    await Promise.all(
      devices.map((device) =>
        dispatchEngineJob({
          queueName: 'engine.device',
          jobName: 'health-check',
          targetType: 'device',
          targetId: device._id,
          payload: { deviceId: String(device._id), providerDeviceId: device.providerDeviceId },
          idempotencyKey: `device:health:${device._id}:${new Date().toISOString().slice(0, 13)}`
        })
      )
    );
  });
}

async function enqueueTransforms() {
  await withMongo(async () => {
    const transforms = await EngineTransform.find({ status: 'queued' }).select('_id').limit(25).lean();
    await Promise.all(
      transforms.map((transform) =>
        dispatchEngineJob({
          queueName: 'engine.transform',
          jobName: 'process',
          targetType: 'transform',
          targetId: transform._id,
          payload: { transformId: String(transform._id) },
          idempotencyKey: `transform:process:${transform._id}`
        })
      )
    );
  });
}

async function enqueueDiscovery() {
  await withMongo(async () => {
    const niches = await EngineNiche.find({ active: true }).select('_id key').limit(100).lean();
    await Promise.all(
      niches.map((niche) =>
        dispatchEngineJob({
          queueName: 'engine.discovery',
          jobName: 'discover',
          targetType: 'niche',
          targetId: niche._id,
          payload: { nicheId: String(niche._id), key: niche.key },
          idempotencyKey: `niche:discover:${niche._id}:${new Date().toISOString().slice(0, 13)}`
        })
      )
    );
  });
}

async function enqueueContentDownloads() {
  await withMongo(async () => {
    const items = await EngineContentPoolItem.find({ status: 'discovered' })
      .sort({ score: -1, createdAt: 1 })
      .limit(env.workerLimits.contentDownloadBatchSize)
      .lean();
    await Promise.all(
      items.map((item) =>
        dispatchEngineJob({
          queueName: 'engine.pipeline',
          jobName: 'download',
          targetType: 'contentPoolItem',
          targetId: item._id,
          payload: { contentPoolItemId: String(item._id), platform: item.platform },
          idempotencyKey: `content-pool:download:${item._id}`
        })
      )
    );
  });
}

async function enqueueCrossPostJobs() {
  await withMongo(async () => {
    const posts = await enqueueCrossPosts({ limit: 25 });
    logger.info(`[cron] cross-post queued ${posts.length} posts`);
  });
}

async function enqueueTrendMatch() {
  await withMongo(async () => {
    await dispatchEngineJob({
      queueName: 'engine.trend',
      jobName: 'match',
      targetType: 'trend',
      payload: {},
      idempotencyKey: `trend:match:${new Date().toISOString().slice(0, 13)}`
    });
  });
}

async function enqueueTrendFeedback() {
  await withMongo(async () => {
    await dispatchEngineJob({
      queueName: 'engine.trend',
      jobName: 'feedback',
      targetType: 'trend',
      payload: {},
      idempotencyKey: `trend:feedback:${new Date().toISOString().slice(0, 10)}`
    });
  });
}

async function enqueueProxyMonitor() {
  await withMongo(async () => {
    await dispatchEngineJob({
      queueName: 'engine.proxy',
      jobName: 'verify-batch',
      targetType: 'proxy',
      payload: {},
      idempotencyKey: `proxy:verify:${new Date().toISOString().slice(0, 13)}`
    });
  });
}

async function republishQueuedJobRuns() {
  await withMongo(async () => {
    const dueRuns = await EngineJobRun.find({
      status: 'queued',
      nextRetryAt: { $ne: null, $lte: new Date() }
    })
      .sort({ nextRetryAt: 1 })
      .limit(50)
      .lean();

    await Promise.all(
      dueRuns.map((run) =>
        publishJson(run.queueName, {
          jobRunId: String(run._id),
          jobName: run.jobName,
          targetType: run.targetType,
          targetId: run.targetId ? String(run.targetId) : null,
          payload: run.payload || {}
        })
      )
    );
  });
}

function schedule(name, expression, task) {
  tasks.push(
    cron.schedule(expression, async () => {
      try {
        await task();
      } catch (err) {
        logger.error(`[cron] ${name} failed`, err);
      }
    })
  );
}

export function startCron() {
  schedule('heartbeat', '*/5 * * * *', () => logger.info('[cron] heartbeat'));
  schedule('engine-posts', '* * * * *', enqueueDuePosts);
  schedule('engine-sessions', '*/30 * * * *', enqueueSessionChecks);
  schedule('engine-devices', '*/30 * * * *', enqueueDeviceChecks);
  schedule('engine-transforms', '* * * * *', enqueueTransforms);
  schedule('engine-discovery', '*/30 * * * *', enqueueDiscovery);
  schedule('engine-content-download', '* * * * *', enqueueContentDownloads);
  schedule('engine-cross-post', '* * * * *', enqueueCrossPostJobs);
  schedule('engine-trend-match', '0 */6 * * *', enqueueTrendMatch);
  schedule('engine-trend-feedback', '30 1 * * *', enqueueTrendFeedback);
  schedule('engine-proxy-monitor', '*/30 * * * *', enqueueProxyMonitor);
  schedule('engine-job-retries', '* * * * *', republishQueuedJobRuns);
}

export function stopCron() {
  for (const t of tasks) t.stop();
  tasks.length = 0;
}

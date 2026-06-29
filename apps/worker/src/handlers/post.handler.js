import { EngineAccount } from '@julio/api/models/engine-account';
import { EnginePost } from '@julio/api/models/engine-post';
import { getPlatformAdapter } from '@julio/automation';
import { stageMediaForDevice } from '@julio/media';

import { runEngineJob } from '../engine-job-runner.js';
import { emitDeviceEvent } from '../device-event-emitter.js';
import { assertDeviceReachable, buildHumanContext, getProvider, withDeviceLease } from './worker-context.js';
import { PreflightError, checkpointReasonForPreflightCode, runJobPreflight } from './preflight.js';
import { hydrateAccountSecrets } from './secret-resolver.js';

export async function handlePostJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }, jobRun) => {
    const post = await EnginePost.findById(targetId);
    if (!post) throw new Error('Post not found');
    if (jobName === 'cancel') {
      await EnginePost.findByIdAndUpdate(targetId, { status: 'cancelled', cancelledAt: new Date() });
      return { cancelled: true };
    }

    const account = await EngineAccount.findById(post.accountId);
    if (!account) throw new Error('Post account not found');
    const deviceId = post.deviceId || account.assignedDeviceId;
    if (!deviceId) throw new Error('Post has no device and account has no assigned device');

    return withDeviceLease(deviceId, async (device) => {
      const provider = getProvider(device.provider);
      const event = (message, data = {}) =>
        emitDeviceEvent({
          deviceId: device._id,
          source: 'post',
          jobRunId: jobRun._id,
          jobName,
          message,
          data: { postId: String(post._id), accountId: String(account._id), platform: post.platform, ...data }
        });
      await assertDeviceReachable(provider, device, (message, data = {}) =>
        emitDeviceEvent({
          deviceId: device._id,
          level: 'error',
          source: 'post',
          jobRunId: jobRun._id,
          jobName,
          message,
          data: { postId: String(post._id), accountId: String(account._id), platform: post.platform, ...data }
        })
      );
      try {
        await runJobPreflight({ provider, device, account, post, platform: post.platform || account.platform });
      } catch (err) {
        if (err instanceof PreflightError) {
          const checkpointReason = checkpointReasonForPreflightCode(err.code);
          await event('post preflight failed', { code: err.code, reason: checkpointReason });
          await EngineAccount.findByIdAndUpdate(account._id, {
            status: 'checkpointed',
            checkpointReason,
            'health.lastFailureReason': err.message,
            'health.consecutiveFailures': Number(account.health?.consecutiveFailures || 0) + 1
          });
          await EnginePost.findByIdAndUpdate(post._id, {
            status: 'failed',
            failure: { code: err.code, message: err.message, failedAt: new Date() }
          });
        }
        throw err;
      }
      const controller = provider.createDirectController(device.providerDeviceId);
      const { actor } = await buildHumanContext({
        controller,
        accountId: account._id,
        deviceId: device._id
      });
      await event('staging media for publish');
      const stagedMedia = await stageMediaForDevice(post.media || {});

      await EnginePost.findByIdAndUpdate(post._id, {
        status: 'posting',
        media: {
          ...(post.media?.toObject?.() || post.media || {}),
          sourceUrl: stagedMedia.sourceUrl || post.media?.sourceUrl || '',
          storageKey: stagedMedia.storageKey || post.media?.storageKey || '',
          publicUrl: stagedMedia.publicUrl,
          mimeType: stagedMedia.mimeType || post.media?.mimeType || ''
        },
        deviceId: device._id,
        failure: {}
      });
      await event('media staged for publish', { publicUrl: stagedMedia.publicUrl });

      const publishOptions = post.publishOptions || {};
      const adapter = getPlatformAdapter(post.platform || account.platform);
      const runtimeAccount = await hydrateAccountSecrets(account);
      await event('publishing post started', { soundQuery: publishOptions.soundQuery || '' });
      const result = await adapter.publish(controller, post, runtimeAccount, {
        actor,
        stagedMedia,
        onEvent: (message, data = {}) => event(message, data)
      });

      await EnginePost.findByIdAndUpdate(post._id, {
        status: result.success === false ? 'failed' : 'posted',
        postedAt: result.success === false ? null : new Date(),
        externalPostId: result.taskName || result.externalPostId || '',
        vmosTaskId: result.task?.taskId ? String(result.task.taskId) : result.taskName || '',
        failure:
          result.success === false
            ? { code: 'PUBLISH_FAILED', message: result.reason || 'Publish failed', failedAt: new Date() }
            : {}
      });
      await event(result.success === false ? 'post publish failed' : 'post published', {
        status: result.status || '',
        reason: result.reason || ''
      });
      return result;
    });
  });
}

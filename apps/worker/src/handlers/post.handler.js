import { EngineAccount } from '@julio/api/models/engine-account';
import { EnginePost } from '@julio/api/models/engine-post';
import { publishInstagramReel, publishTikTokVideo } from '@julio/automation';
import { stageMediaForDevice } from '@julio/media';

import { runEngineJob } from '../engine-job-runner.js';
import { getProvider, withDeviceLease } from './worker-context.js';

export async function handlePostJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }) => {
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
      const provider = getProvider();
      const controller = provider.createDirectController(device.providerDeviceId);
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

      const publishOptions = post.publishOptions || {};
      const result =
        post.platform === 'instagram'
          ? await publishInstagramReel(controller, {
              videoUrl: stagedMedia.publicUrl,
              caption: publishOptions.caption,
              hashtags: publishOptions.hashtags || []
            })
          : await publishTikTokVideo({
              client: provider.client,
              padCode: device.providerDeviceId,
              videoUrl: stagedMedia.publicUrl,
              caption: publishOptions.caption,
              hashtags: publishOptions.hashtags || [],
              coverTime: publishOptions.coverFrameIndex || 0,
              musicId: publishOptions.soundQuery || '',
              taskName: `julio-post-${post._id}-${Date.now()}`
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
      return result;
    });
  });
}

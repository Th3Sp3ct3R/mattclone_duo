import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineContentPoolItem, EngineNiche } from '@julio/api/models/engine-niche';
import { EnginePost } from '@julio/api/models/engine-post';

function buildCaption(item) {
  const caption = item.caption || '';
  const hashtags = item.metadata?.hashtags || [];
  return { caption, hashtags };
}

export async function enqueueCrossPosts({ limit = 25 } = {}) {
  const niches = await EngineNiche.find({ active: true }).lean();
  const created = [];

  for (const niche of niches) {
    const item = await EngineContentPoolItem.findOne({
      nicheId: niche._id,
      status: 'downloaded',
      downloadedAt: { $ne: null }
    }).sort({ score: -1, downloadedAt: 1 });
    if (!item) continue;

    const platforms = niche.targetPlatforms?.length ? niche.targetPlatforms : [item.platform].filter(Boolean);
    for (const platform of platforms) {
      if (created.length >= limit) break;
      const account = await EngineAccount.findOne({
        platform,
        status: 'active',
        assignedDeviceId: { $ne: null },
        'profile.nicheKey': niche.key
      }).sort({ 'health.lastHealthyAt': -1, updatedAt: 1 });
      if (!account) continue;

      const { caption, hashtags } = buildCaption(item);
      const post = await EnginePost.findOneAndUpdate(
        { idempotencyKey: `content-pool:${item._id}:${platform}` },
        {
          platform,
          status: 'queued',
          accountId: account._id,
          deviceId: account.assignedDeviceId,
          contentPoolItemId: item._id,
          media: {
            sourceUrl: item.mediaUrl,
            storageKey: item.storageKey,
            publicUrl: item.metadata?.publicUrl || item.mediaUrl,
            mimeType: item.metadata?.contentType || 'video/mp4'
          },
          publishOptions: { caption, hashtags },
          scheduledAt: new Date(),
          idempotencyKey: `content-pool:${item._id}:${platform}`
        },
        { upsert: true, new: true }
      );
      created.push(post);
    }

    if (created.length) {
      await EngineContentPoolItem.findByIdAndUpdate(item._id, { status: 'queued' });
    }
  }

  return created;
}

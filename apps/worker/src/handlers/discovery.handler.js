import { EngineContentPoolItem, EngineNiche } from '@julio/api/models/engine-niche';
import { discoverNicheContent } from '@julio/intelligence';

import { runEngineJob } from '../engine-job-runner.js';

async function buildCreatorBaselines(nicheId) {
  const rows = await EngineContentPoolItem.aggregate([
    { $match: { nicheId } },
    { $group: { _id: '$sourceAuthor', views: { $avg: '$metadata.raw.metrics.views' }, likes: { $avg: '$metadata.raw.metrics.likes' } } }
  ]);
  return Object.fromEntries(rows.filter((row) => row._id).map((row) => [row._id, row]));
}

export async function handleDiscoveryJob(payload) {
  return runEngineJob(payload, async ({ targetId, payload: jobPayload }) => {
    const niche = await EngineNiche.findById(targetId || jobPayload?.nicheId).lean();
    if (!niche) throw new Error('Niche not found');
    const existing = await EngineContentPoolItem.find({ nicheId: niche._id }).select('sourceUrl').lean();
    const baselines = await buildCreatorBaselines(niche._id);
    const result = await discoverNicheContent({
      niche,
      existingSourceUrls: new Set(existing.map((item) => item.sourceUrl)),
      creatorBaselines: baselines
    });

    const created = [];
    for (const item of result.items) {
      const doc = await EngineContentPoolItem.findOneAndUpdate(
        { sourceUrl: item.sourceUrl },
        {
          nicheId: niche._id,
          platform: item.platform,
          sourceUrl: item.sourceUrl,
          sourceAuthor: item.sourceAuthor,
          caption: item.caption,
          mediaUrl: item.mediaUrl,
          score: item.score,
          scoreBreakdown: item.scoreBreakdown,
          status: 'discovered',
          metadata: item.metadata
        },
        { upsert: true, new: true }
      );
      created.push(String(doc._id));
    }

    await EngineNiche.updateOne({ _id: niche._id }, { $set: { 'sources.$[].lastDiscoveredAt': new Date() } }).catch(() => {});
    return { created: created.length, errors: result.errors };
  });
}

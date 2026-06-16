import { EngineContentPoolItem, EngineNiche } from '@julio/api/models/engine-niche';
import {
  EngineClip,
  EngineRoutingRule,
  EngineSourceMedia,
  EngineTransform,
  EngineTranscript
} from '@julio/api/models/engine-pipeline';

const nicheSeeds = [
  ['ai-music', 'AI Music', 'AI music experiments, hooks, and creator workflows.'],
  ['fitness-clips', 'Fitness Clips', 'Short-form transformation and workout content.'],
  ['luxury-travel', 'Luxury Travel', 'Aspirational destinations and hotel content.'],
  ['street-food', 'Street Food', 'High-retention food prep and market clips.']
];

export async function seedContent() {
  const niches = await EngineNiche.insertMany(
    nicheSeeds.map(([key, name, description]) => ({
      key,
      name,
      description,
      active: true,
      targetPlatforms: ['tiktok', 'instagram'],
      sources: [
        {
          platform: key === 'street-food' ? 'instagram' : 'tiktok',
          handle: `${key}-source`,
          url: `https://example.com/${key}`,
          active: true,
          lastDiscoveredAt: new Date()
        }
      ],
      postingCadence: { postsPerDay: 3, quietHours: ['01:00', '08:00'] }
    }))
  );

  const contentItems = await EngineContentPoolItem.insertMany(
    Array.from({ length: 12 }).map((_, index) => {
      const niche = niches[index % niches.length];
      return {
        nicheId: niche._id,
        platform: index % 4 === 0 ? 'instagram' : 'tiktok',
        sourceUrl: `https://example.com/source/${niche.key}/${index + 1}`,
        sourceAuthor: `@${niche.key.replace('-', '')}creator${index + 1}`,
        caption: `Seed content idea ${index + 1} for ${niche.name}.`,
        mediaUrl: `https://cdn.example.com/seed/content-${index + 1}.mp4`,
        storageKey: `seed/content/${index + 1}.mp4`,
        downloadedAt: index % 3 === 0 ? null : new Date(),
        score: 72 + index,
        status: index % 3 === 0 ? 'discovered' : 'downloaded',
        scoreBreakdown: { retention: 0.72 + index / 100, novelty: 0.64, sourceAuthority: 0.7 }
      };
    })
  );

  const sourceMedia = await EngineSourceMedia.insertMany(
    contentItems.slice(0, 6).map((item, index) => ({
      originalUrl: item.sourceUrl,
      storageKey: `seed/source-media/${index + 1}.mp4`,
      publicUrl: item.mediaUrl,
      mimeType: 'video/mp4',
      durationSeconds: 28 + index * 3,
      width: 1080,
      height: 1920,
      checksum: `seed-checksum-${index + 1}`,
      metadata: { contentPoolItemId: String(item._id) }
    }))
  );

  const transcripts = await EngineTranscript.insertMany(
    sourceMedia.map((media, index) => ({
      sourceMediaId: media._id,
      language: 'en',
      text: `Seed transcript for viral clip ${index + 1}. Hook, payoff, and clear CTA.`,
      provider: 'seed',
      segments: [
        { startSeconds: 0, endSeconds: 4, text: 'Fast hook for retention.' },
        { startSeconds: 4, endSeconds: 12, text: 'Main proof and visual payoff.' }
      ]
    }))
  );

  const clips = await EngineClip.insertMany(
    sourceMedia.map((media, index) => ({
      sourceMediaId: media._id,
      transcriptId: transcripts[index]._id,
      title: `Seed Clip ${index + 1}`,
      startSeconds: 0,
      endSeconds: 18 + index,
      storageKey: `seed/clips/${index + 1}.mp4`,
      publicUrl: `https://cdn.example.com/seed/clips/${index + 1}.mp4`,
      viralScore: 80 + index,
      rationale: 'Seeded high-retention moment with clear visual payoff.'
    }))
  );

  const transforms = await EngineTransform.insertMany(
    sourceMedia.slice(0, 4).map((media, index) => ({
      sourceMediaId: media._id,
      status: 'completed',
      recipe: { type: 'vertical-video', mode: index % 2 === 0 ? 'crop' : 'pad-blur' },
      outputStorageKey: `seed/transforms/${index + 1}.mp4`,
      outputPublicUrl: `https://cdn.example.com/seed/transforms/${index + 1}.mp4`,
      completedAt: new Date()
    }))
  );

  const routingRules = await EngineRoutingRule.insertMany(
    niches.map((niche) => ({
      name: `${niche.name} to TikTok`,
      active: true,
      sourcePlatform: 'instagram',
      targetPlatform: 'tiktok',
      nicheKey: niche.key,
      accountSelector: { nicheKey: niche.key, status: 'active' },
      schedulePolicy: { timezone: 'UTC', postsPerDay: 2 }
    }))
  );

  return { niches, contentItems, sourceMedia, transcripts, clips, transforms, routingRules };
}

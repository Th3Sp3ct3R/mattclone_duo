import { EngineDeviceIdentitySnapshot, EngineTelemetryBaseline } from '@julio/api/models/engine-telemetry';
import { EngineContentChunk, EngineTrend, EngineTrendMatch } from '@julio/api/models/engine-trend';
import {
  EngineSocialPost,
  EngineSocialProfile,
  EngineSocialScore
} from '@julio/api/models/engine-social';

const embedding = (offset) => ({
  provider: 'seed',
  model: 'seed-mini-embedding',
  vector: [0.1 + offset, 0.3 + offset, 0.6 - offset]
});

export async function seedIntel({ accounts, devices, sourceMedia }) {
  const trends = await EngineTrend.insertMany(
    ['ai-music', 'fitness-clips', 'luxury-travel', 'street-food'].map((nicheKey, index) => ({
      platform: index % 2 === 0 ? 'tiktok' : 'instagram',
      nicheKey,
      title: `${nicheKey} trend ${index + 1}`,
      description: 'Seeded trend used to exercise matching UI and services.',
      sourceUrl: `https://example.com/trends/${nicheKey}`,
      reach: 100_000 + index * 45_000,
      outlierRatio: 1.4 + index / 10,
      embedding: embedding(index / 100),
      observedAt: new Date(Date.now() - 1000 * 60 * 60 * index)
    }))
  );

  const chunks = await EngineContentChunk.insertMany(
    sourceMedia.slice(0, 4).map((media, index) => ({
      sourceMediaId: media._id,
      text: `Seed content chunk ${index + 1} with topic and retention language.`,
      startSeconds: 0,
      endSeconds: 12 + index,
      embedding: embedding(index / 120)
    }))
  );

  const trendMatches = await EngineTrendMatch.insertMany(
    trends.map((trend, index) => ({
      trendId: trend._id,
      contentChunkId: chunks[index % chunks.length]._id,
      score: 0.82 - index / 20,
      rationale: 'Seeded semantic overlap between trend and source chunk.'
    }))
  );

  const profiles = await EngineSocialProfile.insertMany(
    accounts.slice(0, 8).map((account, index) => ({
      platform: account.platform,
      handle: account.credentials.username,
      externalProfileId: `profile-${index + 1}`,
      displayName: account.profile.displayName,
      bio: account.profile.bio,
      profileUrl: `https://example.com/${account.platform}/${account.credentials.username}`,
      metrics: { followers: 12_000 + index * 850, posts: 80 + index, likes: 50_000 + index * 3000 },
      scrapedAt: new Date()
    }))
  );

  const socialPosts = await EngineSocialPost.insertMany(
    profiles.map((profile, index) => ({
      platform: profile.platform,
      profileId: profile._id,
      externalPostId: `social-post-${index + 1}`,
      postUrl: `${profile.profileUrl}/posts/${index + 1}`,
      caption: `Seed social post ${index + 1}`,
      mediaUrl: `https://cdn.example.com/social/${index + 1}.mp4`,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12 * index),
      metrics: { views: 35_000 + index * 5000, likes: 2500 + index * 200, comments: 100 + index * 8 }
    }))
  );

  const socialScores = await EngineSocialScore.insertMany([
    ...profiles.slice(0, 4).map((profile, index) => ({
      targetType: 'profile',
      targetId: profile._id,
      score: 70 + index,
      dimensions: { consistency: 0.8, authority: 0.7 },
      rationale: 'Seeded profile score.'
    })),
    ...socialPosts.slice(0, 4).map((post, index) => ({
      targetType: 'post',
      targetId: post._id,
      score: 78 + index,
      dimensions: { hook: 0.85, retention: 0.74 },
      rationale: 'Seeded post score.'
    }))
  ]);

  const identitySnapshots = await EngineDeviceIdentitySnapshot.insertMany(
    devices.slice(0, 5).map((device, index) => ({
      deviceId: device._id,
      platform: accounts[index].platform,
      observedUsername: accounts[index].credentials.username,
      observedExternalUserId: accounts[index].credentials.immutableUserId,
      confidence: 0.92,
      source: 'seed-screen-vision',
      screenshotUrl: `https://cdn.example.com/screens/${index + 1}.png`,
      rawObservation: { screen: 'profile' }
    }))
  );

  const telemetryBaselines = await EngineTelemetryBaseline.insertMany([
    {
      scope: 'global',
      sampleCount: 240,
      gestures: { tapRadiusMean: 6.2, swipeDurationMeanMs: 420 },
      typing: { keyDelayMeanMs: 130 },
      timing: { actionDelayMeanMs: 850 }
    },
    {
      scope: 'device',
      deviceId: devices[0]._id,
      sampleCount: 60,
      gestures: { tapRadiusMean: 5.8 },
      typing: { keyDelayMeanMs: 150 },
      timing: { actionDelayMeanMs: 900 }
    }
  ]);

  return { trends, chunks, trendMatches, profiles, socialPosts, socialScores, identitySnapshots, telemetryBaselines };
}

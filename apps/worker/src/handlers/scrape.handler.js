import {
  EngineSocialPost,
  EngineSocialProfile,
  EngineSocialScore
} from '@julio/api/models/engine-social';
import {
  InstagramPublicScraper,
  scoreViralPost,
  scoreViralProfile,
  TikTokPublicScraper
} from '@julio/intelligence';

import { runEngineJob } from '../engine-job-runner.js';

function scraperForPlatform(platform) {
  return platform === 'instagram' ? new InstagramPublicScraper() : new TikTokPublicScraper();
}

export async function handleScrapeJob(payload) {
  return runEngineJob(payload, async ({ payload: jobPayload }) => {
    const platform = jobPayload?.platform || 'tiktok';
    const handle = jobPayload?.handle || '';
    const url = jobPayload?.url || jobPayload?.sourceUrl || '';
    const scraper = scraperForPlatform(platform);
    const items = handle ? await scraper.scrapeProfile(handle) : await scraper.scrapeUrl(url);
    const posts = [];

    const profile = await EngineSocialProfile.findOneAndUpdate(
      { platform, handle: handle || items[0]?.sourceAuthor || 'unknown' },
      {
        platform,
        handle: handle || items[0]?.sourceAuthor || 'unknown',
        profileUrl: handle ? (platform === 'instagram' ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`) : '',
        scrapedAt: new Date()
      },
      { upsert: true, new: true }
    );

    for (const item of items) {
      const post = await EngineSocialPost.findOneAndUpdate(
        { platform, postUrl: item.sourceUrl },
        {
          platform,
          profileId: profile._id,
          externalPostId: item.externalId || '',
          postUrl: item.sourceUrl,
          caption: item.caption,
          mediaUrl: item.mediaUrl,
          publishedAt: item.publishedAt,
          metrics: item.metrics || {},
          scrapedAt: new Date(),
          metadata: { raw: item.raw }
        },
        { upsert: true, new: true }
      );
      const scored = scoreViralPost({ platform, metrics: { ...(item.metrics || {}), publishedAt: item.publishedAt } });
      await EngineSocialScore.create({
        targetType: 'post',
        targetId: post._id,
        score: scored.score,
        dimensions: scored.dimensions,
        rationale: scored.recommendation
      });
      posts.push({ id: String(post._id), score: scored.score });
    }

    const profileScore = scoreViralProfile({ metrics: profile.metrics || {}, postScores: posts.map((post) => post.score) });
    await EngineSocialScore.create({
      targetType: 'profile',
      targetId: profile._id,
      score: profileScore.score,
      dimensions: profileScore.dimensions,
      rationale: profileScore.recommendation
    });

    return { profileId: String(profile._id), posts: posts.length, profileScore: profileScore.score };
  });
}

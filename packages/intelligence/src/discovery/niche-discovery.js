import { scoreComposite } from '../scoring/content-scorer.js';
import { InstagramPublicScraper } from '../scrapers/ig-public-scraper.js';
import { TikTokPublicScraper } from '../scrapers/tiktok-public-scraper.js';

function sourceValue(source = {}) {
  return source.url || source.handle || source.value || '';
}

function normalizeSourceKind(source = {}) {
  if (source.kind) return source.kind;
  if (source.url?.includes('/tag/') || source.handle?.startsWith('#')) return 'hashtag';
  if (source.url?.includes('/music/') || source.url?.includes('/sound/')) return 'sound';
  return 'account';
}

async function scrapeSource(source, scrapers) {
  const value = sourceValue(source);
  if (!value) return [];
  const kind = normalizeSourceKind(source);

  if (source.platform === 'tiktok') {
    if (kind === 'hashtag') return scrapers.tiktok.scrapeHashtag(value);
    if (kind === 'sound') return scrapers.tiktok.scrapeSound(value);
    if (value.includes('/video/')) return [await scrapers.tiktok.scrapeVideo(value)];
    return scrapers.tiktok.scrapeProfile(value);
  }

  if (source.platform === 'instagram') {
    if (value.includes('/p/') || value.includes('/reel/')) return scrapers.instagram.scrapeUrl(value);
    return scrapers.instagram.scrapeProfile(value);
  }

  return [];
}

export async function discoverNicheContent({
  niche,
  existingSourceUrls = new Set(),
  creatorBaselines = {},
  scrapers = {
    tiktok: new TikTokPublicScraper(),
    instagram: new InstagramPublicScraper()
  }
} = {}) {
  const discovered = [];
  const errors = [];

  for (const source of niche?.sources || []) {
    if (source.active === false) continue;
    try {
      const items = await scrapeSource(source, scrapers);
      for (const item of items) {
        if (!item.sourceUrl || existingSourceUrls.has(item.sourceUrl)) continue;
        const baseline = creatorBaselines[item.sourceAuthor] || {};
        const score = scoreComposite(
          {
            ...(item.metrics || {}),
            publishedAt: item.publishedAt
          },
          baseline
        );
        discovered.push({
          ...item,
          nicheId: niche._id || niche.id,
          score: score.score,
          scoreBreakdown: score.dimensions,
          metadata: {
            externalId: item.externalId,
            source,
            raw: item.raw
          }
        });
        existingSourceUrls.add(item.sourceUrl);
      }
    } catch (error) {
      errors.push({
        source,
        message: error?.message || 'Discovery source failed'
      });
    }
  }

  return { items: discovered, errors };
}

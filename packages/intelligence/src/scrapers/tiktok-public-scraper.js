import { extractJsonScript, extractObjectAssignment, fetchText, parseCompactNumber } from './http.js';

function normalizeVideo(item = {}) {
  const stats = item.stats || item.statsV2 || item.statistics || {};
  const author = item.author || item.authorInfo || {};
  const id = item.id || item.awemeId || item.video?.id || '';
  const authorHandle = author.uniqueId || author.unique_id || author.nickname || item.authorId || '';
  return {
    platform: 'tiktok',
    externalId: String(id),
    sourceUrl: item.shareUrl || (authorHandle && id ? `https://www.tiktok.com/@${authorHandle}/video/${id}` : ''),
    sourceAuthor: authorHandle,
    caption: item.desc || item.description || '',
    mediaUrl: item.video?.playAddr || item.video?.downloadAddr || item.video?.playApi || '',
    publishedAt: item.createTime ? new Date(Number(item.createTime) * 1000) : null,
    metrics: {
      views: parseCompactNumber(stats.playCount || stats.play_count || stats.viewCount),
      likes: parseCompactNumber(stats.diggCount || stats.digg_count || stats.likeCount),
      comments: parseCompactNumber(stats.commentCount || stats.comment_count),
      shares: parseCompactNumber(stats.shareCount || stats.share_count)
    },
    raw: item
  };
}

function collectVideos(value, output = []) {
  if (!value || output.length >= 100) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectVideos(item, output);
    return output;
  }
  if (typeof value !== 'object') return output;
  if ((value.id || value.awemeId) && (value.video || value.stats || value.statsV2)) {
    output.push(normalizeVideo(value));
  }
  for (const child of Object.values(value)) collectVideos(child, output);
  return output;
}

function parseState(html) {
  return (
    extractJsonScript(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__') ||
    extractJsonScript(html, 'SIGI_STATE') ||
    extractObjectAssignment(html, 'window.__UNIVERSAL_DATA__') ||
    extractObjectAssignment(html, 'window[\'SIGI_STATE\']')
  );
}

export class TikTokPublicScraper {
  constructor({ fetchHtml = fetchText } = {}) {
    this.fetchHtml = fetchHtml;
  }

  async scrapeUrl(url) {
    const html = await this.fetchHtml(url);
    const state = parseState(html);
    const videos = collectVideos(state).filter((item) => item.sourceUrl || item.externalId);
    if (!videos.length) throw new Error(`No TikTok media found for ${url}`);
    return videos;
  }

  scrapeVideo(url) {
    return this.scrapeUrl(url).then((items) => items[0]);
  }

  scrapeProfile(handleOrUrl) {
    const handle = String(handleOrUrl || '').replace(/^@/, '').replace(/^https:\/\/www\.tiktok\.com\/@/, '').split(/[/?#]/)[0];
    return this.scrapeUrl(`https://www.tiktok.com/@${handle}`);
  }

  scrapeHashtag(tagOrUrl) {
    const tag = String(tagOrUrl || '').replace(/^#/, '').replace(/^https:\/\/www\.tiktok\.com\/tag\//, '').split(/[/?#]/)[0];
    return this.scrapeUrl(`https://www.tiktok.com/tag/${encodeURIComponent(tag)}`);
  }

  scrapeSound(soundUrl) {
    return this.scrapeUrl(soundUrl);
  }
}

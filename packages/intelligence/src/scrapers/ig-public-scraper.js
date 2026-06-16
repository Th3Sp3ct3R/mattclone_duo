import { extractJsonScript, extractObjectAssignment, fetchJson, fetchText, parseCompactNumber } from './http.js';

function normalizeInstagramNode(node = {}, owner = {}) {
  const shortcode = node.shortcode || node.code || '';
  const metrics = node.edge_media_preview_like || node.edge_liked_by || {};
  const comments = node.edge_media_to_comment || {};
  const captionEdge = node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text || '';
  return {
    platform: 'instagram',
    externalId: String(node.id || shortcode),
    sourceUrl: shortcode ? `https://www.instagram.com/p/${shortcode}/` : node.url || '',
    sourceAuthor: owner.username || node.owner?.username || '',
    caption: captionEdge,
    mediaUrl: node.video_url || node.display_url || node.thumbnail_src || '',
    publishedAt: node.taken_at_timestamp ? new Date(Number(node.taken_at_timestamp) * 1000) : null,
    metrics: {
      views: parseCompactNumber(node.video_view_count || node.video_play_count),
      likes: parseCompactNumber(metrics.count),
      comments: parseCompactNumber(comments.count),
      shares: 0
    },
    raw: node
  };
}

function collectMedia(value, owner = {}, output = []) {
  if (!value || output.length >= 100) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectMedia(item, owner, output);
    return output;
  }
  if (typeof value !== 'object') return output;
  if (value.shortcode || value.code || value.video_url || value.display_url) {
    output.push(normalizeInstagramNode(value.node || value, owner));
  }
  if (value.user?.username) owner = value.user;
  for (const child of Object.values(value)) collectMedia(child, owner, output);
  return output;
}

function parseState(html) {
  return (
    extractJsonScript(html, '__NEXT_DATA__') ||
    extractObjectAssignment(html, 'window._sharedData') ||
    extractObjectAssignment(html, 'window.__additionalDataLoaded')
  );
}

export class InstagramPublicScraper {
  constructor({ fetchHtml = fetchText, fetchJsonImpl = fetchJson } = {}) {
    this.fetchHtml = fetchHtml;
    this.fetchJson = fetchJsonImpl;
  }

  async scrapeUrl(url) {
    const html = await this.fetchHtml(url, {
      headers: { Referer: 'https://www.instagram.com/' }
    });
    const state = parseState(html);
    const media = collectMedia(state).filter((item) => item.sourceUrl || item.mediaUrl);
    if (media.length) return media;

    const oembed = await this.fetchJson(
      `https://graph.facebook.com/v16.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=true`
    ).catch(() => null);
    if (!oembed) throw new Error(`No Instagram media found for ${url}`);
    return [
      {
        platform: 'instagram',
        externalId: String(oembed.media_id || url),
        sourceUrl: url,
        sourceAuthor: oembed.author_name || '',
        caption: oembed.title || '',
        mediaUrl: oembed.thumbnail_url || '',
        publishedAt: null,
        metrics: {},
        raw: oembed
      }
    ];
  }

  async scrapeProfile(handleOrUrl) {
    const handle = String(handleOrUrl || '')
      .replace(/^@/, '')
      .replace(/^https:\/\/www\.instagram\.com\//, '')
      .split(/[/?#]/)[0];
    const json = await this.fetchJson(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, {
      headers: {
        Referer: `https://www.instagram.com/${handle}/`,
        'X-IG-App-ID': '936619743392459'
      }
    }).catch(() => null);
    if (json?.data?.user) {
      return collectMedia(json.data.user, json.data.user);
    }
    return this.scrapeUrl(`https://www.instagram.com/${handle}/`);
  }
}

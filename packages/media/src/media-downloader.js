import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { uploadAsset } from '@julio/assets';

function inferExtension(url, contentType = '') {
  const pathname = new URL(url).pathname;
  const fromPath = path.extname(pathname).toLowerCase();
  if (fromPath) return fromPath;
  if (contentType.includes('mp4')) return '.mp4';
  if (contentType.includes('jpeg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('mpegurl')) return '.m3u8';
  return '.bin';
}

function inferReferer(url) {
  const host = new URL(url).hostname;
  if (host.includes('instagram')) return 'https://www.instagram.com/';
  if (host.includes('tiktok')) return 'https://www.tiktok.com/';
  return undefined;
}

export async function downloadMediaToLocal(url, { directory = './media', maxBytes = 500 * 1024 * 1024 } = {}) {
  if (!url) throw new Error('Media URL is required');
  await fs.mkdir(directory, { recursive: true });

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 Chrome/124 Safari/537.36',
      ...(inferReferer(url) ? { Referer: inferReferer(url) } : {})
    }
  });
  if (!response.ok) throw new Error(`Media download failed ${response.status}`);

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const extension = inferExtension(url, contentType);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error(`Media exceeds max size ${maxBytes}`);
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const filePath = path.join(directory, `${checksum}${extension}`);
  await fs.writeFile(filePath, buffer);
  return { filePath, buffer, checksum, contentType, size };
}

export async function downloadAndUploadMedia(url, { directory, category = 'engine-media' } = {}) {
  const downloaded = await downloadMediaToLocal(url, { directory });
  const uploaded = await uploadAsset({
    buffer: downloaded.buffer,
    contentType: downloaded.contentType,
    category,
    filename: path.basename(downloaded.filePath)
  });
  return {
    ...downloaded,
    storageKey: uploaded.key,
    publicUrl: uploaded.publicUrl
  };
}

export function parseDashManifest(xml = '') {
  const representations = [...String(xml).matchAll(/<Representation[^>]*bandwidth="(\d+)"[\s\S]*?<BaseURL>([\s\S]*?)<\/BaseURL>/g)];
  return representations
    .map((match) => ({ bandwidth: Number(match[1]), url: match[2].trim() }))
    .sort((left, right) => right.bandwidth - left.bandwidth);
}

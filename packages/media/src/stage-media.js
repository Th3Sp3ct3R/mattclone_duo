import fs from 'node:fs/promises';
import path from 'node:path';

import { uploadAsset } from '@julio/assets';

function isPublicHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function filenameFromSource(source = '') {
  try {
    const url = new URL(source);
    const name = path.basename(url.pathname);
    return name || 'media.mp4';
  } catch {
    return path.basename(source || '') || 'media.mp4';
  }
}

async function bufferFromSource(sourceUrl, fetchImpl = globalThis.fetch) {
  if (isPublicHttpUrl(sourceUrl)) {
    const response = await fetchImpl(sourceUrl);
    if (!response.ok) throw new Error(`Failed to fetch media source: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return fs.readFile(sourceUrl);
}

export async function stageMediaForDevice(media = {}, { category = 'engine-posts', fetchImpl = globalThis.fetch } = {}) {
  if (isPublicHttpUrl(media.publicUrl)) {
    return {
      ...media,
      publicUrl: media.publicUrl,
      staged: false
    };
  }

  if (isPublicHttpUrl(media.sourceUrl) && !media.forceUpload) {
    return {
      ...media,
      publicUrl: media.sourceUrl,
      staged: false
    };
  }

  if (!media.sourceUrl) {
    throw new Error('Post media needs sourceUrl or publicUrl before device staging');
  }

  const buffer = await bufferFromSource(media.sourceUrl, fetchImpl);
  const upload = await uploadAsset({
    buffer,
    contentType: media.mimeType || 'video/mp4',
    category,
    filename: filenameFromSource(media.sourceUrl)
  });

  return {
    ...media,
    storageKey: upload.key,
    publicUrl: upload.publicUrl,
    staged: true
  };
}

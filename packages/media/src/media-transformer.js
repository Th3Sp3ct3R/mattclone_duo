import fs from 'node:fs/promises';
import path from 'node:path';

import { uploadAsset } from '@julio/assets';

import { probeMedia } from './ingest.js';
import { runCommand } from './process.js';

function buildVideoFilter(recipe = {}) {
  const strategy = recipe.strategy || 'pad-blur-bg';
  const watermarkCrop = recipe.watermarkRemoval ? 'crop=iw*0.93:ih*0.93:iw*0.035:ih*0.035,' : '';
  if (strategy === 'crop' || strategy === 'zoom-fill') {
    return `${watermarkCrop}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
  }
  return `${watermarkCrop}scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
}

export async function transformVideo({
  inputPath,
  recipe = {},
  outputDirectory = './media/transforms',
  upload = true
} = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  await fs.mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `transform-${Date.now()}.mp4`);
  const inputMetadata = await probeMedia(inputPath).catch(() => ({}));
  const args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    buildVideoFilter(recipe),
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    String(recipe.crf || 23),
    ...(recipe.audioMode === 'mute' ? ['-an'] : ['-c:a', 'aac', '-b:a', '128k']),
    '-movflags',
    '+faststart',
    outputPath
  ];

  await runCommand('ffmpeg', args, { timeoutMs: 900_000 });

  const result = {
    outputPath,
    metadata: {
      input: inputMetadata,
      recipe
    }
  };

  if (!upload) return result;
  const buffer = await fs.readFile(outputPath);
  const asset = await uploadAsset({
    buffer,
    contentType: 'video/mp4',
    category: 'engine-transforms',
    filename: path.basename(outputPath)
  });
  return {
    ...result,
    storageKey: asset.key,
    publicUrl: asset.publicUrl
  };
}

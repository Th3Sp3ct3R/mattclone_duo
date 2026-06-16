import fs from 'node:fs/promises';
import path from 'node:path';

import { uploadAsset } from '@julio/assets';

import { runCommand } from './process.js';

export async function cutVideoClip({
  inputPath,
  startSeconds,
  endSeconds,
  outputDirectory = './media/clips',
  upload = true
} = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  await fs.mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `clip-${Date.now()}-${Math.round(startSeconds)}-${Math.round(endSeconds)}.mp4`);
  const fastArgs = ['-y', '-ss', String(startSeconds), '-to', String(endSeconds), '-i', inputPath, '-c', 'copy', outputPath];

  try {
    await runCommand('ffmpeg', fastArgs, { timeoutMs: 300_000 });
  } catch {
    await runCommand(
      'ffmpeg',
      [
        '-y',
        '-ss',
        String(startSeconds),
        '-to',
        String(endSeconds),
        '-i',
        inputPath,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-c:a',
        'aac',
        outputPath
      ],
      { timeoutMs: 300_000 }
    );
  }

  if (!upload) return { outputPath };
  const buffer = await fs.readFile(outputPath);
  const asset = await uploadAsset({
    buffer,
    contentType: 'video/mp4',
    category: 'engine-clips',
    filename: path.basename(outputPath)
  });
  return { outputPath, storageKey: asset.key, publicUrl: asset.publicUrl };
}

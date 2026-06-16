import fs from 'node:fs/promises';
import path from 'node:path';

import { runCommand } from './process.js';

export async function downloadVideoWithYtDlp(url, { directory = './media/downloads', maxDurationSeconds = 7200 } = {}) {
  await fs.mkdir(directory, { recursive: true });
  const outputTemplate = path.join(directory, '%(id)s.%(ext)s');
  const { stdout } = await runCommand(
    'yt-dlp',
    [
      '--no-playlist',
      '--format',
      'bestaudio[ext=m4a]/bestaudio/best[height<=720]',
      '--output',
      outputTemplate,
      '--write-info-json',
      '--print',
      '%(filepath)s',
      '--print',
      '%(id)s',
      '--print',
      '%(title)s',
      '--print',
      '%(duration)s',
      url
    ],
    { timeoutMs: 300_000 }
  );
  const [filePath, externalId, title, duration] = stdout.trim().split('\n');
  const durationSeconds = Number(duration || 0);
  if (durationSeconds > maxDurationSeconds) {
    throw new Error(`Media duration ${durationSeconds}s exceeds max ${maxDurationSeconds}s`);
  }
  return {
    filePath,
    externalId,
    title,
    durationSeconds,
    metadataPath: filePath ? filePath.replace(path.extname(filePath), '.info.json') : ''
  };
}

export async function extractAudio(videoPath, { directory = './media/downloads' } = {}) {
  if (!videoPath) throw new Error('videoPath is required');
  await fs.mkdir(directory, { recursive: true });
  const audioPath = path.join(directory, `${path.basename(videoPath, path.extname(videoPath))}.wav`);
  await runCommand(
    'ffmpeg',
    ['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audioPath],
    { timeoutMs: 300_000 }
  );
  return audioPath;
}

export async function probeMedia(filePath) {
  const { stdout } = await runCommand(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', filePath],
    { timeoutMs: 30_000 }
  );
  const data = JSON.parse(stdout || '{}');
  const videoStream = (data.streams || []).find((stream) => stream.width || stream.height) || {};
  return {
    durationSeconds: Number(data.format?.duration || 0) || null,
    width: videoStream.width || null,
    height: videoStream.height || null
  };
}

import fs from 'node:fs/promises';
import path from 'node:path';

import { runCommand } from './process.js';

function parseWhisperJson(value) {
  const parsed = JSON.parse(value);
  return {
    language: parsed.language || '',
    text: parsed.text || '',
    segments: (parsed.segments || []).map((segment) => ({
      startSeconds: Number(segment.start ?? segment.startSeconds ?? 0),
      endSeconds: Number(segment.end ?? segment.endSeconds ?? 0),
      text: String(segment.text || '').trim()
    }))
  };
}

export async function transcribeAudio(audioPath, { whisperBin = 'whisper', model = 'base', outputDirectory } = {}) {
  if (!audioPath) throw new Error('audioPath is required');
  const directory = outputDirectory || path.dirname(audioPath);
  await fs.mkdir(directory, { recursive: true });

  await runCommand(
    whisperBin,
    [audioPath, '--model', model, '--output_format', 'json', '--output_dir', directory],
    { timeoutMs: 900_000 }
  );

  const outputPath = path.join(directory, `${path.basename(audioPath, path.extname(audioPath))}.json`);
  const text = await fs.readFile(outputPath, 'utf8');
  return {
    provider: 'whisper.cpp',
    model,
    ...parseWhisperJson(text)
  };
}

import { env } from '@julio/api/config/env';
import { EngineContentPoolItem } from '@julio/api/models/engine-niche';
import {
  EngineClip,
  EngineSourceMedia,
  EngineTranscript
} from '@julio/api/models/engine-pipeline';
import { EngineContentChunk } from '@julio/api/models/engine-trend';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { createOpenRouterClient } from '@julio/integrations';
import { chunkTranscriptSegments, embedText, TikTokPublicScraper } from '@julio/intelligence';
import {
  cutVideoClip,
  detectClipCandidates,
  downloadAndUploadMedia,
  downloadVideoWithYtDlp,
  extractAudio,
  transcribeAudio
} from '@julio/media';

import { runEngineJob } from '../engine-job-runner.js';

function getLlm() {
  if (!env.openRouterApiKey) return null;
  return createOpenRouterClient({ apiKey: env.openRouterApiKey, model: env.clipDetectionModel });
}

async function dispatchNext({ sourceMediaId, jobName }) {
  return dispatchEngineJob({
    queueName: 'engine.pipeline',
    jobName,
    targetType: 'sourceMedia',
    targetId: sourceMediaId,
    payload: { sourceMediaId: String(sourceMediaId) },
    idempotencyKey: `pipeline:${jobName}:${sourceMediaId}`
  });
}

async function handleIngest(sourceMediaId) {
  const source = await EngineSourceMedia.findById(sourceMediaId);
  if (!source) throw new Error('Source media not found');
  const download = await downloadVideoWithYtDlp(source.originalUrl, {
    directory: env.downloadDir,
    maxDurationSeconds: env.maxDurationSeconds
  });
  const audioPath = await extractAudio(download.filePath, { directory: env.downloadDir });
  await EngineSourceMedia.findByIdAndUpdate(source._id, {
    durationSeconds: download.durationSeconds || source.durationSeconds,
    metadata: {
      ...(source.metadata?.toObject?.() || source.metadata || {}),
      localPath: download.filePath,
      audioPath,
      externalId: download.externalId,
      title: download.title
    }
  });
  await dispatchNext({ sourceMediaId: source._id, jobName: 'transcribe' });
  return { ingested: true, filePath: download.filePath, audioPath };
}

async function handleTranscribe(sourceMediaId) {
  const source = await EngineSourceMedia.findById(sourceMediaId);
  if (!source) throw new Error('Source media not found');
  const audioPath = source.metadata?.audioPath;
  if (!audioPath) throw new Error('Source media has no extracted audio path');
  const transcript = await transcribeAudio(audioPath, {
    whisperBin: env.whisperBin,
    model: env.whisperModel,
    outputDirectory: env.downloadDir
  });
  const saved = await EngineTranscript.findOneAndUpdate(
    { sourceMediaId: source._id },
    {
      sourceMediaId: source._id,
      language: transcript.language,
      text: transcript.text,
      segments: transcript.segments,
      provider: `${transcript.provider}:${transcript.model}`
    },
    { upsert: true, new: true }
  );
  const chunks = chunkTranscriptSegments(transcript.segments);
  await Promise.all(
    chunks.map(async (chunk) => {
      const vector = await embedText(chunk.text, { model: env.embeddingModel });
      return EngineContentChunk.create({
        sourceMediaId: source._id,
        ...chunk,
        embedding: { provider: 'local', model: env.embeddingModel, vector }
      });
    })
  );
  await dispatchNext({ sourceMediaId: source._id, jobName: 'detect-clips' });
  return { transcribed: true, transcriptId: String(saved._id), chunks: chunks.length };
}

async function handleDetectClips(sourceMediaId) {
  const source = await EngineSourceMedia.findById(sourceMediaId).lean();
  const transcript = await EngineTranscript.findOne({ sourceMediaId }).lean();
  if (!source || !transcript) throw new Error('Source media or transcript not found');
  const llm = getLlm();
  const candidates = await detectClipCandidates({ transcript, sourceMedia: source, llm });
  await Promise.all(
    candidates.map((clip) =>
      EngineClip.findOneAndUpdate(
        { sourceMediaId, startSeconds: clip.startSeconds, endSeconds: clip.endSeconds },
        {
          sourceMediaId,
          transcriptId: transcript._id,
          title: clip.title,
          startSeconds: clip.startSeconds,
          endSeconds: clip.endSeconds,
          viralScore: clip.viralScore,
          rationale: clip.rationale,
          metadata: { status: 'candidate' }
        },
        { upsert: true, new: true }
      )
    )
  );
  await dispatchNext({ sourceMediaId, jobName: 'cut' });
  return { detected: candidates.length };
}

async function handleCut(sourceMediaId) {
  const source = await EngineSourceMedia.findById(sourceMediaId);
  if (!source?.metadata?.localPath) throw new Error('Source media local path missing');
  const clips = await EngineClip.find({ sourceMediaId, publicUrl: '' }).sort({ viralScore: -1 }).limit(7);
  const outputs = [];
  for (const clip of clips) {
    const output = await cutVideoClip({
      inputPath: source.metadata.localPath,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
      outputDirectory: env.transformsDir
    });
    await EngineClip.findByIdAndUpdate(clip._id, {
      storageKey: output.storageKey || '',
      publicUrl: output.publicUrl || '',
      metadata: { ...(clip.metadata?.toObject?.() || clip.metadata || {}), outputPath: output.outputPath, status: 'ready' }
    });
    outputs.push(output);
  }
  return { cut: outputs.length };
}

async function handleContentPoolDownload(contentPoolItemId) {
  const item = await EngineContentPoolItem.findById(contentPoolItemId);
  if (!item) throw new Error('Content pool item not found');
  let mediaUrl = item.mediaUrl;
  if (item.platform === 'tiktok' && !mediaUrl) {
    const scraped = await new TikTokPublicScraper().scrapeVideo(item.sourceUrl);
    mediaUrl = scraped.mediaUrl;
  }
  if (!mediaUrl) throw new Error('Content pool item has no downloadable media URL');
  const downloaded = await downloadAndUploadMedia(mediaUrl, {
    directory: env.mediaDownloadDir,
    category: 'engine-content'
  });
  await EngineContentPoolItem.findByIdAndUpdate(item._id, {
    mediaUrl,
    storageKey: downloaded.storageKey,
    downloadedAt: new Date(),
    status: 'downloaded',
    metadata: {
      ...(item.metadata?.toObject?.() || item.metadata || {}),
      localPath: downloaded.filePath,
      checksum: downloaded.checksum,
      publicUrl: downloaded.publicUrl,
      contentType: downloaded.contentType
    }
  });
  return { downloaded: true, publicUrl: downloaded.publicUrl };
}

export async function handlePipelineJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId, payload: jobPayload }) => {
    if (jobName === 'download') return handleContentPoolDownload(targetId || jobPayload?.contentPoolItemId);
    if (jobName === 'ingest') return handleIngest(targetId || jobPayload?.sourceMediaId);
    if (jobName === 'transcribe') return handleTranscribe(targetId || jobPayload?.sourceMediaId);
    if (jobName === 'detect-clips') return handleDetectClips(targetId || jobPayload?.sourceMediaId);
    if (jobName === 'cut') return handleCut(targetId || jobPayload?.sourceMediaId);
    throw new Error(`Unknown pipeline job: ${jobName}`);
  });
}

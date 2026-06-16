import { env } from '@julio/api/config/env';
import { EngineSourceMedia, EngineTransform } from '@julio/api/models/engine-pipeline';
import { downloadMediaToLocal, transformVideo } from '@julio/media';

import { runEngineJob } from '../engine-job-runner.js';

async function resolveInputPath(source) {
  if (source?.metadata?.localPath) return source.metadata.localPath;
  const url = source?.publicUrl || source?.originalUrl;
  if (!url) throw new Error('Transform source has no local path or URL');
  const downloaded = await downloadMediaToLocal(url, { directory: env.mediaDownloadDir });
  await EngineSourceMedia.findByIdAndUpdate(source._id, {
    metadata: {
      ...(source.metadata?.toObject?.() || source.metadata || {}),
      localPath: downloaded.filePath,
      checksum: downloaded.checksum
    }
  });
  return downloaded.filePath;
}

export async function handleTransformJob(payload) {
  return runEngineJob(payload, async ({ targetId, payload: jobPayload }) => {
    const transform = await EngineTransform.findById(targetId || jobPayload?.transformId);
    if (!transform) throw new Error('Transform not found');
    const source = await EngineSourceMedia.findById(transform.sourceMediaId);
    if (!source) throw new Error('Transform source media not found');

    await EngineTransform.findByIdAndUpdate(transform._id, { status: 'processing', failureReason: '' });
    try {
      const inputPath = await resolveInputPath(source);
      const output = await transformVideo({
        inputPath,
        recipe: transform.recipe || {},
        outputDirectory: env.transformsDir
      });
      await EngineTransform.findByIdAndUpdate(transform._id, {
        status: 'completed',
        outputStorageKey: output.storageKey || '',
        outputPublicUrl: output.publicUrl || '',
        completedAt: new Date(),
        failureReason: ''
      });
      return output;
    } catch (error) {
      await EngineTransform.findByIdAndUpdate(transform._id, {
        status: 'failed',
        failureReason: error?.message || 'Transform failed'
      });
      throw error;
    }
  });
}

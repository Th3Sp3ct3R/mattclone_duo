import { env } from '@julio/api/config/env';
import { logger } from '@julio/api/logger';
import { createPresignedUpload, uploadAsset } from '@julio/assets';

import { requireUser } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeString(value) {
  return String(value || '').trim();
}

export async function createPresign(req, res) {
  try {
    requireUser(req);
    if (!env.awsRegion || !env.awsS3Bucket) {
      throw new Error('Missing AWS S3 env vars');
    }

    const filename = sanitizeString(req.body?.filename);
    const contentType = sanitizeString(req.body?.contentType);
    const category = sanitizeString(req.body?.category) || 'assets';
    const size = Number(req.body?.size || 0);

    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'Missing filename or content type' });
    }
    if (size && size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'File too large' });
    }

    const out = await createPresignedUpload({
      filename,
      contentType,
      category,
      acl: 'public-read'
    });

    return res.json({
      ok: true,
      uploadUrl: out.uploadUrl,
      key: out.key,
      publicUrl: out.publicUrl
    });
  } catch (err) {
    logger.error('Asset presign failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function uploadImage(req, res) {
  try {
    requireUser(req);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Missing file' });
    }
    if (!env.awsRegion || !env.awsS3Bucket || !env.awsAccessKeyId || !env.awsSecretAccessKey) {
      throw new Error('Missing AWS S3 env vars');
    }

    const size = Number(file.size || 0);
    if (size <= 0) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Missing file' });
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'File too large' });
    }

    const out = await uploadAsset({
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
      filename: file.originalname || '',
      category: 'images',
      acl: 'public-read'
    });

    return res.json({ ok: true, asset: { url: out.publicUrl, key: out.key } });
  } catch (err) {
    logger.error('Image upload failed', err);
    return sendError(res, err, 'Internal error');
  }
}

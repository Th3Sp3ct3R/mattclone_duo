import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { assetsEnv, assertAssetsEnv } from './config/env.js';

let client = null;

function resolveBucket(value) {
  return value || assetsEnv.r2Bucket || assetsEnv.awsS3Bucket;
}

function resolveRegion(value) {
  return value || assetsEnv.awsRegion || 'auto';
}

function resolveEndpoint(value) {
  if (value) return value;
  if (assetsEnv.awsS3Endpoint) return assetsEnv.awsS3Endpoint;
  if (assetsEnv.r2AccountId) return `https://${assetsEnv.r2AccountId}.r2.cloudflarestorage.com`;
  return null;
}

function resolveCredentials(accessKeyId, secretAccessKey) {
  const resolvedAccessKeyId = accessKeyId || assetsEnv.r2AccessKeyId || assetsEnv.awsAccessKeyId;
  const resolvedSecretAccessKey =
    secretAccessKey || assetsEnv.r2SecretAccessKey || assetsEnv.awsSecretAccessKey;
  if (resolvedAccessKeyId && resolvedSecretAccessKey) {
    return { accessKeyId: resolvedAccessKeyId, secretAccessKey: resolvedSecretAccessKey };
  }
  if (resolvedAccessKeyId || resolvedSecretAccessKey) {
    throw new Error('Both AWS access key and secret must be provided.');
  }
  return null;
}

function getS3Client({ region, endpoint, accessKeyId, secretAccessKey } = {}) {
  const resolvedRegion = resolveRegion(region);
  const resolvedEndpoint = resolveEndpoint(endpoint);
  if (!resolvedRegion) {
    assertAssetsEnv(['awsRegion']);
  }
  const credentials = resolveCredentials(accessKeyId, secretAccessKey);
  const config = { region: resolvedRegion || assetsEnv.awsRegion };
  if (credentials) config.credentials = credentials;
  if (resolvedEndpoint) {
    config.endpoint = resolvedEndpoint;
    config.forcePathStyle = true;
  }

  if (client && !region && !accessKeyId && !secretAccessKey) return client;
  const instance = new S3Client(config);
  if (!region && !accessKeyId && !secretAccessKey) client = instance;
  return instance;
}

function normalizeCategory(value) {
  return String(value || 'assets')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'assets';
}

export function buildAssetKey({ category = 'assets', filename = '', prefix = 'uploads' } = {}) {
  const safeCategory = normalizeCategory(category);
  const extension = filename ? path.extname(filename).toLowerCase() : '';
  const token = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${safeCategory}/${Date.now()}-${token}${extension}`;
}

export function buildPublicAssetUrl({ key, bucket, region } = {}) {
  const publicBaseUrl = assetsEnv.r2PublicUrl || assetsEnv.awsPublicBaseUrl;
  if (publicBaseUrl) {
    return `${String(publicBaseUrl).replace(/\/+$/, '')}/${String(key || '').replace(/^\/+/, '')}`;
  }
  const resolvedBucket = resolveBucket(bucket);
  const resolvedRegion = resolveRegion(region);
  if (!resolvedBucket || !resolvedRegion) {
    assertAssetsEnv(['awsS3Bucket', 'awsRegion']);
  }
  return `https://${resolvedBucket}.s3.${resolvedRegion}.amazonaws.com/${key}`;
}

export async function createPresignedUpload({
  contentType,
  category,
  filename,
  acl = 'public-read',
  expiresInSeconds = 900,
  bucket,
  region,
  accessKeyId,
  secretAccessKey
} = {}) {
  const resolvedBucket = resolveBucket(bucket);
  const resolvedRegion = resolveRegion(region);
  if (!resolvedBucket || !resolvedRegion) {
    assertAssetsEnv(['awsS3Bucket', 'awsRegion']);
  }
  const key = buildAssetKey({ category, filename });
  const command = new PutObjectCommand({
    Bucket: resolvedBucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    ACL: acl
  });
  const uploadUrl = await getSignedUrl(
    getS3Client({ region: resolvedRegion, accessKeyId, secretAccessKey }),
    command,
    { expiresIn: expiresInSeconds }
  );
  return {
    uploadUrl,
    key,
    publicUrl: buildPublicAssetUrl({ key, bucket: resolvedBucket, region: resolvedRegion })
  };
}

export async function uploadAsset({
  buffer,
  contentType,
  category,
  filename,
  acl = 'public-read',
  bucket,
  region,
  accessKeyId,
  secretAccessKey
} = {}) {
  const resolvedBucket = resolveBucket(bucket);
  const resolvedRegion = resolveRegion(region);
  if (!resolvedBucket || !resolvedRegion) {
    assertAssetsEnv(['awsS3Bucket', 'awsRegion']);
  }
  const key = buildAssetKey({ category, filename });
  await getS3Client({ region: resolvedRegion, accessKeyId, secretAccessKey }).send(
    new PutObjectCommand({
      Bucket: resolvedBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ACL: acl
    })
  );
  return {
    key,
    publicUrl: buildPublicAssetUrl({ key, bucket: resolvedBucket, region: resolvedRegion })
  };
}

export { getS3Client };

import { defineSchema, loadConfig, rules } from '@julio/config';
import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const schema = defineSchema({
  AWS_ACCESS_KEY_ID: rules.optionalString(),
  AWS_SECRET_ACCESS_KEY: rules.optionalString(),
  AWS_S3_BUCKET: rules.optionalString(),
  AWS_REGION: rules.optionalString(),
  AWS_S3_ENDPOINT: rules.optionalString(),
  AWS_PUBLIC_BASE_URL: rules.optionalString(),
  CF_R2_ACCOUNT_ID: rules.optionalString(),
  CF_R2_ACCESS_KEY_ID: rules.optionalString(),
  CF_R2_SECRET_ACCESS_KEY: rules.optionalString(),
  CF_R2_BUCKET: rules.optionalString(),
  CF_R2_PUBLIC_URL: rules.optionalString()
});

const cfg = loadConfig(process.env, schema);

export const assetsEnv = {
  awsAccessKeyId: cfg.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: cfg.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: cfg.AWS_S3_BUCKET,
  awsRegion: cfg.AWS_REGION,
  awsS3Endpoint: cfg.AWS_S3_ENDPOINT,
  awsPublicBaseUrl: cfg.AWS_PUBLIC_BASE_URL,
  r2AccountId: cfg.CF_R2_ACCOUNT_ID,
  r2AccessKeyId: cfg.CF_R2_ACCESS_KEY_ID,
  r2SecretAccessKey: cfg.CF_R2_SECRET_ACCESS_KEY,
  r2Bucket: cfg.CF_R2_BUCKET,
  r2PublicUrl: cfg.CF_R2_PUBLIC_URL
};

export function assertAssetsEnv(keys) {
  const required = (keys && keys.length ? keys : []).map((k) => [k, assetsEnv[k]]);
  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

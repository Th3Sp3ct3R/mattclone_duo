import { defineSchema, loadConfig, rules } from '@julio/config';
import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const schema = defineSchema({
  NODE_ENV: rules.optionalString('development'),
  PORT: rules.optionalNumber(),
  API_PORT: rules.optionalNumber(4000),
  LOG_LEVEL: rules.optionalString('info'),

  MONGODB_URI: rules.optionalString(),
  JWT_SECRET: rules.optionalString(),

  REDIS_URL: rules.optionalString(),
  RABBITMQ_URL: rules.optionalString(),

  AWS_ACCESS_KEY_ID: rules.optionalString(),
  AWS_SECRET_ACCESS_KEY: rules.optionalString(),
  AWS_S3_BUCKET: rules.optionalString(),
  AWS_REGION: rules.optionalString(),

  SMTP_HOST: rules.optionalString(),
  SMTP_PORT: rules.optionalNumber(0),
  SMTP_USER: rules.optionalString(),
  SMTP_PASS: rules.optionalString(),

  STRIPE_SECRET_KEY: rules.optionalString(),
  STRIPE_WEBHOOK_SECRET: rules.optionalString(),
  STRIPE_PUBLISHABLE_KEY: rules.optionalString(),

  OPENAI_API_KEY: rules.optionalString(),
  OPENAI_ORG_ID: rules.optionalString(),
  OPENAI_PROJECT_ID: rules.optionalString(),

  ANTHROPIC_API_KEY: rules.optionalString(),
  OPENROUTER_API_KEY: rules.optionalString(),
  OPENROUTER_MODEL: rules.optionalString('google/gemma-3-12b-it'),
  CAPTION_MODEL: rules.optionalString('google/gemma-3-12b-it'),
  CLIP_DETECTION_MODEL: rules.optionalString('google/gemma-3-12b-it'),
  TREND_RERANK_MODEL: rules.optionalString('google/gemma-3-12b-it'),
  SENTRY_DSN: rules.optionalString(),
  SENTRY_RELEASE: rules.optionalString(),

  HUGGINGFACE_API_KEY: rules.optionalString(),
  HUGGINGFACE_CHAT_MODEL: rules.optionalString(),

  CLOUD_PROVIDER: rules.optionalString('vmos'),
  VMOS_ACCESS_KEY: rules.optionalString(),
  VMOS_SECRET_KEY: rules.optionalString(),
  VMOS_API_BASE_URL: rules.optionalString('https://api.vmoscloud.com'),

  ENGINE_PUBLIC_URL: rules.optionalString(),
  INSTAGRAM_APK_URL: rules.optionalString(),
  TIKTOK_APK_URL: rules.optionalString(),
  CHROME_APK_URL: rules.optionalString(),
  YOUTUBE_APK_URL: rules.optionalString(),
  YOUTUBE_MUSIC_APK_URL: rules.optionalString(),
  SPOTIFY_APK_URL: rules.optionalString(),
  APPLE_MUSIC_APK_URL: rules.optionalString(),
  REDDIT_APK_URL: rules.optionalString(),
  X_APK_URL: rules.optionalString(),
  TELEGRAM_APK_URL: rules.optionalString(),
  LINKEDIN_APK_URL: rules.optionalString(),
  THREADS_APK_URL: rules.optionalString(),
  SAI_APK_URL: rules.optionalString(),
  SUNO_XAPK_URL: rules.optionalString(),

  CF_R2_ACCOUNT_ID: rules.optionalString(),
  CF_R2_ACCESS_KEY_ID: rules.optionalString(),
  CF_R2_SECRET_ACCESS_KEY: rules.optionalString(),
  CF_R2_BUCKET: rules.optionalString('engine-apks'),
  CF_R2_PUBLIC_URL: rules.optionalString(),

  DEFAULT_IMAP_SERVER: rules.optionalString('imap.outlook.com'),
  DEFAULT_IMAP_PORT: rules.optionalNumber(993),
  DJEKXA_API_KEY: rules.optionalString(),
  DJEKXA_API_TOKEN: rules.optionalString(),
  DJEKXA_BASE_URL: rules.optionalString(),
  DJEKXA_FX_RUB_PER_USD: rules.optionalNumber(90),

  DOWNLOAD_DIR: rules.optionalString('./media/downloads'),
  MEDIA_DOWNLOAD_DIR: rules.optionalString('./media'),
  TRANSFORMS_DIR: rules.optionalString('./media/transforms'),
  MAX_DURATION_SECONDS: rules.optionalNumber(7200),
  WHISPER_MODEL: rules.optionalString('base'),
  WHISPER_BIN: rules.optionalString('whisper'),
  EMBEDDING_MODEL: rules.optionalString('Xenova/all-MiniLM-L6-v2'),
  NICHE_DISCOVERY_INTERVAL_MS: rules.optionalNumber(1_800_000),
  CONTENT_DOWNLOAD_INTERVAL_MS: rules.optionalNumber(60_000),
  CONTENT_DOWNLOAD_BATCH_SIZE: rules.optionalNumber(5),
  CROSS_POST_INTERVAL_MS: rules.optionalNumber(60_000),
  POST_EXECUTOR_CONCURRENCY: rules.optionalNumber(2),
  DEVICE_EXECUTOR_CONCURRENCY: rules.optionalNumber(2),
  ACCOUNT_EXECUTOR_CONCURRENCY: rules.optionalNumber(2),
  PIPELINE_EXECUTOR_CONCURRENCY: rules.optionalNumber(2),
  TRANSFORM_EXECUTOR_CONCURRENCY: rules.optionalNumber(2),
  SESSION_MONITOR_INTERVAL_MS: rules.optionalNumber(1_800_000),
  PROXY_MONITOR_INTERVAL_MS: rules.optionalNumber(1_800_000),
  TREND_MATCH_INTERVAL_MS: rules.optionalNumber(21_600_000),
  TREND_FEEDBACK_INTERVAL_MS: rules.optionalNumber(86_400_000),
  PROXY_VERIFY_SAMPLE: rules.optionalNumber(2),
  PROXY_MIN_AVAILABLE: rules.optionalNumber(3),
  MAX_CONSECUTIVE_VERIFY_FAILURES: rules.optionalNumber(3),
  VMOS_AUTO_BUY_ENABLED: rules.optionalString('false'),
  VMOS_AUTO_BUY_DYNAMIC_GOOD_ID: rules.optionalString(''),
  VMOS_AUTO_BUY_GB_THRESHOLD: rules.optionalNumber(5),
  VMOS_AUTO_BUY_GB_PACKAGE_QTY: rules.optionalNumber(1),
  VMOS_DAILY_SPEND_CAP_USD: rules.optionalNumber(0)
});

const cfg = loadConfig(process.env, schema);

export const env = {
  nodeEnv: cfg.NODE_ENV,
  port: cfg.PORT || cfg.API_PORT,
  logLevel: cfg.LOG_LEVEL,

  mongodbUri: cfg.MONGODB_URI,
  jwtSecret: cfg.JWT_SECRET,

  redisUrl: cfg.REDIS_URL,
  rabbitmqUrl: cfg.RABBITMQ_URL,

  awsAccessKeyId: cfg.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: cfg.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: cfg.AWS_S3_BUCKET,
  awsRegion: cfg.AWS_REGION,

  smtpHost: cfg.SMTP_HOST,
  smtpPort: cfg.SMTP_PORT,
  smtpUser: cfg.SMTP_USER,
  smtpPass: cfg.SMTP_PASS,

  stripeSecretKey: cfg.STRIPE_SECRET_KEY,
  stripeWebhookSecret: cfg.STRIPE_WEBHOOK_SECRET,
  stripePublishableKey: cfg.STRIPE_PUBLISHABLE_KEY,

  openAiApiKey: cfg.OPENAI_API_KEY,
  openAiOrgId: cfg.OPENAI_ORG_ID,
  openAiProjectId: cfg.OPENAI_PROJECT_ID,
  anthropicApiKey: cfg.ANTHROPIC_API_KEY,
  openRouterApiKey: cfg.OPENROUTER_API_KEY,
  openRouterModel: cfg.OPENROUTER_MODEL,
  captionModel: cfg.CAPTION_MODEL,
  clipDetectionModel: cfg.CLIP_DETECTION_MODEL,
  trendRerankModel: cfg.TREND_RERANK_MODEL,
  sentryDsn: cfg.SENTRY_DSN,
  sentryRelease: cfg.SENTRY_RELEASE,

  huggingFaceApiKey: cfg.HUGGINGFACE_API_KEY,
  huggingFaceChatModel: cfg.HUGGINGFACE_CHAT_MODEL,

  cloudProvider: cfg.CLOUD_PROVIDER,
  vmosAccessKey: cfg.VMOS_ACCESS_KEY,
  vmosSecretKey: cfg.VMOS_SECRET_KEY,
  vmosApiBaseUrl: cfg.VMOS_API_BASE_URL,

  enginePublicUrl: cfg.ENGINE_PUBLIC_URL,
  apkUrls: {
    instagram: cfg.INSTAGRAM_APK_URL,
    tiktok: cfg.TIKTOK_APK_URL,
    chrome: cfg.CHROME_APK_URL,
    youtube: cfg.YOUTUBE_APK_URL,
    youtubeMusic: cfg.YOUTUBE_MUSIC_APK_URL,
    spotify: cfg.SPOTIFY_APK_URL,
    appleMusic: cfg.APPLE_MUSIC_APK_URL,
    reddit: cfg.REDDIT_APK_URL,
    x: cfg.X_APK_URL,
    telegram: cfg.TELEGRAM_APK_URL,
    linkedin: cfg.LINKEDIN_APK_URL,
    threads: cfg.THREADS_APK_URL,
    sai: cfg.SAI_APK_URL,
    suno: cfg.SUNO_XAPK_URL
  },
  r2: {
    accountId: cfg.CF_R2_ACCOUNT_ID,
    accessKeyId: cfg.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: cfg.CF_R2_SECRET_ACCESS_KEY,
    bucket: cfg.CF_R2_BUCKET,
    publicUrl: cfg.CF_R2_PUBLIC_URL
  },
  defaultImapServer: cfg.DEFAULT_IMAP_SERVER,
  defaultImapPort: cfg.DEFAULT_IMAP_PORT,
  djekxaApiKey: cfg.DJEKXA_API_KEY || cfg.DJEKXA_API_TOKEN,
  djekxaBaseUrl: cfg.DJEKXA_BASE_URL,
  djekxaFxRubPerUsd: cfg.DJEKXA_FX_RUB_PER_USD,
  downloadDir: cfg.DOWNLOAD_DIR,
  mediaDownloadDir: cfg.MEDIA_DOWNLOAD_DIR,
  transformsDir: cfg.TRANSFORMS_DIR,
  maxDurationSeconds: cfg.MAX_DURATION_SECONDS,
  whisperModel: cfg.WHISPER_MODEL,
  whisperBin: cfg.WHISPER_BIN,
  embeddingModel: cfg.EMBEDDING_MODEL,
  proxyMonitor: {
    verifySample: cfg.PROXY_VERIFY_SAMPLE,
    minAvailable: cfg.PROXY_MIN_AVAILABLE,
    maxConsecutiveFailures: cfg.MAX_CONSECUTIVE_VERIFY_FAILURES
  },
  vmosAutoBuy: {
    enabled: cfg.VMOS_AUTO_BUY_ENABLED === 'true',
    dynamicGoodId: cfg.VMOS_AUTO_BUY_DYNAMIC_GOOD_ID,
    gbThreshold: cfg.VMOS_AUTO_BUY_GB_THRESHOLD,
    gbPackageQty: cfg.VMOS_AUTO_BUY_GB_PACKAGE_QTY,
    dailySpendCapUsd: cfg.VMOS_DAILY_SPEND_CAP_USD
  },
  workerIntervals: {
    nicheDiscoveryMs: cfg.NICHE_DISCOVERY_INTERVAL_MS,
    contentDownloadMs: cfg.CONTENT_DOWNLOAD_INTERVAL_MS,
    crossPostMs: cfg.CROSS_POST_INTERVAL_MS,
    sessionMonitorMs: cfg.SESSION_MONITOR_INTERVAL_MS,
    proxyMonitorMs: cfg.PROXY_MONITOR_INTERVAL_MS,
    trendMatchMs: cfg.TREND_MATCH_INTERVAL_MS,
    trendFeedbackMs: cfg.TREND_FEEDBACK_INTERVAL_MS
  },
  workerLimits: {
    contentDownloadBatchSize: cfg.CONTENT_DOWNLOAD_BATCH_SIZE,
    deviceExecutorConcurrency: cfg.DEVICE_EXECUTOR_CONCURRENCY,
    accountExecutorConcurrency: cfg.ACCOUNT_EXECUTOR_CONCURRENCY,
    postExecutorConcurrency: cfg.POST_EXECUTOR_CONCURRENCY,
    pipelineExecutorConcurrency: cfg.PIPELINE_EXECUTOR_CONCURRENCY,
    transformExecutorConcurrency: cfg.TRANSFORM_EXECUTOR_CONCURRENCY
  },

  authCookieName: 'base.auth'
};

export function assertRequiredEnv(keys) {
  const required = (keys && keys.length ? keys : []).map((key) => [key, env[key]]);
  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

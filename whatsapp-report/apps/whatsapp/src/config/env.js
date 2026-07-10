import { defineSchema, loadConfig, rules } from '@julio/config';
import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const schema = defineSchema({
  MONGODB_URI: rules.optionalString(),
  REDIS_URL: rules.optionalString(),
  RABBITMQ_URL: rules.optionalString(),

  WHATSAPP_POOL_THRESHOLD: rules.optionalNumber(10),
  WHATSAPP_DEVICE_TARGET_DEPTH: rules.optionalNumber(3),
  WHATSAPP_BUY_BATCH_SIZE: rules.optionalNumber(5),
  WHATSAPP_PROBE_CRON: rules.optionalString('*/15 * * * *'),
  WHATSAPP_AUTOBUY_ENABLED: rules.optionalString('false'),

  DARK_SHOPPING_API_KEY: rules.optionalString(),
  DARK_SHOPPING_BASE_URL: rules.optionalString(),

  WHATSAPP_TEAM_APP_ID: rules.optionalString(),
  WHATSAPP_APK_URL: rules.optionalString(),

  WHATSAPP_MCP_HTTP_PORT: rules.optionalNumber(7300),
  WHATSAPP_MCP_AUTH_TOKEN: rules.optionalString(),

  LOG_LEVEL: rules.optionalString('info')
});

export function loadWhatsappEnv(env = process.env) {
  const cfg = loadConfig(env, schema);

  const poolThreshold = cfg.WHATSAPP_POOL_THRESHOLD;
  const deviceTargetDepth = cfg.WHATSAPP_DEVICE_TARGET_DEPTH;
  const buyBatchSize = cfg.WHATSAPP_BUY_BATCH_SIZE;
  const darkShoppingApiKey = cfg.DARK_SHOPPING_API_KEY;
  const darkShoppingBaseUrl = cfg.DARK_SHOPPING_BASE_URL;
  const whatsappTeamAppId = cfg.WHATSAPP_TEAM_APP_ID;

  return {
    mongodbUri: cfg.MONGODB_URI,
    redisUrl: cfg.REDIS_URL,
    rabbitmqUrl: cfg.RABBITMQ_URL,

    poolThreshold,
    deviceTargetDepth,
    buyBatchSize,
    probeCron: cfg.WHATSAPP_PROBE_CRON,
    autobuyEnabled: cfg.WHATSAPP_AUTOBUY_ENABLED === 'true',

    darkShoppingApiKey,
    darkShoppingBaseUrl,

    whatsappTeamAppId,
    whatsappApkUrl: cfg.WHATSAPP_APK_URL,

    mcpHttpPort: cfg.WHATSAPP_MCP_HTTP_PORT,
    mcpAuthToken: cfg.WHATSAPP_MCP_AUTH_TOKEN,

    logLevel: cfg.LOG_LEVEL,

    // Grouped config the composition root consumes.
    pool: { threshold: poolThreshold, buyBatchSize },
    procurement: { apiKey: darkShoppingApiKey, baseUrl: darkShoppingBaseUrl },
    device: { whatsappTeamAppId, proxy: null }
  };
}

export const env = loadWhatsappEnv();

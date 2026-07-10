import { loadWhatsappEnv } from './env.js';

describe('loadWhatsappEnv', () => {
  it('coerces types and applies defaults from an explicit env object', () => {
    const cfg = loadWhatsappEnv({
      WHATSAPP_AUTOBUY_ENABLED: 'true',
      WHATSAPP_POOL_THRESHOLD: '7',
      MONGODB_URI: 'mongodb://x'
    });

    expect(cfg.autobuyEnabled).toBe(true);
    expect(cfg.poolThreshold).toBe(7);
    expect(cfg.mongodbUri).toBe('mongodb://x');
    expect(cfg.probeCron).toBe('*/15 * * * *');
    expect(cfg.mcpHttpPort).toBe(7300);
  });

  it('defaults autobuyEnabled to false when unset', () => {
    const cfg = loadWhatsappEnv({});
    expect(cfg.autobuyEnabled).toBe(false);
  });

  it('exposes grouped config the composition needs', () => {
    const cfg = loadWhatsappEnv({
      WHATSAPP_POOL_THRESHOLD: '9',
      WHATSAPP_BUY_BATCH_SIZE: '4',
      WHATSAPP_DEVICE_TARGET_DEPTH: '2',
      DARK_SHOPPING_API_KEY: 'k',
      DARK_SHOPPING_BASE_URL: 'https://dark.example',
      WHATSAPP_TEAM_APP_ID: 'team-1'
    });

    expect(cfg.pool).toEqual({ threshold: 9, buyBatchSize: 4 });
    expect(cfg.deviceTargetDepth).toBe(2);
    expect(cfg.procurement).toEqual({ apiKey: 'k', baseUrl: 'https://dark.example' });
    expect(cfg.device).toEqual({ whatsappTeamAppId: 'team-1', proxy: null });
  });

  it('groups DuoPlus creds with defaults for the composition root', () => {
    const cfg = loadWhatsappEnv({});

    expect(cfg.duoplus).toEqual({
      apiKey: undefined,
      baseUrl: 'https://openapi.duoplus.net',
      minDelayMs: 1100
    });
  });

  it('reads DuoPlus creds from the environment', () => {
    const cfg = loadWhatsappEnv({
      DUOPLUS_API_KEY: 'dp-key',
      DUOPLUS_API_BASE_URL: 'https://duoplus.example',
      DUOPLUS_MIN_DELAY_MS: '2000'
    });

    expect(cfg.duoplus).toEqual({
      apiKey: 'dp-key',
      baseUrl: 'https://duoplus.example',
      minDelayMs: 2000
    });
  });
});

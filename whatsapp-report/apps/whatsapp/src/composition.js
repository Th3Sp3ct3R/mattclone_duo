import * as infra from '@julio/whatsapp-infra';
import { createDarkShoppingClient, importDelivered } from '@julio/integrations';
import { createCloudPhoneProvider, DuoplusClient } from '@julio/device-control';
import { getRedis } from '@julio/api/db/redis';
import { publishJson } from '@julio/api/queue/rabbitmq';
import { createStructuredLogger } from '@julio/logger';

/**
 * Composition root: wire every port adapter into a single `ctx` object.
 *
 * Pure wiring — no I/O runs at import. `getRedis` is lazy and nothing connects
 * at call time beyond what the individual factories do. Every dependency is
 * destructured from `deps` with the real import as its default so tests can
 * inject fakes for the whole graph.
 */
export function buildContext({ env, deps = {} } = {}) {
  const D = {
    createMongoAccountRepo: infra.createMongoAccountRepo,
    createMongoDeviceQueueRepo: infra.createMongoDeviceQueueRepo,
    createMongoReportRepo: infra.createMongoReportRepo,
    createRabbitJobDispatcher: infra.createRabbitJobDispatcher,
    createRabbitRedisEventBus: infra.createRabbitRedisEventBus,
    createKeychainEnvSecretResolver: infra.createKeychainEnvSecretResolver,
    createExpenseRecorder: infra.createExpenseRecorder,
    createDarkShoppingProcurementAdapter: infra.createDarkShoppingProcurementAdapter,
    createDuoplusDeviceRegistrationAdapter: infra.createDuoplusDeviceRegistrationAdapter,
    createWhatsappAutomationAdapter: infra.createWhatsappAutomationAdapter,
    systemClock: infra.systemClock,
    createDarkShoppingClient,
    importDelivered,
    createCloudPhoneProvider,
    DuoplusClient,
    getRedis,
    publishJson,
    createStructuredLogger,
    ...deps
  };

  const redis = D.getRedis(env.redisUrl);
  const logger = D.createStructuredLogger({ level: env.logLevel, base: { service: 'whatsapp' } });
  const clock = D.systemClock;

  const accountRepo = D.createMongoAccountRepo();
  const deviceQueueRepo = D.createMongoDeviceQueueRepo();
  const reportRepo = D.createMongoReportRepo();
  const jobDispatcher = D.createRabbitJobDispatcher();
  const eventBus = D.createRabbitRedisEventBus({ redis, publishJson: D.publishJson });
  const secretResolver = D.createKeychainEnvSecretResolver();
  const expenseRecorder = D.createExpenseRecorder();

  const darkShoppingClient = D.createDarkShoppingClient({
    apiKey: env.procurement.apiKey,
    baseUrl: env.procurement.baseUrl
  });
  const procurement = D.createDarkShoppingProcurementAdapter({
    client: darkShoppingClient,
    importer: { importDelivered: D.importDelivered },
    // Gated until the real dark.shopping delivery format is captured & verified.
    config: { deliveryFormatVerified: false }
  });

  const duoplusClient = new D.DuoplusClient({
    apiKey: env.duoplus.apiKey,
    baseUrl: env.duoplus.baseUrl,
    minDelayMs: env.duoplus.minDelayMs
  });
  const provider = D.createCloudPhoneProvider({
    type: 'duoplus',
    apiKey: env.duoplus.apiKey,
    baseUrl: env.duoplus.baseUrl,
    minDelayMs: env.duoplus.minDelayMs
  });
  const deviceRegistration = D.createDuoplusDeviceRegistrationAdapter({
    client: duoplusClient,
    config: { whatsappTeamAppId: env.device.whatsappTeamAppId, proxy: env.device.proxy }
  });
  const automation = D.createWhatsappAutomationAdapter({ provider, secretResolver });

  return {
    accountRepo,
    deviceQueueRepo,
    reportRepo,
    procurement,
    deviceRegistration,
    automation,
    expenseRecorder,
    jobDispatcher,
    eventBus,
    secretResolver,
    clock,
    logger,
    config: {
      poolThreshold: env.pool.threshold,
      buyBatchSize: env.pool.buyBatchSize,
      deviceTargetDepth: env.deviceTargetDepth,
      autobuyEnabled: env.autobuyEnabled
    }
  };
}

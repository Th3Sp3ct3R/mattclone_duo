import { logger } from '@julio/api/logger';
import { consumeJson } from '@julio/api/queue/rabbitmq';

import { handleAccountJob } from './handlers/account.handler.js';
import { handleDeviceJob } from './handlers/device.handler.js';
import { handleDiscoveryJob } from './handlers/discovery.handler.js';
import { handlePipelineJob } from './handlers/pipeline.handler.js';
import { handlePostJob } from './handlers/post.handler.js';
import { handleProcurementJob } from './handlers/procurement.handler.js';
import { handleProxyJob } from './handlers/proxy.handler.js';
import { handleScrapeJob } from './handlers/scrape.handler.js';
import { handleTransformJob } from './handlers/transform.handler.js';
import { handleTrendJob } from './handlers/trend.handler.js';

export async function startEngineWorkers({ concurrency = {} } = {}) {
  await consumeJson('engine.device', handleDeviceJob, { prefetch: concurrency.device || 2 });
  await consumeJson('engine.account', handleAccountJob, { prefetch: concurrency.account || 2 });
  await consumeJson('engine.post', handlePostJob, { prefetch: concurrency.post || 2 });
  await consumeJson('engine.pipeline', handlePipelineJob, { prefetch: concurrency.pipeline || 2 });
  await consumeJson('engine.transform', handleTransformJob, { prefetch: concurrency.transform || 2 });
  await consumeJson('engine.procurement', handleProcurementJob, { prefetch: 1 });
  await consumeJson('engine.discovery', handleDiscoveryJob, { prefetch: concurrency.discovery || 1 });
  await consumeJson('engine.scrape', handleScrapeJob, { prefetch: concurrency.scrape || 1 });
  await consumeJson('engine.trend', handleTrendJob, { prefetch: concurrency.trend || 1 });
  await consumeJson('engine.proxy', handleProxyJob, { prefetch: concurrency.proxy || 1 });
  logger.info('[engine-worker] consumers registered');
}

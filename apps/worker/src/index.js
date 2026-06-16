import { env } from '@julio/api/config/env';
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { getRedis, disconnectRedis } from '@julio/api/db/redis';
import { connectRabbitmq, disconnectRabbitmq } from '@julio/api/queue/rabbitmq';
import { startCron, stopCron } from '@julio/api/cron';
import { logger } from '@julio/api/logger';
import { startEmailWorker } from './email.worker.js';
import { startEngineWorkers } from './engine.worker.js';

async function main() {
  // Keep parity with the old API bootstrap: connect infra + start long-lived jobs.
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  if (!env.redisUrl) throw new Error('Missing REDIS_URL');
  if (!env.rabbitmqUrl) throw new Error('Missing RABBITMQ_URL');
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass) {
    throw new Error('Missing SMTP_* env vars');
  }

  await connectMongo(env.mongodbUri);
  getRedis(env.redisUrl);
  await connectRabbitmq(env.rabbitmqUrl);
  startCron();
  await startEmailWorker();
  await startEngineWorkers({
    concurrency: {
      device: env.workerLimits.deviceExecutorConcurrency,
      account: env.workerLimits.accountExecutorConcurrency,
      post: env.workerLimits.postExecutorConcurrency,
      pipeline: env.workerLimits.pipelineExecutorConcurrency,
      transform: env.workerLimits.transformExecutorConcurrency
    }
  });

  logger.info('[worker] running');

  async function shutdown(signal) {
    logger.info(`[worker] shutting down (${signal})`);
    stopCron();
    await disconnectRabbitmq();
    await disconnectRedis();
    await disconnectMongo();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Worker failed to start', err);
  process.exit(1);
});




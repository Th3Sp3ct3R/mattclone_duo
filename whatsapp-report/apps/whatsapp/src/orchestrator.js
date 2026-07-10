// orchestrator.js — process entrypoint for @julio/whatsapp-app.
//
// Wires the whole app together: connects infra, builds the composition-root
// `ctx`, schedules the reconciler tick (node-cron — our own, NOT the engine's
// startCron), subscribes to key events for event-driven speed, registers the
// six queue consumers (each wrapped with the DLQ ledger + per-job correlationId),
// and installs graceful-shutdown handlers.
//
// No I/O runs at import: `main()` only executes on direct-run or when a test
// calls it with fakes. The exported `reconcileTick` / `HANDLERS` /
// `registerConsumers` pieces are individually testable with injected fakes.
import cron from 'node-cron';

import { reconcile } from '@julio/whatsapp';
import { consumeJsonWithDlq } from '@julio/whatsapp-infra';
import { releaseLeasesByOwner } from '@julio/shared';

import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { getRedis, disconnectRedis } from '@julio/api/db/redis';
import {
  connectRabbitmq,
  disconnectRabbitmq,
  consumeJson,
  publishJson
} from '@julio/api/queue/rabbitmq';
import { EngineDevice } from '@julio/api/models/engine-device';

import { env } from './config/env.js';
import { buildContext } from './composition.js';
import { buildSnapshot } from './snapshot.js';
import { dispatchIntents } from './intents.js';
import { runJob } from './run-job.js';
import { buyAccountsHandler } from './handlers/buy-accounts.handler.js';
import { fillQueueHandler } from './handlers/fill-queue.handler.js';
import { bringOnlineHandler } from './handlers/bring-online.handler.js';
import { probeHealthHandler } from './handlers/probe-health.handler.js';
import { replaceBannedHandler } from './handlers/replace-banned.handler.js';
import { runReportTaskHandler } from './handlers/run-report-task.handler.js';

// 1) The reconciler tick — pure-ish, testable with a fake ctx.
export async function reconcileTick(
  ctx,
  { buildSnapshotFn = buildSnapshot, reconcileFn = reconcile, dispatchIntentsFn = dispatchIntents } = {}
) {
  const snapshot = await buildSnapshotFn(ctx);
  const intents = reconcileFn(snapshot);
  await dispatchIntentsFn(intents, { jobDispatcher: ctx.jobDispatcher, clock: ctx.clock });
  return intents;
}

// 2) The queue -> handler table.
export const HANDLERS = [
  { queue: 'whatsapp.buy', handler: buyAccountsHandler },
  { queue: 'whatsapp.queue-fill', handler: fillQueueHandler },
  { queue: 'whatsapp.bring-online', handler: bringOnlineHandler },
  { queue: 'whatsapp.probe', handler: probeHealthHandler },
  { queue: 'whatsapp.replace', handler: replaceBannedHandler },
  { queue: 'whatsapp.report', handler: runReportTaskHandler }
];

// 3) Register consumers — testable with injected fakes.
export async function registerConsumers(
  ctx,
  {
    consumeWithDlq = consumeJsonWithDlq,
    consume = consumeJson,
    publish = publishJson,
    run = runJob,
    prefetch = 1,
    maxAttempts = 3
  } = {}
) {
  for (const { queue, handler } of HANDLERS) {
    const wrapped = (payload) =>
      run(
        payload,
        (p, jobRun) =>
          handler(p, {
            ...ctx,
            logger:
              ctx.logger?.child?.({ correlationId: String(jobRun?._id ?? '') }) ?? ctx.logger
          }),
        { clock: ctx.clock }
      );
    await consumeWithDlq(queue, wrapped, {
      consumeJson: consume,
      publishJson: publish,
      clock: ctx.clock,
      logger: ctx.logger,
      prefetch,
      maxAttempts
    });
  }
}

// 4) main() lifecycle — mirrors apps/worker/src/index.js.
export async function main(overrides = {}) {
  const e = overrides.env ?? env;
  if (!e.mongodbUri) throw new Error('Missing MONGODB_URI');
  if (!e.redisUrl) throw new Error('Missing REDIS_URL');
  if (!e.rabbitmqUrl) throw new Error('Missing RABBITMQ_URL');

  await connectMongo(e.mongodbUri);
  getRedis(e.redisUrl);
  await connectRabbitmq(e.rabbitmqUrl);

  const ctx = (overrides.buildContext ?? buildContext)({ env: e });

  // Reconciler cron (node-cron; our own schedule, NOT the engine's startCron).
  const task = cron.schedule(e.probeCron, () => {
    reconcileTick(ctx).catch((err) =>
      ctx.logger?.error?.('reconcile tick failed', { error: err.message })
    );
  });

  // Event-driven speed: react immediately to key events instead of waiting for
  // the next cron tick.
  for (const type of ['account.banned', 'queue.low', 'pool.low']) {
    ctx.eventBus.subscribe(type, () => {
      reconcileTick(ctx).catch(() => {});
    });
  }

  await registerConsumers(ctx);
  ctx.logger?.info?.('[whatsapp] running');

  async function shutdown(signal) {
    ctx.logger?.info?.('[whatsapp] shutting down', { signal });
    task.stop();
    try {
      await releaseLeasesByOwner(EngineDevice, { owner: ctx.owner });
    } catch {
      /* best-effort */
    }
    await disconnectRabbitmq();
    await disconnectRedis();
    await disconnectMongo();
  }

  process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));

  return { ctx, task };
}

// Guarded direct-run entrypoint: only run when executed directly, not when
// imported by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('whatsapp-app failed to start', err);
    process.exit(1);
  });
}

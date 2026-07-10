import { reconcileTick, HANDLERS, registerConsumers, main } from './orchestrator.js';

// Tiny recorder helper (this suite runs ESM under experimental-vm-modules, where
// the `jest` global is not injected — so we roll our own spies).
function recorder(impl = () => undefined) {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
    return impl(...args);
  };
  fn.calls = calls;
  return fn;
}

describe('reconcileTick', () => {
  test('builds snapshot, reconciles, dispatches intents, and returns them', async () => {
    const clock = { now: () => new Date('2026-07-10T09:00:00Z') };
    const jobDispatcher = { dispatch: () => {} };
    const ctx = { jobDispatcher, clock };

    const snapshot = { pool: { available: 3 } };
    const intents = [{ type: 'buy', quantity: 5 }];

    const buildSnapshotFn = recorder(async () => snapshot);
    const reconcileFn = recorder(() => intents);
    const dispatchIntentsFn = recorder(async () => undefined);

    const result = await reconcileTick(ctx, { buildSnapshotFn, reconcileFn, dispatchIntentsFn });

    expect(buildSnapshotFn.calls).toEqual([[ctx]]);
    expect(reconcileFn.calls).toEqual([[snapshot]]);
    expect(dispatchIntentsFn.calls).toHaveLength(1);
    expect(dispatchIntentsFn.calls[0][0]).toBe(intents);
    expect(dispatchIntentsFn.calls[0][1]).toEqual({ jobDispatcher, clock });
    expect(result).toBe(intents);
  });
});

describe('registerConsumers', () => {
  test('registers one DLQ consumer per queue with the right opts, threading correlationId', async () => {
    const clock = { now: () => new Date('2026-07-10T09:00:00Z') };
    const childLogger = { marker: 'child' };
    const logger = { child: recorder(() => childLogger) };
    const ctx = { logger, clock, procurement: {}, accountRepo: {}, expenseRecorder: {} };

    const consume = () => {};
    const publish = () => {};

    // run fake stands in for runJob: it records the call and invokes the inner
    // handler function so we can observe the correlationId-threaded ctx.
    const run = recorder(async (payload, innerFn) => {
      try {
        await innerFn(payload, { _id: 'JR-1' });
      } catch {
        /* real handler may throw on empty ctx — irrelevant here */
      }
      return { ok: true };
    });

    const consumeWithDlq = recorder(async () => undefined);

    await registerConsumers(ctx, {
      consumeWithDlq,
      consume,
      publish,
      run,
      prefetch: 1,
      maxAttempts: 3
    });

    // 6 consumers, one per HANDLERS entry, in order.
    expect(consumeWithDlq.calls).toHaveLength(6);
    expect(HANDLERS).toHaveLength(6);
    expect(consumeWithDlq.calls.map((c) => c[0])).toEqual([
      'whatsapp.buy',
      'whatsapp.queue-fill',
      'whatsapp.bring-online',
      'whatsapp.probe',
      'whatsapp.replace',
      'whatsapp.report'
    ]);

    // Each consumer gets the correctly-shaped opts object.
    for (const call of consumeWithDlq.calls) {
      const opts = call[2];
      expect(opts).toEqual({
        consumeJson: consume,
        publishJson: publish,
        clock,
        logger,
        prefetch: 1,
        maxAttempts: 3
      });
    }

    // Invoke one captured wrapped(payload): it must delegate to `run`, and the
    // inner handler must receive a ctx whose logger is child({ correlationId }).
    const firstWrapped = consumeWithDlq.calls[0][1];
    await firstWrapped({ jobRunId: 'abc' });

    expect(run.calls).toHaveLength(1);
    expect(run.calls[0][0]).toEqual({ jobRunId: 'abc' });
    expect(run.calls[0][2]).toEqual({ clock });
    // correlationId threaded from jobRun._id into logger.child(...)
    expect(logger.child.calls).toContainEqual([{ correlationId: 'JR-1' }]);
  });
});

describe('main env preflight', () => {
  test('rejects when MONGODB_URI is missing', async () => {
    await expect(main({ env: {} })).rejects.toThrow('Missing MONGODB_URI');
  });
});

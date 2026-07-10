import { assignToDevice, transition, enqueueWaiting } from '@julio/whatsapp';
import { bareClock } from '@julio/whatsapp-infra';
import { toDomainAccount, toDomainQueue } from './map.js';

export async function fillQueueHandler(payload, ctx) {
  const { deviceId, count } = payload;
  const queueDoc = await ctx.deviceQueueRepo.find(deviceId);
  if (!queueDoc) return { filled: 0, reason: 'no-queue' };
  let queue = toDomainQueue(queueDoc);
  const poolDocs = await ctx.accountRepo.find({ status: 'purchased', assignedDeviceId: null });
  const candidates = poolDocs.slice(0, count);
  const clock = bareClock(ctx.clock);
  let filled = 0;
  for (const doc of candidates) {
    let acct = toDomainAccount(doc);
    acct = assignToDevice(acct, deviceId);          // single bump
    await ctx.accountRepo.save(acct);
    acct = transition(acct, 'assigned', { clock }); // single bump
    await ctx.accountRepo.save(acct);
    queue = enqueueWaiting(queue, acct.id);          // single bump
    await ctx.deviceQueueRepo.save(queue);
    filled += 1;
  }
  return { filled };
}

import { transition, accountBanned, reportDone } from '@julio/whatsapp';
import { bareClock } from '@julio/whatsapp-infra';
import { toDomainAccount } from './map.js';

export async function runReportTaskHandler(payload, ctx) {
  const { campaignId, accountId, targetMsisdn } = payload;
  const clock = bareClock(ctx.clock);

  // Exactly-once: upsert the per-target task (unique index), short-circuit if already done.
  const task = await ctx.reportRepo.upsertTask({ campaignId, accountId, targetMsisdn });
  if (task?.status === 'done') return { skipped: true, reason: 'already-done' };

  const [acctDoc] = await ctx.accountRepo.find({ _id: accountId });
  if (!acctDoc) {
    await ctx.reportRepo.markTask(task._id, 'failed', 'no-account');
    return { ok: false, reason: 'no-account' };
  }
  const deviceId = acctDoc.assignedDeviceId != null ? String(acctDoc.assignedDeviceId) : null;
  if (!deviceId) {
    await ctx.reportRepo.markTask(task._id, 'failed', 'no-device');
    return { ok: false, reason: 'no-device' };
  }

  const leased = await ctx.lease.claim(deviceId, ctx.owner);
  if (!leased) return { skipped: true, reason: 'device-busy' };
  try {
    const device = await ctx.deviceModel.findById(deviceId).lean();
    const acct = toDomainAccount(acctDoc);
    // Anti-abuse: the humanized rate-limit lives inside reportTarget (ui-flows human actor).
    const result = await ctx.automation.reportTarget(
      { providerDeviceId: device?.providerDeviceId, account: acct },
      targetMsisdn
    );

    if (result?.banned) {
      await ctx.reportRepo.markTask(task._id, 'failed', 'banned');
      const banned = transition(acct, 'banned', { clock });   // single bump -> save
      await ctx.accountRepo.save(banned);
      await ctx.eventBus.publish(accountBanned({ accountId, deviceId }, { clock }));
      return { ok: false, banned: true };
    }
    if (result?.ok) {
      await ctx.reportRepo.markTask(task._id, 'done');
      await ctx.eventBus.publish(reportDone({ campaignId, accountId, targetMsisdn }, { clock }));
      return { ok: true };
    }
    await ctx.reportRepo.markTask(task._id, 'failed', 'report-not-confirmed');
    return { ok: false };
  } finally {
    await ctx.lease.release(deviceId, ctx.owner);
  }
}

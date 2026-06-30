import { env } from '@julio/api/config/env';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import { getPlatformAdapter } from '@julio/automation';
import { EmailCodeFetcher } from '@julio/integrations';

import { runEngineJob } from '../engine-job-runner.js';
import { emitDeviceEvent } from '../device-event-emitter.js';
import { assertDeviceReachable, buildHumanContext, getProvider, withDeviceLease } from './worker-context.js';
import { PreflightError, checkpointReasonForPreflightCode, runJobPreflight } from './preflight.js';
import { hydrateAccountSecrets } from './secret-resolver.js';

const PERSISTABLE_FAILURE_STATUSES = new Set(['checkpointed', 'banned', 'cooldown', 'retired']);

function accountStatusForResult(result = {}) {
  if (result.success || result.status === 'active') return 'active';
  return PERSISTABLE_FAILURE_STATUSES.has(result.status) ? result.status : 'checkpointed';
}

function getAccountEmailFetcher(account) {
  const email = account?.credentials?.email;
  const password = account?.credentials?.emailPassword;
  if (!email || !password) return null;
  return new EmailCodeFetcher({ email, password, host: env.defaultImapServer, port: env.defaultImapPort });
}

async function resolveAccountDevice(account) {
  if (!account?.assignedDeviceId) throw new Error('Account has no assigned device');
  const device = await EngineDevice.findById(account.assignedDeviceId);
  if (!device) throw new Error('Assigned device not found');
  return device;
}

function checkpointReasonForResult(result = {}) {
  const reason = String(result.checkpointReason || result.reason || '').toLowerCase();
  if (!reason) return '';
  if (reason === 'two_factor' || reason.includes('2-step') || reason.includes('two-factor')) return 'two_factor';
  if (reason.includes('captcha')) return 'captcha';
  if (reason === 'suspicious_login' || reason.includes('suspicious') || reason.includes('unusual activity')) {
    return 'suspicious_login';
  }
  if (reason === 'missing_app') return 'missing_app';
  if (reason === 'missing_subscription') return 'missing_subscription';
  if (reason === 'missing_proxy') return 'missing_proxy';
  if (result.status === 'checkpointed') return 'manual_intervention';
  return '';
}

async function checkpointAccount(account, reason, message) {
  await EngineAccount.findByIdAndUpdate(account._id, {
    status: 'checkpointed',
    checkpointReason: reason,
    'health.lastFailureReason': message,
    'health.consecutiveFailures': Number(account.health?.consecutiveFailures || 0) + 1
  });
}

export async function handleAccountJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }, jobRun) => {
    const account = await EngineAccount.findById(targetId);
    if (!account) throw new Error('Account not found');
    const device = await resolveAccountDevice(account);

    return withDeviceLease(device._id, async (leasedDevice) => {
      const provider = getProvider(leasedDevice.provider);
      const event = (message, data = {}, level = 'info') =>
        emitDeviceEvent({
          deviceId: leasedDevice._id,
          level,
          source: 'account',
          jobRunId: jobRun._id,
          jobName,
          message,
          data: { accountId: String(account._id), platform: account.platform, ...data }
        });
      await assertDeviceReachable(provider, leasedDevice, (message, data = {}) =>
        emitDeviceEvent({
          deviceId: leasedDevice._id,
          level: 'error',
          source: 'account',
          jobRunId: jobRun._id,
          jobName,
          message,
          data: { accountId: String(account._id), platform: account.platform, ...data }
        })
      );
      try {
        await runJobPreflight({ provider, device: leasedDevice, account, platform: account.platform });
      } catch (err) {
        if (err instanceof PreflightError) {
          const checkpointReason = checkpointReasonForPreflightCode(err.code);
          await event('account preflight failed', { code: err.code, reason: checkpointReason }, 'error');
          await checkpointAccount(account, checkpointReason, err.message);
        }
        throw err;
      }
      const controller = provider.createDirectController(leasedDevice.providerDeviceId);
      const { actor } = await buildHumanContext({
        controller,
        accountId: account._id,
        deviceId: leasedDevice._id
      });
      const runtimeAccount = await hydrateAccountSecrets(account);
      const emailCodeFetcher = getAccountEmailFetcher(runtimeAccount);
      const adapter = getPlatformAdapter(account.platform);

      await EngineAccount.findByIdAndUpdate(account._id, {
        status: jobName === 'login' ? 'logging_in' : account.status,
        checkpointReason: jobName === 'login' ? '' : account.checkpointReason || '',
        'health.lastLoginCheckAt': new Date()
      });

      let result;
      if (jobName === 'login') {
        await event('account login started');
        result = await adapter.login(controller, runtimeAccount, { actor, emailCodeFetcher });
        if (result?.status === 'missing_credentials') {
          await event('account login skipped: missing credentials', { reason: result.reason || '' }, 'error');
        }
        if (String(result?.reason || '').endsWith('_launch_failed')) {
          await event('platform failed to launch / foreground', { reason: result.reason }, 'error');
        }
      } else if (jobName === 'profile-setup') {
        await event('account profile setup started');
        result = await adapter.setupProfile(controller, runtimeAccount, { actor });
      } else if (jobName === 'warmup') {
        await event('account warmup started');
        result = await adapter.warmup(controller, runtimeAccount, {
          actor,
          provider,
          providerDeviceId: leasedDevice.providerDeviceId
        });
      } else {
        await event('account health check started');
        result = await adapter.healthCheck(controller, runtimeAccount, { actor });
      }
      await event('account action completed', { status: result.status || '', success: result.success !== false });

      const accountStatus = accountStatusForResult(result);
      const active = accountStatus === 'active';
      const checkpointReason = active ? '' : checkpointReasonForResult({ ...result, status: accountStatus });
      await EngineAccount.findByIdAndUpdate(account._id, {
        status: accountStatus,
        checkpointReason,
        session: {
          ...(account.session?.toObject?.() || account.session || {}),
          lastLoginDeviceId: leasedDevice._id,
          capturedAt: new Date(),
          challengeReason: active ? '' : result.reason || '',
          twoFactorState: result.twoFactorState ?? account.session?.twoFactorState ?? ''
        },
        'health.lastHealthyAt': active ? new Date() : account.health?.lastHealthyAt || null,
        'health.lastFailureReason': active ? '' : result.reason || '',
        'health.consecutiveFailures': active ? 0 : Number(account.health?.consecutiveFailures || 0) + 1
      });
      if (jobName === 'health-check' && !active && accountStatus === 'cooldown') {
        await dispatchEngineJob({
          queueName: 'engine.account',
          jobName: 'login',
          targetType: 'account',
          targetId: account._id,
          payload: { accountId: String(account._id), platform: account.platform, recovery: true },
          idempotencyKey: `account:recovery-login:${account._id}:${new Date().toISOString().slice(0, 10)}`
        });
      }
      return result;
    });
  });
}

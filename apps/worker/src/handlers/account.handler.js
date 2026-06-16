import { env } from '@julio/api/config/env';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';
import {
  checkInstagramLoginState,
  checkTikTokLoginState,
  loginInstagram,
  loginTikTok,
  setupInstagramProfile,
  setupTikTokProfile,
  warmupInstagramAccount,
  warmupTikTokAccount
} from '@julio/automation';
import { EmailCodeFetcher } from '@julio/integrations';

import { runEngineJob } from '../engine-job-runner.js';
import { getProvider, withDeviceLease } from './worker-context.js';

const INSTAGRAM_CHALLENGE_MARKERS = [
  'check your email',
  'enter the code',
  'unusual activity',
  'suspended',
  'checkpoint',
  'confirm it',
  'challenge required'
];

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

async function detectInstagramChallenge(controller) {
  const dump = await controller.getUIDump().catch(() => '');
  const text = String(dump || '').toLowerCase();
  const marker = INSTAGRAM_CHALLENGE_MARKERS.find((candidate) => text.includes(candidate));
  return marker ? { challenged: true, marker } : { challenged: false };
}

export async function handleAccountJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }) => {
    const account = await EngineAccount.findById(targetId);
    if (!account) throw new Error('Account not found');
    const device = await resolveAccountDevice(account);

    return withDeviceLease(device._id, async (leasedDevice) => {
      const provider = getProvider();
      const controller = provider.createDirectController(leasedDevice.providerDeviceId);
      const emailCodeFetcher = getAccountEmailFetcher(account);
      const credentials = {
        username: account.credentials?.username,
        password: account.credentials?.password,
        emailCodeFetcher
      };

      await EngineAccount.findByIdAndUpdate(account._id, {
        status: jobName === 'login' ? 'logging_in' : account.status,
        'health.lastLoginCheckAt': new Date()
      });

      let result;
      if (jobName === 'login') {
        result = account.platform === 'instagram' ? await loginInstagram(controller, credentials) : await loginTikTok(controller, credentials);
      } else if (jobName === 'profile-setup') {
        result =
          account.platform === 'instagram'
            ? await setupInstagramProfile(controller, account.profile || {})
            : await setupTikTokProfile(controller, account.profile || {});
      } else if (jobName === 'warmup') {
        result =
          account.platform === 'instagram'
            ? await warmupInstagramAccount(controller, account.health?.warmupConfig || {})
            : await warmupTikTokAccount({
                client: provider.client,
                padCode: leasedDevice.providerDeviceId,
                ...(account.health?.warmupConfig || {})
              });
      } else {
        const state =
          account.platform === 'instagram'
            ? await checkInstagramLoginState(controller)
            : await checkTikTokLoginState(controller);
        const challenge =
          account.platform === 'instagram' && state !== 'logged_in'
            ? await detectInstagramChallenge(controller)
            : { challenged: false };
        result = {
          success: state === 'logged_in',
          status: state === 'logged_in' ? 'active' : challenge.challenged ? 'checkpointed' : 'cooldown',
          state,
          reason: challenge.marker || ''
        };
      }

      const active = result.success || result.status === 'active';
      await EngineAccount.findByIdAndUpdate(account._id, {
        status: active ? 'active' : result.status || 'checkpointed',
        session: {
          ...(account.session?.toObject?.() || account.session || {}),
          lastLoginDeviceId: leasedDevice._id,
          capturedAt: new Date(),
          challengeReason: active ? '' : result.reason || ''
        },
        'health.lastHealthyAt': active ? new Date() : account.health?.lastHealthyAt || null,
        'health.lastFailureReason': active ? '' : result.reason || '',
        'health.consecutiveFailures': active ? 0 : Number(account.health?.consecutiveFailures || 0) + 1
      });
      if (jobName === 'health-check' && !active && result.status === 'cooldown') {
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

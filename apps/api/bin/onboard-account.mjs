#!/usr/bin/env node
// Operator CLI: create one TikTok (or other platform) account record, assign
// it to a free device slot, and (optionally) enqueue the onboarding workflow —
// all in one command.
//
// The script is intentionally thin. It composes the same helpers used by the
// HTTP API controllers (canDeviceAcceptAccount,
// findAccountDevicePlatformConflict, enqueueAccountOnboarding) so the safety
// guarantees are identical to calling those endpoints with a valid admin
// token. It writes directly to Mongo to avoid needing the API server to be
// running and to keep the operator flow scriptable.
//
// SECURITY MODEL
// ==============
// Passwords and email-passwords live ONLY in macOS Keychain. This script:
//   1. Verifies a Keychain entry exists (presence-only check, no value read).
//   2. Writes the reference (`keychain:<service-name>`) into the account
//      record's `credentials.secretRefs`.
//   3. Leaves `credentials.password` and `credentials.emailPassword` empty.
//
// The actual secret values never cross into Node, never reach argv, never
// touch disk, never appear in stdout. The worker that consumes the account
// record resolves `secretRefs` against Keychain at runtime.
//
// USAGE
// =====
//   node apps/api/bin/onboard-account.mjs tiktok --username <handle> --device <id|name|any> [--email <addr>] [--warmup] [--apply]
//
//   <platform>     one of: tiktok, instagram, youtube
//   --username     TikTok handle (no @). Required.
//   --device       device _id, name/providerDeviceId, or "any" to pick first free slot.
//                  "any" runs the same slot query as scripts/list-free-tiktok-slots.mjs.
//   --email        recovery email address (optional, lowercased). If set, the
//                  script also requires a `keychain:tiktok-<handle>-email-password`
//                  entry to be present.
//   --warmup       after create+assign, enqueue onboarding with the warmup flag.
//   --apply        actually write to Mongo (default: dry-run, prints plan).
//   -h, --help     show this help.
//
// EXAMPLES
// ========
//   # dry-run; nothing written
//   node apps/api/bin/onboard-account.mjs tiktok --username sarahjohnson_1200023 --device any
//
//   # apply with a specific device
//   node apps/api/bin/onboard-account.mjs tiktok --username sarahjohnson_1200023 --device 6a420bdfd4fb22b6109aeecd --email sarahjohnson@personal.example --apply
//
//   # apply + start onboarding (login -> profile-setup -> warmup loop)
//   node apps/api/bin/onboard-account.mjs tiktok --username sarahjohnson_1200023 --device snap_qXFA1 --warmup --apply
//
// PREREQUISITES
// =============
//   1. Password for the account lives in Keychain under service
//      `tiktok-<handle>-password`. Set it with the helper:
//         ~/.mavis/agents/main/workspace/migrate-to-keychain.sh tiktok-<handle>-password
//   2. If --email is given, the email password must live under
//      `tiktok-<handle>-email-password`.
//   3. MONGODB_URI is set in the root .env.
//   4. RABBITMQ_URL is set if you want --warmup onboarding jobs to actually
//      dispatch (otherwise the EngineJobRun is upserted but no message is
//      published — matching the API controller's behavior).
//
// ACCOUNT PROVENANCE
// ==================
// This script does NOT police account provenance. It will happily create a
// record for any username whose Keychain entry you can point at. Provenance
// (whether you actually own the account or whether it was bulk-purchased) is a
// pre-flight decision between you and your operator agent. The runbook
// `~/.mavis/agents/main/workspace/RUNBOOK-tiktok-accounts.md` covers the
// legitimate-account workflow end-to-end.

import { spawnSync } from 'node:child_process';

import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const { env } = await import('@julio/api/config/env');
const { connectMongo, disconnectMongo } = await import('@julio/api/db/mongo');
const { EngineAccount } = await import('@julio/api/models/engine-account');
const { EngineDevice } = await import('@julio/api/models/engine-device');
const { findAccountDevicePlatformConflict } = await import('@julio/api/utils/account-device-platform');
const { canDeviceAcceptAccount } = await import('@julio/api/utils/device-account-eligibility');
const { enqueueAccountOnboarding } = await import('@julio/api/services/account-onboarding');

const ALLOWED_PLATFORMS = new Set(['tiktok', 'instagram', 'youtube']);
const KEYCHAIN_REF_RE = /^keychain:[A-Za-z0-9_.:/-]+$/;

function usage() {
  process.stdout.write(
    [
      'Usage:',
      '  node apps/api/bin/onboard-account.mjs <platform> --username <handle> --device <id|name|any> [--email <addr>] [--warmup] [--apply]',
      '',
      'Platforms: tiktok, instagram, youtube',
      '',
      'Options:',
      '  --username <handle>     account handle (required)',
      '  --device   <selector>   device _id, name/providerDeviceId, or "any" (required)',
      '  --email    <addr>       recovery email (optional)',
      '  --warmup                enqueue login + profile-setup + warmup jobs',
      '  --apply                 write to Mongo (default: dry-run)',
      '  -h, --help              show this help',
      '',
      'See apps/api/bin/README.md for full docs and security model.'
    ].join('\n') + '\n'
  );
}

function parseArgs(argv) {
  const out = {
    platform: '',
    username: '',
    deviceSelector: '',
    email: '',
    warmup: false,
    apply: false,
    help: false
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      out.help = true;
    } else if (arg === '--apply') {
      out.apply = true;
    } else if (arg === '--warmup') {
      out.warmup = true;
    } else if (arg === '--username') {
      out.username = String(argv[++i] || '').trim();
    } else if (arg === '--device') {
      out.deviceSelector = String(argv[++i] || '').trim();
    } else if (arg === '--email') {
      out.email = String(argv[++i] || '').trim();
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  out.platform = String(positional[0] || '').trim().toLowerCase();
  return out;
}

function keychainServiceForPassword(platform, handle) {
  return `${platform}-${handle}-password`;
}

function keychainServiceForEmailPassword(platform, handle) {
  return `${platform}-${handle}-email-password`;
}

function keychainRefForPassword(platform, handle) {
  return `keychain:${keychainServiceForPassword(platform, handle)}`;
}

function keychainRefForEmailPassword(platform, handle) {
  return `keychain:${keychainServiceForEmailPassword(platform, handle)}`;
}

// Presence-only check. Returns true if `security find-generic-password`
// resolves the (account, service) pair. Never reads or prints the value.
function keychainEntryExists(service) {
  if (process.platform !== 'darwin') {
    throw new Error(
      `Keychain integration is macOS-only (platform=${process.platform}). ` +
        'Set up the secret in your platform equivalent before running this CLI.'
    );
  }
  // `security find-generic-password -a <acct> -s <svc>` exits 0 with no
  // stdout when the entry exists. We pass -a "$USER" to match the convention
  // used by migrate-to-keychain.sh.
  const result = spawnSync('security', ['find-generic-password', '-a', process.env.USER || '', '-s', service], {
    stdio: ['ignore', 'ignore', 'ignore']
  });
  return result.status === 0;
}

function assertKeychainRef(value, label) {
  if (!KEYCHAIN_REF_RE.test(value)) {
    throw new Error(`Internal error: ${label} produced an invalid keychain ref "${value}"`);
  }
}

async function resolveDevice({ platform, selector }) {
  if (!selector) {
    throw new Error('--device is required (pass a device _id, name/providerDeviceId, or "any")');
  }

  if (selector === 'any') {
    const [devices, accounts] = await Promise.all([
      EngineDevice.find({ retiredAt: null }).select('_id provider providerDeviceId name capacity').lean(),
      EngineAccount.find({ platform, retiredAt: null }).select('_id platform assignedDeviceId').lean()
    ]);
    const usedByDevice = new Map();
    for (const a of accounts) {
      const id = a.assignedDeviceId ? String(a.assignedDeviceId) : null;
      if (!id) continue;
      usedByDevice.set(id, (usedByDevice.get(id) || 0) + 1);
    }
    const candidates = devices
      .map((d) => {
        const cap = d.capacity?.maxAccounts ?? 1;
        const used = usedByDevice.get(String(d._id)) || 0;
        return { device: d, free: Math.max(0, cap - used) };
      })
      .filter((c) => c.free > 0 && canDeviceAcceptAccount(c.device).ok);
    if (!candidates.length) {
      throw new Error(`No eligible ${platform} devices with a free slot found. Run scripts/list-free-tiktok-slots.mjs.`);
    }
    candidates.sort((a, b) => b.free - a.free);
    return candidates[0].device;
  }

  // Try _id, then providerDeviceId, then name.
  const orFilters = [{ _id: selector }];
  if (/^[a-f0-9]{24}$/i.test(selector)) {
    orFilters.push({ _id: selector });
  }
  orFilters.push({ providerDeviceId: selector });
  orFilters.push({ name: selector });

  const device = await EngineDevice.findOne({ $or: orFilters, retiredAt: null })
    .select('_id provider providerDeviceId name capacity providerMeta')
    .lean();
  if (!device) {
    throw new Error(`Device "${selector}" not found. Use a valid _id, providerDeviceId, name, or "any".`);
  }
  return device;
}

function buildAccountDoc({ platform, username, email, deviceId }) {
  const passwordRef = keychainRefForPassword(platform, username);
  assertKeychainRef(passwordRef, 'password ref');
  const secretRefs = { password: passwordRef, emailPassword: '', totp: '' };
  if (email) {
    const emailPasswordRef = keychainRefForEmailPassword(platform, username);
    assertKeychainRef(emailPasswordRef, 'email-password ref');
    secretRefs.emailPassword = emailPasswordRef;
  }
  return {
    platform,
    status: 'new',
    credentials: {
      username,
      password: '',
      email: email ? email.toLowerCase() : '',
      emailPassword: '',
      secretRefs
    },
    profile: {},
    assignedDeviceId: deviceId || null,
    tags: ['onboarded-via-cli']
  };
}

function printableAccount(doc) {
  return {
    platform: doc.platform,
    status: doc.status,
    username: doc.credentials.username,
    email: doc.credentials.email || '(unset)',
    assignedDeviceId: doc.assignedDeviceId ? String(doc.assignedDeviceId) : '(unset)',
    secretRefs: {
      password: doc.credentials.secretRefs?.password || '(unset)',
      emailPassword: doc.credentials.secretRefs?.emailPassword || '(unset)'
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  if (!ALLOWED_PLATFORMS.has(args.platform)) {
    throw new Error(`platform must be one of tiktok, instagram, youtube (got "${args.platform}")`);
  }
  if (!args.username) {
    throw new Error('--username is required');
  }
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(args.username)) {
    throw new Error(
      `--username must be 2-40 chars of [A-Za-z0-9._-] (got "${args.username}"); TikTok handles disallow '@' and whitespace.`
    );
  }
  if (args.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
    throw new Error(`--email does not look like a valid address (got "${args.email}")`);
  }

  if (!env.mongodbUri) {
    throw new Error('Missing MONGODB_URI. Set it in the root .env.');
  }

  // Pre-flight: verify Keychain entries exist (presence only — never read values).
  const passwordService = keychainServiceForPassword(args.platform, args.username);
  if (!keychainEntryExists(passwordService)) {
    throw new Error(
      `Keychain entry "${passwordService}" not found for user ${process.env.USER || '(unknown)'}. ` +
        `Add it first with: ~/.mavis/agents/main/workspace/migrate-to-keychain.sh ${passwordService}`
    );
  }
  if (args.email) {
    const emailPasswordService = keychainServiceForEmailPassword(args.platform, args.username);
    if (!keychainEntryExists(emailPasswordService)) {
      throw new Error(
        `Keychain entry "${emailPasswordService}" not found. ` +
          `Add it first with: ~/.mavis/agents/main/workspace/migrate-to-keychain.sh ${emailPasswordService}`
      );
    }
  }

  await connectMongo(env.mongodbUri);
  try {
    const device = await resolveDevice({ platform: args.platform, selector: args.deviceSelector });

    const eligibility = canDeviceAcceptAccount(device);
    if (!eligibility.ok) {
      throw new Error(`Device ${device.name || device.providerDeviceId} is not eligible: ${eligibility.message}`);
    }

    // Idempotency: if an account for this (platform, username) already exists,
    // surface it instead of blindly creating a duplicate.
    const existing = await EngineAccount.findOne({
      platform: args.platform,
      'credentials.username': args.username
    })
      .select('_id platform status credentials.username assignedDeviceId retiredAt')
      .lean();

    if (existing) {
      if (existing.retiredAt) {
        throw new Error(
          `Account ${args.username} for ${args.platform} is retired; restore or create a new record manually.`
        );
      }
      console.error(
        `Account ${args.username} (${args.platform}) already exists as ${existing._id} ` +
          `(status=${existing.status}, assignedDeviceId=${existing.assignedDeviceId || 'none'}).`
      );
      console.error('Nothing to do. Unassign first via API if you want to move it to a different device.');
      return;
    }

    // Conflict check for the target device.
    const peers = await EngineAccount.find({
      platform: args.platform,
      assignedDeviceId: device._id,
      retiredAt: null
    })
      .select('_id platform assignedDeviceId retiredAt credentials.username')
      .lean();
    const conflict = findAccountDevicePlatformConflict(peers, {
      platform: args.platform,
      assignedDeviceId: device._id
    });
    if (conflict) {
      throw new Error(
        `Device ${device.name || device.providerDeviceId} already has ${conflict.credentials?.username || 'another account'} ` +
          `assigned for ${args.platform}. Unassign it first.`
      );
    }

    const doc = buildAccountDoc({
      platform: args.platform,
      username: args.username,
      email: args.email,
      deviceId: device._id
    });

    const plan = {
      mode: args.apply ? 'apply' : 'dry-run',
      device: {
        id: String(device._id),
        name: device.name || device.providerDeviceId,
        provider: device.provider,
        tiktokFreeSlots:
          (device.capacity?.maxAccounts ?? 1) -
          (peers.length || 0)
      },
      account: printableAccount(doc),
      onboarding: args.warmup
        ? {
            warmup: true,
            post: null,
            idempotencyKey: `cli:onboard:${args.username}:${Date.now()}`
          }
        : null
    };

    console.log(JSON.stringify(plan, null, 2));

    if (!args.apply) {
      console.log('Dry run only. Re-run with --apply to upsert the account and (optionally) enqueue onboarding.');
      return;
    }

    const account = await EngineAccount.create(doc);
    console.log(`OK account created: ${account._id}`);

    if (args.warmup) {
      const result = await enqueueAccountOnboarding({
        accountId: String(account._id),
        warmup: true,
        post: null,
        onboardingKey: plan.onboarding.idempotencyKey
      });
      console.log(
        JSON.stringify(
          {
            ok: true,
            accountId: String(account._id),
            onboardingKey: result.onboardingKey,
            jobRunId: result.jobRun?._id ? String(result.jobRun._id) : null
          },
          null,
          2
        )
      );
    }
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
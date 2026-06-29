// Import operator-owned social accounts from a secret-safe CSV manifest.
//
// Usage:
//   yarn workspace @julio/api import:authorized-accounts ./authorized-accounts.csv
//   yarn workspace @julio/api import:authorized-accounts ./authorized-accounts.csv --apply
//
// Required columns:
//   platform,username,password_secret_ref
//
// Optional columns:
//   email,email_password_secret_ref,totp_secret_ref,device_name,tags
//
// Secret values must be references like keychain:name or env:VAR_NAME. Raw
// passwords, cookies, tokens, and TOTP seeds are rejected by the parser.

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const { env } = await import('@julio/api/config/env');
const { connectMongo, disconnectMongo } = await import('@julio/api/db/mongo');
const { EngineAccount } = await import('@julio/api/models/engine-account');
const { EngineDevice } = await import('@julio/api/models/engine-device');
const { buildAuthorizedAccountImportPlan, parseAuthorizedAccountManifest } = await import(
  '@julio/api/utils/authorized-account-manifest'
);

function usage() {
  console.error('Usage: yarn workspace @julio/api import:authorized-accounts <manifest.csv> [--apply]');
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const file = argv.find((arg) => !arg.startsWith('--'));
  return { apply, file };
}

function printableAccount(account) {
  return {
    platform: account.doc.platform,
    username: account.doc.credentials.username,
    assignedDeviceId: account.doc.assignedDeviceId ? String(account.doc.assignedDeviceId) : '',
    secretRefs: Object.fromEntries(
      Object.entries(account.doc.credentials.secretRefs || {}).map(([key, value]) => [key, value ? 'set' : ''])
    )
  };
}

async function main() {
  const { apply, file } = parseArgs(process.argv.slice(2));
  if (!file) {
    usage();
    process.exitCode = 1;
    return;
  }
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');

  const manifestPath = path.resolve(file);
  const manifest = await fs.readFile(manifestPath, 'utf8');
  const rows = parseAuthorizedAccountManifest(manifest);

  await connectMongo(env.mongodbUri);
  try {
    const [devices, existingAccounts] = await Promise.all([
      EngineDevice.find({ retiredAt: null })
        .select('_id provider providerDeviceId name providerMeta')
        .lean(),
      EngineAccount.find({ retiredAt: null })
        .select('_id platform assignedDeviceId retiredAt credentials.username')
        .lean()
    ]);

    const plan = buildAuthorizedAccountImportPlan({ rows, devices, existingAccounts });

    for (const error of plan.errors) {
      console.error(`[line ${error.line}] ${error.code}: ${error.message}`);
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          manifest: manifestPath,
          rows: rows.length,
          ready: plan.accounts.length,
          errors: plan.errors.length,
          accounts: plan.accounts.map(printableAccount)
        },
        null,
        2
      )
    );

    if (plan.errors.length) {
      process.exitCode = 1;
      return;
    }

    if (!apply) {
      console.log('Dry run only. Re-run with --apply to upsert these accounts.');
      return;
    }

    if (!plan.accounts.length) {
      console.log('No accounts to import.');
      return;
    }

    const result = await EngineAccount.bulkWrite(
      plan.accounts.map((account) => ({
        updateOne: {
          filter: account.filter,
          update: { $set: account.doc },
          upsert: true
        }
      }))
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          inserted: result.upsertedCount || 0,
          modified: result.modifiedCount || 0,
          matched: result.matchedCount || 0
        },
        null,
        2
      )
    );
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

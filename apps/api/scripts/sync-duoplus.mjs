// Non-destructive DuoPlus device sync.
//
// Imports / updates the cloud phones from your DuoPlus account into the
// EngineDevice collection. Unlike `seed:engine`, this NEVER deletes anything —
// it only upserts (insert new, update existing by providerDeviceId).
//
// Usage:
//   node apps/api/scripts/sync-duoplus.mjs            # import + update devices + proxies
//   node apps/api/scripts/sync-duoplus.mjs --dry      # preview, no writes
//   node apps/api/scripts/sync-duoplus.mjs --no-proxies   # devices only
//
// Requires DUOPLUS_API_KEY and MONGODB_URI in the root .env.

import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const { env } = await import('@julio/api/config/env');
const { connectMongo, disconnectMongo } = await import('@julio/api/db/mongo');
const { EngineDevice } = await import('@julio/api/models/engine-device');
const { EngineProxy } = await import('@julio/api/models/engine-proxy');
const { createCloudPhoneProvider, listFromDuoPlusResponse, normalizeDuoPlusPhone } = await import(
  '@julio/device-control'
);

const dryRun = process.argv.includes('--dry');
const skipProxies = process.argv.includes('--no-proxies');

function countryFromArea(area = '') {
  const m = String(area).match(/\(([A-Za-z]{2})\)/);
  return m ? m[1].toUpperCase() : '';
}

async function syncProxies(provider) {
  const list = listFromDuoPlusResponse(await provider.client.listProxies({ page: 1, pagesize: 100 }));
  let created = 0;
  let updated = 0;
  for (const px of list) {
    const host = String(px.host || '').trim();
    const port = Number(px.port);
    if (!host || !port) continue;
    const endpoint = {
      protocol: 'socks5', // DuoPlus proxies are socks5
      host,
      port,
      username: String(px.user || '').trim(),
      password: '', // not returned by the list API; managed on DuoPlus side
      countryCode: countryFromArea(px.area)
    };
    const set = {
      label: String(px.name || `DuoPlus ${host}`).trim(),
      provider: 'duoplus',
      endpoint
    };
    if (dryRun) {
      console.log(`[dry] proxy upsert ${host}:${port} (${set.label}) ${endpoint.countryCode}`);
      created += 1;
      continue;
    }
    const existing = await EngineProxy.findOne({ 'endpoint.host': host, 'endpoint.port': port }).select('_id');
    if (existing) {
      await EngineProxy.updateOne({ _id: existing._id }, { $set: set });
      updated += 1;
    } else {
      await EngineProxy.create({ ...set, status: 'available' });
      created += 1;
    }
  }
  return { seen: list.length, created, updated };
}

async function main() {
  if (!env.duoplusApiKey) throw new Error('Missing DUOPLUS_API_KEY');
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');

  await connectMongo(env.mongodbUri);
  const provider = createCloudPhoneProvider({
    type: 'duoplus',
    apiKey: env.duoplusApiKey,
    baseUrl: env.duoplusApiBaseUrl,
    minDelayMs: env.duoplusMinDelayMs
  });

  let page = 1;
  const pagesize = 100;
  let created = 0;
  let updated = 0;
  let seen = 0;

  while (page <= 20) {
    const response = await provider.client.listCloudPhones({ page, pagesize });
    const phones = listFromDuoPlusResponse(response).map(normalizeDuoPlusPhone).filter(Boolean);
    for (const phone of phones) {
      seen += 1;
      const existing = await EngineDevice.findOne({
        provider: 'duoplus',
        providerDeviceId: phone.providerDeviceId
      }).select('_id');

      if (dryRun) {
        console.log(`[dry] ${existing ? 'update' : 'create'} ${phone.providerDeviceId} (${phone.name}) status=${phone.status}`);
        if (existing) updated += 1;
        else created += 1;
        continue;
      }

      const update = {
        name: phone.name,
        status: phone.status,
        region: phone.region,
        groupName: phone.groupName,
        notes: phone.notes,
        providerMeta: phone.providerMeta,
        'runtime.adbAddress': phone.runtime.adbAddress,
        'runtime.adbPassword': '',
        'runtime.lastHeartbeatAt': new Date()
      };

      if (existing) {
        await EngineDevice.updateOne({ _id: existing._id }, { $set: update });
        updated += 1;
      } else {
        await EngineDevice.create({
          provider: 'duoplus',
          providerDeviceId: phone.providerDeviceId,
          name: phone.name,
          status: phone.status,
          region: phone.region,
          groupName: phone.groupName,
          notes: phone.notes,
          runtime: phone.runtime,
          providerMeta: phone.providerMeta
        });
        created += 1;
      }
    }
    if (phones.length < pagesize) break;
    page += 1;
  }

  console.log(`[sync-duoplus] devices${dryRun ? ' (dry run)' : ''} seen=${seen} created=${created} updated=${updated}`);

  if (!skipProxies) {
    const px = await syncProxies(provider);
    console.log(`[sync-duoplus] proxies${dryRun ? ' (dry run)' : ''} seen=${px.seen} created=${px.created} updated=${px.updated}`);
  }

  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

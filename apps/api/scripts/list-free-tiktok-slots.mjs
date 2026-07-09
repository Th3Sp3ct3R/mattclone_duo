// Run from the apps/api dir with `node --experimental-vm-modules scripts/list-free-tiktok-slots.mjs`.
// Lists every active device whose current TikTok account count is below
// capacity, so we know which pads can take a new TT slot without first
// prying one loose.
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { env } from '@julio/api/config/env';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineAccount } from '@julio/api/models/engine-account';

await connectMongo(env.mongodbUri);
const devices = await EngineDevice.find({ retiredAt: null }).lean();
const accounts = await EngineAccount.find({ platform: 'tiktok', retiredAt: null }).lean();

const ttByDevice = new Map();
for (const a of accounts) {
  const id = a.assignedDeviceId ? String(a.assignedDeviceId) : null;
  if (!id) continue;
  ttByDevice.set(id, (ttByDevice.get(id) || 0) + 1);
}

const out = devices
  .map((dv) => {
    const cap = dv.capacity?.maxAccounts ?? 1;
    const used = ttByDevice.get(String(dv._id)) || 0;
    const free = Math.max(0, cap - used);
    return free > 0
      ? {
          id: String(dv._id),
          name: dv.displayLabel || dv.name || dv.providerDeviceId,
          tier: dv.tier,
          status: dv.status,
          tiktokUsed: used,
          tiktokCapacity: cap,
          freeTikTokSlots: free
        }
      : null;
  })
  .filter(Boolean);

console.log(JSON.stringify(out, null, 2));
await disconnectMongo();

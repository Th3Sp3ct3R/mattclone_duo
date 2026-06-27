import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineDjekxaOrder, EngineExpense } from '@julio/api/models/engine-finance';
import { EngineJobRun } from '@julio/api/models/engine-job-run';
import { EngineContentPoolItem, EngineNiche } from '@julio/api/models/engine-niche';
import {
  EngineClip,
  EngineRoutingRule,
  EngineSourceMedia,
  EngineTransform,
  EngineTranscript
} from '@julio/api/models/engine-pipeline';
import { EnginePost } from '@julio/api/models/engine-post';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';
import {
  EngineSocialPost,
  EngineSocialProfile,
  EngineSocialScore
} from '@julio/api/models/engine-social';
import { EngineDeviceIdentitySnapshot, EngineTelemetryBaseline } from '@julio/api/models/engine-telemetry';
import { EngineContentChunk, EngineTrend, EngineTrendMatch } from '@julio/api/models/engine-trend';

import { seedAccounts } from './accounts.mjs';
import { seedContent } from './content.mjs';
import { seedDevices } from './devices.mjs';
import { seedFinance } from './finance.mjs';
import { seedIntel } from './intel.mjs';
import { seedPosts } from './posts.mjs';
import { seedProxies } from './proxies.mjs';

const engineModels = [
  EngineJobRun,
  EngineSocialScore,
  EngineSocialPost,
  EngineSocialProfile,
  EngineTrendMatch,
  EngineTrend,
  EngineContentChunk,
  EngineDeviceIdentitySnapshot,
  EngineTelemetryBaseline,
  EngineExpense,
  EngineDjekxaOrder,
  EnginePost,
  EngineTransform,
  EngineClip,
  EngineTranscript,
  EngineSourceMedia,
  EngineRoutingRule,
  EngineContentPoolItem,
  EngineNiche,
  EngineProxyAssignment,
  EngineProxy,
  EngineAccount,
  EngineDevice
];

async function clearEngineCollections() {
  await Promise.all(engineModels.map((model) => model.deleteMany({})));
}

export async function seedEngine({ disconnect = true } = {}) {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await connectMongo(process.env.MONGODB_URI);
  await clearEngineCollections();

  const deviceRefs = await seedDevices();
  // DuoPlus devices are no longer seeded as demo rows — they come from the real
  // provider via `yarn workspace @julio/api sync:duoplus`. Seeding demo duoplus
  // rows would duplicate/clash with the real synced fleet.
  const proxyRefs = await seedProxies(deviceRefs);
  const accountRefs = await seedAccounts({ ...deviceRefs, ...proxyRefs });
  const contentRefs = await seedContent();
  const postRefs = await seedPosts({ ...deviceRefs, ...accountRefs, ...contentRefs });
  const intelRefs = await seedIntel({ ...deviceRefs, ...accountRefs, ...contentRefs });
  const financeRefs = await seedFinance({ ...deviceRefs, ...accountRefs, ...postRefs });

  const summary = {
    devices: deviceRefs.devices.length,
    duoplusDevices: 0,
    proxies: proxyRefs.proxies.length,
    accounts: accountRefs.accounts.length,
    niches: contentRefs.niches.length,
    contentItems: contentRefs.contentItems.length,
    posts: postRefs.posts.length,
    trends: intelRefs.trends.length,
    expenses: financeRefs.expenses.length,
    jobRuns: financeRefs.jobRuns.length
  };

  if (disconnect) await disconnectMongo();
  console.log(`[seed] engine seeded: ${JSON.stringify(summary)}`);
  return summary;
}

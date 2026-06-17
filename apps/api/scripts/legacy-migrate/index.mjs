import { env } from '@julio/api/config/env';
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';

import { migrateAccounts } from './accounts.mjs';
import { migrateContentAndPosts } from './content-posts.mjs';
import { createLegacyPool } from './db.mjs';
import { migrateFoundation } from './foundation.mjs';
import { migrateIntelFinanceTelemetry } from './intel-finance-telemetry.mjs';
import { migrateNewCollections } from './new-collections.mjs';
import { createMigrationState } from './state.mjs';
import { verifyMigration } from './verify.mjs';

export async function migrateLegacy({ disconnect = true } = {}) {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  if (!env.legacyDatabaseUrl) throw new Error('Missing LEGACY_DATABASE_URL');

  await connectMongo(env.mongodbUri);
  const pool = createLegacyPool(env.legacyDatabaseUrl);
  const client = await pool.connect();
  const state = createMigrationState();

  try {
    await migrateFoundation(client, state);
    await migrateAccounts(client, state);
    await migrateContentAndPosts(client, state);
    await migrateIntelFinanceTelemetry(client, state);
    await migrateNewCollections(client, state);
    await verifyMigration(state);

    console.log('[legacy-migrate] completed');
    for (const item of state.summary) {
      console.log(`[legacy-migrate] ${item.name}: ${JSON.stringify(item)}`);
    }
    return state.summary;
  } finally {
    client.release();
    await pool.end();
    if (disconnect) await disconnectMongo();
  }
}

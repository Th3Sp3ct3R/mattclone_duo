export function createMigrationState() {
  return {
    devicesByLegacyDeviceId: new Map(),
    devicesByTiktokDeviceId: new Map(),
    proxiesByLegacyId: new Map(),
    accountsByLegacyKey: new Map(),
    accountsByPlatformUsername: new Map(),
    nichesByLegacyId: new Map(),
    nichesByKey: new Map(),
    contentItemsByLegacyId: new Map(),
    sourceMediaByLegacyKey: new Map(),
    transcriptsByLegacyKey: new Map(),
    clipsByLegacyKey: new Map(),
    socialProfilesByLegacyKey: new Map(),
    socialPostsByLegacyKey: new Map(),
    trendsByLegacyId: new Map(),
    contentChunksByLegacyKey: new Map(),
    summary: []
  };
}

export function recordSummary(state, name, details) {
  state.summary.push({ name, ...details });
}

export function summarizeBulkResult(result) {
  return {
    matched: result?.matchedCount || 0,
    modified: result?.modifiedCount || 0,
    upserted: result?.upsertedCount || 0
  };
}

export async function bulkWriteIfAny(model, operations) {
  if (!operations.length) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  return model.bulkWrite(operations, { ordered: false });
}

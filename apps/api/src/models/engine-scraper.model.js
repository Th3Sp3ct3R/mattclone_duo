import mongoose from 'mongoose';

const proxySchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: '' },
    host: { type: String, trim: true, default: '' },
    port: { type: Number, default: null },
    username: { type: String, trim: true, default: '' },
    password: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    syncedAt: { type: Date, default: null }
  },
  { _id: false }
);

const engineScraperSessionSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['instagram', 'tiktok'], default: 'instagram', index: true },
    username: { type: String, trim: true, required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineAccount', default: null, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null, index: true },
    status: { type: String, trim: true, default: 'pending', index: true },
    extractionMethod: { type: String, trim: true, default: '' },
    session: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    proxy: { type: proxySchema, default: () => ({}) },
    profile: { type: profileSchema, default: () => ({}) },
    extractedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    lastUsedAt: { type: Date, default: null, index: true },
    useCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    lastError: { type: String, trim: true, default: '' },
    cooldownUntil: { type: Date, default: null },
    legacySource: { type: String, trim: true, required: true },
    legacyId: { type: String, trim: true, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_scraper_sessions', timestamps: true }
);

engineScraperSessionSchema.index({ legacySource: 1, legacyId: 1 }, { unique: true });
engineScraperSessionSchema.index({ platform: 1, username: 1, status: 1 });

export const EngineScraperSession =
  mongoose.models.EngineScraperSession ||
  mongoose.model('EngineScraperSession', engineScraperSessionSchema);

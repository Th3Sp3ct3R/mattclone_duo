import mongoose from 'mongoose';

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'reddit', 'x'];

const sourceSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    handle: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    lastDiscoveredAt: { type: Date, default: null }
  },
  { _id: true }
);

const engineNicheSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, required: true, unique: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true, index: true },
    targetPlatforms: [{ type: String, enum: ['tiktok', 'instagram'] }],
    sources: [sourceSchema],
    postingCadence: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_niches', timestamps: true }
);

const contentPoolItemSchema = new mongoose.Schema(
  {
    nicheId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineNiche', required: true, index: true },
    platform: { type: String, enum: PLATFORMS, required: true, index: true },
    sourceUrl: { type: String, trim: true, required: true },
    sourceAuthor: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
    storageKey: { type: String, trim: true, default: '' },
    downloadedAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
    score: { type: Number, default: 0, index: true },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    status: {
      type: String,
      enum: ['discovered', 'downloaded', 'queued', 'used', 'rejected'],
      default: 'discovered',
      index: true
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_content_pool_items', timestamps: true }
);

contentPoolItemSchema.index({ sourceUrl: 1 }, { unique: true });
contentPoolItemSchema.index({ nicheId: 1, status: 1, score: -1 });

export const EngineNiche =
  mongoose.models.EngineNiche || mongoose.model('EngineNiche', engineNicheSchema);
export const EngineContentPoolItem =
  mongoose.models.EngineContentPoolItem ||
  mongoose.model('EngineContentPoolItem', contentPoolItemSchema);

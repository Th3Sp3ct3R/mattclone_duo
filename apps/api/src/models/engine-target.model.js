import mongoose from 'mongoose';

const metricsSchema = new mongoose.Schema(
  {
    followers: { type: Number, default: null },
    following: { type: Number, default: null },
    media: { type: Number, default: null },
    averageLikes: { type: Number, default: null },
    averageComments: { type: Number, default: null },
    engagementRate: { type: Number, default: null }
  },
  { _id: false }
);

const embeddingSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: 'legacy-pgvector' },
    model: { type: String, trim: true, default: 'text-embedding-3-small' },
    vector: [{ type: Number }]
  },
  { _id: false }
);

const engineTargetSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['instagram', 'tiktok'], default: 'instagram', index: true },
    externalProfileId: { type: String, trim: true, required: true },
    username: { type: String, trim: true, default: '', index: true },
    source: { type: String, trim: true, required: true },
    sourceType: { type: String, trim: true, default: '' },
    sourceValue: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'discovered', index: true },
    enriched: { type: Boolean, default: false, index: true },
    converted: { type: Boolean, default: false, index: true },
    conversion: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    profile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    metrics: { type: metricsSchema, default: () => ({}) },
    bioKeywords: [{ type: String, trim: true }],
    captionKeywords: [{ type: String, trim: true }],
    categories: [{ type: String, trim: true }],
    embedding: { type: embeddingSchema, default: () => ({}) },
    rawData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    firstSeenAt: { type: Date, default: null },
    enrichedAt: { type: Date, default: null }
  },
  { collection: 'engine_targets', timestamps: true }
);

engineTargetSchema.index({ platform: 1, externalProfileId: 1, source: 1 }, { unique: true });
engineTargetSchema.index({ platform: 1, enriched: 1, converted: 1 });
engineTargetSchema.index({ bioKeywords: 1 });

export const EngineTarget =
  mongoose.models.EngineTarget || mongoose.model('EngineTarget', engineTargetSchema);

import mongoose from 'mongoose';

const embeddingSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    vector: [{ type: Number }]
  },
  { _id: false }
);

const engineTrendSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['tiktok', 'instagram', 'youtube'], required: true, index: true },
    nicheKey: { type: String, trim: true, default: '', index: true },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    sourceUrl: { type: String, trim: true, default: '' },
    reach: { type: Number, default: 0 },
    outlierRatio: { type: Number, default: 0 },
    embedding: { type: embeddingSchema, default: () => ({}) },
    observedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_trends', timestamps: true }
);

const contentChunkSchema = new mongoose.Schema(
  {
    sourceMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineSourceMedia', default: null, index: true },
    text: { type: String, required: true },
    startSeconds: { type: Number, default: null },
    endSeconds: { type: Number, default: null },
    embedding: { type: embeddingSchema, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_content_chunks', timestamps: true }
);

const trendMatchSchema = new mongoose.Schema(
  {
    trendId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineTrend', required: true, index: true },
    contentChunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineContentChunk', required: true, index: true },
    score: { type: Number, default: 0, index: true },
    rationale: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_trend_matches', timestamps: true }
);

engineTrendSchema.index({ platform: 1, nicheKey: 1, observedAt: -1 });
contentChunkSchema.index({ sourceMediaId: 1, createdAt: 1 });
trendMatchSchema.index({ trendId: 1, contentChunkId: 1 }, { unique: true });

export const EngineTrend =
  mongoose.models.EngineTrend || mongoose.model('EngineTrend', engineTrendSchema);
export const EngineContentChunk =
  mongoose.models.EngineContentChunk ||
  mongoose.model('EngineContentChunk', contentChunkSchema);
export const EngineTrendMatch =
  mongoose.models.EngineTrendMatch || mongoose.model('EngineTrendMatch', trendMatchSchema);

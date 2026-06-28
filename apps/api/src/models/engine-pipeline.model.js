import mongoose from 'mongoose';

const sourceMediaSchema = new mongoose.Schema(
  {
    originalUrl: { type: String, trim: true, required: true },
    storageKey: { type: String, trim: true, default: '' },
    publicUrl: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    durationSeconds: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    checksum: { type: String, trim: true, default: '', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_source_media', timestamps: true }
);

const transcriptSegmentSchema = new mongoose.Schema(
  {
    startSeconds: { type: Number, required: true },
    endSeconds: { type: Number, required: true },
    text: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const transcriptSchema = new mongoose.Schema(
  {
    sourceMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineSourceMedia', required: true },
    language: { type: String, trim: true, default: '' },
    text: { type: String, default: '' },
    segments: [transcriptSegmentSchema],
    provider: { type: String, trim: true, default: '' }
  },
  { collection: 'engine_transcripts', timestamps: true }
);

const clipSchema = new mongoose.Schema(
  {
    sourceMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineSourceMedia', required: true, index: true },
    transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineTranscript', default: null },
    title: { type: String, trim: true, default: '' },
    startSeconds: { type: Number, required: true },
    endSeconds: { type: Number, required: true },
    storageKey: { type: String, trim: true, default: '' },
    publicUrl: { type: String, trim: true, default: '' },
    viralScore: { type: Number, default: 0, index: true },
    rationale: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_clips', timestamps: true }
);

const transformSchema = new mongoose.Schema(
  {
    sourceMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineSourceMedia', required: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    recipe: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    outputStorageKey: { type: String, trim: true, default: '' },
    outputPublicUrl: { type: String, trim: true, default: '' },
    failureReason: { type: String, trim: true, default: '' },
    completedAt: { type: Date, default: null }
  },
  { collection: 'engine_transforms', timestamps: true }
);

const routingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    active: { type: Boolean, default: true, index: true },
    sourcePlatform: { type: String, trim: true, default: '' },
    targetPlatform: { type: String, enum: ['tiktok', 'instagram', 'youtube'], required: true },
    nicheKey: { type: String, trim: true, default: '' },
    accountSelector: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    schedulePolicy: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_routing_rules', timestamps: true }
);

sourceMediaSchema.index({ originalUrl: 1 }, { unique: true });
transcriptSchema.index({ sourceMediaId: 1 }, { unique: true });
clipSchema.index({ sourceMediaId: 1, viralScore: -1 });
transformSchema.index({ status: 1, createdAt: 1 });

export const EngineSourceMedia =
  mongoose.models.EngineSourceMedia || mongoose.model('EngineSourceMedia', sourceMediaSchema);
export const EngineTranscript =
  mongoose.models.EngineTranscript || mongoose.model('EngineTranscript', transcriptSchema);
export const EngineClip = mongoose.models.EngineClip || mongoose.model('EngineClip', clipSchema);
export const EngineTransform =
  mongoose.models.EngineTransform || mongoose.model('EngineTransform', transformSchema);
export const EngineRoutingRule =
  mongoose.models.EngineRoutingRule || mongoose.model('EngineRoutingRule', routingRuleSchema);

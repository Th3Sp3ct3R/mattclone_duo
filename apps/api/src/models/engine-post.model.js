import mongoose from 'mongoose';

const PLATFORMS = ['tiktok', 'instagram', 'youtube'];
const POST_STATUSES = [
  'draft',
  'queued',
  'staging',
  'posting',
  'posted',
  'failed',
  'cancelled'
];

const mediaSchema = new mongoose.Schema(
  {
    sourceUrl: { type: String, trim: true, default: '' },
    storageKey: { type: String, trim: true, default: '' },
    publicUrl: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    durationSeconds: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null }
  },
  { _id: false }
);

const publishOptionsSchema = new mongoose.Schema(
  {
    caption: { type: String, trim: true, default: '' },
    hashtags: [{ type: String, trim: true }],
    soundQuery: { type: String, trim: true, default: '' },
    locationQuery: { type: String, trim: true, default: '' },
    coverFrameIndex: { type: Number, default: null }
  },
  { _id: false }
);

const failureSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    failedAt: { type: Date, default: null }
  },
  { _id: false }
);

const enginePostSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true, index: true },
    postType: { type: String, enum: ['', 'reel', 'video', 'short'], default: '' },
    status: { type: String, enum: POST_STATUSES, default: 'draft', index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineAccount', required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null, index: true },
    contentPoolItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EngineContentPoolItem',
      default: null,
      index: true
    },
    media: { type: mediaSchema, default: () => ({}) },
    publishOptions: { type: publishOptionsSchema, default: () => ({}) },
    scheduledAt: { type: Date, default: null, index: true },
    postedAt: { type: Date, default: null, index: true },
    cancelledAt: { type: Date, default: null },
    failure: { type: failureSchema, default: () => ({}) },
    externalPostId: { type: String, trim: true, default: '', index: true },
    vmosTaskId: { type: String, trim: true, default: '', index: true },
    stagedDevicePath: { type: String, trim: true, default: '' },
    idempotencyKey: { type: String, trim: true, default: '' }
  },
  { collection: 'engine_posts', timestamps: true }
);

enginePostSchema.index({ platform: 1, status: 1, scheduledAt: 1 });
enginePostSchema.index({ accountId: 1, scheduledAt: 1 });
enginePostSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const EnginePost =
  mongoose.models.EnginePost || mongoose.model('EnginePost', enginePostSchema);

export { PLATFORMS, POST_STATUSES };

import mongoose from 'mongoose';

const PLATFORMS = ['tiktok', 'instagram'];

const metricsSchema = new mongoose.Schema(
  {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  { _id: false }
);

const socialProfileSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true, index: true },
    handle: { type: String, trim: true, required: true },
    externalProfileId: { type: String, trim: true, default: '' },
    displayName: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    profileUrl: { type: String, trim: true, default: '' },
    metrics: { type: metricsSchema, default: () => ({}) },
    scrapedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_social_profiles', timestamps: true }
);

const socialPostSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineSocialProfile', default: null, index: true },
    externalPostId: { type: String, trim: true, default: '' },
    postUrl: { type: String, trim: true, required: true },
    caption: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
    publishedAt: { type: Date, default: null, index: true },
    metrics: { type: metricsSchema, default: () => ({}) },
    scrapedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_social_posts', timestamps: true }
);

const scoreSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ['profile', 'post'], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    score: { type: Number, default: 0, index: true },
    dimensions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    rationale: { type: String, trim: true, default: '' },
    scoredAt: { type: Date, default: Date.now, index: true }
  },
  { collection: 'engine_social_scores', timestamps: true }
);

socialProfileSchema.index({ platform: 1, handle: 1 }, { unique: true });
socialPostSchema.index({ platform: 1, postUrl: 1 }, { unique: true });
scoreSchema.index({ targetType: 1, targetId: 1, scoredAt: -1 });

export const EngineSocialProfile =
  mongoose.models.EngineSocialProfile ||
  mongoose.model('EngineSocialProfile', socialProfileSchema);
export const EngineSocialPost =
  mongoose.models.EngineSocialPost || mongoose.model('EngineSocialPost', socialPostSchema);
export const EngineSocialScore =
  mongoose.models.EngineSocialScore || mongoose.model('EngineSocialScore', scoreSchema);

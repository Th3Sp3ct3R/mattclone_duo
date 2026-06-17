import mongoose from 'mongoose';

const followerMetricsSchema = new mongoose.Schema(
  {
    followers: { type: Number, default: null },
    following: { type: Number, default: null },
    ffRatio: { type: Number, default: null },
    engagementRate: { type: Number, default: null },
    postFrequency: { type: Number, default: null },
    commentCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const engineFollowerProfileSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['instagram', 'tiktok'], default: 'instagram', index: true },
    externalProfileId: { type: String, trim: true, required: true },
    username: { type: String, trim: true, required: true, index: true },
    bio: { type: String, trim: true, default: '' },
    niche: { type: String, trim: true, default: '', index: true },
    language: { type: String, trim: true, default: '' },
    geoSignal: { type: String, trim: true, default: '' },
    clusterId: { type: String, trim: true, default: '', index: true },
    profileCategory: { type: String, trim: true, default: '' },
    businessCategory: { type: String, trim: true, default: '' },
    flags: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    metrics: { type: followerMetricsSchema, default: () => ({}) },
    bioKeywords: [{ type: String, trim: true }],
    hashtagsUsed: [{ type: String, trim: true }],
    likePatterns: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    followedAt: { type: Date, default: null },
    lastPostAt: { type: Date, default: null },
    lastStoryAt: { type: Date, default: null },
    lastScannedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_follower_profiles', timestamps: true }
);

const engineFollowerEdgeSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['instagram', 'tiktok'], default: 'instagram', index: true },
    followerExternalId: { type: String, trim: true, required: true },
    followingExternalId: { type: String, trim: true, required: true },
    followingUsername: { type: String, trim: true, default: '', index: true },
    scrapedAt: { type: Date, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_follower_edges', timestamps: true }
);

engineFollowerProfileSchema.index({ platform: 1, externalProfileId: 1 }, { unique: true });
engineFollowerEdgeSchema.index(
  { platform: 1, followerExternalId: 1, followingExternalId: 1 },
  { unique: true }
);

export const EngineFollowerProfile =
  mongoose.models.EngineFollowerProfile ||
  mongoose.model('EngineFollowerProfile', engineFollowerProfileSchema);
export const EngineFollowerEdge =
  mongoose.models.EngineFollowerEdge || mongoose.model('EngineFollowerEdge', engineFollowerEdgeSchema);

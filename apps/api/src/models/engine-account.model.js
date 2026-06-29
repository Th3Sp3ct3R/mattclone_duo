import mongoose from 'mongoose';

const PLATFORMS = ['tiktok', 'instagram', 'youtube'];
const ACCOUNT_STATUSES = [
  'new',
  'logging_in',
  'active',
  'checkpointed',
  'banned',
  'cooldown',
  'retired'
];

const credentialsSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, default: '' },
    password: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    emailPassword: { type: String, trim: true, default: '' },
    immutableUserId: { type: String, trim: true, default: '' },
    secretRefs: {
      password: { type: String, trim: true, default: '' },
      emailPassword: { type: String, trim: true, default: '' },
      totp: { type: String, trim: true, default: '' }
    }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    nicheKey: { type: String, trim: true, default: '' },
    personaKey: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const healthSchema = new mongoose.Schema(
  {
    lastLoginCheckAt: { type: Date, default: null },
    lastHealthyAt: { type: Date, default: null },
    lastFailureReason: { type: String, trim: true, default: '' },
    consecutiveFailures: { type: Number, default: 0 },
    warmupConfig: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    cookies: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    tokens: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    deviceFingerprint: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    twoFactorState: { type: String, trim: true, default: '' },
    challengeReason: { type: String, trim: true, default: '' },
    lastLoginDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null },
    capturedAt: { type: Date, default: null }
  },
  { _id: false }
);

const CHECKPOINT_REASONS = [
  '',
  'two_factor',
  'captcha',
  'suspicious_login',
  'missing_app',
  'missing_subscription',
  'missing_proxy',
  'manual_intervention'
];

const engineAccountSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true, index: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'new', index: true },
    checkpointReason: { type: String, enum: CHECKPOINT_REASONS, default: '' },
    credentials: { type: credentialsSchema, default: () => ({}) },
    profile: { type: profileSchema, default: () => ({}) },
    assignedDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null, index: true },
    lastSeenProxyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineProxy', default: null },
    session: { type: sessionSchema, default: () => ({}) },
    health: { type: healthSchema, default: () => ({}) },
    tags: [{ type: String, trim: true }],
    retiredAt: { type: Date, default: null }
  },
  { collection: 'engine_accounts', timestamps: true }
);

engineAccountSchema.index({ platform: 1, 'credentials.username': 1 }, { unique: true, sparse: true });
engineAccountSchema.index({ platform: 1, status: 1, assignedDeviceId: 1 });
engineAccountSchema.index({ 'profile.nicheKey': 1, platform: 1 });

export const EngineAccount =
  mongoose.models.EngineAccount || mongoose.model('EngineAccount', engineAccountSchema);

export { CHECKPOINT_REASONS, PLATFORMS };

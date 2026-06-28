import mongoose from 'mongoose';

const identitySnapshotSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', required: true, index: true },
    platform: { type: String, enum: ['tiktok', 'instagram', 'youtube'], required: true, index: true },
    observedUsername: { type: String, trim: true, default: '' },
    observedExternalUserId: { type: String, trim: true, default: '' },
    confidence: { type: Number, default: 0 },
    source: { type: String, trim: true, default: '' },
    screenshotUrl: { type: String, trim: true, default: '' },
    rawObservation: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    observedAt: { type: Date, default: Date.now, index: true }
  },
  { collection: 'engine_device_identity_snapshots', timestamps: true }
);

const telemetryBaselineSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'device', 'account'], default: 'global', index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineAccount', default: null, index: true },
    sampleCount: { type: Number, default: 0 },
    gestures: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    typing: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    timing: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    capturedAt: { type: Date, default: Date.now, index: true }
  },
  { collection: 'engine_telemetry_baselines', timestamps: true }
);

identitySnapshotSchema.index({ deviceId: 1, platform: 1, observedAt: -1 });
telemetryBaselineSchema.index({ scope: 1, capturedAt: -1 });

export const EngineDeviceIdentitySnapshot =
  mongoose.models.EngineDeviceIdentitySnapshot ||
  mongoose.model('EngineDeviceIdentitySnapshot', identitySnapshotSchema);
export const EngineTelemetryBaseline =
  mongoose.models.EngineTelemetryBaseline ||
  mongoose.model('EngineTelemetryBaseline', telemetryBaselineSchema);

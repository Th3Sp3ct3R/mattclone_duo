import mongoose from 'mongoose';

const coordinateSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    nx: { type: Number, required: true },
    ny: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  { _id: false }
);

const engineCoordinateMapSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: 'duoplus', index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', required: true, index: true },
    providerDeviceId: { type: String, trim: true, required: true, index: true },
    action: { type: String, trim: true, required: true, index: true },
    screen: { type: String, trim: true, default: 'unknown', index: true },
    appPackage: { type: String, trim: true, default: '' },
    coordinateSetVersion: { type: String, trim: true, default: 'probe-v1', index: true },
    coordinates: { type: coordinateSchema, default: null },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    selectorHints: { type: [String], default: [] },
    screenshotRef: { type: String, trim: true, default: '' },
    resultState: { type: String, trim: true, default: 'observed' },
    dryRun: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    observedAt: { type: Date, default: Date.now }
  },
  { collection: 'engine_coordinate_maps', timestamps: true }
);

engineCoordinateMapSchema.index({ providerDeviceId: 1, action: 1, screen: 1, coordinateSetVersion: 1 });
engineCoordinateMapSchema.index({ observedAt: -1 });

export const EngineCoordinateMap =
  mongoose.models.EngineCoordinateMap || mongoose.model('EngineCoordinateMap', engineCoordinateMapSchema);

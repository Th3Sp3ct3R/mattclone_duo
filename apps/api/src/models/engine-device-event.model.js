import mongoose from 'mongoose';

const LEVELS = ['info', 'warn', 'error'];
const SOURCES = ['device', 'account', 'post', 'system'];
const RETENTION_SECONDS = 7 * 24 * 60 * 60;

const engineDeviceEventSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', required: true, index: true },
    level: { type: String, enum: LEVELS, default: 'info', index: true },
    source: { type: String, enum: SOURCES, default: 'system', index: true },
    jobRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineJobRun', default: null, index: true },
    jobName: { type: String, trim: true, default: '', index: true },
    message: { type: String, trim: true, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'engine_device_events', timestamps: false }
);

engineDeviceEventSchema.index({ deviceId: 1, createdAt: -1 });
engineDeviceEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const EngineDeviceEvent =
  mongoose.models.EngineDeviceEvent || mongoose.model('EngineDeviceEvent', engineDeviceEventSchema);

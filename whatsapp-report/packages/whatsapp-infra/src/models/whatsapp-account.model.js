import mongoose from 'mongoose';
import { ACCOUNT_STATUSES } from '@julio/whatsapp';

const healthSchema = new mongoose.Schema(
  { consecutiveFailures: { type: Number, default: 0 }, lastProbeAt: { type: Date, default: null } },
  { _id: false }
);

const accountSchema = new mongoose.Schema({
  msisdn:           { type: String, required: true, unique: true, index: true },
  source:           { type: String, default: '' },
  secretRefs:       { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  status:           { type: String, enum: ACCOUNT_STATUSES, default: 'purchased', index: true },
  assignedDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null, index: true },
  health:           { type: healthSchema, default: () => ({}) },
  version:          { type: Number, default: 0 }
}, { collection: 'whatsapp_accounts', timestamps: true });

accountSchema.index({ status: 1, assignedDeviceId: 1 });

export const WhatsappAccount =
  mongoose.models.WhatsappAccount || mongoose.model('WhatsappAccount', accountSchema);
export { ACCOUNT_STATUSES };

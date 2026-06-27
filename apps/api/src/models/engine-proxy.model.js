import mongoose from 'mongoose';

const PROXY_STATUSES = ['available', 'assigned', 'unhealthy', 'retired'];

const endpointSchema = new mongoose.Schema(
  {
    protocol: { type: String, trim: true, default: 'http' },
    host: { type: String, trim: true, required: true },
    port: { type: Number, required: true },
    username: { type: String, trim: true, default: '' },
    password: { type: String, trim: true, default: '' },
    countryCode: { type: String, trim: true, uppercase: true, default: '' }
  },
  { _id: false }
);

const healthSchema = new mongoose.Schema(
  {
    lastVerifiedAt: { type: Date, default: null },
    lastFailureReason: { type: String, trim: true, default: '' },
    consecutiveFailures: { type: Number, default: 0 }
  },
  { _id: false }
);

const engineProxySchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    status: { type: String, enum: PROXY_STATUSES, default: 'available', index: true },
    endpoint: { type: endpointSchema, required: true },
    provider: { type: String, trim: true, default: '' },
    sku: { type: String, trim: true, default: '' },
    expiresAt: { type: Date, default: null, index: true },
    health: { type: healthSchema, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { collection: 'engine_proxies', timestamps: true }
);

engineProxySchema.index({ status: 1, expiresAt: 1 });
engineProxySchema.index({ 'endpoint.host': 1, 'endpoint.port': 1 }, { unique: true });

const proxyAssignmentSchema = new mongoose.Schema(
  {
    proxyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineProxy', required: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineDevice', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EngineAccount', default: null },
    assignedAt: { type: Date, default: Date.now },
    deactivatedAt: { type: Date, default: null, index: true },
    reason: { type: String, trim: true, default: '' }
  },
  { collection: 'engine_proxy_assignments', timestamps: true }
);

proxyAssignmentSchema.index(
  { proxyId: 1 },
  {
    name: 'active_proxy_assignment_unique',
    unique: true,
    partialFilterExpression: { deactivatedAt: null }
  }
);
proxyAssignmentSchema.index(
  { deviceId: 1 },
  {
    name: 'active_device_proxy_assignment_unique',
    unique: true,
    partialFilterExpression: { deviceId: { $type: 'objectId' }, deactivatedAt: null }
  }
);
proxyAssignmentSchema.index(
  { accountId: 1 },
  {
    name: 'active_account_proxy_assignment_unique',
    unique: true,
    partialFilterExpression: { accountId: { $type: 'objectId' }, deactivatedAt: null }
  }
);

export const EngineProxy =
  mongoose.models.EngineProxy || mongoose.model('EngineProxy', engineProxySchema);
export const EngineProxyAssignment =
  mongoose.models.EngineProxyAssignment ||
  mongoose.model('EngineProxyAssignment', proxyAssignmentSchema);

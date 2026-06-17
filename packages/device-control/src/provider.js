import { VmosClient } from './vmos-client.js';
import { VmosDirectController } from './vmos-direct-controller.js';
import { DeviceControlError } from './errors.js';

function listFromInstanceResponse(result = {}) {
  const data = result.data || result;
  if (Array.isArray(data)) return data;
  return data.list || data.records || data.rows || data.items || [];
}

export class VmosCloudPhoneProvider {
  constructor({ client }) {
    if (!client) throw new DeviceControlError('VMOS client is required', { code: 'PROVIDER_CONFIG' });
    this.type = 'vmos';
    this.client = client;
  }

  listDevices() {
    return this.client.listDevices();
  }

  async describeInstance(providerDeviceId) {
    const result = await this.client.listInstances({ padCodes: [providerDeviceId] });
    const instances = listFromInstanceResponse(result);
    return (
      instances.find(
        (instance) =>
          String(instance.padCode || instance.pad_code || instance.providerDeviceId || instance.deviceCode || '') ===
          String(providerDeviceId)
      ) || null
    );
  }

  async startDevice(providerDeviceId) {
    const result = await this.client.startDevice(providerDeviceId);
    return { success: true, result };
  }

  async stopDevice(providerDeviceId) {
    const result = await this.client.stopDevice(providerDeviceId);
    return { success: true, result };
  }

  getAdbConnection(providerDeviceId) {
    return this.client.getAdbConnection(providerDeviceId);
  }

  pushFileByUrl(providerDeviceId, payload) {
    return this.client.pushFileByUrl(providerDeviceId, payload);
  }

  createTikTokPostTask(providerDeviceId, payload) {
    return this.client.createTikTokPostTask(providerDeviceId, payload);
  }

  createDirectController(providerDeviceId, options = {}) {
    return new VmosDirectController({
      client: this.client,
      padCode: providerDeviceId,
      ...options
    });
  }

  screenshot(providerDeviceId, options) {
    return this.client.getPreviewImage([providerDeviceId], options);
  }

  setSmartIp(providerDeviceId, proxy) {
    return this.client.setSmartIp([providerDeviceId], proxy);
  }
}

export function createCloudPhoneProvider({ type = 'vmos', ...config } = {}) {
  if (type !== 'vmos') {
    throw new DeviceControlError(`Unsupported cloud phone provider: ${type}`, {
      code: 'UNSUPPORTED_PROVIDER'
    });
  }

  return new VmosCloudPhoneProvider({
    client: new VmosClient(config)
  });
}

export const PLATFORM_PACKAGES = {
  instagram: ['com.instagram.android'],
  tiktok: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'],
  youtube: ['com.google.android.youtube']
};

const PREFLIGHT_CHECKPOINT_REASON = {
  MISSING_SUBSCRIPTION: 'missing_subscription',
  MISSING_PROXY: 'missing_proxy',
  APP_NOT_INSTALLED: 'missing_app'
};

export class PreflightError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PreflightError';
    this.code = code;
    this.details = details;
    this.checkpointReason = PREFLIGHT_CHECKPOINT_REASON[code] || 'manual_intervention';
  }
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.$oid || value);
}

function subscriptionExpiresInFuture(value) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

function hasActiveSubscription(device = {}) {
  const meta = device.providerMeta || {};
  const status = String(meta.subscriptionStatus || '').trim().toLowerCase();
  return meta.subscriptionVerified === true && status === 'active' && subscriptionExpiresInFuture(meta.subscriptionExpiresAt);
}

function isRunningInstance(instance = {}) {
  if (!instance) return false;
  const status = instance.status ?? instance.rawStatus ?? instance.link_status;
  if (String(status).toLowerCase() === 'running') return true;
  return Number(status) === 1;
}

function listFromResponse(response = {}) {
  if (Array.isArray(response)) return response;
  const data = response.data || response;
  if (Array.isArray(data)) return data;
  return data.list || data.records || data.rows || data.items || [];
}

function packageNameOf(app = {}) {
  return String(app.packageName || app.package || app.package_name || app.pkg || app.bundle_id || '').trim();
}

function hasInstalledPackage(installedApps = [], expectedPackages = []) {
  const installed = new Set(listFromResponse(installedApps).map(packageNameOf).filter(Boolean));
  return expectedPackages.some((packageName) => installed.has(packageName));
}

export function checkpointReasonForPreflightCode(code = '') {
  return PREFLIGHT_CHECKPOINT_REASON[code] || 'manual_intervention';
}

export async function runJobPreflight({ provider, device, account = null, platform = '' } = {}) {
  const targetPlatform = String(platform || account?.platform || '').trim();
  if (account && idOf(account.assignedDeviceId) !== idOf(device?._id)) {
    throw new PreflightError('ACCOUNT_NOT_ASSIGNED', 'Account is not assigned to this device', {
      accountId: idOf(account._id),
      assignedDeviceId: idOf(account.assignedDeviceId),
      deviceId: idOf(device?._id)
    });
  }

  if (device?.provider === 'duoplus') {
    if (!hasActiveSubscription(device)) {
      throw new PreflightError('MISSING_SUBSCRIPTION', 'DuoPlus device does not have a verified active subscription', {
        deviceId: idOf(device._id),
        providerDeviceId: device.providerDeviceId
      });
    }
    if (device.providerMeta?.proxyConfigured !== true) {
      throw new PreflightError('MISSING_PROXY', 'DuoPlus device does not have a configured proxy', {
        deviceId: idOf(device._id),
        providerDeviceId: device.providerDeviceId
      });
    }
  }

  if (typeof provider?.describeInstance === 'function') {
    const instance = await provider.describeInstance(device.providerDeviceId);
    if (!isRunningInstance(instance)) {
      throw new PreflightError('PHONE_OFFLINE', 'Cloud phone is not running', {
        deviceId: idOf(device._id),
        providerDeviceId: device.providerDeviceId
      });
    }
  }

  const expectedPackages = PLATFORM_PACKAGES[targetPlatform] || [];
  if (expectedPackages.length && typeof provider?.listInstalledApps === 'function') {
    const installedApps = await provider.listInstalledApps(device.providerDeviceId);
    if (!hasInstalledPackage(installedApps, expectedPackages)) {
      throw new PreflightError('APP_NOT_INSTALLED', `${targetPlatform} app is not installed on the device`, {
        deviceId: idOf(device._id),
        providerDeviceId: device.providerDeviceId,
        platform: targetPlatform,
        expectedPackages
      });
    }
  }

  return { ok: true };
}

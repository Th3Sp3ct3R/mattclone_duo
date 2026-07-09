import { env } from '@julio/api/config/env';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';

import { runEngineJob } from '../engine-job-runner.js';
import { emitDeviceEvent } from '../device-event-emitter.js';
import { getProvider, withDeviceLease } from './worker-context.js';
import { PreflightError, runJobPreflight } from './preflight.js';

const TIKTOK_PACKAGE = 'com.zhiliaoapp.musically';
const INSTAGRAM_PACKAGE = 'com.instagram.android';
const YOUTUBE_PACKAGE = 'com.google.android.youtube';
const SUNO_PACKAGE = 'com.suno.android';

function shellQuote(value = '') {
  return `'${String(value || '').replace(/'/g, "'\\''")}'`;
}

async function getProxyForDevice(deviceId) {
  const assignment = await EngineProxyAssignment.findOne({ deviceId, deactivatedAt: null }).sort({ assignedAt: -1 });
  if (!assignment) return null;
  return EngineProxy.findById(assignment.proxyId);
}

async function installSunoPackage({ controller }) {
  const sourceUrl = String(env.apkUrls.suno || '').trim();
  if (!sourceUrl) return { platform: 'suno', installed: false, skipped: true, reason: 'missing_suno_xapk_url' };

  const sourcePath = sourceUrl.split('?')[0] || sourceUrl;
  const fileName = sourcePath.split('/').filter(Boolean).pop() || 'suno.apk';
  const lowerName = fileName.toLowerCase();
  const stageDir = '/sdcard/Download/suno-install';
  const archivePath = `${stageDir}/${fileName}`;
  const shellUrl = shellQuote(sourceUrl);
  const shellArchive = shellQuote(archivePath);
  const shellStageDir = shellQuote(stageDir);

  await controller.shell(`mkdir -p ${shellStageDir}`);
  await controller
    .shell(`toybox wget -O ${shellArchive} ${shellUrl} || curl -L -o ${shellArchive} ${shellUrl}`)
    .catch(() => '');

  let installCommand = '';
  if (lowerName.endsWith('.xapk') || lowerName.endsWith('.apks') || lowerName.endsWith('.zip')) {
    const unpackDir = `${stageDir}/unpacked`;
    const shellUnpackDir = shellQuote(unpackDir);
    await controller.shell(`rm -rf ${shellUnpackDir} && mkdir -p ${shellUnpackDir}`);
    await controller
      .shell(`toybox unzip -o ${shellArchive} -d ${shellUnpackDir} || unzip -o ${shellArchive} -d ${shellUnpackDir}`)
      .catch(() => '');
    const apkListing = await controller
      .shell(`find ${shellUnpackDir} -name '*.apk' | sort`)
      .catch(() => '');
    const apkPaths = String(apkListing || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (apkPaths.length) {
      const quotedApks = apkPaths.map((apkPath) => shellQuote(apkPath)).join(' ');
      installCommand = `pm install-multiple -r -g ${quotedApks} || pm install-multiple ${quotedApks}`;
    }
  } else {
    installCommand = `pm install -r -g ${shellArchive} || pm install -r ${shellArchive}`;
  }

  if (installCommand) {
    await controller.shell(installCommand).catch(() => '');
  }

  const installed = await controller.shell(`pm path ${shellQuote(SUNO_PACKAGE)}`).catch(() => '');
  return {
    platform: 'suno',
    packageName: SUNO_PACKAGE,
    installed: String(installed || '').includes('package:'),
    sourceUrl,
    fileName,
    archivePath
  };
}

// DuoPlus: install from the DuoPlus-hosted app catalog (/app/platformList -> /app/install).
// No APK hosting or ADB push needed.
async function provisionDuoPlusApps({ provider, device, controller }) {
  const appNames = env.duoplusAppSet || [];
  const suno = await installSunoPackage({ controller });
  if (!appNames.length) return { provider: 'duoplus', appNames: [], installed: [], missing: [], suno };
  const result = await provider.provisionApps(device.providerDeviceId, { appNames });
  return { provider: 'duoplus', appNames, suno, ...result };
}

// VMOS: push APK by URL + auto-install.
async function provisionVmosApps({ provider, device, controller }) {
  const reports = [];
  const apps = [
    { platform: 'tiktok', packageName: TIKTOK_PACKAGE, apkUrl: env.apkUrls.tiktok },
    { platform: 'instagram', packageName: INSTAGRAM_PACKAGE, apkUrl: env.apkUrls.instagram },
    { platform: 'youtube', packageName: YOUTUBE_PACKAGE, apkUrl: env.apkUrls.youtube }
  ].filter((item) => item.apkUrl);

  for (const app of apps) {
    const installed = await controller.shell(`pm path ${app.packageName}`).catch(() => '');
    if (installed) {
      reports.push({ platform: app.platform, installed: true, skipped: true });
      continue;
    }
    const upload = await provider.pushFileByUrl(device.providerDeviceId, {
      url: app.apkUrl,
      customizeFilePath: '/sdcard/Download/',
      autoInstall: 1
    });
    reports.push({ platform: app.platform, installed: false, taskId: upload.data?.taskId || '' });
  }
  return { provider: 'vmos', apps: reports };
}

function provisionApps({ provider, device, controller }) {
  if (device.provider === 'duoplus') return provisionDuoPlusApps({ provider, device, controller });
  return provisionVmosApps({ provider, device, controller });
}

export async function handleDeviceJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }, jobRun) =>
    withDeviceLease(targetId, async (device) => {
      const provider = getProvider(device.provider);
      const now = new Date();
      const event = (message, data = {}) =>
        emitDeviceEvent({ deviceId: device._id, source: 'device', jobRunId: jobRun._id, jobName, message, data });

      if (jobName === 'stop') {
        await event('stopping device');
        await provider.stopDevice(device.providerDeviceId);
        await EngineDevice.findByIdAndUpdate(device._id, { status: 'stopped', 'runtime.lastHeartbeatAt': now });
        await event('device stopped');
        return { stopped: true };
      }

      await EngineDevice.findByIdAndUpdate(device._id, { status: jobName === 'provision' ? 'provisioning' : 'starting' });
      if (jobName === 'start') {
        await event('starting device');
        await provider.startDevice(device.providerDeviceId);
      }
      const adb = await provider.getAdbConnection(device.providerDeviceId);
      const controller = provider.createDirectController(device.providerDeviceId);

      if (jobName === 'screenshot') {
        await event('capturing screenshot');
        const screenshot = await controller.screenshot();
        await EngineDevice.findByIdAndUpdate(device._id, {
          status: 'running',
          'runtime.lastScreenshotUrl': screenshot,
          'runtime.lastHeartbeatAt': now
        });
        await event('screenshot captured', { screenshot });
        return { screenshot };
      }

      if (jobName === 'provision') {
        const proxy = await getProxyForDevice(device._id);
        const metaUpdate = {};
        if (proxy?.endpoint?.host) {
          await event('applying device proxy', { proxyId: String(proxy._id) });
          await provider.setSmartIp(device.providerDeviceId, proxy.endpoint);
          metaUpdate['providerMeta.proxyConfigured'] = true;
          metaUpdate['providerMeta.proxyId'] = String(proxy._id);
          metaUpdate['providerMeta.proxyIp'] = String(proxy.endpoint.host || '');
        }
        const preflightDevice = {
          ...(device.toObject?.() || device),
          providerMeta: {
            ...(device.providerMeta?.toObject?.() || device.providerMeta || {}),
            ...(metaUpdate['providerMeta.proxyConfigured'] ? { proxyConfigured: true } : {})
          }
        };
        try {
          await runJobPreflight({ provider, device: preflightDevice });
        } catch (err) {
          if (err instanceof PreflightError) {
            await event('device provision preflight failed', { code: err.code, reason: err.checkpointReason });
          }
          throw err;
        }
        await event('provisioning platform apps');
        const apps = await provisionApps({ provider, device, controller });
        await EngineDevice.findByIdAndUpdate(device._id, {
          status: 'running',
          'runtime.adbAddress': adb.data?.adb || '',
          'runtime.adbPassword': adb.data?.key || '',
          'runtime.lastHeartbeatAt': now,
          'providerMeta.installedApps': apps,
          ...metaUpdate
        });
        await event('device provisioned', { apps });
        return { provisioned: true, apps };
      }

      await event('checking active package');
      const packageName = await controller.getCurrentPackage();
      await EngineDevice.findByIdAndUpdate(device._id, {
        status: 'running',
        'runtime.adbAddress': adb.data?.adb || device.runtime?.adbAddress || '',
        'runtime.adbPassword': adb.data?.key || device.runtime?.adbPassword || '',
        'runtime.lastHeartbeatAt': now
      });
      await event('device health check completed', { packageName });
      return { healthy: true, packageName };
    })
  );
}

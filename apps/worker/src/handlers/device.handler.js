import { env } from '@julio/api/config/env';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';

import { runEngineJob } from '../engine-job-runner.js';
import { emitDeviceEvent } from '../device-event-emitter.js';
import { getProvider, withDeviceLease } from './worker-context.js';

const TIKTOK_PACKAGE = 'com.zhiliaoapp.musically';
const INSTAGRAM_PACKAGE = 'com.instagram.android';

async function getProxyForDevice(deviceId) {
  const assignment = await EngineProxyAssignment.findOne({ deviceId, deactivatedAt: null }).sort({ assignedAt: -1 });
  if (!assignment) return null;
  return EngineProxy.findById(assignment.proxyId);
}

async function provisionApps({ provider, device, controller }) {
  const reports = [];
  const apps = [
    { platform: 'tiktok', packageName: TIKTOK_PACKAGE, apkUrl: env.apkUrls.tiktok },
    { platform: 'instagram', packageName: INSTAGRAM_PACKAGE, apkUrl: env.apkUrls.instagram }
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
  return reports;
}

export async function handleDeviceJob(payload) {
  return runEngineJob(payload, async ({ jobName, targetId }, jobRun) =>
    withDeviceLease(targetId, async (device) => {
      const provider = getProvider();
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
        if (proxy?.endpoint?.host) {
          await event('applying device proxy', { proxyId: String(proxy._id) });
          await provider.setSmartIp(device.providerDeviceId, proxy.endpoint);
        }
        await event('provisioning platform apps');
        const apps = await provisionApps({ provider, device, controller });
        await EngineDevice.findByIdAndUpdate(device._id, {
          status: 'running',
          'runtime.adbAddress': adb.data?.adb || '',
          'runtime.adbPassword': adb.data?.key || '',
          'runtime.lastHeartbeatAt': now
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

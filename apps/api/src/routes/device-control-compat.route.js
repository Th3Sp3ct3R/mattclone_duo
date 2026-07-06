import { Router } from 'express';

import {
  getCompatDeviceStatus,
  listCompatDevices,
  openCompatDeviceApp,
  runCompatDeviceCommand,
  tapCompatDevice
} from '@julio/api/controllers/device-control-compat';

export function createDeviceControlCompatRouter() {
  const router = Router();

  router.get('/devices', listCompatDevices);
  router.get('/device/:deviceId/status', getCompatDeviceStatus);
  router.post('/device/:deviceId/app', openCompatDeviceApp);
  router.post('/device/:deviceId/tap', tapCompatDevice);
  router.post('/device/:deviceId/command', runCompatDeviceCommand);

  return router;
}

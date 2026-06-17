import { EngineAccount } from '@julio/api/models/engine-account';
import { EngineDevice } from '@julio/api/models/engine-device';
import { EnginePost } from '@julio/api/models/engine-post';
import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';

import { recordSummary } from './state.mjs';

export async function verifyMigration(state) {
  const [deviceIds, accountIds, proxyIds] = await Promise.all([
    EngineDevice.distinct('_id'),
    EngineAccount.distinct('_id'),
    EngineProxy.distinct('_id')
  ]);

  const [
    accountsWithDanglingDevices,
    postsWithDanglingAccounts,
    postsWithDanglingDevices,
    proxyAssignmentsWithDanglingProxies,
    proxyAssignmentsWithDanglingDevices
  ] = await Promise.all([
    EngineAccount.countDocuments({
      $and: [{ assignedDeviceId: { $ne: null } }, { assignedDeviceId: { $nin: deviceIds } }]
    }),
    EnginePost.countDocuments({ accountId: { $nin: accountIds } }),
    EnginePost.countDocuments({
      $and: [{ deviceId: { $ne: null } }, { deviceId: { $nin: deviceIds } }]
    }),
    EngineProxyAssignment.countDocuments({ proxyId: { $nin: proxyIds } }),
    EngineProxyAssignment.countDocuments({
      $and: [{ deviceId: { $ne: null } }, { deviceId: { $nin: deviceIds } }]
    })
  ]);

  recordSummary(state, 'verification', {
    accountsWithDanglingDevices,
    postsWithDanglingAccounts,
    postsWithDanglingDevices,
    proxyAssignmentsWithDanglingProxies,
    proxyAssignmentsWithDanglingDevices
  });
}

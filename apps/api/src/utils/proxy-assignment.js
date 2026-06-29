function idOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
}

export function findActiveProxyAssignmentConflict(conflicts = [], request = {}) {
  const requestedProxyId = idOf(request.proxyId);
  const requestedDeviceId = idOf(request.deviceId);
  const requestedAccountId = idOf(request.accountId);

  for (const assignment of conflicts) {
    const proxyId = idOf(assignment.proxyId);
    const deviceId = idOf(assignment.deviceId);
    const accountId = idOf(assignment.accountId);
    const sameProxy = proxyId && proxyId === requestedProxyId;
    const sameDevice = requestedDeviceId && deviceId === requestedDeviceId;
    const sameAccount = requestedAccountId && accountId === requestedAccountId;
    const sameAssignment =
      sameProxy &&
      (requestedDeviceId ? sameDevice : !deviceId) &&
      (requestedAccountId ? sameAccount : !accountId);

    if (sameAssignment) continue;
    if (sameProxy) return { type: 'proxy', assignment };
    if (sameDevice) return { type: 'device', assignment };
    if (sameAccount) return { type: 'account', assignment };
  }

  return null;
}


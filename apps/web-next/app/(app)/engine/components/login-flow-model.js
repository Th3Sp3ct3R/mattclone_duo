function idOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
}

function accountName(account) {
  if (!account) return 'No account';
  const username = account.credentials?.username || account.username || '';
  const platform = account.platform || 'account';
  return username ? `${username} / ${platform}` : platform;
}

function deviceName(device) {
  if (device.tier === 'ios' && device.providerDeviceId && device.name === `snap_${device.providerDeviceId}`) {
    return device.providerDeviceId;
  }
  return device.displayLabel || device.name || device.providerDeviceId || idOf(device);
}

function proxyState(device) {
  const assignedProxy = device.activeProxyAssignment?.proxy || null;
  if (assignedProxy) {
    const host = assignedProxy.endpoint?.host || '';
    const port = assignedProxy.endpoint?.port || '';
    const endpoint = [host, port].filter(Boolean).join(':');
    return {
      proxyLabel: endpoint || assignedProxy.label || 'assigned',
      proxyTone: assignedProxy.status === 'unhealthy' ? 'retry' : 'assigned',
      proxyProtocol: assignedProxy.endpoint?.protocol || 'http'
    };
  }

  if (device.tier === 'ios') {
    const configured = Boolean(device.providerMeta?.proxyConfigured);
    return {
      proxyLabel: configured ? device.providerMeta?.proxyIp || 'configured' : 'No proxy',
      proxyTone: configured ? 'configured' : 'missing',
      proxyProtocol: 'proxy'
    };
  }

  return { proxyLabel: 'managed', proxyTone: 'configured', proxyProtocol: '' };
}

function stageState(account, latestEvent) {
  if (!account) return { loginStage: 'no-account', stageTone: 'idle' };
  const status = account.status || 'new';
  const failures = Number(account.health?.consecutiveFailures || 0);
  const hasFailure = failures > 0 || Boolean(account.health?.lastFailureReason);

  if (status === 'checkpointed' || status === 'banned') {
    return { loginStage: 'blocked', stageTone: 'blocked' };
  }
  if (status === 'cooldown') return { loginStage: 'retry', stageTone: 'retry' };
  if (hasFailure || latestEvent?.level === 'error') return { loginStage: 'failure', stageTone: 'failed' };
  if (status === 'logging_in') return { loginStage: 'logging-in', stageTone: 'working' };
  if (status === 'active') return { loginStage: 'active', stageTone: 'ok' };
  return { loginStage: 'ready', stageTone: 'idle' };
}

function sortRows(a, b) {
  const tierRank = (row) => (row.tier === 'ios' ? 0 : 1);
  const statusRank = (row) => (row.deviceStatus === 'running' ? 0 : 1);
  return (
    tierRank(a) - tierRank(b) ||
    statusRank(a) - statusRank(b) ||
    a.deviceName.localeCompare(b.deviceName)
  );
}

export function buildLoginFlowRows({ devices = [], accounts = [] } = {}) {
  const accountsByDevice = new Map();
  for (const account of accounts) {
    if (account.retiredAt) continue;
    const deviceId = idOf(account.assignedDeviceId);
    if (!deviceId) continue;
    const list = accountsByDevice.get(deviceId) || [];
    list.push(account);
    accountsByDevice.set(deviceId, list);
  }

  return devices
    .filter((device) => !device.retiredAt)
    .map((device) => {
      const assignedAccounts = accountsByDevice.get(idOf(device)) || [];
      const account = assignedAccounts[0] || null;
      const latestEvent = device.latestEvent || null;
      const proxy = proxyState(device);
      const stage = stageState(account, latestEvent);
      return {
        device,
        account,
        deviceId: idOf(device),
        accountId: idOf(account),
        deviceName: deviceName(device),
        tier: device.tier || 'android',
        tierDisplay: device.tierDisplay || 'Android OS',
        providerDisplay: device.providerDisplay || 'Android',
        providerDeviceId: device.providerDeviceId || '',
        deviceStatus: device.status || 'unknown',
        accountLabel: accountName(account),
        accountCount: assignedAccounts.length,
        accountStatus: account?.status || 'none',
        latestEventAt: latestEvent?.createdAt || null,
        latestEventLevel: latestEvent?.level || '',
        latestEventMessage: latestEvent?.message || 'No device event yet',
        failureReason:
          account?.health?.lastFailureReason ||
          (latestEvent?.level === 'error' ? latestEvent.message : ''),
        fallbackAvailable: device.tier === 'ios',
        screenshotUrl: device.runtime?.lastScreenshotUrl || '',
        ...proxy,
        ...stage
      };
    })
    .sort(sortRows);
}

'use client';

import { useState } from 'react';

import { Button, Card, DataTable, Input } from '@julio/ui';

import { AccountCreateForm } from './AccountCreateForm.jsx';
import { AssignDeviceDialog } from './AssignDeviceDialog.jsx';
import { DeviceLogsDialog } from './DeviceLogsDialog.jsx';
import { DuoPlusFocusMode } from './DuoPlusFocusMode.jsx';
import { EngineSelect } from './EngineSelect.jsx';
import { OnboardDialog } from './OnboardDialog.jsx';
import { accountDeviceOption } from './device-account-eligibility.js';
import { buildLoginFlowRows } from './login-flow-model.js';

const initialPostForm = {
  platform: 'tiktok',
  accountId: 'none',
  deviceId: 'none',
  sourceUrl: '',
  caption: '',
  hashtags: ''
};

const initialAccountForm = {
  platform: 'tiktok',
  username: '',
  password: '',
  email: '',
  displayName: '',
  bio: '',
  avatarUrl: '',
  nicheKey: '',
  deviceId: 'none'
};

const platformOptions = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' }
];

function statusCell(info) {
  return <span className="Kicker">{info.getValue() || 'unknown'}</span>;
}

function providerCell(info) {
  const value = info.getValue() || 'vmos';
  const className =
    value === 'duoplus' ? 'Kicker ProviderChip ProviderChip--duoplus' : 'Kicker ProviderChip ProviderChip--vmos';
  return <span className={className}>{value}</span>;
}

function proxyCell({ row }) {
  const device = row.original;
  if (device.provider !== 'duoplus') return <span className="Kicker">managed</span>;
  const configured = Boolean(device.providerMeta?.proxyConfigured);
  return (
    <span className={`Kicker ProxyState ${configured ? 'ProxyState--ok' : 'ProxyState--missing'}`}>
      {configured ? device.providerMeta?.proxyIp || device.providerMeta?.ip || 'configured' : 'No proxy'}
    </span>
  );
}

function idOf(value) {
  return value?._id ? String(value._id) : value ? String(value) : '';
}

function deviceName(device) {
  if (device?.provider === 'duoplus' && device.providerDeviceId && device.name === `snap_${device.providerDeviceId}`) {
    return device.providerDeviceId;
  }
  return device ? device.name || device.providerDeviceId || String(device._id) : 'unassigned';
}

function accountLabel(account) {
  return [account.credentials?.username, account.platform].filter(Boolean).join(' - ');
}

function formatTimestamp(value) {
  if (!value) return 'never';
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return 'unknown';
  }
}

export { initialAccountForm, initialPostForm };

export function EngineOperationsPanel({
  devices,
  accounts,
  posts,
  jobRuns,
  postForm,
  setPostForm,
  accountForm,
  setAccountForm,
  actionKey,
  actionButton,
  createAccount,
  createPost,
  syncDevices,
  syncDuoPlusDevices,
  refreshDeviceStatus,
  captureDeviceFrame,
  startDeviceConfirmed,
  onPoll,
  fetchFrames,
  loadDeviceFocus,
  assignAccountDevice,
  unassignAccountDevice,
  onboardAccount
}) {
  const [logDevice, setLogDevice] = useState(null);
  const [assignAccount, setAssignAccount] = useState(null);
  const [onboardTarget, setOnboardTarget] = useState(null);
  const [providerFilter, setProviderFilter] = useState('all');
  const [focusMode, setFocusMode] = useState(false);
  const [focusDevice, setFocusDevice] = useState(null);
  const [focusPayload, setFocusPayload] = useState(null);
  const [focusError, setFocusError] = useState('');
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusQuality, setFocusQuality] = useState({});
  const activeDevices = devices.filter((device) => !device.retiredAt);
  const filteredDevices =
    providerFilter === 'all' ? activeDevices : activeDevices.filter((device) => device.provider === providerFilter);
  const loginFlowRows = buildLoginFlowRows({ devices: filteredDevices, accounts });
  const deviceOptions = [
    { value: 'none', label: 'No device' },
    ...activeDevices.map((device) => accountDeviceOption(device, deviceName(device)))
  ];
  const accountOptions = [
    { value: 'none', label: 'Select account' },
    ...accounts.map((account) => ({ value: String(account._id), label: accountLabel(account) }))
  ];
  const deviceById = new Map(devices.map((device) => [String(device._id), device]));
  const isAssigning = assignAccount ? actionKey === `account:${assignAccount._id}:assign` : false;
  const isOnboarding = onboardTarget ? actionKey === `account:${onboardTarget._id}:onboard` : false;

  async function openFocus(device, quality = focusQuality) {
    setFocusDevice(device);
    setFocusPayload(null);
    setFocusError('');
    if (device.provider !== 'duoplus') return;
    setFocusLoading(true);
    try {
      setFocusPayload(await loadDeviceFocus(device, quality));
    } catch (err) {
      setFocusError(err?.message || 'Failed to load focus.');
    } finally {
      setFocusLoading(false);
    }
  }

  async function refreshFocus() {
    if (!focusDevice) return;
    await openFocus(focusDevice, focusQuality);
  }

  async function changeFocusQuality(quality) {
    setFocusQuality(quality);
    if (focusDevice) await openFocus(focusDevice, quality);
  }

  const deviceColumns = [
    { accessorKey: 'name', header: 'Device' },
    { accessorKey: 'provider', header: 'Provider', cell: providerCell },
    { accessorKey: 'providerDeviceId', header: 'Provider ID' },
    { accessorKey: 'status', header: 'Status', cell: statusCell },
    { id: 'proxy', header: 'Proxy', cell: proxyCell },
    { accessorKey: 'region', header: 'Region' },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const device = row.original;
        const actions =
          device.provider === 'duoplus'
            ? ['start', 'status', 'screenshot', 'focus', 'stop']
            : ['start', 'provision', 'screenshot', 'health-check', 'stop'];
        return (
          <div className="layout-inline-gap-8">
            {actions.map((action) => {
              if (action === 'status') {
                return (
                  <Button
                    key={action}
                    size="sm"
                    variant="secondary"
                    loading={actionKey === `device:${device._id}:status`}
                    onClick={() => refreshDeviceStatus(device)}
                  >
                    status
                  </Button>
                );
              }
              if (action === 'focus') {
                return (
                  <Button key={action} size="sm" variant="secondary" onClick={() => openFocus(device)}>
                    focus
                  </Button>
                );
              }
              if (action === 'start' && startDeviceConfirmed) {
                return (
                  <Button
                    key={action}
                    size="sm"
                    variant="secondary"
                    loading={actionKey === `device:${device._id}:start`}
                    onClick={() => startDeviceConfirmed(device)}
                  >
                    start
                  </Button>
                );
              }
              return actionButton(action, `device:${device._id}:${action}`, 'device', device._id);
            })}
            <Button size="sm" variant="secondary" onClick={() => setLogDevice(device)}>
              logs
            </Button>
          </div>
        );
      }
    }
  ];

  const accountColumns = [
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'credentials.username', header: 'Username' },
    { accessorKey: 'status', header: 'Status', cell: statusCell },
    { accessorKey: 'profile.nicheKey', header: 'Niche' },
    {
      id: 'assignedDevice',
      header: 'Assigned Device',
      cell: ({ row }) => {
        const device = deviceById.get(idOf(row.original.assignedDeviceId));
        return <span className="Kicker">{deviceName(device)}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const account = row.original;
        const canOnboard = account.platform === 'tiktok' && Boolean(account.assignedDeviceId);
        return (
          <div className="layout-inline-gap-8">
            <Button size="sm" variant="secondary" onClick={() => setAssignAccount(account)}>
              assign
            </Button>
            <Button size="sm" variant="secondary" disabled={!canOnboard} onClick={() => setOnboardTarget(account)}>
              onboard
            </Button>
            {['login', 'profile-setup', 'warmup', 'health-check'].map((action) =>
              actionButton(action, `account:${account._id}:${action}`, 'account', account._id)
            )}
          </div>
        );
      }
    }
  ];

  const postColumns = [
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'status', header: 'Status', cell: statusCell },
    { accessorKey: 'publishOptions.caption', header: 'Caption' },
    { accessorKey: 'scheduledAt', header: 'Scheduled' },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="layout-inline-gap-8">
          {['publish', 'retry', 'cancel'].map((action) =>
            actionButton(action, `post:${row.original._id}:${action}`, 'post', row.original._id)
          )}
        </div>
      )
    }
  ];

  const jobRunColumns = [
    { accessorKey: 'queueName', header: 'Queue' },
    { accessorKey: 'jobName', header: 'Job' },
    { accessorKey: 'status', header: 'Status', cell: statusCell },
    { accessorKey: 'attempts', header: 'Attempts' },
    { accessorKey: 'lastError.message', header: 'Last error' }
  ];

  return (
    <>
      <Card>
        <div className="layout-stack-gap-12">
          <div className="layout-inline-gap-8">
            <h2>Devices</h2>
            <Button size="sm" variant="secondary" loading={actionKey === 'devices:sync:vmos'} onClick={syncDevices}>
              Sync VMOS devices
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={actionKey === 'devices:sync:duoplus'}
              onClick={syncDuoPlusDevices}
            >
              Sync DuoPlus devices
            </Button>
            <Button
              size="sm"
              variant={focusMode ? 'primary' : 'secondary'}
              aria-pressed={focusMode}
              onClick={() => setFocusMode((prev) => !prev)}
            >
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </Button>
          </div>
          <div className="layout-inline-gap-8" role="group" aria-label="Filter devices by provider">
            <Button
              size="sm"
              variant={providerFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setProviderFilter('all')}
            >
              All ({activeDevices.length})
            </Button>
            <Button
              size="sm"
              variant={providerFilter === 'vmos' ? 'primary' : 'secondary'}
              onClick={() => setProviderFilter('vmos')}
            >
              VMOS ({activeDevices.filter((d) => d.provider === 'vmos').length})
            </Button>
            <Button
              size="sm"
              variant={providerFilter === 'duoplus' ? 'primary' : 'secondary'}
              onClick={() => setProviderFilter('duoplus')}
            >
              DuoPlus ({activeDevices.filter((d) => d.provider === 'duoplus').length})
            </Button>
          </div>
          {focusMode ? (
            <DuoPlusFocusMode
              devices={filteredDevices}
              actionKey={actionKey}
              onRefreshStatus={refreshDeviceStatus}
              onCapture={captureDeviceFrame}
              onFocus={openFocus}
              onPoll={onPoll}
              fetchFrames={fetchFrames}
            />
          ) : (
            <>
              <LoginFlowOperatorBoard
                rows={loginFlowRows}
                actionKey={actionKey}
                onRefresh={refreshDeviceStatus}
                onFocus={openFocus}
                onLogs={setLogDevice}
              />
              <DataTable
                columns={deviceColumns}
                data={filteredDevices}
                emptyMessage={
                  providerFilter === 'duoplus'
                    ? 'No DuoPlus devices registered.'
                    : providerFilter === 'vmos'
                      ? 'No VMOS devices registered.'
                      : 'No devices registered.'
                }
              />
            </>
          )}
          <DuoPlusFocusPanel
            device={focusDevice}
            payload={focusPayload}
            loading={focusLoading}
            error={focusError}
            quality={focusQuality}
            onQualityChange={changeFocusQuality}
            onRefresh={refreshFocus}
            onClose={() => {
              setFocusDevice(null);
              setFocusPayload(null);
              setFocusError('');
            }}
          />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Accounts</h2>
          <AccountCreateForm
            accountForm={accountForm}
            setAccountForm={setAccountForm}
            deviceOptions={deviceOptions}
            actionKey={actionKey}
            createAccount={createAccount}
          />
          <DataTable columns={accountColumns} data={accounts} emptyMessage="No accounts registered." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Posts</h2>
          <form className="layout-stack-gap-12" onSubmit={createPost}>
            <div className="HomeFeatureGrid">
              <EngineSelect
                value={postForm.platform}
                onValueChange={(value) => setPostForm((prev) => ({ ...prev, platform: value }))}
                placeholder="Platform"
                options={platformOptions}
              />
              <EngineSelect
                value={postForm.accountId}
                onValueChange={(value) => setPostForm((prev) => ({ ...prev, accountId: value }))}
                placeholder="Account"
                options={accountOptions}
              />
              <EngineSelect
                value={postForm.deviceId}
                onValueChange={(value) => setPostForm((prev) => ({ ...prev, deviceId: value }))}
                placeholder="Device override"
                options={deviceOptions}
              />
              <Input
                placeholder="Public media URL"
                value={postForm.sourceUrl}
                onChange={(event) => setPostForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                required
              />
              <Input
                placeholder="Caption"
                value={postForm.caption}
                onChange={(event) => setPostForm((prev) => ({ ...prev, caption: event.target.value }))}
              />
              <Input
                placeholder="hashtags, comma-separated"
                value={postForm.hashtags}
                onChange={(event) => setPostForm((prev) => ({ ...prev, hashtags: event.target.value }))}
              />
            </div>
            <Button type="submit" loading={actionKey === 'post:create'} disabled={postForm.accountId === 'none'}>
              Create and queue post
            </Button>
          </form>
          <DataTable columns={postColumns} data={posts} emptyMessage="No posts queued." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Recent Engine Jobs</h2>
          <DataTable columns={jobRunColumns} data={jobRuns} emptyMessage="No job runs yet." />
        </div>
      </Card>
      <DeviceLogsDialog device={logDevice} open={Boolean(logDevice)} onOpenChange={(open) => !open && setLogDevice(null)} />
      <AssignDeviceDialog
        account={assignAccount}
        devices={devices}
        open={Boolean(assignAccount)}
        onOpenChange={(open) => !open && setAssignAccount(null)}
        onAssign={assignAccountDevice}
        onUnassign={unassignAccountDevice}
        loading={isAssigning}
      />
      <OnboardDialog
        account={onboardTarget}
        open={Boolean(onboardTarget)}
        onOpenChange={(open) => !open && setOnboardTarget(null)}
        onOnboard={onboardAccount}
        loading={isOnboarding}
      />
    </>
  );
}

function LoginFlowOperatorBoard({ rows, actionKey, onRefresh, onFocus, onLogs }) {
  if (!rows.length) {
    return <div className="LoginFlowBoard LoginFlowBoard--empty">No active devices in this filter.</div>;
  }

  return (
    <div className="LoginFlowBoard" aria-label="Login flow operator board">
      <div className="LoginFlowBoard__header">
        <div>
          <div className="Kicker">Login flow</div>
          <h3>Device operator queue</h3>
        </div>
        <span className="Kicker">{rows.length} active</span>
      </div>
      <div className="LoginFlowRows">
        {rows.map((row) => (
          <div className={`LoginFlowRow LoginFlowRow--${row.stageTone}`} key={row.deviceId}>
            <div className="LoginFlowRow__main">
              <div className="LoginFlowRow__identity">
                <span
                  className={
                    row.provider === 'duoplus'
                      ? 'Kicker ProviderChip ProviderChip--duoplus'
                      : 'Kicker ProviderChip ProviderChip--vmos'
                  }
                >
                  {row.provider}
                </span>
                <div>
                  <h4>{row.deviceName}</h4>
                  <span className="Kicker">{row.providerDeviceId || row.deviceId}</span>
                </div>
              </div>
              <div className="LoginFlowRow__commands">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionKey === `device:${row.deviceId}:status`}
                  onClick={() => onRefresh(row.device)}
                >
                  status
                </Button>
                {row.fallbackAvailable ? (
                  <Button size="sm" variant="secondary" onClick={() => onFocus(row.device)}>
                    focus
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => onLogs(row.device)}>
                  logs
                </Button>
              </div>
            </div>
            <div className="LoginFlowRow__metrics">
              <div>
                <span>Device</span>
                <strong>{row.deviceStatus}</strong>
              </div>
              <div>
                <span>Account</span>
                <strong>{row.accountLabel}</strong>
              </div>
              <div>
                <span>Stage</span>
                <strong className={`LoginStage LoginStage--${row.stageTone}`}>{row.loginStage}</strong>
              </div>
              <div>
                <span>Proxy</span>
                <strong className={`LoginProxy LoginProxy--${row.proxyTone}`}>{row.proxyLabel}</strong>
              </div>
              <div>
                <span>Event</span>
                <strong>{formatTimestamp(row.latestEventAt)}</strong>
              </div>
              <div>
                <span>Snapshot</span>
                <strong>{row.screenshotUrl ? 'available' : row.fallbackAvailable ? 'fallback' : 'n/a'}</strong>
              </div>
            </div>
            <div className="LoginFlowRow__event">
              <span className={`LoginEvent LoginEvent--${row.latestEventLevel || 'none'}`}>
                {row.latestEventLevel || 'none'}
              </span>
              <span>{row.latestEventMessage}</span>
            </div>
            {row.failureReason ? <div className="LoginFlowRow__alert">{row.failureReason}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DuoPlusFocusPanel({ device, payload, loading, error, quality, onQualityChange, onRefresh, onClose }) {
  if (!device) return null;
  const focus = payload?.focus || {};
  const displayDevice = payload?.device || device;
  const proxyConfigured = Boolean(displayDevice.providerMeta?.proxyConfigured);
  const live = Boolean(focus.liveStreamAvailable && focus.controlUrl);
  const presets = focus.qualityPresets || [];
  const activePreset = (quality && quality.bitrate) || focus.quality?.bitrate;
  const deviceTitle = displayDevice.name || displayDevice.providerDeviceId;

  return (
    <div className="DuoPlusFocusPanel" aria-busy={loading}>
      <div className="DuoPlusFocusPanel__header">
        <div>
          <div className="Kicker">{live ? 'DuoPlus live control' : 'DuoPlus focus'}</div>
          <h3>{deviceTitle}</h3>
        </div>
        <div className="layout-inline-gap-8">
          <span className={`FocusModeBadge FocusModeBadge--${live ? 'live' : 'fallback'}`}>
            {live ? 'live' : 'screenshot'}
          </span>
          <Button size="sm" variant="secondary" loading={loading} onClick={onRefresh}>
            refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            close
          </Button>
        </div>
      </div>
      {error ? <div className="Error">{error}</div> : null}
      {live && presets.length ? (
        <div className="DuoPlusFocusPanel__quality" role="group" aria-label="Stream quality">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              variant={activePreset === preset.bitrate ? 'primary' : 'secondary'}
              onClick={() => onQualityChange?.({ bitrate: preset.bitrate, fps: preset.fps, clarity: 'S' })}
            >
              {preset.label}
            </Button>
          ))}
          <span className="Kicker">
            {focus.quality ? `${focus.quality.bitrate}kbps · ${focus.quality.fps}fps` : ''}
          </span>
        </div>
      ) : null}
      <div className="DuoPlusFocusPanel__body">
        <div className="DuoPlusFocusPanel__screen">
          {live ? (
            <iframe
              className="DuoPlusFocusPanel__frame"
              src={focus.controlUrl}
              title={`${deviceTitle} live control`}
              allow="autoplay; clipboard-read; clipboard-write; microphone; camera"
            />
          ) : focus.screenshotUrl ? (
            <img src={focus.screenshotUrl} alt={`${deviceTitle} screenshot`} />
          ) : (
            <div className="DuoPlusFocusPanel__empty">
              <span>fallback</span>
              <strong>No live stream</strong>
              <small>
                Enable DUOPLUS_FOCUS_STREAM_ENABLED for live control, or run a screenshot capture to populate a frame.
              </small>
            </div>
          )}
        </div>
        <div className="DuoPlusFocusPanel__meta">
          <div>
            <span>Status</span>
            <strong>{displayDevice.status || 'unknown'}</strong>
          </div>
          <div>
            <span>Proxy</span>
            <strong>{proxyConfigured ? displayDevice.providerMeta?.proxyIp || 'configured' : 'No proxy'}</strong>
          </div>
          <div>
            <span>Provider ID</span>
            <strong>{displayDevice.providerDeviceId}</strong>
          </div>
          <div>
            <span>Runtime IP</span>
            <strong>{displayDevice.providerMeta?.ip || 'unreported'}</strong>
          </div>
          <div>
            <span>ADB</span>
            <strong>{displayDevice.runtime?.adbAddress || 'unreported'}</strong>
          </div>
          <div>
            <span>Stream</span>
            <strong>{live ? 'veRTC (ARMVM)' : 'disabled'}</strong>
          </div>
          {focus.controlUrl ? (
            <a className="DuoPlusFocusPanel__external" href={focus.controlUrl} target="_blank" rel="noreferrer">
              Open externally
            </a>
          ) : null}
        </div>
      </div>
      {live ? (
        <p className="DuoPlusFocusPanel__note Kicker">
          Live control embeds DuoPlus (ARMVM/veRTC) and requires an active DuoPlus session in this browser.
        </p>
      ) : null}
    </div>
  );
}

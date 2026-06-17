'use client';

import { useState } from 'react';

import { Button, Card, DataTable, Input } from '@julio/ui';

import { AccountCreateForm } from './AccountCreateForm.jsx';
import { AssignDeviceDialog } from './AssignDeviceDialog.jsx';
import { DeviceLogsDialog } from './DeviceLogsDialog.jsx';
import { EngineSelect } from './EngineSelect.jsx';
import { OnboardDialog } from './OnboardDialog.jsx';

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

function idOf(value) {
  return value?._id ? String(value._id) : value ? String(value) : '';
}

function deviceName(device) {
  return device ? device.name || device.providerDeviceId || String(device._id) : 'unassigned';
}

function accountLabel(account) {
  return [account.credentials?.username, account.platform].filter(Boolean).join(' - ');
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
  assignAccountDevice,
  unassignAccountDevice,
  onboardAccount
}) {
  const [logDevice, setLogDevice] = useState(null);
  const [assignAccount, setAssignAccount] = useState(null);
  const [onboardTarget, setOnboardTarget] = useState(null);
  const activeDevices = devices.filter((device) => !device.retiredAt);
  const deviceOptions = [
    { value: 'none', label: 'No device' },
    ...activeDevices.map((device) => ({ value: String(device._id), label: deviceName(device) }))
  ];
  const accountOptions = [
    { value: 'none', label: 'Select account' },
    ...accounts.map((account) => ({ value: String(account._id), label: accountLabel(account) }))
  ];
  const deviceById = new Map(devices.map((device) => [String(device._id), device]));
  const isAssigning = assignAccount ? actionKey === `account:${assignAccount._id}:assign` : false;
  const isOnboarding = onboardTarget ? actionKey === `account:${onboardTarget._id}:onboard` : false;

  const deviceColumns = [
    { accessorKey: 'name', header: 'Device' },
    { accessorKey: 'providerDeviceId', header: 'Provider ID' },
    { accessorKey: 'status', header: 'Status', cell: statusCell },
    { accessorKey: 'region', header: 'Region' },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="layout-inline-gap-8">
          {['start', 'provision', 'screenshot', 'health-check', 'stop'].map((action) =>
            actionButton(action, `device:${row.original._id}:${action}`, 'device', row.original._id)
          )}
          <Button size="sm" variant="secondary" onClick={() => setLogDevice(row.original)}>
            logs
          </Button>
        </div>
      )
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
            <Button size="sm" variant="secondary" loading={actionKey === 'devices:sync'} onClick={syncDevices}>
              Sync VMOS devices
            </Button>
          </div>
          <DataTable columns={deviceColumns} data={devices} emptyMessage="No devices registered." />
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

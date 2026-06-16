'use client';

import { Button, Card, DataTable, Input } from '@julio/ui';

const initialPostForm = {
  platform: 'tiktok',
  accountId: '',
  deviceId: '',
  sourceUrl: '',
  caption: '',
  hashtags: ''
};

function statusCell(info) {
  return <span className="Kicker">{info.getValue() || 'unknown'}</span>;
}

export { initialPostForm };

export function EngineOperationsPanel({
  devices,
  accounts,
  posts,
  jobRuns,
  postForm,
  setPostForm,
  actionKey,
  actionButton,
  createPost
}) {
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
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="layout-inline-gap-8">
          {['login', 'profile-setup', 'warmup', 'health-check'].map((action) =>
            actionButton(action, `account:${row.original._id}:${action}`, 'account', row.original._id)
          )}
        </div>
      )
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
          <h2>Devices</h2>
          <DataTable columns={deviceColumns} data={devices} emptyMessage="No devices registered." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Accounts</h2>
          <DataTable columns={accountColumns} data={accounts} emptyMessage="No accounts registered." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Posts</h2>
          <form className="layout-stack-gap-12" onSubmit={createPost}>
            <div className="HomeFeatureGrid">
              <select
                className="c-DataTable__pageSize"
                value={postForm.platform}
                onChange={(event) => setPostForm((prev) => ({ ...prev, platform: event.target.value }))}
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
              <Input placeholder="Account ID" value={postForm.accountId} onChange={(event) => setPostForm((prev) => ({ ...prev, accountId: event.target.value }))} required />
              <Input placeholder="Device ID (optional)" value={postForm.deviceId} onChange={(event) => setPostForm((prev) => ({ ...prev, deviceId: event.target.value }))} />
              <Input placeholder="Public media URL" value={postForm.sourceUrl} onChange={(event) => setPostForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} required />
              <Input placeholder="Caption" value={postForm.caption} onChange={(event) => setPostForm((prev) => ({ ...prev, caption: event.target.value }))} />
              <Input placeholder="hashtags, comma-separated" value={postForm.hashtags} onChange={(event) => setPostForm((prev) => ({ ...prev, hashtags: event.target.value }))} />
            </div>
            <Button type="submit" loading={actionKey === 'post:create'}>
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
    </>
  );
}

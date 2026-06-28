'use client';

import { Button, Input } from '@julio/ui';

import { EngineSelect } from './EngineSelect.jsx';

const platformOptions = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' }
];

export function AccountCreateForm({ accountForm, setAccountForm, deviceOptions, actionKey, createAccount }) {
  return (
    <form className="layout-stack-gap-12" onSubmit={createAccount}>
      <div className="HomeFeatureGrid">
        <EngineSelect
          value={accountForm.platform}
          onValueChange={(value) => setAccountForm((prev) => ({ ...prev, platform: value }))}
          placeholder="Platform"
          options={platformOptions}
        />
        <Input
          placeholder="Username"
          value={accountForm.username}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, username: event.target.value }))}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={accountForm.password}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, password: event.target.value }))}
        />
        <Input
          placeholder="Email"
          value={accountForm.email}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          placeholder="Display name"
          value={accountForm.displayName}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, displayName: event.target.value }))}
        />
        <Input
          placeholder="Bio"
          value={accountForm.bio}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, bio: event.target.value }))}
        />
        <Input
          placeholder="Avatar URL"
          value={accountForm.avatarUrl}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
        />
        <Input
          placeholder="Niche key"
          value={accountForm.nicheKey}
          onChange={(event) => setAccountForm((prev) => ({ ...prev, nicheKey: event.target.value }))}
        />
        <EngineSelect
          value={accountForm.deviceId}
          onValueChange={(value) => setAccountForm((prev) => ({ ...prev, deviceId: value }))}
          placeholder="Assigned device"
          options={deviceOptions}
        />
      </div>
      <Button type="submit" loading={actionKey === 'account:create'}>
        Create account
      </Button>
    </form>
  );
}

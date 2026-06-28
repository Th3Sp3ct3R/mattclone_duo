'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Dialog } from '@julio/ui';

import { accountDeviceOption } from './device-account-eligibility.js';
import { EngineSelect } from './EngineSelect.jsx';

function idOf(value) {
  return value?._id ? String(value._id) : value ? String(value) : '';
}

function deviceLabel(device) {
  return [device.name || device.providerDeviceId, device.status, device.region].filter(Boolean).join(' - ');
}

export function AssignDeviceDialog({
  account,
  devices = [],
  open,
  onOpenChange,
  onAssign,
  onUnassign,
  loading = false
}) {
  const [deviceId, setDeviceId] = useState('');
  const activeDevices = devices.filter((device) => !device.retiredAt);
  const options = [
    { value: 'none', label: 'Unassigned' },
    ...activeDevices.map((device) => accountDeviceOption(device, deviceLabel(device)))
  ];

  useEffect(() => {
    if (open) setDeviceId(idOf(account?.assignedDeviceId) || 'none');
  }, [account?.assignedDeviceId, open]);

  async function submit(event) {
    event.preventDefault();
    if (!account?._id) return;
    if (deviceId && deviceId !== 'none') {
      await onAssign(account, deviceId);
    } else {
      await onUnassign(account);
    }
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Card>
            <form className="layout-stack-gap-12" onSubmit={submit}>
              <Dialog.Title>Assign Device</Dialog.Title>
              <Dialog.Description>
                Choose the VMOS device this account should use for login, warmup, health checks, and posting.
              </Dialog.Description>
              <div className="layout-stack-gap-8">
                <span className="Kicker">{account?.credentials?.username || 'Account'}</span>
                <EngineSelect
                  value={deviceId}
                  onValueChange={setDeviceId}
                  placeholder="Select device"
                  options={options}
                />
              </div>
              <div className="layout-inline-gap-8">
                <Button type="submit" loading={loading}>
                  Save assignment
                </Button>
                <Dialog.Close>
                  <Button type="button" variant="secondary">
                    cancel
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          </Card>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

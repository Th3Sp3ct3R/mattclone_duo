export function canDeviceAcceptAccount(device) {
  if (!device || device.provider !== 'duoplus') return true;
  const meta = device.providerMeta || {};
  return meta.subscriptionVerified === true && String(meta.subscriptionStatus || '').toLowerCase() === 'active';
}

export function accountDeviceOption(device, label) {
  const allowed = canDeviceAcceptAccount(device);
  return {
    value: String(device._id),
    label: allowed ? label : `${label} - subscription required`,
    disabled: !allowed
  };
}

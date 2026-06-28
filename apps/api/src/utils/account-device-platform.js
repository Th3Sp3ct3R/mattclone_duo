function idOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
}

export function findAccountDevicePlatformConflict(accounts = [], { platform, assignedDeviceId, accountId } = {}) {
  const targetPlatform = String(platform || '').trim();
  const targetDeviceId = idOf(assignedDeviceId);
  const targetAccountId = idOf(accountId);
  if (!targetPlatform || !targetDeviceId) return null;

  return (
    accounts.find((account) => {
      if (account.retiredAt) return false;
      if (String(account.platform || '').trim() !== targetPlatform) return false;
      if (idOf(account.assignedDeviceId) !== targetDeviceId) return false;
      return idOf(account._id) !== targetAccountId;
    }) || null
  );
}

export function createNotifications(adapter) {
  if (!adapter) {
    throw new Error('Notifications adapter required');
  }

  return {
    notify(payload) {
      return adapter.notify(payload);
    }
  };
}


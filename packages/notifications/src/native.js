export function createNativeNotifications(adapter) {
  if (!adapter || typeof adapter.notify !== 'function') {
    throw new Error('Native notifications adapter required');
  }

  return {
    notify(payload) {
      return adapter.notify(payload);
    }
  };
}


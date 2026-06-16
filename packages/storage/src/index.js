export function createStorage(adapter) {
  if (!adapter) {
    throw new Error('Storage adapter required');
  }

  return {
    async get(key) {
      return adapter.get(key);
    },
    async set(key, value) {
      return adapter.set(key, value);
    },
    async remove(key) {
      return adapter.remove(key);
    },
    async clear() {
      return adapter.clear();
    }
  };
}


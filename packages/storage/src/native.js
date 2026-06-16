export function createNativeStorage({ storage } = {}) {
  if (!storage) {
    throw new Error('Native storage adapter required');
  }

  return {
    async get(key) {
      const raw = await storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    },
    async set(key, value) {
      await storage.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      await storage.removeItem(key);
    },
    async clear() {
      await storage.clear();
    }
  };
}


export function createWebStorage({ storage = window?.localStorage } = {}) {
  if (!storage) {
    throw new Error('Web storage not available');
  }

  return {
    async get(key) {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    },
    async set(key, value) {
      storage.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      storage.removeItem(key);
    },
    async clear() {
      storage.clear();
    }
  };
}


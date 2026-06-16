export function createTtlCache({ defaultTtlMs = 60000 } = {}) {
  const store = new Map();

  function set(key, value, ttlMs = defaultTtlMs) {
    const expiresAt = Date.now() + ttlMs;
    store.set(key, { value, expiresAt });
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  function remove(key) {
    store.delete(key);
  }

  function clear() {
    store.clear();
  }

  return { set, get, remove, clear };
}

export function memoize(fn, { ttlMs = 0, cache = createTtlCache({ defaultTtlMs: ttlMs || 0 }) } = {}) {
  return (...args) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== null) return cached;
    const value = fn(...args);
    cache.set(key, value, ttlMs || undefined);
    return value;
  };
}


interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const inflight = new Map<string, Promise<unknown>>();

/**
 * Read through the cache, deduplicating concurrent misses. Holding the in-flight
 * promise (not just the resolved value) means two components asking for the same
 * thread at once make one request instead of two, which matters when a payload
 * can be 2 MB.
 *
 * A rejected fetch is dropped rather than cached, so a retry actually retries.
 */
export function cacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return Promise.resolve(hit);

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = fn()
    .then((value) => {
      cacheSet(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, pending);
  return pending;
}

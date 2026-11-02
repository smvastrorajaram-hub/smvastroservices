'use strict';

function createTtlSingleFlightCache({ ttlMs = 5000, maxEntries = 1000, now = Date.now } = {}) {
  const defaultTtl = Math.max(0, Number(ttlMs) || 0);
  const limit = Math.max(1, Math.floor(Number(maxEntries) || 1));
  const entries = new Map();
  const pending = new Map();
  const revisions = new Map();
  let epoch = 0;

  async function get(key, loader, options = {}) {
    const cacheKey = String(key ?? '').trim();
    if (!cacheKey) throw new TypeError('A non-empty cache key is required.');
    if (typeof loader !== 'function') throw new TypeError('A cache loader function is required.');

    const currentTime = Number(now());
    const cached = entries.get(cacheKey);
    if (cached && cached.expiresAt > currentTime) {
      // Refresh insertion order so the size bound behaves as an LRU cache.
      entries.delete(cacheKey);
      entries.set(cacheKey, cached);
      return cached.value;
    }
    if (cached) entries.delete(cacheKey);

    const active = pending.get(cacheKey);
    if (active) return active;

    const override = options.ttlMs;
    const ttl = override === undefined ? defaultTtl : Math.max(0, Number(override) || 0);
    const capturedEpoch = epoch;
    const capturedRevision = revisions.get(cacheKey) || 0;
    let promise;
    promise = Promise.resolve()
      .then(loader)
      .then(value => {
        if (ttl > 0 && capturedEpoch === epoch &&
            capturedRevision === (revisions.get(cacheKey) || 0)) {
          entries.set(cacheKey, { value, expiresAt: Number(now()) + ttl });
          while (entries.size > limit) entries.delete(entries.keys().next().value);
        }
        return value;
      })
      .finally(() => {
        if (pending.get(cacheKey) === promise) pending.delete(cacheKey);
      });
    pending.set(cacheKey, promise);
    return promise;
  }

  function invalidate(key) {
    const cacheKey = String(key ?? '').trim();
    if (!cacheKey) return false;
    const existed = entries.delete(cacheKey);
    revisions.set(cacheKey, (revisions.get(cacheKey) || 0) + 1);
    return existed;
  }

  function clear() {
    epoch += 1;
    entries.clear();
    revisions.clear();
  }

  return Object.freeze({
    get,
    invalidate,
    clear,
    get size() { return entries.size; }
  });
}

module.exports = { createTtlSingleFlightCache };

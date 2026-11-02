'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTtlSingleFlightCache } = require('../firestore-read-cache');

test('reuses cached values only for the same key until TTL expiry', async () => {
  let now = 100;
  let loads = 0;
  const cache = createTtlSingleFlightCache({ ttlMs: 5000, now: () => now });
  const load = async () => ++loads;

  assert.equal(await cache.get('uid-a', load), 1);
  assert.equal(await cache.get('uid-a', load), 1);
  assert.equal(await cache.get('uid-b', load), 2);
  now += 5000;
  assert.equal(await cache.get('uid-a', load), 3);
  assert.equal(loads, 3);
});

test('coalesces simultaneous reads for the same identity', async () => {
  let loads = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const cache = createTtlSingleFlightCache({ ttlMs: 5000 });
  const first = cache.get('uid-a', async () => {
    loads += 1;
    await gate;
    return 'customer';
  });
  const second = cache.get('uid-a', async () => {
    loads += 1;
    return 'wrong-result';
  });

  release();
  assert.deepEqual(await Promise.all([first, second]), ['customer', 'customer']);
  assert.equal(loads, 1);
});

test('does not cache rejected reads, so a transient failure can be retried', async () => {
  let loads = 0;
  const cache = createTtlSingleFlightCache({ ttlMs: 5000 });
  await assert.rejects(cache.get('uid-a', async () => {
    loads += 1;
    throw new Error('temporary Firestore failure');
  }), /temporary Firestore failure/);
  assert.equal(await cache.get('uid-a', async () => {
    loads += 1;
    return 'customer';
  }), 'customer');
  assert.equal(loads, 2);
});

test('invalidation prevents an in-flight stale result from repopulating the cache', async () => {
  const cache = createTtlSingleFlightCache({ ttlMs: 5000 });
  let release;
  let loads = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const stale = cache.get('uid-a', async () => {
    loads += 1;
    await gate;
    return 'stale-admin';
  });
  cache.invalidate('uid-a');
  release();
  assert.equal(await stale, 'stale-admin');
  assert.equal(await cache.get('uid-a', async () => {
    loads += 1;
    return 'revoked';
  }), 'revoked');
  assert.equal(loads, 2);
});

test('enforces the configured LRU entry bound', async () => {
  const cache = createTtlSingleFlightCache({ ttlMs: 5000, maxEntries: 2 });
  let loads = 0;
  const load = async () => ++loads;
  await cache.get('a', load);
  await cache.get('b', load);
  await cache.get('a', load); // make a most recently used
  await cache.get('c', load); // evicts b
  assert.equal(cache.size, 2);
  assert.equal(await cache.get('b', load), 4);
  assert.equal(cache.size, 2);
});

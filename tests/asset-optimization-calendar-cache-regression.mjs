/* Service-worker runtime regression: Calendar must not pre-cache all GeoNames place shards on install. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/horoscope/calendar/sw.js', import.meta.url), 'utf8');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const cacheMatch = source.match(/^const CACHE='([^']+)'/m);
assert.ok(cacheMatch, 'Calendar cache name is declared');
const currentCache = cacheMatch[1];
ok(currentCache !== 'smv-calendar-source-clean-20261016',
   'Fresh install policy rotates away from the previous bulk-shard cache');
ok(!source.includes('PLACE_SHARDS') && !source.includes('...PLACE_SHARDS.map'),
   'Install CORE does not generate requests for every India shard');
ok(source.includes("'../offline/places/place-search.mjs'") &&
   source.includes("'../offline/places/india-manifest.json'"),
   'Place-search code and shard manifest remain in the install core');
ok(source.includes('await c.put(e.request,fixed(u.href,r))'),
   'The runtime network-miss path still caches a shard on demand');

const listeners = Object.create(null);
const fetches = [];
const deleted = [];
const stored = new Map();
class FakeRequest {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || input.method || 'GET';
    this.mode = init.mode || input.mode || 'cors';
    this.cache = init.cache || 'default';
  }
}
const cache = {
  async put(key, response) { stored.set(typeof key === 'string' ? key : key.url, response); },
  async match(key) { return stored.get(typeof key === 'string' ? key : key.url) || null; }
};
const caches = {
  async open() { return cache; },
  async keys() { return [currentCache, 'smv-calendar-source-clean-20261016']; },
  async delete(name) { deleted.push(name); return true; },
  async match() { return null; }
};
const self = {
  location: { origin: 'https://example.test', href: 'https://example.test/horoscope/calendar/sw.js' },
  registration: { scope: 'https://example.test/horoscope/calendar/' },
  addEventListener(type, callback) { listeners[type] = callback; },
  async skipWaiting() {},
  clients: { async claim() {}, async matchAll() { return []; } }
};
const fetch = async request => {
  const url = typeof request === 'string' ? request : request.url;
  fetches.push(url);
  return new Response('fixture', { status: 200, headers: {'Content-Type':'application/json'} });
};
vm.runInNewContext(source, {
  self, caches, fetch, Request: FakeRequest, URL, Response, Headers, Promise, Map,
  Number, String, RegExp, Object, Array, Error
}, { timeout: 5000 });

let installPromise;
listeners.install({ waitUntil(p) { installPromise = p; } });
await installPromise;
ok(fetches.length > 0 && fetches.some(url => url.includes('india-manifest.json')),
   'Install still stores offline search metadata');
ok(!fetches.some(url => /offline\/places\/india\/(?:[a-z]+(?:-\d+)?|other)\.json(?:\?|$)/i.test(url)),
   'Install downloads zero full GeoNames place shards');
ok(![...stored.keys()].some(url => /offline\/places\/india\/(?:[a-z]+(?:-\d+)?|other)\.json(?:\?|$)/i.test(url)),
   'A fresh cache contains no complete place shard');

let activatePromise;
listeners.activate({ waitUntil(p) { activatePromise = p; } });
await activatePromise;
ok(deleted.includes('smv-calendar-source-clean-20261016'),
   'Activation evicts the old cache that bulk-preloaded all place shards');

const shardUrl = 'https://example.test/horoscope/offline/places/india/k-00.json';
let responsePromise;
listeners.fetch({
  request: new FakeRequest(shardUrl, {method:'GET',mode:'cors'}),
  respondWith(p) { responsePromise = p; },
  waitUntil() {}
});
const response = await responsePromise;
ok(response.status === 200 && stored.has(shardUrl),
   'First online search caches the requested split part for later offline reuse');
console.log(JSON.stringify({pass:true,assertions:checks,installFetches:fetches.length,
  preloadedPlaceShards:0,onDemandShardCached:stored.has(shardUrl)}));

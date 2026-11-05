'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('main site does not clear origin-wide local/session storage or all Cache API entries', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /caches\.keys\(\)\.then\(keys=>Promise\.all\(keys\.map\(k=>caches\.delete\(k\)\)\)\)/);
  assert.match(html, /smv-v223-scoped-storage-policy/);
});

test('main Service Worker does not force-reload open tabs and preserves offline place cache', () => {
  const sw = read('public/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_PLACE_CACHE='smv-astro-offline-places'/);
  assert.match(sw, /k!==OFFLINE_PLACE_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});

test('Horoscope Service Worker does not force-reload open report/form tabs and preserves offline cache', () => {
  const sw = read('public/horoscope/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_CACHE='smv-horoscope-offline'/);
  assert.match(sw, /k!==OFFLINE_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});


test('main SMV ASTRO caches only the offline UI shell while leaving online-only routes and Horoscope scope isolated', () => {
  const sw = read('public/sw.js');
  assert.ok(sw.includes("APP_SHELL_CACHE='smv-astro-shell-v1'"));
  assert.ok(sw.includes('APP_SHELL_FILES'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
  assert.ok(sw.includes("if(p==='/horoscope'||p.startsWith('/horoscope/'))return false"));
  assert.ok(sw.includes('k!==OFFLINE_PLACE_CACHE&&k!==APP_SHELL_CACHE'));
  assert.ok(sw.includes("if(isOfflinePlaceAsset(url))"));
  assert.ok(sw.includes("if(req.mode==='navigate')"));
});

test('Horoscope precaches its UI and required local calculation/WASM assets without caching online services', () => {
  const sw = read('public/horoscope/sw.js');
  assert.ok(sw.includes("SHELL_CACHE='smv-horoscope-shell-v1'"));
  assert.ok(sw.includes("OFFLINE_CACHE='smv-horoscope-offline'"));
  for (const asset of [
    './index.html','./boot.mjs','./offline/offline-engine.mjs',
    './offline/server-wrapper.browser.mjs','./offline/swiss_vedic.browser.mjs',
    './offline/wasm-provider.mjs','./offline/vendor/smv-swisseph-local.mjs',
    './offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data'
  ]) assert.ok(sw.includes(asset), 'Missing offline core asset: '+asset);
  assert.ok(sw.includes('const retained=new Set([OFFLINE_CACHE,SHELL_CACHE])'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
});

test('Calendar keeps its offline UI/WASM precache and India shard migration while bypassing online-only API routes', () => {
  const sw = read('public/horoscope/calendar/sw.js');
  assert.ok(sw.includes("const CACHE='smv-calendar-forecast-assets-v8'"));
  assert.ok(sw.includes('const REQUIRED_CORE = new Set(['));
  assert.ok(sw.includes('await preserveCachedIndiaPlaces(target)'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(e.request,u))return;'));
});

test('Horoscope place search retains online GeoNames lookup and offline India fallback', () => {
  const location = read('public/horoscope/location-search-online-offline.js');
  assert.ok(location.includes("if(navigator.onLine!==false)"));
  assert.ok(location.includes("'/api/locations/search'"));
  assert.ok(location.includes('const module=await offline()'));
  assert.ok(location.includes("'/api/locations/timezone'"));
});

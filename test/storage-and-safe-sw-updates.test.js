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
  assert.match(sw, /SMV_LOCATION_CACHE='smv-shared-india-places'/);
  assert.match(sw, /k!==SMV_LOCATION_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});

test('Horoscope Service Worker does not force-reload open report/form tabs and preserves offline cache', () => {
  const sw = read('public/horoscope/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_CACHE='smv-horoscope-offline'/);
  assert.match(sw, /const retained=new Set\(\[OFFLINE_CACHE,SHELL_CACHE\]\)/);
  assert.match(sw, /name\.startsWith\('smv-horoscope-'\)&&!retained\.has\(name\)/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});


test('main SMV ASTRO caches only the offline UI shell while leaving online-only routes and Horoscope scope isolated', () => {
  const sw = read('public/sw.js');
  assert.ok(sw.includes("APP_SHELL_CACHE='smv-astro-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE='20261107-horoscope-single-paid-entry-theme-v1'"));
  assert.ok(sw.includes('APP_SHELL_FILES'));
  for (const icon of ['./assets/icon-192.png','./assets/icon-512.png','./assets/favicon-astro.ico']) {
    assert.ok(sw.includes(icon), 'SMV ASTRO must precache its manifest icon/favicon: '+icon);
  }
  assert.ok(sw.includes("'./main-location-search.js'"));
  assert.ok(sw.includes("'./horoscope/offline/places/india-manifest.json'"));
  assert.ok(sw.includes("SMV_LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  assert.ok(sw.includes('isOfflinePlaceAsset(new URL(request.url))?await caches.open(SMV_LOCATION_CACHE):cache'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
  assert.ok(sw.includes("if(p==='/horoscope'||p.startsWith('/horoscope/'))return false"));
  assert.ok(sw.includes('k!==SMV_LOCATION_CACHE&&k!==APP_SHELL_CACHE'));
  assert.ok(sw.includes("if(isOfflinePlaceAsset(url))"));
  assert.ok(sw.includes("if(req.mode==='navigate')"));
});

test('Horoscope precaches its UI and required local calculation/WASM assets without caching online services', () => {
  const sw = read('public/horoscope/sw.js');
  assert.ok(sw.includes("SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE='20261107-horoscope-single-paid-entry-theme-v1'"));
  assert.ok(sw.includes("OFFLINE_CACHE='smv-horoscope-offline'"));
  assert.ok(sw.includes("LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  for (const asset of [
    './assets/icon-192.png','./assets/icon-512.png','./assets/icon-512-maskable.png',
    './assets/favicon-horoscope-16.png','./assets/favicon-horoscope-32.png','./assets/favicon-horoscope-64.png','./assets/favicon-horoscope.ico',
    './index.html','./boot.mjs','./horoscope.js','./marriage-matching.js',
    './marriage-basic-report.mjs','./matching-timeline.mjs','./d1-15-year-reading.mjs',
    './offline/offline-engine.mjs','./offline/server-wrapper.browser.mjs',
    './offline/swiss_vedic.browser.mjs','./offline/wasm-provider.mjs',
    './offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs',
    './offline/dasa_engine.browser.mjs','./offline/pvr-longevity-sodhya-timing.browser.mjs',
    './offline/cg-rajan-ayurdaya-pinda.browser.mjs',
    './offline/bv-raman-ayurdaya-report.browser.mjs',
    './offline/vendor/smv-swisseph-local.mjs',
    './offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data',
    './offline/places/timezone.mjs','./offline/places/tz-boundary-lookup.mjs'
  ]) assert.ok(sw.includes(asset), 'Missing offline core asset: '+asset);
  assert.ok(sw.includes('const retained=new Set([OFFLINE_CACHE,SHELL_CACHE])'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
});

test('Calendar keeps its offline UI/WASM precache and India shard migration while bypassing online-only API routes', () => {
  const sw = read('public/horoscope/calendar/sw.js');
  assert.ok(sw.includes("const CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE='20261107-horoscope-single-paid-entry-theme-v1'"));
  assert.ok(sw.includes('const REQUIRED_CORE = new Set(['));
  assert.ok(sw.includes('await preserveCachedIndiaPlaces(target)'));
  assert.ok(sw.includes("LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  for (const asset of [
    '../assets/calendar-192.png','../assets/calendar-512.png','../assets/calendar-maskable.png',
    '../assets/favicon-calendar-16.png','../assets/favicon-calendar-32.png','../assets/favicon-calendar-64.png','../assets/favicon-calendar.ico'
  ]) assert.ok(sw.includes(asset), 'SMV CALENDAR must require and precache its manifest icon/favicon: '+asset);
  assert.ok(sw.includes("'../offline/places/timezone.mjs'"));
  assert.ok(sw.includes("'../offline/places/tz-boundary-lookup.mjs'"));
  assert.ok(sw.includes("'../offline/places/place-display.mjs'"));
  assert.ok(sw.includes("'../location-search-online-offline.js'"));
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


test('All three app workers share the same release bump while preserving independent cache namespaces', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  const releases = workers.map(source => {
    const match = /const SMV_CACHE_RELEASE='([^']+)'/.exec(source);
    assert.ok(match, 'Every app worker must declare SMV_CACHE_RELEASE');
    return match[1];
  });
  assert.deepEqual(releases, ['20261107-horoscope-single-paid-entry-theme-v1','20261107-horoscope-single-paid-entry-theme-v1','20261107-horoscope-single-paid-entry-theme-v1']);
  assert.ok(workers[0].includes("APP_SHELL_CACHE='smv-astro-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[1].includes("SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[2].includes("CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[0].includes("SMV_LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(workers[1].includes("OFFLINE_CACHE='smv-horoscope-offline'"));
});


test('SMV ASTRO checks the root Service Worker update on every app entry', () => {
  const html = read('public/index.html');
  assert.match(html, /navigator\.serviceWorker\.register\('\.\/sw\.js',\{scope:'\.\/',updateViaCache:'none'\}\)\.then\(function\(reg\)/);
  assert.match(html, /reg\.update\(\)\.catch\(function\(\)\{\}\)/);
});

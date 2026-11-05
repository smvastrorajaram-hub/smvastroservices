// Browser-level offline smoke for the three production app scopes.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const origin = process.env.SMV_OFFLINE_PREVIEW_ORIGIN || 'http://127.0.0.1:4173';
const release = '20261106-product-pwa-header-v2';
const apps = [
  {
    name: 'SMV ASTRO',
    url: origin + '/',
    cacheName: 'smv-astro-shell-' + release,
    placeCacheName: 'smv-shared-india-places',
    requiredAssets: ['/smvastro.mjs','/assets/icon-192.png','/assets/icon-512.png','/assets/smv-home-logo.webp','/assets/favicon-astro.ico'],
    probeAsset: '/smvastro.mjs',
    locationMode: 'question'
  },
  {
    name: 'SMV HOROSCOPE',
    url: origin + '/horoscope/',
    cacheName: 'smv-horoscope-shell-' + release,
    placeCacheName: 'smv-shared-india-places',
    offlineCacheName: 'smv-horoscope-offline',
    requiredAssets: ['/horoscope/marriage-matching.js','/horoscope/assets/icon-192.png','/horoscope/assets/icon-512.png','/horoscope/assets/icon-512-maskable.png','/horoscope/assets/smv-horoscope-website.webp','/horoscope/assets/favicon-horoscope.ico'],
    offlineAssets: [
      '/horoscope/offline/offline-engine.mjs',
      '/horoscope/offline/vendor/wasm/swisseph.wasm',
    ],
    probeAsset: '/horoscope/offline/offline-engine.mjs',
    locationMode: 'shared'
  },
  {
    name: 'SMV CALENDAR',
    url: origin + '/horoscope/calendar/',
    cacheName: 'smv-calendar-forecast-assets-' + release,
    placeCacheName: 'smv-shared-india-places',
    requiredAssets: [
      '/horoscope/calendar-rasi-palan.mjs',
      '/horoscope/offline/vendor/wasm/swisseph.wasm',
      '/horoscope/assets/calendar-192.png',
      '/horoscope/assets/calendar-512.png',
      '/horoscope/assets/calendar-maskable.png',
      '/horoscope/assets/smv-calendar-website.webp',
      '/horoscope/assets/favicon-calendar.ico'
    ],
    probeAsset: '/horoscope/calendar-rasi-palan.mjs',
    locationMode: 'shared'
  }
];

const launchBrowser = async () => puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true,
  // Reuse one persistent origin profile across the three scoped app workers.
  // This models the Pages origin where all three apps can share the verified
  // India place pack instead of downloading the same 60 MB dataset three times.
  userDataDir: process.env.SMV_OFFLINE_BROWSER_PROFILE || '/tmp/smv-offline-shared-browser-profile',
  // Long install waits are polled by Node; each Runtime.evaluate is short.
  protocolTimeout: 120000
});

const results = [];
const sharedOrigin = new URL(apps[0].url).origin;
assert.ok(apps.every(app => new URL(app.url).origin === sharedOrigin),
  'All three apps must use one exact browser origin for the shared offline place cache.');
assert.ok(apps.every(app => app.placeCacheName === 'smv-shared-india-places'),
  'All three app scopes must use the same India location Cache Storage name.');
process.stdout.write('INFO: All three app paths share one origin and the smv-shared-india-places cache: ' + sharedOrigin + '\\n');

const browser = await launchBrowser();
try {
for (const app of apps) {
  process.stdout.write('START: ' + app.name + ' online cache install\\n');
  const page = await browser.newPage();
  try {
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(120000);

    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // Do not hold a single CDP Runtime.callFunctionOn open while the worker
    // downloads/verifies the 557,995-record India place pack. Poll short snapshots.
    const expectedScope = new URL('./', app.url).href;
    const expectedScriptURL = new URL('sw.js', expectedScope).href;
    const activationDeadline = Date.now() + 12 * 60 * 1000;
    let activationState = null;
    let lastActivationLog = 0;
    while (Date.now() < activationDeadline) {
      try {
        activationState = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker?.getRegistration();
          const controller = navigator.serviceWorker?.controller;
          return {
            scope: registration?.scope || '',
            scriptURL: registration?.active?.scriptURL || '',
            activeState: registration?.active?.state || '',
            installingState: registration?.installing?.state || '',
            waitingState: registration?.waiting?.state || '',
            controllerState: controller?.state || '',
            controllerScriptURL: controller?.scriptURL || ''
          };
        });
      } catch (error) {
        // The Calendar app intentionally reloads once when its own Service Worker
        // claims the first-load page. That navigation can destroy a short CDP
        // evaluation; retry the snapshot after the navigation instead of failing
        // the offline smoke because of the expected controllerchange reload.
        const message = String(error?.message || error);
        if (!/Execution context was destroyed|Cannot find context with specified id/i.test(message)) throw error;
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      // A broader-scope worker (for example, SMV ASTRO's root worker) can
      // control this page while the app-specific worker is still installing.
      // Do not inspect that app's cache until its exact scoped worker claims it.
      if (activationState.scope === expectedScope &&
          activationState.scriptURL === expectedScriptURL &&
          activationState.activeState === 'activated' &&
          activationState.controllerState === 'activated' &&
          activationState.controllerScriptURL === expectedScriptURL) break;
      if (Date.now() - lastActivationLog >= 20000) {
        process.stdout.write('WAIT: ' + app.name + ' expected worker ' + expectedScriptURL +
          ' install state ' + JSON.stringify(activationState) + '\\n');
        lastActivationLog = Date.now();
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal(activationState?.scope, expectedScope,
      app.name + ' must register its own Service Worker scope: ' + JSON.stringify(activationState));
    assert.equal(activationState?.scriptURL, expectedScriptURL,
      app.name + ' must activate its own Service Worker script: ' + JSON.stringify(activationState));
    assert.equal(activationState?.activeState, 'activated',
      app.name + ' own Service Worker must be activated: ' + JSON.stringify(activationState));
    assert.equal(activationState?.controllerScriptURL, expectedScriptURL,
      app.name + ' page must be controlled by its own scoped Service Worker, not a broader app worker: ' + JSON.stringify(activationState));
    const registration = {
      scope: activationState.scope,
      scriptURL: activationState.scriptURL
    };

    const cacheState = await page.evaluate(async (cacheName, requiredAssets, placeCacheName, offlineCacheName, offlineAssets) => {
      const names = await caches.keys();
      const exists = names.includes(cacheName);
      const cache = exists ? await caches.open(cacheName) : null;
      const found = [];
      if (cache) {
        for (const path of requiredAssets) {
          const response = await cache.match(new URL(path, location.origin).href);
          found.push({ path, ok: Boolean(response?.ok), status: response?.status || 0 });
        }
      }
      const cachedUrls = [];
      for (const name of names) {
        const c = await caches.open(name);
        for (const request of await c.keys()) cachedUrls.push(new URL(request.url).pathname);
      }
      const onlineOnlyRoots = new Set(['api','auth','wallet','payment','payments','razorpay','session','sessions','booking','bookings','consultation','consultations','account','profile','firebase','firestore','functions']);
      const onlineOnlyCached = cachedUrls.filter(path => onlineOnlyRoots.has(path.split('/')[1] || ''));
      let offlineFound = [];
      if (offlineCacheName) {
        const offline = await caches.open(offlineCacheName);
        for (const path of offlineAssets || []) {
          const response = await offline.match(new URL(path, location.origin).href);
          offlineFound.push({ path, ok: Boolean(response?.ok), status: response?.status || 0 });
        }
      }
      let placeManifest = null, placeShards = null;
      if (placeCacheName) {
        const places = await caches.open(placeCacheName);
        const manifestUrl = new URL('/horoscope/offline/places/india-manifest.json', location.origin).href;
        const response = await places.match(manifestUrl);
        placeManifest = { ok: Boolean(response?.ok), status: response?.status || 0 };
        if (response?.ok) {
          const manifest = await response.clone().json();
          const entries = Object.values(manifest.shards || {});
          const missing = [];
          for (const metadata of entries) {
            const url = new URL('india/' + metadata.file, new URL('/horoscope/offline/places/', location.origin));
            url.searchParams.set('v', String(manifest.version || 1));
            if (!(await places.match(url.href))?.ok) missing.push(metadata.file);
          }
          placeShards = { expected: entries.length, found: entries.length - missing.length, missing, records: manifest.records };
        }
      }
      return { exists, found, offlineFound, onlineOnlyCached, placeManifest, placeShards, cacheNames: names };
    }, app.cacheName, app.requiredAssets, app.placeCacheName || null, app.offlineCacheName || null, app.offlineAssets || []);
    assert.ok(cacheState.exists, app.name + ' release cache must exist: ' + app.cacheName);
    for (const asset of cacheState.found) {
      assert.equal(asset.ok, true, app.name + ' required UI asset must be cached: ' + asset.path + ' (HTTP ' + asset.status + ')');
    }
    for (const asset of cacheState.offlineFound) {
      assert.equal(asset.ok, true, app.name + ' required calculation asset must be cached in its separate offline cache: ' + asset.path + ' (HTTP ' + asset.status + ')');
    }
    assert.deepEqual(cacheState.onlineOnlyCached, [], app.name + ' must not cache online account or financial API routes.');
    if (app.placeCacheName) {
      assert.equal(cacheState.placeManifest?.ok, true, app.name + ' India place manifest must exist in the shared offline cache.');
      assert.equal(cacheState.placeShards?.expected, 28, app.name + ' must cache all 28 India place shards.');
      assert.equal(cacheState.placeShards?.found, 28, app.name + ' must find all versioned place shards: ' + (cacheState.placeShards?.missing || []).join(', '));
      assert.equal(cacheState.placeShards?.records, 557995, app.name + ' must contain exactly 557,995 India place records.');
    }
    process.stdout.write('PASS: ' + app.name + ' release cache and ' + cacheState.found.length + ' core asset checks\\n');

    await page.evaluate(async () => {
      localStorage.setItem('smv-offline-preserve-local', 'keep-local');
      sessionStorage.setItem('smv-offline-preserve-session', 'keep-session');
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('smv-offline-preservation-test', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('state');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('state', 'readwrite');
          tx.objectStore('state').put('keep-indexeddb', 'sentinel');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    process.stdout.write('INFO: ' + app.name + ' switching Chromium to offline mode\\n');
    await page.setOfflineMode(true);
    const offlineResponse = await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.ok(offlineResponse && offlineResponse.status() === 200, app.name + ' navigation must reload from the Service Worker cache while offline.');
    const offlineState = await page.evaluate(async (probeAsset, locationMode) => {
      let indexed = '';
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('smv-offline-preservation-test', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('state', 'readonly');
          const get = tx.objectStore('state').get('sentinel');
          get.onsuccess = () => { indexed = get.result || ''; };
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
      const response = await fetch(probeAsset, { cache: 'no-store' });
      let offlineLocations = [];
      if (locationMode === 'question') {
        const module = await import('/question-place-search.mjs');
        const wrapper = document.createElement('div');
        const input = document.createElement('input');
        wrapper.appendChild(input);
        document.body.appendChild(wrapper);
        module.bindQuestionPlaceSearch(input);
        input.value = 'Chennai';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 900));
        offlineLocations = [...wrapper.querySelectorAll('[role="option"]')].map(option => option.textContent || '');
      } else {
        if (typeof window.__smvSearchPlacesOnlineOffline !== 'function') {
          throw new Error('Shared GeoNames/India offline location loader was not cached in ' + locationMode + '.');
        }
        const places = await window.__smvSearchPlacesOnlineOffline('Chennai', 5);
        offlineLocations = places.map(place => place.place || '');
      }
      return {
        online: navigator.onLine,
        title: document.title,
        bodyTextLength: document.body?.innerText?.length || 0,
        local: localStorage.getItem('smv-offline-preserve-local'),
        session: sessionStorage.getItem('smv-offline-preserve-session'),
        indexed,
        probe: { ok: response.ok, status: response.status },
        offlineLocations
      };
    }, app.probeAsset, app.locationMode);
    assert.equal(offlineState.online, false, app.name + ' must be tested with the browser genuinely offline.');
    assert.ok(offlineState.title && offlineState.bodyTextLength > 0, app.name + ' static UI must remain visible offline.');
    assert.equal(offlineState.local, 'keep-local', app.name + ' localStorage must be preserved.');
    assert.equal(offlineState.session, 'keep-session', app.name + ' sessionStorage must be preserved.');
    assert.equal(offlineState.indexed, 'keep-indexeddb', app.name + ' IndexedDB data must be preserved.');
    assert.equal(offlineState.probe.ok, true, app.name + ' local calculation/UI asset must load offline: ' + app.probeAsset);
    assert.ok(offlineState.offlineLocations.some(place => /chennai/i.test(place)), app.name + ' must return a real Chennai India location result with the browser offline.');

    results.push({
      app: app.name,
      scope: registration.scope,
      cache: app.cacheName,
      cachedAssets: cacheState.found.length,
      offlineNavigation: 'PASS',
      offlineAsset: app.probeAsset,
      browserStorage: 'PRESERVED'
    });
    process.stdout.write('PASS: ' + app.name + ' offline navigation, asset fetch and storage preservation\\n');
  } catch (error) {
    process.stderr.write('FAIL: ' + app.name + ' offline browser diagnostic: ' + (error?.stack || String(error)) + '\\n');
    throw error;
  } finally {
    try { await page.setOfflineMode(false); } catch (_) {}
    try { await page.close(); } catch (_) {}
  }
}
} finally {
  try { await browser.close(); } catch (_) {}
}

for (const result of results) process.stdout.write(JSON.stringify(result) + '\\n');
process.stdout.write('PASS: All three app scopes loaded their cached UI and core assets offline without clearing browser storage.\\n');

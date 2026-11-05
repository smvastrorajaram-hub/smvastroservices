// Browser-level offline smoke for the three production app scopes.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const origin = process.env.SMV_OFFLINE_PREVIEW_ORIGIN || 'http://127.0.0.1:4173';
const release = '20261105-offline-ui-v2';
const apps = [
  {
    name: 'SMV ASTRO',
    url: origin + '/',
    cacheName: 'smv-astro-shell-' + release,
    requiredAssets: ['/smvastro.mjs', '/horoscope/offline/places/india-manifest.json'],
    probeAsset: '/smvastro.mjs'
  },
  {
    name: 'SMV HOROSCOPE',
    url: origin + '/horoscope/',
    cacheName: 'smv-horoscope-shell-' + release,
    requiredAssets: [
      '/horoscope/offline/offline-engine.mjs',
      '/horoscope/marriage-matching.js',
      '/horoscope/offline/vendor/wasm/swisseph.wasm',
      '/horoscope/offline/places/india-manifest.json'
    ],
    probeAsset: '/horoscope/offline/offline-engine.mjs'
  },
  {
    name: 'SMV CALENDAR',
    url: origin + '/horoscope/calendar/',
    cacheName: 'smv-calendar-forecast-assets-' + release,
    requiredAssets: [
      '/horoscope/calendar-rasi-palan.mjs',
      '/horoscope/offline/vendor/wasm/swisseph.wasm',
      '/horoscope/offline/places/india-manifest.json'
    ],
    probeAsset: '/horoscope/calendar-rasi-palan.mjs'
  }
];

const launchBrowser = async () => puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true
});

const results = [];
for (const app of apps) {
  process.stdout.write('START: ' + app.name + ' online cache install\\n');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(120000);

    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return {
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL || '',
        state: reg.active?.state || ''
      };
    });
    assert.equal(registration.state, 'activated', app.name + ' Service Worker must activate after first online load.');
    assert.ok(registration.scriptURL.endsWith('/sw.js'), app.name + ' must run its own scoped Service Worker: ' + registration.scriptURL);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 30000 });

    const cacheState = await page.evaluate(async (cacheName, requiredAssets) => {
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
      return { exists, found, onlineOnlyCached, cacheNames: names };
    }, app.cacheName, app.requiredAssets);
    assert.ok(cacheState.exists, app.name + ' release cache must exist: ' + app.cacheName);
    for (const asset of cacheState.found) {
      assert.equal(asset.ok, true, app.name + ' required offline asset must be cached: ' + asset.path + ' (HTTP ' + asset.status + ')');
    }
    assert.deepEqual(cacheState.onlineOnlyCached, [], app.name + ' must not cache online account or financial API routes.');
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
    const offlineState = await page.evaluate(async probeAsset => {
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
      return {
        online: navigator.onLine,
        title: document.title,
        bodyTextLength: document.body?.innerText?.length || 0,
        local: localStorage.getItem('smv-offline-preserve-local'),
        session: sessionStorage.getItem('smv-offline-preserve-session'),
        indexed,
        probe: { ok: response.ok, status: response.status }
      };
    }, app.probeAsset);
    assert.equal(offlineState.online, false, app.name + ' must be tested with the browser genuinely offline.');
    assert.ok(offlineState.title && offlineState.bodyTextLength > 0, app.name + ' static UI must remain visible offline.');
    assert.equal(offlineState.local, 'keep-local', app.name + ' localStorage must be preserved.');
    assert.equal(offlineState.session, 'keep-session', app.name + ' sessionStorage must be preserved.');
    assert.equal(offlineState.indexed, 'keep-indexeddb', app.name + ' IndexedDB data must be preserved.');
    assert.equal(offlineState.probe.ok, true, app.name + ' local calculation/UI asset must load offline: ' + app.probeAsset);

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
    try {
      await browser.close();
    } catch (closeError) {
      process.stderr.write('WARN: ' + app.name + ' Chromium shutdown: ' + String(closeError?.message || closeError) + '\\n');
    }
  }
}

for (const result of results) process.stdout.write(JSON.stringify(result) + '\\n');
process.stdout.write('PASS: All three app scopes loaded their cached UI and core assets offline without clearing browser storage.\\n');

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const json = (name) => JSON.parse(read(name));

const APPS = [
  {
    name: 'SMV ASTRO',
    key: 'astro',
    directory: 'desktop/pages-astro-windows',
    url: 'https://smvastroservices.pages.dev/',
    scope: '/',
    manifest: 'public/manifest.webmanifest',
    worker: 'public/sw.js',
    icon: 'smv-astro.ico',
    partition: 'persist:smv-astro-pages-windows',
    cacheMarker: 'smv-astro-shell-'
  },
  {
    name: 'SMV HOROSCOPE',
    key: 'horoscope',
    directory: 'desktop/pages-horoscope-windows',
    url: 'https://smvastroservices.pages.dev/horoscope/',
    scope: '/horoscope/',
    manifest: 'public/horoscope/manifest-en.webmanifest',
    worker: 'public/horoscope/sw.js',
    icon: 'smv-horoscope.ico',
    partition: 'persist:smv-horoscope-pages-windows',
    cacheMarker: 'smv-horoscope-shell-'
  },
  {
    name: 'SMV CALENDAR',
    key: 'calendar',
    directory: 'desktop/pages-calendar-windows',
    url: 'https://smvastroservices.pages.dev/horoscope/calendar/',
    scope: '/horoscope/calendar/',
    manifest: 'public/horoscope/calendar/manifest-en.webmanifest',
    worker: 'public/horoscope/calendar/sw.js',
    icon: 'smv-calendar.ico',
    partition: 'persist:smv-calendar-pages-windows',
    cacheMarker: 'smv-calendar-forecast-assets-'
  }
];

test('Pages.dev apps have independent product IDs, partitions and installer names', () => {
  const ids = new Set();
  const partitions = new Set();
  for (const app of APPS) {
    const packageFile = path.join(app.directory, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, packageFile), 'utf8'));
    const main = read(path.join(app.directory, 'main.cjs'));
    assert.equal(pkg.productName, app.name);
    assert.ok(pkg.build.appId.startsWith('in.smvastroservices.pages.'));
    assert.equal(pkg.build.win.target[0].arch[0], 'x64');
    assert.ok(pkg.build.win.artifactName.includes('-Pages-Setup-'));
    assert.ok(!ids.has(pkg.build.appId), 'application IDs must be unique');
    ids.add(pkg.build.appId);
    assert.ok(main.includes(app.url), app.name + ' must open its own Pages.dev path');
    assert.ok(main.includes(app.partition), 'persistent browser storage must be app-specific');
    assert.ok(!partitions.has(app.partition), 'storage partitions must not be shared');
    partitions.add(app.partition);
  }
  assert.equal(ids.size, 3);
  assert.equal(partitions.size, 3);
});

test('all three apps explicitly use Windows desktop rendering and persistent offline storage', () => {
  for (const app of APPS) {
    const main = read(path.join(app.directory, 'main.cjs'));
    assert.match(main, /width:\s*1600/);
    assert.match(main, /height:\s*1000/);
    assert.match(main, /minWidth:\s*1100/);
    assert.match(main, /useContentSize:\s*true/);
    assert.match(main, /Windows NT 10\.0; Win64; x64/);
    assert.match(main, /process\.versions\.chrome/);
    assert.match(main, /setUserAgent\(DESKTOP_UA/);
    assert.match(main, /session\.fromPartition\(SESSION_PARTITION\)/);
    assert.match(main, /enableNetworkEmulation/);
    assert.match(main, /Work offline/);
  }
});

test('each Pages.dev PWA manifest has its own install name and scope', () => {
  for (const app of APPS) {
    const manifest = json(app.manifest);
    assert.equal(manifest.short_name, app.name);
    assert.equal(manifest.scope, app.scope);
    assert.ok(manifest.start_url.startsWith(app.scope));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.length >= 2);
  }
});

test('the Pages.dev source exposes Chrome install and registers each scoped service worker', () => {
  const root = read('public/index.html');
  const horoscopeHtml = read('public/horoscope/index.html');
  const calendarHtml = read('public/horoscope/calendar/index.html');
  const horoscope = read('public/horoscope/pwa.js');
  const calendar = read('public/horoscope/calendar/calendar-pwa.mjs');
  assert.match(root, /smvastroservices\.pages\.dev/);
  assert.match(root, /id="smvInstallAppSection"/);
  assert.match(root, /id="smvInstallAppBtn"/);
  assert.match(root, /src="\.\/assets\/pwa-astro-512\.png"/);
  assert.match(root, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(horoscopeHtml, /id="smvHoroscopeInstallArea"/);
  assert.match(horoscopeHtml, /id="installApp"/);
  assert.match(horoscopeHtml, /src="\.\/assets\/pwa-horoscope-512\.png"/);
  assert.match(horoscope, /smvastroservices\.pages\.dev/);
  assert.match(horoscope, /beforeinstallprompt/);
  assert.match(horoscope, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(calendarHtml, /id="smvCalendarInstallArea"/);
  assert.match(calendarHtml, /id="calInstall"/);
  assert.match(calendarHtml, /src="\.\.\/assets\/pwa-calendar-192\.svg"/);
  assert.match(calendar, /smvastroservices\.pages\.dev/);
  assert.match(calendar, /beforeinstallprompt/);
  assert.match(calendar, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
});

test('the three service workers provide isolated offline shells and shared India place shards', () => {
  for (const app of APPS) {
    const sw = read(app.worker);
    assert.ok(sw.includes('prefetchIndiaPlaceShards'), app.name + ' must prefetch the India offline location pack');
    assert.ok(sw.includes('smv-shared-india-places'), app.name + ' must use the shared location cache');
    assert.ok(sw.includes(app.cacheMarker), app.name + ' must maintain its own versioned app cache');
    assert.ok(sw.includes('ONLINE_ONLY_ROOTS'), app.name + ' must keep cloud actions online-only');
  }
  const placeManifest = json('public/horoscope/offline/places/india-manifest.json');
  assert.equal(placeManifest.records, 557995);
  assert.equal(Object.keys(placeManifest.shards).length, 28);
});

test('HOROSCOPE and CALENDAR workers include offline calculation engines and WASM assets', () => {
  const horoscope = read('public/horoscope/sw.js');
  const calendar = read('public/horoscope/calendar/sw.js');
  assert.match(horoscope, /offline\/offline-engine\.mjs/);
  assert.match(horoscope, /offline\/vendor\/wasm\/swisseph\.wasm/);
  assert.match(horoscope, /offline\/bv-raman-shadbala\.browser\.mjs/);
  assert.match(calendar, /daily-calendar\.mjs/);
  assert.match(calendar, /offline\/vendor\/wasm\/swisseph\.wasm/);
  assert.match(calendar, /calendar-rasi-palan\.mjs/);
  assert.match(calendar, /calendar-data\.mjs/);
  assert.match(calendar, /calendar-worker\.mjs/);
});

test('Pages.dev HOROSCOPE reuses the existing header CSS without requesting a missing layout file', () => {
  const html = read('public/horoscope/index.html');
  const css = read('public/horoscope/horoscope.css');
  const worker = read('public/horoscope/sw.js');
  const calendarHtml = read('public/horoscope/calendar/index.html');

  assert.doesNotMatch(html, /header-layout\.css/i);
  assert.match(html, /horoscope\.css\?v=20261111-pages-horoscope-header-css-v1/);
  assert.match(html, /class="smv-horoscope-brand-header"/);
  assert.match(html, /class="smv-horoscope-controls-row"/);
  assert.match(css, /\.smv-horoscope-brand-header\{/);
  assert.match(css, /\.smv-horoscope-controls-row/);
  assert.match(worker, /['"]\.\/horoscope\.css['"]/);
  assert.match(calendarHtml, /\.\.\/horoscope\.css\?v=20261111-pages-horoscope-header-css-v1/);
});

test('all three PWA cache releases are synchronized for Pages.dev and .in content updates', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  const releases = workers.map(worker => {
    const match = worker.match(/const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/);
    assert.ok(match, 'every app service worker must select a host-specific cache release');
    return { pages: match[1], legacy: match[2] };
  });
  assert.deepEqual(releases.map(item => item.pages), [
    '20261113-receipt-ui-astro-open-color-pages-v1',
    '20261113-receipt-ui-astro-open-color-pages-v1',
    '20261113-receipt-ui-astro-open-color-pages-v1'
  ]);
  assert.deepEqual(releases.map(item => item.legacy), [
    '20261113-receipt-ui-astro-open-color-in-v1',
    '20261113-receipt-ui-astro-open-color-in-v1',
    '20261113-receipt-ui-astro-open-color-in-v1'
  ]);
});
test('each installer creates its own 256x256 Windows icon', () => {
  for (const app of APPS) {
    const script = read(path.join(app.directory, 'scripts/prepare-icon.cjs'));
    assert.match(script, /SIZE\s*=\s*256|SIZE\s*=\s*256/);
    assert.ok(script.includes(app.icon), app.name + ' must generate its own named icon');
  }
});

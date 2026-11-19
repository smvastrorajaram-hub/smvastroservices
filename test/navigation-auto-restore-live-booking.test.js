'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('persisted Firebase sessions restore the role dashboard on a fresh website/PWA launch', () => {
  const frontend = read('public/smvastro.mjs');
  assert.match(frontend, /let smvColdStartHomeLock=false;/);
  assert.match(frontend, /if\(isInitialAuthState && smvColdStartHomeLock\)\{/);
  assert.match(frontend, /if\(window\.__SMV_PUBLIC_ROUTE && !isInitialAuthState\)/);
  assert.match(frontend, /if\(isInitialAuthState\)window\.__SMV_PUBLIC_ROUTE=null;/);
  assert.match(frontend, /loadDashboard\(headerRole==='astrologer'\?'astrologer':'customer'\)/);
});

test('Blog and Media load by default on Home and the Blog navigation button toggles them closed/open', () => {
  const frontend = read('public/smvastro.mjs');
  const navigation = read('public/public-navigation.js');
  const html = read('public/index.html');
  assert.match(frontend, /function showHomeSurface\(\)[\s\S]*?"smv-content-hub"\][\s\S]*?window\.__smvContentVisible=true/);
  assert.match(frontend, /function showHomeSurface\(\)[\s\S]*?__smvEnsurePublicContent/);
  assert.match(navigation, /control\.id==='contentNav'&&id==='publicBlogs'/);
  assert.match(navigation, /hub\.classList\.add\('hidden'\)/);
  assert.match(navigation, /control\.setAttribute\('aria-expanded','false'\)/);
  assert.match(navigation, /control\.setAttribute\('aria-expanded','true'\)/);
  assert.match(html, /aria-expanded="true" data-smv-route="publicBlogs" id="contentNav"/);
});

test('Register opens Customer and Astrologer registration and the same button closes the registration area', () => {
  const frontend = read('public/smvastro.mjs');
  assert.match(frontend, /const customerFlow=\$\(["']register-flow["']\),astrologerFlow=\$\(["']astro-register-form["']\)/);
  assert.match(frontend, /if\(registrationVisible\)\{smvReturnHome\(true\);return;\}/);
  assert.match(frontend, /openCustomerRegistration\(\);/);
});

test('Astrologer incoming Live and booking events restore Dashboard and focus the matching open request', () => {
  const frontend = read('public/smvastro.mjs');
  assert.match(frontend, /async function smvLiveEnsureAstrologerDashboard\(\)/);
  assert.match(frontend, /smvLiveEnsureAstrologerDashboard\(\)\.then\(opened=>\{/);
  assert.match(frontend, /smvLiveFocusDashboardSection\('smvLiveBookings'\)/);
  assert.match(frontend, /smvLiveFocusDashboardSection\('smvScheduledBookings'\)/);
  assert.match(frontend, /ev\.type==='live\.booking\.pending'\|\|ev\.type==='live\.booking\.updated'/);
  assert.match(frontend, /await smvLiveEnsureAstrologerDashboard\(\);[\s\S]*?Booking alert opened/);
});

test('Website, Horoscope and Calendar receive one synchronized cache release without origin-wide storage clearing', () => {
  const serviceWorkers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  for (const source of serviceWorkers) {
    assert.match(source, /20261119-calendar-transit-cell-sizing-v1/);
    assert.match(source, /20261119-calendar-transit-cell-sizing-v1/);
    assert.doesNotMatch(source, /localStorage\.clear\(|sessionStorage\.clear\(|indexedDB\.deleteDatabase\(/);
  }
  assert.match(serviceWorkers[1], /v284-pages-dev-tamil-solar-20261116/);
  assert.match(serviceWorkers[1], /v278-in-navigation-20261115/);
});

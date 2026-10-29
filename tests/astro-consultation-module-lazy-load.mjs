import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('SMV ASTRO home does not eagerly import the consultation/profile module', async () => {
  const html = await read('index.html');
  assert.equal(html.includes('src="./public-content.mjs'), false);
  assert.match(html, /public-content-loader\.js\?v=20261029-consult-module-lazy-v1/);
});

test('consultation loader lazy-imports once and recovers a direct consultation link', async () => {
  const loader = await read('public-content-loader.js');
  assert.match(loader, /import\(MODULE_URL\)/);
  assert.match(loader, /if\(pending\)return pending/);
  assert.match(loader, /smv:private-consultation-open/);
  assert.match(loader, /params\.get\('view'\)==='consult'/);
  assert.match(loader, /__smvEnsureConsultationModule/);
});

test('router makes the consultation section visible before dispatching its load event', async () => {
  const router = await read('public-navigation.js');
  const visible = router.indexOf("target.classList.remove('hidden');");
  const event = router.indexOf("window.dispatchEvent(new Event('smv:private-consultation-open'))");
  assert.ok(visible >= 0 && event > visible);
});

test('existing consultation module retains its directory, profile, booking and live flow hooks', async () => {
  const module = await read('public-content.mjs');
  for (const marker of [
    'function loadPrivateAstrologers()',
    'function openAstrologerCallBooking',
    'function smvCreateLiveRequest',
    "window.addEventListener('smv:private-consultation-open',openPrivateList)",
    "window.addEventListener('smv:astrologer-availability-changed'",
    "window.addEventListener('smv:astrologer-pricing-changed'"
  ]) assert.ok(module.includes(marker), 'missing existing behavior: '+marker);
});

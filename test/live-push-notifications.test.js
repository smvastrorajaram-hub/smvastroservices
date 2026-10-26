'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Astrologer push subscription endpoints require the Astrologer role', () => {
  const service = read('live-session-service.js');
  assert.match(service, /app\.post\('\/live\/push\/register'/);
  assert.match(service, /app\.post\('\/live\/push\/unregister'/);
  assert.match(service, /app\.post\('\/live\/push\/test'/);
  assert.match(service, /requireRole\(req, res, \['astrologer'\]\)/);
  assert.match(service, /String\(snap\.data\(\)\?\.uid \|\| ''\) !== String\(auth\.user\.uid\)/);
});

test('Live requests and Live bookings trigger best-effort server-side pushes', () => {
  const service = read('live-session-service.js');
  assert.match(service, /admin\.messaging\(\)\.send\(/);
  assert.match(service, /notifyAstrologerPush\(astroId, \{/);
  assert.match(service, /type: 'live_request'/);
  assert.match(service, /type: 'live_booking'/);
  assert.match(service, /messaging\/registration-token-not-registered/);
  assert.match(service, /session\.state === 'ringing' && String\(session\.astrologerUid \|\| ''\) === String\(uid\)/);
});

test('Scheduled Call and Chat bookings also trigger an Astrologer push', () => {
  const server = read('server.js');
  assert.match(server, /registerLiveSessionRoutes\(\{app,db,FieldValue,crypto,requireUser,isAdminUser,admin\}\)/);
  assert.match(server, /type: 'scheduled_booking'/);
  assert.match(server, /liveSessionService\.notifyAstrologerPush\(callBooking\.astrologerUid/);
});

test('Astrologer can register and test device-level Background Alerts', () => {
  const frontend = read('public/smvastro.mjs');
  assert.match(frontend, /Notification\.requestPermission\(\)/);
  assert.match(frontend, /getToken\(messaging,\s*\{\s*serviceWorkerRegistration\s*:\s*registration\s*\}\)/);
  assert.match(frontend, /id="smvLivePushEnable"/);
  assert.match(frontend, /id="smvLivePushTest"/);
  assert.match(frontend, /renderApi\('\/live\/push\/register'/);
});

test('service worker displays background pushes and focuses the app when clicked', () => {
  const worker = read('public/sw.js');
  assert.match(worker, /onBackgroundMessage/);
  assert.match(worker, /self\.registration\.showNotification/);
  assert.match(worker, /self\.addEventListener\('notificationclick'/);
  assert.match(worker, /smv-astro-staging/);
  assert.match(worker, /projectId: 'smv-astro'/);
});

test('Live Chat active modal dimensions are not overridden by generic dialog rules', () => {
  const css = read('public/smvastro.css');
  const html = read('public/index.html');
  assert.match(css, /\.modalbox:where\(:not\(\.smv-css-island,\.smv-css-island \*\)\):not\(#modal\.smv-live-session-modal \.modalbox\)\{width:calc\(-24px \+ 100vw\)!important/);
  assert.match(css, /\.modalbox:where\(:not\(\.smv-css-island,\.smv-css-island \*\)\):not\(#modal\.smv-live-session-modal \.modalbox\)\{width:calc\(-20px \+ 100vw\)!important/);
  assert.match(css, /\.modalbox:where\(:not\(\.smv-css-island,\.smv-css-island \*\)\):not\(#modal\.smv-live-session-modal \.modalbox\)\{width:calc\(-10px \+ 100vw\)!important/);
  assert.match(css, /#modal\.smv-live-session-modal\.smv-live-chat-active \.modalbox\{width:min\(calc\(100vw - 16px\),960px\);max-width:960px;height:calc\(100dvh - 16px - env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /#modal\.smv-live-session-modal\.smv-live-chat-active #smvLiveMessages\{display:block;flex:1 1 0%/);
  assert.match(html, /smvastro\.css\?v=20261026-live-chat-modal-fix-v1/);
});

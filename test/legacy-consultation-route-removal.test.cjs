'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const hasRoute = (source, method, pathname) =>
  source.includes('app.' + method + '("' + pathname + '"') ||
  source.includes("app." + method + "('" + pathname + "'");

test('legacy Q&A and Private Consultation API routes are removed', () => {
  const server = read('server.js');
  const retired = [
    ['post','/astrologer/edit-answer'], ['post','/submit-answer'], ['post','/question-notify'],
    ['post','/admin/approve-question'], ['post','/astrologer/claim-question'],
    ['get','/admin/refund-trace/:questionId'], ['post','/admin/reject-question'],
    ['post','/admin/retry-refund'], ['post','/customer/sync-refund'], ['post','/admin/sync-refund'],
    ['post','/admin/reallocate-question'], ['post','/admin/edit-question'], ['post','/admin/takeover-answer'],
    ['post','/admin/set-open-workflow'], ['get','/astrologer/open-questions'],
    ['post','/customer/mark-answer-viewed'], ['get','/customer/consultations'],
    ['get','/customer/private-consultations'], ['post','/customer/private-consultation/mark-viewed'],
    ['get','/admin/private-consultations-data'], ['get','/admin/questions-data'],
    ['get','/customer/reviews'], ['post','/customer/submit-review'],
    ['post','/admin/private-consultation/set-commission'], ['post','/admin/private-consultation/set-word-count'],
    ['post','/admin/private-consultation/set-workflow'], ['post','/admin/private-consultation/approve-question'],
    ['post','/admin/private-consultation/reject-question'], ['post','/admin/private-consultation/retry-refund'],
    ['post','/admin/private-consultation/sync-refund'], ['get','/astrologer/private-consultations'],
    ['post','/astrologer/private-consultation/submit-answer'], ['post','/admin/private-consultation/approve-answer'],
    ['post','/admin/private-consultation/reject-answer'], ['post','/private-consultation/create-order'],
    ['post','/private-consultation/retry-payment'], ['post','/private-consultation/cancel-payment'],
    ['post','/private-consultation/recover-payment'], ['post','/private-consultation/verify-payment'],
    ['post','/create-order'], ['post','/verify-payment']
  ];
  for (const [method, route] of retired) {
    assert.equal(hasRoute(server, method, route), false, method.toUpperCase() + ' ' + route);
  }
  assert.equal(server.includes('answerCredit.start('), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'answer-credit.js')), false);
});

test('the current Astrologer List is kept behind the clean /consult route', () => {
  const html = read('public/index.html');
  const navigation = read('public/public-navigation.js');
  const content = read('public/public-content.mjs');
  const frontend = read('public/smvastro.mjs');
  const server = read('server.js');
  assert.ok(html.includes('id="consult"'));
  assert.ok(html.includes('id="consultAstrologers"'));
  assert.equal(html.includes('privateConsultationAstrologers'), false);
  assert.ok(content.includes('consultAstrologers'));
  assert.ok(html.includes('aria-label="Astrologers List"'));
  assert.ok(html.includes('Astrologers List'));
  assert.ok(html.includes('data-smv-route="consult"'));
  assert.equal(html.includes('id="private-consultation"'), false);
  assert.equal(html.includes('data-smv-route="private-consultation"'), false);
  assert.ok(navigation.includes("'consult'"));
  assert.ok(navigation.includes("params.get('view')==='consult'"));
  assert.ok(navigation.includes('window.__smvOpenBookingChat'));
  assert.ok(frontend.includes("publicJSON('/public/astrologers')"));
  assert.ok(content.includes('window.__smvGetPublicAstrologersOnce()'));
  assert.ok(server.includes('app.get("/public/astrologers/:astrologerId/reviews"'));
  assert.equal(hasRoute(server, 'get', '/customer/reviews'), false);
  assert.equal(hasRoute(server, 'post', '/customer/submit-review'), false);
  assert.ok(content.includes('smv:consult-open'));
  assert.ok(frontend.includes("smvNavigatePublic('consult')"));
});

test('Live/Booking, Wallet and Astrologer Earnings routes remain available', () => {
  const server = read('server.js');
  const live = read('live-session-service.js');
  const wallet = read('wallet-service.js');
  for (const [method, route] of [
    ['get','/astrologer/appointments'], ['get','/customer/appointments'],
    ['post','/appointment-booking'], ['get','/admin/appointments'], ['get','/astrologer/earnings']
  ]) assert.ok(hasRoute(server, method, route), method.toUpperCase() + ' ' + route);
  for (const marker of ["'/live/requests'","'/live/sessions'","'/live/bookings/pending'"]) {
    assert.ok(live.includes(marker), 'Live/Booking endpoint remains: ' + marker);
  }
  assert.ok(wallet.includes('/wallet/recharge/create-order'));
  assert.ok(wallet.includes('/wallet/recharge/verify'));
  assert.ok(server.includes('function scheduledBookingReadStatus(appointment, nowMs = Date.now()) {'));
  assert.ok(server.includes('function nextBookingId() {'));
  assert.ok(server.includes('const bookingId = await nextBookingId();'));
});

test('the shared Razorpay webhook retains Wallet settlement and contains no old Q&A branches', () => {
  const server = read('server.js');
  const start = server.indexOf('app.post("/razorpay/webhook"');
  const end = server.indexOf('// Horoscope application/runtime files', start);
  assert.ok(start >= 0 && end > start, 'shared Razorpay webhook remains');
  const webhook = server.slice(start, end);
  assert.ok(webhook.includes('X-Razorpay-Signature'));
  assert.ok(webhook.includes('razorpay_webhook_events'));
  assert.ok(webhook.includes('walletService.handleCapturedWebhook'));
  assert.equal(webhook.includes('stored.questionId'), false);
  assert.equal(webhook.includes('stored.consultationId'), false);
  assert.equal(webhook.includes('smv_questions'), false);
  assert.equal(webhook.includes('smv_private_consultations'), false);
});

test('Production Android APK download, upload and Admin upload endpoints remain registered', () => {
  const server = read('server.js');
  const installer = read('public/android-app-install.js');
  const appModule = read('public/smvastro.mjs');
  assert.ok(hasRoute(server, 'get', '/public/android-app'));
  assert.ok(hasRoute(server, 'get', '/admin/android-app'));
  assert.ok(hasRoute(server, 'post', '/admin/android-app/upload'));
  assert.ok(installer.includes('/public/android-app'));
  assert.ok(appModule.includes('/admin/android-app/upload'));
  assert.ok(appModule.includes('/admin/android-app'));
});

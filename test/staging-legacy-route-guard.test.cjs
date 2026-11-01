'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isStagingLegacyRouteDisabled } = require('../shared/backend-platform/staging-legacy-route-guard.cjs');

test('old question, Ask Now, private consultation and Android APK routes are disabled on Staging', () => {
  const paths = [
    '/submit-answer',
    '/astrologer/edit-answer',
    '/question-notify',
    '/admin/reject-question',
    '/admin/retry-refund',
    '/admin/refund-trace/question-1',
    '/customer/consultations',
    '/customer/private-consultations',
    '/admin/private-consultations-data',
    '/private-consultation/create-order',
    '/admin/private-consultation/approve',
    '/public/android-app',
    '/admin/android-app',
    '/admin/android-app/upload'
  ];
  for (const path of paths) assert.equal(isStagingLegacyRouteDisabled(path), true, path);
});

test('Live Call, Live Chat, Book Call and Book Chat APIs remain enabled', () => {
  const paths = [
    '/wallet',
    '/wallet/recharge/create-order',
    '/wallet/recharge/verify',
    '/live/pricing',
    '/live/requests',
    '/live/bookings/pending',
    '/live/bookings/booking-1/accept',
    '/live/sessions/session-1/messages',
    '/live/sessions/session-1/signal',
    '/customer/appointments'
  ];
  for (const path of paths) assert.equal(isStagingLegacyRouteDisabled(path), false, path);
});

test('unrelated Production-only and general routes are not classified as disabled', () => {
  for (const path of ['/public/astrologers', '/admin/access', '/horoscope-auth/session', '/']) {
    assert.equal(isStagingLegacyRouteDisabled(path), false, path);
  }
});

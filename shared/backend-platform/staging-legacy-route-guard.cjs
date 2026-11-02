'use strict';

const EXACT_DISABLED_PATHS = new Set([
  '/submit-answer',
  '/astrologer/edit-answer',
  '/question-notify',
  '/admin/approve-question',
  '/astrologer/claim-question',
  '/admin/reject-question',
  '/admin/retry-refund',
  '/customer/sync-refund',
  '/admin/sync-refund',
  '/admin/reallocate-question',
  '/admin/edit-question',
  '/admin/takeover-answer',
  '/customer/mark-answer-viewed',
  '/admin/questions-data',
  '/astrologer/open-questions',
  '/create-order',
  '/verify-payment',
  '/razorpay/webhook',
  '/customer/consultations',
  '/customer/private-consultations',
  '/admin/private-consultations-data',
  '/astrologer/private-consultations',
  '/public/android-app',
  '/admin/android-app',
  '/admin/android-app/upload'
]);

function isStagingLegacyRouteDisabled(pathname) {
  const path = String(pathname || '').split('?')[0];
  return EXACT_DISABLED_PATHS.has(path) ||
    /^\/admin\/refund-trace(?:\/|$)/.test(path) ||
    /^\/admin\/private-consultation(?:\/|$)/.test(path) ||
    /^\/astrologer\/private-consultation(?:\/|$)/.test(path) ||
    /^\/private-consultation(?:\/|$)/.test(path);
}

module.exports = { isStagingLegacyRouteDisabled };

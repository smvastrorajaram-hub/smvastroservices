// Generated from the audited active Express route registrations in server.js and its registered route modules.
// This is a guard-only inventory: it does not enable or implement any business handler.
const ROUTE_LINES = "GET /admin/access\nGET /account/role\nPOST /lookup-customer-login\nPOST /lookup-id-login\nPOST /register-customer-profile\nPOST /register-astrologer-profile\nGET /public/registration-config\nGET /api/smv-mode\nGET /\nGET /test-razorpay\nPOST /contact-query\nPOST /astrologer/edit-answer\nPOST /submit-answer\nPOST /question-notify\nGET /astrologer/appointments\nGET /customer/appointments\nPOST /astrologer/appointments/:id/respond\nPOST /appointment-booking\nGET /public/astrologers\nPOST /astrologer/availability\nGET /public/astrologers/:astrologerId/reviews\nGET /customer/reviews\nPOST /customer/submit-review\nGET /admin/appointments\nPOST /admin/appointment-status\nPOST /admin/approve-question\nPOST /astrologer/claim-question\nGET /api-version\nPOST /admin/reject-question\nPOST /admin/retry-refund\nGET /admin/refund-trace/:questionId\nPOST /customer/sync-refund\nPOST /admin/sync-refund\nPOST /admin/reallocate-question\nPOST /admin/edit-question\nPOST /admin/takeover-answer\nPOST /astrologer/change-payout\nPOST /admin/payout-change-status\nPOST /admin/set-open-workflow\nGET /astrologer/open-questions\nPOST /customer/mark-answer-viewed\nGET /customer/consultations\nGET /customer/private-consultations\nPOST /customer/private-consultation/mark-viewed\nPOST /admin/astrologer-quiz/load-defaults\nGET /admin/astrologer-quiz/questions\nPOST /admin/astrologer-quiz/questions\nPOST /admin/astrologer-quiz/questions/delete\nGET /google-form/astrologer-quiz-config\nPOST /admin/astrologer-auto-approval/settings\nPOST /admin/astrologer-quiz/sync-google-form\nGET /astrologer/qualification-config\nPOST /webhooks/google-form/astrologer-qualification\nGET /admin/private-consultations-data\nGET /admin/settings-data\nGET /admin/withdrawals-data\nGET /admin/reviews-data\nPOST /admin/approve-astrologer\nPOST /admin/reject-astrologer\nPOST /astrologer/sync-approval\nPOST /admin/astrologer-profile-permission\nPOST /admin/astrologer-profile-description\nGET /public/android-app\nGET /admin/android-app\nPOST /admin/android-app/upload\nGET /public/content\nGET /admin/content\nPOST /admin/content/save\nPOST /admin/content/toggle\nPOST /admin/content/delete\nPOST /admin/astrologer-languages\nPOST /admin/astrologer-pricing\nGET /admin/astrologers-data\nGET /admin/questions-data\nPOST /admin/dashboard-touch\nGET /admin-data\nPOST /admin/private-consultation/set-commission\nPOST /admin/private-consultation/set-word-count\nPOST /admin/private-consultation/set-workflow\nPOST /admin/private-consultation/approve-question\nPOST /admin/private-consultation/reject-question\nPOST /admin/private-consultation/retry-refund\nPOST /admin/private-consultation/sync-refund\nGET /astrologer/private-consultations\nPOST /astrologer/private-consultation/submit-answer\nPOST /admin/private-consultation/approve-answer\nPOST /admin/private-consultation/reject-answer\nPOST /private-consultation/create-order\nPOST /private-consultation/retry-payment\nPOST /private-consultation/cancel-payment\nPOST /private-consultation/recover-payment\nPOST /private-consultation/verify-payment\nPOST /create-order\nPOST /verify-payment\nGET /astrologer/earnings\nPOST /astrologer/withdrawal-request\nPOST /admin/withdrawal-mark-paid\nGET /admin/withdrawal-payout/:withdrawalDocId\nPOST /razorpay/webhook\nGET /horoscope-auth/session\nGET /horoscope-feature-config\nPOST /admin/horoscope-feature-settings\nPOST /horoscope-payment/create-order\nPOST /horoscope-payment/verify\nPOST /api/prediction/horoscope\nPOST /api/prediction/matching\nGET /admin/wallet/transactions\nGET /wallet/recharge-offers\nGET /admin/offers\nPOST /admin/offers/save\nPOST /admin/offers/delete\nGET /public/push-config\nGET /wallet\nGET /wallet/transactions\nPOST /wallet/recharge/create-order\nPOST /wallet/recharge/verify\nGET /admin/wallet/backfill/status\nPOST /admin/wallet/backfill/preflight\nPOST /admin/wallet/backfill/preview\nPOST /admin/wallet/backfill/apply\nPOST /admin/wallet/backfill/reconcile\nGET /api/locations/status\nGET /api/locations/search\nGET /api/locations/timezone\nGET /live/push/status\nPOST /live/push/register\nPOST /live/push/unregister\nPOST /live/push/test\nGET /live/pricing\nGET /live/ice-config\nPOST /admin/live/pricing\nPOST /admin/live/commission\nGET /live/events\nPOST /live/scheduled-appointments/:id/start\nPOST /live/requests\nGET /live/sessions\nGET /live/bookings/pending\nGET /live/bookings/mine\nPOST /live/bookings/:id/accept\nPOST /live/bookings/:id/reject\nPOST /live/bookings/:id/cancel\nPOST /live/sessions/:id/accept\nPOST /live/sessions/:id/reject\nPOST /live/sessions/:id/end\nPOST /live/sessions/:id/ready\nPOST /live/sessions/:id/signal\nGET /live/sessions/:id/signals\nPOST /live/sessions/:id/messages\nGET /live/sessions/:id/messages";

export const LEGACY_BACKEND_ROUTE_INVENTORY = Object.freeze(
  ROUTE_LINES.split('\n').filter(Boolean).map(line => {
    const separator = line.indexOf(' ');
    return Object.freeze({ method: line.slice(0, separator), path: line.slice(separator + 1) });
  })
);

function normalizePath(pathname) {
  let value = String(pathname || '/').split('?')[0];
  while (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  return value || '/';
}

function matchesRoutePath(pattern, pathname) {
  const expected = normalizePath(pattern);
  const actual = normalizePath(pathname);
  if (expected === '/') return actual === '/';
  const left = expected.split('/').filter(Boolean);
  const right = actual.split('/').filter(Boolean);
  if (left.length !== right.length) return false;
  return left.every((segment, index) => segment.startsWith(':') ? right[index].length > 0 : segment === right[index]);
}

/** True when pathname belongs to a known legacy route, regardless of method. */
export function isLegacyBackendPath(pathname) {
  return LEGACY_BACKEND_ROUTE_INVENTORY.some(route => matchesRoutePath(route.path, pathname));
}

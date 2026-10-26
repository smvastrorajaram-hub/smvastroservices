'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isAllowedPushOrigin,
  isTrustedPushEndpoint,
  validatePushSubscription,
  buildNotificationPayload
} = require('../push-notification-service');

const origin = 'https://smvastroservices.in';
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-target-abcdefghijklmnopqrstuvwxyz1234567890',
  keys: {
    p256dh: 'A'.repeat(40),
    auth: 'B'.repeat(24)
  }
};

test('only explicitly allowed HTTPS site origins can be used for notification clicks', () => {
  const allow = new Set([origin]);
  assert.equal(isAllowedPushOrigin(origin, allow), true);
  assert.equal(isAllowedPushOrigin(origin + '/', allow), true);
  assert.equal(isAllowedPushOrigin('http://smvastroservices.in', allow), false);
  assert.equal(isAllowedPushOrigin('https://evil.example', allow), false);
});

test('browser push subscriptions must use trusted HTTPS push-service endpoints and contain encryption keys', () => {
  assert.equal(isTrustedPushEndpoint(subscription.endpoint), true);
  assert.deepEqual(validatePushSubscription(subscription), subscription);
  assert.equal(validatePushSubscription({ ...subscription, endpoint: 'http://fcm.googleapis.com/fcm/send/x' }), null);
  assert.equal(validatePushSubscription({ ...subscription, endpoint: 'https://127.0.0.1/internal' }), null);
  assert.equal(validatePushSubscription({ ...subscription, keys: { p256dh: 'x', auth: 'y' } }), null);
});

test('incoming Live Call alert avoids customer personal details and deep-links to its own allowed origin', () => {
  const payload = buildNotificationPayload({
    kind: 'live_session', mode: 'call', entityId: 'session-123', origin
  });
  assert.equal(payload.title, 'Incoming Live Call');
  assert.match(payload.body, /Tap to open SMV ASTRO/);
  assert.equal(payload.alertType, 'live-session');
  assert.equal(new URL(payload.url).origin, origin);
  assert.equal(new URL(payload.url).searchParams.get('smvPushId'), 'session-123');
  assert.equal(payload.ttl, 60);
  assert.equal(payload.body.includes('Customer name'), false);
});

test('queued Live Chat and scheduled Call bookings use distinct alert titles and longer delivery TTL', () => {
  const queued = buildNotificationPayload({
    kind: 'live_booking', mode: 'chat', entityId: 'booking-1', origin
  });
  const scheduled = buildNotificationPayload({
    kind: 'scheduled_booking', mode: 'call', entityId: 'appointment-1', origin
  });
  assert.equal(queued.title, 'New Live Chat Booking');
  assert.equal(queued.alertType, 'live-booking');
  assert.equal(queued.ttl, 86400);
  assert.equal(scheduled.title, 'New Scheduled Call Booking');
  assert.equal(scheduled.alertType, 'scheduled-booking');
  assert.equal(new URL(scheduled.url).searchParams.get('smvPushId'), 'appointment-1');
  assert.equal(scheduled.ttl, 86400);
});

test('notification payload rejects arbitrary alert kinds, empty ids and unapproved origins', () => {
  assert.equal(buildNotificationPayload({ kind: 'admin_message', mode: 'call', entityId: 'x', origin }), null);
  assert.equal(buildNotificationPayload({ kind: 'live_session', mode: 'call', entityId: '', origin }), null);
  assert.equal(buildNotificationPayload({ kind: 'live_session', mode: 'call', entityId: 'x', origin: 'https://evil.example' }), null);
});

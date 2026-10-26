'use strict';

const crypto = require('node:crypto');
let webPushDefault = null;
try { webPushDefault = require('web-push'); } catch (_) { /* Unit tests can validate helpers without installing web-push. */ }

const SUBSCRIPTIONS = 'smv_push_subscriptions';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://smvastroservices.in',
  'https://www.smvastroservices.in',
  'https://smvastroservices.pages.dev'
];

function allowedOriginsFromEnv(env = process.env) {
  const supplied = String(env.WEB_PUSH_ALLOWED_ORIGINS || '').trim();
  return new Set((supplied ? supplied.split(',') : DEFAULT_ALLOWED_ORIGINS)
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(value => {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.origin !== value.replace(/\/+$/, '')) return '';
        return url.origin;
      } catch (_) { return ''; }
    })
    .filter(Boolean));
}

function isAllowedPushOrigin(value, allowedOrigins = allowedOriginsFromEnv()) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.origin === String(value || '').replace(/\/+$/, '') && allowedOrigins.has(url.origin);
  } catch (_) {
    return false;
  }
}

function isTrustedPushEndpoint(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return host === 'fcm.googleapis.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.push.apple.com') ||
      host === 'push.services.mozilla.com' ||
      host.endsWith('.push.services.mozilla.com') ||
      host === 'notify.windows.com' ||
      host.endsWith('.notify.windows.com');
  } catch (_) {
    return false;
  }
}

function validatePushSubscription(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const endpoint = String(input.endpoint || '').trim();
  const p256dh = String(input.keys?.p256dh || '').trim();
  const auth = String(input.keys?.auth || '').trim();
  if (endpoint.length < 40 || endpoint.length > 4096 || !isTrustedPushEndpoint(endpoint)) return null;
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}

function buildNotificationPayload({ kind, mode, entityId, origin }) {
  const type = String(kind || '').trim().toLowerCase();
  const sessionMode = String(mode || '').trim().toLowerCase() === 'chat' ? 'chat' : 'call';
  const id = String(entityId || '').trim();
  if (!['live_session', 'live_booking', 'scheduled_booking'].includes(type) || !id || id.length > 200) return null;
  if (!isAllowedPushOrigin(origin)) return null;

  let alertType, title, body, ttl;
  if (type === 'live_session') {
    alertType = 'live-session';
    title = sessionMode === 'chat' ? 'Incoming Live Chat' : 'Incoming Live Call';
    body = sessionMode === 'chat'
      ? 'A Customer is requesting a Live Chat. Tap to open SMV ASTRO.'
      : 'A Customer is requesting a Live Call. Tap to open SMV ASTRO.';
    ttl = 60;
  } else if (type === 'live_booking') {
    alertType = 'live-booking';
    title = sessionMode === 'chat' ? 'New Live Chat Booking' : 'New Live Call Booking';
    body = 'A Customer has made a booking request. Tap to review it in SMV ASTRO.';
    ttl = 86400;
  } else {
    alertType = 'scheduled-booking';
    title = sessionMode === 'chat' ? 'New Scheduled Chat Booking' : 'New Scheduled Call Booking';
    body = 'A Customer has scheduled a consultation. Tap to review the booking in SMV ASTRO.';
    ttl = 86400;
  }

  const target = new URL('/', origin);
  target.searchParams.set('smvPushType', alertType);
  target.searchParams.set('smvPushId', id);
  return {
    title,
    body,
    icon: new URL('/assets/icon-192.png', origin).href,
    badge: new URL('/assets/favicon-64.png', origin).href,
    tag: 'smv-astro-' + alertType + '-' + id,
    requireInteraction: true,
    renotify: true,
    vibrate: [250, 100, 250, 100, 450],
    url: target.href,
    alertType,
    entityId: id,
    ttl
  };
}

function createPushNotificationService({ app, db, FieldValue, requireUser, webPush = webPushDefault, env = process.env }) {
  if (!app || !db || !FieldValue || typeof requireUser !== 'function') {
    throw new Error('Web Push service requires the Express app, Firestore, FieldValue and authentication helper.');
  }

  const publicKey = String(env.WEB_PUSH_PUBLIC_KEY || '').trim();
  const privateKey = String(env.WEB_PUSH_PRIVATE_KEY || '').trim();
  const subject = String(env.WEB_PUSH_SUBJECT || 'mailto:smvastroservices@gmail.com').trim();
  let configured = false;
  if (publicKey && privateKey && subject) {
    try {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      configured = true;
    } catch (error) {
      console.error('[Web Push] VAPID keys could not be loaded:', error?.message || error);
    }
  }

  const allowedOrigins = allowedOriginsFromEnv(env);

  app.get('/notifications/push-config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, enabled: configured, publicKey: configured ? publicKey : '' });
  });

  app.post('/notifications/push/register', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!configured) return res.status(503).json({ success: false, error: 'Phone alerts are not configured on the server yet.' });

    try {
      const uid = String(user.uid || '').trim();
      if (!uid) return res.status(401).json({ success: false, error: 'Login session is missing. Please log in again.' });
      const [userSnap, astroSnap] = await Promise.all([
        db.collection('smv_users').doc(uid).get(),
        db.collection('smv_astrologers').doc(uid).get()
      ]);
      const profile = userSnap.exists ? (userSnap.data() || {}) : {};
      const astro = astroSnap.exists ? (astroSnap.data() || {}) : {};
      const role = String(profile.role || astro.role || '').trim().toLowerCase();
      const status = String(astro.status || '').trim().toLowerCase();
      if ((role && role !== 'astrologer') || !astroSnap.exists || !['approved', 'active'].includes(status)) {
        return res.status(403).json({ success: false, error: 'Phone alerts are available to approved Astrologer accounts only.' });
      }

      const subscription = validatePushSubscription(req.body?.subscription);
      if (!subscription) return res.status(400).json({ success: false, error: 'The browser Push subscription is invalid. Please enable phone alerts again.' });
      const origin = String(req.body?.siteOrigin || '').trim();
      if (!isAllowedPushOrigin(origin, allowedOrigins)) {
        return res.status(400).json({ success: false, error: 'This SMV ASTRO website origin is not approved for phone alerts.' });
      }

      const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');
      const ref = db.collection(SUBSCRIPTIONS).doc(id);
      const current = await ref.get();
      const now = FieldValue.serverTimestamp();
      await ref.set({
        uid,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        origin,
        enabled: true,
        userAgent: String(req.body?.userAgent || '').slice(0, 500),
        createdAt: current.exists ? (current.data()?.createdAt || now) : now,
        updatedAt: now
      }, { merge: true });
      return res.set('Cache-Control', 'no-store').json({ success: true, registered: true });
    } catch (error) {
      console.error('[Web Push] Subscription registration failed:', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to enable phone alerts right now.' });
    }
  });

  app.post('/notifications/push/unregister', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const subscription = validatePushSubscription(req.body?.subscription);
      if (!subscription) return res.status(400).json({ success: false, error: 'The browser Push subscription is invalid.' });
      const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');
      const ref = db.collection(SUBSCRIPTIONS).doc(id);
      const snap = await ref.get();
      if (snap.exists && String(snap.data()?.uid || '') === String(user.uid || '')) await ref.delete();
      return res.set('Cache-Control', 'no-store').json({ success: true, unregistered: true });
    } catch (error) {
      console.error('[Web Push] Subscription removal failed:', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to disable phone alerts right now.' });
    }
  });

  async function notifyAstrologer(astrologerUid, alert) {
    const uid = String(astrologerUid || '').trim();
    if (!configured || !uid) return { skipped: true, reason: configured ? 'missing_recipient' : 'not_configured' };
    try {
      const snapshot = await db.collection(SUBSCRIPTIONS).where('uid', '==', uid).get();
      if (snapshot.empty) return { skipped: true, reason: 'no_subscriptions' };

      const entries = snapshot.docs;
      const results = await Promise.all(entries.map(async entry => {
        const record = entry.data() || {};
        const subscription = validatePushSubscription(record);
        if (record.enabled !== true || !subscription) return { ok: false, skipped: true };
        const message = buildNotificationPayload({
          kind: alert?.kind,
          mode: alert?.mode,
          entityId: alert?.entityId,
          origin: record.origin
        });
        if (!message) return { ok: false, skipped: true };
        const topic = crypto.createHash('sha256').update(String(alert?.kind) + ':' + String(alert?.mode) + ':' + String(alert?.entityId)).digest('hex').slice(0, 32);
        try {
          await webPush.sendNotification(subscription, JSON.stringify({
            title: message.title,
            body: message.body,
            icon: message.icon,
            badge: message.badge,
            tag: message.tag,
            requireInteraction: message.requireInteraction,
            renotify: message.renotify,
            vibrate: message.vibrate,
            url: message.url,
            alertType: message.alertType,
            entityId: message.entityId
          }), { TTL: message.ttl, urgency: 'high', topic });
          return { ok: true };
        } catch (error) {
          const status = Number(error?.statusCode || error?.status || 0);
          if (status === 404 || status === 410) {
            await entry.ref.delete().catch(() => {});
          } else {
            console.warn('[Web Push] Delivery failed for one device:', status || error?.message || error);
          }
          return { ok: false, status };
        }
      }));
      return { sent: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok && !result.skipped).length };
    } catch (error) {
      console.warn('[Web Push] Unable to load Astrologer subscriptions:', error?.message || error);
      return { skipped: true, reason: 'delivery_error' };
    }
  }

  return { notifyAstrologer, configured, publicKey };
}

module.exports = {
  createPushNotificationService,
  allowedOriginsFromEnv,
  isAllowedPushOrigin,
  isTrustedPushEndpoint,
  validatePushSubscription,
  buildNotificationPayload
};

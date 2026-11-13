const ALLOWED_DEADLINE_TYPES = new Set([
  'ring_timeout',
  'call_connect_timeout',
  'chat_accept_timeout',
  'preparation_timeout',
  'disconnect_grace',
  'session_duration',
  'scheduled_start_deadline',
  'booking_expiry'
]);
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createGoogleServiceAccountTokenProvider } from '../../../shared/backend-platform/google-service-account-token.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';

const MAX_DEADLINES = 16;
const MAX_RECENT_IDS = 256;
const MAX_USER_EVENT_REPLAY = 200;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 60000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function readJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return null;
  }
}

function validSessionId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,180}$/.test(id) ? id : '';
}

function validUid(value) {
  const uid = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,160}$/.test(uid) ? uid : '';
}

function deadlineFrom(input) {
  const type = String(input?.type || '').trim();
  const atMs = Number(input?.atMs);
  const deadlineId = String(input?.deadlineId || (type + ':' + atMs)).slice(0, 240);
  if (!ALLOWED_DEADLINE_TYPES.has(type) || !Number.isSafeInteger(atMs) || atMs < 1 ||
      !deadlineId || deadlineId.includes('/')) return null;
  const participantUid = validUid(input?.participantUid);
  return { type, atMs, deadlineId, generation: Number.isSafeInteger(input?.generation) ? input.generation : 0,
    ...(type === 'disconnect_grace' && participantUid ? { participantUid } : {}) };
}

function freshRecord(sessionId) {
  return {
    sessionId,
    state: 'unknown',
    deadlines: [],
    pendingEvents: [],
    deliveredEventIds: [],
    bookingReminder: null,
    updatedAtMs: Date.now()
  };
}

function remember(items, value, max = MAX_RECENT_IDS) {
  const next = [...items.filter(item => item !== value), value];
  return next.slice(-max);
}

/**
 * One Durable Object instance is addressed per Live Session ID.
 *
 * This object owns durable deadline scheduling and session-scoped realtime
 * fan-out only. It never writes Wallet balances or finalizes a bill. Alarms
 * enqueue deterministic commands; a D1 transaction consumer must re-read the
 * authoritative session and apply the billing/booking state transition.
 */
export class LiveSessionCoordinator {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sseClients = new Set();
    this.firebaseProjectId = String(env.FIREBASE_PROJECT_ID || '').trim();
    this.bookingPushTokenProvider = null;
    try {
      const raw = String(env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
      const credentials = raw ? JSON.parse(raw) : {
        project_id: this.firebaseProjectId,
        client_email: String(env.FIREBASE_CLIENT_EMAIL || '').trim(),
        private_key: String(env.FIREBASE_PRIVATE_KEY || '').trim()
      };
      this.firebaseProjectId = String(this.firebaseProjectId || credentials.project_id || '').trim();
      this.bookingPushTokenProvider = createGoogleServiceAccountTokenProvider({
        credentials,
        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging'
      });
    } catch (error) {
      console.warn('[Scheduled Booking] Firebase push credentials are unavailable:', error?.message || error);
    }
    this.liveService = env.DB && typeof env.DB.prepare === 'function' && typeof env.DB.batch === 'function'
      ? createD1LiveSessionService({
          db: env.DB,
          walletAdapter: createD1WalletAdapter({ db: env.DB }),
          adminWalletUid: String(env.ADMIN_WALLET_UID || env.ADMIN_UID || ''),
          firestore: { async getDocument() { throw new Error('Firestore is not used by Live deadline settlement.'); } }
        })
      : null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, durable: true, role: 'live-session-coordinator' });
    }
    if (request.method === 'POST' && url.pathname === '/schedule') return this.schedule(request);
    if (request.method === 'POST' && url.pathname === '/schedule-booking-reminder') return this.scheduleBookingReminder(request);
    if (request.method === 'POST' && url.pathname === '/stop-booking-ringtone') return this.stopBookingRingtone(request);
    if (request.method === 'POST' && url.pathname === '/cancel-deadline') return this.cancelDeadline(request);
    if (request.method === 'POST' && url.pathname === '/connection') return this.connection(request);
    if (request.method === 'POST' && url.pathname === '/publish') return this.publish(request);
    if (request.method === 'GET' && url.pathname === '/status') {
      const record = await this.readRecord();
      return json({
        ok: true, sessionId: record.sessionId, state: record.state,
        scheduledDeadlines: record.deadlines.length,
        pendingDeadlineEvents: record.pendingEvents.length
      });
    }
    if (request.method === 'GET' && url.pathname === '/events') return this.openSse(request);
    if (request.method === 'GET' && url.pathname === '/ws') return this.openWebSocket(request);
    return json({ ok: false, code: 'NOT_FOUND' }, 404);
  }

  async readRecord() {
    const record = await this.ctx.storage.get('live-session-record');
    return record && typeof record === 'object' ? record : freshRecord('');
  }

  async writeRecord(record) {
    record.updatedAtMs = Date.now();
    await this.ctx.storage.put('live-session-record', record);
    await this.armNextAlarm(record);
  }

  async armNextAlarm(record) {
    const deadlineAt = record.deadlines.reduce((next, item) => Math.min(next, item.atMs), Number.POSITIVE_INFINITY);
    const retryAt = record.pendingEvents
      .filter(item => !item.deliveredAtMs)
      .reduce((next, item) => Math.min(next, Number(item.nextAttemptAtMs || Date.now() + RETRY_BASE_MS)), Number.POSITIVE_INFINITY);
    const reminder = record.bookingReminder;
    const reminderAt = reminder ? Math.min(
      reminder.initialPushSent ? Number.POSITIVE_INFINITY : Number(reminder.initialNextAttemptAtMs || Date.now()),
      reminder.preferredReminderSent ? Number.POSITIVE_INFINITY : (Number(reminder.preferredAtMs || Number.POSITIVE_INFINITY) <= Date.now()
        ? Number(reminder.preferredNextAttemptAtMs || reminder.preferredAtMs)
        : Number(reminder.preferredAtMs || Number.POSITIVE_INFINITY))
    ) : Number.POSITIVE_INFINITY;
    const next = Math.min(deadlineAt, retryAt, reminderAt);
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
    else await this.ctx.storage.deleteAlarm();
  }


  async scheduleBookingReminder(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const bookingId = String(body.bookingId || '').trim();
    const astrologerUid = validUid(body.astrologerUid);
    const mode = String(body.mode || '').trim().toLowerCase();
    const preferredAtMs = Number(body.preferredAtMs);
    if (!/^[A-Za-z0-9_-]{1,180}$/.test(bookingId) || !astrologerUid ||
        !['call', 'chat'].includes(mode) || !Number.isSafeInteger(preferredAtMs) ||
        preferredAtMs <= Date.now()) {
      return json({ ok: false, code: 'BOOKING_REMINDER_INVALID' }, 400);
    }
    const record = await this.readRecord();
    const previous = record.bookingReminder;
    if (previous && String(previous.bookingId || '') !== bookingId) {
      return json({ ok: false, code: 'BOOKING_REMINDER_ID_MISMATCH' }, 409);
    }
    record.bookingReminder = previous || {
      bookingId, astrologerUid, mode, preferredAtMs,
      initialPushSent: false, initialAttempts: 0, initialNextAttemptAtMs: Date.now(),
      preferredReminderSent: false, preferredAttempts: 0,
      preferredNextAttemptAtMs: preferredAtMs,
      updatedAtMs: Date.now()
    };
    if (record.bookingReminder.astrologerUid !== astrologerUid ||
        record.bookingReminder.mode !== mode || Number(record.bookingReminder.preferredAtMs) !== preferredAtMs) {
      return json({ ok: false, code: 'BOOKING_REMINDER_CONFLICT' }, 409);
    }
    await this.writeRecord(record);
    await this.deliverScheduledBookingReminder(record);
    await this.armNextAlarm(record);
    return json({
      ok: true, bookingId, initialPushSent: record.bookingReminder.initialPushSent === true,
      preferredReminderAtMs: preferredAtMs
    });
  }

  async stopBookingRingtone(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const bookingId = String(body.bookingId || '').trim();
    const astrologerUid = validUid(body.astrologerUid);
    const record = await this.readRecord();
    const reminder = record.bookingReminder;
    if (!/^[A-Za-z0-9_-]{1,180}$/.test(bookingId) || !astrologerUid ||
        !reminder || reminder.bookingId !== bookingId || reminder.astrologerUid !== astrologerUid) {
      return json({ ok: false, code: 'BOOKING_REMINDER_NOT_FOUND' }, 404);
    }
    try {
      const result = await this.sendScheduledBookingPush(reminder, 'stop_ringing');
      return json({ ok: true, sent: Number(result?.sent || 0) });
    } catch (error) {
      console.warn('[Scheduled Booking] Stop-ringtone push deferred:', error?.message || error);
      return json({ ok: false, code: 'BOOKING_STOP_PUSH_FAILED' }, 503);
    }
  }

  async firebaseRequest(url, options = {}) {
    if (!this.bookingPushTokenProvider || !this.firebaseProjectId) {
      throw new Error('Firebase Admin push credentials are not configured.');
    }
    const accessToken = await this.bookingPushTokenProvider.getAccessToken();
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: 'Bearer ' + accessToken, ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Firebase request failed with HTTP ' + response.status + '.');
    return payload;
  }

  async scheduledBookingState(reminder) {
    if (typeof this.env.__getScheduledBookingState === 'function') return this.env.__getScheduledBookingState(reminder);
    const name = 'projects/' + encodeURIComponent(this.firebaseProjectId) +
      '/databases/(default)/documents/smv_appointments/' + encodeURIComponent(reminder.bookingId);
    const document = await this.firebaseRequest('https://firestore.googleapis.com/v1/' + name);
    const fields = document.fields || {};
    const value = key => String(fields[key]?.stringValue || '');
    return {
      exists: true,
      bookingStatus: value('bookingStatus').toLowerCase(),
      astrologerUid: value('astrologerUid')
    };
  }

  async sendScheduledBookingPush(reminder, type) {
    if (typeof this.env.__sendScheduledBookingPush === 'function') return this.env.__sendScheduledBookingPush({ reminder, type });
    const queryUrl = 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(this.firebaseProjectId) + '/databases/(default)/documents:runQuery';
    const query = await this.firebaseRequest(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'smv_push_tokens' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'uid' }, op: 'EQUAL',
              value: { stringValue: reminder.astrologerUid }
            }
          },
          limit: 25
        }
      })
    });
    const tokens = [...new Set((Array.isArray(query) ? query : [])
      .map(row => String(row?.document?.fields?.token?.stringValue || '').trim())
      .filter(token => token.length >= 30 && token.length <= 8192 && !/\\s/.test(token)))];
    if (!tokens.length) return { sent: 0, registered: 0 };
    const mode = String(reminder.mode || 'call').toUpperCase();
    const preferred = type === 'scheduled_booking_reminder';
    const stopping = type === 'stop_ringing';
    const title = stopping ? 'Scheduled ' + mode + ' Booking Accepted' : preferred ? 'Scheduled ' + mode + ' Starting Now' : 'New Scheduled ' + mode + ' Booking';
    const body = stopping
      ? 'The scheduled booking has been accepted or started.'
      : preferred
        ? 'Your accepted ' + mode + ' booking is at the preferred time. Open SMV ASTRO to start.'
        : 'A Customer has requested a scheduled ' + mode + '. Open SMV ASTRO to review.';
    const endpoint = 'https://fcm.googleapis.com/v1/projects/' +
      encodeURIComponent(this.firebaseProjectId) + '/messages:send';
    const results = await Promise.allSettled(tokens.map(token => this.firebaseRequest(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          data: {
            type, mode: String(reminder.mode || 'call'), bookingId: reminder.bookingId,
            title, body, tag: 'smv-scheduled-' + type + '-' + reminder.bookingId
          },
          android: { priority: 'HIGH', ttl: '120s' }
        }
      })
    })));
    return {
      sent: results.filter(item => item.status === 'fulfilled').length,
      failed: results.filter(item => item.status === 'rejected').length,
      registered: tokens.length
    };
  }

  async deliverScheduledBookingReminder(record) {
    const reminder = record?.bookingReminder;
    if (!reminder || reminder.cancelledAtMs) return;
    const now = Date.now();
    if (!reminder.initialPushSent && Number(reminder.initialNextAttemptAtMs || 0) <= now) {
      try {
        const result = await this.sendScheduledBookingPush(reminder, 'scheduled_booking');
        reminder.initialPushSent = true;
        reminder.initialPushSentAtMs = now;
        reminder.initialDelivery = result;
        reminder.initialLastError = '';
      } catch (error) {
        reminder.initialAttempts = Number(reminder.initialAttempts || 0) + 1;
        reminder.initialLastError = String(error?.message || error).slice(0, 200);
        if (reminder.initialAttempts >= 6) {
          reminder.initialPushSent = true;
          reminder.initialPushFailed = true;
        } else {
          reminder.initialNextAttemptAtMs = now + Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(reminder.initialAttempts - 1, 4)));
        }
      }
    }
    const preferredAtMs = Number(reminder.preferredAtMs || 0);
    if (!reminder.preferredReminderSent && now >= preferredAtMs &&
        Number(reminder.preferredNextAttemptAtMs || preferredAtMs) <= now) {
      // Keep the existing two-minute Preferred-Time grace window unchanged.
      if (now > preferredAtMs + 2 * 60_000) {
        reminder.preferredReminderSent = true;
        reminder.preferredSkippedReason = 'preferred_time_grace_elapsed';
      } else {
        try {
          const current = await this.scheduledBookingState(reminder);
          if (!current.exists || current.astrologerUid !== reminder.astrologerUid ||
              ['cancelled', 'rejected', 'missed', 'missed_by_astrologer', 'completed', 'in_progress'].includes(current.bookingStatus)) {
            reminder.preferredReminderSent = true;
            reminder.preferredSkippedReason = 'booking_not_eligible';
          } else if (current.bookingStatus !== 'accepted') {
            reminder.preferredNextAttemptAtMs = Math.min(preferredAtMs + 2 * 60_000, now + RETRY_BASE_MS);
          } else {
            const result = await this.sendScheduledBookingPush(reminder, 'scheduled_booking_reminder');
            reminder.preferredReminderSent = true;
            reminder.preferredReminderSentAtMs = now;
            reminder.preferredDelivery = result;
            reminder.preferredLastError = '';
          }
        } catch (error) {
          reminder.preferredAttempts = Number(reminder.preferredAttempts || 0) + 1;
          reminder.preferredNextAttemptAtMs = Math.min(
            preferredAtMs + 2 * 60_000,
            now + Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(reminder.preferredAttempts - 1, 4)))
          );
          reminder.preferredLastError = String(error?.message || error).slice(0, 200);
        }
      }
    }
    reminder.updatedAtMs = now;
    await this.ctx.storage.put('live-session-record', record);
  }

  async schedule(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const sessionId = validSessionId(body.sessionId);
    if (!sessionId || !Array.isArray(body.deadlines) || body.deadlines.length > MAX_DEADLINES) {
      return json({ ok: false, code: 'DEADLINE_REQUEST_INVALID' }, 400);
    }
    const deadlines = body.deadlines.map(deadlineFrom);
    if (deadlines.some(item => !item)) return json({ ok: false, code: 'DEADLINE_INVALID' }, 400);
    const record = await this.readRecord();
    if (record.sessionId && record.sessionId !== sessionId) return json({ ok: false, code: 'SESSION_ID_MISMATCH' }, 409);
    record.sessionId = sessionId;
    record.state = String(body.state || record.state || 'unknown').slice(0, 40);
    for (const deadline of deadlines) {
      record.deadlines = record.deadlines.filter(item => item.type !== deadline.type);
      record.deadlines.push(deadline);
    }
    record.deadlines.sort((a, b) => a.atMs - b.atMs);
    await this.writeRecord(record);
    return json({ ok: true, sessionId, deadlines: record.deadlines });
  }

  async cancelDeadline(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const type = String(body.type || '').trim();
    const deadlineId = String(body.deadlineId || '').trim();
    if (!ALLOWED_DEADLINE_TYPES.has(type) && !deadlineId) return json({ ok: false, code: 'DEADLINE_TYPE_INVALID' }, 400);
    const record = await this.readRecord();
    const before = record.deadlines.length;
    record.deadlines = record.deadlines.filter(item => deadlineId
      ? item.deadlineId !== deadlineId
      : item.type !== type);
    await this.writeRecord(record);
    return json({ ok: true, cancelled: before - record.deadlines.length });
  }

  async connection(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const uid = validUid(body.uid);
    const connected = body.connected === true;
    if (!uid || typeof body.connected !== 'boolean') return json({ ok: false, code: 'CONNECTION_INVALID' }, 400);
    const record = await this.readRecord();
    if (!record.sessionId) return json({ ok: false, code: 'SESSION_NOT_SCHEDULED' }, 404);
    const participantPrefix = 'disconnect_grace:' + uid + ':';
    if (connected) {
      record.deadlines = record.deadlines.filter(item =>
        item.type !== 'disconnect_grace' || !String(item.deadlineId || '').startsWith(participantPrefix)
      );
      record.pendingEvents = record.pendingEvents.filter(item =>
        item.deadlineType !== 'disconnect_grace' || String(item.participantUid || '') !== uid
      );
    } else {
      const atMs = Number(body.disconnectDeadlineAtMs);
      const deadline = deadlineFrom({
        type: 'disconnect_grace', atMs,
        deadlineId: 'disconnect_grace:' + uid + ':' + atMs,
        generation: Number(body.generation || 0),
        participantUid: uid
      });
      if (!deadline) return json({ ok: false, code: 'DEADLINE_INVALID' }, 400);
      record.deadlines = record.deadlines.filter(item =>
        item.type !== 'disconnect_grace' || !String(item.deadlineId || '').startsWith(participantPrefix)
      );
      record.pendingEvents = record.pendingEvents.filter(item =>
        item.deadlineType !== 'disconnect_grace' || String(item.participantUid || '') !== uid
      );
      record.deadlines.push(deadline);
    }
    record.deadlines.sort((a, b) => a.atMs - b.atMs);
    await this.writeRecord(record);
    return json({ ok: true, uid, connected, deadlines: record.deadlines });
  }

  async publish(request) {
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const eventId = String(body.eventId || '').trim();
    const type = String(body.type || '').trim();
    if (!/^[A-Za-z0-9:_-]{1,240}$/.test(eventId) || !/^[a-zA-Z0-9._-]{1,100}$/.test(type)) {
      return json({ ok: false, code: 'EVENT_INVALID' }, 400);
    }
    const record = await this.readRecord();
    const publishedIds = Array.isArray(record.deliveredEventIds) ? record.deliveredEventIds : [];
    if (publishedIds.includes(eventId)) return json({ ok: true, duplicate: true, eventId });
    const event = { eventId, type, sessionId: record.sessionId || null, data: body.data ?? null, createdAtMs: Date.now() };
    this.broadcast(event);
    record.deliveredEventIds = remember(publishedIds, eventId);
    await this.ctx.storage.put('live-session-record', record);
    return json({ ok: true, duplicate: false, eventId });
  }

  broadcast(event) {
    const frame = JSON.stringify(event);
    for (const controller of [...this.sseClients]) {
      try { controller.enqueue(new TextEncoder().encode('event: ' + event.type + '\ndata: ' + frame + '\n\n')); }
      catch { this.sseClients.delete(controller); }
    }
    for (const socket of this.ctx.getWebSockets?.() || []) {
      try { socket.send(frame); } catch { try { socket.close(1011, 'send failed'); } catch {} }
    }
  }

  openSse(request) {
    const uid = validUid(new URL(request.url).searchParams.get('uid'));
    const internalUid = validUid(request.headers.get('x-smv-internal-uid'));
    // The Worker must authenticate the Firebase token before forwarding this
    // request and must set the verified UID header. The DO is not the auth authority.
    if (!uid || uid !== internalUid) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);
    let controllerRef;
    let heartbeat;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start: controller => {
        controllerRef = controller;
        this.sseClients.add(controller);
        controller.enqueue(encoder.encode('retry: 3000\n\nevent: live.ready\ndata: ' + JSON.stringify({ uid }) + '\n\n'));
        heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); }
          catch { clearInterval(heartbeat); this.sseClients.delete(controller); }
        }, 20000);
      },
      cancel: () => {
        if (heartbeat) clearInterval(heartbeat);
        if (controllerRef) this.sseClients.delete(controllerRef);
      }
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  }

  openWebSocket(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ ok: false, code: 'WEBSOCKET_UPGRADE_REQUIRED' }, 426);
    const uid = validUid(request.headers.get('x-smv-internal-uid'));
    if (!uid) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment?.({ uid, role: String(request.headers.get('x-smv-internal-role') || '') });
    server.send(JSON.stringify({ type: 'live.ready', uid }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    let event;
    try { event = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)); }
    catch { return; }
    if (event?.type === 'ping') {
      try { socket.send(JSON.stringify({ type: 'pong', atMs: Date.now() })); } catch {}
    }
  }

  webSocketClose(socket, code, reason) {
    try { socket.close(code || 1000, reason || 'closed'); } catch {}
  }

  webSocketError(socket) {
    try { socket.close(1011, 'socket error'); } catch {}
  }

  async alarm() {
    const record = await this.readRecord();
    const now = Date.now();
    await this.deliverScheduledBookingReminder(record);
    const due = record.deadlines.filter(item => item.atMs <= now);
    if (due.length) {
      const dueIds = new Set(due.map(item => item.deadlineId));
      record.deadlines = record.deadlines.filter(item => !dueIds.has(item.deadlineId));
      const pendingIds = new Set(record.pendingEvents.map(item => item.eventId));
      const deliveredIds = new Set(record.deliveredEventIds || []);
      for (const item of due) {
        const eventId = record.sessionId + ':' + item.deadlineId + ':' + item.generation;
        if (pendingIds.has(eventId) || deliveredIds.has(eventId)) continue;
        record.pendingEvents.push({
          eventId, type: 'live.session.deadline',
          sessionId: record.sessionId, deadlineType: item.type,
          deadlineAtMs: item.atMs, generation: item.generation,
          participantUid: item.participantUid || '',
          attempts: 0, nextAttemptAtMs: now
        });
      }
      await this.ctx.storage.put('live-session-record', record);
    }
    await this.deliverPending(record);
    await this.armNextAlarm(record);
  }

  async publishUserEvent(uid, event) {
    const hub = this.env.LIVE_USER_EVENT_HUB;
    if (!hub || typeof hub.idFromName !== 'function') {
      throw new Error('LIVE_USER_EVENT_HUB binding is unavailable; the terminal event remains queued for retry.');
    }
    try {
      const stub = hub.get(hub.idFromName(String(uid)));
      const response = await stub.fetch('https://live-user-hub.internal/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-smv-internal-caller': 'smv-backend'
        },
        body: JSON.stringify({
          targetUid: String(uid),
          eventId: String(event.eventId),
          type: String(event.type),
          data: event.data ?? null
        })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        throw new Error('LIVE_USER_EVENT_PUBLISH_FAILED: HTTP ' + response.status);
      }
      return result;
    } catch (error) {
      console.warn('[Live Session DO] User event fan-out deferred:', error?.message || error);
      throw error;
    }
  }

  async deliverViaD1(record) {
    const now = Date.now();
    for (const event of record.pendingEvents) {
      if (event.deliveredAtMs || Number(event.nextAttemptAtMs || 0) > now) continue;
      try {
        const result = await this.liveService.processDeadline({
          sessionId: event.sessionId,
          deadlineType: event.deadlineType,
          deadlineAtMs: event.deadlineAtMs,
          participantUid: event.participantUid || '',
          generation: event.generation
        });
        if (result?.nextDeadline) {
          const next = deadlineFrom({
            ...result.nextDeadline,
            generation: Number(event.generation || 0) + 1
          });
          if (next) {
            record.deadlines = record.deadlines.filter(item => item.type !== next.type);
            record.deadlines.push(next);
            record.deadlines.sort((a,b)=>a.atMs-b.atMs);
          }
        }
        const session = result?.session;
        const booking = result?.booking;
        const recipients = session
          ? [session.customerUid,session.astrologerUid]
          : booking ? [booking.customerUid,booking.astrologerUid] : [];
        for (const uid of [...new Set(recipients.filter(Boolean))]) {
          await this.publishUserEvent(uid, {
            eventId: event.eventId + ':' + uid,
            type: session ? (session.state === 'ended' ? 'live.session.ended' : 'live.session.updated') : 'live.booking.updated',
            data: session ? { session } : { booking }
          });
        }
        event.deliveredAtMs = Date.now();
        event.lastError = '';
      } catch (error) {
        event.attempts = Number(event.attempts || 0) + 1;
        const retry = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(event.attempts - 1, 4)));
        event.nextAttemptAtMs = Date.now() + retry;
        event.lastError = String(error?.message || error).slice(0, 240);
      }
    }
    const delivered = record.pendingEvents.filter(item => item.deliveredAtMs);
    for (const event of delivered) record.deliveredEventIds = remember(record.deliveredEventIds, event.eventId);
    record.pendingEvents = record.pendingEvents.filter(item => !item.deliveredAtMs);
    await this.ctx.storage.put('live-session-record', record);
  }

  async deliverPending(record) {
    // On the Free SQLite Durable Object plan, process deadline commands directly
    // against D1. No paid queue or separately deployed consumer is required.
    if (this.liveService) return this.deliverViaD1(record);
    const queue = this.env.LIVE_SESSION_EVENTS;
    const now = Date.now();
    if (!queue || typeof queue.send !== 'function') {
      for (const event of record.pendingEvents) {
        if (event.deliveredAtMs) continue;
        event.attempts = Number(event.attempts || 0) + 1;
        event.nextAttemptAtMs = now + Math.min(30000, RETRY_BASE_MS * (2 ** Math.min(event.attempts - 1, 3)));
        event.lastError = 'D1 binding and LIVE_SESSION_EVENTS queue binding are not configured';
      }
      await this.ctx.storage.put('live-session-record', record);
      return;
    }
    for (const event of record.pendingEvents) {
      if (event.deliveredAtMs || Number(event.nextAttemptAtMs || 0) > now) continue;
      try {
        await queue.send({
          eventId: event.eventId,
          type: event.type,
          sessionId: event.sessionId,
          deadlineType: event.deadlineType,
          deadlineAtMs: event.deadlineAtMs,
          generation: event.generation,
          participantUid: event.participantUid || ''
        });
        event.deliveredAtMs = Date.now();
      } catch (error) {
        event.attempts = Number(event.attempts || 0) + 1;
        const retry = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(event.attempts - 1, 4)));
        event.nextAttemptAtMs = Date.now() + retry;
        event.lastError = String(error?.message || error).slice(0, 240);
      }
    }
    const delivered = record.pendingEvents.filter(item => item.deliveredAtMs);
    for (const event of delivered) record.deliveredEventIds = remember(record.deliveredEventIds, event.eventId);
    record.pendingEvents = record.pendingEvents.filter(item => !item.deliveredAtMs);
    await this.ctx.storage.put('live-session-record', record);
  }
}

/**
 * One Durable Object per verified UID. WebSocket connections use the
 * hibernation-capable API; the legacy SSE bridge is retained for clients that
 * still consume text/event-stream and should be retired only after a client
 * protocol migration has been separately approved.
 */
export class LiveUserEventHub {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sseClients = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, durable: true, role: 'live-user-event-hub' });
    if (request.method === 'GET' && url.pathname === '/events') return this.openSse(request);
    if (request.method === 'GET' && url.pathname === '/ws') return this.openWebSocket(request);
    if (request.method === 'POST' && url.pathname === '/publish') return this.publish(request);
    return json({ ok: false, code: 'NOT_FOUND' }, 404);
  }

  async publish(request) {
    if (request.headers.get('x-smv-internal-caller') !== 'smv-backend') return json({ ok: false, code: 'INTERNAL_CALL_REQUIRED' }, 403);
    const body = await readJson(request);
    if (!body) return json({ ok: false, code: 'JSON_INVALID' }, 400);
    const targetUid = validUid(body.targetUid);
    const eventId = String(body.eventId || '').trim();
    const type = String(body.type || '').trim();
    if (!targetUid || !/^[A-Za-z0-9:_-]{1,240}$/.test(eventId) || !/^[a-zA-Z0-9._-]{1,100}$/.test(type)) {
      return json({ ok: false, code: 'EVENT_INVALID' }, 400);
    }
    const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {};
    const commit = async storage => {
      const recent = await storage.get('recent-event-ids') || [];
      if (recent.includes(eventId)) return { duplicate: true };
      const record = await storage.get('user-event-log') || { sequence: 0, events: [] };
      const sequence = Math.max(0, Math.trunc(Number(record.sequence) || 0)) + 1;
      const event = {
        ...data, eventId, targetUid, type, data: body.data ?? null,
        createdAtMs: Date.now(), sequence
      };
      const prior = Array.isArray(record.events) ? record.events : [];
      await storage.put('user-event-log', {
        sequence,
        events: [...prior, event].slice(-MAX_USER_EVENT_REPLAY)
      });
      await storage.put('recent-event-ids', remember(recent, eventId));
      return { duplicate: false, event };
    };
    const outcome = typeof this.ctx.storage.transaction === 'function'
      ? await this.ctx.storage.transaction(commit)
      : await commit(this.ctx.storage);
    if (outcome.duplicate) return json({ ok: true, duplicate: true, eventId });
    this.broadcast(outcome.event);
    return json({ ok: true, duplicate: false, eventId, sequence: outcome.event.sequence });
  }

  writeSseEvent(client, event) {
    const sequence = Math.max(0, Math.trunc(Number(event?.sequence) || 0));
    const frame = 'id: ' + sequence + '\nevent: ' + event.type + '\ndata: ' + JSON.stringify(event) + '\n\n';
    client.controller.enqueue(new TextEncoder().encode(frame));
  }

  broadcast(event) {
    for (const client of [...this.sseClients]) {
      if (client.replaying) {
        client.queued.push(event);
        continue;
      }
      try { this.writeSseEvent(client, event); }
      catch {
        this.sseClients.delete(client);
        if (client.heartbeat) clearInterval(client.heartbeat);
      }
    }
    for (const socket of this.ctx.getWebSockets?.() || []) {
      try { socket.send(JSON.stringify(event)); } catch { try { socket.close(1011, 'send failed'); } catch {} }
    }
  }

  async openSse(request) {
    const url = new URL(request.url);
    const uid = validUid(url.searchParams.get('uid'));
    const internalUid = validUid(request.headers.get('x-smv-internal-uid'));
    if (!uid || uid !== internalUid) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);
    const rawCursor = url.searchParams.get('after') ?? request.headers.get('last-event-id') ?? '0';
    const requestedCursor = Math.max(0, Math.trunc(Number(rawCursor) || 0));
    let clientRef = null;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start: controller => {
        clientRef = { controller, replaying: true, queued: [], heartbeat: null };
        this.sseClients.add(clientRef);
        clientRef.heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); }
          catch {
            if (clientRef.heartbeat) clearInterval(clientRef.heartbeat);
            this.sseClients.delete(clientRef);
          }
        }, 20000);
      },
      cancel: () => {
        if (!clientRef) return;
        if (clientRef.heartbeat) clearInterval(clientRef.heartbeat);
        this.sseClients.delete(clientRef);
      }
    });
    const response = new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
    try {
      const record = await this.ctx.storage.get('user-event-log') || { sequence: 0, events: [] };
      const latestSequence = Math.max(0, Math.trunc(Number(record.sequence) || 0));
      const resetCursor = requestedCursor > latestSequence;
      const after = resetCursor ? 0 : requestedCursor;
      const stored = Array.isArray(record.events) ? record.events : [];
      const firstSequence = Number(stored[0]?.sequence) || (latestSequence + 1);
      const replayGap = after > 0 && after < firstSequence - 1;
      for (const event of stored) {
        if (Number(event.sequence) <= after) continue;
        this.writeSseEvent(clientRef, { ...event, replayed: true });
      }
      // Events published while the replay snapshot was being read are queued.
      // The durable snapshot already includes events up to latestSequence.
      const queued = clientRef.queued.splice(0).sort((a, b) => Number(a.sequence) - Number(b.sequence));
      clientRef.replaying = false;
      let highestSent = latestSequence;
      for (const event of queued) {
        const sequence = Number(event.sequence) || 0;
        if (sequence <= latestSequence || sequence <= highestSent) continue;
        this.writeSseEvent(clientRef, event);
        highestSent = Math.max(highestSent, sequence);
      }
      const ready = {
        uid, cursor: highestSent, replayGap, resetCursor,
        replayedEvents: stored.filter(event => Number(event.sequence) > after).length
      };
      clientRef.controller.enqueue(encoder.encode(
        'id: ' + highestSent + '\nevent: live.ready\ndata: ' + JSON.stringify({ type: 'live.ready', ...ready }) + '\n\n'
      ));
    } catch (error) {
      console.warn('[Live Event Hub] Replay snapshot unavailable:', error?.message || error);
      if (clientRef) {
        const queued = clientRef.queued.splice(0).sort((a, b) => Number(a.sequence) - Number(b.sequence));
        clientRef.replaying = false;
        for (const event of queued) {
          try { this.writeSseEvent(clientRef, event); } catch { this.sseClients.delete(clientRef); break; }
        }
        try { clientRef.controller.enqueue(encoder.encode('event: live.ready\ndata: ' + JSON.stringify({ type: 'live.ready', uid, replayGap: true }) + '\n\n')); } catch {}
      }
    }
    return response;
  }

  openWebSocket(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ ok: false, code: 'WEBSOCKET_UPGRADE_REQUIRED' }, 426);
    const uid = validUid(request.headers.get('x-smv-internal-uid'));
    if (!uid) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment?.({ uid });
    server.send(JSON.stringify({ type: 'live.ready', uid }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    let value;
    try { value = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)); }
    catch { return; }
    if (value?.type === 'ping') {
      try { socket.send(JSON.stringify({ type: 'pong', atMs: Date.now() })); } catch {}
    }
  }
  webSocketClose(socket, code, reason) { try { socket.close(code || 1000, reason || 'closed'); } catch {} }
  webSocketError(socket) { try { socket.close(1011, 'socket error'); } catch {} }
}

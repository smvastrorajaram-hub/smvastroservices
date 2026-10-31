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
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';

const MAX_DEADLINES = 16;
const MAX_RECENT_IDS = 256;
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
  return { type, atMs, deadlineId, generation: Number.isSafeInteger(input?.generation) ? input.generation : 0 };
}

function freshRecord(sessionId) {
  return {
    sessionId,
    state: 'unknown',
    deadlines: [],
    pendingEvents: [],
    deliveredEventIds: [],
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
    this.liveService = env.DB && typeof env.DB.prepare === 'function' && typeof env.DB.batch === 'function'
      ? createD1LiveSessionService({
          db: env.DB,
          walletAdapter: createD1WalletAdapter({ db: env.DB }),
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
    const next = Math.min(deadlineAt, retryAt);
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
    else await this.ctx.storage.deleteAlarm();
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
    if (connected) {
      record.deadlines = record.deadlines.filter(item => item.type !== 'disconnect_grace');
    } else {
      const atMs = Number(body.disconnectDeadlineAtMs);
      const deadline = deadlineFrom({
        type: 'disconnect_grace', atMs,
        deadlineId: 'disconnect_grace:' + uid + ':' + atMs,
        generation: Number(body.generation || 0)
      });
      if (!deadline) return json({ ok: false, code: 'DEADLINE_INVALID' }, 400);
      record.deadlines = record.deadlines.filter(item => item.type !== 'disconnect_grace');
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
    if (!hub || typeof hub.idFromName !== 'function') return;
    try {
      const stub = hub.get(hub.idFromName(String(uid)));
      await stub.fetch('https://live-user-hub.internal/publish', {
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
    } catch (error) {
      console.warn('[Live Session DO] User event fan-out deferred:', error?.message || error);
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
          deadlineAtMs: event.deadlineAtMs
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
            type: session ? 'live.session.updated' : 'live.booking.updated',
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
          generation: event.generation
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
    const recent = await this.ctx.storage.get('recent-event-ids') || [];
    if (recent.includes(eventId)) return json({ ok: true, duplicate: true, eventId });
    const event = { eventId, targetUid, type, data: body.data ?? null, createdAtMs: Date.now() };
    const frame = JSON.stringify(event);
    for (const controller of [...this.sseClients]) {
      try { controller.enqueue(new TextEncoder().encode('event: ' + type + '\ndata: ' + frame + '\n\n')); }
      catch { this.sseClients.delete(controller); }
    }
    for (const socket of this.ctx.getWebSockets?.() || []) {
      try { socket.send(frame); } catch { try { socket.close(1011, 'send failed'); } catch {} }
    }
    await this.ctx.storage.put('recent-event-ids', remember(recent, eventId));
    return json({ ok: true, duplicate: false, eventId });
  }

  openSse(request) {
    const uid = validUid(new URL(request.url).searchParams.get('uid'));
    const internalUid = validUid(request.headers.get('x-smv-internal-uid'));
    if (!uid || uid !== internalUid) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);
    let controllerRef, heartbeat;
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
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' }
    });
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

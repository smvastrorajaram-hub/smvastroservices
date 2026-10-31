import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveSessionCoordinator, LiveUserEventHub } from '../src/live-session-coordinator.mjs';

class FakeStorage {
  constructor() { this.values = new Map(); this.alarmAt = null; }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async setAlarm(timestamp) { this.alarmAt = timestamp; }
  async deleteAlarm() { this.alarmAt = null; }
  async getAlarm() { return this.alarmAt; }
}

function fakeState({ queue = null } = {}) {
  const storage = new FakeStorage();
  const sent = [];
  const ctx = {
    storage,
    accepted: [],
    acceptWebSocket(socket) { this.accepted.push(socket); },
    getWebSockets() { return this.accepted; }
  };
  const env = queue ? { LIVE_SESSION_EVENTS: { async send(value) { sent.push(value); } } } : {};
  return { ctx, env, storage, sent };
}

function request(path, body, headers = {}) {
  return new Request('https://do.internal' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test('session coordinator stores deadlines durably and queues due event exactly once', async () => {
  const state = fakeState({ queue: true });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  const now = Date.now();
  const response = await coordinator.fetch(request('/schedule', {
    sessionId: 'session-1',
    state: 'ringing',
    deadlines: [{ type: 'ring_timeout', atMs: now - 10, deadlineId: 'ring:1', generation: 2 }]
  }));
  assert.equal(response.status, 200);
  const record = await state.storage.get('live-session-record');
  assert.equal(record.sessionId, 'session-1');
  assert.equal(record.deadlines.length, 1);
  assert.ok(await state.storage.getAlarm());

  await coordinator.alarm();
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].eventId, 'session-1:ring:1:2');
  assert.equal(state.sent[0].deadlineType, 'ring_timeout');

  await coordinator.alarm();
  assert.equal(state.sent.length, 1, 'repeated alarm does not enqueue the same deadline twice');
  const after = await state.storage.get('live-session-record');
  assert.equal(after.pendingEvents.length, 0);
  assert.ok(after.deliveredEventIds.includes('session-1:ring:1:2'));
});

test('deadline changes replace deadlines by type and allow explicit cancellation', async () => {
  const state = fakeState({ queue: true });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  await coordinator.fetch(request('/schedule', {
    sessionId: 'session-2',
    deadlines: [
      { type: 'ring_timeout', atMs: Date.now() + 10000, deadlineId: 'ring:old' },
      { type: 'call_connect_timeout', atMs: Date.now() + 20000, deadlineId: 'connect:1' }
    ]
  }));
  await coordinator.fetch(request('/schedule', {
    sessionId: 'session-2',
    deadlines: [{ type: 'ring_timeout', atMs: Date.now() + 30000, deadlineId: 'ring:new' }]
  }));
  let record = await state.storage.get('live-session-record');
  assert.deepEqual(record.deadlines.map(item => item.deadlineId), ['connect:1', 'ring:new']);

  const cancelled = await coordinator.fetch(request('/cancel-deadline', { type: 'call_connect_timeout' }));
  assert.equal((await cancelled.json()).cancelled, 1);
  record = await state.storage.get('live-session-record');
  assert.deepEqual(record.deadlines.map(item => item.deadlineId), ['ring:new']);
});

test('disconnection sets durable grace deadline and reconnection cancels it', async () => {
  const state = fakeState({ queue: true });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  await coordinator.fetch(request('/schedule', { sessionId: 'session-3', deadlines: [] }));
  const graceAt = Date.now() + 20000;
  const offline = await coordinator.fetch(request('/connection', {
    uid: 'customer_1', connected: false, disconnectDeadlineAtMs: graceAt, generation: 1
  }));
  assert.equal(offline.status, 200);
  let record = await state.storage.get('live-session-record');
  assert.equal(record.deadlines[0].type, 'disconnect_grace');

  const online = await coordinator.fetch(request('/connection', { uid: 'customer_1', connected: true }));
  assert.equal(online.status, 200);
  record = await state.storage.get('live-session-record');
  assert.equal(record.deadlines.length, 0);
});

test('missing event queue retains deadline command with bounded retry backoff', async () => {
  const state = fakeState();
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  await coordinator.fetch(request('/schedule', {
    sessionId: 'session-4',
    deadlines: [{ type: 'booking_expiry', atMs: Date.now() - 1, deadlineId: 'booking:1' }]
  }));
  await coordinator.alarm();
  const record = await state.storage.get('live-session-record');
  assert.equal(record.pendingEvents.length, 1);
  assert.equal(record.pendingEvents[0].attempts, 1);
  assert.ok(record.pendingEvents[0].nextAttemptAtMs > Date.now());
  assert.ok(record.pendingEvents[0].lastError.includes('queue binding is not configured'));
});

test('parameterized session identity is immutable and deadline inputs are validated', async () => {
  const state = fakeState({ queue: true });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  await coordinator.fetch(request('/schedule', { sessionId: 'session-5', deadlines: [] }));
  const mismatch = await coordinator.fetch(request('/schedule', {
    sessionId: 'session-6', deadlines: []
  }));
  assert.equal(mismatch.status, 409);

  const invalid = await coordinator.fetch(request('/schedule', {
    sessionId: 'session-5',
    deadlines: [{ type: 'run_arbitrary_code', atMs: Date.now() + 1000 }]
  }));
  assert.equal(invalid.status, 400);
});

test('DO SSE endpoint requires an authenticated UID assertion from the Worker', async () => {
  const state = fakeState();
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  const response = await coordinator.fetch(request('/events?uid=customer_1'));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'AUTH_REQUIRED');
});

test('per-user event hub deduplicates event IDs before broadcasting', async () => {
  const state = fakeState();
  const hub = new LiveUserEventHub(state.ctx, state.env);
  const headers = { 'x-smv-internal-caller': 'smv-backend' };
  const payload = { targetUid: 'customer_1', eventId: 'event:1', type: 'live.session.updated', data: { state: 'active' } };
  const first = await hub.fetch(request('/publish', payload, headers));
  assert.equal(first.status, 200);
  assert.equal((await first.json()).duplicate, false);
  const duplicate = await hub.fetch(request('/publish', payload, headers));
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
});

test('event hub rejects publish calls without internal Worker assertion', async () => {
  const state = fakeState();
  const hub = new LiveUserEventHub(state.ctx, state.env);
  const response = await hub.fetch(request('/publish', {
    targetUid: 'customer_1', eventId: 'event:2', type: 'live.session.updated'
  }));
  assert.equal(response.status, 403);
});

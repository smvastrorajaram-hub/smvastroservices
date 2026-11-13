import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveSessionCoordinator, LiveUserEventHub } from '../src/live-session-coordinator.mjs';

class FakeStorage {
  constructor() { this.values = new Map(); this.alarmAt = null; }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async transaction(callback) {
    return callback({ get: key => this.get(key), put: (key, value) => this.put(key, value) });
  }
  async setAlarm(timestamp) { this.alarmAt = timestamp; }
  async deleteAlarm() { this.alarmAt = null; }
  async getAlarm() { return this.alarmAt; }
}

function fakeState({ queue = null, extraEnv = {} } = {}) {
  const storage = new FakeStorage();
  const sent = [];
  const ctx = {
    storage,
    accepted: [],
    acceptWebSocket(socket) { this.accepted.push(socket); },
    getWebSockets() { return this.accepted; }
  };
  const env = { ...(queue ? { LIVE_SESSION_EVENTS: { async send(value) { sent.push(value); } } } : {}), ...extraEnv };
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
  assert.ok(record.pendingEvents[0].lastError.includes('LIVE_SESSION_EVENTS queue binding are not configured'));
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

test('per-user event hub replays missed events by sequence after an SSE reconnect', async () => {
  const state = fakeState();
  const hub = new LiveUserEventHub(state.ctx, state.env);
  const headers = { 'x-smv-internal-caller': 'smv-backend' };
  const payload = { targetUid: 'customer_1', eventId: 'event:replay:1', type: 'live.session.updated', data: { session: { id: 'session-1', state: 'preparing' } } };
  const published = await hub.fetch(request('/publish', payload, headers));
  assert.equal(published.status, 200);
  assert.equal((await published.json()).sequence, 1);

  const streamResponse = await hub.fetch(request('/events?uid=customer_1&after=0', undefined, { 'x-smv-internal-uid': 'customer_1' }));
  assert.equal(streamResponse.status, 200);
  const reader = streamResponse.body.getReader();
  const first = await reader.read();
  const frame = new TextDecoder().decode(first.value);
  assert.match(frame, /id: 1\nevent: live\.session\.updated\ndata:/);
  assert.match(frame, /"replayed":true/);
  await reader.cancel();

  const resumed = await hub.fetch(request('/events?uid=customer_1&after=1', undefined, { 'x-smv-internal-uid': 'customer_1' }));
  const resumedReader = resumed.body.getReader();
  const ready = await resumedReader.read();
  const readyFrame = new TextDecoder().decode(ready.value);
  assert.match(readyFrame, /event: live\.ready/);
  assert.doesNotMatch(readyFrame, /live\.session\.updated/);
  await resumedReader.cancel();
});

test('per-user event hub reports a replay gap when the requested cursor predates its bounded event log', async () => {
  const state = fakeState();
  const hub = new LiveUserEventHub(state.ctx, state.env);
  const headers = { 'x-smv-internal-caller': 'smv-backend' };
  for (let index = 1; index <= 205; index += 1) {
    await hub.fetch(request('/publish', {
      targetUid: 'customer_1', eventId: 'event:gap:' + index,
      type: 'live.session.updated', data: { index }
    }, headers));
  }
  const response = await hub.fetch(request('/events?uid=customer_1&after=1', undefined, { 'x-smv-internal-uid': 'customer_1' }));
  const reader = response.body.getReader();
  let output = '';
  for (let index = 0; index < 210; index += 1) {
    const item = await reader.read();
    if (item.done) break;
    output += new TextDecoder().decode(item.value);
    if (output.includes('event: live.ready')) break;
  }
  assert.match(output, /"replayGap":true/);
  assert.match(output, /"type":"live.ready"/);
  await reader.cancel();
});

test('event hub rejects publish calls without internal Worker assertion', async () => {
  const state = fakeState();
  const hub = new LiveUserEventHub(state.ctx, state.env);
  const response = await hub.fetch(request('/publish', {
    targetUid: 'customer_1', eventId: 'event:2', type: 'live.session.updated'
  }));
  assert.equal(response.status, 403);
});


test('scheduled booking sends an immediate native alert and durably arms the exact Preferred-Time reminder', async () => {
  const pushes = [];
  const state = fakeState({ extraEnv: {
    __sendScheduledBookingPush: async ({ reminder, type }) => {
      pushes.push({ bookingId: reminder.bookingId, type });
      return { sent: 1, registered: 1 };
    }
  } });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  const preferredAtMs = Date.now() + 60_000;
  const response = await coordinator.fetch(request('/schedule-booking-reminder', {
    bookingId: 'appointment-1', astrologerUid: 'astro-1', mode: 'call', preferredAtMs
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.deepEqual(pushes, [{ bookingId: 'appointment-1', type: 'scheduled_booking' }]);
  const record = await state.storage.get('live-session-record');
  assert.equal(record.bookingReminder.preferredAtMs, preferredAtMs);
  assert.equal(record.bookingReminder.initialPushSent, true);
  assert.equal(await state.storage.getAlarm(), preferredAtMs);
});

test('Preferred-Time reminder rings only after Astrologer acceptance and keeps the original two-minute grace', async () => {
  const pushes = [];
  let bookingStatus = 'requested';
  const state = fakeState({ extraEnv: {
    __sendScheduledBookingPush: async ({ reminder, type }) => {
      pushes.push({ bookingId: reminder.bookingId, type });
      return { sent: 1, registered: 1 };
    },
    __getScheduledBookingState: async reminder => ({ exists: true, astrologerUid: reminder.astrologerUid, bookingStatus })
  } });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  const preferredAtMs = Date.now() + 60_000;
  await coordinator.fetch(request('/schedule-booking-reminder', {
    bookingId: 'appointment-2', astrologerUid: 'astro-2', mode: 'chat', preferredAtMs
  }));
  let record = await state.storage.get('live-session-record');
  record.bookingReminder.preferredAtMs = Date.now() - 1;
  record.bookingReminder.preferredNextAttemptAtMs = Date.now() - 1;
  await state.storage.put('live-session-record', record);
  await coordinator.alarm();
  assert.equal(pushes.filter(item => item.type === 'scheduled_booking_reminder').length, 0);
  record = await state.storage.get('live-session-record');
  assert.ok(record.bookingReminder.preferredNextAttemptAtMs <= record.bookingReminder.preferredAtMs + 2 * 60_000);

  bookingStatus = 'accepted';
  record.bookingReminder.preferredNextAttemptAtMs = Date.now() - 1;
  await state.storage.put('live-session-record', record);
  await coordinator.alarm();
  assert.equal(pushes.filter(item => item.type === 'scheduled_booking_reminder').length, 1);
  assert.equal((await state.storage.get('live-session-record')).bookingReminder.preferredReminderSent, true);
});


test('accepted scheduled booking can stop its previously started native ringtone', async () => {
  const pushes = [];
  const state = fakeState({ extraEnv: {
    __sendScheduledBookingPush: async ({ reminder, type }) => {
      pushes.push({ bookingId: reminder.bookingId, type });
      return { sent: 1, registered: 1 };
    }
  } });
  const coordinator = new LiveSessionCoordinator(state.ctx, state.env);
  await coordinator.fetch(request('/schedule-booking-reminder', {
    bookingId: 'appointment-stop', astrologerUid: 'astro-stop', mode: 'call',
    preferredAtMs: Date.now() + 60_000
  }));
  const response = await coordinator.fetch(request('/stop-booking-ringtone', {
    bookingId: 'appointment-stop', astrologerUid: 'astro-stop'
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(pushes.map(item => item.type), ['scheduled_booking', 'stop_ringing']);
});

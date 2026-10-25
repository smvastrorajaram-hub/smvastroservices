'use strict';

const { walletLedgerDocId, parseRupeesToPaise } = require('./wallet-service');

const SESSIONS = 'smv_live_sessions';
const BOOKINGS = 'smv_live_bookings';
const WALLETS = 'smv_wallets';
const LEDGER = 'smv_wallet_transactions';
const USERS = 'smv_users';
const ASTROLOGERS = 'smv_astrologers';
const SETTINGS = 'smv_settings';
const DEFAULT_RATE_PAISE = 1000;
const ALLOWED_MINUTES = new Set([1, 2, 3, 5, 10]);
const RING_TIMEOUT_MS = 45_000;
const DISCONNECT_GRACE_MS = 20_000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_SIGNAL_BYTES = 100_000;

function httpError(status, message, code, details) {
  return Object.assign(new Error(message), { httpStatus: status, code, details });
}

function safePaise(value) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function timestampMillis(value) {
  try {
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value && typeof value.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const n = Date.parse(value);
      return Number.isFinite(n) ? n : 0;
    }
  } catch (_) {}
  return 0;
}

function billableMinutesForElapsedMs(elapsedMs, maximumMinutes) {
  const elapsed = Number(elapsedMs);
  const maximum = Number(maximumMinutes);
  if (!Number.isFinite(elapsed) || elapsed < 0 ||
      !Number.isSafeInteger(maximum) || maximum < 1) return null;
  if (elapsed === 0) return 0;
  return Math.min(maximum, Math.floor(elapsed / 60_000) + 1);
}

function calculateLiveSessionCharge({ elapsedMs, ratePerMinutePaise, maximumMinutes }) {
  const rate = Number(ratePerMinutePaise);
  const minutes = billableMinutesForElapsedMs(elapsedMs, maximumMinutes);
  if (minutes === null || !Number.isSafeInteger(rate) || rate < 0) return null;
  const amountPaise = minutes * rate;
  if (!Number.isSafeInteger(amountPaise)) return null;
  return { elapsedMs: Math.floor(Number(elapsedMs)), billableMinutes: minutes, amountPaise };
}

function pricingFromSnapshot(snapshot) {
  const data = snapshot && snapshot.exists ? (snapshot.data() || {}) : {};
  const callRate = Number(data.callRatePaise);
  const chatRate = Number(data.chatRatePaise);
  const maxConcurrent = Number(data.maxConcurrentSessions);
  return {
    callRatePaise: Number.isSafeInteger(callRate) && callRate >= 100 && callRate <= 1_000_000 ? callRate : DEFAULT_RATE_PAISE,
    chatRatePaise: Number.isSafeInteger(chatRate) && chatRate >= 100 && chatRate <= 1_000_000 ? chatRate : DEFAULT_RATE_PAISE,
    maxConcurrentSessions: Number.isSafeInteger(maxConcurrent) && maxConcurrent >= 1 && maxConcurrent <= 3 ? maxConcurrent : 1,
    updatedAt: data.updatedAt || null
  };
}

function liveSessionSafeView(id, data) {
  const d = data || {};
  return {
    id: String(id),
    customerUid: String(d.customerUid || ''),
    astrologerUid: String(d.astrologerUid || ''),
    astrologerId: String(d.astrologerId || d.astrologerUid || ''),
    astrologerName: String(d.astrologerName || 'Astrologer'),
    mode: String(d.mode || ''),
    minutes: Number(d.minutes || 0),
    ratePerMinutePaise: safePaise(d.ratePerMinutePaise),
    reservedAmountPaise: safePaise(d.reservedAmountPaise),
    status: String(d.status || d.state || ''),
    state: String(d.state || ''),
    createdAt: timestampMillis(d.createdAt) ? new Date(timestampMillis(d.createdAt)).toISOString() : null,
    acceptedAt: timestampMillis(d.acceptedAt) ? new Date(timestampMillis(d.acceptedAt)).toISOString() : null,
    startedAt: timestampMillis(d.startedAt) ? new Date(timestampMillis(d.startedAt)).toISOString() : null,
    endedAt: timestampMillis(d.endedAt) ? new Date(timestampMillis(d.endedAt)).toISOString() : null,
    actualChargePaise: safePaise(d.actualChargePaise),
    billableMinutes: safePaise(d.billableMinutes),
    releasedAmountPaise: safePaise(d.releasedAmountPaise),
    endReason: String(d.endReason || ''),
    customerReady: d.customerReady === true,
    astrologerReady: d.astrologerReady === true
  };
}

function createLiveSessionService({ db, FieldValue, crypto, requireUser, isAdminUser }) {
  if (!db || !FieldValue || !crypto || !requireUser || !isAdminUser) {
    throw new Error('Live Session service requires Firestore, FieldValue, crypto and auth helpers.');
  }

  const eventClients = new Map();
  const timeoutBySession = new Map();
  const disconnectByKey = new Map();
  const sessionsByUid = new Map();

  function hash(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  }

  function sessionRef(id) { return db.collection(SESSIONS).doc(String(id)); }
  function bookingRef(id) { return db.collection(BOOKINGS).doc(String(id)); }
  function walletRef(uid) { return db.collection(WALLETS).doc(String(uid)); }
  function astroRef(uid) { return db.collection(ASTROLOGERS).doc(String(uid)); }
  function userRef(uid) { return db.collection(USERS).doc(String(uid)); }
  function pricingRef() { return db.collection(SETTINGS).doc('liveSessionPricing'); }
  function nowTimestamp() { return FieldValue.serverTimestamp(); }

  async function roleFor(user) {
    if (await isAdminUser(user)) return 'admin';
    const snap = await userRef(user.uid).get();
    const role = String(snap.data()?.role || '').trim().toLowerCase();
    return ['customer', 'astrologer'].includes(role) ? role : '';
  }

  function sendTo(uid, payload) {
    const clients = eventClients.get(String(uid));
    if (!clients || !clients.size) return;
    const frame = 'data: ' + JSON.stringify(payload) + '\n\n';
    for (const res of [...clients]) {
      try { res.write(frame); } catch (_) {
        clients.delete(res);
      }
    }
  }

  function sendToParticipants(session, payload) {
    if (!session) return;
    sendTo(session.customerUid, payload);
    sendTo(session.astrologerUid, payload);
  }

  function trackSession(sessionId, customerUid, astrologerUid) {
    for (const uid of [customerUid, astrologerUid]) {
      if (!uid) continue;
      if (!sessionsByUid.has(uid)) sessionsByUid.set(uid, new Set());
      sessionsByUid.get(uid).add(sessionId);
      const timer = disconnectByKey.get(uid + ':' + sessionId);
      if (timer) { clearTimeout(timer); disconnectByKey.delete(uid + ':' + sessionId); }
    }
  }

  function untrackSession(sessionId, customerUid, astrologerUid) {
    for (const uid of [customerUid, astrologerUid]) {
      const set = sessionsByUid.get(uid);
      if (set) {
        set.delete(sessionId);
        if (!set.size) sessionsByUid.delete(uid);
      }
      const timer = disconnectByKey.get(uid + ':' + sessionId);
      if (timer) { clearTimeout(timer); disconnectByKey.delete(uid + ':' + sessionId); }
    }
    const timer = timeoutBySession.get(sessionId);
    if (timer) clearTimeout(timer);
    timeoutBySession.delete(sessionId);
  }

  function scheduleDisconnectEnd(uid, sessionId) {
    const key = uid + ':' + sessionId;
    if (disconnectByKey.has(key)) return;
    const timer = setTimeout(async () => {
      disconnectByKey.delete(key);
      if ((eventClients.get(uid) || new Set()).size) return;
      try {
        const snap = await sessionRef(sessionId).get();
        if (!snap.exists) return;
        const session = snap.data() || {};
        if (session.state !== 'ended') {
          await endSession(sessionId, '', 'network_disconnect', true);
        }
      } catch (error) {
        console.warn('[Live Session] Disconnect settlement deferred:', error?.message || error);
      }
    }, DISCONNECT_GRACE_MS);
    timer.unref?.();
    disconnectByKey.set(key, timer);
  }

  function scheduleSessionTimer(sessionId, data) {
    const existing = timeoutBySession.get(sessionId);
    if (existing) clearTimeout(existing);
    timeoutBySession.delete(sessionId);
    const d = data || {};
    if (d.state === 'ended') return;
    let dueAt = 0;
    let reason = 'no_answer';
    if (d.state === 'active') {
      const start = timestampMillis(d.startedAt);
      if (!start) return;
      dueAt = start + Math.max(1, Number(d.minutes || 1)) * 60_000;
      reason = 'duration_complete';
    } else if (d.state === 'ringing' || d.state === 'connecting') {
      dueAt = timestampMillis(d.createdAt) + RING_TIMEOUT_MS;
      reason = d.state === 'connecting' ? 'connection_failed' : 'no_answer';
    } else return;
    const timer = setTimeout(() => {
      timeoutBySession.delete(sessionId);
      endSession(sessionId, '', reason, true).catch(error =>
        console.error('[Live Session] Timer settlement failed:', error?.stack || error));
    }, Math.max(0, dueAt - Date.now()));
    timer.unref?.();
    timeoutBySession.set(sessionId, timer);
  }

  async function loadSessionForParticipant(sessionId, uid) {
    const snap = await sessionRef(sessionId).get();
    if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
    const data = snap.data() || {};
    if (data.customerUid !== uid && data.astrologerUid !== uid) {
      throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
    }
    const start = timestampMillis(data.startedAt);
    if (data.state === 'active' && start && Date.now() >= start + Number(data.minutes || 1) * 60_000) {
      const result = await endSession(sessionId, '', 'duration_complete', true);
      return { id: sessionId, data: result.session || data };
    }
    return { id: sessionId, data };
  }

  async function reserveInTransaction(tx, { uid, mode, minutes, rate, walletSnapshot, sessionId }) {
    const wallet = walletSnapshot && walletSnapshot.exists ? (walletSnapshot.data() || {}) : {};
    const available = safePaise(wallet.availableBalancePaise);
    const reserved = safePaise(wallet.reservedBalancePaise);
    const needed = minutes * rate;
    if (!Number.isSafeInteger(needed) || needed < 1) throw httpError(409, 'Session cost is invalid.', 'LIVE_PRICE_INVALID');
    if (available < needed) {
      throw httpError(409, 'Insufficient Wallet balance for the selected duration.', 'WALLET_INSUFFICIENT_BALANCE', {
        availableBalancePaise: available, requiredBalancePaise: needed, shortfallPaise: needed - available
      });
    }
    const nextAvailable = available - needed;
    const nextReserved = reserved + needed;
    if (!Number.isSafeInteger(nextReserved)) throw httpError(409, 'Wallet reserve exceeds the supported range.', 'WALLET_BALANCE_OVERFLOW');
    const ref = walletRef(uid);
    const ledgerRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_reserve', sessionId));
    const now = nowTimestamp();
    tx.set(ref, {
      ownerUid: uid, ownerRole: 'customer', currency: 'INR',
      availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved,
      version: safePaise(wallet.version) + 1, createdAt: wallet.createdAt || now, updatedAt: now
    }, { merge: true });
    tx.create(ledgerRef, {
      ownerUid: uid, ownerRole: 'customer', currency: 'INR',
      type: 'live_session_reserve', direction: 'reserve', amountPaise: needed,
      balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
      idempotencyKey: 'live-session:' + sessionId, referenceType: 'live_session', referenceId: sessionId,
      note: 'Wallet amount reserved for Live ' + mode, status: 'posted', createdAt: now
    });
    return { availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved, reservedAmountPaise: needed };
  }

  function validateActiveAstrologer(userProfile, astroProfile) {
    const userRole = String(userProfile?.role || '').toLowerCase();
    const status = String(astroProfile?.status || '').toLowerCase();
    if (userRole !== 'astrologer' || !['approved', 'active'].includes(status)) {
      throw httpError(409, 'This Astrologer is not approved for Live Sessions.', 'LIVE_ASTROLOGER_NOT_APPROVED');
    }
  }

  function makeSession({ id, customerUid, astrologerUid, astroProfile, mode, minutes, rate, reservedAmount, state, origin, fingerprint }) {
    return {
      sessionId: id, customerUid, astrologerUid,
      astrologerId: astrologerUid, astrologerName: String(astroProfile.name || 'Astrologer'),
      mode, minutes, ratePerMinutePaise: rate, reservedAmountPaise: reservedAmount,
      state, customerReady: false, astrologerReady: false,
      origin: origin || 'direct', payloadFingerprint: fingerprint,
      createdAt: nowTimestamp(), updatedAt: nowTimestamp(),
      acceptedAt: null, startedAt: null, endedAt: null,
      actualChargePaise: 0, billableMinutes: 0, releasedAmountPaise: 0
    };
  }

  async function createRequest({ customerUid, astrologerId, mode, minutes, requestId }) {
    const uid = String(customerUid || '').trim();
    const astroId = String(astrologerId || '').trim();
    const kind = String(mode || '').trim().toLowerCase();
    const length = Number(minutes);
    const reqId = String(requestId || '').trim();
    if (!uid || !astroId || astroId.length > 160) throw httpError(400, 'Select an Astrologer to continue.', 'LIVE_ASTROLOGER_REQUIRED');
    if (!['call', 'chat'].includes(kind)) throw httpError(400, 'Choose Call or Chat.', 'LIVE_MODE_INVALID');
    if (!ALLOWED_MINUTES.has(length)) throw httpError(400, 'Choose 1, 2, 3, 5 or 10 minutes.', 'LIVE_DURATION_INVALID');
    if (reqId.length < 8 || reqId.length > 128) throw httpError(400, 'A valid request ID is required. Please try again.', 'LIVE_REQUEST_ID_INVALID');
    const id = hash(uid + ':' + reqId);
    const fingerprint = hash(JSON.stringify({ customerUid: uid, astrologerId: astroId, mode: kind, minutes: length }));
    const sRef = sessionRef(id), bRef = bookingRef(id);
    const customerProfileRef = userRef(uid), astroProfileRef = userRef(astroId);
    const aRef = astroRef(astroId), wRef = walletRef(uid), pRef = pricingRef();
    const txResult = await db.runTransaction(async tx => {
      const [oldSession, oldBooking, customerSnap, astroUserSnap, astroSnap, walletSnap, pricingSnap] = await Promise.all([
        tx.get(sRef), tx.get(bRef), tx.get(customerProfileRef), tx.get(astroProfileRef),
        tx.get(aRef), tx.get(wRef), tx.get(pRef)
      ]);
      if (oldSession.exists || oldBooking.exists) {
        const old = oldSession.exists ? (oldSession.data() || {}) : (oldBooking.data() || {});
        if (old.payloadFingerprint !== fingerprint || old.customerUid !== uid || old.astrologerUid !== astroId) {
          throw httpError(409, 'This request ID was already used for different session details.', 'LIVE_IDEMPOTENCY_CONFLICT');
        }
        return { kind: oldSession.exists ? 'session' : 'booking', id, data: old, alreadyProcessed: true };
      }
      if (!customerSnap.exists || String(customerSnap.data()?.role || '').toLowerCase() !== 'customer') {
        throw httpError(403, 'Customer login is required to start a Live Session.', 'LIVE_CUSTOMER_REQUIRED');
      }
      if (!astroSnap.exists) throw httpError(404, 'The selected Astrologer was not found.', 'LIVE_ASTROLOGER_NOT_FOUND');
      const astro = astroSnap.data() || {};
      validateActiveAstrologer(astroUserSnap.data() || {}, astro);
      const pricing = pricingFromSnapshot(pricingSnap);
      const rate = kind === 'call' ? pricing.callRatePaise : pricing.chatRatePaise;
      const liveCount = safePaise(astro.activeSessionCount);
      const availability = String(astro.availabilityStatus || astro.onlineStatus || 'offline').toLowerCase();
      const canStartNow = availability === 'online' && liveCount < pricing.maxConcurrentSessions;
      if (!canStartNow) {
        const booking = {
          bookingId: id, customerUid: uid, astrologerUid: astroId, astrologerId: astroId,
          astrologerName: String(astro.name || 'Astrologer'), mode: kind, minutes: length,
          ratePerMinutePaise: rate, status: 'pending', origin: 'offline_queue',
          payloadFingerprint: fingerprint, createdAt: nowTimestamp(), updatedAt: nowTimestamp(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        tx.create(bRef, booking);
        if (availability === 'online' && liveCount >= pricing.maxConcurrentSessions) {
          tx.set(aRef, { availabilityStatus: 'busy', liveSessionBusyManaged: true, updatedAt: nowTimestamp() }, { merge: true });
        }
        return { kind: 'booking', id, data: booking, alreadyProcessed: false };
      }
      const customer = customerSnap.data() || {};
      const reserve = await reserveInTransaction(tx, { uid, mode: kind, minutes: length, rate, walletSnapshot: walletSnap, sessionId: id });
      const data = makeSession({
        id, customerUid: uid, astrologerUid: astroId, astroProfile: astro,
        mode: kind, minutes: length, rate, reservedAmount: reserve.reservedAmountPaise,
        state: 'ringing', origin: 'direct', fingerprint
      });
      tx.create(sRef, data);
      const nextCount = liveCount + 1;
      tx.set(aRef, {
        activeSessionCount: nextCount,
        availabilityStatus: nextCount >= pricing.maxConcurrentSessions ? 'busy' : availability,
        liveSessionBusyManaged: nextCount >= pricing.maxConcurrentSessions,
        updatedAt: nowTimestamp()
      }, { merge: true });
      return { kind: 'session', id, data, alreadyProcessed: false, wallet: reserve, customerName: customer.name || '' };
    });
    if (txResult.kind === 'session') {
      trackSession(id, uid, astroId);
      scheduleSessionTimer(id, txResult.data);
      sendTo(astroId, { type: 'live.session.request', session: liveSessionSafeView(id, txResult.data) });
      sendTo(uid, { type: 'live.session.updated', session: liveSessionSafeView(id, txResult.data) });
    } else if (txResult.kind === 'booking' && !txResult.alreadyProcessed) {
      sendTo(astroId, { type: 'live.booking.pending', booking: { id, ...txResult.data } });
      sendTo(uid, { type: 'live.booking.updated', booking: { id, ...txResult.data } });
    }
    return {
      success: true, kind: txResult.kind, alreadyProcessed: !!txResult.alreadyProcessed,
      session: txResult.kind === 'session' ? liveSessionSafeView(id, txResult.data) : null,
      booking: txResult.kind === 'booking' ? { id, ...txResult.data } : null,
      wallet: txResult.wallet || null
    };
  }

  async function acceptBooking({ bookingId, astrologerUid }) {
    const id = String(bookingId || '').trim();
    const uid = String(astrologerUid || '').trim();
    if (!id || !uid) throw httpError(400, 'Booking ID is required.', 'LIVE_BOOKING_ID_REQUIRED');
    const bRef = bookingRef(id), sRef = sessionRef(id), aRef = astroRef(uid);
    const astroUserRef = userRef(uid);
    const txResult = await db.runTransaction(async tx => {
      const [bSnap, sSnap, astroSnap, astroUserSnap, pricingSnap] = await Promise.all([
        tx.get(bRef), tx.get(sRef), tx.get(aRef), tx.get(astroUserRef), tx.get(pricingRef())
      ]);
      if (!bSnap.exists) throw httpError(404, 'Pending Live booking was not found.', 'LIVE_BOOKING_NOT_FOUND');
      const booking = bSnap.data() || {};
      if (booking.astrologerUid !== uid) throw httpError(403, 'This booking belongs to another Astrologer.', 'LIVE_BOOKING_FORBIDDEN');
      if (booking.status === 'accepted' && sSnap.exists) return { id, data: sSnap.data() || {}, alreadyProcessed: true };
      if (booking.status !== 'pending') throw httpError(409, 'This booking is no longer pending.', 'LIVE_BOOKING_NOT_PENDING');
      const created = timestampMillis(booking.createdAt);
      if (created && Date.now() - created > 7 * 24 * 60 * 60 * 1000) {
        tx.set(bRef, { status: 'expired', updatedAt: nowTimestamp(), endReason: 'booking_expired' }, { merge: true });
        return { expired: true, id };
      }
      if (!astroSnap.exists) throw httpError(404, 'Astrologer profile was not found.', 'LIVE_ASTROLOGER_NOT_FOUND');
      const astro = astroSnap.data() || {};
      validateActiveAstrologer(astroUserSnap.data() || {}, astro);
      const pricing = pricingFromSnapshot(pricingSnap);
      const liveCount = safePaise(astro.activeSessionCount);
      const availability = String(astro.availabilityStatus || astro.onlineStatus || 'offline').toLowerCase();
      if (availability !== 'online' || liveCount >= pricing.maxConcurrentSessions) {
        throw httpError(409, 'Set your Astrologer status to Online and finish any active session before accepting this booking.', 'LIVE_ASTROLOGER_BUSY');
      }
      if (sSnap.exists) throw httpError(409, 'A session already exists for this booking.', 'LIVE_BOOKING_SESSION_CONFLICT');
      const wRef = walletRef(booking.customerUid);
      const customerRef = userRef(booking.customerUid);
      const [walletSnap, customerSnap] = await Promise.all([tx.get(wRef), tx.get(customerRef)]);
      if (!customerSnap.exists || String(customerSnap.data()?.role || '').toLowerCase() !== 'customer') {
        throw httpError(403, 'The booking Customer account is not available.', 'LIVE_CUSTOMER_REQUIRED');
      }
      const rate = booking.mode === 'call' ? pricing.callRatePaise : pricing.chatRatePaise;
      const minutes = Number(booking.minutes);
      if (!ALLOWED_MINUTES.has(minutes)) throw httpError(409, 'Booking duration is invalid.', 'LIVE_DURATION_INVALID');
      const fingerprint = String(booking.payloadFingerprint || hash(id));
      const reserve = await reserveInTransaction(tx, {
        uid: booking.customerUid, mode: booking.mode, minutes, rate, walletSnapshot: walletSnap, sessionId: id
      });
      const data = makeSession({
        id, customerUid: booking.customerUid, astrologerUid: uid, astroProfile: astro,
        mode: booking.mode, minutes, rate, reservedAmount: reserve.reservedAmountPaise,
        state: 'ringing', origin: 'accepted_booking', fingerprint
      });
      tx.create(sRef, data);
      tx.set(bRef, {
        status: 'accepted', sessionId: id, acceptedAt: nowTimestamp(),
        ratePerMinutePaise: rate, reservedAmountPaise: reserve.reservedAmountPaise, updatedAt: nowTimestamp()
      }, { merge: true });
      const nextCount = liveCount + 1;
      tx.set(aRef, {
        activeSessionCount: nextCount,
        availabilityStatus: nextCount >= pricing.maxConcurrentSessions ? 'busy' : availability,
        liveSessionBusyManaged: nextCount >= pricing.maxConcurrentSessions,
        updatedAt: nowTimestamp()
      }, { merge: true });
      return { id, data, alreadyProcessed: false, wallet: reserve };
    });
    if (txResult.expired) throw httpError(410, 'This booking has expired.', 'LIVE_BOOKING_EXPIRED');
    if (!txResult.alreadyProcessed) {
      trackSession(id, txResult.data.customerUid, txResult.data.astrologerUid);
      scheduleSessionTimer(id, txResult.data);
      sendTo(txResult.data.customerUid, { type: 'live.session.request', session: liveSessionSafeView(id, txResult.data) });
      sendTo(txResult.data.astrologerUid, { type: 'live.session.updated', session: liveSessionSafeView(id, txResult.data) });
      sendTo(txResult.data.customerUid, { type: 'live.booking.updated', booking: { id, status: 'accepted', sessionId: id } });
    }
    return { success: true, alreadyProcessed: !!txResult.alreadyProcessed, session: liveSessionSafeView(id, txResult.data), wallet: txResult.wallet || null };
  }

  async function acceptSession(sessionId, astrologerUid) {
    const id = String(sessionId || '').trim(), uid = String(astrologerUid || '').trim();
    const ref = sessionRef(id);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
      const session = snap.data() || {};
      if (session.astrologerUid !== uid) throw httpError(403, 'This request belongs to another Astrologer.', 'LIVE_SESSION_FORBIDDEN');
      if (session.state === 'connecting' || session.state === 'active') return { data: session, alreadyProcessed: true };
      if (session.state !== 'ringing') throw httpError(409, 'This request is no longer ringing.', 'LIVE_SESSION_NOT_RINGING');
      const updated = { ...session, state: 'connecting', acceptedAt: nowTimestamp(), updatedAt: nowTimestamp() };
      tx.set(ref, { state: 'connecting', acceptedAt: updated.acceptedAt, updatedAt: updated.updatedAt }, { merge: true });
      return { data: updated, alreadyProcessed: false };
    });
    scheduleSessionTimer(id, result.data);
    sendToParticipants(result.data, { type: 'live.session.updated', session: liveSessionSafeView(id, result.data) });
    return { success: true, alreadyProcessed: !!result.alreadyProcessed, session: liveSessionSafeView(id, result.data) };
  }

  async function readySession(sessionId, uid, mediaConnected) {
    const id = String(sessionId || '').trim(), actor = String(uid || '').trim();
    const ref = sessionRef(id);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
      const session = snap.data() || {};
      if (session.customerUid !== actor && session.astrologerUid !== actor) throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
      if (session.state === 'ended') throw httpError(409, 'This Live Session has already ended.', 'LIVE_SESSION_ENDED');
      if (!['connecting', 'active'].includes(session.state)) throw httpError(409, 'The other participant has not accepted this session yet.', 'LIVE_SESSION_NOT_ACCEPTED');
      if (session.mode === 'call' && mediaConnected !== true) throw httpError(400, 'Voice Call must be connected before billing starts.', 'LIVE_CALL_NOT_CONNECTED');
      const field = session.customerUid === actor ? 'customerReady' : 'astrologerReady';
      const customerReady = field === 'customerReady' ? true : session.customerReady === true;
      const astrologerReady = field === 'astrologerReady' ? true : session.astrologerReady === true;
      const start = session.state !== 'active' && customerReady && astrologerReady;
      const patch = { [field]: true, updatedAt: nowTimestamp() };
      if (start) {
        patch.state = 'active';
        patch.startedAt = nowTimestamp();
        patch.startConfirmedByServer = true;
      }
      tx.set(ref, patch, { merge: true });
      return { data: { ...session, ...patch, customerReady, astrologerReady, state: start ? 'active' : session.state }, started: start };
    });
    if (result.started) {
      trackSession(id, result.data.customerUid, result.data.astrologerUid);
      scheduleSessionTimer(id, result.data);
    }
    sendToParticipants(result.data, { type: 'live.session.updated', session: liveSessionSafeView(id, result.data) });
    return { success: true, started: result.data.state === 'active', session: liveSessionSafeView(id, result.data) };
  }

  async function endSession(sessionId, actorUid, reason, system = false) {
    const id = String(sessionId || '').trim(), actor = String(actorUid || '').trim();
    if (!id) throw httpError(400, 'Live Session ID is required.', 'LIVE_SESSION_ID_REQUIRED');
    const sRef = sessionRef(id);
    const result = await db.runTransaction(async tx => {
      const sSnap = await tx.get(sRef);
      if (!sSnap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
      const session = sSnap.data() || {};
      if (!system && session.customerUid !== actor && session.astrologerUid !== actor) {
        throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
      }
      const wRef = walletRef(session.customerUid), aRef = astroRef(session.astrologerUid), bRef = bookingRef(id);
      const [wSnap, aSnap, bSnap] = await Promise.all([tx.get(wRef), tx.get(aRef), tx.get(bRef)]);
      const wallet = wSnap.exists ? (wSnap.data() || {}) : {};
      const astro = aSnap.exists ? (aSnap.data() || {}) : {};
      if (session.state === 'ended') {
        return {
          alreadyProcessed: true, session,
          wallet: { availableBalancePaise: safePaise(wallet.availableBalancePaise), reservedBalancePaise: safePaise(wallet.reservedBalancePaise) }
        };
      }
      const now = Date.now();
      const startedAt = timestampMillis(session.startedAt);
      const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
      const pricing = calculateLiveSessionCharge({
        elapsedMs, ratePerMinutePaise: safePaise(session.ratePerMinutePaise),
        maximumMinutes: Number(session.minutes || 1)
      });
      if (!pricing) throw httpError(500, 'Unable to calculate the Live Session charge safely.', 'LIVE_BILLING_CALCULATION_FAILED');
      const reservedAmount = safePaise(session.reservedAmountPaise);
      const charge = Math.min(reservedAmount, pricing.amountPaise);
      const release = reservedAmount - charge;
      const available = safePaise(wallet.availableBalancePaise);
      const reserved = safePaise(wallet.reservedBalancePaise);
      if (reserved < reservedAmount) {
        throw httpError(409, 'Wallet reserved balance does not reconcile with this Live Session. The session was not silently settled.', 'LIVE_WALLET_RESERVE_MISMATCH');
      }
      const nextAvailable = available + release;
      const nextReserved = reserved - reservedAmount;
      if (!Number.isSafeInteger(nextAvailable) || !Number.isSafeInteger(nextReserved)) {
        throw httpError(409, 'Wallet settlement exceeds the supported balance range.', 'WALLET_BALANCE_OVERFLOW');
      }
      const nowServer = nowTimestamp();
      tx.set(wRef, {
        availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved,
        version: safePaise(wallet.version) + 1, updatedAt: nowServer
      }, { merge: true });
      if (charge > 0) {
        const usageRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_usage', id));
        tx.create(usageRef, {
          ownerUid: session.customerUid, ownerRole: 'customer', currency: 'INR',
          type: 'live_session_usage', direction: 'debit', amountPaise: charge,
          balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
          idempotencyKey: 'live-session-usage:' + id, referenceType: 'live_session', referenceId: id,
          note: 'Live ' + session.mode + ' used ' + pricing.billableMinutes + ' started minute(s)',
          status: 'posted', createdAt: nowServer
        });
      }
      if (release > 0) {
        const releaseRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_unused_release', id));
        tx.create(releaseRef, {
          ownerUid: session.customerUid, ownerRole: 'customer', currency: 'INR',
          type: 'live_session_unused_release', direction: 'credit', amountPaise: release,
          balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
          idempotencyKey: 'live-session-release:' + id, referenceType: 'live_session', referenceId: id,
          note: 'Unused Live ' + session.mode + ' Wallet reserve released', status: 'posted', createdAt: nowServer
        });
      }
      const prevCount = safePaise(astro.activeSessionCount);
      const nextCount = Math.max(0, prevCount - 1);
      const astroPatch = { activeSessionCount: nextCount, updatedAt: nowServer };
      if (String(astro.availabilityStatus || '').toLowerCase() === 'busy' &&
          astro.liveSessionBusyManaged === true && nextCount < 1) {
        astroPatch.availabilityStatus = 'online';
        astroPatch.liveSessionBusyManaged = false;
      }
      tx.set(aRef, astroPatch, { merge: true });
      const finalReason = String(reason || 'participant_ended').slice(0, 80);
      const finalState = {
        state: 'ended', endedAt: nowServer, updatedAt: nowServer,
        endedByUid: actor || 'server', endReason: finalReason,
        connectedDurationMs: elapsedMs, billableMinutes: pricing.billableMinutes,
        actualChargePaise: charge, releasedAmountPaise: release,
        availableBalanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved
      };
      tx.set(sRef, finalState, { merge: true });
      if (bSnap.exists) {
        tx.set(bRef, {
          status: startedAt ? 'completed' : (finalReason === 'rejected' ? 'rejected' : 'cancelled'),
          endedAt: nowServer, endReason: finalReason, actualChargePaise: charge,
          releasedAmountPaise: release, updatedAt: nowServer
        }, { merge: true });
      }
      return {
        alreadyProcessed: false, session: { ...session, ...finalState },
        wallet: { availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved }
      };
    });
    untrackSession(id, result.session.customerUid, result.session.astrologerUid);
    if (!result.alreadyProcessed) {
      sendToParticipants(result.session, {
        type: 'live.session.ended',
        session: liveSessionSafeView(id, result.session),
        wallet: { availableBalancePaise: result.wallet.availableBalancePaise, reservedBalancePaise: result.wallet.reservedBalancePaise },
        message: 'Low Wallet Balance — Session ended'
      });
    }
    return {
      success: true, alreadyProcessed: !!result.alreadyProcessed,
      session: liveSessionSafeView(id, result.session), wallet: result.wallet
    };
  }

  async function rejectOrCancel(sessionId, user, reason) {
    const snap = await sessionRef(sessionId).get();
    if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
    const session = snap.data() || {};
    if (session.state === 'active') throw httpError(409, 'An active session must be ended, not rejected.', 'LIVE_SESSION_ALREADY_ACTIVE');
    if (session.astrologerUid !== user.uid && session.customerUid !== user.uid) {
      throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
    }
    if (reason === 'rejected' && session.astrologerUid !== user.uid) {
      throw httpError(403, 'Only the Astrologer can reject an incoming request.', 'LIVE_SESSION_FORBIDDEN');
    }
    return endSession(sessionId, user.uid, reason, false);
  }

  async function cancelBooking(bookingId, userUid) {
    const id = String(bookingId || '').trim();
    const ref = bookingRef(id);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Live booking was not found.', 'LIVE_BOOKING_NOT_FOUND');
      const booking = snap.data() || {};
      if (booking.customerUid !== userUid) throw httpError(403, 'This booking belongs to another Customer.', 'LIVE_BOOKING_FORBIDDEN');
      if (booking.status !== 'pending') throw httpError(409, 'Only pending bookings can be cancelled.', 'LIVE_BOOKING_NOT_PENDING');
      tx.set(ref, { status: 'cancelled', cancelledAt: nowTimestamp(), updatedAt: nowTimestamp() }, { merge: true });
      return { ...booking, status: 'cancelled', bookingId: id };
    });
    sendTo(result.astrologerUid, { type: 'live.booking.updated', booking: { id, status: 'cancelled' } });
    sendTo(result.customerUid, { type: 'live.booking.updated', booking: { id, status: 'cancelled' } });
    return { success: true, booking: result };
  }

  async function sendMessage(sessionId, senderUid, text) {
    const body = String(text || '').trim();
    if (!body || body.length > MAX_MESSAGE_CHARS) {
      throw httpError(400, 'Enter a message of up to 4,000 characters.', 'LIVE_MESSAGE_INVALID');
    }
    const loaded = await loadSessionForParticipant(sessionId, senderUid);
    const session = loaded.data;
    if (session.mode !== 'chat') throw httpError(409, 'Text messages are available only in a Live Chat session.', 'LIVE_MODE_MISMATCH');
    if (session.state !== 'active') throw httpError(409, 'Messages can only be sent during an active Live Chat.', 'LIVE_SESSION_NOT_ACTIVE');
    const msgRef = sessionRef(sessionId).collection('messages').doc(crypto.randomUUID());
    const message = {
      messageId: msgRef.id, sessionId: String(sessionId), senderUid,
      text: body, createdAt: nowTimestamp()
    };
    await msgRef.create(message);
    const recipientUid = senderUid === session.customerUid ? session.astrologerUid : session.customerUid;
    const safe = { id: msgRef.id, sessionId: String(sessionId), senderUid, text: body, createdAt: new Date().toISOString() };
    sendTo(recipientUid, { type: 'live.chat.message', message: safe });
    return { success: true, message: safe };
  }

  async function signal(sessionId, senderUid, type, payload) {
    const signalType = String(type || '').trim().toLowerCase();
    if (!['offer', 'answer', 'ice'].includes(signalType)) {
      throw httpError(400, 'Unsupported WebRTC signal type.', 'LIVE_SIGNAL_INVALID');
    }
    const serialized = JSON.stringify(payload ?? {});
    if (serialized.length > MAX_SIGNAL_BYTES) throw httpError(413, 'WebRTC signal is too large.', 'LIVE_SIGNAL_TOO_LARGE');
    if (!payload || typeof payload !== 'object') throw httpError(400, 'WebRTC signal payload is invalid.', 'LIVE_SIGNAL_INVALID');
    const loaded = await loadSessionForParticipant(sessionId, senderUid);
    const session = loaded.data;
    if (session.mode !== 'call') throw httpError(409, 'WebRTC signals are only available for voice calls.', 'LIVE_MODE_MISMATCH');
    if (!['connecting', 'active'].includes(session.state)) throw httpError(409, 'The Live Call is not connecting.', 'LIVE_SESSION_NOT_CONNECTING');
    const signalRef = sessionRef(sessionId).collection('signals').doc(crypto.randomUUID());
    const data = {
      signalId: signalRef.id, sessionId: String(sessionId), senderUid, type: signalType,
      payload, createdAt: nowTimestamp()
    };
    await signalRef.create(data);
    const recipientUid = senderUid === session.customerUid ? session.astrologerUid : session.customerUid;
    sendTo(recipientUid, {
      type: 'live.call.signal',
      signal: { id: signalRef.id, sessionId: String(sessionId), senderUid, type: signalType, payload }
    });
    return { success: true, signalId: signalRef.id };
  }

  async function listSessions(uid, role) {
    const field = role === 'astrologer' ? 'astrologerUid' : 'customerUid';
    const snap = await db.collection(SESSIONS).where(field, '==', uid).limit(100).get();
    const rows = snap.docs.map(d => liveSessionSafeView(d.id, d.data() || {}));
    rows.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
    const due = rows.filter(row => row.state === 'active' && row.startedAt &&
      Date.now() >= Date.parse(row.startedAt) + row.minutes * 60_000);
    for (const row of due) {
      try { await endSession(row.id, '', 'duration_complete', true); } catch (e) { console.warn('[Live Session] Expiry check failed:', e?.message || e); }
    }
    return rows;
  }

  async function listBookings(astrologerUid) {
    const snap = await db.collection(BOOKINGS).where('astrologerUid', '==', astrologerUid).limit(100).get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))
      .filter(d => ['pending', 'accepted'].includes(String(d.status || '')))
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .map(d => ({
        id: d.id, customerUid: d.customerUid, astrologerUid: d.astrologerUid,
        astrologerName: d.astrologerName, mode: d.mode, minutes: d.minutes,
        ratePerMinutePaise: safePaise(d.ratePerMinutePaise), status: d.status,
        createdAt: timestampMillis(d.createdAt) ? new Date(timestampMillis(d.createdAt)).toISOString() : null,
        expiresAt: timestampMillis(d.expiresAt) ? new Date(timestampMillis(d.expiresAt)).toISOString() : null
      }));
  }

  function replyError(res, error, fallback) {
    const status = Number(error?.httpStatus) || 500;
    if (status >= 500) console.error('[Live Session]', error?.stack || error);
    return res.status(status).json({
      success: false,
      error: status >= 500 ? fallback : (error?.message || fallback),
      code: error?.code || 'LIVE_SESSION_ERROR',
      ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {})
    });
  }

  async function requireRole(req, res, allowed) {
    const user = await requireUser(req, res);
    if (!user) return null;
    try {
      const role = await roleFor(user);
      if (!allowed.includes(role)) {
        res.status(403).json({ success: false, error: 'This action is not allowed for your SMV ASTRO role.', code: 'LIVE_ROLE_FORBIDDEN' });
        return null;
      }
      return { user, role };
    } catch (error) {
      replyError(res, error, 'Unable to verify the account role.');
      return null;
    }
  }

  const app = arguments[0].app;
  if (!app) throw new Error('Live Session service requires Express app.');

  app.get('/live/pricing', async (_req, res) => {
    try {
      const snap = await pricingRef().get();
      const p = pricingFromSnapshot(snap);
      return res.set('Cache-Control', 'no-store').json({
        success: true, callRatePaise: p.callRatePaise, chatRatePaise: p.chatRatePaise,
        callRatePerMinute: p.callRatePaise / 100, chatRatePerMinute: p.chatRatePaise / 100,
        maxConcurrentSessions: p.maxConcurrentSessions, currency: 'INR',
        updatedAt: timestampMillis(p.updatedAt) ? new Date(timestampMillis(p.updatedAt)).toISOString() : null
      });
    } catch (error) { return replyError(res, error, 'Unable to load Live Call / Chat prices.'); }
  });

  app.post('/admin/live/pricing', async (req, res) => {
    const auth = await requireRole(req, res, ['admin']);
    if (!auth) return;
    try {
      const callRate = parseRupeesToPaise(req.body?.callRatePerMinute);
      const chatRate = parseRupeesToPaise(req.body?.chatRatePerMinute);
      const maximum = Number(req.body?.maxConcurrentSessions ?? 1);
      if (callRate === null || chatRate === null || callRate < 100 || chatRate < 100 ||
          callRate > 1_000_000 || chatRate > 1_000_000) {
        return res.status(400).json({ success: false, error: 'Enter Call and Chat prices from ₹1.00 to ₹10,000.00 per minute, with up to two decimal places.', code: 'LIVE_PRICE_INVALID' });
      }
      if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 3) {
        return res.status(400).json({ success: false, error: 'Maximum concurrent sessions must be between 1 and 3.', code: 'LIVE_CONCURRENCY_INVALID' });
      }
      await pricingRef().set({
        callRatePaise: callRate, chatRatePaise: chatRate, maxConcurrentSessions: maximum,
        currency: 'INR', updatedBy: auth.user.uid, updatedAt: nowTimestamp()
      }, { merge: true });
      return res.set('Cache-Control', 'no-store').json({
        success: true, callRatePaise: callRate, chatRatePaise: chatRate,
        callRatePerMinute: callRate / 100, chatRatePerMinute: chatRate / 100,
        maxConcurrentSessions: maximum
      });
    } catch (error) { return replyError(res, error, 'Unable to save Live Call / Chat prices.'); }
  });

  app.get('/live/events', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    const uid = auth.user.uid;
    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders?.();
    res.write('retry: 3000\n\n');
    res.write('data: ' + JSON.stringify({ type: 'live.ready', uid }) + '\n\n');
    if (!eventClients.has(uid)) eventClients.set(uid, new Set());
    const set = eventClients.get(uid);
    set.add(res);
    for (const id of sessionsByUid.get(uid) || []) {
      const timer = disconnectByKey.get(uid + ':' + id);
      if (timer) { clearTimeout(timer); disconnectByKey.delete(uid + ':' + id); }
    }
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch (_) {}
    }, 20_000);
    heartbeat.unref?.();
    req.on('close', () => {
      clearInterval(heartbeat);
      set.delete(res);
      if (!set.size) eventClients.delete(uid);
      if (!(eventClients.get(uid) || new Set()).size) {
        for (const id of sessionsByUid.get(uid) || []) scheduleDisconnectEnd(uid, id);
      }
    });
  });

  app.post('/live/requests', async (req, res) => {
    const auth = await requireRole(req, res, ['customer']);
    if (!auth) return;
    try {
      const result = await createRequest({
        customerUid: auth.user.uid, astrologerId: req.body?.astrologerId,
        mode: req.body?.mode, minutes: req.body?.minutes, requestId: req.body?.requestId
      });
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to create the Live Call / Chat request.'); }
  });

  app.get('/live/sessions', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try {
      const sessions = await listSessions(auth.user.uid, auth.role);
      return res.set('Cache-Control', 'no-store').json({ success: true, sessions });
    } catch (error) { return replyError(res, error, 'Unable to load Live Sessions.'); }
  });

  app.get('/live/bookings/pending', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try {
      const bookings = await listBookings(auth.user.uid);
      return res.set('Cache-Control', 'no-store').json({ success: true, bookings });
    } catch (error) { return replyError(res, error, 'Unable to load pending Live bookings.'); }
  });

  app.post('/live/bookings/:id/accept', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try {
      const result = await acceptBooking({ bookingId: req.params.id, astrologerUid: auth.user.uid });
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to accept the Live booking.'); }
  });

  app.post('/live/bookings/:id/cancel', async (req, res) => {
    const auth = await requireRole(req, res, ['customer']);
    if (!auth) return;
    try { return res.json(await cancelBooking(req.params.id, auth.user.uid)); }
    catch (error) { return replyError(res, error, 'Unable to cancel the Live booking.'); }
  });

  app.post('/live/sessions/:id/accept', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try {
      const result = await acceptSession(req.params.id, auth.user.uid);
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to accept the incoming Live request.'); }
  });

  app.post('/live/sessions/:id/reject', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try { return res.json(await rejectOrCancel(req.params.id, auth.user, 'rejected')); }
    catch (error) { return replyError(res, error, 'Unable to reject this Live request.'); }
  });

  app.post('/live/sessions/:id/end', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try {
      const result = await endSession(req.params.id, auth.user.uid, String(req.body?.reason || 'participant_ended').slice(0, 80), false);
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to end the Live Session safely.'); }
  });

  app.post('/live/sessions/:id/ready', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try {
      const result = await readySession(req.params.id, auth.user.uid, req.body?.mediaConnected === true);
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to confirm the Live Session connection.'); }
  });

  app.post('/live/sessions/:id/signal', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try { return res.json(await signal(req.params.id, auth.user.uid, req.body?.type, req.body?.payload)); }
    catch (error) { return replyError(res, error, 'Unable to relay the WebRTC signal.'); }
  });

  app.get('/live/sessions/:id/signals', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try {
      const loaded = await loadSessionForParticipant(req.params.id, auth.user.uid);
      if (loaded.data.mode !== 'call') return res.status(409).json({ success: false, error: 'WebRTC signals are available only for voice calls.' });
      const snap = await sessionRef(req.params.id).collection('signals').orderBy('createdAt', 'desc').limit(50).get();
      const signals = snap.docs.map(d => {
        const s = d.data() || {};
        return { id: d.id, sessionId: req.params.id, senderUid: s.senderUid, type: s.type, payload: s.payload, createdAt: timestampMillis(s.createdAt) ? new Date(timestampMillis(s.createdAt)).toISOString() : null };
      }).reverse();
      return res.set('Cache-Control', 'no-store').json({ success: true, signals });
    } catch (error) { return replyError(res, error, 'Unable to load WebRTC signals.'); }
  });

  app.post('/live/sessions/:id/messages', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try { return res.set('Cache-Control', 'no-store').json(await sendMessage(req.params.id, auth.user.uid, req.body?.text)); }
    catch (error) { return replyError(res, error, 'Unable to send the Live Chat message.'); }
  });

  app.get('/live/sessions/:id/messages', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    try {
      const loaded = await loadSessionForParticipant(req.params.id, auth.user.uid);
      if (loaded.data.mode !== 'chat') return res.status(409).json({ success: false, error: 'Messages are available only in Live Chat.' });
      const snap = await sessionRef(req.params.id).collection('messages').orderBy('createdAt', 'asc').limit(100).get();
      const messages = snap.docs.map(d => {
        const m = d.data() || {};
        return { id: d.id, sessionId: req.params.id, senderUid: m.senderUid, text: m.text, createdAt: timestampMillis(m.createdAt) ? new Date(timestampMillis(m.createdAt)).toISOString() : null };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, messages });
    } catch (error) { return replyError(res, error, 'Unable to load Live Chat messages.'); }
  });

  async function restoreTimers() {
    try {
      const snap = await db.collection(SESSIONS).where('state', 'in', ['ringing', 'connecting', 'active']).limit(100).get();
      for (const doc of snap.docs) {
        const d = doc.data() || {};
        trackSession(doc.id, d.customerUid, d.astrologerUid);
        scheduleSessionTimer(doc.id, d);
      }
    } catch (error) {
      console.warn('[Live Session] Active timer restore skipped:', error?.message || error);
    }
  }
  restoreTimers().catch(() => {});

  return { createRequest, acceptBooking, acceptSession, readySession, endSession, sendMessage, signal, listSessions, listBookings };
}

function registerLiveSessionRoutes(options) {
  return createLiveSessionService(options);
}

module.exports = {
  registerLiveSessionRoutes,
  createLiveSessionService,
  billableMinutesForElapsedMs,
  calculateLiveSessionCharge,
  pricingFromSnapshot,
  liveSessionSafeView,
  DEFAULT_RATE_PAISE,
  ALLOWED_MINUTES: [...ALLOWED_MINUTES]
};

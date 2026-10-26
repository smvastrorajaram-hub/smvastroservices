'use strict';

const { walletLedgerDocId, parseRupeesToPaise } = require('./wallet-service');

const SESSIONS = 'smv_live_sessions';
const BOOKINGS = 'smv_live_bookings';
const WALLETS = 'smv_wallets';
const LEDGER = 'smv_wallet_transactions';
const USERS = 'smv_users';
const ASTROLOGERS = 'smv_astrologers';
const SETTINGS = 'smv_settings';
const DEFAULT_RATE_PAISE = 1000; // Legacy admin display/default only; never used as a Customer's Astrologer rate.
const MAX_SESSION_MINUTES = 1440;
const RING_TIMEOUT_MS = 45_000;
// Give an Astrologer enough time to accept the live Chat after the 3-minute preparation phase.
// Voice Call connection timeout remains unchanged.
const CHAT_ACCEPT_TIMEOUT_MS = 5 * 60_000;
const PREPARATION_DURATION_MS = 3 * 60_000;
const DISCONNECT_GRACE_MS = 20_000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_SIGNAL_BYTES = 100_000;

function preparationWindow(acceptedAt = new Date()) {
  const startedAt = acceptedAt instanceof Date ? new Date(acceptedAt.getTime()) : new Date(acceptedAt);
  if (!Number.isFinite(startedAt.getTime())) return null;
  return {
    preparationStartedAt: startedAt,
    preparationUntil: new Date(startedAt.getTime() + PREPARATION_DURATION_MS)
  };
}

function httpError(status, message, code, details) {
  return Object.assign(new Error(message), { httpStatus: status, code, details });
}

function safePaise(value) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function safeMinutes(value) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
}

function validateLiveBirthDetails(input) {
  const d = input && typeof input === 'object' ? input : {};
  const birthDate = String(d.birthDate || '').trim();
  const birthTime = String(d.birthTime || '').trim();
  const birthPlace = String(d.birthPlace || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      !Number.isFinite(Date.parse(birthDate + 'T00:00:00Z')) ||
      new Date(Date.parse(birthDate + 'T00:00:00Z')).toISOString().slice(0, 10) !== birthDate) {
    throw httpError(400, 'Enter a valid Customer Date of Birth.', 'LIVE_BIRTH_DATE_INVALID');
  }
  const indiaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  if (birthDate > indiaToday) throw httpError(400, 'Date of Birth cannot be in the future.', 'LIVE_BIRTH_DATE_FUTURE');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    throw httpError(400, 'Enter a valid Customer Time of Birth.', 'LIVE_BIRTH_TIME_INVALID');
  }
  if (birthPlace.length < 2 || birthPlace.length > 200) {
    throw httpError(400, 'Enter a Customer Birth Place (2–200 characters).', 'LIVE_BIRTH_PLACE_INVALID');
  }
  const latRaw = String(d.birthLatitude ?? '').trim();
  const lonRaw = String(d.birthLongitude ?? '').trim();
  let birthLatitude = null, birthLongitude = null;
  if (latRaw || lonRaw) {
    birthLatitude = Number(latRaw); birthLongitude = Number(lonRaw);
    if (!latRaw || !lonRaw || !Number.isFinite(birthLatitude) || !Number.isFinite(birthLongitude) ||
        birthLatitude < -90 || birthLatitude > 90 || birthLongitude < -180 || birthLongitude > 180) {
      throw httpError(400, 'Birth Place coordinates are invalid. Select a place suggestion or clear the coordinates.', 'LIVE_BIRTH_COORDINATES_INVALID');
    }
  }
  return {
    birthDate, birthTime, birthPlace, birthLatitude, birthLongitude,
    birthTimezone: String(d.birthTimezone || '').trim().slice(0, 100)
  };
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

function scheduledAppointmentStatusForEndedSession(session) {
  if (timestampMillis(session?.startedAt)) return 'completed';
  return String(session?.endReason || '').trim().toLowerCase() === 'rejected'
    ? 'rejected'
    : 'cancelled';
}

function billableMinutesForElapsedMs(elapsedMs, maximumMinutes) {
  const elapsed = Number(elapsedMs);
  const maximum = Number(maximumMinutes);
  if (!Number.isFinite(elapsed) || elapsed < 0 ||
      !Number.isSafeInteger(maximum) || maximum < 1) return null;
  if (elapsed === 0) return 0;
  // Bill each started minute, but an exact minute boundary remains that minute.
  return Math.min(maximum, Math.max(1, Math.ceil(elapsed / 60_000)));
}

function calculateLiveSessionCharge({ elapsedMs, ratePerMinutePaise, maximumMinutes, freeMinutes }) {
  const rate = Number(ratePerMinutePaise);
  const minutes = billableMinutesForElapsedMs(elapsedMs, maximumMinutes);
  if (minutes === null || !Number.isSafeInteger(rate) || rate < 0 || rate > 1_000_000) return null;
  if (freeMinutes === undefined) {
    const amountPaise = minutes * rate;
    if (!Number.isSafeInteger(amountPaise)) return null;
    return { elapsedMs: Math.floor(Number(elapsedMs)), billableMinutes: minutes, amountPaise };
  }
  const reservedFreeMinutes = Number(freeMinutes);
  if (!Number.isSafeInteger(reservedFreeMinutes) || reservedFreeMinutes < 0 || reservedFreeMinutes > MAX_SESSION_MINUTES) return null;
  const freeMinutesUsed = Math.min(minutes, reservedFreeMinutes);
  const paidMinutes = minutes - freeMinutesUsed;
  const amountPaise = paidMinutes * rate;
  if (!Number.isSafeInteger(amountPaise)) return null;
  return { elapsedMs: Math.floor(Number(elapsedMs)), billableMinutes: paidMinutes, totalBillableMinutes: minutes, freeMinutesUsed, amountPaise };
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

function commissionFromSnapshot(snapshot) {
  const data = snapshot && snapshot.exists ? (snapshot.data() || {}) : {};
  const astroPercent = Number(data.astroPercent ?? 20);
  const adminPercent = Number(data.adminPercent ?? (100 - astroPercent));
  if (!Number.isFinite(astroPercent) || !Number.isFinite(adminPercent) || astroPercent < 0 || astroPercent > 100 || adminPercent < 0 || adminPercent > 100 || Math.abs(astroPercent + adminPercent - 100) > 0.001) {
    return { astroPercent: 20, adminPercent: 80 };
  }
  return { astroPercent, adminPercent };
}

function frozenBookingCommission(booking, fallback) {
  const astroPercent = Number(booking?.astrologerCommissionPercent);
  const adminPercent = Number(booking?.adminCommissionPercent);
  if (Number.isFinite(astroPercent) && Number.isFinite(adminPercent) && astroPercent >= 0 && astroPercent <= 100 && adminPercent >= 0 && adminPercent <= 100 && Math.abs(astroPercent + adminPercent - 100) <= 0.001) {
    return { astroPercent, adminPercent };
  }
  return fallback;
}

function astrologerRatePaise(astroProfile, mode) {
  const astro = astroProfile || {};
  const kind = String(mode || '').trim().toLowerCase();
  if (!['call', 'chat'].includes(kind)) return null;
  const candidates = kind === 'call'
    ? [astro.callPricePerMinute, astro.pricePerMinute, astro.callRatePerMinute]
    : [astro.chatPricePerMinute, astro.liveChatPricePerMinute, astro.chatRatePerMinute];
  for (const value of candidates) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const paise = parseRupeesToPaise(value);
    if (Number.isSafeInteger(paise) && paise >= 100 && paise <= 1_000_000) return paise;
  }
  return null;
}

function maxAffordableMinutes(availableBalancePaise, ratePerMinutePaise) {
  const available = Number(availableBalancePaise);
  const rate = Number(ratePerMinutePaise);
  if (!Number.isSafeInteger(available) || available < 0 ||
      !Number.isSafeInteger(rate) || rate < 100 || rate > 1_000_000) return 0;
  return Math.min(MAX_SESSION_MINUTES, Math.floor(available / rate));
}

function calculateBookingReserveRelease({
  availableBalancePaise, reservedBalancePaise, bonusMinutesBalance, reservedBonusMinutes,
  releaseAmountPaise, releaseBonusMinutes
}) {
  const values = [availableBalancePaise, reservedBalancePaise, bonusMinutesBalance, reservedBonusMinutes, releaseAmountPaise, releaseBonusMinutes].map(Number);
  if (!values.every(Number.isSafeInteger) || values.some(value => value < 0)) return null;
  const [available, reserved, bonusAvailable, bonusReserved, amount, bonus] = values;
  if (reserved < amount || bonusReserved < bonus) return null;
  const nextAvailable = available + amount;
  const nextReserved = reserved - amount;
  const nextBonusAvailable = bonusAvailable + bonus;
  const nextBonusReserved = bonusReserved - bonus;
  if (!Number.isSafeInteger(nextAvailable) || !Number.isSafeInteger(nextReserved) ||
      !Number.isSafeInteger(nextBonusAvailable) || nextBonusAvailable > 1_000_000 ||
      !Number.isSafeInteger(nextBonusReserved) || nextReserved < 0 || nextBonusReserved < 0) return null;
  return {
    availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved,
    bonusMinutesBalance: nextBonusAvailable, reservedBonusMinutes: nextBonusReserved,
    releasedAmountPaise: amount, releasedBonusMinutes: bonus
  };
}

function safePersonName(...values) {
  for (const value of values) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    if (name && name.length <= 120 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) return name;
  }
  return '';
}

function isAstrologerLiveModeEnabled(astroProfile, mode) {
  const astro = astroProfile || {};
  const callEnabled = astro.liveCallEnabled === true;
  const chatEnabled = astro.liveChatEnabled === true;
  const kind = String(mode || '').trim().toLowerCase();
  return kind === 'call' ? callEnabled : kind === 'chat' ? chatEnabled : false;
}

function astrologerAvailabilityStatus(astroProfile, activeSessionCountOverride) {
  const astro = astroProfile || {};
  const activeSessionCount = activeSessionCountOverride == null
    ? Number(astro.activeSessionCount || 0)
    : Number(activeSessionCountOverride);
  if (Number.isFinite(activeSessionCount) && activeSessionCount > 0) return 'busy';
  return astro.liveCallEnabled === true || astro.liveChatEnabled === true ? 'online' : 'offline';
}

function liveSessionSafeView(id, data) {
  const d = data || {};
  return {
    id: String(id),
    customerUid: String(d.customerUid || ''),
    astrologerUid: String(d.astrologerUid || ''),
    astrologerId: String(d.astrologerId || d.astrologerUid || ''),
    astrologerName: safePersonName(d.astrologerName, d.astrologerFullName, d.astrologerDisplayName, d.astroName) || 'Astrologer',
    customerName: safePersonName(d.customerName, d.customerFullName, d.customerDisplayName) || 'Customer',
    appointmentId: String(d.appointmentId || ''),
    birthDetails: d.birthDetails && typeof d.birthDetails === 'object' ? {
      birthDate: String(d.birthDetails.birthDate || ''),
      birthTime: String(d.birthDetails.birthTime || ''),
      birthPlace: String(d.birthDetails.birthPlace || ''),
      birthLatitude: d.birthDetails.birthLatitude == null ? null : Number(d.birthDetails.birthLatitude),
      birthLongitude: d.birthDetails.birthLongitude == null ? null : Number(d.birthDetails.birthLongitude),
      birthTimezone: String(d.birthDetails.birthTimezone || '')
    } : null,
    preparationUntil: timestampMillis(d.preparationUntil) ? new Date(timestampMillis(d.preparationUntil)).toISOString() : null,
    preparationCompletedAt: timestampMillis(d.preparationCompletedAt) ? new Date(timestampMillis(d.preparationCompletedAt)).toISOString() : null,
    connectingAt: timestampMillis(d.connectingAt) ? new Date(timestampMillis(d.connectingAt)).toISOString() : null,
    mode: String(d.mode || ''),
    minutes: Number(d.minutes || 0),
    ratePerMinutePaise: safePaise(d.ratePerMinutePaise),
    reservedAmountPaise: safePaise(d.reservedAmountPaise),
    reservedBonusMinutes: safeMinutes(d.reservedBonusMinutes),
    freeMinutesUsed: safeMinutes(d.freeMinutesUsed),
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

function createLiveSessionService({ app, db, FieldValue, crypto, requireUser, isAdminUser, notifyAstrologer = async () => ({ skipped: true }) }) {
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
  function commissionRef() { return db.collection(SETTINGS).doc('commission'); }
  function earningRef(id) { return db.collection('smv_payments').doc('SMV-LIVE-EARN-' + String(id)); }
  function nowTimestamp() { return FieldValue.serverTimestamp(); }
  function notifyAdmin(type, title, message, extra = {}) {
    return db.collection('smv_notifications').add({
      userId: 'admin', audience: 'admin', type, title, message,
      read: false, createdAt: FieldValue.serverTimestamp(), ...extra
    }).catch(error => console.warn('[Live Session] Admin notification skipped:', error?.message || error));
  }

  let pricingInitPromise = null;
  async function ensurePricingDocument() {
    if (!pricingInitPromise) {
      pricingInitPromise = db.runTransaction(async tx => {
        const ref = pricingRef();
        const snap = await tx.get(ref);
        if (!snap.exists) {
          tx.create(ref, {
            callRatePaise: DEFAULT_RATE_PAISE,
            chatRatePaise: DEFAULT_RATE_PAISE,
            maxConcurrentSessions: 1,
            currency: 'INR',
            updatedBy: 'system:default',
            updatedAt: nowTimestamp()
          });
        }
      }).catch(error => {
        pricingInitPromise = null;
        throw error;
      });
    }
    return pricingInitPromise;
  }

  async function roleFor(user) {
    if (await isAdminUser(user)) return 'admin';
    const snap = await userRef(user.uid).get();
    const role = String(snap.data()?.role || '').trim().toLowerCase();
    if (role === 'astrologer') return 'astrologer';
    // Some existing professional profiles retained an older Customer role during migration.
    // A verified, approved Astrologer document owned by this Firebase UID is authoritative.
    const astroSnap = await astroRef(user.uid).get();
    if (astroSnap.exists) {
      const astro = astroSnap.data() || {};
      const status = String(astro.status || '').toLowerCase();
      if ((!astro.uid || String(astro.uid) === String(user.uid)) && ['approved', 'active'].includes(status)) return 'astrologer';
    }
    return role === 'customer' ? 'customer' : '';
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

  function sendPushAlert(uid, alert) {
    try {
      Promise.resolve(notifyAstrologer(uid, alert)).catch(error => {
        console.warn('[Live Session] Best-effort Push alert skipped:', error?.message || error);
      });
    } catch (error) {
      console.warn('[Live Session] Best-effort Push alert skipped:', error?.message || error);
    }
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
        if (session.state !== 'ended' && session.state !== 'preparing') {
          await endSession(sessionId, '', 'network_disconnect', true);
        }
      } catch (error) {
        console.warn('[Live Session] Disconnect settlement deferred:', error?.message || error);
      }
    }, DISCONNECT_GRACE_MS);
    timer.unref?.();
    disconnectByKey.set(key, timer);
  }

  async function completePreparation(sessionId) {
    const id = String(sessionId || '').trim();
    if (!id) return;
    const ref = sessionRef(id);
    const updated = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const data = snap.data() || {};
      if (data.state !== 'preparing') return null;
      const completedAt = new Date();
      const next = {
        state: data.acceptedAt ? 'connecting' : 'ringing',
        preparationCompletedAt: completedAt,
        connectingAt: data.acceptedAt ? completedAt : null,
        updatedAt: nowTimestamp()
      };
      tx.set(ref, next, { merge: true });
      return { ...data, ...next };
    });
    if (!updated) return;
    scheduleSessionTimer(id, updated);
    const view = liveSessionSafeView(id, updated);
    sendTo(updated.customerUid, { type: 'live.session.updated', session: view });
    sendTo(updated.astrologerUid, { type: 'live.session.updated', session: view });
  }

  function scheduleSessionTimer(sessionId, data) {
    const existing = timeoutBySession.get(sessionId);
    if (existing) clearTimeout(existing);
    timeoutBySession.delete(sessionId);
    const d = data || {};
    if (d.state === 'ended') return;
    let dueAt = 0;
    let reason = 'no_answer';
    if (d.state === 'preparing') {
      dueAt = timestampMillis(d.preparationUntil) || (timestampMillis(d.preparationStartedAt) + PREPARATION_DURATION_MS);
      reason = 'preparation_complete';
    } else if (d.state === 'active') {
      const start = timestampMillis(d.startedAt);
      if (!start) return;
      dueAt = start + Math.max(1, Number(d.minutes || 1)) * 60_000;
      reason = 'duration_complete';
    } else if (d.state === 'ringing') {
      dueAt = timestampMillis(d.createdAt) + RING_TIMEOUT_MS;
      reason = 'no_answer';
    } else if (d.state === 'connecting') {
      dueAt = timestampMillis(d.connectingAt || d.preparationCompletedAt || d.acceptedAt || d.createdAt) + (d.mode === 'chat' ? CHAT_ACCEPT_TIMEOUT_MS : RING_TIMEOUT_MS);
      reason = 'connection_failed';
    } else return;
    const timer = setTimeout(() => {
      timeoutBySession.delete(sessionId);
      const operation = reason === 'preparation_complete'
        ? completePreparation(sessionId)
        : endSession(sessionId, '', reason, true);
      operation.catch(error => console.error('[Live Session] Timer operation failed:', error?.stack || error));
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

  async function reserveInTransaction(tx, { uid, mode, minutes, rate, walletSnapshot, sessionId, reservationType = 'live_session' }) {
    const wallet = walletSnapshot && walletSnapshot.exists ? (walletSnapshot.data() || {}) : {};
    const available = safePaise(wallet.availableBalancePaise);
    const reserved = safePaise(wallet.reservedBalancePaise);
    const bonusBalance = safeMinutes(wallet.bonusMinutesBalance);
    const reservedBonus = safeMinutes(wallet.reservedBonusMinutes);
    const bonusMinutesReserved = Math.min(minutes, bonusBalance);
    const cashMinutesRequired = minutes - bonusMinutesReserved;
    const needed = cashMinutesRequired * rate;
    if (!Number.isSafeInteger(needed) || needed < 0) throw httpError(409, 'Session cost is invalid.', 'LIVE_PRICE_INVALID');
    if (available < needed) {
      throw httpError(409, 'Insufficient Wallet balance for the selected duration.', 'WALLET_INSUFFICIENT_BALANCE', {
        availableBalancePaise: available, requiredBalancePaise: needed, shortfallPaise: needed - available
      });
    }
    const nextAvailable = available - needed;
    const nextReserved = reserved + needed;
    const nextBonusBalance = bonusBalance - bonusMinutesReserved;
    const nextReservedBonus = reservedBonus + bonusMinutesReserved;
    if (!Number.isSafeInteger(nextReserved) || !Number.isSafeInteger(nextReservedBonus)) throw httpError(409, 'Wallet reserve exceeds the supported balance range.', 'WALLET_BALANCE_OVERFLOW');
    const ref = walletRef(uid);
    const isBookingReserve = reservationType === 'live_booking';
    const reserveEntryType = isBookingReserve ? 'live_booking_reserve' : 'live_session_reserve';
    const ledgerRef = db.collection(LEDGER).doc(walletLedgerDocId(reserveEntryType, sessionId));
    const now = nowTimestamp();
    tx.set(ref, {
      ownerUid: uid, ownerRole: 'customer', currency: 'INR',
      availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved,
      bonusMinutesBalance: nextBonusBalance, reservedBonusMinutes: nextReservedBonus,
      version: safePaise(wallet.version) + 1, createdAt: wallet.createdAt || now, updatedAt: now
    }, { merge: true });
    tx.create(ledgerRef, {
      ownerUid: uid, ownerRole: 'customer', currency: 'INR',
      type: reserveEntryType, direction: 'reserve', amountPaise: needed,
      balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
      bonusMinutesReserved, bonusMinutesBalanceAfter: nextBonusBalance, reservedBonusMinutesAfter: nextReservedBonus,
      idempotencyKey: (isBookingReserve ? 'live-booking:' : 'live-session:') + sessionId,
      referenceType: isBookingReserve ? 'live_booking' : 'live_session', referenceId: sessionId,
      note: 'Wallet reserve for ' + (isBookingReserve ? 'booked Live ' : 'Live ') + mode + (bonusMinutesReserved ? '; ' + bonusMinutesReserved + ' promotional free minute(s)' : ''), status: 'posted', createdAt: now
    });
    return { availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved, reservedAmountPaise: needed,
      bonusMinutesBalance: nextBonusBalance, reservedBonusMinutes: nextReservedBonus, reservedBonusMinutesForSession: bonusMinutesReserved };
  }

  function validateActiveAstrologer(astroProfile, expectedUid) {
    const status = String(astroProfile?.status || '').toLowerCase();
    const ownerUid = String(astroProfile?.uid || expectedUid || '');
    if (!['approved', 'active'].includes(status) || ownerUid !== String(expectedUid || '')) {
      throw httpError(409, 'This Astrologer profile is not approved or does not belong to the requested account.', 'LIVE_ASTROLOGER_NOT_APPROVED');
    }
  }

  function makeSession({ id, customerUid, astrologerUid, astroProfile, customerName, birthDetails, mode, minutes, rate, reservedAmount, reservedBonusMinutes = 0, state, origin, fingerprint, commission, appointmentId = '' }) {
    const preparation = state === 'preparing' ? preparationWindow() : null;
    const preparationStartedAt = preparation?.preparationStartedAt || null;
    return {
      sessionId: id, customerUid, astrologerUid, appointmentId: String(appointmentId || ''),
      astrologerId: astrologerUid, astrologerName: safePersonName(astroProfile.name, astroProfile.fullName, astroProfile.displayName, astroProfile.astrologerName) || 'Astrologer',
      customerName: String(customerName || 'Customer'), birthDetails: birthDetails || null,
      preparationStartedAt, preparationUntil: preparation?.preparationUntil || null,
      preparationCompletedAt: null, connectingAt: null,
      mode, minutes, ratePerMinutePaise: rate, reservedAmountPaise: reservedAmount,
      reservedBonusMinutes: safeMinutes(reservedBonusMinutes), freeMinutesUsed: 0,
      astrologerCommissionPercent: Number(commission?.astroPercent ?? 20),
      adminCommissionPercent: Number(commission?.adminPercent ?? 80),
      state, customerReady: false, astrologerReady: false,
      origin: origin || 'direct', payloadFingerprint: fingerprint,
      createdAt: new Date(), updatedAt: nowTimestamp(),
      acceptedAt: preparationStartedAt, startedAt: null, endedAt: null,
      actualChargePaise: 0, billableMinutes: 0, releasedAmountPaise: 0
    };
  }

  async function createRequest({ customerUid, astrologerId, mode, minutes, requestId, customerName, birthDetails, appointmentId = '' }) {
    const uid = String(customerUid || '').trim();
    const astroId = String(astrologerId || '').trim();
    const kind = String(mode || '').trim().toLowerCase();
    const length = Number(minutes);
    const reqId = String(requestId || '').trim();
    const sessionCustomerName = String(customerName || '').trim();
    if (!sessionCustomerName || sessionCustomerName.length > 100 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionCustomerName)) {
      throw httpError(400, 'Enter the Customer name (not an email address).', 'LIVE_CUSTOMER_NAME_INVALID');
    }
    const sessionBirthDetails = validateLiveBirthDetails(birthDetails);
    if (!uid || !astroId || astroId.length > 160) throw httpError(400, 'Select an Astrologer to continue.', 'LIVE_ASTROLOGER_REQUIRED');
    if (!['call', 'chat'].includes(kind)) throw httpError(400, 'Choose Call or Chat.', 'LIVE_MODE_INVALID');
    if (!Number.isSafeInteger(length) || length < 1 || length > MAX_SESSION_MINUTES) {
      throw httpError(400, 'Enter a whole duration from 1 to ' + MAX_SESSION_MINUTES + ' minutes.', 'LIVE_DURATION_INVALID');
    }
    if (reqId.length < 8 || reqId.length > 128) throw httpError(400, 'A valid request ID is required. Please try again.', 'LIVE_REQUEST_ID_INVALID');
    const scheduledAppointmentId = String(appointmentId || '').trim();
    if (scheduledAppointmentId && scheduledAppointmentId.length > 180) throw httpError(400, 'Scheduled booking ID is invalid.', 'LIVE_APPOINTMENT_ID_INVALID');
    const id = hash(uid + ':' + reqId);
    const fingerprintPayload = {
      customerUid: uid, astrologerId: astroId, mode: kind, minutes: length,
      customerName: sessionCustomerName, birthDetails: sessionBirthDetails
    };
    const legacyFingerprint = hash(JSON.stringify(fingerprintPayload));
    const fingerprint = hash(JSON.stringify(scheduledAppointmentId
      ? { ...fingerprintPayload, appointmentId: scheduledAppointmentId }
      : fingerprintPayload));
    const sRef = sessionRef(id), bRef = bookingRef(id);
    const customerProfileRef = userRef(uid), astroProfileRef = userRef(astroId);
    const aRef = astroRef(astroId), wRef = walletRef(uid), pRef = pricingRef(), cRef = commissionRef();
    const txResult = await db.runTransaction(async tx => {
      const [oldSession, oldBooking, customerSnap, astroUserSnap, astroSnap, walletSnap, pricingSnap, commissionSnap] = await Promise.all([
        tx.get(sRef), tx.get(bRef), tx.get(customerProfileRef), tx.get(astroProfileRef),
        tx.get(aRef), tx.get(wRef), tx.get(pRef), tx.get(cRef)
      ]);
      if (oldSession.exists || oldBooking.exists) {
        const old = oldSession.exists ? (oldSession.data() || {}) : (oldBooking.data() || {});
        const canAttachLegacyAppointment = !!scheduledAppointmentId && !old.appointmentId &&
          old.payloadFingerprint === legacyFingerprint;
        if ((old.payloadFingerprint !== fingerprint && !canAttachLegacyAppointment) ||
            old.customerUid !== uid || old.astrologerUid !== astroId) {
          throw httpError(409, 'This request ID was already used for different session details.', 'LIVE_IDEMPOTENCY_CONFLICT');
        }
        if (canAttachLegacyAppointment) {
          const patch = { appointmentId: scheduledAppointmentId, payloadFingerprint: fingerprint, updatedAt: nowTimestamp() };
          tx.set(oldSession.exists ? sRef : bRef, patch, { merge: true });
          Object.assign(old, patch);
        }
        return { kind: oldSession.exists ? 'session' : 'booking', id, data: old, alreadyProcessed: true };
      }
      if (!customerSnap.exists || String(customerSnap.data()?.role || '').toLowerCase() !== 'customer') {
        throw httpError(403, 'Customer login is required to start a Live Session.', 'LIVE_CUSTOMER_REQUIRED');
      }
      if (!astroSnap.exists) throw httpError(404, 'The selected Astrologer was not found.', 'LIVE_ASTROLOGER_NOT_FOUND');
      const astro = astroSnap.data() || {};
      validateActiveAstrologer(astro, astroId);
      if (!isAstrologerLiveModeEnabled(astro, kind)) {
        throw httpError(409,
          'This Astrologer has not enabled Live ' + kind.toUpperCase() + '. Enable that mode to receive requests.',
          'LIVE_MODE_DISABLED');
      }
      const astroUser = astroUserSnap.exists ? (astroUserSnap.data() || {}) : {};
      const astroName = safePersonName(astro.name, astro.fullName, astro.displayName, astro.astrologerName, astroUser.name, astroUser.fullName, astroUser.displayName) || 'Astrologer';
      const pricing = pricingFromSnapshot(pricingSnap);
      const commission = commissionFromSnapshot(commissionSnap);
      const rate = astrologerRatePaise(astro, kind);
      if (!rate) {
        throw httpError(409, (kind === 'call' ? 'Call' : 'Chat') + ' price per minute is not configured for this Astrologer.', 'LIVE_PRICE_UNAVAILABLE');
      }
      const walletData = walletSnap.exists ? (walletSnap.data() || {}) : {};
      const bonusMinutesAvailable = Math.min(length, safeMinutes(walletData.bonusMinutesBalance));
      const requiredBalancePaise = (length - bonusMinutesAvailable) * rate;
      const availableBalancePaise = safePaise(walletData.availableBalancePaise);
      if (!Number.isSafeInteger(requiredBalancePaise) || requiredBalancePaise < 0) {
        throw httpError(409, 'Session cost is invalid.', 'LIVE_PRICE_INVALID');
      }
      if (availableBalancePaise < requiredBalancePaise) {
        throw httpError(409, 'Insufficient Wallet balance for the selected duration.', 'WALLET_INSUFFICIENT_BALANCE', {
          availableBalancePaise, requiredBalancePaise, shortfallPaise: requiredBalancePaise - availableBalancePaise
        });
      }
      const liveCount = safePaise(astro.activeSessionCount);
      const availability = astrologerAvailabilityStatus(astro, liveCount);
      const canStartNow = availability === 'online' && liveCount < pricing.maxConcurrentSessions;
      if (!canStartNow) {
        const reserve = await reserveInTransaction(tx, {
          uid, mode: kind, minutes: length, rate, walletSnapshot: walletSnap, sessionId: id, reservationType: 'live_booking'
        });
        const booking = {
          bookingId: id, customerUid: uid, astrologerUid: astroId, astrologerId: astroId,
          astrologerName: astroName, customerName: sessionCustomerName,
          birthDetails: sessionBirthDetails, mode: kind, minutes: length, appointmentId: scheduledAppointmentId,
          ratePerMinutePaise: rate, reservedAmountPaise: reserve.reservedAmountPaise,
          reservedBonusMinutes: reserve.reservedBonusMinutesForSession, walletReservationState: 'reserved',
          astrologerCommissionPercent: commission.astroPercent, adminCommissionPercent: commission.adminPercent,
          status: 'pending', origin: 'offline_queue', payloadFingerprint: fingerprint,
          createdAt: nowTimestamp(), updatedAt: nowTimestamp(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        tx.create(bRef, booking);
        if (availability === 'online' && liveCount >= pricing.maxConcurrentSessions) {
          tx.set(aRef, { availabilityStatus: 'busy', liveSessionBusyManaged: true, updatedAt: nowTimestamp() }, { merge: true });
        }
        return { kind: 'booking', id, data: booking, alreadyProcessed: false, wallet: reserve };
      }
      const customer = customerSnap.data() || {};
      const reserve = await reserveInTransaction(tx, { uid, mode: kind, minutes: length, rate, walletSnapshot: walletSnap, sessionId: id });
      const data = makeSession({
        id, customerUid: uid, astrologerUid: astroId, astroProfile: { ...astro, name: astroName },
        customerName: sessionCustomerName, birthDetails: sessionBirthDetails,
        mode: kind, minutes: length, rate, reservedAmount: reserve.reservedAmountPaise,
        reservedBonusMinutes: reserve.reservedBonusMinutesForSession,
        state: 'ringing', origin: 'direct', fingerprint, commission, appointmentId: scheduledAppointmentId
      });
      tx.create(sRef, data);
      const nextCount = liveCount + 1;
      tx.set(aRef, {
        activeSessionCount: nextCount,
        availabilityStatus: nextCount > 0 ? 'busy' : availability,
        liveSessionBusyManaged: nextCount > 0,
        updatedAt: nowTimestamp()
      }, { merge: true });
      return { kind: 'session', id, data, alreadyProcessed: false, wallet: reserve, customerName: customer.name || '' };
    });
    if (txResult.kind === 'session') {
      trackSession(id, uid, astroId);
      scheduleSessionTimer(id, txResult.data);
      notifyAdmin('live_session_requested', 'Live ' + kind.toUpperCase() + ' requested',
        sessionCustomerName + ' requested a Live ' + kind.toUpperCase() + ' with ' + String(txResult.data.astrologerName || 'Astrologer') + '.',
        { sessionId: id, customerId: uid, astrologerId: astroId, mode: kind });
      if (!txResult.alreadyProcessed) sendPushAlert(astroId, { kind: 'live_session', mode: kind, entityId: id });
      sendTo(astroId, { type: 'live.session.request', session: liveSessionSafeView(id, txResult.data) });
      sendTo(uid, { type: 'live.session.updated', session: liveSessionSafeView(id, txResult.data) });
    } else if (txResult.kind === 'booking' && !txResult.alreadyProcessed) {
      notifyAdmin('live_booking_requested', 'Live ' + kind.toUpperCase() + ' booking requested',
        sessionCustomerName + ' booked a Live ' + kind.toUpperCase() + ' with ' + String(txResult.data.astrologerName || 'Astrologer') + '. It will be accepted when the Astrologer is online.',
        { bookingId: id, customerId: uid, astrologerId: astroId, mode: kind });
      sendPushAlert(astroId, { kind: 'live_booking', mode: kind, entityId: id });
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
      const [bSnap, sSnap, astroSnap, astroUserSnap, pricingSnap, commissionSnap] = await Promise.all([
        tx.get(bRef), tx.get(sRef), tx.get(aRef), tx.get(astroUserRef), tx.get(pricingRef()), tx.get(commissionRef())
      ]);
      if (!bSnap.exists) throw httpError(404, 'Pending Live booking was not found.', 'LIVE_BOOKING_NOT_FOUND');
      const booking = bSnap.data() || {};
      if (booking.astrologerUid !== uid) throw httpError(403, 'This booking belongs to another Astrologer.', 'LIVE_BOOKING_FORBIDDEN');
      if (booking.status === 'accepted' && sSnap.exists) return { id, data: sSnap.data() || {}, alreadyProcessed: true };
      if (booking.status !== 'pending') throw httpError(409, 'This booking is no longer pending.', 'LIVE_BOOKING_NOT_PENDING');
      const created = timestampMillis(booking.createdAt);
      if (created && Date.now() - created > 7 * 24 * 60 * 60 * 1000) {
        await releaseBookingReserveInTransaction(tx, id, booking, 'expired', { endReason: 'booking_expired' });
        return { expired: true, id };
      }
      if (!astroSnap.exists) throw httpError(404, 'Astrologer profile was not found.', 'LIVE_ASTROLOGER_NOT_FOUND');
      const astro = astroSnap.data() || {};
      validateActiveAstrologer(astro, uid);
      if (!isAstrologerLiveModeEnabled(astro, booking.mode)) {
        throw httpError(409,
          'This Astrologer has not enabled Live ' + String(booking.mode || '').toUpperCase() + '. The booking was kept pending.',
          'LIVE_MODE_DISABLED');
      }
      const pricing = pricingFromSnapshot(pricingSnap);
      const commission = frozenBookingCommission(booking, commissionFromSnapshot(commissionSnap));
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
      const currentRate = astrologerRatePaise(astro, booking.mode);
      // A queued booking freezes the selected Astrologer's per-minute rate.
      // If a legacy booking has no frozen rate, use only that Astrologer's current rate.
      const bookedRate = Number(booking.ratePerMinutePaise);
      const rate = Number.isSafeInteger(bookedRate) && bookedRate >= 100 && bookedRate <= 1_000_000
        ? bookedRate : currentRate;
      const minutes = Number(booking.minutes);
      if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > MAX_SESSION_MINUTES) {
        throw httpError(409, 'Booking duration is invalid.', 'LIVE_DURATION_INVALID');
      }
      if (!rate) throw httpError(409, 'This Astrologer no longer has a configured per-minute rate for this booking.', 'LIVE_PRICE_UNAVAILABLE');
      const fingerprint = String(booking.payloadFingerprint || hash(id));
      let reserve;
      if (String(booking.walletReservationState || '') === 'reserved') {
        const wallet = walletSnap.exists ? (walletSnap.data() || {}) : {};
        const reservedAmountPaise = Number(booking.reservedAmountPaise);
        const reservedBonusMinutesForSession = Number(booking.reservedBonusMinutes);
        if (!Number.isSafeInteger(reservedAmountPaise) || reservedAmountPaise < 0 ||
            !Number.isSafeInteger(reservedBonusMinutesForSession) || reservedBonusMinutesForSession < 0 ||
            safePaise(wallet.reservedBalancePaise) < reservedAmountPaise ||
            safeMinutes(wallet.reservedBonusMinutes) < reservedBonusMinutesForSession) {
          throw httpError(409, 'Wallet reserve for this booking does not reconcile. The booking was not accepted.', 'LIVE_BOOKING_WALLET_RESERVE_MISMATCH');
        }
        reserve = {
          availableBalancePaise: safePaise(wallet.availableBalancePaise),
          reservedBalancePaise: safePaise(wallet.reservedBalancePaise),
          reservedAmountPaise,
          bonusMinutesBalance: safeMinutes(wallet.bonusMinutesBalance),
          reservedBonusMinutes: safeMinutes(wallet.reservedBonusMinutes),
          reservedBonusMinutesForSession
        };
      } else {
        // Backward compatibility: reserve legacy bookings created before prepayment was added.
        reserve = await reserveInTransaction(tx, {
          uid: booking.customerUid, mode: booking.mode, minutes, rate, walletSnapshot: walletSnap,
          sessionId: id, reservationType: 'live_booking'
        });
      }
      const data = makeSession({
        id, customerUid: booking.customerUid, astrologerUid: uid, astroProfile: astro,
        customerName: booking.customerName || customerSnap.data()?.name || 'Customer',
        birthDetails: booking.birthDetails || null,
        mode: booking.mode, minutes, rate, reservedAmount: reserve.reservedAmountPaise,
        reservedBonusMinutes: reserve.reservedBonusMinutesForSession,
        state: 'preparing', origin: 'accepted_booking', fingerprint, commission,
        appointmentId: booking.appointmentId || ''
      });
      data.acceptedAt = data.preparationStartedAt || new Date();
      tx.create(sRef, data);
      tx.set(bRef, {
        status: 'accepted', sessionId: id, acceptedAt: nowTimestamp(),
        ratePerMinutePaise: rate, reservedAmountPaise: reserve.reservedAmountPaise,
        walletReservationState: 'transferred', updatedAt: nowTimestamp()
      }, { merge: true });
      const nextCount = liveCount + 1;
      tx.set(aRef, {
        activeSessionCount: nextCount,
        availabilityStatus: nextCount > 0 ? 'busy' : availability,
        liveSessionBusyManaged: nextCount > 0,
        updatedAt: nowTimestamp()
      }, { merge: true });
      return { id, data, alreadyProcessed: false, wallet: reserve };
    });
    if (txResult.expired) throw httpError(410, 'This booking has expired.', 'LIVE_BOOKING_EXPIRED');
    if (!txResult.alreadyProcessed) {
      trackSession(id, txResult.data.customerUid, txResult.data.astrologerUid);
      scheduleSessionTimer(id, txResult.data);
      if (txResult.data.appointmentId) {
        await db.collection('smv_appointments').doc(String(txResult.data.appointmentId)).set({
          bookingStatus: 'in_progress', status: 'in_progress', liveSessionId: id,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }).catch(error => console.warn('[Live Session] Scheduled booking status update skipped:', error?.message || error));
      }
      notifyAdmin('live_booking_accepted', 'Live booking accepted',
        String(txResult.data.customerName || 'Customer') + ' Live ' + String(txResult.data.mode || '').toUpperCase() + ' booking was accepted by ' + String(txResult.data.astrologerName || 'Astrologer') + '.',
        { bookingId: id, customerId: txResult.data.customerUid, astrologerId: txResult.data.astrologerUid, mode: txResult.data.mode });
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
      if (session.state === 'connecting' || session.state === 'active' || (session.state === 'preparing' && !!session.acceptedAt)) return { data: session, alreadyProcessed: true };
      if (session.state !== 'ringing') throw httpError(409, 'This request is no longer ringing.', 'LIVE_SESSION_NOT_RINGING');
      const acceptedAt = new Date();
      const preparation = preparationWindow(acceptedAt);
      if (!preparation) throw httpError(500, 'Unable to start the Horoscope preparation timer.', 'LIVE_PREPARATION_TIMER_INVALID');
      const updated = {
        ...session, state: 'preparing', acceptedAt,
        preparationStartedAt: preparation.preparationStartedAt,
        preparationUntil: preparation.preparationUntil,
        preparationCompletedAt: null, connectingAt: null,
        customerReady: false, astrologerReady: false, updatedAt: nowTimestamp()
      };
      tx.set(ref, {
        state: 'preparing', acceptedAt,
        preparationStartedAt: updated.preparationStartedAt,
        preparationUntil: updated.preparationUntil,
        preparationCompletedAt: null, connectingAt: null,
        customerReady: false, astrologerReady: false, updatedAt: updated.updatedAt
      }, { merge: true });
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
        patch.startedAt = new Date();
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
      const commissionRefDoc = commissionRef(), earningRefDoc = earningRef(id);
      const scheduledAppointmentRef = session.appointmentId
        ? db.collection('smv_appointments').doc(String(session.appointmentId))
        : null;
      const endReads = [
        tx.get(wRef), tx.get(aRef), tx.get(bRef), tx.get(pricingRef()), tx.get(commissionRefDoc), tx.get(earningRefDoc)
      ];
      if (scheduledAppointmentRef) endReads.push(tx.get(scheduledAppointmentRef));
      const endSnapshots = await Promise.all(endReads);
      const [wSnap, aSnap, bSnap, pricingSnap, commissionSnap, earningSnap] = endSnapshots;
      const scheduledAppointmentSnap = scheduledAppointmentRef ? endSnapshots[6] : null;
      const wallet = wSnap.exists ? (wSnap.data() || {}) : {};
      const astro = aSnap.exists ? (aSnap.data() || {}) : {};
      if (session.state === 'ended') {
        // Idempotent retry also reconciles a scheduled appointment. Older writes may
        // have ended the session before its linked appointment was available to update.
        if (scheduledAppointmentRef && scheduledAppointmentSnap?.exists) {
          const appointmentStatus = scheduledAppointmentStatusForEndedSession(session);
          const appointment = scheduledAppointmentSnap.data() || {};
          const existingStatus = String(appointment.bookingStatus || appointment.status || '').toLowerCase();
          if (existingStatus !== appointmentStatus || String(appointment.liveSessionId || '') !== id) {
            tx.set(scheduledAppointmentRef, {
              bookingStatus: appointmentStatus, status: appointmentStatus,
              liveSessionId: id, liveEndedAt: session.endedAt || nowTimestamp(),
              updatedAt: nowTimestamp()
            }, { merge: true });
          }
        }
        return {
          alreadyProcessed: true, session,
          wallet: { availableBalancePaise: safePaise(wallet.availableBalancePaise), reservedBalancePaise: safePaise(wallet.reservedBalancePaise) }
        };
      }
      const now = Date.now();
      const startedAt = timestampMillis(session.startedAt);
      const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
      const reservedBonusMinutes = safeMinutes(session.reservedBonusMinutes);
      const pricing = calculateLiveSessionCharge({
        elapsedMs, ratePerMinutePaise: safePaise(session.ratePerMinutePaise),
        maximumMinutes: Number(session.minutes || 1), freeMinutes: startedAt ? reservedBonusMinutes : 0
      });
      if (!pricing) throw httpError(500, 'Unable to calculate the Live Session charge safely.', 'LIVE_BILLING_CALCULATION_FAILED');
      const freeMinutesUsed = safeMinutes(pricing.freeMinutesUsed);
      const reservedAmount = safePaise(session.reservedAmountPaise);
      const charge = Math.min(reservedAmount, pricing.amountPaise);
      const release = reservedAmount - charge;
      const currentCommission = commissionFromSnapshot(commissionSnap);
      const savedAstroPercent = Number(session.astrologerCommissionPercent);
      const savedAdminPercent = Number(session.adminCommissionPercent);
      const commission = Number.isFinite(savedAstroPercent) && Number.isFinite(savedAdminPercent) && savedAstroPercent >= 0 && savedAstroPercent <= 100 && savedAdminPercent >= 0 && savedAdminPercent <= 100 && Math.abs(savedAstroPercent + savedAdminPercent - 100) <= 0.001
        ? { astroPercent: savedAstroPercent, adminPercent: savedAdminPercent } : currentCommission;
      const astrologerCommissionPaise = charge > 0 ? Math.round(charge * commission.astroPercent / 100) : 0;
      const adminCommissionPaise = charge - astrologerCommissionPaise;
      const available = safePaise(wallet.availableBalancePaise);
      const reserved = safePaise(wallet.reservedBalancePaise);
      const bonusAvailable = safeMinutes(wallet.bonusMinutesBalance);
      const bonusReserved = safeMinutes(wallet.reservedBonusMinutes);
      if (reserved < reservedAmount || bonusReserved < reservedBonusMinutes) {
        throw httpError(409, 'Wallet cash or promotional reserve does not reconcile with this Live Session. The session was not silently settled.', 'LIVE_WALLET_RESERVE_MISMATCH');
      }
      const bonusMinutesReleased = reservedBonusMinutes - freeMinutesUsed;
      const nextAvailable = available + release;
      const nextReserved = reserved - reservedAmount;
      const nextBonusAvailable = bonusAvailable + bonusMinutesReleased;
      const nextBonusReserved = bonusReserved - reservedBonusMinutes;
      if (!Number.isSafeInteger(nextAvailable) || !Number.isSafeInteger(nextReserved) || !Number.isSafeInteger(nextBonusAvailable) || !Number.isSafeInteger(nextBonusReserved)) {
        throw httpError(409, 'Wallet settlement exceeds the supported balance range.', 'WALLET_BALANCE_OVERFLOW');
      }
      const nowServer = nowTimestamp();
      tx.set(wRef, {
        availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved,
        bonusMinutesBalance: nextBonusAvailable, reservedBonusMinutes: nextBonusReserved,
        version: safePaise(wallet.version) + 1, updatedAt: nowServer
      }, { merge: true });
      if (charge > 0) {
        const usageRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_usage', id));
        tx.create(usageRef, {
          ownerUid: session.customerUid, ownerRole: 'customer', currency: 'INR',
          type: 'live_session_usage', direction: 'debit', amountPaise: charge,
          balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
          idempotencyKey: 'live-session-usage:' + id, referenceType: 'live_session', referenceId: id,
          note: 'Live ' + session.mode + ' used ' + pricing.billableMinutes + ' paid started minute(s)' + (freeMinutesUsed ? '; ' + freeMinutesUsed + ' promotional free minute(s) used' : ''),
          bonusMinutesUsed: freeMinutesUsed,
          status: 'posted', createdAt: nowServer
        });
      }
      if (freeMinutesUsed > 0) {
        const bonusUsageRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_bonus_minutes', id));
        tx.create(bonusUsageRef, {
          ownerUid: session.customerUid, ownerRole: 'customer', currency: 'INR',
          type: 'live_session_bonus_minutes', direction: 'debit', amountPaise: 0,
          balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
          bonusMinutes: freeMinutesUsed, bonusMinutesBalanceAfter: nextBonusAvailable, reservedBonusMinutesAfter: nextBonusReserved,
          idempotencyKey: 'live-session-bonus-used:' + id, referenceType: 'live_session', referenceId: id,
          note: freeMinutesUsed + ' promotional free minute(s) used for Live ' + session.mode,
          status: 'posted', createdAt: nowServer
        });
      }
      if (bonusMinutesReleased > 0) {
        const bonusReleaseRef = db.collection(LEDGER).doc(walletLedgerDocId('live_session_bonus_minutes_release', id));
        tx.create(bonusReleaseRef, {
          ownerUid: session.customerUid, ownerRole: 'customer', currency: 'INR',
          type: 'live_session_bonus_minutes_release', direction: 'credit', amountPaise: 0,
          balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved,
          bonusMinutes: bonusMinutesReleased, bonusMinutesBalanceAfter: nextBonusAvailable, reservedBonusMinutesAfter: nextBonusReserved,
          idempotencyKey: 'live-session-bonus-release:' + id, referenceType: 'live_session', referenceId: id,
          note: bonusMinutesReleased + ' unused promotional free minute(s) returned to Wallet',
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
      const activeLimit = pricingFromSnapshot(pricingSnap).maxConcurrentSessions;
      const astroPatch = { activeSessionCount: nextCount, updatedAt: nowServer };
      if (String(astro.availabilityStatus || '').toLowerCase() === 'busy' &&
          astro.liveSessionBusyManaged === true && nextCount === 0) {
        astroPatch.availabilityStatus = astrologerAvailabilityStatus(astro, nextCount);
        astroPatch.liveSessionBusyManaged = false;
      }
      tx.set(aRef, astroPatch, { merge: true });
      const requestedReason = String(reason || 'participant_ended').trim().toLowerCase();
      const serverEndReasons = new Set(['duration_complete', 'no_answer', 'connection_failed', 'network_disconnect', 'low_wallet_balance', 'rejected', 'booking_expired']);
      const participantEndReasons = new Set(['participant_ended', 'connection_failed']);
      const finalReason = system
        ? (serverEndReasons.has(requestedReason) ? requestedReason : 'server_ended')
        : (participantEndReasons.has(requestedReason) ? requestedReason : 'participant_ended');
      const finalState = {
        state: 'ended', endedAt: new Date(now), updatedAt: nowServer,
        endedByUid: actor || 'server', endReason: finalReason,
        connectedDurationMs: elapsedMs, billableMinutes: pricing.billableMinutes, freeMinutesUsed,
        actualChargePaise: charge, releasedAmountPaise: release,
        bonusMinutesReleased, bonusMinutesBalanceAfter: nextBonusAvailable,
        commissionStatus: charge > 0 ? 'credited' : 'not_applicable',
        astrologerCommissionPercent: commission.astroPercent, adminCommissionPercent: commission.adminPercent,
        astrologerCommissionPaise, adminCommissionPaise,
        astrologerCommissionAmount: astrologerCommissionPaise / 100, adminCommissionAmount: adminCommissionPaise / 100,
        availableBalanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: nextReserved
      };
      if (charge > 0 && !earningSnap.exists) {
        tx.create(earningRefDoc, {
          paymentId: earningRefDoc.id, type: 'astrologer_earning', source: 'live_session', sourceType: 'live_session',
          sessionId: id, bookingId: session.origin === 'accepted_booking' || session.origin === 'offline_queue' ? id : null,
          customerId: session.customerUid, customerUid: session.customerUid, customerName: session.customerName || 'Customer',
          astrologerId: session.astrologerUid, astrologerName: session.astrologerName || astro.name || 'Astrologer',
          mode: session.mode || 'chat', question: 'Live ' + String(session.mode || 'chat').toUpperCase() + ' with ' + String(session.customerName || 'Customer'),
          grossAmount: charge / 100, grossAmountPaise: charge,
          commissionPercent: commission.astroPercent, commissionAmount: astrologerCommissionPaise / 100,
          earningAmount: astrologerCommissionPaise / 100, earningAmountPaise: astrologerCommissionPaise,
          adminCommissionPercent: commission.adminPercent, adminCommissionAmount: adminCommissionPaise / 100,
          status: 'credited', commissionStatus: 'credited', paymentStatus: 'pending_withdrawal',
          createdAt: nowServer, updatedAt: nowServer
        });
      }
      tx.set(sRef, finalState, { merge: true });
      if (scheduledAppointmentRef && scheduledAppointmentSnap?.exists) {
        const appointmentStatus = scheduledAppointmentStatusForEndedSession({ ...session, ...finalState, endReason: finalReason });
        tx.set(scheduledAppointmentRef, {
          bookingStatus: appointmentStatus, status: appointmentStatus,
          liveSessionId: id, liveEndedAt: nowServer, updatedAt: nowServer
        }, { merge: true });
      }
      if (bSnap.exists) {
        tx.set(bRef, {
          status: startedAt ? 'completed' : (finalReason === 'rejected' ? 'rejected' : 'cancelled'),
          endedAt: nowServer, endReason: finalReason, actualChargePaise: charge,
          releasedAmountPaise: release, walletReservationState: 'settled', updatedAt: nowServer
        }, { merge: true });
      }
      return {
        alreadyProcessed: false, session: { ...session, ...finalState },
        wallet: { availableBalancePaise: nextAvailable, reservedBalancePaise: nextReserved, bonusMinutesBalance: nextBonusAvailable, reservedBonusMinutes: nextBonusReserved }
      };
    });
    untrackSession(id, result.session.customerUid, result.session.astrologerUid);
    if (!result.alreadyProcessed) {
      sendToParticipants(result.session, {
        type: 'live.session.ended',
        session: liveSessionSafeView(id, result.session),
        wallet: { availableBalancePaise: result.wallet.availableBalancePaise, reservedBalancePaise: result.wallet.reservedBalancePaise, bonusMinutesBalance: result.wallet.bonusMinutesBalance, reservedBonusMinutes: result.wallet.reservedBonusMinutes },
        message: String(result.session.endReason || '') === 'low_wallet_balance' ? 'Low Wallet Balance — Session ended' : (String(result.session.endReason || '') === 'duration_complete' ? 'Selected session duration completed.' : (String(result.session.endReason || '') === 'connection_failed' ? 'Connection failed. Unused Wallet reserve released.' : 'Session ended. Unused Wallet reserve released.'))
      });
    }
    return {
      success: true, alreadyProcessed: !!result.alreadyProcessed,
      session: liveSessionSafeView(id, result.session), wallet: result.wallet
    };
  }

  async function releaseBookingReserveInTransaction(tx, id, booking, status, extra = {}) {
  const patch = { status, updatedAt: nowTimestamp(), ...extra };
  if (String(booking.walletReservationState || '') === 'reserved') {
    const uid = String(booking.customerUid || '').trim();
    if (!uid) throw httpError(409, 'This booking has no Wallet owner for its reservation.', 'LIVE_BOOKING_WALLET_RESERVE_MISMATCH');
    const wRef = walletRef(uid);
    const wSnap = await tx.get(wRef);
    if (!wSnap.exists) throw httpError(409, 'Wallet reserve for this booking is missing. The booking was not silently cancelled.', 'LIVE_BOOKING_WALLET_RESERVE_MISMATCH');
    const wallet = wSnap.data() || {};
    const released = calculateBookingReserveRelease({
      availableBalancePaise: wallet.availableBalancePaise,
      reservedBalancePaise: wallet.reservedBalancePaise,
      bonusMinutesBalance: wallet.bonusMinutesBalance,
      reservedBonusMinutes: wallet.reservedBonusMinutes,
      releaseAmountPaise: booking.reservedAmountPaise,
      releaseBonusMinutes: booking.reservedBonusMinutes
    });
    if (!released) throw httpError(409, 'Wallet cash or promotional reserve for this booking does not reconcile. No cancellation or refund was silently recorded.', 'LIVE_BOOKING_WALLET_RESERVE_MISMATCH');
    tx.set(wRef, {
      availableBalancePaise: released.availableBalancePaise,
      reservedBalancePaise: released.reservedBalancePaise,
      bonusMinutesBalance: released.bonusMinutesBalance,
      reservedBonusMinutes: released.reservedBonusMinutes,
      version: safePaise(wallet.version) + 1, updatedAt: nowTimestamp()
    }, { merge: true });
    const ledgerRef = db.collection(LEDGER).doc(walletLedgerDocId('live_booking_unused_release', id));
    tx.create(ledgerRef, {
      ownerUid: uid, ownerRole: 'customer', currency: 'INR',
      type: 'live_booking_unused_release', direction: 'credit',
      amountPaise: released.releasedAmountPaise,
      balanceAfterPaise: released.availableBalancePaise,
      reservedBalanceAfterPaise: released.reservedBalancePaise,
      bonusMinutes: released.releasedBonusMinutes,
      bonusMinutesBalanceAfter: released.bonusMinutesBalance,
      reservedBonusMinutesAfter: released.reservedBonusMinutes,
      idempotencyKey: 'live-booking-release:' + id, referenceType: 'live_booking', referenceId: id,
      note: 'Unused Wallet and promotional-minute reserve released for ' + String(booking.mode || 'Live') + ' booking',
      status: 'posted', createdAt: nowTimestamp()
    });
    patch.walletReservationState = 'released';
    patch.releasedAmountPaise = released.releasedAmountPaise;
    patch.bonusMinutesReleased = released.releasedBonusMinutes;
    patch.bonusMinutesBalanceAfter = released.bonusMinutesBalance;
  }
  tx.set(bookingRef(id), patch, { merge: true });
  return { ...booking, ...patch };
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
    // The route has already authorized this exact participant action. Treat the reason as a trusted workflow result.
    return endSession(sessionId, user.uid, reason, true);
  }

  async function rejectBooking(bookingId, astrologerUid) {
    const id = String(bookingId || '').trim();
    const uid = String(astrologerUid || '').trim();
    if (!id || !uid) throw httpError(400, 'Booking ID is required.', 'LIVE_BOOKING_ID_REQUIRED');
    const ref = bookingRef(id);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Live booking was not found.', 'LIVE_BOOKING_NOT_FOUND');
      const booking = snap.data() || {};
      if (booking.astrologerUid !== uid) throw httpError(403, 'This booking belongs to another Astrologer.', 'LIVE_BOOKING_FORBIDDEN');
      if (booking.status !== 'pending') throw httpError(409, 'Only pending Live bookings can be rejected.', 'LIVE_BOOKING_NOT_PENDING');
      const expiresAt = timestampMillis(booking.expiresAt) || (timestampMillis(booking.createdAt) + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt && Date.now() >= expiresAt) {
        return await releaseBookingReserveInTransaction(tx, id, booking, 'expired', { endReason: 'booking_expired' });
      }
      return await releaseBookingReserveInTransaction(tx, id, booking, 'rejected', { rejectedAt: nowTimestamp(), endReason: 'rejected_by_astrologer' });
    });
    sendTo(result.customerUid, { type: 'live.booking.updated', booking: { id, status: result.status } });
    sendTo(uid, { type: 'live.booking.updated', booking: { id, status: result.status } });
    return { success: true, booking: safeBookingView(id, result) };
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
      const expiresAt = timestampMillis(booking.expiresAt) || (timestampMillis(booking.createdAt) + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt && Date.now() >= expiresAt) {
        return { ...(await releaseBookingReserveInTransaction(tx, id, booking, 'expired', { endReason: 'booking_expired' })), bookingId: id };
      }
      return { ...(await releaseBookingReserveInTransaction(tx, id, booking, 'cancelled', { cancelledAt: nowTimestamp() })), bookingId: id };
    });
    sendTo(result.astrologerUid, { type: 'live.booking.updated', booking: { id, status: result.status } });
    sendTo(result.customerUid, { type: 'live.booking.updated', booking: { id, status: result.status } });
    return { success: true, booking: safeBookingView(id, result) };
  }

  async function sendMessage(sessionId, senderUid, text) {
    const body = String(text || '').trim();
    if (!body || body.length > MAX_MESSAGE_CHARS) {
      throw httpError(400, 'Enter a message of up to 4,000 characters.', 'LIVE_MESSAGE_INVALID');
    }
    await loadSessionForParticipant(sessionId, senderUid);
    const sRef = sessionRef(sessionId);
    const msgRef = sRef.collection('messages').doc(crypto.randomUUID());
    const message = {
      messageId: msgRef.id, sessionId: String(sessionId), senderUid,
      text: body, createdAt: new Date()
    };
    const session = await db.runTransaction(async tx => {
      const snap = await tx.get(sRef);
      if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
      const current = snap.data() || {};
      if (current.customerUid !== senderUid && current.astrologerUid !== senderUid) {
        throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
      }
      if (current.mode !== 'chat') throw httpError(409, 'Text messages are available only in a Live Chat session.', 'LIVE_MODE_MISMATCH');
      if (current.state !== 'active') throw httpError(409, 'Messages can only be sent during an active Live Chat.', 'LIVE_SESSION_NOT_ACTIVE');
      const start = timestampMillis(current.startedAt);
      if (!start || Date.now() >= start + Number(current.minutes || 1) * 60_000) {
        throw httpError(409, 'The Live Chat duration has ended.', 'LIVE_SESSION_ENDED');
      }
      tx.create(msgRef, message);
      return current;
    });
    const recipientUid = senderUid === session.customerUid ? session.astrologerUid : session.customerUid;
    const safe = { id: msgRef.id, sessionId: String(sessionId), senderUid, text: body, createdAt: message.createdAt.toISOString() };
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
    await loadSessionForParticipant(sessionId, senderUid);
    const sRef = sessionRef(sessionId);
    const signalRef = sRef.collection('signals').doc(crypto.randomUUID());
    const data = {
      signalId: signalRef.id, sessionId: String(sessionId), senderUid, type: signalType,
      payload, createdAt: new Date()
    };
    const session = await db.runTransaction(async tx => {
      const snap = await tx.get(sRef);
      if (!snap.exists) throw httpError(404, 'Live session was not found.', 'LIVE_SESSION_NOT_FOUND');
      const current = snap.data() || {};
      if (current.customerUid !== senderUid && current.astrologerUid !== senderUid) {
        throw httpError(403, 'This Live Session belongs to another account.', 'LIVE_SESSION_FORBIDDEN');
      }
      if (current.mode !== 'call') throw httpError(409, 'WebRTC signals are only available for voice calls.', 'LIVE_MODE_MISMATCH');
      if (!['connecting', 'active'].includes(current.state)) throw httpError(409, 'The Live Call is not connecting.', 'LIVE_SESSION_NOT_CONNECTING');
      if (signalType === 'offer' && current.customerUid !== senderUid) {
        throw httpError(403, 'Only the Customer can initiate this WebRTC offer.', 'LIVE_SIGNAL_ROLE_FORBIDDEN');
      }
      if (signalType === 'answer' && current.astrologerUid !== senderUid) {
        throw httpError(403, 'Only the Astrologer can answer this WebRTC offer.', 'LIVE_SIGNAL_ROLE_FORBIDDEN');
      }
      const start = timestampMillis(current.startedAt);
      if (current.state === 'active' && start && Date.now() >= start + Number(current.minutes || 1) * 60_000) {
        throw httpError(409, 'The Live Call duration has ended.', 'LIVE_SESSION_ENDED');
      }
      tx.create(signalRef, data);
      return current;
    });
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
    const settled = new Map();
    for (const row of due) {
      try {
        const result = await endSession(row.id, '', 'duration_complete', true);
        if (result.session) settled.set(row.id, result.session);
      } catch (e) { console.warn('[Live Session] Expiry check failed:', e?.message || e); }
    }
    return rows.map(row => settled.get(row.id) || row);
  }

  async function expireStaleBookingRows(rows) {
    for (const row of rows) {
      const expiresAt = timestampMillis(row.expiresAt) || (timestampMillis(row.createdAt) + 7 * 24 * 60 * 60 * 1000);
      if (row.status !== 'pending' || !expiresAt || Date.now() < expiresAt) continue;
      try {
        const ref = bookingRef(row.id);
        row.status = await db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          if (!snap.exists) return 'missing';
          const current = snap.data() || {};
          const expiry = timestampMillis(current.expiresAt) || (timestampMillis(current.createdAt) + 7 * 24 * 60 * 60 * 1000);
          if (current.status === 'pending' && expiry && Date.now() >= expiry) {
            await releaseBookingReserveInTransaction(tx, row.id, current, 'expired', { endReason: 'booking_expired' });
            return 'expired';
          }
          return String(current.status || 'missing');
        });
      } catch (error) {
        console.warn('[Live Session] Booking expiry check failed:', error?.message || error);
      }
    }
    return rows;
  }

  function safeBookingView(id, d) {
    return {
      id: String(id), mode: String(d.mode || ''), minutes: Number(d.minutes || 0),
      status: String(d.status || ''), astrologerName: String(d.astrologerName || 'Astrologer'),
      ratePerMinutePaise: safePaise(d.ratePerMinutePaise),
      reservedAmountPaise: safePaise(d.reservedAmountPaise),
      reservedBonusMinutes: safeMinutes(d.reservedBonusMinutes),
      walletReservationState: String(d.walletReservationState || ''),
      actualChargePaise: safePaise(d.actualChargePaise),
      releasedAmountPaise: safePaise(d.releasedAmountPaise),
      endReason: String(d.endReason || ''), sessionId: String(d.sessionId || ''),
      createdAt: timestampMillis(d.createdAt) ? new Date(timestampMillis(d.createdAt)).toISOString() : null,
      acceptedAt: timestampMillis(d.acceptedAt) ? new Date(timestampMillis(d.acceptedAt)).toISOString() : null,
      expiresAt: timestampMillis(d.expiresAt) ? new Date(timestampMillis(d.expiresAt)).toISOString() : null,
      endedAt: timestampMillis(d.endedAt) ? new Date(timestampMillis(d.endedAt)).toISOString() : null
    };
  }

  async function listBookings(astrologerUid) {
    const snap = await db.collection(BOOKINGS).where('astrologerUid', '==', astrologerUid).limit(100).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    await expireStaleBookingRows(rows);
    return rows.filter(d => String(d.status || '') === 'pending')
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .map(d => ({ ...safeBookingView(d.id, d), customerUid: String(d.customerUid || '') }));
  }

  async function listCustomerBookings(customerUid) {
    const snap = await db.collection(BOOKINGS).where('customerUid', '==', customerUid).limit(100).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    await expireStaleBookingRows(rows);
    return rows.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .slice(0, 30).map(d => safeBookingView(d.id, d));
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

  if (!app) throw new Error('Live Session service requires Express app.');

  app.get('/live/pricing', async (_req, res) => {
    try {
      await ensurePricingDocument();
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

  // Return short-lived TURN REST credentials if staging configures a TURN relay.
  // Without TURN, browsers still attempt STUN; restrictive NAT/firewall networks may fail.
  app.get('/live/ice-config', async (req, res) => {
    const auth = await requireRole(req, res, ['customer', 'astrologer']);
    if (!auth) return;
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnUrls = String(process.env.LIVE_TURN_URLS || process.env.LIVE_TURN_URL || '')
      .split(',').map(v => v.trim()).filter(v => /^turns?:/i.test(v));
    const sharedSecret = String(process.env.LIVE_TURN_SHARED_SECRET || '');
    let turnConfigured = false;
    if (turnUrls.length && sharedSecret) {
      const expiry = Math.floor(Date.now() / 1000) + 600;
      const username = expiry + ':' + String(auth.user.uid);
      const credential = crypto.createHmac('sha1', sharedSecret).update(username).digest('base64');
      iceServers.push({ urls: turnUrls, username, credential });
      turnConfigured = true;
    }
    return res.set('Cache-Control', 'no-store').json({ success: true, iceServers, turnConfigured, credentialLifetimeSeconds: turnConfigured ? 600 : 0 });
  });

  app.post('/admin/live/pricing', async (req, res) => {
    const auth = await requireRole(req, res, ['admin']);
    if (!auth) return;
    try {
      await ensurePricingDocument();
      const body = req.body || {};
      const currentSnap = await pricingRef().get();
      const current = pricingFromSnapshot(currentSnap);
      const hasCallRate = Object.prototype.hasOwnProperty.call(body, 'callRatePerMinute');
      const hasChatRate = Object.prototype.hasOwnProperty.call(body, 'chatRatePerMinute');
      const callRate = hasCallRate ? parseRupeesToPaise(body.callRatePerMinute) : current.callRatePaise;
      const chatRate = hasChatRate ? parseRupeesToPaise(body.chatRatePerMinute) : current.chatRatePaise;
      const maximum = Number(body.maxConcurrentSessions ?? current.maxConcurrentSessions);
      if ((hasCallRate && (callRate === null || callRate < 100 || callRate > 1_000_000)) ||
          (hasChatRate && (chatRate === null || chatRate < 100 || chatRate > 1_000_000))) {
        return res.status(400).json({ success: false, error: 'Legacy global Call/Chat display rates must be from ₹1.00 to ₹10,000.00 per minute, with up to two decimal places.', code: 'LIVE_PRICE_INVALID' });
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

  app.post('/admin/live/commission', async (req, res) => {
    const auth = await requireRole(req, res, ['admin']);
    if (!auth) return;
    try {
      const body = req.body || {};
      const astroPercent = Number(body.astroPercent);
      const adminPercent = Number(body.adminPercent);
      if (!Number.isFinite(astroPercent) || !Number.isFinite(adminPercent) ||
          astroPercent < 0 || astroPercent > 100 || adminPercent < 0 || adminPercent > 100 ||
          Math.abs(astroPercent + adminPercent - 100) > 0.001) {
        return res.status(400).json({
          success: false,
          error: 'Astrologer commission and Admin commission must each be 0–100%, and must add up to 100%.',
          code: 'LIVE_COMMISSION_INVALID'
        });
      }
      await commissionRef().set({
        astroPercent, adminPercent,
        updatedBy: auth.user.uid, updatedAt: nowTimestamp()
      }, { merge: true });
      return res.set('Cache-Control', 'no-store').json({
        success: true, astroPercent, adminPercent
      });
    } catch (error) {
      return replyError(res, error, 'Unable to save Live / Booking commission settings.');
    }
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

  app.post('/live/scheduled-appointments/:id/start', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try {
      const appointmentId = String(req.params.id || '').trim();
      if (!appointmentId) return res.status(400).json({ success: false, error: 'Scheduled booking ID is required.' });
      const appointmentRef = db.collection('smv_appointments').doc(appointmentId);
      const appointmentSnap = await appointmentRef.get();
      if (!appointmentSnap.exists) return res.status(404).json({ success: false, error: 'Scheduled Call/Chat booking was not found.' });
      const appointment = appointmentSnap.data() || {};
      const uid = String(auth.user.uid || '');
      if (String(appointment.astrologerUid || '') !== uid) return res.status(403).json({ success: false, error: 'This scheduled booking belongs to another Astrologer.' });
      if (!['scheduled_call_request', 'scheduled_chat_request'].includes(String(appointment.bookingKind || ''))) {
        return res.status(400).json({ success: false, error: 'This record is not a scheduled Call/Chat booking.' });
      }
      const currentStatus = String(appointment.bookingStatus || 'requested').toLowerCase();
      if (!['accepted', 'in_progress', 'waiting_for_online'].includes(currentStatus)) {
        return res.status(409).json({ success: false, error: 'Accept this booking in the Astrologer dashboard before starting it.' });
      }
      if (currentStatus === 'in_progress' && appointment.liveSessionId) {
        const existingSession = await sessionRef(String(appointment.liveSessionId)).get();
        if (existingSession.exists) {
          return res.set('Cache-Control', 'no-store').json({
            success: true, alreadyProcessed: true, kind: 'session',
            session: liveSessionSafeView(existingSession.id, existingSession.data() || {})
          });
        }
      }
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(appointment.preferredDate || ''));
      const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(appointment.preferredTime || ''));
      if (!dateMatch || !timeMatch) return res.status(409).json({ success: false, error: 'This booking has an invalid scheduled date/time. Ask the Customer to submit it again.' });
      const year = Number(dateMatch[1]), month = Number(dateMatch[2]), day = Number(dateMatch[3]);
      const hour = Number(timeMatch[1]), minute = Number(timeMatch[2]);
      const utc = Date.UTC(year, month - 1, day, hour, minute);
      const roundTrip = new Date(utc);
      if (roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day || hour > 23 || minute > 59) {
        return res.status(409).json({ success: false, error: 'This booking has an invalid scheduled date/time.' });
      }
      const scheduledAt = utc - 330 * 60 * 1000; // Scheduled appointment times are India local time (IST).
      if (Date.now() < scheduledAt && currentStatus !== 'in_progress') {
        return res.status(409).json({ success: false, error: 'The scheduled time has not arrived yet. The Start button becomes available at the booked time.' });
      }
      const [astroStatusSnap, sessionPricingSnap] = await Promise.all([
        db.collection(ASTROLOGERS).doc(uid).get(), pricingRef().get()
      ]);
      if (!astroStatusSnap.exists) return res.status(404).json({ success: false, error: 'Astrologer profile was not found.' });
      const astroStatusData = astroStatusSnap.data() || {};
      const currentAvailability = String(astroStatusData.availabilityStatus || astroStatusData.onlineStatus || 'offline').toLowerCase();
      if (currentAvailability !== 'online') {
        return res.status(409).json({ success: false, error: 'Set your Astrologer Availability to Online before starting the scheduled Call/Chat. The Customer Wallet will not be reserved until you start.' });
      }
      const sessionPricing = pricingFromSnapshot(sessionPricingSnap);
      const activeSessions = Number(astroStatusData.activeSessionCount || 0);
      if (!Number.isSafeInteger(activeSessions) || activeSessions >= sessionPricing.maxConcurrentSessions) {
        return res.status(409).json({ success: false, error: 'Your Live Session limit is currently full. Finish another session and retry the scheduled Start button.' });
      }
      const minutes = Number(appointment.scheduledMinutes || 5);
      if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > MAX_SESSION_MINUTES) {
        return res.status(409).json({ success: false, error: 'The scheduled session duration is invalid. Ask the Customer to rebook.' });
      }
      const mode = appointment.bookingKind === 'scheduled_chat_request' ? 'chat' : 'call';
      const requestId = 'smv-scheduled-' + appointmentId;
      const result = await createRequest({
        customerUid: String(appointment.customerUid || ''),
        astrologerId: uid,
        mode,
        minutes,
        requestId,
        customerName: String(appointment.name || ''),
        birthDetails: appointment.birthDetails || {},
        appointmentId
      });
      if (result.kind === 'session' && result.session) {
        // This button is the Astrologer's explicit Start action for an accepted schedule.
        // Move straight into the 3-minute preparation phase instead of showing a second Accept prompt.
        const accepted = await acceptSession(result.session.id, uid);
        result.session = accepted.session;
      }
      const isSession = result.kind === 'session' && !!result.session;
      await appointmentRef.set({
        bookingStatus: isSession ? 'in_progress' : 'waiting_for_online',
        status: isSession ? 'in_progress' : 'accepted',
        liveSessionId: String(result.session?.id || result.booking?.id || ''),
        liveBookingId: String(result.booking?.id || ''),
        liveRequestId: requestId,
        scheduledStartedAt: isSession ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to start this scheduled Call/Chat.'); }
  });

  app.post('/live/requests', async (req, res) => {
    const auth = await requireRole(req, res, ['customer']);
    if (!auth) return;
    try {
      const result = await createRequest({
        customerUid: auth.user.uid, astrologerId: req.body?.astrologerId,
        mode: req.body?.mode, minutes: req.body?.minutes, requestId: req.body?.requestId,
        customerName: req.body?.customerName, birthDetails: req.body?.birthDetails
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

  app.get('/live/bookings/mine', async (req, res) => {
    const auth = await requireRole(req, res, ['customer']);
    if (!auth) return;
    try {
      const bookings = await listCustomerBookings(auth.user.uid);
      return res.set('Cache-Control', 'no-store').json({ success: true, bookings });
    } catch (error) { return replyError(res, error, 'Unable to load your Live bookings.'); }
  });

  app.post('/live/bookings/:id/accept', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try {
      const result = await acceptBooking({ bookingId: req.params.id, astrologerUid: auth.user.uid });
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) { return replyError(res, error, 'Unable to accept the Live booking.'); }
  });

  app.post('/live/bookings/:id/reject', async (req, res) => {
    const auth = await requireRole(req, res, ['astrologer']);
    if (!auth) return;
    try { return res.json(await rejectBooking(req.params.id, auth.user.uid)); }
    catch (error) { return replyError(res, error, 'Unable to reject this Live booking.'); }
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
      const afterMs = Number(req.query?.afterMs || 0);
      let signalQuery = sessionRef(req.params.id).collection('signals').orderBy('createdAt', afterMs > 0 ? 'asc' : 'desc');
      if (afterMs > 0) signalQuery = signalQuery.where('createdAt', '>=', new Date(Math.max(0, afterMs)));
      const snap = await signalQuery.limit(afterMs > 0 ? 30 : 50).get();
      const signals = snap.docs.map(d => {
        const s = d.data() || {};
        return { id: d.id, sessionId: req.params.id, senderUid: s.senderUid, type: s.type, payload: s.payload, createdAt: timestampMillis(s.createdAt) ? new Date(timestampMillis(s.createdAt)).toISOString() : null };
      }).sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));
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
      const afterMs = Number(req.query?.afterMs || 0);
      let messageQuery = sessionRef(req.params.id).collection('messages').orderBy('createdAt', afterMs > 0 ? 'asc' : 'desc');
      if (afterMs > 0) messageQuery = messageQuery.where('createdAt', '>=', new Date(Math.max(0, afterMs)));
      const snap = await messageQuery.limit(afterMs > 0 ? 50 : 100).get();
      const messages = snap.docs.map(d => {
        const m = d.data() || {};
        return { id: d.id, sessionId: req.params.id, senderUid: m.senderUid, text: m.text, createdAt: timestampMillis(m.createdAt) ? new Date(timestampMillis(m.createdAt)).toISOString() : null };
      }).sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));
      return res.set('Cache-Control', 'no-store').json({ success: true, messages });
    } catch (error) { return replyError(res, error, 'Unable to load Live Chat messages.'); }
  });

  async function restoreTimers() {
    try {
      const snap = await db.collection(SESSIONS).where('state', 'in', ['preparing', 'ringing', 'connecting', 'active']).limit(100).get();
      for (const doc of snap.docs) {
        const d = doc.data() || {};
        trackSession(doc.id, d.customerUid, d.astrologerUid);
        scheduleSessionTimer(doc.id, d);
      }
    } catch (error) {
      console.warn('[Live Session] Active timer restore skipped:', error?.message || error);
    }
  }
  ensurePricingDocument().catch(error => console.warn('[Live Session] Pricing defaults were not persisted yet:', error?.message || error));
  restoreTimers().catch(() => {});

  return { createRequest, acceptBooking, rejectBooking, cancelBooking, acceptSession, readySession, endSession, sendMessage, signal, listSessions, listBookings, listCustomerBookings };
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
  commissionFromSnapshot,
  frozenBookingCommission,
  liveSessionSafeView,
  astrologerRatePaise,
  maxAffordableMinutes,
  calculateBookingReserveRelease,
  preparationWindow,
  scheduledAppointmentStatusForEndedSession,
  isAstrologerLiveModeEnabled,
  astrologerAvailabilityStatus,
  MAX_SESSION_MINUTES,
  DEFAULT_RATE_PAISE,
  PREPARATION_DURATION_MS,
  CHAT_ACCEPT_TIMEOUT_MS,
  validateLiveBirthDetails
};

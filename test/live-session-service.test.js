'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  billableMinutesForElapsedMs,
  calculateLiveSessionCharge,
  pricingFromSnapshot,
  commissionFromSnapshot,
  frozenBookingCommission,
  astrologerRatePaise,
  maxAffordableMinutes,
  calculateBookingReserveRelease,
  sessionTimerPlan,
  preparationWindow,
  scheduledAppointmentStatusForEndedSession,
  scheduledAppointmentStartAtMs,
  scheduledAppointmentStartDeadlineMs,
  scheduledConnectionGraceRemainingMs,
  SCHEDULED_CONNECT_GRACE_MS,
  isAstrologerLiveModeEnabled,
  astrologerAvailabilityStatus,
  MAX_SESSION_MINUTES,
  DEFAULT_RATE_PAISE,
  RING_TIMEOUT_MS,
  CALL_CONNECT_TIMEOUT_MS,
  PREPARATION_DURATION_MS,
  CHAT_ACCEPT_TIMEOUT_MS,
  validateLiveBirthDetails
} = require('../live-session-service');

test('incoming Live Call and Chat requests ring for two minutes without changing connection timers', () => {
  assert.equal(RING_TIMEOUT_MS, 120_000);
  assert.equal(CALL_CONNECT_TIMEOUT_MS, 45_000);
  assert.equal(CHAT_ACCEPT_TIMEOUT_MS, 5 * 60_000);
});

test('started-minute billing charges whole-minute boundaries without adding an extra minute', () => {
  assert.equal(billableMinutesForElapsedMs(0, 30), 0);
  assert.equal(billableMinutesForElapsedMs(1, 30), 1);
  assert.equal(billableMinutesForElapsedMs(59_999, 30), 1);
  assert.equal(billableMinutesForElapsedMs(60_000, 30), 1);
  assert.equal(billableMinutesForElapsedMs(60_001, 30), 2);
  assert.equal(billableMinutesForElapsedMs(299_999, 30), 5);
  assert.equal(billableMinutesForElapsedMs(300_000, 30), 5);
  assert.equal(billableMinutesForElapsedMs(300_001, 30), 6);
  assert.equal(billableMinutesForElapsedMs(600_000, 30), 10);
  assert.equal(billableMinutesForElapsedMs(1_800_000, 30), 30);
});

test('₹25 with a two-minute ₹10/minute reserve settles the actual started minutes', () => {
  const initialBalancePaise = 2500;
  const reservedPaise = 2 * 1000;
  assert.equal(initialBalancePaise - reservedPaise, 500);

  const earlyDisconnect = calculateLiveSessionCharge({
    elapsedMs: 59_999, ratePerMinutePaise: 1000, maximumMinutes: 2
  });
  assert.deepEqual(earlyDisconnect, { elapsedMs: 59_999, billableMinutes: 1, amountPaise: 1000 });
  assert.equal(initialBalancePaise - reservedPaise + (reservedPaise - earlyDisconnect.amountPaise), 1500);

  const atMinuteBoundary = calculateLiveSessionCharge({
    elapsedMs: 60_000, ratePerMinutePaise: 1000, maximumMinutes: 2
  });
  assert.deepEqual(atMinuteBoundary, { elapsedMs: 60_000, billableMinutes: 1, amountPaise: 1000 });
  assert.equal(initialBalancePaise - reservedPaise + (reservedPaise - atMinuteBoundary.amountPaise), 1500);
});

test('selected duration caps charge and an unstarted connection costs zero', () => {
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 0, ratePerMinutePaise: 1000, maximumMinutes: 5
  }), { elapsedMs: 0, billableMinutes: 0, amountPaise: 0 });
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 600_000, ratePerMinutePaise: 1000, maximumMinutes: 3
  }), { elapsedMs: 600_000, billableMinutes: 3, amountPaise: 3000 });
  assert.equal(calculateLiveSessionCharge({
    elapsedMs: 1, ratePerMinutePaise: 1_000_001, maximumMinutes: 3
  }), null);
});

test('Wallet recharge promotional free minutes reduce cash billing and cap at selected duration', () => {
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 0, ratePerMinutePaise: 1000, maximumMinutes: 5, freeMinutes: 2
  }), { elapsedMs: 0, billableMinutes: 0, totalBillableMinutes: 0, freeMinutesUsed: 0, amountPaise: 0 });
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 59_999, ratePerMinutePaise: 1000, maximumMinutes: 5, freeMinutes: 2
  }), { elapsedMs: 59_999, billableMinutes: 0, totalBillableMinutes: 1, freeMinutesUsed: 1, amountPaise: 0 });
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 60_001, ratePerMinutePaise: 1000, maximumMinutes: 5, freeMinutes: 1
  }), { elapsedMs: 60_001, billableMinutes: 1, totalBillableMinutes: 2, freeMinutesUsed: 1, amountPaise: 1000 });
  assert.deepEqual(calculateLiveSessionCharge({
    elapsedMs: 600_000, ratePerMinutePaise: 1200, maximumMinutes: 3, freeMinutes: 1
  }), { elapsedMs: 600_000, billableMinutes: 2, totalBillableMinutes: 3, freeMinutesUsed: 1, amountPaise: 2400 });
  assert.equal(calculateLiveSessionCharge({
    elapsedMs: 60_000, ratePerMinutePaise: 1000, maximumMinutes: 5, freeMinutes: -1
  }), null);
});

test('invalid durations and elapsed times fail closed', () => {
  for (const value of [-1, NaN, Infinity, 'not-a-duration']) {
    assert.equal(billableMinutesForElapsedMs(value, 2), null);
  }
  for (const value of [0, -1, 1.5, NaN]) {
    assert.equal(billableMinutesForElapsedMs(1000, value), null);
  }
  assert.equal(DEFAULT_RATE_PAISE, 1000);
});

test('legacy global pricing defaults safely, but Customer rates come from the selected Astrologer', () => {
  assert.deepEqual(pricingFromSnapshot({ exists: false }), {
    callRatePaise: 1000, chatRatePaise: 1000, maxConcurrentSessions: 1, updatedAt: null
  });
  assert.deepEqual(pricingFromSnapshot({
    exists: true,
    data: () => ({ callRatePaise: 2500, chatRatePaise: 0, maxConcurrentSessions: 99 })
  }), {
    callRatePaise: 2500, chatRatePaise: 1000, maxConcurrentSessions: 1, updatedAt: null
  });
  assert.equal(astrologerRatePaise({ callPricePerMinute: 35, chatPricePerMinute: 20 }, 'call'), 3500);
  assert.equal(astrologerRatePaise({ callPricePerMinute: 35, chatPricePerMinute: 20 }, 'chat'), 2000);
  assert.equal(astrologerRatePaise({ callPricePerMinute: 1, chatPricePerMinute: 5 }, 'call'), 100);
  assert.equal(astrologerRatePaise({ callPricePerMinute: 1, chatPricePerMinute: 5 }, 'chat'), 500);
  assert.equal(astrologerRatePaise({ callPricePerMinute: 0, pricePerMinute: 0 }, 'call'), null);
  assert.equal(astrologerRatePaise({ pricePerQuestion: 100, chatPrice: 12 }, 'chat'), null);
  assert.equal(maxAffordableMinutes(105000, 3500), 30);
  assert.equal(maxAffordableMinutes(25500, 1000), 25);
  assert.equal(maxAffordableMinutes(25500, 1200), 21);
  assert.equal(maxAffordableMinutes(3400, 3500), 0); // ₹34 cannot start a ₹35/minute Call.
  assert.equal(maxAffordableMinutes(1900, 2000), 0); // ₹19 cannot start a ₹20/minute Chat.
  assert.equal(maxAffordableMinutes(1900, 3500), 0); // ₹19 cannot start a ₹35/minute Call.
  assert.equal(maxAffordableMinutes(105000, 2000), 52);
  assert.equal(maxAffordableMinutes(1000, null), 0);
  assert.equal(MAX_SESSION_MINUTES, 1440);
});


test('pending-booking cancellation releases held cash and promotional minutes together', () => {
  assert.deepEqual(calculateBookingReserveRelease({
    availableBalancePaise: 500, reservedBalancePaise: 2000, bonusMinutesBalance: 3,
    reservedBonusMinutes: 2, releaseAmountPaise: 1000, releaseBonusMinutes: 1
  }), {
    availableBalancePaise: 1500, reservedBalancePaise: 1000, bonusMinutesBalance: 4,
    reservedBonusMinutes: 1, releasedAmountPaise: 1000, releasedBonusMinutes: 1
  });
});

test('pending-booking reserve release fails closed on mismatched or unsafe balances', () => {
  assert.equal(calculateBookingReserveRelease({
    availableBalancePaise: 500, reservedBalancePaise: 900, bonusMinutesBalance: 0,
    reservedBonusMinutes: 1, releaseAmountPaise: 1000, releaseBonusMinutes: 1
  }), null);
  assert.equal(calculateBookingReserveRelease({
    availableBalancePaise: 500, reservedBalancePaise: 1000, bonusMinutesBalance: 0,
    reservedBonusMinutes: 0, releaseAmountPaise: 1000, releaseBonusMinutes: 1
  }), null);
  assert.equal(calculateBookingReserveRelease({
    availableBalancePaise: Number.MAX_SAFE_INTEGER, reservedBalancePaise: 1000,
    bonusMinutesBalance: 0, reservedBonusMinutes: 0, releaseAmountPaise: 1000, releaseBonusMinutes: 0
  }), null);
  assert.equal(calculateBookingReserveRelease({
    availableBalancePaise: 0, reservedBalancePaise: 1000, bonusMinutesBalance: 1000000,
    reservedBonusMinutes: 1, releaseAmountPaise: 1000, releaseBonusMinutes: 1
  }), null);
});

test('Live sessions require valid DOB/time/place before the three-minute horoscope preparation', () => {
  assert.equal(PREPARATION_DURATION_MS, 180_000);
  assert.equal(CHAT_ACCEPT_TIMEOUT_MS, 300_000); // Chat remains available for acceptance; Call timeout is unchanged.
  assert.deepEqual(validateLiveBirthDetails({
    birthDate: '1990-05-21', birthTime: '14:35', birthPlace: 'Chennai',
    birthLatitude: '13.0827', birthLongitude: '80.2707', birthTimezone: 'Asia/Kolkata'
  }), {
    birthDate: '1990-05-21', birthTime: '14:35', birthPlace: 'Chennai',
    birthLatitude: 13.0827, birthLongitude: 80.2707, birthTimezone: 'Asia/Kolkata'
  });
  assert.throws(() => validateLiveBirthDetails({birthDate:'2050-01-01',birthTime:'10:00',birthPlace:'Chennai'}), /future/i);
  assert.throws(() => validateLiveBirthDetails({birthDate:'1990-02-31',birthTime:'10:00',birthPlace:'Chennai'}), /Date of Birth/i);
  assert.throws(() => validateLiveBirthDetails({birthDate:'1990-01-01',birthTime:'25:00',birthPlace:'Chennai'}), /Time of Birth/i);
  assert.throws(() => validateLiveBirthDetails({birthDate:'1990-01-01',birthTime:'10:00',birthPlace:'x'}), /Birth Place/i);
});

test('Live Call and Chat commission splits follow the Admin percentage and default safely', () => {
  assert.deepEqual(commissionFromSnapshot({ exists: false }), { astroPercent: 20, adminPercent: 80 });
  assert.deepEqual(commissionFromSnapshot({
    exists: true, data: () => ({ astroPercent: 25, adminPercent: 75 })
  }), { astroPercent: 25, adminPercent: 75 });
  assert.deepEqual(commissionFromSnapshot({
    exists: true, data: () => ({ astroPercent: 20, adminPercent: 60 })
  }), { astroPercent: 20, adminPercent: 80 });
  assert.deepEqual(frozenBookingCommission({
    astrologerCommissionPercent: 30, adminCommissionPercent: 70
  }, { astroPercent: 20, adminPercent: 80 }), { astroPercent: 30, adminPercent: 70 });
  assert.deepEqual(frozenBookingCommission({
    astrologerCommissionPercent: 55, adminCommissionPercent: 55
  }, { astroPercent: 20, adminPercent: 80 }), { astroPercent: 20, adminPercent: 80 });
});


test('Accept starts the three-minute Horoscope preparation window at the acceptance timestamp', () => {
  const acceptedAt = new Date('2026-10-26T06:00:00.000Z');
  const window = preparationWindow(acceptedAt);
  assert.equal(window.preparationStartedAt.toISOString(), acceptedAt.toISOString());
  assert.equal(window.preparationUntil.toISOString(), '2026-10-26T06:03:00.000Z');
  assert.equal(window.preparationUntil.getTime() - window.preparationStartedAt.getTime(), PREPARATION_DURATION_MS);
  assert.equal(preparationWindow('invalid timestamp'), null);
});


test('scheduled bookings keep a two-minute Start and connection grace in IST', () => {
  assert.equal(SCHEDULED_CONNECT_GRACE_MS, 120_000);
  const appointment = { preferredDate: '2026-10-27', preferredTime: '10:00' };
  const scheduledAt = Date.UTC(2026, 9, 27, 10, 0) - 330 * 60 * 1000;
  assert.equal(scheduledAppointmentStartAtMs(appointment), scheduledAt);
  assert.equal(scheduledAppointmentStartDeadlineMs(appointment), scheduledAt + 120_000);
  assert.equal(scheduledAppointmentStartDeadlineMs({ preferredDate: 'bad', preferredTime: '10:00' }), 0);
  const scheduledCall = sessionTimerPlan({ state: 'connecting', mode: 'call', appointmentId: 'apt-1', connectingAt: new Date(scheduledAt) }, scheduledAt);
  const scheduledChat = sessionTimerPlan({ state: 'connecting', mode: 'chat', appointmentId: 'apt-1', connectingAt: new Date(scheduledAt) }, scheduledAt);
  const ordinaryCall = sessionTimerPlan({ state: 'connecting', mode: 'call', connectingAt: new Date(scheduledAt) }, scheduledAt);
  assert.equal(scheduledCall.dueAt, scheduledAt + 120_000);
  assert.equal(scheduledChat.dueAt, scheduledAt + 120_000);
  assert.equal(ordinaryCall.dueAt, scheduledAt + 45_000);
  const scheduledConnecting = { state: 'connecting', appointmentId: 'apt-1', connectingAt: new Date(scheduledAt) };
  assert.equal(scheduledConnectionGraceRemainingMs(scheduledConnecting, scheduledAt), 120_000);
  assert.equal(scheduledConnectionGraceRemainingMs(scheduledConnecting, scheduledAt + 90_000), 30_000);
  assert.equal(scheduledConnectionGraceRemainingMs(scheduledConnecting, scheduledAt + 120_000), 0);
  assert.equal(scheduledConnectionGraceRemainingMs({ ...scheduledConnecting, appointmentId: '' }, scheduledAt), 0);
});

test('ended scheduled appointments reconcile to clear terminal statuses', () => {
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: new Date('2026-10-26T09:00:00.000Z'), endReason: 'participant_ended' }), 'completed');
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: null, endReason: 'rejected' }), 'rejected');
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: null, endReason: 'rejected_by_astrologer' }), 'rejected');
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: null, endReason: 'participant_ended' }), 'cancelled');
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: null, endReason: 'connection_failed' }), 'missed_by_astrologer');
  assert.equal(scheduledAppointmentStatusForEndedSession({ startedAt: null, endReason: 'no_answer' }), 'missed_by_astrologer');
});

test('each enabled live mode is available independently or together', () => {
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:true,liveChatEnabled:false}, 'call'), true);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:true,liveChatEnabled:false}, 'chat'), false);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:false,liveChatEnabled:true}, 'call'), false);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:false,liveChatEnabled:true}, 'chat'), true);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:true,liveChatEnabled:true}, 'call'), true);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:true,liveChatEnabled:true}, 'chat'), true);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:false,liveChatEnabled:false}, 'call'), false);
  assert.equal(isAstrologerLiveModeEnabled({liveCallEnabled:false,liveChatEnabled:false}, 'chat'), false);
});

test('availability automatically follows enabled modes, while active sessions stay Busy', () => {
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:true,liveChatEnabled:true}, 0), 'online');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:true,liveChatEnabled:false}, 0), 'online');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:false,liveChatEnabled:true}, 0), 'online');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:false,liveChatEnabled:false}, 0), 'offline');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:false,liveChatEnabled:false}, 1), 'busy');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:true,liveChatEnabled:true}, 1), 'busy');
});


test('persisted Live Session deadlines reconcile Preparing, Ringing, Connecting and Active states after timer loss', () => {
  const base = Date.parse('2026-10-27T10:00:00.000Z');
  const preparing = sessionTimerPlan({
    state: 'preparing',
    acceptedAt: new Date(base),
    preparationStartedAt: new Date(base),
    preparationUntil: new Date(base + PREPARATION_DURATION_MS)
  }, base + 179_000);
  assert.deepEqual(preparing, {
    dueAt: base + PREPARATION_DURATION_MS,
    reason: 'preparation_complete',
    delayMs: 1_000
  });
  assert.equal(sessionTimerPlan({
    state: 'preparing',
    acceptedAt: new Date(base),
    preparationStartedAt: new Date(base),
    preparationUntil: new Date(base + PREPARATION_DURATION_MS)
  }, base + PREPARATION_DURATION_MS).delayMs, 0);
  assert.equal(sessionTimerPlan({
    state: 'ringing', createdAt: new Date(base)
  }, base + RING_TIMEOUT_MS).reason, 'no_answer');
  assert.equal(sessionTimerPlan({
    state: 'connecting', mode: 'call', connectingAt: new Date(base)
  }, base + CALL_CONNECT_TIMEOUT_MS).reason, 'connection_failed');
  assert.equal(sessionTimerPlan({
    state: 'connecting', mode: 'chat', connectingAt: new Date(base)
  }, base + CHAT_ACCEPT_TIMEOUT_MS).delayMs, 0);
  assert.equal(sessionTimerPlan({
    state: 'active', startedAt: new Date(base), minutes: 3
  }, base + 180_000).reason, 'duration_complete');
  assert.equal(sessionTimerPlan({ state: 'preparing' }, base), null);
  assert.equal(sessionTimerPlan({ state: 'active', startedAt: new Date(base), minutes: -1 }, base), null);
});

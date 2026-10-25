'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  billableMinutesForElapsedMs,
  calculateLiveSessionCharge,
  pricingFromSnapshot,
  astrologerRatePaise,
  maxAffordableMinutes,
  MAX_SESSION_MINUTES,
  DEFAULT_RATE_PAISE
} = require('../live-session-service');

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
  assert.equal(maxAffordableMinutes(3400, 3500), 0);
  assert.equal(maxAffordableMinutes(1900, 2000), 0);
  assert.equal(maxAffordableMinutes(105000, 2000), 52);
  assert.equal(maxAffordableMinutes(1000, null), 0);
  assert.equal(MAX_SESSION_MINUTES, 1440);
});

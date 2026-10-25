'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  billableMinutesForElapsedMs,
  calculateLiveSessionCharge,
  pricingFromSnapshot,
  DEFAULT_RATE_PAISE
} = require('../live-session-service');

test('started-minute billing uses exact millisecond boundaries', () => {
  assert.equal(billableMinutesForElapsedMs(0, 2), 0);
  assert.equal(billableMinutesForElapsedMs(1, 2), 1);
  assert.equal(billableMinutesForElapsedMs(59_999, 2), 1);
  assert.equal(billableMinutesForElapsedMs(60_000, 2), 2);
  assert.equal(billableMinutesForElapsedMs(60_001, 2), 2);
  assert.equal(billableMinutesForElapsedMs(119_999, 2), 2);
  assert.equal(billableMinutesForElapsedMs(120_000, 2), 2);
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
  assert.deepEqual(atMinuteBoundary, { elapsedMs: 60_000, billableMinutes: 2, amountPaise: 2000 });
  assert.equal(initialBalancePaise - reservedPaise + (reservedPaise - atMinuteBoundary.amountPaise), 500);
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

test('pricing defaults to ₹10/minute and ignores invalid stored prices', () => {
  assert.deepEqual(pricingFromSnapshot({ exists: false }), {
    callRatePaise: 1000, chatRatePaise: 1000, maxConcurrentSessions: 1, updatedAt: null
  });
  assert.deepEqual(pricingFromSnapshot({
    exists: true,
    data: () => ({ callRatePaise: 2500, chatRatePaise: 0, maxConcurrentSessions: 99 })
  }), {
    callRatePaise: 2500, chatRatePaise: 1000, maxConcurrentSessions: 1, updatedAt: null
  });
});

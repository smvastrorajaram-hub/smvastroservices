import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWalletReservation,
  calculateWalletReservationSettlement,
  normalizeWallet,
  walletError
} from '../../../shared/backend-platform/wallet-domain.mjs';

const wallet = overrides => normalizeWallet({
  ownerUid: 'customer-1', ownerRole: 'customer',
  availableBalancePaise: 10000, reservedBalancePaise: 0,
  bonusMinutesBalance: 2, reservedBonusMinutes: 0, version: 1,
  ...overrides
});

test('shared Wallet normalization uses integer paise and safe minute values', () => {
  assert.deepEqual(wallet(), {
    ownerUid: 'customer-1', ownerRole: 'customer', currency: 'INR',
    availableBalancePaise: 10000, reservedBalancePaise: 0,
    bonusMinutesBalance: 2, reservedBonusMinutes: 0, version: 1,
    createdAt: null, updatedAt: null
  });
  assert.equal(wallet({ availableBalancePaise: -1 }).availableBalancePaise, 0);
  assert.equal(wallet({ bonusMinutesBalance: 1000001 }).bonusMinutesBalance, 0);
});

test('reserve uses promotional minutes first and reserves only the remaining cash value', () => {
  const result = calculateWalletReservation({ wallet: wallet(), minutes: 5, ratePerMinutePaise: 1000 });
  assert.equal(result.bonusMinutesReserved, 2);
  assert.equal(result.cashMinutesRequired, 3);
  assert.equal(result.reservedAmountPaise, 3000);
  assert.equal(result.availableBalanceAfterPaise, 7000);
  assert.equal(result.reservedBalanceAfterPaise, 3000);
  assert.equal(result.bonusMinutesBalanceAfter, 0);
  assert.equal(result.reservedBonusMinutesAfter, 2);
});

test('reserve rejects insufficient cash balance and invalid durations', () => {
  assert.throws(() => calculateWalletReservation({
    wallet: wallet({ availableBalancePaise: 1000, bonusMinutesBalance: 0 }),
    minutes: 5, ratePerMinutePaise: 1000
  }), error => error.code === 'WALLET_INSUFFICIENT_BALANCE' && error.httpStatus === 409);
  assert.throws(() => calculateWalletReservation({ wallet: wallet(), minutes: 0, ratePerMinutePaise: 1000 }),
    error => error.code === 'LIVE_PRICE_INVALID');
});

test('settlement charges consumed cash, releases unused cash, and returns unused promotional minutes', () => {
  const result = calculateWalletReservationSettlement({
    wallet: wallet({
      availableBalancePaise: 7000, reservedBalancePaise: 3000,
      bonusMinutesBalance: 0, reservedBonusMinutes: 2
    }),
    reservedAmountPaise: 3000, reservedBonusMinutes: 2,
    chargedAmountPaise: 1000, freeMinutesUsed: 1
  });
  assert.equal(result.chargedAmountPaise, 1000);
  assert.equal(result.releasedAmountPaise, 2000);
  assert.equal(result.bonusMinutesReleased, 1);
  assert.equal(result.availableBalancePaise, 9000);
  assert.equal(result.reservedBalancePaise, 0);
  assert.equal(result.bonusMinutesBalance, 1);
  assert.equal(result.reservedBonusMinutes, 0);
});

test('settlement fails closed when stored reserve is inconsistent', () => {
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet({ reservedBalancePaise: 500, reservedBonusMinutes: 0 }),
    reservedAmountPaise: 1000, reservedBonusMinutes: 0,
    chargedAmountPaise: 500, freeMinutesUsed: 0
  }), error => error.code === 'LIVE_WALLET_RESERVE_MISMATCH');
});

test('safe arithmetic refuses overflows and negative values', () => {
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet({ availableBalancePaise: Number.MAX_SAFE_INTEGER }),
    reservedAmountPaise: 0, reservedBonusMinutes: 0,
    chargedAmountPaise: 0, freeMinutesUsed: 0
  }), error => error.code === 'WALLET_BALANCE_OVERFLOW');
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet(), reservedAmountPaise: -1, reservedBonusMinutes: 0,
    chargedAmountPaise: 0, freeMinutesUsed: 0
  }), error => error.code === 'LIVE_BILLING_CALCULATION_FAILED');
});

test('wallet domain exposes stable typed errors', () => {
  const error = walletError('WALLET_TEST', 'sample', 422, { field: 'balance' });
  assert.equal(error.code, 'WALLET_TEST');
  assert.equal(error.httpStatus, 422);
  assert.equal(error.field, 'balance');
});

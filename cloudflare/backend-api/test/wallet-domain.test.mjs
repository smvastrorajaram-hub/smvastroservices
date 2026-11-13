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
  bonusCreditBalancePaise: 2000, reservedBonusCreditPaise: 0, version: 1,
  ...overrides
});

test('shared Wallet normalization exposes only rupee-denominated Bonus Credit', () => {
  assert.deepEqual(wallet(), {
    ownerUid: 'customer-1', ownerRole: 'customer', currency: 'INR',
    availableBalancePaise: 10000, reservedBalancePaise: 0,
    bonusCreditBalancePaise: 2000, reservedBonusCreditPaise: 0,
    version: 1, createdAt: null, updatedAt: null
  });
  assert.equal(wallet({ availableBalancePaise: -1 }).availableBalancePaise, 0);
  assert.equal(wallet({ bonusCreditBalancePaise: -1 }).bonusCreditBalancePaise, 0);
  assert.equal(wallet({ bonusCreditBalancePaise: Number.MAX_SAFE_INTEGER + 1 }).bonusCreditBalancePaise, 0);
  assert.equal(Object.hasOwn(wallet(), 'bonusMinutesBalance'), false);
});

test('reserve uses Bonus Credit first and reserves only the remaining cash amount', () => {
  const result = calculateWalletReservation({ wallet: wallet(), minutes: 5, ratePerMinutePaise: 1000 });
  assert.equal(result.grossRequiredPaise, 5000);
  assert.equal(result.reservedBonusCreditPaise, 2000);
  assert.equal(result.reservedAmountPaise, 3000);
  assert.equal(result.availableBalanceAfterPaise, 7000);
  assert.equal(result.reservedBalanceAfterPaise, 3000);
  assert.equal(result.bonusCreditBalanceAfterPaise, 0);
  assert.equal(result.reservedBonusCreditAfterPaise, 2000);
});

test('reserve rejects insufficient cash balance and invalid durations', () => {
  assert.throws(() => calculateWalletReservation({
    wallet: wallet({ availableBalancePaise: 1000, bonusCreditBalancePaise: 0 }),
    minutes: 5, ratePerMinutePaise: 1000
  }), error => error.code === 'WALLET_INSUFFICIENT_BALANCE' && error.httpStatus === 409);
  assert.throws(() => calculateWalletReservation({ wallet: wallet(), minutes: 0, ratePerMinutePaise: 1000 }),
    error => error.code === 'LIVE_PRICE_INVALID');
});

test('settlement charges consumed cash, releases unused cash, and returns unused Bonus Credit', () => {
  const result = calculateWalletReservationSettlement({
    wallet: wallet({
      availableBalancePaise: 7000, reservedBalancePaise: 3000,
      bonusCreditBalancePaise: 0, reservedBonusCreditPaise: 2000
    }),
    reservedAmountPaise: 3000, reservedBonusCreditPaise: 2000,
    chargedAmountPaise: 1000, bonusCreditUsedPaise: 1000
  });
  assert.equal(result.chargedAmountPaise, 1000);
  assert.equal(result.releasedAmountPaise, 2000);
  assert.equal(result.bonusCreditUsedPaise, 1000);
  assert.equal(result.bonusCreditReleasedPaise, 1000);
  assert.equal(result.availableBalancePaise, 9000);
  assert.equal(result.reservedBalancePaise, 0);
  assert.equal(result.bonusCreditBalancePaise, 1000);
  assert.equal(result.reservedBonusCreditPaise, 0);
});

test('settlement fails closed when stored cash or Bonus Credit reserve is inconsistent', () => {
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet({ reservedBalancePaise: 500, reservedBonusCreditPaise: 0 }),
    reservedAmountPaise: 1000, reservedBonusCreditPaise: 0,
    chargedAmountPaise: 500, bonusCreditUsedPaise: 0
  }), error => error.code === 'LIVE_WALLET_RESERVE_MISMATCH');
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet({ reservedBalancePaise: 1000, reservedBonusCreditPaise: 500 }),
    reservedAmountPaise: 1000, reservedBonusCreditPaise: 1000,
    chargedAmountPaise: 500, bonusCreditUsedPaise: 500
  }), error => error.code === 'LIVE_WALLET_RESERVE_MISMATCH');
});

test('safe arithmetic refuses overflows and negative values', () => {
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet({ availableBalancePaise: Number.MAX_SAFE_INTEGER, reservedBalancePaise: 1 }),
    reservedAmountPaise: 1, reservedBonusCreditPaise: 0,
    chargedAmountPaise: 0, bonusCreditUsedPaise: 0
  }), error => error.code === 'WALLET_BALANCE_OVERFLOW');
  assert.throws(() => calculateWalletReservationSettlement({
    wallet: wallet(), reservedAmountPaise: -1, reservedBonusCreditPaise: 0,
    chargedAmountPaise: 0, bonusCreditUsedPaise: 0
  }), error => error.code === 'LIVE_BILLING_CALCULATION_FAILED');
});

test('wallet domain exposes stable typed errors', () => {
  const error = walletError('WALLET_TEST', 'sample', 422, { field: 'balance' });
  assert.equal(error.code, 'WALLET_TEST');
  assert.equal(error.httpStatus, 422);
  assert.equal(error.field, 'balance');
});

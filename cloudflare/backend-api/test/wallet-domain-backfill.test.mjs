import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLET_DOMAIN_BACKFILL_COLLECTIONS,
  legacyTimestampMilliseconds,
  mapLegacyWalletDomainDocument
} from '../../../shared/backend-platform/wallet-domain-backfill.mjs';

test('legacy datetime-local dates retain the original India Standard Time meaning', () => {
  assert.equal(
    legacyTimestampMilliseconds('2026-10-31T10:00'),
    Date.parse('2026-10-31T10:00:00+05:30')
  );
  assert.equal(
    legacyTimestampMilliseconds('2026-10-31T10:00:00Z'),
    Date.parse('2026-10-31T10:00:00Z')
  );
  assert.equal(legacyTimestampMilliseconds({ seconds: 1793424000, nanoseconds: 500000000 }), 1793424000500);
  assert.equal(legacyTimestampMilliseconds('not-a-date'), null);
});

test('backfill inventory explicitly covers historical Wallet, Live, billing and webhook records', () => {
  for (const key of [
    'wallets','walletTransactions','walletRecharges','walletRechargeOffers','walletOfferAudit',
    'walletOfferUsageCounters','liveSessions','liveBookings','liveSessionMessages','liveSessionSignals',
    'scheduledCallChatAppointments','liveSessionEarnings','withdrawals','withdrawalPayouts',
    'walletRechargeOrders','razorpayWebhookEvents','billingSettings'
  ]) assert.ok(WALLET_DOMAIN_BACKFILL_COLLECTIONS[key], key + ' should be inventoried');
});

test('Wallet snapshot mapping uses an upsert that cannot overwrite a Wallet with a live ledger', () => {
  const mapped = mapLegacyWalletDomainDocument('wallets', {
    id: 'customer-1',
    data: {
      ownerUid: 'customer-1', ownerRole: 'customer', currency: 'INR',
      availableBalancePaise: 7250, reservedBalancePaise: 0,
      bonusMinutesBalance: 4, reservedBonusMinutes: 0,
      version: 8, createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-10-31T00:00:00Z')
    },
    updateTime: new Date('2026-10-31T00:00:00Z')
  });
  assert.equal(mapped.mapped, true);
  const snapshot = mapped.statements.find(row => row.kind === 'wallet_snapshot');
  assert.ok(snapshot);
  assert.match(snapshot.sql, /NOT EXISTS \(SELECT 1 FROM smv_domain_wallet_ledger/);
  assert.deepEqual(snapshot.values.slice(0, 7), ['customer-1','customer',7250,0,4,0,8]);
  assert.equal(mapped.statements.some(row => row.kind === 'legacy_document_archive'), true);
});

test('legacy Wallet transactions are archived separately and never replay the live D1 ledger trigger', () => {
  const mapped = mapLegacyWalletDomainDocument('walletTransactions', {
    id: 'legacy-ledger-1',
    data: {
      ownerUid: 'customer-1', ownerRole: 'customer', type: 'recharge',
      direction: 'credit', amountPaise: 5000, balanceAfterPaise: 7250,
      reservedBalanceAfterPaise: 0, bonusMinutesCredited: 5,
      bonusMinutesBalanceAfter: 5, reservedBonusMinutesAfter: 0,
      idempotencyKey: 'recharge:payment-1', status: 'posted',
      referenceType: 'razorpay_payment', referenceId: 'payment-1',
      createdAt: new Date('2026-10-01T00:00:00Z')
    }
  });
  const legacy = mapped.statements.find(row => row.kind === 'legacy_wallet_transaction');
  assert.ok(legacy);
  assert.match(legacy.sql, /smv_domain_legacy_wallet_transactions/);
  assert.equal(mapped.statements.some(row => /INSERT INTO smv_domain_wallet_ledger/.test(row.sql)), false);
  assert.deepEqual(legacy.values.slice(0, 6), ['legacy-ledger-1','customer-1','customer','recharge','credit',5000]);
});

test('fully linked paid recharge creates an idempotent lookup without issuing a second credit', () => {
  const mapped = mapLegacyWalletDomainDocument('walletRecharges', {
    id: 'legacy-recharge-1',
    data: {
      customerUid: 'customer-1', amountPaise: 5000, currency: 'INR',
      status: 'paid', razorpayOrderId: 'order-1', razorpayPaymentId: 'payment-1',
      paidAmountPaise: 5000, bonusMinutesCredited: 3,
      offerId: 'festival-1', offerName: 'Deepavali',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      paidAt: new Date('2026-10-01T00:01:00Z')
    }
  });
  assert.equal(mapped.mapped, true);
  assert.equal(mapped.statements.filter(row => row.kind === 'legacy_wallet_recharge').length, 1);
  const lookup = mapped.statements.find(row => row.kind === 'paid_legacy_recharge_lookup');
  assert.ok(lookup);
  assert.match(lookup.sql, /INSERT OR IGNORE INTO smv_domain_wallet_recharges/);
  assert.deepEqual(lookup.values.slice(0, 5), ['legacy-recharge-1','customer-1',5000,'order-1','payment-1']);
  assert.equal(mapped.statements.some(row => /INSERT INTO smv_domain_wallet_ledger/.test(row.sql)), false);
});

test('non-terminal recharge is preserved in the legacy archive without becoming a paid lookup', () => {
  const mapped = mapLegacyWalletDomainDocument('walletRecharges', {
    id: 'pending-recharge',
    data: { customerUid:'customer-1', amountPaise:2500, status:'order_created', razorpayOrderId:'order-pending' }
  });
  assert.equal(mapped.statements.some(row => row.kind === 'legacy_wallet_recharge'), true);
  assert.equal(mapped.statements.some(row => row.kind === 'paid_legacy_recharge_lookup'), false);
});

test('Offer definitions and usage counters preserve existing successful redemption history', () => {
  const offer = mapLegacyWalletDomainDocument('walletRechargeOffers', {
    id: 'diwali-offer',
    data: {
      offerType:'wallet_recharge_bonus_minutes', name:'Deepavali',
      bannerTheme:'diwali', enabled:true, minimumRechargeAmountPaise:5000,
      bonusMinutes:10, perCustomerLimit:2, totalUsageLimit:100,
      usedCount:20, successfulRedemptions:18, totalBonusMinutesAwarded:180,
      priority:30, startAt:'2026-10-20T10:00', endAt:'2026-11-01T10:00'
    }
  });
  const offerSql = offer.statements.find(row=>row.kind==='wallet_offer');
  assert.ok(offerSql);
  assert.match(offerSql.sql,/legacy_successful_redemptions/);
  assert.equal(offerSql.values[12],18);
  assert.equal(offerSql.values[13],180);

  const usage = mapLegacyWalletDomainDocument('walletOfferUsageCounters', {
    id:'usage-hash',
    data:{ offerId:'diwali-offer', customerUid:'customer-1', redemptionCount:2, lastRechargeId:'recharge-2' }
  });
  const usageSql = usage.statements.find(row=>row.kind==='offer_usage_counter');
  assert.ok(usageSql);
  assert.match(usageSql.sql,/MAX\(smv_domain_wallet_offer_redemption_usage.redemption_count/);
  assert.deepEqual(usageSql.values.slice(0,4),['diwali-offer','customer-1',2,'recharge-2']);
});

test('nested Live messages and signals retain their session parent identity', () => {
  const message = mapLegacyWalletDomainDocument('liveSessionMessages', {
    id:'message-1', data:{ senderUid:'customer-1', text:'Hello', createdAt:new Date('2026-10-31T00:00:00Z') }
  }, { parentId:'session-1' });
  assert.equal(message.statements[0].values[0],'session-1');
  assert.equal(message.statements[0].values[1],'message-1');

  const signal = mapLegacyWalletDomainDocument('liveSessionSignals', {
    id:'signal-1', data:{ senderUid:'customer-1', signalType:'offer', payload:{sdp:'test'} }
  }, { parentId:'session-1' });
  assert.equal(signal.statements[0].values[0],'session-1');
  assert.equal(signal.statements[0].values[1],'signal-1');
});

test('unsupported or malformed records produce explicit warnings instead of silent coercion', () => {
  const wallet = mapLegacyWalletDomainDocument('wallets', {
    id:'bad-wallet', data:{ ownerRole:'unknown', availableBalancePaise:-1 }
  });
  assert.equal(wallet.warning,'WALLET_SNAPSHOT_INVALID');
  const unsupported = mapLegacyWalletDomainDocument('unknownCollection', { id:'x', data:{} });
  assert.equal(unsupported.warning,'BACKFILL_COLLECTION_UNSUPPORTED');
});

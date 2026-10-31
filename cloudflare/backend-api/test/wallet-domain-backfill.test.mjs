import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLET_DOMAIN_BACKFILL_COLLECTIONS,
  legacyTimestampMilliseconds,
  mapLegacyWalletDomainDocument,
  mapLegacyWalletDomainDocumentWithPayoutEncryption
} from '../../../shared/backend-platform/wallet-domain-backfill.mjs';
import { webcrypto } from 'node:crypto';

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
  assert.match(legacy.sql, /INSERT OR IGNORE INTO smv_domain_legacy_wallet_transactions/);
  assert.doesNotMatch(legacy.sql, /DO UPDATE SET/);
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
  assert.equal(offerSql.values[13],18);
  assert.equal(offerSql.values[14],180);

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


test('scheduled appointments redact contact fields while retaining normalized booking data', () => {
  const mapped = mapLegacyWalletDomainDocument('scheduledCallChatAppointments', {
    id:'appointment-safe-1',
    data:{
      customerUid:'customer-1',astrologerUid:'astro-1',
      bookingKind:'scheduled_call_request',status:'confirmed',
      preferredDate:'2026-11-05',preferredTime:'18:30',
      customerPhone:'+919999999999',customerEmail:'person@example.test',
      createdAt:new Date('2026-11-01T00:00:00Z')
    }
  });
  assert.equal(mapped.mapped,true);
  const row=mapped.statements.find(item=>item.kind==='scheduled_appointment');
  assert.ok(row);
  assert.doesNotMatch(row.values[7],/9999999999|person@example\.test/);
  assert.match(row.values[7],/scheduled_call_request/);
});

test('wallet Razorpay orders map normalized order, payment and deterministic idempotency fields', () => {
  const mapped = mapLegacyWalletDomainDocument('walletRechargeOrders', {
    id:'doc-order-1',
    data:{
      service:'SMV ASTRO Wallet Recharge',orderId:'order_123',
      amount:5000,currency:'INR',status:'paid',paymentId:'pay_123',
      walletRechargeId:'recharge-123',customerUid:'customer-1',
      createdAt:new Date('2026-11-01T00:00:00Z')
    }
  });
  assert.equal(mapped.mapped,true);
  const row=mapped.statements.find(item=>item.kind==='wallet_recharge_order');
  assert.ok(row);
  assert.match(row.sql,/INSERT OR IGNORE INTO smv_domain_razorpay_orders/);
  assert.deepEqual(row.values.slice(0,7),['order_123','customer-1','SMV ASTRO Wallet Recharge',5000,'INR','paid','pay_123']);
  assert.equal(row.values[10],'recharge-123');
  assert.equal(row.values[11],'legacy-order:order_123');
});

test('legacy payout records never map to the old plaintext table', () => {
  const mapped=mapLegacyWalletDomainDocument('withdrawalPayouts',{
    id:'withdrawal-plaintext-guard',
    data:{withdrawalId:'withdrawal-plaintext-guard',bankAccountNumber:'do-not-store'}
  });
  assert.equal(mapped.mapped,false);
  assert.equal(mapped.warning,'PAYOUT_ENCRYPTION_REQUIRED');
  assert.equal(mapped.statements.length,0);
});

test('private payout payload uses AES-256-GCM and never enters plaintext archive', async () => {
  const privateValue='private-account-number-12345';
  const rawKey=webcrypto.getRandomValues(new Uint8Array(32));
  const key=btoa(String.fromCharCode(...rawKey));
  const document={
    id:'withdrawal-encrypted-1',
    data:{withdrawalId:'withdrawal-encrypted-1',bankAccountNumber:privateValue,ifsc:'TEST0001',
      createdAt:new Date('2026-11-01T00:00:00Z')}
  };
  const mapped=await mapLegacyWalletDomainDocumentWithPayoutEncryption('withdrawalPayouts',document,{
    payoutEncryptionKey:key,payoutKeyVersion:'v2',sourceProjectId:'smv-astro-staging',cryptoImpl:webcrypto
  });
  assert.equal(mapped.mapped,true);
  const encrypted=mapped.statements.find(item=>item.kind==='encrypted_withdrawal_payout');
  const archive=mapped.statements.find(item=>item.kind==='legacy_document_archive');
  assert.ok(encrypted && archive);
  assert.match(encrypted.sql,/smv_domain_withdrawal_payouts_encrypted/);
  assert.equal(encrypted.values[1],'AES-256-GCM');
  assert.equal(encrypted.values[2],'v2');
  assert.equal(encrypted.values[3].length,24);
  assert.equal(encrypted.values[5].length,32);
  assert.doesNotMatch(archive.values[4],/private-account-number-12345|TEST0001/);
  assert.doesNotMatch(JSON.stringify(mapped),/private-account-number-12345|TEST0001/);
  const imported=await webcrypto.subtle.importKey('raw',rawKey,{name:'AES-GCM'},false,['decrypt']);
  const nonce=Uint8Array.from(encrypted.values[3].match(/../g),v=>parseInt(v,16));
  const ciphertext=Uint8Array.from((encrypted.values[4]+encrypted.values[5]).match(/../g),v=>parseInt(v,16));
  const aad=new TextEncoder().encode('smv-astro-wallet-payout:v1:smv-astro-staging:withdrawal-encrypted-1:v2');
  const clear=await webcrypto.subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:128},imported,ciphertext);
  assert.equal(new TextDecoder().decode(clear),JSON.stringify(document.data));
});

test('private payout mapping fails closed when staging key is missing or invalid', async () => {
  const document={id:'withdrawal-key-needed',data:{withdrawalId:'withdrawal-key-needed',accountNumber:'secret'}};
  const missing=await mapLegacyWalletDomainDocumentWithPayoutEncryption('withdrawalPayouts',document,{cryptoImpl:webcrypto});
  assert.equal(missing.mapped,false);
  assert.equal(missing.warning,'PAYOUT_ENCRYPTION_KEY_MISSING');
  const invalid=await mapLegacyWalletDomainDocumentWithPayoutEncryption('withdrawalPayouts',document,{
    payoutEncryptionKey:'not-a-key',cryptoImpl:webcrypto
  });
  assert.equal(invalid.mapped,false);
  assert.equal(invalid.warning,'PAYOUT_ENCRYPTION_FAILED');
});

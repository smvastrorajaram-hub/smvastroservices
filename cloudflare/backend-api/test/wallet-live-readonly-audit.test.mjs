import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createStrictReadOnlyD1Guard,
  createWalletLiveReadOnlyAudit,
  WALLET_LIVE_READONLY_AUDIT_COLLECTIONS
} from '../../../shared/backend-platform/wallet-live-readonly-audit.mjs';

function doc(id, data) {
  return { id, exists: true, data, updateTime: new Date('2026-10-31T00:00:00Z') };
}

function fixtureCollections() {
  return {
    smv_wallets: [
      doc('wallet-1', { ownerUid:'wallet-1', ownerRole:'customer', availableBalancePaise:5000,
        reservedBalancePaise:0, bonusMinutesBalance:3, reservedBonusMinutes:0, version:2 }),
      doc('wallet-2', { ownerUid:'wallet-2', ownerRole:'customer', availableBalancePaise:7000,
        reservedBalancePaise:500, bonusMinutesBalance:0, reservedBonusMinutes:0, version:4 })
    ],
    smv_wallet_transactions: [
      doc('ledger-1', { ownerUid:'wallet-1', ownerRole:'customer', type:'recharge', direction:'credit',
        amountPaise:5000, balanceAfterPaise:5000, reservedBalanceAfterPaise:0,
        bonusMinutes:0, bonusMinutesCredited:3, bonusMinutesBalanceAfter:3,
        reservedBonusMinutesAfter:0, idempotencyKey:'same-key', referenceId:'recharge-1' }),
      doc('ledger-2', { ownerUid:'wallet-1', ownerRole:'customer', type:'recharge', direction:'credit',
        amountPaise:6000, balanceAfterPaise:11000, reservedBalanceAfterPaise:0,
        bonusMinutes:0, bonusMinutesCredited:3, bonusMinutesBalanceAfter:6,
        reservedBonusMinutesAfter:0, idempotencyKey:'same-key', referenceId:'recharge-2' })
    ],
    smv_wallet_recharges: [
      doc('recharge-1', { customerUid:'wallet-1', amountPaise:5000, status:'paid',
        razorpayOrderId:'order-1', razorpayPaymentId:'payment-1', paidAmountPaise:5000 })
    ],
    smv_offers: [
      doc('offer-1', { offerType:'wallet_recharge_bonus_minutes', name:'Test bonus',
        enabled:true, minimumRechargeAmountPaise:5000, bonusMinutes:3,
        perCustomerLimit:1, totalUsageLimit:100, usedCount:1, priority:1 })
    ],
    smv_offer_audit: [
      doc('offer-audit-1', { service:'wallet_recharge', action:'redeemed', createdAt:new Date() })
    ],
    smv_offer_usage_counters: [
      doc('usage-1', { offerId:'offer-1', customerUid:'wallet-1',
        redemptionCount:1, lastRechargeId:'recharge-1' })
    ],
    smv_live_sessions: [
      doc('session.with.dot', { customerUid:'wallet-1', astrologerUid:'astro-1',
        mode:'chat', state:'completed', appointmentId:'appointment-1',
        reservedAmountPaise:500, reservedBonusMinutes:1, actualChargePaise:300 })
    ],
    smv_live_bookings: [
      doc('booking-1', { customerUid:'wallet-1', astrologerUid:'astro-1',
        mode:'call', status:'completed', liveSessionId:'missing-session',
        walletReservationState:'settled', reservedAmountPaise:500, reservedBonusMinutes:0 })
    ],
    smv_appointments: [
      doc('appointment-1', { customerUid:'wallet-1', astrologerUid:'astro-1',
        bookingKind:'scheduled_chat_request', status:'completed',
        liveSessionId:'session.with.dot', preferredDate:'2026-10-31', preferredTime:'10:00' })
    ],
    smv_payments: [
      doc('earning-1', { source:'live_session', astrologerUid:'astro-1',
        customerUid:'wallet-1', sessionId:'missing-earning-session',
        grossAmountPaise:10000, astrologerAmountPaise:8000, adminAmountPaise:2000,
        status:'completed' })
    ],
    smv_withdrawals: [
      doc('withdrawal-1', { astrologerUid:'astro-1', amountPaise:30000, status:'pending' })
    ],
    smv_withdrawal_payouts: [
      doc('withdrawal-1', { withdrawalId:'withdrawal-1',
        bankAccountNumber:'SENSITIVE-BANK-VALUE', ifsc:'SENSITIVE-IFSC-VALUE' })
    ],
    razorpay_orders: [
      doc('order-1', { serviceName:'SMV ASTRO Wallet Recharge',
        amountPaise:5000, status:'paid', razorpayPaymentId:'payment-1' })
    ],
    razorpay_webhook_events: [
      doc('webhook-1', { event:'payment.captured', eventId:'event-1',
        razorpayOrderId:'missing-order', razorpayPaymentId:'missing-payment',
        processed:true, retryCount:1 })
    ],
    'smv_live_sessions/session.with.dot/messages': [
      doc('message-1', { senderUid:'wallet-1', text:'First message' }),
      doc('message-2', { senderUid:'astro-1', text:'Second message' })
    ],
    'smv_live_sessions/session.with.dot/signals': [
      doc('signal-1', { senderUid:'wallet-1', signalType:'offer',
        payload:{ description:'test-only' } })
    ]
  };
}

function firestoreFixture() {
  const collections = fixtureCollections();
  const calls = [];
  const firestore = {
    projectId:'smv-astro-staging',
    async listDocuments(path, { pageSize = 100, pageToken = '' } = {}) {
      calls.push({ path, pageToken });
      const documents = collections[path] || [];
      const offset = Number(pageToken || 0);
      const page = documents.slice(offset, offset + pageSize);
      const next = offset + page.length;
      return {
        documents:page,
        nextPageToken:next < documents.length ? String(next) : ''
      };
    },
    async getDocument(path) {
      const id = path.split('/').pop();
      return { exists:['liveSessionPricing','commission'].includes(id), id,
        data:id === 'liveSessionPricing' ? { callRatePaisePerMinute:100 } : { adminPercent:20 } };
    }
  };
  return { firestore, calls };
}

test('inventory covers every requested Wallet, Razorpay, Live, earnings and billing source', () => {
  assert.equal(WALLET_LIVE_READONLY_AUDIT_COLLECTIONS.length,17);
  for (const key of [
    'wallets','walletTransactions','walletRecharges','walletRechargeOffers','walletOfferAudit',
    'walletOfferUsageCounters','liveSessions','liveBookings','liveSessionMessages','liveSessionSignals',
    'scheduledCallChatAppointments','liveSessionEarnings','withdrawals','withdrawalPayouts',
    'walletRechargeOrders','razorpayWebhookEvents','billingSettings'
  ]) assert.ok(WALLET_LIVE_READONLY_AUDIT_COLLECTIONS.includes(key),key);
});

test('full audit paginates every collection and discovers every session child collection', async () => {
  const { firestore, calls } = firestoreFixture();
  const audit = createWalletLiveReadOnlyAudit({
    firestore, pageSize:1, cryptoImpl:webcrypto
  });
  const report = await audit.run();
  const byKey = Object.fromEntries(report.collections.map(item=>[item.collection,item]));

  assert.equal(report.complete,true);
  assert.equal(byKey.wallets.totalSourceDocuments,2);
  assert.equal(byKey.wallets.pagesScanned,2);
  assert.equal(byKey.liveSessionMessages.totalSourceDocuments,2);
  assert.equal(byKey.liveSessionMessages.pagesScanned,2);
  assert.equal(byKey.liveSessionMessages.parentSessionsScanned,1);
  assert.equal(byKey.liveSessionSignals.totalSourceDocuments,1);
  assert.equal(byKey.liveSessionSignals.parentSessionsScanned,1);
  assert.ok(calls.some(call=>call.path==='smv_live_sessions/session.with.dot/messages'));
  assert.ok(calls.some(call=>call.path==='smv_live_sessions/session.with.dot/signals'));
  assert.equal(byKey.billingSettings.totalSourceDocuments,2);
  assert.equal(report.totals.sourceDocuments,21);
  assert.equal(report.totals.pagesScanned,21);
});

test('audit surfaces unmappable private payouts and raw-only Razorpay order mapping without leaking data', async () => {
  const { firestore } = firestoreFixture();
  const report = await createWalletLiveReadOnlyAudit({
    firestore, pageSize:2, cryptoImpl:webcrypto
  }).run();
  const byKey = Object.fromEntries(report.collections.map(item=>[item.collection,item]));

  assert.equal(byKey.withdrawalPayouts.unmappableRecords,1);
  assert.equal(byKey.withdrawalPayouts.plannedD1Statements,0);
  assert.equal(byKey.withdrawalPayouts.warningCounts.PAYOUT_ENCRYPTION_REQUIRED,1);
  assert.equal(byKey.walletRechargeOrders.rawArchiveOnlyRecords,1);
  assert.equal(byKey.walletRechargeOrders.plannedD1Statements,1);
  assert.ok(report.securityBlockers.some(item=>item.includes('AES-GCM')));
  const json = JSON.stringify(report);
  for (const value of [
    'SENSITIVE-BANK-VALUE','SENSITIVE-IFSC-VALUE','wallet-1','astro-1',
    'message-1','session.with.dot','payment-1'
  ]) assert.equal(json.includes(value),false);
  assert.equal(report.personalDataReturned,false);
  assert.equal(report.credentialsReturned,false);
  assert.equal(report.cutoverSafe,false);
});

test('consistency audit detects wallet idempotency conflicts and broken booking/settlement/payment links', async () => {
  const { firestore } = firestoreFixture();
  const report = await createWalletLiveReadOnlyAudit({ firestore, pageSize:3, cryptoImpl:webcrypto }).run();
  const checks = report.relatedRecordsConsistency.missingReferences;
  const duplicates = report.relatedRecordsConsistency.duplicateOrIdempotencyConflicts;

  assert.equal(duplicates.walletTransactionIdempotencyDuplicateGroups,1);
  assert.equal(duplicates.walletTransactionIdempotencyConflictGroups,1);
  assert.equal(checks.liveBookingsMissingSession,1);
  assert.equal(checks.liveSessionEarningsMissingSession,1);
  assert.equal(checks.razorpayWebhooksMissingOrder,1);
  assert.equal(checks.razorpayWebhooksMissingRechargePayment,1);
  assert.equal(checks.walletOfferUsageMissingRecharge,0);
  assert.equal(checks.liveSessionsMissingScheduledAppointment,0);
  assert.equal(checks.scheduledAppointmentsMissingSession,0);
});

test('read-only D1 guard rejects batch, exec and prepared statement execution', () => {
  const db=createStrictReadOnlyD1Guard();
  assert.throws(()=>db.batch([]),/READ_ONLY_PREVIEW_WRITE_GUARD/);
  assert.throws(()=>db.exec('DELETE FROM x'),/READ_ONLY_PREVIEW_WRITE_GUARD/);
  assert.throws(()=>db.prepare('SELECT 1').bind().run(),/READ_ONLY_PREVIEW_WRITE_GUARD/);
  assert.throws(()=>db.prepare('SELECT 1').bind().all(),/READ_ONLY_PREVIEW_WRITE_GUARD/);
});

test('audit rejects a Firestore client from any Firebase project except staging', () => {
  assert.throws(()=>createWalletLiveReadOnlyAudit({
    firestore:{ projectId:'smv-astro-production', listDocuments(){}, getDocument(){} }
  }),error=>error?.code==='FIRESTORE_PROJECT_SCOPE_REJECTED');
});

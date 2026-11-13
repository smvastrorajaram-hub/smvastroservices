import { WALLET_DOMAIN_BACKFILL_COLLECTIONS } from './wallet-domain-backfill.mjs';
import { WALLET_RECHARGE_OFFER_TYPE } from './wallet-recharge-domain.mjs';
import { createWalletDomainBackfillService } from './d1-wallet-domain-backfill.mjs';

export const WALLET_LIVE_READONLY_AUDIT_COLLECTIONS = Object.freeze([
  'wallets',
  'walletTransactions',
  'walletRecharges',
  'walletRechargeOffers',
  'walletOfferAudit',
  'walletOfferUsageCounters',
  'liveSessions',
  'liveBookings',
  'scheduledCallChatAppointments',
  'liveSessionEarnings',
  'withdrawals',
  'withdrawalPayouts',
  'walletRechargeOrders',
  'razorpayWebhookEvents',
  'billingSettings',
  'liveSessionMessages',
  'liveSessionSignals'
]);

const OUT_OF_SCOPE_WARNING = code => String(code || '').startsWith('NOT_');

const SENSITIVE_FIELD_NAME =
  /password|passwd|token|secret|private.?key|bank|account|ifsc|upi|vpa|phone|mobile|email|address|contact/i;

function blockedWrite() {
  throw Object.assign(new Error('READ_ONLY_PREVIEW_WRITE_GUARD'), {
    code: 'READ_ONLY_PREVIEW_WRITE_GUARD'
  });
}

/**
 * The audit receives no usable D1 binding. Any accidental prepare/run, batch,
 * exec, or statement execution fails closed before a D1 request can occur.
 */
export function createStrictReadOnlyD1Guard() {
  const statement = Object.freeze({
    bind() { return statement; },
    run: blockedWrite,
    all: blockedWrite,
    first: blockedWrite,
    raw: blockedWrite
  });
  return Object.freeze({
    prepare() { return statement; },
    batch: blockedWrite,
    exec: blockedWrite
  });
}

function emptyCollection(key) {
  const definition = WALLET_DOMAIN_BACKFILL_COLLECTIONS[key];
  const sourceCollection = definition?.child
    ? definition.path + '/{sessionId}/' + definition.child
    : definition?.path || key;
  return {
    collection: key,
    sourceCollection,
    pagesScanned: 0,
    totalSourceDocuments: 0,
    domainMappableRecords: 0,
    rawArchiveOnlyRecords: 0,
    outOfScopeRecords: 0,
    unmappableRecords: 0,
    sensitivePayloadRecords: 0,
    plannedD1Statements: 0,
    plannedD1StatementKinds: {},
    warningCounts: {},
    rawArchiveOnlyReasons: {},
    parentSessionsScanned: 0,
    writesPerformed: 0
  };
}

function increment(object, key, amount = 1) {
  const name = String(key || 'UNKNOWN');
  object[name] = (object[name] || 0) + amount;
}

function primitiveString(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function timestampMilliseconds(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && typeof value.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  if (value && typeof value === 'object' &&
      Number.isFinite(Number(value.seconds ?? value._seconds))) {
    return Number(value.seconds ?? value._seconds) * 1000 +
      Number(value.nanoseconds ?? value._nanoseconds ?? 0) / 1_000_000;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value) {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
}

function statusBucket(value) {
  const status = primitiveString(value).toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(status) ? status || 'unspecified' : 'other';
}

function hasSensitiveField(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 24) return false;
  if (Array.isArray(value)) return value.some(item => hasSensitiveField(item, depth + 1));
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELD_NAME.test(key)) return true;
    if (hasSensitiveField(child, depth + 1)) return true;
  }
  return false;
}

function collectionReport(accumulator) {
  return {
    ...accumulator,
    plannedD1StatementKinds: Object.fromEntries(
      Object.entries(accumulator.plannedD1StatementKinds).sort(([a], [b]) => a.localeCompare(b))
    ),
    warningCounts: Object.fromEntries(
      Object.entries(accumulator.warningCounts).sort(([a], [b]) => a.localeCompare(b))
    ),
    rawArchiveOnlyReasons: Object.fromEntries(
      Object.entries(accumulator.rawArchiveOnlyReasons).sort(([a], [b]) => a.localeCompare(b))
    ),
    warningCount: Object.values(accumulator.warningCounts).reduce((sum, count) => sum + count, 0),
    complete: true
  };
}

function duplicateGroups(rows, keyOf, fingerprintOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = primitiveString(keyOf(row));
    if (!key) continue;
    const group = groups.get(key) || { count: 0, fingerprints: new Set() };
    group.count += 1;
    group.fingerprints.add(primitiveString(fingerprintOf(row)));
    groups.set(key, group);
  }
  let duplicateGroupCount = 0;
  let conflictingGroupCount = 0;
  for (const group of groups.values()) {
    if (group.count > 1) {
      duplicateGroupCount += 1;
      if (group.fingerprints.size > 1) conflictingGroupCount += 1;
    }
  }
  return { duplicateGroupCount, conflictingGroupCount };
}

function sourceReferences() {
  return {
    wallets: new Set(),
    walletSnapshots: [],
    transactions: [],
    recharges: [],
    offers: new Set(),
    offerUsage: [],
    sessions: new Set(),
    sessionRecords: [],
    sessionAppointments: [],
    liveBookings: [],
    scheduledAppointments: new Set(),
    appointmentSessions: [],
    earnings: [],
    withdrawals: new Set(),
    withdrawalRecords: [],
    withdrawalPayouts: [],
    orders: [],
    webhooks: [],
    billingSettings: []
  };
}

function collectReferences(key, document, refs) {
  const data = document.data || {};
  const id = primitiveString(document.id);
  switch (key) {
    case 'wallets': {
      const ownerUid = primitiveString(data.ownerUid) || id;
      refs.wallets.add(ownerUid);
      refs.walletSnapshots.push({
        ownerUid,
        availableBalancePaise: safeInteger(data.availableBalancePaise),
        reservedBalancePaise: safeInteger(data.reservedBalancePaise),
        bonusCreditBalancePaise: safeInteger(data.bonusCreditBalancePaise),
        reservedBonusCreditPaise: safeInteger(data.reservedBonusCreditPaise),
        version: safeInteger(data.version),
        updatedAtMs: timestampMilliseconds(data.updatedAt)
      });
      break;
    }
    case 'walletTransactions':
      refs.transactions.push({
        documentId:id,ownerUid:primitiveString(data.ownerUid),
        idempotencyKey:primitiveString(data.idempotencyKey),type:primitiveString(data.type),
        direction:primitiveString(data.direction),amountPaise:safeInteger(data.amountPaise),
        balanceAfterPaise:safeInteger(data.balanceAfterPaise),
        reservedBalanceAfterPaise:safeInteger(data.reservedBalanceAfterPaise),
        bonusCreditDeltaPaise:safeInteger(data.bonusCreditDeltaPaise),
        reservedBonusCreditDeltaPaise:safeInteger(data.reservedBonusCreditDeltaPaise),
        bonusCreditBalanceAfterPaise:safeInteger(data.bonusCreditBalanceAfterPaise),
        reservedBonusCreditBalanceAfterPaise:safeInteger(data.reservedBonusCreditBalanceAfterPaise),
        referenceType:primitiveString(data.referenceType),referenceId:primitiveString(data.referenceId),
        createdAtMs:timestampMilliseconds(data.createdAt)
      });
      break;
    case 'walletRecharges':
      refs.recharges.push({
        rechargeId:id,customerUid:primitiveString(data.customerUid),
        orderId:primitiveString(data.razorpayOrderId||data.orderId),
        paymentId:primitiveString(data.razorpayPaymentId||data.paymentId),
        amountPaise:safeInteger(data.amountPaise),paidAmountPaise:safeInteger(data.paidAmountPaise),
        bonusCreditCreditedPaise:safeInteger(data.bonusCreditCreditedPaise),
        bonusCreditBalanceAfterPaise:safeInteger(data.bonusCreditBalanceAfterPaise),
        idempotencyKey:primitiveString(data.idempotencyKey),status:primitiveString(data.status).toLowerCase()
      });
      break;
    case 'walletRechargeOffers':
      if(data.offerType===WALLET_RECHARGE_OFFER_TYPE) refs.offers.add(id);
      break;
    case 'walletOfferUsageCounters':
      refs.offerUsage.push({
        offerId: primitiveString(data.offerId),
        lastRechargeId: primitiveString(data.lastRechargeId)
      });
      break;
    case 'liveSessions':
      refs.sessions.add(id);
      refs.sessionRecords.push({
        sessionId:id,customerUid:primitiveString(data.customerUid),
        state:statusBucket(data.state||data.status),appointmentId:primitiveString(data.appointmentId),
        reservedAmountPaise:safeInteger(data.reservedAmountPaise),
        reservedBonusCreditPaise:safeInteger(data.reservedBonusCreditPaise),
        actualChargePaise:safeInteger(data.actualChargePaise),
        actualServiceAmountPaise:safeInteger(data.actualServiceAmountPaise),
        releasedAmountPaise:safeInteger(data.releasedAmountPaise),
        bonusCreditUsedPaise:safeInteger(data.bonusCreditUsedPaise),
        bonusCreditReleasedPaise:safeInteger(data.bonusCreditReleasedPaise),
        astrologerCommissionPaise:safeInteger(data.astrologerCommissionPaise),
        adminCommissionPaise:safeInteger(data.adminCommissionPaise),
        astrologerCommissionPercent:Number(data.astrologerCommissionPercent),
        adminCommissionPercent:Number(data.adminCommissionPercent)
      });
      refs.sessionAppointments.push(primitiveString(data.appointmentId));
      break;
    case 'liveBookings':
      refs.liveBookings.push({
        bookingId:id,sessionId:primitiveString(data.liveSessionId||data.sessionId),
        appointmentId:primitiveString(data.appointmentId),status:statusBucket(data.status),
        walletReservationState:statusBucket(data.walletReservationState),
        reservedAmountPaise:safeInteger(data.reservedAmountPaise),
        reservedBonusCreditPaise:safeInteger(data.reservedBonusCreditPaise)
      });
      break;
    case 'scheduledCallChatAppointments':
      if (['scheduled_call_request', 'scheduled_chat_request'].includes(primitiveString(data.bookingKind))) {
        refs.scheduledAppointments.add(id);
        refs.appointmentSessions.push({
          sessionId: primitiveString(data.liveSessionId || data.sessionId),
          status: primitiveString(data.status || data.bookingStatus).toLowerCase()
        });
      }
      break;
    case 'liveSessionEarnings':
      if (data.source === 'live_session') {
        refs.earnings.push({
          earningId: id,
          sessionId: primitiveString(data.sessionId || data.referenceId),
          grossAmountPaise: safeInteger(data.grossAmountPaise),
          earningAmountPaise: safeInteger(data.earningAmountPaise),
          adminCommissionAmountPaise: safeInteger(data.adminCommissionAmountPaise) ?? (Number.isFinite(Number(data.adminCommissionAmount)) ? Math.round(Number(data.adminCommissionAmount) * 100) : null),
          commissionPercent: Number(data.commissionPercent),
          adminCommissionPercent: Number(data.adminCommissionPercent),
          status: statusBucket(data.status),
          paymentStatus: statusBucket(data.paymentStatus)
        });
      }
      break;
    case 'withdrawals':
      refs.withdrawals.add(id);
      refs.withdrawalRecords.push({
        withdrawalId: id,
        astrologerUid: primitiveString(data.astrologerUid || data.astrologerId),
        amountPaise: safeInteger(data.amountPaise),
        status: statusBucket(data.status),
        availableAtMs: timestampMilliseconds(data.availableAt)
      });
      break;
    case 'withdrawalPayouts':
      refs.withdrawalPayouts.push(primitiveString(data.withdrawalId) || id);
      break;
    case 'walletRechargeOrders':
      if (primitiveString(data.serviceName || data.service) === 'SMV ASTRO Wallet Recharge') {
        refs.orders.push({
          orderId: primitiveString(data.razorpayOrderId || data.orderId || id),
          paymentId: primitiveString(data.razorpayPaymentId || data.paymentId),
          amountPaise: safeInteger(data.amountPaise ?? data.amount),
          status: primitiveString(data.status || data.paymentStatus).toLowerCase(),
          serviceName: primitiveString(data.serviceName || data.service),
          walletRechargeId: primitiveString(data.walletRechargeId),
          customerUid: primitiveString(data.firebaseUid || data.customerUid),
          idempotencyKey: primitiveString(data.idempotencyKey || data.receipt)
        });
      }
      break;
    case 'razorpayWebhookEvents':
      refs.webhooks.push({
        eventKey: primitiveString(data.idempotencyKey || data.eventId || id),
        orderId: primitiveString(data.razorpayOrderId || data.orderId),
        paymentId: primitiveString(data.razorpayPaymentId || data.paymentId),
        eventType: statusBucket(data.event || data.eventType),
        processed: data.processed === true,
        retryCount: safeInteger(data.retryCount)
      });
      break;
    case 'billingSettings':
      refs.billingSettings.push({ settingId: id, data });
      break;
    default:
      break;
  }
}

function buildConsistency(refs) {
  const orderIds = new Set(refs.orders.map(item => item.orderId).filter(Boolean));
  const orderPaymentIds = new Set(refs.orders.map(item => item.paymentId).filter(Boolean));
  const rechargePaymentIds = new Set(refs.recharges.map(item => item.paymentId).filter(Boolean));

  const transactionIdempotency = duplicateGroups(
    refs.transactions,
    item => item.idempotencyKey ? [item.ownerUid, item.type, item.idempotencyKey].join('|') : '',
    item => [item.ownerUid, item.type, item.direction, item.amountPaise, item.referenceId].join('|')
  );
  const rechargeOrderDuplicates = duplicateGroups(
    refs.recharges,
    item => item.orderId,
    item => [item.customerUid, item.paymentId, item.amountPaise, item.status].join('|')
  );
  const rechargePaymentDuplicates = duplicateGroups(
    refs.recharges,
    item => item.paymentId,
    item => [item.customerUid, item.orderId, item.amountPaise, item.status].join('|')
  );
  const sourceOrderDuplicates = duplicateGroups(
    refs.orders,
    item => item.orderId,
    item => [item.paymentId, item.amountPaise, item.status].join('|')
  );
  const sourcePaymentDuplicates = duplicateGroups(
    refs.orders,
    item => item.paymentId,
    item => [item.orderId, item.amountPaise, item.status].join('|')
  );
  const webhookDuplicates = duplicateGroups(
    refs.webhooks,
    item => item.eventKey,
    item => [item.orderId, item.paymentId].join('|')
  );

  const rechargeIdempotency = duplicateGroups(
    refs.recharges,
    item => item.idempotencyKey,
    item => [item.customerUid, item.orderId, item.paymentId, item.amountPaise, item.status].join('|')
  );
  const razorpayOrderIdempotency = duplicateGroups(
    refs.orders,
    item => item.idempotencyKey,
    item => [item.orderId, item.paymentId, item.amountPaise, item.status].join('|')
  );

  const missingReferences = {
    walletTransactionsMissingWallet: refs.transactions.filter(
      item => item.ownerUid && !refs.wallets.has(item.ownerUid)
    ).length,
    walletRechargesMissingWallet: refs.recharges.filter(
      item => item.customerUid && !refs.wallets.has(item.customerUid)
    ).length,
    walletRechargesMissingRazorpayOrder: refs.recharges.filter(
      item => item.orderId && !orderIds.has(item.orderId)
    ).length,
    walletRechargesPaidWithoutPaymentId: refs.recharges.filter(
      item => item.status === 'paid' && !item.paymentId
    ).length,
    walletOfferUsageMissingOffer: refs.offerUsage.filter(
      item => item.offerId && !refs.offers.has(item.offerId)
    ).length,
    walletOfferUsageMissingRecharge: refs.offerUsage.filter(
      item => item.lastRechargeId &&
        !refs.recharges.some(recharge => recharge.rechargeId === item.lastRechargeId)
    ).length,
    liveSessionsMissingScheduledAppointment: refs.sessionAppointments.filter(
      id => id && !refs.scheduledAppointments.has(id)
    ).length,
    liveBookingsMissingSession: refs.liveBookings.filter(
      item => item.sessionId && !refs.sessions.has(item.sessionId)
    ).length,
    scheduledAppointmentsMissingSession: refs.appointmentSessions.filter(
      item => item.sessionId && !refs.sessions.has(item.sessionId) &&
        ['accepted', 'confirmed', 'completed', 'finished', 'connected'].includes(item.status)
    ).length,
    liveSessionEarningsMissingSession: refs.earnings.filter(
      item => item.sessionId && !refs.sessions.has(item.sessionId)
    ).length,
    withdrawalPayoutsMissingWithdrawal: refs.withdrawalPayouts.filter(
      id => id && !refs.withdrawals.has(id)
    ).length,
    razorpayWebhooksMissingOrder: refs.webhooks.filter(
      item => item.orderId && !orderIds.has(item.orderId)
    ).length,
    razorpayWebhooksMissingRechargePayment: refs.webhooks.filter(
      item => item.paymentId && !rechargePaymentIds.has(item.paymentId) &&
        !orderPaymentIds.has(item.paymentId)
    ).length
  };

  const duplicateOrIdempotencyConflicts = {
    walletTransactionIdempotencyDuplicateGroups: transactionIdempotency.duplicateGroupCount,
    walletTransactionIdempotencyConflictGroups: transactionIdempotency.conflictingGroupCount,
    walletRechargeOrderDuplicateGroups: rechargeOrderDuplicates.duplicateGroupCount,
    walletRechargeOrderConflictGroups: rechargeOrderDuplicates.conflictingGroupCount,
    walletRechargePaymentDuplicateGroups: rechargePaymentDuplicates.duplicateGroupCount,
    walletRechargePaymentConflictGroups: rechargePaymentDuplicates.conflictingGroupCount,
    walletRechargeIdempotencyDuplicateGroups: rechargeIdempotency.duplicateGroupCount,
    walletRechargeIdempotencyConflictGroups: rechargeIdempotency.conflictingGroupCount,
    razorpayOrderDuplicateGroups: sourceOrderDuplicates.duplicateGroupCount,
    razorpayOrderConflictGroups: sourceOrderDuplicates.conflictingGroupCount,
    razorpayPaymentDuplicateGroups: sourcePaymentDuplicates.duplicateGroupCount,
    razorpayPaymentConflictGroups: sourcePaymentDuplicates.conflictingGroupCount,
    razorpayOrderIdempotencyDuplicateGroups: razorpayOrderIdempotency.duplicateGroupCount,
    razorpayOrderIdempotencyConflictGroups: razorpayOrderIdempotency.conflictingGroupCount,
    razorpayWebhookIdempotencyDuplicateGroups: webhookDuplicates.duplicateGroupCount,
    razorpayWebhookIdempotencyConflictGroups: webhookDuplicates.conflictingGroupCount
  };

  const byCollection = {
    smv_wallets: {
      transactionsPointingToMissingWallets: missingReferences.walletTransactionsMissingWallet,
      rechargesPointingToMissingWallets: missingReferences.walletRechargesMissingWallet
    },
    smv_wallet_transactions: {
      missingWalletReferences: missingReferences.walletTransactionsMissingWallet,
      duplicateIdempotencyKeyGroups: duplicateOrIdempotencyConflicts.walletTransactionIdempotencyDuplicateGroups,
      conflictingIdempotencyKeyGroups: duplicateOrIdempotencyConflicts.walletTransactionIdempotencyConflictGroups
    },
    smv_wallet_recharges: {
      missingWalletReferences: missingReferences.walletRechargesMissingWallet,
      missingRazorpayOrderReferences: missingReferences.walletRechargesMissingRazorpayOrder,
      paidRecordsMissingPaymentId: missingReferences.walletRechargesPaidWithoutPaymentId,
      duplicateOrderIdGroups: duplicateOrIdempotencyConflicts.walletRechargeOrderDuplicateGroups,
      conflictingOrderIdGroups: duplicateOrIdempotencyConflicts.walletRechargeOrderConflictGroups,
      duplicatePaymentIdGroups: duplicateOrIdempotencyConflicts.walletRechargePaymentDuplicateGroups,
      conflictingPaymentIdGroups: duplicateOrIdempotencyConflicts.walletRechargePaymentConflictGroups
    },
    smv_offer_usage_counters: {
      missingOfferReferences: missingReferences.walletOfferUsageMissingOffer,
      missingRechargeReferences: missingReferences.walletOfferUsageMissingRecharge
    },
    smv_live_sessions: {
      missingScheduledAppointmentReferences: missingReferences.liveSessionsMissingScheduledAppointment
    },
    smv_live_bookings: {
      missingSessionReferences: missingReferences.liveBookingsMissingSession
    },
    smv_appointments: {
      acceptedOrCompletedRecordsMissingSession: missingReferences.scheduledAppointmentsMissingSession
    },
    smv_payments: {
      earningsMissingLiveSession: missingReferences.liveSessionEarningsMissingSession
    },
    smv_withdrawal_payouts: {
      missingWithdrawalReferences: missingReferences.withdrawalPayoutsMissingWithdrawal
    },
    razorpay_orders: {
      duplicateOrderIdGroups: duplicateOrIdempotencyConflicts.razorpayOrderDuplicateGroups,
      conflictingOrderIdGroups: duplicateOrIdempotencyConflicts.razorpayOrderConflictGroups,
      duplicatePaymentIdGroups: duplicateOrIdempotencyConflicts.razorpayPaymentDuplicateGroups,
      conflictingPaymentIdGroups: duplicateOrIdempotencyConflicts.razorpayPaymentConflictGroups
    },
    razorpay_webhook_events: {
      missingOrderReferences: missingReferences.razorpayWebhooksMissingOrder,
      missingRechargeOrOrderPaymentReferences: missingReferences.razorpayWebhooksMissingRechargePayment,
      duplicateIdempotencyGroups: duplicateOrIdempotencyConflicts.razorpayWebhookIdempotencyDuplicateGroups,
      conflictingIdempotencyGroups: duplicateOrIdempotencyConflicts.razorpayWebhookIdempotencyConflictGroups
    }
  };

  return { missingReferences, duplicateOrIdempotencyConflicts, byCollection };
}


function buildFinancialReconciliation(refs) {
  const walletBalance = {
    walletsChecked:refs.walletSnapshots.length,walletsWithLedger:0,
    nonInitialWalletsMissingLedger:0,balanceSnapshotsChecked:0,
    snapshotMismatches:0,missingLedgerSnapshots:0,conflictingLatestTimestampSnapshots:0
  };
  const balanceFields=[
    ['availableBalancePaise','balanceAfterPaise'],
    ['reservedBalancePaise','reservedBalanceAfterPaise'],
    ['bonusCreditBalancePaise','bonusCreditBalanceAfterPaise'],
    ['reservedBonusCreditPaise','reservedBonusCreditBalanceAfterPaise']
  ];
  for(const wallet of refs.walletSnapshots) {
    const entries=refs.transactions.filter(item=>item.ownerUid===wallet.ownerUid);
    if(!entries.length) {
      const hasNonInitial=balanceFields.some(([field])=>wallet[field]!==null&&wallet[field]!==0)||
        (wallet.version!==null&&wallet.version>1);
      if(hasNonInitial) walletBalance.nonInitialWalletsMissingLedger++;
      continue;
    }
    walletBalance.walletsWithLedger++;
    for(const [walletField,ledgerField] of balanceFields) {
      const rows=entries.filter(item=>item.createdAtMs!==null&&item[ledgerField]!==null);
      if(!rows.length) {
        if(wallet[walletField]!==null&&wallet[walletField]!==0) walletBalance.missingLedgerSnapshots++;
        continue;
      }
      const latestAt=Math.max(...rows.map(item=>item.createdAtMs));
      const latestRows=rows.filter(item=>item.createdAtMs===latestAt);
      const values=new Set(latestRows.map(item=>String(item[ledgerField])));
      walletBalance.balanceSnapshotsChecked++;
      if(values.size>1){walletBalance.conflictingLatestTimestampSnapshots++;continue;}
      if(wallet[walletField]!==null&&latestRows[0][ledgerField]!==wallet[walletField]) walletBalance.snapshotMismatches++;
    }
  }

  const paidRecharge={
    paidRechargesChecked:0,missingWalletRechargeOrders:0,ordersNotMarkedPaid:0,
    orderPaymentIdMismatches:0,orderRechargeReferenceMismatches:0,orderCustomerMismatches:0,
    missingRechargeCreditLedger:0,rechargeCreditOwnerMismatches:0,
    rechargeCreditAmountMismatches:0,rechargeBonusCreditMismatches:0
  };
  for(const recharge of refs.recharges) {
    if(recharge.status!=='paid') continue;
    paidRecharge.paidRechargesChecked++;
    const order=refs.orders.find(item=>item.orderId===recharge.orderId);
    if(!recharge.orderId||!order) paidRecharge.missingWalletRechargeOrders++;
    else {
      if(order.status!=='paid') paidRecharge.ordersNotMarkedPaid++;
      if(recharge.paymentId&&order.paymentId!==recharge.paymentId) paidRecharge.orderPaymentIdMismatches++;
      if(order.walletRechargeId&&order.walletRechargeId!==recharge.rechargeId) paidRecharge.orderRechargeReferenceMismatches++;
      if(order.customerUid&&recharge.customerUid&&order.customerUid!==recharge.customerUid) paidRecharge.orderCustomerMismatches++;
    }
    const credit=recharge.paymentId?refs.transactions.find(item=>
      item.ownerUid===recharge.customerUid&&item.type==='recharge'&&item.direction==='credit'&&
      item.referenceType==='razorpay_payment'&&item.referenceId===recharge.paymentId&&
      item.idempotencyKey==='recharge:'+recharge.paymentId):null;
    if(!credit){paidRecharge.missingRechargeCreditLedger++;continue;}
    if(credit.ownerUid!==recharge.customerUid) paidRecharge.rechargeCreditOwnerMismatches++;
    const expectedAmount=recharge.paidAmountPaise??recharge.amountPaise;
    if(expectedAmount!==null&&credit.amountPaise!==expectedAmount) paidRecharge.rechargeCreditAmountMismatches++;
    if(recharge.bonusCreditCreditedPaise!==null&&
       (credit.bonusCreditDeltaPaise??0)!==recharge.bonusCreditCreditedPaise) {
      paidRecharge.rechargeBonusCreditMismatches++;
    }
  }

  const liveReservationSettlement={
    sessionsChecked:refs.sessionRecords.length,sessionsMissingReservationLedger:0,
    sessionReservationAmountMismatches:0,sessionBonusCreditReserveMismatches:0,
    endedSessionsMissingUsageLedger:0,sessionUsageAmountMismatches:0,
    sessionsMissingCashReleaseLedger:0,sessionCashReleaseAmountMismatches:0,
    sessionsMissingBonusCreditUsageLedger:0,sessionBonusCreditUsageMismatches:0,
    sessionsMissingBonusCreditReleaseLedger:0,sessionBonusCreditReleaseMismatches:0,
    sessionBonusCreditNotReconciled:0,sessionCommissionPercentMismatches:0,
    sessionCommissionAmountMismatches:0,chargedSessionsMissingEarning:0,
    sessionEarningAmountMismatches:0,pendingBookingsMissingReservationLedger:0,
    transferredBookingsMissingSession:0,bookingReservationAmountMismatches:0,
    bookingBonusCreditReserveMismatches:0
  };
  const terminalStates=new Set(['ended','completed','cancelled','rejected','expired','no_show']);
  const txForReference=(referenceId,type)=>refs.transactions.find(item=>
    item.referenceId===referenceId&&item.type===type);

  for(const session of refs.sessionRecords) {
    const reserve=refs.transactions.find(item=>item.referenceId===session.sessionId&&
      ['live_session_reserve','live_booking_reserve'].includes(item.type));
    if(!reserve) {
      if((session.reservedAmountPaise||0)>0||(session.reservedBonusCreditPaise||0)>0) {
        liveReservationSettlement.sessionsMissingReservationLedger++;
      }
    } else {
      if(reserve.amountPaise!==session.reservedAmountPaise) liveReservationSettlement.sessionReservationAmountMismatches++;
      if((reserve.reservedBonusCreditDeltaPaise??0)!==(session.reservedBonusCreditPaise??0)) {
        liveReservationSettlement.sessionBonusCreditReserveMismatches++;
      }
    }

    if(!terminalStates.has(session.state)) continue;
    const cashCharge=session.actualChargePaise??0;
    const grossCharge=session.actualServiceAmountPaise??(cashCharge+(session.bonusCreditUsedPaise??0));
    const cashRelease=session.releasedAmountPaise??0;
    const bonusUsed=session.bonusCreditUsedPaise??0;
    const bonusReleased=session.bonusCreditReleasedPaise??0;
    const usage=txForReference(session.sessionId,'live_session_usage');
    const cashReleaseLedger=txForReference(session.sessionId,'live_session_unused_release');
    const bonusUsage=txForReference(session.sessionId,'live_session_bonus_credit_used');
    const bonusRelease=txForReference(session.sessionId,'live_session_bonus_credit_release');
    if(cashCharge>0&&!usage) liveReservationSettlement.endedSessionsMissingUsageLedger++;
    if(usage&&usage.amountPaise!==cashCharge) liveReservationSettlement.sessionUsageAmountMismatches++;
    if(cashRelease>0&&!cashReleaseLedger) liveReservationSettlement.sessionsMissingCashReleaseLedger++;
    if(cashReleaseLedger&&cashReleaseLedger.amountPaise!==cashRelease) liveReservationSettlement.sessionCashReleaseAmountMismatches++;
    if(bonusUsed>0&&!bonusUsage) liveReservationSettlement.sessionsMissingBonusCreditUsageLedger++;
    if(bonusUsage&&bonusUsage.amountPaise!==bonusUsed) liveReservationSettlement.sessionBonusCreditUsageMismatches++;
    if(bonusReleased>0&&!bonusRelease) liveReservationSettlement.sessionsMissingBonusCreditReleaseLedger++;
    if(bonusRelease&&bonusRelease.amountPaise!==bonusReleased) liveReservationSettlement.sessionBonusCreditReleaseMismatches++;
    if((session.reservedBonusCreditPaise??0)!==bonusUsed+bonusReleased) liveReservationSettlement.sessionBonusCreditNotReconciled++;

    if(grossCharge>0) {
      const astroPercent=session.astrologerCommissionPercent,adminPercent=session.adminCommissionPercent;
      if(!Number.isFinite(astroPercent)||!Number.isFinite(adminPercent)||Math.abs(astroPercent+adminPercent-100)>0.001) {
        liveReservationSettlement.sessionCommissionPercentMismatches++;
      }
      if(session.astrologerCommissionPaise!==null&&session.adminCommissionPaise!==null&&
         session.astrologerCommissionPaise+session.adminCommissionPaise!==grossCharge) {
        liveReservationSettlement.sessionCommissionAmountMismatches++;
      }
      const earning=refs.earnings.find(item=>item.sessionId===session.sessionId);
      if(!earning) liveReservationSettlement.chargedSessionsMissingEarning++;
      else {
        if(earning.grossAmountPaise!==null&&earning.grossAmountPaise!==grossCharge) {
          liveReservationSettlement.sessionEarningAmountMismatches++;
        }
        if(earning.earningAmountPaise!==null&&session.astrologerCommissionPaise!==null&&
           earning.earningAmountPaise!==session.astrologerCommissionPaise) {
          liveReservationSettlement.sessionEarningAmountMismatches++;
        }
      }
    }
  }

  for(const booking of refs.liveBookings) {
    const reserve=refs.transactions.find(item=>item.referenceId===booking.bookingId&&item.type==='live_booking_reserve');
    if(booking.walletReservationState==='reserved'&&!reserve) liveReservationSettlement.pendingBookingsMissingReservationLedger++;
    if(booking.walletReservationState==='transferred'&&booking.sessionId&&!refs.sessions.has(booking.sessionId)) {
      liveReservationSettlement.transferredBookingsMissingSession++;
    }
    if(reserve) {
      if(booking.reservedAmountPaise!==null&&reserve.amountPaise!==booking.reservedAmountPaise) {
        liveReservationSettlement.bookingReservationAmountMismatches++;
      }
      if((reserve.reservedBonusCreditDeltaPaise??0)!==(booking.reservedBonusCreditPaise??0)) {
        liveReservationSettlement.bookingBonusCreditReserveMismatches++;
      }
    }
  }

  const commissionSetting=refs.billingSettings.find(item=>item.settingId==='commission');
  const pricingSettingPresent=refs.billingSettings.some(item=>item.settingId==='liveSessionPricing');
  const commissionSettingPresent=!!commissionSetting;
  const commissionData=commissionSetting?.data||{};
  const sourceAstroPercent=Number(commissionData.astroPercent),sourceAdminPercent=Number(commissionData.adminPercent);
  const commissionPercentValid=commissionSettingPresent&&Number.isFinite(sourceAstroPercent)&&
    Number.isFinite(sourceAdminPercent)&&sourceAstroPercent>=0&&sourceAstroPercent<=100&&
    sourceAdminPercent>=0&&sourceAdminPercent<=100&&Math.abs(sourceAstroPercent+sourceAdminPercent-100)<=0.001;
  const effectiveAstroPercent=commissionSettingPresent?sourceAstroPercent:20;
  const effectiveAdminPercent=commissionSettingPresent?sourceAdminPercent:80;
  const commissionEffectivePercentValid=Number.isFinite(effectiveAstroPercent)&&Number.isFinite(effectiveAdminPercent)&&
    effectiveAstroPercent>=0&&effectiveAstroPercent<=100&&effectiveAdminPercent>=0&&effectiveAdminPercent<=100&&
    Math.abs(effectiveAstroPercent+effectiveAdminPercent-100)<=0.001;
  const missingSettings=[];
  if(!pricingSettingPresent) missingSettings.push('smv_settings/liveSessionPricing');
  if(!commissionSettingPresent) missingSettings.push('smv_settings/commission');
  const billingConfiguration={
    pricingSettingPresent,commissionSettingPresent,commissionPercentValid,commissionEffectivePercentValid,
    effectiveCommissionSource:commissionSettingPresent?'firestore':'legacy_runtime_fallback',
    effectiveAstroPercent,effectiveAdminPercent,missingSettings
  };

  const withdrawal={
    withdrawalsChecked:refs.withdrawalRecords.length,
    withdrawalsWithInvalidAmount:refs.withdrawalRecords.filter(item=>item.amountPaise===null||item.amountPaise<=0).length,
    payoutsWithoutWithdrawal:refs.withdrawalPayouts.filter(item=>!refs.withdrawals.has(item)).length
  };
  const statusCounts={recharges:{},walletRechargeOrders:{},razorpayWebhookEvents:{},liveSessions:{},liveBookings:{},liveEarnings:{},withdrawals:{}};
  for(const item of refs.recharges) increment(statusCounts.recharges,statusBucket(item.status));
  for(const item of refs.orders) increment(statusCounts.walletRechargeOrders,statusBucket(item.status));
  for(const item of refs.webhooks) increment(statusCounts.razorpayWebhookEvents,item.processed?'processed':'not_processed');
  for(const item of refs.sessionRecords) increment(statusCounts.liveSessions,statusBucket(item.state));
  for(const item of refs.liveBookings) increment(statusCounts.liveBookings,statusBucket(item.status));
  for(const item of refs.earnings) increment(statusCounts.liveEarnings,statusBucket(item.status));
  for(const item of refs.withdrawalRecords) increment(statusCounts.withdrawals,statusBucket(item.status));
  return {walletBalance,paidRecharge,liveReservationSettlement,billingConfiguration,withdrawal,statusCounts};
}


/**
 * Read-only, all-pages Wallet + Live audit. Firestore is wrapped to expose only
 * listDocuments/getDocument. The D1 binding is replaced by a strict write guard.
 * No source IDs or source payload values are included in the report.
 */
export function createWalletLiveReadOnlyAudit({
  firestore,
  expectedProjectId = 'smv-astro-staging',
  pageSize = 100,
  maxPageRequests = 100000,
  cryptoImpl = globalThis.crypto,
  payoutEncryptionKey = '',
  payoutKeyVersion = 'v1',
  now = Date.now
} = {}) {
  if (!firestore || typeof firestore.listDocuments !== 'function' ||
      typeof firestore.getDocument !== 'function') {
    throw new TypeError('A Firestore read-only client is required.');
  }
  if (String(firestore.projectId || '') !== expectedProjectId) {
    throw Object.assign(new Error('FIRESTORE_PROJECT_SCOPE_REJECTED'), {
      code: 'FIRESTORE_PROJECT_SCOPE_REJECTED'
    });
  }

  const readOnlyFirestore = Object.freeze({
    projectId: expectedProjectId,
    listDocuments: (...args) => firestore.listDocuments(...args),
    getDocument: (...args) => firestore.getDocument(...args)
  });
  const db = createStrictReadOnlyD1Guard();
  const backfill = createWalletDomainBackfillService({
    db,
    firestore: readOnlyFirestore,
    now,
    cryptoImpl,
    payoutEncryptionKey,
    payoutKeyVersion,
    sourceProjectId: expectedProjectId
  });

  async function run() {
    const accumulators = Object.fromEntries(
      WALLET_LIVE_READONLY_AUDIT_COLLECTIONS.map(key => [key, emptyCollection(key)])
    );
    const refs = sourceReferences();
    const sessionParents = [];
    let totalPageRequests = 0;

    async function recordDocument(key, document, parentId = '') {
      const accumulator = accumulators[key];
      const data = document.data || {};
      collectReferences(key, document, refs);
      if (hasSensitiveField(data)) accumulator.sensitivePayloadRecords += 1;

      // Domain mappers retain only validated business fields and the common
      // archive serializer removes sensitive-keyed values. Payout details use
      // a separate AES-256-GCM mapper and never enter a plaintext archive.
      const mapped = await backfill.mapDocument(key, document, { parentId, nowMs: Number(now()) });

      const warning = String(mapped.warning || '');
      if (warning) increment(accumulator.warningCounts, warning);
      if (mapped.mapped === true) {
        accumulator.domainMappableRecords += 1;
      } else if (warning === 'RAW_ARCHIVE_ONLY') {
        accumulator.rawArchiveOnlyRecords += 1;
        increment(accumulator.rawArchiveOnlyReasons, warning);
      } else if (OUT_OF_SCOPE_WARNING(warning)) {
        accumulator.outOfScopeRecords += 1;
      } else {
        accumulator.unmappableRecords += 1;
      }

      for (const entry of mapped.statements || []) {
        accumulator.plannedD1Statements += 1;
        increment(accumulator.plannedD1StatementKinds, entry.kind);
      }
    }

    async function scanCollection(key, parentId = '') {
      const accumulator = accumulators[key];
      let pageToken = '';
      const seenTokens = new Set();
      let localPages = 0;

      for (;;) {
        if (totalPageRequests >= maxPageRequests) {
          throw Object.assign(new Error('AUDIT_PAGE_REQUEST_LIMIT_REACHED'), {
            code: 'AUDIT_PAGE_REQUEST_LIMIT_REACHED'
          });
        }
        if (localPages >= maxPageRequests) {
          throw Object.assign(new Error('AUDIT_COLLECTION_PAGE_LIMIT_REACHED'), {
            code: 'AUDIT_COLLECTION_PAGE_LIMIT_REACHED'
          });
        }

        const page = await backfill.readPage({
          collection: key,
          parentId,
          pageSize,
          pageToken,
          includeFilteredOut: true
        });
        totalPageRequests += 1;
        localPages += 1;
        accumulator.pagesScanned += 1;
        accumulator.totalSourceDocuments += page.documents.length;

        for (const document of page.documents) {
          await recordDocument(key, document, parentId);
          if (key === 'liveSessions') sessionParents.push(primitiveString(document.id));
        }

        const next = String(page.nextPageToken || '');
        if (!next) break;
        if (seenTokens.has(next) || next === pageToken) {
          throw Object.assign(new Error('FIRESTORE_PAGE_TOKEN_CYCLE'), {
            code: 'FIRESTORE_PAGE_TOKEN_CYCLE'
          });
        }
        seenTokens.add(next);
        pageToken = next;
      }
    }

    for (const key of WALLET_LIVE_READONLY_AUDIT_COLLECTIONS) {
      if (key === 'liveSessionMessages' || key === 'liveSessionSignals') continue;
      await scanCollection(key);
    }

    for (const parentId of sessionParents) {
      if (!parentId) {
        for (const key of ['liveSessionMessages', 'liveSessionSignals']) {
          increment(accumulators[key].warningCounts, 'LIVE_SESSION_PARENT_ID_MISSING');
        }
        continue;
      }
      for (const key of ['liveSessionMessages', 'liveSessionSignals']) {
        accumulators[key].parentSessionsScanned += 1;
        await scanCollection(key, parentId);
      }
    }

    const consistency = buildConsistency(refs);
    const financialReconciliation = buildFinancialReconciliation(refs);
    const collections = WALLET_LIVE_READONLY_AUDIT_COLLECTIONS.map(key => {
      const result = collectionReport(accumulators[key]);
      const sourceName = result.sourceCollection;
      result.relatedRecordsConsistency = consistency.byCollection[sourceName] || {};
      result.duplicateOrIdempotencyConflicts = Object.fromEntries(
        Object.entries(consistency.duplicateOrIdempotencyConflicts).filter(([name]) => {
          if (key === 'walletTransactions') return name.startsWith('walletTransaction');
          if (key === 'walletRecharges') return name.startsWith('walletRecharge');
          if (key === 'walletRechargeOrders') return name.startsWith('razorpayOrder') || name.startsWith('razorpayPayment');
          if (key === 'razorpayWebhookEvents') return name.startsWith('razorpayWebhook');
          return false;
        })
      );
      return result;
    });

    const totals = collections.reduce((sum, item) => ({
      collections: sum.collections + 1,
      pagesScanned: sum.pagesScanned + item.pagesScanned,
      sourceDocuments: sum.sourceDocuments + item.totalSourceDocuments,
      domainMappableRecords: sum.domainMappableRecords + item.domainMappableRecords,
      rawArchiveOnlyRecords: sum.rawArchiveOnlyRecords + item.rawArchiveOnlyRecords,
      outOfScopeRecords: sum.outOfScopeRecords + item.outOfScopeRecords,
      unmappableRecords: sum.unmappableRecords + item.unmappableRecords,
      sensitivePayloadRecords: sum.sensitivePayloadRecords + item.sensitivePayloadRecords,
      plannedD1Statements: sum.plannedD1Statements + item.plannedD1Statements
    }), {
      collections: 0,
      pagesScanned: 0,
      sourceDocuments: 0,
      domainMappableRecords: 0,
      rawArchiveOnlyRecords: 0,
      outOfScopeRecords: 0,
      unmappableRecords: 0,
      sensitivePayloadRecords: 0,
      plannedD1Statements: 0
    });

    return {
      sourceProjectId: expectedProjectId,
      mode: 'full_paginated_wallet_live_read_only_preview',
      complete: true,
      collections,
      totals: { ...totals, totalPageRequests },
      relatedRecordsConsistency: consistency,
      financialReconciliation,
      securityBlockers: [
        ...(accumulators.withdrawalPayouts.totalSourceDocuments > 0 &&
          accumulators.withdrawalPayouts.unmappableRecords > 0
          ? ['One or more withdrawal payout records could not be encrypted with the configured staging AES-256-GCM key.']
          : []),
        ...(accumulators.walletRechargeOrders.unmappableRecords > 0
          ? ['One or more wallet Razorpay orders lack valid normalized amount, currency, order ID or idempotency data.']
          : []),
        ...(accumulators.scheduledCallChatAppointments.unmappableRecords > 0
          ? ['One or more scheduled Call/Chat appointments have invalid required identities or booking fields.']
          : []),
        ...financialReconciliation.billingConfiguration.missingSettings
          .filter(setting => setting !== 'smv_settings/commission')
          .map(setting => setting + ' is missing from the staging Firestore source; billing configuration readiness cannot be verified.'),
        ...(financialReconciliation.billingConfiguration.commissionSettingPresent &&
          !financialReconciliation.billingConfiguration.commissionPercentValid
          ? ['The staging commission percentages are invalid or do not add up to 100%.']
          : []),

      ],
      writesPerformed: 0,
      sourceWritesPerformed: 0,
      sourceDeletesPerformed: 0,
      personalDataReturned: false,
      credentialsReturned: false,
      cutoverSafe: false
    };
  }

  return Object.freeze({ run });
}

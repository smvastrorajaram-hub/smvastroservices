import {
  WALLET_DOMAIN_BACKFILL_COLLECTIONS,
  mapLegacyWalletDomainDocument
} from './wallet-domain-backfill.mjs';
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
        bonusMinutesBalance: safeInteger(data.bonusMinutesBalance),
        reservedBonusMinutes: safeInteger(data.reservedBonusMinutes),
        version: safeInteger(data.version),
        updatedAtMs: timestampMilliseconds(data.updatedAt)
      });
      break;
    }
    case 'walletTransactions':
      refs.transactions.push({
        documentId: id,
        ownerUid: primitiveString(data.ownerUid),
        idempotencyKey: primitiveString(data.idempotencyKey),
        type: primitiveString(data.type),
        direction: primitiveString(data.direction),
        amountPaise: safeInteger(data.amountPaise),
        balanceAfterPaise: safeInteger(data.balanceAfterPaise),
        reservedBalanceAfterPaise: safeInteger(data.reservedBalanceAfterPaise),
        bonusMinutes: safeInteger(data.bonusMinutes),
        bonusMinutesCredited: safeInteger(data.bonusMinutesCredited),
        bonusMinutesUsed: safeInteger(data.bonusMinutesUsed),
        bonusMinutesBalanceAfter: safeInteger(data.bonusMinutesBalanceAfter),
        reservedBonusMinutesAfter: safeInteger(data.reservedBonusMinutesAfter),
        referenceType: primitiveString(data.referenceType),
        referenceId: primitiveString(data.referenceId),
        createdAtMs: timestampMilliseconds(data.createdAt)
      });
      break;
    case 'walletRecharges':
      refs.recharges.push({
        rechargeId: id,
        customerUid: primitiveString(data.customerUid),
        orderId: primitiveString(data.razorpayOrderId || data.orderId),
        paymentId: primitiveString(data.razorpayPaymentId || data.paymentId),
        amountPaise: safeInteger(data.amountPaise),
        paidAmountPaise: safeInteger(data.paidAmountPaise),
        bonusMinutesCredited: safeInteger(data.bonusMinutesCredited),
        bonusMinutesBalanceAfter: safeInteger(data.bonusMinutesBalanceAfter),
        idempotencyKey: primitiveString(data.idempotencyKey),
        status: primitiveString(data.status).toLowerCase()
      });
      break;
    case 'walletRechargeOffers':
      if (data.offerType === 'wallet_recharge_bonus_minutes') refs.offers.add(id);
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
        sessionId: id,
        customerUid: primitiveString(data.customerUid),
        state: statusBucket(data.state || data.status),
        appointmentId: primitiveString(data.appointmentId),
        reservedAmountPaise: safeInteger(data.reservedAmountPaise),
        reservedBonusMinutes: safeInteger(data.reservedBonusMinutes),
        actualChargePaise: safeInteger(data.actualChargePaise),
        releasedAmountPaise: safeInteger(data.releasedAmountPaise),
        freeMinutesUsed: safeInteger(data.freeMinutesUsed),
        bonusMinutesReleased: safeInteger(data.bonusMinutesReleased),
        astrologerCommissionPaise: safeInteger(data.astrologerCommissionPaise),
        adminCommissionPaise: safeInteger(data.adminCommissionPaise),
        astrologerCommissionPercent: Number(data.astrologerCommissionPercent),
        adminCommissionPercent: Number(data.adminCommissionPercent)
      });
      refs.sessionAppointments.push(primitiveString(data.appointmentId));
      break;
    case 'liveBookings':
      refs.liveBookings.push({
        bookingId: id,
        sessionId: primitiveString(data.liveSessionId || data.sessionId),
        appointmentId: primitiveString(data.appointmentId),
        status: statusBucket(data.status),
        walletReservationState: statusBucket(data.walletReservationState),
        reservedAmountPaise: safeInteger(data.reservedAmountPaise),
        reservedBonusMinutes: safeInteger(data.reservedBonusMinutes)
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
    walletsChecked: refs.walletSnapshots.length,
    walletsWithLedger: 0,
    nonInitialWalletsMissingLedger: 0,
    balanceSnapshotsChecked: 0,
    snapshotMismatches: 0,
    missingLedgerSnapshots: 0,
    conflictingLatestTimestampSnapshots: 0
  };
  const balanceFields = [
    ['availableBalancePaise', 'balanceAfterPaise'],
    ['reservedBalancePaise', 'reservedBalanceAfterPaise'],
    ['bonusMinutesBalance', 'bonusMinutesBalanceAfter'],
    ['reservedBonusMinutes', 'reservedBonusMinutesAfter']
  ];

  for (const wallet of refs.walletSnapshots) {
    const entries = refs.transactions.filter(item => item.ownerUid === wallet.ownerUid);
    if (!entries.length) {
      const hasNonInitial = balanceFields.some(([walletField]) =>
        wallet[walletField] !== null && wallet[walletField] !== 0
      ) || (wallet.version !== null && wallet.version > 1);
      if (hasNonInitial) walletBalance.nonInitialWalletsMissingLedger += 1;
      continue;
    }
    walletBalance.walletsWithLedger += 1;
    for (const [walletField, ledgerField] of balanceFields) {
      const rows = entries.filter(item =>
        item.createdAtMs !== null && item[ledgerField] !== null
      );
      if (!rows.length) {
        if (wallet[walletField] !== null && wallet[walletField] !== 0) {
          walletBalance.missingLedgerSnapshots += 1;
        }
        continue;
      }
      const latestAt = Math.max(...rows.map(item => item.createdAtMs));
      const latestRows = rows.filter(item => item.createdAtMs === latestAt);
      const values = new Set(latestRows.map(item => String(item[ledgerField])));
      walletBalance.balanceSnapshotsChecked += 1;
      if (values.size > 1) {
        walletBalance.conflictingLatestTimestampSnapshots += 1;
        continue;
      }
      const latestValue = latestRows[0][ledgerField];
      if (wallet[walletField] !== null && latestValue !== wallet[walletField]) {
        walletBalance.snapshotMismatches += 1;
      }
    }
  }

  const paidRecharge = {
    paidRechargesChecked: 0,
    missingWalletRechargeOrders: 0,
    ordersNotMarkedPaid: 0,
    orderPaymentIdMismatches: 0,
    orderRechargeReferenceMismatches: 0,
    orderCustomerMismatches: 0,
    missingRechargeCreditLedger: 0,
    rechargeCreditOwnerMismatches: 0,
    rechargeCreditAmountMismatches: 0,
    rechargeBonusMinuteMismatches: 0
  };
  for (const recharge of refs.recharges) {
    if (recharge.status !== 'paid') continue;
    paidRecharge.paidRechargesChecked += 1;
    const order = refs.orders.find(item => item.orderId === recharge.orderId);
    if (!recharge.orderId || !order) {
      paidRecharge.missingWalletRechargeOrders += 1;
    } else {
      if (order.status !== 'paid') paidRecharge.ordersNotMarkedPaid += 1;
      if (recharge.paymentId && order.paymentId !== recharge.paymentId) {
        paidRecharge.orderPaymentIdMismatches += 1;
      }
      if (order.walletRechargeId && order.walletRechargeId !== recharge.rechargeId) {
        paidRecharge.orderRechargeReferenceMismatches += 1;
      }
      if (order.customerUid && recharge.customerUid && order.customerUid !== recharge.customerUid) {
        paidRecharge.orderCustomerMismatches += 1;
      }
    }

    const credit = recharge.paymentId
      ? refs.transactions.find(item =>
          item.ownerUid === recharge.customerUid &&
          item.type === 'recharge' &&
          item.direction === 'credit' &&
          item.referenceType === 'razorpay_payment' &&
          item.referenceId === recharge.paymentId &&
          item.idempotencyKey === 'recharge:' + recharge.paymentId
        )
      : null;
    if (!credit) {
      paidRecharge.missingRechargeCreditLedger += 1;
      continue;
    }
    if (credit.ownerUid !== recharge.customerUid) paidRecharge.rechargeCreditOwnerMismatches += 1;
    const expectedAmount = recharge.paidAmountPaise ?? recharge.amountPaise;
    if (expectedAmount !== null && credit.amountPaise !== expectedAmount) {
      paidRecharge.rechargeCreditAmountMismatches += 1;
    }
    if (recharge.bonusMinutesCredited !== null &&
        credit.bonusMinutesCredited !== recharge.bonusMinutesCredited) {
      paidRecharge.rechargeBonusMinuteMismatches += 1;
    }
  }

  const liveReservationSettlement = {
    sessionsChecked: refs.sessionRecords.length,
    sessionsMissingReservationLedger: 0,
    sessionReservationAmountMismatches: 0,
    endedSessionsMissingUsageLedger: 0,
    sessionUsageAmountMismatches: 0,
    sessionsMissingCashReleaseLedger: 0,
    sessionCashReleaseAmountMismatches: 0,
    sessionsMissingBonusUsageLedger: 0,
    sessionBonusUsageMismatches: 0,
    sessionsMissingBonusReleaseLedger: 0,
    sessionBonusReleaseMismatches: 0,
    sessionBonusMinutesNotReconciled: 0,
    sessionCommissionPercentMismatches: 0,
    sessionCommissionAmountMismatches: 0,
    chargedSessionsMissingEarning: 0,
    sessionEarningAmountMismatches: 0,
    pendingBookingsMissingReservationLedger: 0,
    transferredBookingsMissingSession: 0,
    bookingReservationAmountMismatches: 0
  };
  const terminalStates = new Set(['ended', 'completed', 'cancelled', 'rejected', 'expired', 'no_show']);
  const txForReference = (referenceId, type) =>
    refs.transactions.find(item => item.referenceId === referenceId && item.type === type);

  for (const session of refs.sessionRecords) {
    const reserve = refs.transactions.find(item =>
      item.referenceId === session.sessionId &&
      ['live_session_reserve', 'live_booking_reserve'].includes(item.type)
    );
    if (!reserve) {
      if ((session.reservedAmountPaise || 0) > 0 || (session.reservedBonusMinutes || 0) > 0) {
        liveReservationSettlement.sessionsMissingReservationLedger += 1;
      }
    } else if (reserve.amountPaise !== session.reservedAmountPaise) {
      liveReservationSettlement.sessionReservationAmountMismatches += 1;
    }

    if (terminalStates.has(session.state)) {
      const charge = session.actualChargePaise ?? 0;
      const release = session.releasedAmountPaise ?? 0;
      const usage = txForReference(session.sessionId, 'live_session_usage');
      const cashRelease = txForReference(session.sessionId, 'live_session_unused_release');
      if (charge > 0 && !usage) liveReservationSettlement.endedSessionsMissingUsageLedger += 1;
      if (usage && usage.amountPaise !== charge) {
        liveReservationSettlement.sessionUsageAmountMismatches += 1;
      }
      if (release > 0 && !cashRelease) {
        liveReservationSettlement.sessionsMissingCashReleaseLedger += 1;
      }
      if (cashRelease && cashRelease.amountPaise !== release) {
        liveReservationSettlement.sessionCashReleaseAmountMismatches += 1;
      }

      const usedBonus = session.freeMinutesUsed ?? 0;
      const releasedBonus = session.bonusMinutesReleased ?? 0;
      const bonusUsage = txForReference(session.sessionId, 'live_session_bonus_minutes');
      const bonusRelease = txForReference(session.sessionId, 'live_session_bonus_minutes_release');
      if (usedBonus > 0 && !bonusUsage) {
        liveReservationSettlement.sessionsMissingBonusUsageLedger += 1;
      }
      if (bonusUsage && (bonusUsage.bonusMinutes ?? bonusUsage.bonusMinutesUsed ?? 0) !== usedBonus) {
        liveReservationSettlement.sessionBonusUsageMismatches += 1;
      }
      if (releasedBonus > 0 && !bonusRelease) {
        liveReservationSettlement.sessionsMissingBonusReleaseLedger += 1;
      }
      if (bonusRelease && (bonusRelease.bonusMinutes ?? 0) !== releasedBonus) {
        liveReservationSettlement.sessionBonusReleaseMismatches += 1;
      }
      if ((session.reservedBonusMinutes ?? 0) > 0 &&
          usedBonus + releasedBonus !== session.reservedBonusMinutes) {
        liveReservationSettlement.sessionBonusMinutesNotReconciled += 1;
      }

      if (charge > 0) {
        const astroPercent = session.astrologerCommissionPercent;
        const adminPercent = session.adminCommissionPercent;
        if (!Number.isFinite(astroPercent) || !Number.isFinite(adminPercent) ||
            Math.abs(astroPercent + adminPercent - 100) > 0.001) {
          liveReservationSettlement.sessionCommissionPercentMismatches += 1;
        }
        if (session.astrologerCommissionPaise !== null &&
            session.adminCommissionPaise !== null &&
            session.astrologerCommissionPaise + session.adminCommissionPaise !== charge) {
          liveReservationSettlement.sessionCommissionAmountMismatches += 1;
        }
        const earning = refs.earnings.find(item => item.sessionId === session.sessionId);
        if (!earning) {
          liveReservationSettlement.chargedSessionsMissingEarning += 1;
        } else {
          if (earning.grossAmountPaise !== null && earning.grossAmountPaise !== charge) {
            liveReservationSettlement.sessionEarningAmountMismatches += 1;
          }
          if (earning.earningAmountPaise !== null &&
              session.astrologerCommissionPaise !== null &&
              earning.earningAmountPaise !== session.astrologerCommissionPaise) {
            liveReservationSettlement.sessionEarningAmountMismatches += 1;
          }
        }
      }
    }
  }

  for (const booking of refs.liveBookings) {
    const reserve = refs.transactions.find(item =>
      item.referenceId === booking.bookingId && item.type === 'live_booking_reserve'
    );
    if (booking.walletReservationState === 'reserved' && !reserve) {
      liveReservationSettlement.pendingBookingsMissingReservationLedger += 1;
    }
    if (booking.walletReservationState === 'transferred' && booking.sessionId &&
        !refs.sessions.has(booking.sessionId)) {
      liveReservationSettlement.transferredBookingsMissingSession += 1;
    }
    if (reserve && booking.reservedAmountPaise !== null &&
        reserve.amountPaise !== booking.reservedAmountPaise) {
      liveReservationSettlement.bookingReservationAmountMismatches += 1;
    }
  }

  const commissionSetting = refs.billingSettings.find(item => item.settingId === 'commission');
  const commissionData = commissionSetting?.data || {};
  const astroPercent = Number(commissionData.astroPercent ?? 20);
  const adminPercent = Number(commissionData.adminPercent ?? (100 - astroPercent));
  const billingConfiguration = {
    pricingSettingPresent: refs.billingSettings.some(item => item.settingId === 'liveSessionPricing'),
    commissionSettingPresent: !!commissionSetting,
    commissionPercentValid: Number.isFinite(astroPercent) && Number.isFinite(adminPercent) &&
      astroPercent >= 0 && astroPercent <= 100 && adminPercent >= 0 && adminPercent <= 100 &&
      Math.abs(astroPercent + adminPercent - 100) <= 0.001
  };

  const withdrawal = {
    withdrawalsChecked: refs.withdrawalRecords.length,
    withdrawalsWithInvalidAmount: refs.withdrawalRecords.filter(item =>
      item.amountPaise === null || item.amountPaise <= 0
    ).length,
    payoutsWithoutWithdrawal: refs.withdrawalPayouts.filter(item =>
      !refs.withdrawals.has(item)
    ).length
  };

  const statusCounts = {
    recharges: {},
    walletRechargeOrders: {},
    razorpayWebhookEvents: {},
    liveSessions: {},
    liveBookings: {},
    liveEarnings: {},
    withdrawals: {}
  };
  for (const item of refs.recharges) increment(statusCounts.recharges, statusBucket(item.status));
  for (const item of refs.orders) increment(statusCounts.walletRechargeOrders, statusBucket(item.status));
  for (const item of refs.webhooks) increment(statusCounts.razorpayWebhookEvents, item.processed ? 'processed' : 'not_processed');
  for (const item of refs.sessionRecords) increment(statusCounts.liveSessions, statusBucket(item.state));
  for (const item of refs.liveBookings) increment(statusCounts.liveBookings, statusBucket(item.status));
  for (const item of refs.earnings) increment(statusCounts.liveEarnings, statusBucket(item.status));
  for (const item of refs.withdrawalRecords) increment(statusCounts.withdrawals, statusBucket(item.status));

  return {
    walletBalance,
    paidRecharge,
    liveReservationSettlement,
    billingConfiguration,
    withdrawal,
    statusCounts
  };
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
    cryptoImpl
  });

  async function run() {
    const accumulators = Object.fromEntries(
      WALLET_LIVE_READONLY_AUDIT_COLLECTIONS.map(key => [key, emptyCollection(key)])
    );
    const refs = sourceReferences();
    const sessionParents = [];
    let totalPageRequests = 0;

    function recordDocument(key, document, parentId = '') {
      const accumulator = accumulators[key];
      const data = document.data || {};
      collectReferences(key, document, refs);

      let mapped;
      if (key === 'withdrawalPayouts') {
        mapped = { statements: [], mapped: false, warning: 'PAYOUT_ENCRYPTION_REQUIRED' };
      } else if (hasSensitiveField(data)) {
        mapped = { statements: [], mapped: false, warning: 'SENSITIVE_PAYLOAD_REVIEW_REQUIRED' };
        accumulator.sensitivePayloadRecords += 1;
      } else {
        mapped = mapLegacyWalletDomainDocument(key, document, { parentId, nowMs: Number(now()) });
      }

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
          recordDocument(key, document, parentId);
          if (key === 'liveSessions') sessionParents.push(document);
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

    for (const session of sessionParents) {
      const parentId = primitiveString(session.id);
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
        'withdrawalPayouts are withheld: the existing Wallet mapper stores private payout JSON without AES-GCM encryption; rotate/use a new private staging key and add encrypted mapping before any import.',
        'razorpay_orders currently have raw-archive-only mapping; normalized order status, payment linkage and idempotency history are not yet ready for D1 business use.',
        'Records containing sensitive-keyed fields are withheld from planned D1 statements until field-level redaction/encryption rules are reviewed.'
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

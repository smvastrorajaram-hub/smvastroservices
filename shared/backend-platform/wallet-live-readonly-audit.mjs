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

const ARCHIVE_ONLY_WARNING = code =>
  code === 'RAW_ARCHIVE_ONLY' || String(code || '').startsWith('NOT_');

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
    transactions: [],
    recharges: [],
    offers: new Set(),
    offerUsage: [],
    sessions: new Set(),
    sessionAppointments: [],
    liveBookings: [],
    scheduledAppointments: new Set(),
    appointmentSessions: [],
    earnings: [],
    withdrawals: new Set(),
    withdrawalPayouts: [],
    orders: [],
    webhooks: []
  };
}

function collectReferences(key, document, refs) {
  const data = document.data || {};
  const id = primitiveString(document.id);
  switch (key) {
    case 'wallets':
      refs.wallets.add(primitiveString(data.ownerUid) || id);
      break;
    case 'walletTransactions':
      refs.transactions.push({
        ownerUid: primitiveString(data.ownerUid),
        idempotencyKey: primitiveString(data.idempotencyKey),
        type: primitiveString(data.type),
        direction: primitiveString(data.direction),
        amount: primitiveString(data.amountPaise),
        referenceId: primitiveString(data.referenceId)
      });
      break;
    case 'walletRecharges':
      refs.recharges.push({
        rechargeId: id,
        customerUid: primitiveString(data.customerUid),
        orderId: primitiveString(data.razorpayOrderId || data.orderId),
        paymentId: primitiveString(data.razorpayPaymentId || data.paymentId),
        amount: primitiveString(data.amountPaise),
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
      refs.sessionAppointments.push(primitiveString(data.appointmentId));
      break;
    case 'liveBookings':
      refs.liveBookings.push({
        sessionId: primitiveString(data.liveSessionId || data.sessionId),
        appointmentId: primitiveString(data.appointmentId)
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
        refs.earnings.push(primitiveString(data.referenceId || data.sessionId || id));
      }
      break;
    case 'withdrawals':
      refs.withdrawals.add(id);
      break;
    case 'withdrawalPayouts':
      refs.withdrawalPayouts.push(primitiveString(data.withdrawalId) || id);
      break;
    case 'walletRechargeOrders':
      refs.orders.push({
        orderId: primitiveString(data.razorpayOrderId || data.orderId || id),
        paymentId: primitiveString(data.razorpayPaymentId || data.paymentId),
        amount: primitiveString(data.amountPaise),
        status: primitiveString(data.status || data.paymentStatus).toLowerCase(),
        serviceName: primitiveString(data.serviceName || data.service)
      });
      break;
    case 'razorpayWebhookEvents':
      refs.webhooks.push({
        eventKey: primitiveString(data.idempotencyKey || data.eventId || id),
        orderId: primitiveString(data.razorpayOrderId || data.orderId),
        paymentId: primitiveString(data.razorpayPaymentId || data.paymentId)
      });
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
    item => item.idempotencyKey,
    item => [item.ownerUid, item.type, item.direction, item.amount, item.referenceId].join('|')
  );
  const rechargeOrderDuplicates = duplicateGroups(
    refs.recharges,
    item => item.orderId,
    item => [item.customerUid, item.paymentId, item.amount, item.status].join('|')
  );
  const rechargePaymentDuplicates = duplicateGroups(
    refs.recharges,
    item => item.paymentId,
    item => [item.customerUid, item.orderId, item.amount, item.status].join('|')
  );
  const sourceOrderDuplicates = duplicateGroups(
    refs.orders,
    item => item.orderId,
    item => [item.paymentId, item.amount, item.status].join('|')
  );
  const sourcePaymentDuplicates = duplicateGroups(
    refs.orders,
    item => item.paymentId,
    item => [item.orderId, item.amount, item.status].join('|')
  );
  const webhookDuplicates = duplicateGroups(
    refs.webhooks,
    item => item.eventKey,
    item => [item.orderId, item.paymentId].join('|')
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
      id => id && !refs.sessions.has(id)
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
    razorpayOrderDuplicateGroups: sourceOrderDuplicates.duplicateGroupCount,
    razorpayOrderConflictGroups: sourceOrderDuplicates.conflictingGroupCount,
    razorpayPaymentDuplicateGroups: sourcePaymentDuplicates.duplicateGroupCount,
    razorpayPaymentConflictGroups: sourcePaymentDuplicates.conflictingGroupCount,
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

/**
 * Read-only, all-pages Wallet + Live audit. Firestore is wrapped to expose only
 * listDocuments/getDocument. The D1 binding is replaced by a strict write guard.
 * No source IDs or source payload values are included in the report.
 */
export function createWalletLiveReadOnlyAudit({
  firestore,
  db = createStrictReadOnlyD1Guard(),
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
      } else if (ARCHIVE_ONLY_WARNING(warning)) {
        accumulator.rawArchiveOnlyRecords += 1;
        increment(accumulator.rawArchiveOnlyReasons, warning);
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
      unmappableRecords: sum.unmappableRecords + item.unmappableRecords,
      sensitivePayloadRecords: sum.sensitivePayloadRecords + item.sensitivePayloadRecords,
      plannedD1Statements: sum.plannedD1Statements + item.plannedD1Statements
    }), {
      collections: 0,
      pagesScanned: 0,
      sourceDocuments: 0,
      domainMappableRecords: 0,
      rawArchiveOnlyRecords: 0,
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

'use strict';

// Read-only source/target reconciliation for the Project 5 Wallet + Call/Chat domain.
// This script never sets production cutover flags and never writes either database.
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const PAGE_SIZE = 200;
const MAX_SAMPLES = 10;

function timestampParts(value) {
  if (value == null) return null;
  if (Number.isFinite(Number(value.seconds ?? value._seconds))) {
    return {
      seconds: Number(value.seconds ?? value._seconds),
      nanos: Number(value.nanoseconds ?? value._nanoseconds ?? 0)
    };
  }
  let millis = null;
  if (value instanceof Date) millis = value.getTime();
  else if (typeof value?.toMillis === 'function') millis = value.toMillis();
  else if (typeof value === 'number') millis = value;
  else if (typeof value === 'string') millis = Date.parse(value);
  if (!Number.isFinite(millis)) return null;
  const seconds = Math.floor(millis / 1000);
  return { seconds, nanos: Math.floor((millis - seconds * 1000) * 1_000_000) };
}

function compareTimestamps(left, right) {
  const a = timestampParts(left), b = timestampParts(right);
  if (!a || !b) return null;
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  if (a.nanos !== b.nanos) return a.nanos < b.nanos ? -1 : 1;
  return 0;
}

function sha256(value) {
  return require('crypto').createHash('sha256').update(String(value)).digest('hex');
}

function primaryCredentials(env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Set the primary FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }
  return { projectId, clientEmail, privateKey };
}

async function collectDocuments(query) {
  const rows = new Map();
  let last = null;
  while (true) {
    let page = query.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) page = page.startAfter(last);
    const snapshot = await page.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) rows.set(doc.id, doc.data() || {});
    last = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE_SIZE) break;
  }
  return rows;
}

function normalize(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return { __timestampMillis: value.getTime() };
  if (typeof value?.toMillis === 'function') return { __timestampMillis: value.toMillis() };
  if (typeof value?.path === 'string' && value.firestore) return { __documentReference: value.path };
  if (Buffer.isBuffer(value)) return { __buffer: value.toString('base64') };
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const normalized = normalize(value[key]);
      if (normalized !== undefined) result[key] = normalized;
    }
    return result;
  }
  return String(value);
}

function comparable(value) {
  return JSON.stringify(normalize(value));
}

function compareMaps(label, source, target, report) {
  const sourceIds = new Set(source.keys());
  const targetIds = new Set(target.keys());
  const missing = [...sourceIds].filter(id => !targetIds.has(id));
  const extra = [...targetIds].filter(id => !sourceIds.has(id));
  const mismatched = [];
  for (const id of sourceIds) {
    if (!targetIds.has(id)) continue;
    if (comparable(source.get(id)) !== comparable(target.get(id))) mismatched.push(id);
  }
  const result = {
    sourceDocuments: source.size,
    targetDocuments: target.size,
    missingInProject5: missing.length,
    extraInProject5: extra.length,
    dataMismatches: mismatched.length,
    samples: {
      missingInProject5: missing.slice(0, MAX_SAMPLES),
      extraInProject5: extra.slice(0, MAX_SAMPLES),
      dataMismatches: mismatched.slice(0, MAX_SAMPLES)
    }
  };
  report.collections[label] = result;
  if (missing.length || extra.length || mismatched.length) report.errors.push(label + ' differs between Project 1 and Project 5.');
  return result;
}

async function compareQuery(label, sourceQuery, targetQuery, report) {
  const [source, target] = await Promise.all([collectDocuments(sourceQuery), collectDocuments(targetQuery)]);
  compareMaps(label, source, target, report);
  return { source, target };
}

async function compareNamedIds(label, ids, sourceCollection, targetCollection, report) {
  const source = new Map();
  const target = new Map();
  for (const id of ids) {
    const [sourceDoc, targetDoc] = await Promise.all([
      sourceCollection.doc(id).get(), targetCollection.doc(id).get()
    ]);
    if (sourceDoc.exists) source.set(id, sourceDoc.data() || {});
    if (targetDoc.exists) target.set(id, targetDoc.data() || {});
  }
  compareMaps(label, source, target, report);
  return { source, target };
}

async function compareSessionChildren(sessionIds, childName, sourceDb, targetDb, report) {
  const source = new Map();
  const target = new Map();
  for (const sessionId of sessionIds) {
    const [sourceRows, targetRows] = await Promise.all([
      collectDocuments(sourceDb.collection('smv_live_sessions').doc(sessionId).collection(childName)),
      collectDocuments(targetDb.collection('smv_live_sessions').doc(sessionId).collection(childName))
    ]);
    for (const [id, value] of sourceRows) source.set(sessionId + '/' + childName + '/' + id, value);
    for (const [id, value] of targetRows) target.set(sessionId + '/' + childName + '/' + id, value);
  }
  return compareMaps('liveSession' + childName[0].toUpperCase() + childName.slice(1), source, target, report);
}

async function main() {
  const primaryApp = admin.initializeApp({
    credential: admin.credential.cert(primaryCredentials(process.env))
  }, 'smv-project5-wallet-validation-primary');
  const sourceDb = admin.firestore(primaryApp);
  const multi = initializeMultiProjectFirestore({
    admin,
    primaryDb: sourceDb,
    env: { ...process.env, SMV_WALLET_DOMAIN_ENABLED: 'true' }
  });
  if (!multi.walletDomainEnabled || multi.walletDomainDb === sourceDb) {
    throw new Error('Project 5 Wallet domain database was not initialized. Check Project 5 credentials and project ID.');
  }
  const targetDb = multi.walletDomainDb;
  const report = {
    mode: 'READ-ONLY VALIDATION — no database writes and no cutover flags changed',
    sourceProject: multi.projectIds.primary,
    targetProject: multi.projectIds.walletDomain,
    ok: false,
    cutoverSafe: false,
    collections: Object.create(null),
    errors: [],
    blockers: []
  };

  const all = await Promise.all([
    compareQuery('wallets', sourceDb.collection('smv_wallets'), targetDb.collection('smv_wallets'), report),
    compareQuery('walletTransactions', sourceDb.collection('smv_wallet_transactions'), targetDb.collection('smv_wallet_transactions'), report),
    compareQuery('walletRecharges', sourceDb.collection('smv_wallet_recharges'), targetDb.collection('smv_wallet_recharges'), report),
    compareQuery('walletRechargeOffers',
      sourceDb.collection('smv_offers').where('offerType', '==', 'wallet_recharge_bonus_minutes'),
      targetDb.collection('smv_offers').where('offerType', '==', 'wallet_recharge_bonus_minutes'), report),
    compareQuery('walletOfferAudit',
      sourceDb.collection('smv_offer_audit').where('service', '==', 'wallet_recharge'),
      targetDb.collection('smv_offer_audit').where('service', '==', 'wallet_recharge'), report),
    compareQuery('walletOfferUsageCounters', sourceDb.collection('smv_offer_usage_counters'), targetDb.collection('smv_offer_usage_counters'), report),
    compareQuery('liveSessions', sourceDb.collection('smv_live_sessions'), targetDb.collection('smv_live_sessions'), report),
    compareQuery('liveBookings', sourceDb.collection('smv_live_bookings'), targetDb.collection('smv_live_bookings'), report),
    compareQuery('liveSessionEarnings',
      sourceDb.collection('smv_payments').where('source', '==', 'live_session'),
      targetDb.collection('smv_payments').where('source', '==', 'live_session'), report),
    compareQuery('withdrawals', sourceDb.collection('smv_withdrawals'), targetDb.collection('smv_withdrawals'), report),
    compareQuery('withdrawalPayouts', sourceDb.collection('smv_withdrawal_payouts'), targetDb.collection('smv_withdrawal_payouts'), report),
    compareQuery('razorpayWebhookEvents',
      sourceDb.collection('razorpay_webhook_events'), targetDb.collection('razorpay_webhook_events'), report),
    compareQuery('walletRechargeOrders',
      sourceDb.collection('razorpay_orders').where('serviceName', '==', 'SMV ASTRO Wallet Recharge'),
      targetDb.collection('razorpay_orders').where('serviceName', '==', 'SMV ASTRO Wallet Recharge'), report),
    compareQuery('scheduledCallChatAppointments',
      sourceDb.collection('smv_appointments').where('bookingKind', 'in', ['scheduled_call_request', 'scheduled_chat_request']),
      targetDb.collection('smv_appointments').where('bookingKind', 'in', ['scheduled_call_request', 'scheduled_chat_request']), report)
  ]);

  const wallets = all[0].source;
  const sessions = all[6].source;
  const bookings = all[7].source;
  const recharges = all[2].source;
  const appointmentIds = new Set();
  const astrologerIds = new Set();
  const participantIds = new Set();
  for (const [uid, wallet] of wallets) {
    if (wallet.ownerUid) participantIds.add(String(wallet.ownerUid));
    if (Number(wallet.reservedBalancePaise || 0) !== 0 || Number(wallet.reservedBonusMinutes || 0) !== 0) {
      report.blockers.push('Wallet ' + uid + ' still has reserved balance/minutes; reconcile its active reservation before cutover.');
    }
  }
  const ledgerByOwner = new Map();
  for (const [ledgerId, entry] of all[1].source) {
    if (!entry.ownerUid) continue;
    const ownerUid = String(entry.ownerUid);
    participantIds.add(ownerUid);
    if (!ledgerByOwner.has(ownerUid)) ledgerByOwner.set(ownerUid, []);
    ledgerByOwner.get(ownerUid).push({ id: ledgerId, data: entry });
  }

  const ledgerBalanceIssues = [];
  let walletsWithLedger = 0;
  const balanceFields = [
    { wallet: 'availableBalancePaise', ledger: 'balanceAfterPaise' },
    { wallet: 'reservedBalancePaise', ledger: 'reservedBalanceAfterPaise' },
    { wallet: 'bonusMinutesBalance', ledger: 'bonusMinutesBalanceAfter' },
    { wallet: 'reservedBonusMinutes', ledger: 'reservedBonusMinutesAfter' }
  ];
  for (const [uid, wallet] of wallets) {
    const entries = ledgerByOwner.get(String(uid)) || [];
    if (!entries.length) {
      const hasNonZeroBalance = balanceFields.some(field => Number(wallet[field.wallet] || 0) !== 0);
      if (hasNonZeroBalance || Number(wallet.version || 0) > 1) {
        ledgerBalanceIssues.push(uid + ' (Wallet has a non-initial balance/version but no ledger history)');
      }
      continue;
    }
    walletsWithLedger++;
    for (const field of balanceFields) {
      const fieldRows = entries.filter(row => row.data[field.ledger] !== undefined &&
        timestampParts(row.data.createdAt));
      if (!fieldRows.length) {
        if (Number(wallet[field.wallet] || 0) !== 0) {
          ledgerBalanceIssues.push(uid + ' (' + field.wallet + ' has no ledger snapshot)');
        }
        continue;
      }
      fieldRows.sort((left, right) => compareTimestamps(right.data.createdAt, left.data.createdAt) || left.id.localeCompare(right.id));
      const newest = fieldRows[0];
      const newestRows = fieldRows.filter(row => compareTimestamps(row.data.createdAt, newest.data.createdAt) === 0);
      const values = new Set(newestRows.map(row => String(Number(row.data[field.ledger]))));
      if (values.size > 1) {
        ledgerBalanceIssues.push(uid + ' (' + field.ledger + ' has conflicting snapshots at the same latest timestamp)');
        continue;
      }
      const latestSnapshot = Number(newest.data[field.ledger]);
      const walletValue = Number(wallet[field.wallet] || 0);
      if (!Number.isSafeInteger(latestSnapshot) || !Number.isSafeInteger(walletValue) || latestSnapshot !== walletValue) {
        ledgerBalanceIssues.push(uid + ' (' + field.wallet + ' Wallet=' + walletValue + ', latest ledger=' + latestSnapshot + ')');
      }
    }
    const latestBalanceRow = entries.filter(row => row.data.balanceAfterPaise !== undefined && timestampParts(row.data.createdAt))
      .sort((left, right) => compareTimestamps(right.data.createdAt, left.data.createdAt))[0];
    if (latestBalanceRow && timestampParts(wallet.updatedAt)) {
      const walletVsLedgerTime = compareTimestamps(wallet.updatedAt, latestBalanceRow.data.createdAt);
      if (walletVsLedgerTime !== null && walletVsLedgerTime < 0) {
        ledgerBalanceIssues.push(uid + ' (Wallet updatedAt is older than its latest ledger entry)');
      }
    }
  }
  report.collections.walletLedgerBalanceReconciliation = {
    walletsChecked: wallets.size,
    walletsWithLedger,
    inconsistencies: ledgerBalanceIssues.length,
    samples: ledgerBalanceIssues.slice(0, MAX_SAMPLES)
  };
  if (ledgerBalanceIssues.length) report.errors.push('Wallet balances do not reconcile with the latest ledger snapshots.');

  for (const [sessionId, data] of sessions) {
    if (data.customerUid) participantIds.add(String(data.customerUid));
    if (data.astrologerUid) { participantIds.add(String(data.astrologerUid)); astrologerIds.add(String(data.astrologerUid)); }
    if (data.appointmentId) appointmentIds.add(String(data.appointmentId));
    if (!['ended', 'cancelled', 'rejected', 'expired'].includes(String(data.state || '').toLowerCase())) {
      report.blockers.push('Live session ' + sessionId + ' is not terminal (' + String(data.state || 'missing') + ').');
    }
  }
  for (const [bookingId, data] of bookings) {
    if (data.customerUid) participantIds.add(String(data.customerUid));
    if (data.astrologerUid) { participantIds.add(String(data.astrologerUid)); astrologerIds.add(String(data.astrologerUid)); }
    if (!['ended', 'completed', 'cancelled', 'rejected', 'expired', 'no_show'].includes(String(data.status || '').toLowerCase()) ||
        String(data.walletReservationState || '') === 'reserved') {
      report.blockers.push('Live booking ' + bookingId + ' remains pending/reserved.');
    }
  }
  for (const [rechargeId, data] of recharges) {
    if (data.customerUid) participantIds.add(String(data.customerUid));
    if (['creating', 'order_created', 'payment_pending', 'created', 'pending', 'processing'].includes(String(data.status || '').toLowerCase())) {
      report.blockers.push('Wallet recharge ' + rechargeId + ' remains in a non-terminal state (' + String(data.status || '') + ').');
    }
  }
  for (const data of all[8].source.values()) {
    if (data.astrologerId) { participantIds.add(String(data.astrologerId)); astrologerIds.add(String(data.astrologerId)); }
  }
  for (const data of all[9].source.values()) {
    if (data.astrologerId) { participantIds.add(String(data.astrologerId)); astrologerIds.add(String(data.astrologerId)); }
  }

  // Paid Wallet recharge must have a matching order and its exact idempotent credit ledger.
  const referencedOrderIds = new Set(all[12].source.keys());
  for (const recharge of recharges.values()) {
    const orderId = String(recharge.razorpayOrderId || '');
    if (orderId) referencedOrderIds.add(orderId);
  }
  const referencedOrderComparison = await compareNamedIds('walletRechargeOrdersReferencedByRecharge',
    referencedOrderIds, sourceDb.collection('razorpay_orders'), targetDb.collection('razorpay_orders'), report);
  const sourceRechargeOrders = referencedOrderComparison.source;
  const rechargeCreditIssues = [];
  for (const [rechargeId, recharge] of recharges) {
    const orderId = String(recharge.razorpayOrderId || '');
    const status = String(recharge.status || '').toLowerCase();
    if (status !== 'paid') continue;
    const customerUid = String(recharge.customerUid || '');
    const paymentId = String(recharge.razorpayPaymentId || '');
    const order = sourceRechargeOrders.get(orderId);
    const ledgerId = customerUid && paymentId ? sha256('recharge:' + customerUid + ':' + paymentId) : '';
    const credit = ledgerId ? all[1].source.get(ledgerId) : null;
    const issues = [];
    if (!orderId) issues.push('missing Razorpay order ID');
    if (!order) issues.push('Razorpay Wallet Recharge order missing from Project 1');
    else {
      if (String(order.status || '').toLowerCase() !== 'paid') issues.push('order is not marked paid');
      if (paymentId && String(order.razorpayPaymentId || '') !== paymentId) issues.push('order payment ID differs');
      if (order.walletRechargeId && String(order.walletRechargeId) !== rechargeId) issues.push('order references another recharge');
    }
    if (!customerUid) issues.push('missing Customer UID');
    if (!paymentId) issues.push('missing Razorpay payment ID');
    if (!credit) issues.push('matching Wallet recharge credit ledger missing');
    else {
      if (String(credit.ownerUid || '') !== customerUid) issues.push('credit ledger owner differs');
      if (String(credit.type || '') !== 'recharge' || String(credit.direction || '') !== 'credit') issues.push('ledger record is not a recharge credit');
      const paidAmount = Number(recharge.paidAmountPaise ?? recharge.amountPaise);
      if (!Number.isSafeInteger(paidAmount) || Number(credit.amountPaise) !== paidAmount) issues.push('credit amount differs from paid recharge amount');
      if (String(credit.razorpayPaymentId || '') && String(credit.razorpayPaymentId) !== paymentId) issues.push('ledger payment ID differs');
    }
    if (issues.length) rechargeCreditIssues.push(rechargeId + ' (' + issues.join('; ') + ')');
  }
  report.collections.paidRechargeConsistency = {
    paidRecharges: [...recharges.values()].filter(row => String(row.status || '').toLowerCase() === 'paid').length,
    inconsistencies: rechargeCreditIssues.length,
    samples: rechargeCreditIssues.slice(0, MAX_SAMPLES)
  };
  if (rechargeCreditIssues.length) report.errors.push('Paid Wallet recharges do not reconcile with Razorpay orders and credit-ledger entries.');

  for (const [appointmentId, appointment] of all[13].source) {
    appointmentIds.add(appointmentId);
    if (appointment.customerUid) participantIds.add(String(appointment.customerUid));
    if (appointment.astrologerUid) {
      participantIds.add(String(appointment.astrologerUid));
      astrologerIds.add(String(appointment.astrologerUid));
    }
  }

  await compareNamedIds('appointmentsLinkedToSessions',
    appointmentIds, sourceDb.collection('smv_appointments'), targetDb.collection('smv_appointments'), report);
  await compareSessionChildren(sessions.keys(), 'messages', sourceDb, targetDb, report);
  await compareSessionChildren(sessions.keys(), 'signals', sourceDb, targetDb, report);

  const missingUserProfiles = [];
  for (const uid of participantIds) {
    if (!uid) continue;
    const [sourceProfile, targetProfile] = await Promise.all([
      sourceDb.collection('smv_users').doc(uid).get(),
      targetDb.collection('smv_users').doc(uid).get()
    ]);
    if (sourceProfile.exists !== targetProfile.exists) {
      missingUserProfiles.push(uid + (sourceProfile.exists ? ' (missing in Project 5)' : ' (unexpected in Project 5; missing in Project 1)'));
    } else if (!sourceProfile.exists) {
      missingUserProfiles.push(uid + ' (profile missing from both projects)');
    } else if (String(sourceProfile.data()?.role || '') !== String(targetProfile.data()?.role || '')) {
      missingUserProfiles.push(uid + ' (role mismatch)');
    }
  }
  report.collections.participantProfiles = {
    sourceProfilesExpected: participantIds.size,
    missingOrRoleMismatchedInProject5: missingUserProfiles.length,
    samples: missingUserProfiles.slice(0, MAX_SAMPLES)
  };
  if (missingUserProfiles.length) report.errors.push('Participant user profiles are missing or role-mismatched in Project 5.');

  const missingAstrologerProfiles = [];
  const profileFields = ['uid', 'status', 'availabilityStatus', 'onlineStatus', 'callPricePerMinute', 'chatPricePerMinute',
    'liveCallEnabled', 'liveChatEnabled', 'callEnabled', 'chatEnabled'];
  for (const uid of astrologerIds) {
    const [sourceProfile, targetProfile] = await Promise.all([
      sourceDb.collection('smv_astrologers').doc(uid).get(),
      targetDb.collection('smv_astrologers').doc(uid).get()
    ]);
    if (!sourceProfile.exists || !targetProfile.exists) {
      missingAstrologerProfiles.push(uid + ' (missing)');
      continue;
    }
    const a = sourceProfile.data() || {}, b = targetProfile.data() || {};
    if (profileFields.some(field => comparable(a[field]) !== comparable(b[field]))) missingAstrologerProfiles.push(uid + ' (profile fields differ)');
  }
  report.collections.astrologerProfiles = {
    sourceProfilesExpected: astrologerIds.size,
    missingOrMismatchedInProject5: missingAstrologerProfiles.length,
    samples: missingAstrologerProfiles.slice(0, MAX_SAMPLES)
  };
  if (missingAstrologerProfiles.length) report.errors.push('Live-session Astrologer profiles are missing or differ in Project 5.');

  for (const settingId of ['liveSessionPricing', 'commission']) {
    const [sourceSetting, targetSetting] = await Promise.all([
      sourceDb.collection('smv_settings').doc(settingId).get(),
      targetDb.collection('smv_settings').doc(settingId).get()
    ]);
    const equal = sourceSetting.exists === targetSetting.exists &&
      (!sourceSetting.exists || comparable(sourceSetting.data() || {}) === comparable(targetSetting.data() || {}));
    report.collections['setting:' + settingId] = { sourceExists: sourceSetting.exists, targetExists: targetSetting.exists, equal };
    if (!equal) report.errors.push('Billing setting smv_settings/' + settingId + ' differs between projects.');
  }

  const pendingRechargeOrders = [];
  for (const [id, order] of (all[12].source || new Map())) {
    const status = String(order.status || '').toLowerCase();
    if (['created', 'order_created', 'payment_pending', 'pending', 'processing'].includes(status)) pendingRechargeOrders.push(id);
  }
  if (pendingRechargeOrders.length) report.blockers.push(pendingRechargeOrders.length + ' Razorpay Wallet recharge order(s) remain non-terminal.');

  report.blockers = [...new Set(report.blockers)];
  report.ok = report.errors.length === 0;
  report.cutoverSafe = report.ok && report.blockers.length === 0;
  report.summary = {
    collectionChecks: Object.keys(report.collections).length,
    errors: report.errors.length,
    blockers: report.blockers.length,
    sourceDataDeleted: false,
    instruction: 'Only mark backfill/dependencies verified after this report has ok=true and cutoverSafe=true and a human has reviewed the report. This script does not change any flags.'
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.ok || !report.cutoverSafe) process.exitCode = 2;
}

main().catch(error => {
  console.error('Project 5 Wallet domain validation failed:', error?.stack || error);
  process.exitCode = 1;
});

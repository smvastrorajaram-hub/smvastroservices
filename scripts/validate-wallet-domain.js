'use strict';

// Read-only source/target reconciliation for the Project 5 Wallet + Call/Chat domain.
// This script never sets production cutover flags and never writes either database.
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const PAGE_SIZE = 200;
const MAX_SAMPLES = 10;

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
  return compareMaps(label, source, target, report);
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
  for (const data of all[1].source.values()) if (data.ownerUid) participantIds.add(String(data.ownerUid));
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
  for (const id of all[13].source.keys()) appointmentIds.add(id);

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
    if (sourceProfile.exists && !targetProfile.exists) missingUserProfiles.push(uid);
    else if (sourceProfile.exists && String(sourceProfile.data()?.role || '') !== String(targetProfile.data()?.role || '')) {
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

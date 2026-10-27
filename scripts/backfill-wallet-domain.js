'use strict';

// Project 5 Wallet/live-session domain copy. DRY RUN by default.
// This script is deliberately non-destructive: it never deletes source documents.
// --apply is allowed only while production writes and active sessions are paused.
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 200;
const BATCH_SIZE = 300;

function enabled(name) {
  return /^(?:1|true|yes|on)$/i.test(String(process.env[name] || '').trim());
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

async function forEachDocument(query, visit) {
  let last = null;
  let total = 0;
  while (true) {
    let pageQuery = query.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) pageQuery = pageQuery.startAfter(last);
    const snap = await pageQuery.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      await visit(doc);
      total += 1;
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }
  return total;
}

async function copyQuery(sourceQuery, targetCollection, label, stats, onDocument = null) {
  let pending = [];
  let copied = 0;
  const found = await forEachDocument(sourceQuery, async doc => {
    if (onDocument) await onDocument(doc);
    if (APPLY) {
      // Batches keep the migration under Firestore's per-batch write limit.
      pending.push({ id: doc.id, data: doc.data() || {} });
      if (pending.length >= BATCH_SIZE) {
        const batch = targetCollection.firestore.batch();
        for (const item of pending) batch.set(targetCollection.doc(item.id), item.data, { merge: true });
        await batch.commit();
        copied += pending.length;
        pending = [];
      }
    }
  });
  if (APPLY && pending.length) {
    const batch = targetCollection.firestore.batch();
    for (const item of pending) batch.set(targetCollection.doc(item.id), item.data, { merge: true });
    await batch.commit();
    copied += pending.length;
  }
  stats[label] = { sourceDocuments: found, targetWrites: APPLY ? copied : 0 };
  return found;
}

async function copyNamedDocument(sourceDb, targetDb, collection, id, stats, label) {
  const snap = await sourceDb.collection(collection).doc(id).get();
  stats[label] = snap.exists ? 1 : 0;
  if (APPLY && snap.exists) {
    await targetDb.collection(collection).doc(id).set(snap.data() || {}, { merge: true });
  }
  return snap.exists ? (snap.data() || {}) : null;
}

async function copySessionChildren(sourceDb, targetDb, sessionId, collectionName, stats) {
  const source = sourceDb.collection('smv_live_sessions').doc(sessionId).collection(collectionName);
  const target = targetDb.collection('smv_live_sessions').doc(sessionId).collection(collectionName);
  const key = collectionName + 'Documents';
  stats[key] ||= { sourceDocuments: 0, targetWrites: 0 };
  stats[key].sourceDocuments += await forEachDocument(source, async doc => {
    if (APPLY) {
      await target.doc(doc.id).set(doc.data() || {}, { merge: true });
      stats[key].targetWrites += 1;
    }
  });
}

async function main() {
  if (APPLY) {
    if (!enabled('SMV_WALLET_DOMAIN_QUIESCED')) {
      throw new Error('Refusing --apply without SMV_WALLET_DOMAIN_QUIESCED=true. Stop the production backend and ensure no active/live bookings, wallet recharges, or billing writes can occur before setting it.');
    }
    if (enabled('SMV_WALLET_DOMAIN_CUTOVER_COMPLETE')) {
      throw new Error('Refusing to backfill after cutover is marked complete. Turn the cutover flag off first.');
    }
    if (!enabled('SMV_WALLET_DOMAIN_ENABLED')) {
      throw new Error('Enable SMV_WALLET_DOMAIN_ENABLED and configure Project 5 service-account credentials before running this script.');
    }
  }

  const primaryApp = admin.initializeApp({
    credential: admin.credential.cert(primaryCredentials(process.env))
  }, 'smv-project5-wallet-backfill-primary');
  const sourceDb = admin.firestore(primaryApp);
  const multi = initializeMultiProjectFirestore({
    admin,
    primaryDb: sourceDb,
    env: { ...process.env, SMV_WALLET_DOMAIN_ENABLED: 'true' }
  });
  if (!multi.walletDomainEnabled || multi.walletDomainDb === sourceDb) {
    throw new Error('Project 5 Wallet domain database was not initialized.');
  }
  const targetDb = multi.walletDomainDb;
  const stats = {
    mode: APPLY ? 'APPLY — source is preserved; target documents are merged' : 'DRY RUN — no target writes',
    sourceProject: multi.projectIds.primary,
    targetProject: multi.projectIds.walletDomain,
    sourceDataDeleted: false,
    collections: Object.create(null)
  };
  const participantUids = new Set();
  const astrologerUids = new Set();
  const appointmentIds = new Set();
  const razorpayOrderIds = new Set();
  const sessionIds = new Set();

  const wallets = await copyQuery(sourceDb.collection('smv_wallets'), targetDb.collection('smv_wallets'), 'wallets', stats,
    doc => participantUids.add(String(doc.data()?.ownerUid || doc.id)));
  await copyQuery(sourceDb.collection('smv_wallet_transactions'), targetDb.collection('smv_wallet_transactions'), 'walletTransactions', stats,
    doc => participantUids.add(String(doc.data()?.ownerUid || '')));
  const rechargeCount = await copyQuery(sourceDb.collection('smv_wallet_recharges'), targetDb.collection('smv_wallet_recharges'), 'walletRecharges', stats,
    doc => {
      const data = doc.data() || {};
      if (data.customerUid) participantUids.add(String(data.customerUid));
      if (data.razorpayOrderId) razorpayOrderIds.add(String(data.razorpayOrderId));
    });

  await copyQuery(
    sourceDb.collection('smv_offers').where('offerType', '==', 'wallet_recharge_bonus_minutes'),
    targetDb.collection('smv_offers'), 'walletRechargeOffers', stats
  );
  await copyQuery(sourceDb.collection('smv_offer_audit').where('service', '==', 'wallet_recharge'),
    targetDb.collection('smv_offer_audit'), 'walletOfferAudit', stats);
  await copyQuery(sourceDb.collection('smv_offer_usage_counters'),
    targetDb.collection('smv_offer_usage_counters'), 'walletOfferUsageCounters', stats);

  await copyQuery(sourceDb.collection('smv_live_sessions'), targetDb.collection('smv_live_sessions'), 'liveSessions', stats, doc => {
    sessionIds.add(doc.id);
    const data = doc.data() || {};
    if (data.customerUid) participantUids.add(String(data.customerUid));
    if (data.astrologerUid) {
      participantUids.add(String(data.astrologerUid));
      astrologerUids.add(String(data.astrologerUid));
    }
    if (data.appointmentId) appointmentIds.add(String(data.appointmentId));
  });
  await copyQuery(sourceDb.collection('smv_live_bookings'), targetDb.collection('smv_live_bookings'), 'liveBookings', stats, doc => {
    const data = doc.data() || {};
    if (data.customerUid) participantUids.add(String(data.customerUid));
    if (data.astrologerUid) {
      participantUids.add(String(data.astrologerUid));
      astrologerUids.add(String(data.astrologerUid));
    }
  });

  stats.liveSessionMessages = { sourceDocuments: 0, targetWrites: 0 };
  stats.liveSessionSignals = { sourceDocuments: 0, targetWrites: 0 };
  for (const sessionId of sessionIds) {
    await copySessionChildren(sourceDb, targetDb, sessionId, 'messages', stats);
    await copySessionChildren(sourceDb, targetDb, sessionId, 'signals', stats);
  }

  // Only related profile shadow documents are copied; Firebase Authentication
  // users and their UIDs are not migrated or re-created in Project 5.
  stats.sessionProfiles = { sourceDocuments: 0, targetWrites: 0 };
  for (const uid of participantUids) {
    if (!uid) continue;
    const profile = await sourceDb.collection('smv_users').doc(uid).get();
    if (profile.exists) {
      stats.sessionProfiles.sourceDocuments += 1;
      if (APPLY) {
        await targetDb.collection('smv_users').doc(uid).set(profile.data() || {}, { merge: true });
        stats.sessionProfiles.targetWrites += 1;
      }
    }
  }
  stats.astrologerProfiles = { sourceDocuments: 0, targetWrites: 0 };
  for (const uid of astrologerUids) {
    const profile = await sourceDb.collection('smv_astrologers').doc(uid).get();
    if (profile.exists) {
      stats.astrologerProfiles.sourceDocuments += 1;
      if (APPLY) {
        await targetDb.collection('smv_astrologers').doc(uid).set(profile.data() || {}, { merge: true });
        stats.astrologerProfiles.targetWrites += 1;
      }
    }
  }
  stats.sessionSettings = { sourceDocuments: 0, targetWrites: 0 };
  for (const id of ['liveSessionPricing', 'commission']) {
    const data = await copyNamedDocument(sourceDb, targetDb, 'smv_settings', id, stats, 'setting:' + id);
    if (data) stats.sessionSettings.sourceDocuments += 1;
    if (data && APPLY) stats.sessionSettings.targetWrites += 1;
  }
  stats.appointments = { sourceDocuments: 0, targetWrites: 0 };
  for (const id of appointmentIds) {
    const data = await copyNamedDocument(sourceDb, targetDb, 'smv_appointments', id, stats, 'appointment:' + id);
    if (data) stats.appointments.sourceDocuments += 1;
    if (data && APPLY) stats.appointments.targetWrites += 1;
  }
  await copyQuery(sourceDb.collection('smv_payments').where('source', '==', 'live_session'),
    targetDb.collection('smv_payments'), 'liveSessionEarnings', stats);
  await copyQuery(sourceDb.collection('smv_withdrawals'), targetDb.collection('smv_withdrawals'), 'withdrawals', stats);
  await copyQuery(sourceDb.collection('smv_withdrawal_payouts'), targetDb.collection('smv_withdrawal_payouts'), 'withdrawalPayouts', stats);
  for (const orderId of razorpayOrderIds) {
    const data = await copyNamedDocument(sourceDb, targetDb, 'razorpay_orders', orderId, stats, 'razorpayOrder:' + orderId);
    if (data) participantUids.add(String(data.customerUid || ''));
  }
  // Push tokens remain sourced from the primary project in the app; no tokens
  // are copied or rewritten by this migration. Auth and token ownership remain unchanged.

  stats.walletOwnersAndSessionParticipants = participantUids.size;
  stats.astrologerParticipants = astrologerUids.size;
  stats.liveSessionsWithSubcollections = sessionIds.size;
  stats.walletRechargeDocuments = rechargeCount;
  stats.instructions = APPLY
    ? 'Review the copied target counts and reconcile every wallet/ledger/profile. The script does not set backfill/cutover flags.'
    : 'DRY RUN only. No target writes occurred.';

  process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
}

main().catch(error => {
  console.error('Project 5 Wallet domain migration failed:', error?.stack || error);
  process.exitCode = 1;
});

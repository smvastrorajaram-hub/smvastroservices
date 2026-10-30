'use strict';

// Read-only validator for Project 2/3 mirrored read datasets and Project 4/5 content.
// It never writes, changes flags, or deletes source/replica data.
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const PAGE_SIZE = 200;
const P23_COLLECTIONS = [
  'smv_questions',
  'smv_private_consultations',
  'smv_astrologers',
  'smv_reviews',
  'smv_notifications',
  'smv_astrologer_quiz_questions',
  'smv_live_sessions'
];

function primaryCredentials(env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) throw new Error('Primary Firebase Admin credentials are required.');
  return { projectId, clientEmail, privateKey };
}
function stable(value) {
  if (value instanceof Date) return { __date: value.toISOString() };
  if (value && typeof value.toDate === 'function') {
    try { return { __timestamp: value.toDate().toISOString() }; } catch (_) {}
  }
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
async function scanCollection(collectionRef) {
  const result = new Map();
  let last = null;
  while (true) {
    let query = collectionRef.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) result.set(doc.id, hash(doc.data() || {}));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }
  return result;
}
function compareMaps(label, left, right, report) {
  const missing = [...left.keys()].filter(id => !right.has(id));
  const extra = [...right.keys()].filter(id => !left.has(id));
  const mismatched = [...left.keys()].filter(id => right.has(id) && left.get(id) !== right.get(id));
  report.checks[label] = {
    leftCount: left.size, rightCount: right.size,
    missingFromRight: missing.length, extraInRight: extra.length, contentMismatches: mismatched.length,
    samples: { missingFromRight: missing.slice(0, 10), extraInRight: extra.slice(0, 10), contentMismatches: mismatched.slice(0, 10) }
  };
  if (missing.length || extra.length || mismatched.length) report.errors.push(label + ' differs between paired projects.');
}
async function main() {
  const app = admin.initializeApp({ credential: admin.credential.cert(primaryCredentials(process.env)) }, 'smv-paired-replica-validation-primary');
  const primaryDb = admin.firestore(app);
  const multi = initializeMultiProjectFirestore({
    admin, primaryDb,
    env: { ...process.env, SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true', SMV_WALLET_DOMAIN_ENABLED: 'true' }
  });
  const report = {
    mode: 'READ-ONLY RECONCILIATION',
    projectIds: { project2: multi.projectIds.consultations, project3: multi.projectIds.liveData, project4: multi.projectIds.content, project5: multi.projectIds.walletDomain },
    checks: {}, errors: [], sourceDataDeleted: false, flagsChanged: false
  };
  for (const collectionName of P23_COLLECTIONS) {
    compareMaps('project2-vs-project3/' + collectionName,
      await scanCollection(multi.consultationsDb.collection(collectionName)),
      await scanCollection(multi.liveDataDb.collection(collectionName)), report);
  }
  // Parent session documents are archived only for ended sessions. Include all session IDs
  // from both pair members and both transaction-domain sources so orphaned subcollections
  // (which Firestore permits) are still reconciled.
  const sessionIds = new Set();
  for (const db of [primaryDb, multi.consultationsDb, multi.liveDataDb, multi.walletDomainDb]) {
    const sessions = await scanCollection(db.collection('smv_live_sessions'));
    for (const id of sessions.keys()) sessionIds.add(id);
  }
  const nestedCounts = { sessionsChecked: 0, messagesCompared: 0, signalsCompared: 0 };
  const nestedMismatches = [];
  for (const sessionId of sessionIds) {
    nestedCounts.sessionsChecked += 1;
    for (const childName of ['messages', 'signals']) {
      const [p2, p3] = await Promise.all([
        scanCollection(multi.consultationsDb.collection('smv_live_sessions').doc(sessionId).collection(childName)),
        scanCollection(multi.liveDataDb.collection('smv_live_sessions').doc(sessionId).collection(childName))
      ]);
      if (childName === 'messages') nestedCounts.messagesCompared += p2.size + p3.size;
      else nestedCounts.signalsCompared += p2.size + p3.size;
      const mismatchCount = [...p2.keys()].filter(id => !p3.has(id) || p2.get(id) !== p3.get(id)).length +
        [...p3.keys()].filter(id => !p2.has(id)).length;
      if (mismatchCount) nestedMismatches.push({ sessionId, childName, mismatchCount });
    }
  }
  report.checks['project2-vs-project3/live-session-subcollections'] = {
    ...nestedCounts, mismatchedSessionSubcollections: nestedMismatches.length, samples: nestedMismatches.slice(0, 10)
  };
  if (nestedMismatches.length) report.errors.push('Project 2/3 Live Session message/signal subcollections differ.');
  compareMaps('project4-vs-project5/smv_content',
    await scanCollection(multi.contentDb.collection('smv_content')),
    await scanCollection(multi.walletDomainDb.collection('smv_content')), report);
  report.ok = report.errors.length === 0;
  report.summary = {
    checks: Object.keys(report.checks).length, errors: report.errors.length,
    sourceDataDeleted: false, flagsChanged: false,
    instruction: 'Enable paired read gates only after this report has ok=true, continuous mirroring is active, and associated backfill-complete flags are independently verified.'
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.ok) process.exitCode = 2;
}
main().catch(error => {
  console.error('Paired Firestore read validation failed:', error?.stack || error);
  process.exitCode = 1;
});

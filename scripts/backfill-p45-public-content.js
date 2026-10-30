'use strict';

// Project 4 -> Project 5 public-content replica backfill. Dry-run by default.
// This does not copy, mutate, or delete Wallet/ledger/payment records.
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 200;

function primaryCredentials(env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Set primary FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
  }
  return { projectId, clientEmail, privateKey };
}

async function copyContent(source, target) {
  let last = null, seen = 0, writes = 0;
  while (true) {
    let query = source.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      seen += 1;
      if (APPLY) {
        await target.doc(doc.id).set(doc.data() || {});
        writes += 1;
      }
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }
  return { sourceDocuments: seen, targetWrites: writes };
}

async function main() {
  if (APPLY && !/^(?:1|true|yes|on)$/i.test(String(process.env.SMV_P45_PAIRED_CONTENT_MIRROR_WRITES || '').trim())) {
    throw new Error('Refusing --apply unless SMV_P45_PAIRED_CONTENT_MIRROR_WRITES=true is enabled so updates are mirrored during the copy.');
  }
  const app = admin.initializeApp({ credential: admin.credential.cert(primaryCredentials(process.env)) }, 'smv-p45-content-backfill-primary');
  const sourceDb = admin.firestore(app);
  const multi = initializeMultiProjectFirestore({
    admin, primaryDb: sourceDb,
    env: { ...process.env, SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true', SMV_WALLET_DOMAIN_ENABLED: 'true' }
  });
  if (!multi.contentDb || !multi.walletDomainDb || multi.contentDb === multi.walletDomainDb) {
    throw new Error('Project 4 content and Project 5 Wallet-domain connections must both be initialized and distinct.');
  }
  const result = await copyContent(multi.contentDb.collection('smv_content'), multi.walletDomainDb.collection('smv_content'));
  process.stdout.write(JSON.stringify({
    mode: APPLY ? 'APPLY — public content only; no source documents are deleted' : 'DRY RUN — no target writes',
    sourceProject: multi.projectIds.content,
    targetProject: multi.projectIds.walletDomain,
    collection: 'smv_content',
    ...result,
    instruction: 'After mirroring is active and this copy is clean, run scripts/validate-paired-firestore-replicas.js. Do not set SMV_P45_READ_FAILOVER_COMPLETE until validation passes.'
  }, null, 2) + '\n');
}

main().catch(error => {
  console.error('Project 4/5 content backfill failed:', error?.stack || error);
  process.exitCode = 1;
});

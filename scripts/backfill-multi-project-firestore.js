'use strict';

// Non-destructive, resumable data copy for the opt-in multi-project rollout.
// Default mode is DRY RUN. Pass --apply only after reviewing the counts.
// This script copies; it never deletes source documents or source subcollections.
const admin = require('firebase-admin');
const { initializeMultiProjectFirestore, normalizePrivateKey } = require('../multi-project-firestore');

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 200;

function primaryCredential(env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for the source project first.');
  }
  return { projectId, clientEmail, privateKey };
}

async function forEachPage(collectionRef, visit) {
  let last = null;
  let total = 0;
  while (true) {
    let query = collectionRef.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
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

async function copyCollection(source, target, counts, label) {
  counts[label] = await forEachPage(source, async doc => {
    if (APPLY) await target.doc(doc.id).set(doc.data(), { merge: true });
  });
}

async function copySessionSubcollection(sourceSessionRef, targetSessionRef, name, counts, label) {
  const source = sourceSessionRef.collection(name);
  const target = targetSessionRef.collection(name);
  counts[label] = (counts[label] || 0) + await forEachPage(source, async doc => {
    if (APPLY) await target.doc(doc.id).set(doc.data(), { merge: true });
  });
}

async function main() {
  const primaryApp = admin.initializeApp({
    credential: admin.credential.cert(primaryCredential(process.env))
  }, 'smv-multiproject-backfill-primary');
  const sourceDb = admin.firestore(primaryApp);
  const multi = initializeMultiProjectFirestore({
    admin,
    primaryDb: sourceDb,
    env: { ...process.env, SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true' }
  });
  const counts = {
    mode: APPLY ? 'APPLY — source documents will be copied, never deleted' : 'DRY RUN — no writes',
    sourceProject: multi.projectIds.primary,
    targetProjects: {
      consultationHistory: multi.projectIds.consultations,
      liveMessagesAndSignals: multi.projectIds.liveData,
      publicContent: multi.projectIds.content
    }
  };

  await copyCollection(sourceDb.collection('smv_questions'), multi.consultationsDb.collection('smv_questions'), counts, 'questionHistoryDocuments');
  await copyCollection(sourceDb.collection('smv_private_consultations'), multi.consultationsDb.collection('smv_private_consultations'), counts, 'privateConsultationHistoryDocuments');
  await copyCollection(sourceDb.collection('smv_content'), multi.contentDb.collection('smv_content'), counts, 'publicContentDocuments');

  counts.endedLiveSessionArchives = 0;
  counts.liveSessionDocumentsChecked = 0;
  counts.liveMessageDocuments = 0;
  counts.liveSignalDocuments = 0;
  counts.sessionCopyFailures = 0;

  await forEachPage(sourceDb.collection('smv_live_sessions'), async sourceDoc => {
    counts.liveSessionDocumentsChecked += 1;
    const sourceData = sourceDoc.data() || {};
    const sourceRef = sourceDoc.ref;
    const archiveRef = multi.consultationsDb.collection('smv_live_sessions').doc(sourceDoc.id);
    const liveMirrorRef = multi.liveDataDb.collection('smv_live_sessions').doc(sourceDoc.id);
    let archiveReady = String(sourceData.state || '').toLowerCase() !== 'ended';
    let liveMirrorReady = true;

    try {
      if (String(sourceData.state || '').toLowerCase() === 'ended') {
        counts.endedLiveSessionArchives += 1;
        if (APPLY) {
          await archiveRef.set({ ...sourceData, historyArchivedToSecondary: true }, { merge: true });
        }
        archiveReady = true;
      }
      await copySessionSubcollection(sourceRef, liveMirrorRef, 'messages', counts, 'liveMessageDocuments');
      await copySessionSubcollection(sourceRef, liveMirrorRef, 'signals', counts, 'liveSignalDocuments');
    } catch (error) {
      liveMirrorReady = false;
      archiveReady = false;
      counts.sessionCopyFailures += 1;
      console.warn('Copy incomplete for live session ' + sourceDoc.id + ': ' + (error?.message || error));
    }

    if (APPLY) {
      // Mark the source only after its corresponding copy was attempted successfully.
      // Primary session/wallet/payment records remain in place as the transaction source of truth.
      await sourceRef.set({
        historyArchivedToSecondary: archiveReady && String(sourceData.state || '').toLowerCase() === 'ended',
        liveAuxStoreReady: liveMirrorReady
      }, { merge: true });
    }
  });

  console.log(JSON.stringify(counts, null, 2));
  if (!APPLY) {
    console.log('No writes performed. Review the counts, then rerun with --apply to copy documents.');
  } else if (counts.sessionCopyFailures > 0) {
    console.warn('Some sessions need a retry. Do not set any *_BACKFILL_COMPLETE environment flag until a clean rerun reports zero failures.');
    process.exitCode = 2;
  } else {
    console.log('Copy completed without deleting source data. Verify counts and sample documents in all target projects before setting the backfill-complete flags.');
  }
}

main().catch(error => {
  console.error('Multi-project Firestore backfill failed:', error?.stack || error);
  process.exitCode = 1;
});

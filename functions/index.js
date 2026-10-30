'use strict';
const admin=require('firebase-admin');
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {defineSecret,defineString}=require('firebase-functions/params');
const {normalizePrivateKey,applyReplicaChange}=require('./replica-sync');
const {PROJECTS,PRODUCTION_SECONDARY_PROJECT_IDS}=require('./replica-catalog');
const sourceProjectParam=defineString('SMV_REPLICA_SOURCE_PROJECT_ID');
const targetProjectParam=defineString('SMV_REPLICA_TARGET_PROJECT_ID');
const peerProjectParam=defineString('SMV_REPLICA_PEER_PROJECT_ID',{default:''});
const pairedMirrorParam=defineString('SMV_P23_PAIRED_REPLICA_MIRROR_WRITES',{default:'false'});
const enabledParam=defineString('SMV_DASHBOARD_READ_REPLICA_MIRROR_WRITES',{default:'false'});
const clientEmailSecret=defineSecret('SMV_REPLICA_TARGET_CLIENT_EMAIL');
const privateKeySecret=defineSecret('SMV_REPLICA_TARGET_PRIVATE_KEY');
const targetAppName='smv-read-replica-consultations';
function enabled(value){return /^(?:1|true|yes|on)$/i.test(String(value??'').trim());}
function validateTarget(){
 const runtime=String(process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||'').trim();
 const expected=String(sourceProjectParam.value()||'').trim();
 const target=String(targetProjectParam.value()||'').trim();
 const peer=String(peerProjectParam.value()||'').trim();
 if(!runtime||runtime!==expected)throw new Error('Replica sync source-project mismatch.');
 if(!target||target===runtime)throw new Error('Replica sync requires a distinct Project 2 target.');
 if(peer&&(peer===runtime||peer===target))throw new Error('Paired replica target must be distinct from source and Project 2.');
 if(PRODUCTION_SECONDARY_PROJECT_IDS.includes(target)&&runtime!==PROJECTS.primary)throw new Error('Non-production Firebase projects cannot write to a production secondary.');
 if(PRODUCTION_SECONDARY_PROJECT_IDS.includes(peer)&&runtime!==PROJECTS.primary)throw new Error('Non-production Firebase projects cannot write to a production paired replica.');
 if(runtime===PROJECTS.primary&&target===PROJECTS.stagingPrimary)throw new Error('Production Firebase cannot write into staging.');
 return {runtime,target,peer};
}
function dbForReplica(projectId, appName){
 const credentials={projectId,clientEmail:String(clientEmailSecret.value()||'').trim(),privateKey:normalizePrivateKey(privateKeySecret.value())};
 if(!credentials.clientEmail||!credentials.privateKey)throw new Error('Replica service-account credentials are not configured.');
 const previous=admin.apps.find(app=>app.name===appName);
 if(previous){if(String(previous.options?.projectId||'')!==projectId)throw new Error('Replica app target changed at runtime.');return admin.firestore(previous);}
 return admin.firestore(admin.initializeApp({credential:admin.credential.cert(credentials)},appName));
}
function targetDb(){
 const {target}=validateTarget();
 return dbForReplica(target,targetAppName);
}
function targetDbs(){
 const {target,peer}=validateTarget();
 const pairEnabled=enabled(pairedMirrorParam.value());
 if(pairEnabled&&!peer)throw new Error('Paired Project 2/3 mirroring requires SMV_REPLICA_PEER_PROJECT_ID.');
 return [dbForReplica(target,targetAppName),...(pairEnabled&&peer?[dbForReplica(peer,'smv-read-replica-peer')]:[])];
}
function mirrorCollection(collectionName){
 return onDocumentWritten({document:collectionName+'/{documentId}',region:'asia-south1',retry:true,timeoutSeconds:120,memory:'256MiB',secrets:[clientEmailSecret,privateKeySecret]},async event=>{
  if(!enabled(enabledParam.value()))return;
  validateTarget();
  const change=event.data;if(!change)throw new Error('Missing Firestore change payload.');
  const after=change.after,exists=Boolean(after?.exists);
  const targetDatabases=targetDbs();
  const results=await Promise.all(targetDatabases.map(targetDatabase=>applyReplicaChange({
   targetDb:targetDatabase,collectionName,documentId:String(event.params?.documentId||''),
   exists,data:exists?after.data():undefined,sourceVersion:exists?after.updateTime:event.time,eventTime:event.time
  })));
  if(results.some(result=>result.staleEventSkipped))console.info('[Firestore replica sync] Skipped stale event for '+collectionName+'/'+event.params?.documentId);
 });
}
exports.mirrorSmvQuestions=mirrorCollection('smv_questions');
exports.mirrorSmvPrivateConsultations=mirrorCollection('smv_private_consultations');
exports.mirrorSmvAstrologers=mirrorCollection('smv_astrologers');
exports.mirrorSmvReviews=mirrorCollection('smv_reviews');
exports.mirrorSmvNotifications=mirrorCollection('smv_notifications');
exports.mirrorSmvAstrologerQuizQuestions=mirrorCollection('smv_astrologer_quiz_questions');

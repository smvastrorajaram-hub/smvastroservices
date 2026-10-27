'use strict';
const crypto=require('node:crypto');
const {isProject2ReplicaCollection}=require('./replica-catalog');
function timestampToVersionNanos(value){
 if(typeof value==='bigint')return value.toString();
 if(typeof value==='number'&&Number.isFinite(value))return (BigInt(Math.trunc(value))*1000000n).toString();
 if(value instanceof Date)return (BigInt(value.getTime())*1000000n).toString();
 if(value&&typeof value==='object'){
  const seconds=value.seconds??value._seconds,nanos=value.nanoseconds??value._nanoseconds??0;
  if(Number.isFinite(Number(seconds))&&Number.isFinite(Number(nanos)))return (BigInt(Math.trunc(Number(seconds)))*1000000000n+BigInt(Math.trunc(Number(nanos)))).toString();
 }
 if(typeof value==='string'&&/^\d+$/.test(value))return BigInt(value).toString();
 if(typeof value==='string'){
  const match=value.match(/^(.*?)(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/);
  if(match){
   const millis=Date.parse(match[1]+match[3]);
   if(!Number.isFinite(millis))throw new TypeError('Invalid replication timestamp.');
   return (BigInt(Math.floor(millis/1000))*1000000000n+BigInt(String(match[2]||'').padEnd(9,'0').slice(0,9)||'0')).toString();
  }
  const millis=Date.parse(value);if(Number.isFinite(millis))return (BigInt(millis)*1000000n).toString();
 }
 throw new TypeError('A valid Firestore updateTime or event timestamp is required.');
}
function replicaStateDocumentId(collectionName,documentId){
 return crypto.createHash('sha256').update(String(collectionName)+'/'+String(documentId)).digest('hex');
}
// Source-version sidecar and mirror mutation share one target transaction. This
// makes retries idempotent and prevents old events from overwriting new data or
// resurrecting a document after a newer delete event.
async function applyReplicaChange({targetDb,collectionName,documentId,exists,data,sourceVersion,eventTime}={}){
 const collection=String(collectionName||''),id=String(documentId||'');
 if(!targetDb||typeof targetDb.runTransaction!=='function')throw new TypeError('targetDb is required.');
 if(!isProject2ReplicaCollection(collection))throw new Error('Collection is not on the Project 2 replica allowlist: '+collection);
 if(!id||id.includes('/'))throw new TypeError('A single document ID is required.');
 if(typeof exists!=='boolean')throw new TypeError('exists must be a boolean.');
 if(exists&&(!data||typeof data!=='object'||Array.isArray(data)))throw new TypeError('Existing source documents require document data.');
 const version=timestampToVersionNanos(sourceVersion??eventTime);
 const target=targetDb.collection(collection).doc(id);
 const state=targetDb.collection('_smv_replica_sync_state').doc(replicaStateDocumentId(collection,id));
 return targetDb.runTransaction(async tx=>{
  const snap=await tx.get(state),previous=snap.exists?String(snap.data()?.sourceVersionNanos||''):'';
  if(/^\d+$/.test(previous)&&BigInt(previous)>=BigInt(version))return {applied:false,staleEventSkipped:true,sourceVersionNanos:version};
  if(exists)tx.set(target,data);else tx.delete(target);
  tx.set(state,{sourceCollection:collection,sourceDocumentId:id,sourceVersionNanos:version,deleted:!exists,syncedAt:new Date().toISOString()});
  return {applied:true,staleEventSkipped:false,sourceVersionNanos:version};
 });
}
function normalizePrivateKey(value){
 return String(value||'').replace(/^['"]|['"]$/g,'').replace(/\\n/g,'\n').trim();
}
module.exports={timestampToVersionNanos,replicaStateDocumentId,applyReplicaChange,normalizePrivateKey};

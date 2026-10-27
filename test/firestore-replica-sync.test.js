'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {timestampToVersionNanos,replicaStateDocumentId,applyReplicaChange}=require('../firestore-replica-sync');
const {project2ReadCandidates,isProject2ReplicaCollection}=require('../firestore-read-replica-catalog');
class FakeFirestore{
 constructor(){this.documents=new Map();}
 collection(name){return {doc:id=>({path:String(name)+'/'+String(id)})};}
 async runTransaction(work){
  const pending=[];
  const tx={get:async ref=>{const v=this.documents.get(ref.path);return {exists:v!==undefined,data:()=>v};},set:(ref,data)=>pending.push({type:'set',path:ref.path,data}),delete:ref=>pending.push({type:'delete',path:ref.path})};
  const result=await work(tx);for(const w of pending){if(w.type==='delete')this.documents.delete(w.path);else this.documents.set(w.path,w.data);}return result;
 }
}
test('Firestore timestamp source versions preserve nanosecond ordering',()=>{
 assert.equal(timestampToVersionNanos({seconds:10,nanoseconds:123}),'10000000123');
 assert.equal(timestampToVersionNanos('10000000123'),'10000000123');
 assert.ok(BigInt(timestampToVersionNanos('2026-10-28T10:00:00.000000002Z'))>BigInt(timestampToVersionNanos('2026-10-28T10:00:00.000000001Z')));
});
test('replica sidecar document IDs are stable',()=>{
 assert.equal(replicaStateDocumentId('smv_reviews','r1'),replicaStateDocumentId('smv_reviews','r1'));
 assert.match(replicaStateDocumentId('smv_reviews','r1'),/^[a-f0-9]{64}$/);
});
test('newer source write wins if an older trigger arrives later',async()=>{
 const db=new FakeFirestore();
 await applyReplicaChange({targetDb:db,collectionName:'smv_reviews',documentId:'r1',exists:true,data:{review:'new'},sourceVersion:{seconds:200,nanoseconds:0}});
 const old=await applyReplicaChange({targetDb:db,collectionName:'smv_reviews',documentId:'r1',exists:true,data:{review:'old'},sourceVersion:{seconds:100,nanoseconds:0}});
 assert.equal(old.staleEventSkipped,true);assert.deepEqual(db.documents.get('smv_reviews/r1'),{review:'new'});
});
test('delete tombstone prevents an old event from resurrecting a record',async()=>{
 const db=new FakeFirestore();
 await applyReplicaChange({targetDb:db,collectionName:'smv_notifications',documentId:'n1',exists:true,data:{title:'old'},sourceVersion:{seconds:100,nanoseconds:0}});
 await applyReplicaChange({targetDb:db,collectionName:'smv_notifications',documentId:'n1',exists:false,sourceVersion:{seconds:200,nanoseconds:0}});
 const late=await applyReplicaChange({targetDb:db,collectionName:'smv_notifications',documentId:'n1',exists:true,data:{title:'stale'},sourceVersion:{seconds:150,nanoseconds:0}});
 assert.equal(late.staleEventSkipped,true);assert.equal(db.documents.has('smv_notifications/n1'),false);
 assert.equal(db.documents.get('_smv_replica_sync_state/'+replicaStateDocumentId('smv_notifications','n1')).deleted,true);
});
test('financial and identity collections are excluded',()=>{
 for(const name of ['smv_wallets','smv_wallet_transactions','smv_payouts','smv_withdrawals','smv_users','smv_phone_registry','smv_public_ids','smv_settings'])assert.equal(isProject2ReplicaCollection(name),false,name);
 for(const name of ['smv_reviews','smv_notifications','smv_questions','smv_private_consultations'])assert.equal(isProject2ReplicaCollection(name),true,name);
});
test('read fallback candidates are gated by backfill and distinct DBs',()=>{
 const primary={},replica={};
 assert.equal(project2ReadCandidates({primaryDb:primary,replicaDb:replica,collectionName:'smv_reviews',multiProjectEnabled:true,backfillComplete:false}).length,1);
 assert.equal(project2ReadCandidates({primaryDb:primary,replicaDb:replica,collectionName:'smv_reviews',multiProjectEnabled:false,backfillComplete:true}).length,1);
 assert.equal(project2ReadCandidates({primaryDb:primary,replicaDb:replica,collectionName:'smv_reviews',multiProjectEnabled:true,backfillComplete:true}).length,2);
 assert.equal(project2ReadCandidates({primaryDb:primary,replicaDb:primary,collectionName:'smv_reviews',multiProjectEnabled:true,backfillComplete:true}).length,1);
 assert.equal(project2ReadCandidates({primaryDb:primary,replicaDb:replica,collectionName:'smv_wallets',multiProjectEnabled:true,backfillComplete:true}).length,1);
});

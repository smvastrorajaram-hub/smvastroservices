'use strict';
const admin=require('firebase-admin'),crypto=require('node:crypto');
const {initializeMultiProjectFirestore,normalizePrivateKey}=require('../multi-project-firestore');
const {PROJECT2_REPLICA_COLLECTIONS,PROJECTS}=require('../firestore-read-replica-catalog');
const PAGE_SIZE=200;
const enabled=name=>/^(?:1|true|yes|on)$/i.test(String(process.env[name]||'').trim());
function primaryCredential(env){
 const projectId=String(env.FIREBASE_PROJECT_ID||'').trim(),clientEmail=String(env.FIREBASE_CLIENT_EMAIL||'').trim(),privateKey=normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
 if(!projectId||!clientEmail||!privateKey)throw new Error('Source Firebase Admin credentials are incomplete.');
 return {projectId,clientEmail,privateKey};
}
function canonicalize(v){
 if(v===null||typeof v!=='object')return v;
 if(v instanceof Date)return {__type:'date',value:v.toISOString()};
 if(Buffer.isBuffer(v)||v instanceof Uint8Array)return {__type:'bytes',value:Buffer.from(v).toString('base64')};
 const sec=v.seconds??v._seconds,nano=v.nanoseconds??v._nanoseconds??0;
 if(sec!==undefined&&Number.isFinite(Number(sec))&&Number.isFinite(Number(nano)))return {__type:'timestamp',seconds:Number(sec),nanoseconds:Number(nano)};
 if(typeof v.path==='string'&&v.firestore)return {__type:'reference',path:v.path};
 if(v.latitude!==undefined||v._latitude!==undefined)return {__type:'geopoint',latitude:Number(v.latitude??v._latitude),longitude:Number(v.longitude??v._longitude)};
 if(Array.isArray(v))return v.map(canonicalize);
 const out={};for(const k of Object.keys(v).sort())out[k]=canonicalize(v[k]);return out;
}
const hash=data=>crypto.createHash('sha256').update(JSON.stringify(canonicalize(data))).digest('hex');
const compareId=(a,b)=>Buffer.compare(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
async function* iterate(ref){
 let last=null;while(true){let q=ref.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);if(last)q=q.startAfter(last);
 const s=await q.get();if(s.empty)return;for(const d of s.docs)yield d;last=s.docs[s.docs.length-1];if(s.size<PAGE_SIZE)return;}
}
async function compareCollection(source,target){
 const r={collection:source.id,sourceDocuments:0,targetDocuments:0,matchedDocuments:0,missingFromTarget:0,extraInTarget:0,contentMismatches:0,sampleDifferences:[]};
 const a=iterate(source),b=iterate(target);let [x,y]=await Promise.all([a.next(),b.next()]);
 while(!x.done||!y.done){
  const s=x.done?null:x.value,t=y.done?null:y.value;if(s)r.sourceDocuments++;if(t)r.targetDocuments++;
  if(s&&t&&s.id===t.id){r.matchedDocuments++;if(hash(s.data())!==hash(t.data())){r.contentMismatches++;if(r.sampleDifferences.length<20)r.sampleDifferences.push({id:s.id,kind:'content-mismatch'});}
   [x,y]=await Promise.all([a.next(),b.next()]);
  }else if(s&&(!t||compareId(s.id,t.id)<0)){r.missingFromTarget++;if(r.sampleDifferences.length<20)r.sampleDifferences.push({id:s.id,kind:'missing-from-target'});x=await a.next();}
  else if(t){r.extraInTarget++;if(r.sampleDifferences.length<20)r.sampleDifferences.push({id:t.id,kind:'extra-in-target'});y=await b.next();}
 }
 r.verified=r.missingFromTarget===0&&r.extraInTarget===0&&r.contentMismatches===0&&r.sourceDocuments===r.targetDocuments;return r;
}
async function main(){
 if(!enabled('SMV_FIRESTORE_MULTI_PROJECT_ENABLED'))throw new Error('SMV_FIRESTORE_MULTI_PROJECT_ENABLED=true is required.');
 const sourceId=String(process.env.FIREBASE_PROJECT_ID||'').trim();
 if(sourceId===PROJECTS.primary&&!enabled('SMV_ALLOW_PRODUCTION_READ_REPLICA_VALIDATION'))throw new Error('Production reconciliation is blocked by default; validate isolated staging first.');
 const app=admin.initializeApp({credential:admin.credential.cert(primaryCredential(process.env))},'smv-read-replica-reconcile-primary');
 const sourceDb=admin.firestore(app),multi=initializeMultiProjectFirestore({admin,primaryDb:sourceDb,env:process.env});
 if(!multi.enabled||!multi.consultationsDb||multi.consultationsDb===sourceDb)throw new Error('Project 2 replica is not a distinct initialized database.');
 if(sourceId===PROJECTS.stagingPrimary&&multi.projectIds.consultations===PROJECTS.consultations)throw new Error('Staging must not reconcile against production Project 2.');
 const report={mode:'READ ONLY — no data or flags changed',sourceProject:multi.projectIds.primary,targetProject:multi.projectIds.consultations,collections:[],verified:false};
 for(const name of PROJECT2_REPLICA_COLLECTIONS)report.collections.push(await compareCollection(sourceDb.collection(name),multi.consultationsDb.collection(name)));
 report.verified=report.collections.every(c=>c.verified);report.finishedAt=new Date().toISOString();console.log(JSON.stringify(report,null,2));if(!report.verified)process.exitCode=2;
}
main().catch(e=>{console.error('Project 2 reconciliation failed:',e?.stack||e);process.exitCode=1;});

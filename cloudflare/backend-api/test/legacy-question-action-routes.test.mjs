import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyQuestionActionRoutes } from '../src/legacy-question-action-routes.mjs';

function harness(){const handlers=new Map();return{handlers,post(path,handler){handlers.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function request(body={}){return{body,get(name){return String(name).toLowerCase()==='authorization'?'Bearer token':'';}};}
function fixture({docs={},queries={}}={}){const writes=[];return{writes,async runTransaction(callback){const tx={async getDocument(path){return docs[path]||{exists:false,data:null};},async query(options){return queries[options.collectionPath]||[];},update(path,data){writes.push({type:'update',path,data});},set(path,data,options){writes.push({type:'set',path,data,options});}};return callback(tx);}};}
const admin={async authenticateAuthorization(){return{uid:'admin-1',role:'admin',isAdmin:true};}};

test('Admin open workflow atomically releases only paid and unassigned questions',async()=>{
 const app=harness(),firestore=fixture({queries:{smv_questions:[
  {id:'q1',data:{paymentStatus:'paid',status:'paid',astrologerId:''}},
  {id:'q2',data:{paymentStatus:'pending',status:'pending_admin_approval'}},
  {id:'q3',data:{paymentStatus:'paid',status:'paid',astrologerId:'astro-1'}}
 ]}});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/set-open-workflow')(request({allowWithoutAdminApproval:true}),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.opened,1);
 assert.equal(firestore.writes.find(x=>x.path==='smv_questions/q1').data.allocationStatus,'available_to_astrologers');
 assert.ok(firestore.writes.some(x=>x.path==='smv_settings/workflow'&&x.data.allowWithoutAdminApproval===true));
});

test('Admin close workflow returns only paid, still-unassigned open questions to review',async()=>{
 const app=harness(),firestore=fixture({queries:{smv_questions:[
  {id:'q1',data:{paymentStatus:'paid',status:'available_to_astrologers',astrologerId:''}},
  {id:'q2',data:{paymentStatus:'paid',status:'available_to_astrologers',astrologerId:'astro-1'}}
 ]}});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/set-open-workflow')(request({allowWithoutAdminApproval:false}),res);
 assert.equal(res.body.closed,1);
 assert.equal(firestore.writes.find(x=>x.path==='smv_questions/q1').data.status,'pending_admin_approval');
});

test('Admin workflow refuses a batch at the bounded transaction ceiling without partial changes',async()=>{
 const app=harness(),firestore=fixture({queries:{smv_questions:Array.from({length:450},(_,i)=>({id:'q'+i,data:{paymentStatus:'paid',status:'paid'}}))}});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/set-open-workflow')(request({allowWithoutAdminApproval:true}),res);
 assert.equal(res.statusCode,409);assert.equal(firestore.writes.length,0);
});

test('Astrologer claim validates approved profile, payment, allocation and commission',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'available_to_astrologers',allocationStatus:'available_to_astrologers',amount:100}},
  'smv_astrologers/astro-1':{exists:true,data:{status:'approved',name:'Astrologer A'}},
  'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}},
  'smv_settings/commission':{exists:true,data:{astroPercent:25}}
 }});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1',role:'astrologer'};}}});
 const res=response();await app.handlers.get('POST /astrologer/claim-question')(request({questionId:'q1'}),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.astrologerCommissionAmount,25);
 assert.equal(firestore.writes[0].data.allocationStatus,'claimed_by_astrologer');
});

test('Two claim attempts cannot claim an allocated question for another Astrologer',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'admin_approved',allocationStatus:'claimed_by_astrologer',astrologerId:'astro-2',amount:100,adminQuestionApprovedAt:{seconds:1}}},
  'smv_astrologers/astro-1':{exists:true,data:{status:'approved'}}
 }});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const res=response();await app.handlers.get('POST /astrologer/claim-question')(request({questionId:'q1'}),res);
 assert.equal(res.statusCode,409);assert.equal(firestore.writes.length,0);
});

test('Non-admin cannot change global workflow; unapproved Astrologer cannot claim question',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'available_to_astrologers',allocationStatus:'available_to_astrologers',amount:100}},
  'smv_astrologers/astro-1':{exists:true,data:{status:'pending'}}
 }});
 registerLegacyQuestionActionRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1',role:'customer',isAdmin:false};}}});
 const workflow=response();await app.handlers.get('POST /admin/set-open-workflow')(request({allowWithoutAdminApproval:true}),workflow);
 assert.equal(workflow.statusCode,403);
 const claim=response();await app.handlers.get('POST /astrologer/claim-question')(request({questionId:'q1'}),claim);
 assert.equal(claim.statusCode,403);
 assert.equal(firestore.writes.length,0);
});

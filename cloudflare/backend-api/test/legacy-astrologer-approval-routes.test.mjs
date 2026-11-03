import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyAstrologerApprovalRoutes } from '../src/legacy-astrologer-approval-routes.mjs';

function harness(){const handlers=new Map();return{handlers,post(path,handler){handlers.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function request(body={}){return{body,get(name){return String(name).toLowerCase()==='authorization'?'Bearer token':'';}};}
function fixture({docs={},queries={}}={}){const writes=[];return{writes,async getDocument(path){return docs[path]||{exists:false,data:null};},async runQuery(options){return queries[options.collectionPath]||[];},async runTransaction(callback){const tx={async getDocument(path){return docs[path]||{exists:false,data:null};},async query(options){return queries[options.collectionPath]||[];},set(path,data,options){writes.push({type:'set',path,data,options});}};return callback(tx);}};}
const admin={async authenticateAuthorization(){return{uid:'admin-1',role:'admin',isAdmin:true};}};

test('Admin approval atomically requires a linked user profile and approves both profile documents',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_astrologers/a1':{exists:true,id:'a1',data:{uid:'u1',status:'pending',name:'Astrologer',publicId:'PUB1'}},
  'smv_users/u1':{exists:true,data:{role:'astrologer'}}
 }});
 registerLegacyAstrologerApprovalRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/approve-astrologer')(request({astrologerId:'a1'}),res);
 assert.equal(res.statusCode,200);
 assert.ok(firestore.writes.some(x=>x.path==='smv_astrologers/a1'&&x.data.status==='approved'));
 assert.ok(firestore.writes.some(x=>x.path==='smv_users/u1'&&x.data.status==='active'));
 assert.ok(firestore.writes.some(x=>x.path==='smv_notifications/astro_approval_u1'));
});

test('Admin approval fails closed if linked user profile is missing; rejects non-admin',async()=>{
 const app=harness(),firestore=fixture({docs:{'smv_astrologers/a1':{exists:true,id:'a1',data:{uid:'u1',status:'pending'}}}});
 registerLegacyAstrologerApprovalRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/approve-astrologer')(request({astrologerId:'a1'}),res);
 assert.equal(res.statusCode,409);assert.equal(firestore.writes.length,0);
 const deniedApp=harness();registerLegacyAstrologerApprovalRoutes({app:deniedApp,firestore,identityService:{async authenticateAuthorization(){return{uid:'cus',role:'customer'};}}});
 const denied=response();await deniedApp.handlers.get('POST /admin/approve-astrologer')(request({astrologerId:'a1'}),denied);
 assert.equal(denied.statusCode,403);
});

test('Admin rejection requires pending application and reason; updates both records atomically',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_astrologers/a1':{exists:true,id:'a1',data:{uid:'u1',status:'pending'}},
  'smv_users/u1':{exists:true,data:{role:'astrologer'}}
 }});
 registerLegacyAstrologerApprovalRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('POST /admin/reject-astrologer')(request({astrologerId:'a1',reason:'Please update documents.'}),res);
 assert.equal(res.statusCode,200);
 assert.ok(firestore.writes.some(x=>x.path==='smv_astrologers/a1'&&x.data.rejectionReason==='Please update documents.'));
 assert.ok(firestore.writes.some(x=>x.path==='smv_users/u1'&&x.data.status==='rejected'));
});

test('Astrologer approval sync cannot create an approval, but reconciles an already approved linked profile',async()=>{
 const app=harness(),firestore=fixture({
  docs:{
   'smv_users/u1':{exists:true,data:{role:'astrologer',publicId:'PUB1'}},
   'smv_astrologer/u1':{exists:true,id:'u1',data:{uid:'u1',status:'approved',pricePerQuestion:300}}
  },
  queries:{smv_astrologers:[{id:'legacy',data:{uid:'u1',status:'approved'}}],smv_astrologer:[]}
 });
 registerLegacyAstrologerApprovalRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'u1',role:'astrologer',isAdmin:false};}}});
 const res=response();await app.handlers.get('POST /astrologer/sync-approval')(request(),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.approved,true);
 assert.ok(firestore.writes.some(x=>x.path==='smv_astrologers/u1'&&x.data.status==='approved'));
});

test('Astrologer sync returns pending when no already-approved record exists and writes nothing',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_users/u1':{exists:true,data:{role:'astrologer',status:'pending'}},
  'smv_astrologers/u1':{exists:true,id:'u1',data:{uid:'u1',status:'pending'}}
 }});
 registerLegacyAstrologerApprovalRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'u1',role:'astrologer'};}}});
 const res=response();await app.handlers.get('POST /astrologer/sync-approval')(request(),res);
 assert.equal(res.body.approved,false);assert.equal(firestore.writes.length,0);
});

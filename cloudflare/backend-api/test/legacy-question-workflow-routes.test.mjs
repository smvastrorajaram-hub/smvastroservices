import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyQuestionWorkflowRoutes } from '../src/legacy-question-workflow-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, post(path, handler) { handlers.set('POST ' + path, handler); } };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}
function request(body) {
  return { body, get(name) { return String(name).toLowerCase()==='authorization'?'Bearer admin':''; } };
}
function fixture({docs={}}={}) {
  const writes=[];
  return {
    writes,
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        update(path,data){writes.push({type:'update',path,data});},
        create(path,data){writes.push({type:'create',path,data});}
      };
      return callback(tx);
    }
  };
}
const identityService={async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}};

test('Admin approve-question requires a verified paid question and approved Astrologer and allocates atomically',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'paid',amount:100}},
   'smv_astrologers/a1':{exists:true,data:{status:'approved',name:'Astrologer A'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/approve-question')(request({questionId:'q1',astrologerId:'a1',commissionPercent:20}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.astrologerCommissionAmount,20);
 assert.equal(res.body.adminCommissionAmount,80);
 assert.equal(firestore.writes.find(x=>x.type==='update').data.commissionStatus,'allocated_pending_answer');
 assert.equal(firestore.writes.filter(x=>x.type==='create').length,2);
});

test('Admin approve-question rejects unpaid question, unapproved Astrologer and repeat allocation',async()=>{
 const cases=[
   {question:{paymentStatus:'pending',status:'pending',amount:100},astro:{status:'approved'},status:409},
   {question:{paymentStatus:'paid',status:'pending',amount:100},astro:{status:'pending'},status:409},
   {question:{paymentStatus:'paid',status:'pending',amount:100,astrologerId:'a2'},astro:{status:'approved'},status:409}
 ];
 for(const item of cases){
   const app=harness(),firestore=fixture({docs:{
     'smv_questions/q1':{exists:true,data:item.question},
     'smv_astrologers/a1':{exists:true,data:item.astro}
   }});
   registerLegacyQuestionWorkflowRoutes({app,firestore,identityService});
   const res=response();
   await app.handlers.get('POST /admin/approve-question')(request({questionId:'q1',astrologerId:'a1',commissionPercent:20}),res);
   assert.equal(res.statusCode,item.status);
   assert.equal(firestore.writes.length,0);
 }
});

test('Admin reallocate refuses credited questions and clears only unsettled answer state',async()=>{
 const creditedApp=harness(),credited=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'admin_approved',adminQuestionApprovedAt:{seconds:1},astrologerId:'old',commissionStatus:'credited',amount:100}},
   'smv_astrologers/new':{exists:true,data:{status:'approved'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app:creditedApp,firestore:credited,identityService});
 const denied=response();
 await creditedApp.handlers.get('POST /admin/reallocate-question')(request({questionId:'q1',astrologerId:'new',commissionPercent:30}),denied);
 assert.equal(denied.statusCode,409);
 assert.equal(credited.writes.length,0);

 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{paymentStatus:'paid',status:'admin_approved',adminQuestionApprovedAt:{seconds:1},astrologerId:'old',commissionStatus:'allocated_pending_answer',amount:100,answer:'Draft'}},
   'smv_astrologers/new':{exists:true,data:{status:'approved',name:'New Astrologer'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/reallocate-question')(request({questionId:'q1',astrologerId:'new',commissionPercent:30}),res);
 assert.equal(res.statusCode,200);
 const update=firestore.writes.find(x=>x.type==='update');
 assert.equal(update.data.answer,'');
 assert.equal(update.data.astrologerId,'new');
 assert.equal(update.data.commissionStatus,'allocated_pending_answer');
});

test('Admin edit-question refuses closed question and writes actor attribution on open one',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{status:'processing'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/edit-question')(request({questionId:'q1',question:'Updated question text'}),res);
 assert.equal(res.statusCode,200);
 assert.equal(firestore.writes[0].data.adminQuestionEditedBy,'admin-1');

 const closedApp=harness(),closed=fixture({docs:{
   'smv_questions/q2':{exists:true,data:{status:'answered'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app:closedApp,firestore:closed,identityService});
 const denied=response();
 await closedApp.handlers.get('POST /admin/edit-question')(request({questionId:'q2',question:'cannot edit'}),denied);
 assert.equal(denied.statusCode,409);
 assert.equal(closed.writes.length,0);
});

test('Admin takeover enforces minimum answer length and retains commission for Admin',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{customerId:'cus-1',status:'processing',answerMinWords:3,amount:100,question:'Question'}}
 }});
 registerLegacyQuestionWorkflowRoutes({app,firestore,identityService});
 const short=response();
 await app.handlers.get('POST /admin/takeover-answer')(request({questionId:'q1',answer:'Too short'}),short);
 assert.equal(short.statusCode,200);
 const update=firestore.writes.find(x=>x.type==='update');
 assert.equal(update.data.answerAuthorType,'admin');
 assert.equal(update.data.commissionStatus,'admin_retained');
 assert.equal(update.data.astrologerCommissionAmount,0);
 assert.equal(firestore.writes.filter(x=>x.type==='create').length,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicAnswerCreditService, registerCustomerAnswerCreditRoute } from '../src/customer-answer-credit-route.mjs';

function fixture({docs={}}={}){
 const writes=[];
 const store=new Map(Object.entries(docs));
 const snapshot=value=>value?{exists:true,data:{...value}}:{exists:false,data:null};
 const firestore={
  writes,store,
  async runTransaction(callback){
   const pending=[];
   const tx={
    async getDocument(path){const value=store.get(path);return snapshot(value);},
    update(path,data){pending.push({type:'update',path,data});},
    create(path,data){pending.push({type:'create',path,data});},
    set(path,data,options){pending.push({type:'set',path,data,options});}
   };
   const result=await callback(tx);
   for(const w of pending){
    writes.push(w);
    if(w.type==='update'||w.type==='set')store.set(w.path,{...(w.options?.merge===false?{}:(store.get(w.path)||{})),...w.data});
    if(w.type==='create'){if(store.has(w.path))throw new Error('already exists');store.set(w.path,{...w.data});}
   }
   return result;
  }
 };
 return firestore;
}
function harness(){const handlers=new Map();return{handlers,post(path,handler){handlers.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function req(body){return{body,get(name){return String(name).toLowerCase()==='authorization'?'Bearer customer':'';}};}
const question={customerId:'cus-1',astrologerId:'astro-1',status:'answered',paymentStatus:'paid',answer:'Your answer is ready.',amount:100,commissionPercent:20,astrologerCommissionAmount:20,adminCommissionAmount:80};

test('Customer answer view credits Astrologer and Admin split exactly once in a transaction',async()=>{
 const firestore=fixture({docs:{'smv_questions/q1':question}});
 const service=createPublicAnswerCreditService({firestore});
 const first=await service.settle('q1',{customerId:'cus-1'});
 assert.equal(first.credited,true);assert.equal(first.astrologerAmount,20);assert.equal(first.adminAmount,80);
 assert.equal(firestore.store.get('smv_questions/q1').commissionStatus,'credited');
 assert.equal(firestore.store.get('smv_payments/SMV-Q-EARN-q1').earningAmount,20);
 const second=await service.settle('q1',{customerId:'cus-1'});
 assert.equal(second.credited,false);
 assert.equal(firestore.writes.filter(x=>x.type==='create'&&x.path==='smv_payments/SMV-Q-EARN-q1').length,1);
 assert.equal(firestore.writes.filter(x=>x.type==='create'&&x.path==='smv_notifications/answer-credit-public-q1').length,1);
});

test('Customer cannot mark another user answer viewed or credit their commission',async()=>{
 const firestore=fixture({docs:{'smv_questions/q1':question}});
 const service=createPublicAnswerCreditService({firestore});
 await assert.rejects(service.settle('q1',{customerId:'other'}),e=>e.httpStatus===403);
 assert.equal(firestore.writes.length,0);
});

test('unpaid, refunded or unreleased answers do not create commission credits',async()=>{
 for(const patch of [{paymentStatus:'pending'},{refundId:'refund-1'},{status:'processing'}]){
  const firestore=fixture({docs:{'smv_questions/q1':{...question,...patch}}});
  const service=createPublicAnswerCreditService({firestore});
  await assert.rejects(service.settle('q1',{customerId:'cus-1'}),e=>e.httpStatus===409);
  assert.equal(firestore.writes.length,0);
 }
});

test('Admin-authored answer is viewable but never credits an Astrologer',async()=>{
 const firestore=fixture({docs:{'smv_questions/q1':{...question,adminAnswered:true,astrologerId:'astro-1'}}});
 const service=createPublicAnswerCreditService({firestore});
 const result=await service.settle('q1',{customerId:'cus-1'});
 assert.equal(result.credited,false);assert.equal(result.already,true);
 assert.equal(firestore.store.get('smv_questions/q1').customerViewStatus,'viewed');
 assert.equal(firestore.writes.some(x=>x.path.startsWith('smv_payments/')),false);
});

test('conflicting pre-existing earning ledger fails closed and does not mark answer viewed',async()=>{
 const firestore=fixture({docs:{
  'smv_questions/q1':question,
  'smv_payments/SMV-Q-EARN-q1':{questionId:'another-question',astrologerId:'astro-1',earningAmount:20}
 }});
 const service=createPublicAnswerCreditService({firestore});
 await assert.rejects(service.settle('q1',{customerId:'cus-1'}),e=>e.code==='ANSWER_CREDIT_LEDGER_CONFLICT');
 assert.equal(firestore.store.get('smv_questions/q1').customerAnswerViewedAt,undefined);
});

test('HTTP route authenticates Customer and settles only owned answer',async()=>{
 const app=harness(),firestore=fixture({docs:{'smv_questions/q1':question}});
 registerCustomerAnswerCreditRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'cus-1',role:'customer'};}}});
 const res=response();await app.handlers.get('POST /customer/mark-answer-viewed')(req({questionId:'q1'}),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.viewed,true);assert.equal(res.body.credited,true);
});

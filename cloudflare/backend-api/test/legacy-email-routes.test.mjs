import test from 'node:test';
import assert from 'node:assert/strict';
import { createResendEmailClient } from '../../shared/backend-platform/resend-email-adapter.mjs';
import { registerLegacyEmailRoutes } from '../src/legacy-email-routes.mjs';

function harness(){const handlers=new Map();return{handlers,post(path,handler){handlers.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function request(body={},token='Bearer token'){return{body,get(name){return String(name).toLowerCase()==='authorization'?token:'';}};}
function fixture({docs={}}={}){const store=new Map(Object.entries(docs)),writes=[];const snap=value=>value?{exists:true,data:{...value}}:{exists:false,data:null};return{store,writes,async getDocument(path){return snap(store.get(path));},async updateDocument(path,data){writes.push({type:'update',path,data});store.set(path,{...(store.get(path)||{}),...data});},async runTransaction(callback){const pending=[];const tx={async getDocument(path){return snap(store.get(path));},set(path,data,options){pending.push({type:'set',path,data,options});},create(path,data){pending.push({type:'create',path,data});}};const result=await callback(tx);for(const w of pending){writes.push(w);if(w.type==='create'&&store.has(w.path))throw new Error('exists');if(w.type==='create'||w.type==='set')store.set(w.path,{...(w.options?.merge===false?{}:(store.get(w.path)||{})),...w.data});}return result;}};}
function fakeEmail(){const sent=[];return{sent,async send(options){sent.push(options);return{id:'email-'+sent.length};}};}

test('Contact query validates public input, stores request and sends one idempotent Admin email',async()=>{
 const app=harness(),firestore=fixture(),emailClient=fakeEmail();
 registerLegacyEmailRoutes({app,firestore,identityService:{async authenticateAuthorization(){throw new Error('not used');}},emailClient,adminEmail:'admin@example.com',randomId:()=> 'contact-1'});
 const res=response();await app.handlers.get('POST /contact-query')(request({name:'Customer',email:'c@example.com',place:'Perambalur',mobile:'9876543210',query:'Need a consultation.'}),res);
 assert.equal(res.statusCode,200);assert.equal(firestore.store.get('contactQueries/contact-1').status,'new');
 assert.equal(emailClient.sent.length,1);assert.equal(emailClient.sent[0].idempotencyKey,'smv-contact-contact-1');
});

test('Contact route rejects invalid email and does not store a contact record',async()=>{
 const app=harness(),firestore=fixture();
 registerLegacyEmailRoutes({app,firestore,identityService:{async authenticateAuthorization(){throw new Error('not used');}},emailClient:fakeEmail(),adminEmail:'admin@example.com'});
 const res=response();await app.handlers.get('POST /contact-query')(request({name:'N',email:'bad',place:'P',mobile:'123',query:'Q'}),res);
 assert.equal(res.statusCode,400);assert.equal(firestore.writes.length,0);
});

test('Question notification enforces actor permissions and sends event-specific recipients',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',astrologerId:'astro-1',customerEmail:'customer@example.com',question:'Question?',answer:'Answer.',status:'answered'},
  'smv_users/astro-1':{email:'astro@example.com'}
 }});
 const emailClient=fakeEmail();
 registerLegacyEmailRoutes({app,firestore,emailClient,adminEmail:'admin@example.com',identityService:{async authenticateAuthorization(){return{uid:'cus-1',role:'customer',isAdmin:false};}}});
 const denied=response();await app.handlers.get('POST /question-notify')(request({questionId:'q1',event:'question_approved'}),denied);
 assert.equal(denied.statusCode,403);assert.equal(emailClient.sent.length,0);
 const allowed=response();await app.handlers.get('POST /question-notify')(request({questionId:'q1',event:'payment_verified'}),allowed);
 assert.equal(allowed.statusCode,200);assert.equal(emailClient.sent.length,1);
 assert.deepEqual(emailClient.sent[0].to,['customer@example.com']);
});

test('Question notification is idempotent and does not send duplicate email for same event',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',customerEmail:'customer@example.com',paymentStatus:'paid',question:'Question?'}
 }});
 const emailClient=fakeEmail();
 registerLegacyEmailRoutes({app,firestore,emailClient,adminEmail:'admin@example.com',identityService:{async authenticateAuthorization(){return{uid:'cus-1',role:'customer'};}}});
 const first=response(),second=response();
 await app.handlers.get('POST /question-notify')(request({questionId:'q1',event:'payment_verified'}),first);
 await app.handlers.get('POST /question-notify')(request({questionId:'q1',event:'payment_verified'}),second);
 assert.equal(first.statusCode,200);assert.equal(second.statusCode,200);assert.equal(second.body.duplicate,true);
 assert.equal(emailClient.sent.length,1);
});

test('Question notifications fail closed when Resend is not configured',async()=>{
 const app=harness(),firestore=fixture();
 registerLegacyEmailRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'cus-1'};}},adminEmail:'admin@example.com'});
 const res=response();await app.handlers.get('POST /question-notify')(request({questionId:'q1',event:'payment_verified'}),res);
 assert.equal(res.statusCode,503);
});

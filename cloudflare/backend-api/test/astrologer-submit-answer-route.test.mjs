import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAstrologerSubmitAnswerRoute } from '../src/astrologer-submit-answer-route.mjs';

function harness(){const handlers=new Map();return{handlers,post(path,handler){handlers.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function request(body){return{body,get(name){return String(name).toLowerCase()==='authorization'?'Bearer token':'';}};}
function fixture({docs={}}={}){const store=new Map(Object.entries(docs)),writes=[];const snap=value=>value?{exists:true,data:{...value}}:{exists:false,data:null};return{store,writes,async getDocument(path){return snap(store.get(path));},async updateDocument(path,data){writes.push({type:'update',path,data});store.set(path,{...(store.get(path)||{}),...data});},async runTransaction(callback){const pending=[];const tx={async getDocument(path){return snap(store.get(path));},update(path,data){pending.push({type:'update',path,data});},set(path,data,options){pending.push({type:'set',path,data,options});},create(path,data){pending.push({type:'create',path,data});}};const result=await callback(tx);for(const x of pending){writes.push(x);if(x.type==='create'){if(store.has(x.path))throw new Error('exists');store.set(x.path,{...x.data});}else{const current={...(store.get(x.path)||{})};for(const [key,value] of Object.entries(x.data||{})){if(value&&value.__smvFirestoreFieldOperation==='delete')delete current[key];else current[key]=value;}store.set(x.path,current);}}return result;}};}
const answer=Array.from({length:150},(_,i)=>'word'+i).join(' ');
function requestData(overrides={}){return{questionId:'q1',answer,...overrides};}

test('Astrologer submits own answer with Auto Allow OFF for Admin review',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',astrologerId:'astro-1',status:'admin_approved',answerMinWords:150,amount:100,question:'Q',paymentStatus:'paid'},
  'smv_settings/workflow':{allowWithoutAdminApproval:false}
 }});
 registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1',email:'astro@example.com'};}}});
 const res=response();await app.handlers.get('POST /submit-answer')(request(requestData()),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.status,'processing');
 assert.equal(firestore.store.get('smv_questions/q1').commissionStatus,'pending_admin_approval');
 assert.equal(firestore.store.get('smv_questions/q1').answerWordCount,150);
 assert.ok(firestore.writes.some(x=>x.path?.startsWith('smv_admin_audit/ANSWER_SUBMITTED_q1_')));
});

test('Auto Allow ON releases answer directly, but prevents editing after customer view or credit',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',astrologerId:'astro-1',status:'admin_approved',answerMinWords:150,amount:100,question:'Q',paymentStatus:'paid'},
  'smv_settings/workflow':{allowWithoutAdminApproval:true}
 }});
 registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const res=response();await app.handlers.get('POST /submit-answer')(request(requestData()),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.status,'answered');
 assert.equal(firestore.store.get('smv_questions/q1').commissionStatus,'pending_customer_view');
 const blockedApp=harness(),blocked=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',astrologerId:'astro-1',status:'answered',answerMinWords:150,answer:'Existing',customerAnswerViewedAt:{seconds:1},commissionStatus:'pending_customer_view'},
  'smv_settings/workflow':{allowWithoutAdminApproval:true}
 }});
 registerAstrologerSubmitAnswerRoute({app:blockedApp,firestore:blocked,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const denied=response();await blockedApp.handlers.get('POST /submit-answer')(request(requestData()),denied);
 assert.equal(denied.statusCode,409);assert.equal(blocked.writes.length,0);
});

test('Paid Private Chat answer is submitted for Admin approval before Customer visibility',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/smvqt-123456':{
   customerId:'cus-1',astrologerId:'astro-1',privateChat:true,questionType:'private_chat',
   status:'private_chat_assigned',paymentStatus:'paid',answerMinWords:150,
   amount:499,astrologerCommissionAmount:374.25,commissionPercent:75,
   adminCommissionAmount:124.75,adminCommissionPercent:25,
   customerPaymentId:'smvpy-123456',question:'Private question'
  },
  'smv_settings/workflow':{allowWithoutAdminApproval:false}
 }});
 registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1',email:'astro@example.com'};}}});
 const res=response();await app.handlers.get('POST /submit-answer')(request({
  questionId:'smvqt-123456',answer
 }),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.status,'processing');
 const saved=firestore.store.get('smv_questions/smvqt-123456');
 assert.equal(saved.status,'processing');
 assert.equal(saved.astrologerAnswerStatus,'submitted');
 assert.equal(saved.commissionStatus,'pending_admin_approval');
 assert.equal(saved.answerAvailableAt,undefined);
 assert.equal(saved.commissionPercent,75);
 assert.equal(saved.adminCommissionPercent,25);
 assert.equal(saved.astrologerCommissionAmount,374.25);
 assert.equal(saved.adminCommissionAmount,124.75);
 assert.equal(firestore.store.get('smv_notifications/cus-1_answer_submitted_smvqt-123456').type,'astrologer_answer_submitted');
});

test('Answer submission rejects wrong owner, uneditable status and short answer',async()=>{
 const cases=[
  {question:{customerId:'c',astrologerId:'other',status:'processing',answerMinWords:150,amount:100},workflow:{allowWithoutAdminApproval:false},status:403},
  {question:{customerId:'c',astrologerId:'astro-1',status:'answered',answerMinWords:150,amount:100},workflow:{allowWithoutAdminApproval:false},status:409},
  {question:{customerId:'c',astrologerId:'astro-1',status:'admin_approved',answerMinWords:150,amount:100},workflow:{allowWithoutAdminApproval:false},status:400}
 ];
 for(const item of cases){
  const app=harness(),firestore=fixture({docs:{'smv_questions/q1':item.question,'smv_settings/workflow':item.workflow}});
  registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
  const body=item.status===400?{questionId:'q1',answer:'too short'}:requestData();
  const res=response();await app.handlers.get('POST /submit-answer')(request(body),res);
  assert.equal(res.statusCode,item.status);assert.equal(firestore.writes.length,0);
 }
});

test('Missing email configuration does not block saving answer; notifications remain durable',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/q1':{customerId:'cus-1',astrologerId:'astro-1',status:'admin_approved',answerMinWords:150,amount:100,question:'Q',paymentStatus:'paid'},
  'smv_settings/workflow':{allowWithoutAdminApproval:false}
 }});
 registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const res=response();await app.handlers.get('POST /submit-answer')(request(requestData()),res);
 assert.equal(res.statusCode,200);assert.equal(firestore.store.get('smv_notifications/cus-1_answer_submitted_q1').type,'astrologer_answer_submitted');
});


test('Private Chat Admin OFF releases an approved Astrologer answer directly to the Customer',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_questions/smvqt-654321':{
   customerId:'cus-1',astrologerId:'astro-1',privateChat:true,questionType:'private_chat',
   assignmentMode:'open_to_all',status:'private_chat_assigned',paymentStatus:'paid',
   answerMinWords:150,amount:499,commissionPercent:75,adminCommissionPercent:25,
   astrologerCommissionAmount:374.25,adminCommissionAmount:124.75,question:'Private question'
  },
  'smv_settings/workflow':{allowWithoutAdminApproval:false}
 }});
 registerAstrologerSubmitAnswerRoute({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1',email:'astro@example.com'};}}});
 const res=response();await app.handlers.get('POST /submit-answer')(request({questionId:'smvqt-654321',answer}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.status,'answered');
 const saved=firestore.store.get('smv_questions/smvqt-654321');
 assert.equal(saved.status,'answered');
 assert.equal(saved.astrologerAnswerStatus,'approved');
 assert.equal(saved.commissionStatus,'pending_customer_view');
 assert.ok(saved.answerAvailableAt);
 assert.equal(firestore.store.get('smv_notifications/cus-1_answer_submitted_smvqt-654321').type,'answer_ready');
});

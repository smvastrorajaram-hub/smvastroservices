import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPrivateChatRoutes } from '../src/private-chat-routes.mjs';

function appHarness(){
  const handlers=new Map();
  return {
    handlers,
    get(path,handler){handlers.set('GET '+path,handler);},
    post(path,handler){handlers.set('POST '+path,handler);}
  };
}
function response(){
  return {
    statusCode:200,headers:{},body:null,
    status(code){this.statusCode=code;return this;},
    set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},
    json(body){this.body=body;return this;}
  };
}
function request({authorization='Bearer customer-token',body={},params={}}={}){
  return {body,params,get(name){return String(name).toLowerCase()==='authorization'?authorization:'';}};
}
function firestoreFixture(initial={}){
  const documents=new Map(Object.entries(initial).map(([path,value])=>[path,structuredClone(value)]));
  const snapshot=path=>{
    const data=documents.get(path);
    return data===undefined
      ?{exists:false,id:path.split('/').pop(),path,data:null}
      :{exists:true,id:path.split('/').pop(),path,data:structuredClone(data)};
  };
  return {
    documents,
    async getDocument(path){return snapshot(path);},
    async setDocument(path,data,options={}){
      const previous=documents.get(path)||{};
      documents.set(path,options.merge?{...previous,...structuredClone(data)}:structuredClone(data));
      return {success:true};
    },
    async runQuery({collectionPath,filters=[],limit=1000}){
      const prefix=collectionPath+'/';
      const rows=[];
      for(const [path,data] of documents.entries()){
        if(!path.startsWith(prefix)||path.slice(prefix.length).includes('/'))continue;
        if(filters.some(filter=>data?.[filter.field]!==filter.value))continue;
        rows.push({id:path.slice(prefix.length),path,data:structuredClone(data)});
      }
      return rows.slice(0,limit);
    },
    async runTransaction(callback){
      const draft=new Map([...documents.entries()].map(([path,data])=>[path,structuredClone(data)]));
      const tx={
        async getDocument(path){
          const data=draft.get(path);
          return data===undefined?{exists:false,id:path.split('/').pop(),path,data:null}:{exists:true,id:path.split('/').pop(),path,data:structuredClone(data)};
        },
        create(path,data){
          if(draft.has(path))throw Object.assign(new Error('Document already exists.'),{code:'FIRESTORE_ALREADY_EXISTS',httpStatus:409});
          draft.set(path,structuredClone(data));
        },
        set(path,data,options={}){
          const previous=draft.get(path)||{};
          draft.set(path,options.merge?{...previous,...structuredClone(data)}:structuredClone(data));
        },
        update(path,data){
          if(!draft.has(path))throw Object.assign(new Error('Document not found.'),{code:'FIRESTORE_NOT_FOUND',httpStatus:404});
          draft.set(path,{...draft.get(path),...structuredClone(data)});
        }
      };
      const result=await callback(tx);
      documents.clear();
      for(const [path,data] of draft.entries())documents.set(path,data);
      return result;
    }
  };
}
function setup(){
  const app=appHarness();
  const firestore=firestoreFixture({
    'smv_settings/privateChat':{enabled:true,price:499,astrologerCommissionPercent:75,adminCommissionPercent:25,assignmentMode:'admin_assigned'},
    'smv_settings/commission':{astroPercent:20},
    'smv_settings/answer':{minimumWords:40},
    'smv_astrologers/astro-1':{status:'approved',name:'Test Astrologer'},
    'smv_astrologers/astro-2':{status:'approved',name:'Other Astrologer'},
    'smv_users/astro-1':{role:'astrologer'}
  });
  const orders=new Map();
  const calls=[];
  let nextOrder=0;
  const razorpay={
    async createOrder(input){
      calls.push(['createOrder',input]);
      const order={id:'order_test_'+(++nextOrder),amount:input.amountPaise,currency:input.currency,status:'created'};
      orders.set(order.id,order);return order;
    },
    async fetchOrder(id){calls.push(['fetchOrder',id]);return orders.get(id)||null;},
    async verifyPaymentSignature(input){calls.push(['verifyPaymentSignature',input]);return true;}
  };
  const identityService={
    async authenticateAuthorization(header){
      if(header==='Bearer admin-token')return {uid:'admin-1',role:'admin',isAdmin:true};
      if(header==='Bearer astrologer-token')return {uid:'astro-1',role:'astrologer'};
      if(header==='Bearer other-astrologer-token')return {uid:'astro-2',role:'astrologer'};
      if(header==='Bearer other-customer-token')return {uid:'customer-2',role:'customer'};
      if(header==='Bearer customer-token')return {uid:'customer-1',role:'customer',email:'customer@example.test'};
      throw Object.assign(new Error('Authentication required.'),{code:'AUTH_REQUIRED',httpStatus:401});
    }
  };
  const paymentDetails=async(...args)=>{calls.push(['paymentDetails',...args]);return {status:'captured'};};
  const recordQuestionPayment=async({questionId,orderId,paymentId})=>{
    calls.push(['recordQuestionPayment',{questionId,orderId,paymentId}]);
    const settings=firestore.documents.get('smv_settings/privateChat')||{};
    const direct=settings.assignmentMode==='direct_selected';
    const status=direct?'private_chat_assigned':'private_chat_pending_admin';
    const path='smv_questions/'+questionId;
    await firestore.setDocument(path,{
      paymentStatus:'paid',status,
      allocationStatus:direct?'assigned_to_astrologer':'awaiting_admin',
      astrologerId:direct?'astro-1':'',astrologerName:direct?'Test Astrologer':'',
      assignmentMode:settings.assignmentMode||'admin_assigned',adminApprovalBypassed:direct,
      customerPaymentId:'smvpy-123456',razorpayPaymentId:paymentId
    },{merge:true});
    return {customerPaymentId:'smvpy-123456',amount:499,status,astrologerId:direct?'astro-1':null};
  };
  const refundCalls=[];
  const refundPrivateChatQuestion=async input=>{
    refundCalls.push(input);
    return {questionId:input.questionId,refundId:'rfnd_private_fixture',refundStatus:input.sync?'processed':'pending'};
  };
  const cryptoImpl={
    counter:0,
    getRandomValues(bytes){bytes[0]=++this.counter;return bytes;}
  };
  registerPrivateChatRoutes({
    app,firestore,identityService,razorpay,razorpayKeyId:'rzp_test_fixture',
    paymentDetails,recordQuestionPayment,refundPrivateChatQuestion,cryptoImpl,now:()=>Date.UTC(2026,10,7,6,0,0)
  });
  return {app,firestore,razorpay,orders,calls,refundCalls};
}

test('Admin controls a single Private Chat price and public settings expose only its enabled state and price',async()=>{
  const state=setup();
  const save=response();
  await state.app.handlers.get('POST /admin/private-chat/settings')(
    request({authorization:'Bearer admin-token',body:{enabled:true,price:650.5,minimumAnswerWords:80,astrologerCommissionPercent:75,adminCommissionPercent:25}}),save
  );
  assert.equal(save.statusCode,200);
  assert.equal(save.body.price,650.5);
  assert.equal(save.body.minimumAnswerWords,80);
  const read=response();
  await state.app.handlers.get('GET /private-chat/settings')(request(),read);
  assert.deepEqual(
    {enabled:read.body.enabled,price:read.body.price,minimumAnswerWords:read.body.minimumAnswerWords,turnaround:read.body.turnaround},
    {enabled:true,price:650.5,minimumAnswerWords:80,turnaround:'24–48 hours'}
  );
  assert.equal(read.body.assignmentMode,undefined);
  const adminRead=response();
  await state.app.handlers.get('GET /admin/private-chat/settings')(request({authorization:'Bearer admin-token'}),adminRead);
  assert.equal(adminRead.body.commissionConfigured,true);
  assert.equal(adminRead.body.astrologerCommissionPercent,75);
  assert.equal(adminRead.body.adminCommissionPercent,25);
  assert.equal(read.body.astrologerCommissionPercent,undefined);
  const forbidden=response();
  await state.app.handlers.get('POST /admin/private-chat/settings')(request({body:{enabled:true,price:300}}),forbidden);
  assert.equal(forbidden.statusCode,403);
});

test('Admin cannot enable Private Chat without a dedicated 100 percent commission split',async()=>{
  const state=setup();
  await state.firestore.setDocument('smv_settings/privateChat',{enabled:false,price:499,astrologerCommissionPercent:null,adminCommissionPercent:null},{merge:true});
  const save=response();
  await state.app.handlers.get('POST /admin/private-chat/settings')(request({authorization:'Bearer admin-token',body:{enabled:true,price:499,minimumAnswerWords:80}}),save);
  assert.equal(save.statusCode,400);
  assert.equal(save.body.code,'PRIVATE_CHAT_COMMISSION_REQUIRED');
  const publicSettings=response();
  await state.app.handlers.get('GET /private-chat/settings')(request(),publicSettings);
  assert.equal(publicSettings.body.enabled,false);
});

test('create-order trusts the Admin price, creates a six-digit smvqt ID and reuses its order on retry',async()=>{
  const state=setup();
  const created=response();
  await state.app.handlers.get('POST /private-chat/create-order')(
    request({body:{
      astrologerId:'astro-1',customerName:'Customer One',
      birthDetails:{birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'},
      question:'Please explain my career prospects.',requestId:'request-unique-1',amount:1
    }}),created
  );
  assert.equal(created.statusCode,200);
  assert.match(created.body.questionId,/^smvqt-\d{6}$/);
  assert.equal(created.body.amount,49900);
  assert.equal(state.calls.filter(call=>call[0]==='createOrder').length,1);
  const id=created.body.questionId;
  const question=state.firestore.documents.get('smv_questions/'+id);
  assert.equal(question.amount,499);
  assert.equal(question.privateChat,true);
  assert.equal(question.questionType,'private_chat');
  assert.equal(question.astrologerId,'');
  assert.equal(question.requestedAstrologerId,'astro-1');
  assert.equal(question.assignmentMode,'admin_assigned');
  assert.equal(question.answerMinWords,40);
  assert.equal(question.commissionPercent,75);
  assert.equal(question.adminCommissionPercent,25);
  assert.equal(question.astrologerCommissionAmount,374.25);
  assert.equal(question.adminCommissionAmount,124.75);
  assert.equal(question.paymentStatus,'order_created');
  const retry=response();
  await state.app.handlers.get('POST /private-chat/create-order')(
    request({body:{
      astrologerId:'astro-1',customerName:'Customer One',
      birthDetails:{birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'},
      question:'Please explain my career prospects.',requestId:'request-unique-1'
    }}),retry
  );
  assert.equal(retry.body.questionId,id);
  assert.equal(retry.body.orderId,created.body.orderId);
  assert.equal(state.calls.filter(call=>call[0]==='createOrder').length,1);
});

test('payment verification writes the private payment ID and assigns the paid question to its selected Astrologer',async()=>{
  const state=setup();
  const created=response();
  await state.app.handlers.get('POST /private-chat/create-order')(
    request({body:{
      astrologerId:'astro-1',customerName:'Customer One',
      birthDetails:{birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'},
      question:'Please explain my career prospects.',requestId:'request-unique-2'
    }}),created
  );
  const questionId=created.body.questionId;
  const verified=response();
  await state.app.handlers.get('POST /private-chat/verify-payment')(
    request({body:{
      questionId,razorpay_order_id:created.body.orderId,
      razorpay_payment_id:'pay_test_123',razorpay_signature:'valid-signature'
    }}),verified
  );
  assert.equal(verified.statusCode,200);
  assert.equal(verified.body.verified,true);
  assert.equal(verified.body.customerPaymentId,'smvpy-123456');
  const question=state.firestore.documents.get('smv_questions/'+questionId);
  assert.equal(question.paymentStatus,'paid');
  assert.equal(question.status,'private_chat_pending_admin');
  assert.equal(question.allocationStatus,'awaiting_admin');
  assert.equal(question.astrologerId,'');
  assert.equal(question.customerPaymentId,'smvpy-123456');
  assert.equal(question.razorpayPaymentId,'pay_test_123');
  assert.equal(state.calls.filter(call=>call[0]==='paymentDetails').length,1);
  assert.equal(state.calls.filter(call=>call[0]==='recordQuestionPayment').length,1);
});

test('Admin OFF payment verification assigns only the Customer-selected approved Astrologer and bypasses both approvals',async()=>{
  const state=setup();
  await state.firestore.setDocument('smv_settings/privateChat',{assignmentMode:'direct_selected'},{merge:true});
  const created=response();
  await state.app.handlers.get('POST /private-chat/create-order')(
    request({body:{
      astrologerId:'astro-1',customerName:'Customer One',
      birthDetails:{birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'},
      question:'Direct selected question',requestId:'request-direct-1'
    }}),created
  );
  const questionId=created.body.questionId;
  const verified=response();
  await state.app.handlers.get('POST /private-chat/verify-payment')(
    request({body:{questionId,razorpay_order_id:created.body.orderId,razorpay_payment_id:'pay_direct_1',razorpay_signature:'valid-signature'}}),verified
  );
  assert.equal(verified.statusCode,200);
  const saved=state.firestore.documents.get('smv_questions/'+questionId);
  assert.equal(saved.status,'private_chat_assigned');
  assert.equal(saved.astrologerId,'astro-1');
  assert.equal(saved.assignmentMode,'direct_selected');
  assert.equal(saved.adminApprovalBypassed,true);
});

test('Customer, assigned Astrologer and Admin reads are separated by Private Chat type and identity',async()=>{
  const state=setup();
  const id='smvqt-765432';
  state.firestore.documents.set('smv_questions/'+id,{
    id,questionId:id,privateChat:true,questionType:'private_chat',
    customerId:'customer-1',customerName:'Customer One',question:'My question',
    astrologerId:'astro-1',astrologerName:'Test Astrologer',
    amount:499,paymentStatus:'paid',status:'private_chat_assigned',
    customerPaymentId:'smvpy-765432'
  });
  state.firestore.documents.set('smv_questions/public-q1',{
    questionId:'public-q1',privateChat:false,questionType:'public_question',
    customerId:'customer-1',question:'Public question',paymentStatus:'paid'
  });
  const customer=response();
  await state.app.handlers.get('GET /customer/private-chat/questions')(
    request(),customer
  );
  assert.equal(customer.body.questions.length,1);
  assert.equal(customer.body.questions[0].questionId,id);
  const otherCustomer=response();
  await state.app.handlers.get('GET /customer/private-chat/questions')(
    request({authorization:'Bearer other-customer-token'}),otherCustomer
  );
  assert.equal(otherCustomer.body.questions.length,0);
  const astrologer=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer astrologer-token'}),astrologer
  );
  assert.equal(astrologer.body.questions.length,1);
  assert.equal(astrologer.body.questions[0].questionId,id);
  const admin=response();
  await state.app.handlers.get('GET /admin/private-chat/questions')(
    request({authorization:'Bearer admin-token'}),admin
  );
  assert.equal(admin.body.questions.length,1);
});

test('Admin approves a paid Private Chat question and allocates the specified approved Astrologer',async()=>{
  const state=setup();
  state.firestore.documents.set('smv_questions/smvqt-111111',{
    questionId:'smvqt-111111',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_pending_admin',allocationStatus:'awaiting_admin',requestedAstrologerId:'astro-1',
    customerId:'customer-1',question:'Question',amount:499
  });
  const result=response();
  await state.app.handlers.get('POST /admin/private-chat/approve-question')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-111111'}}),result
  );
  assert.equal(result.statusCode,200);
  const saved=state.firestore.documents.get('smv_questions/smvqt-111111');
  assert.equal(saved.astrologerId,'astro-1');
  assert.equal(saved.astrologerName,'Test Astrologer');
  assert.equal(saved.status,'private_chat_assigned');
  assert.equal(saved.allocationStatus,'assigned_to_astrologer');
  assert.equal(saved.commissionStatus,'allocated_pending_answer');
});

test('Admin OFF sends Private Chat only to the Astrologer selected by the Customer',async()=>{
  const state=setup();
  await state.firestore.setDocument('smv_settings/privateChat',{assignmentMode:'direct_selected'},{merge:true});
  state.firestore.documents.set('smv_questions/smvqt-222222',{
    questionId:'smvqt-222222',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',
    assignmentMode:'direct_selected',adminApprovalBypassed:true,
    customerId:'customer-1',requestedAstrologerId:'astro-1',requestedAstrologerName:'Test Astrologer',
    astrologerId:'astro-1',astrologerName:'Test Astrologer',question:'Selected question',amount:499,
    commissionPercent:75,adminCommissionPercent:25,astrologerCommissionAmount:374.25,adminCommissionAmount:124.75
  });
  const selected=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer astrologer-token'}),selected
  );
  assert.equal(selected.body.questions.length,1);
  assert.equal(selected.body.questions[0].questionId,'smvqt-222222');
  assert.equal(selected.body.questions[0].canClaim,undefined);
  const other=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer other-astrologer-token'}),other
  );
  assert.equal(other.body.questions.length,0);
  assert.equal(state.app.handlers.has('POST /astrologer/private-chat/claim'),false);
});

test('Legacy open-to-all Private Chat records are held from every Astrologer until Admin restores the original selected Astrologer',async()=>{
  const state=setup();
  state.firestore.documents.set('smv_settings/privateChat',{assignmentMode:'direct_selected'});
  state.firestore.documents.set('razorpay_orders/order_legacy_private',{
    questionId:'smvqt-222223',requestedAstrologerId:'astro-1',requestedAstrologerName:'Test Astrologer'
  });
  state.firestore.documents.set('smv_questions/smvqt-222223',{
    questionId:'smvqt-222223',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_available_to_astrologers',allocationStatus:'available_to_astrologers',
    assignmentMode:'open_to_all',razorpayOrderId:'order_legacy_private',astrologerId:'',
    customerId:'customer-1',question:'Legacy question',amount:499
  });
  const hidden=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer astrologer-token'}),hidden
  );
  assert.equal(hidden.body.questions.length,0);
  const admin=response();
  await state.app.handlers.get('GET /admin/private-chat/questions')(
    request({authorization:'Bearer admin-token'}),admin
  );
  assert.equal(admin.body.questions[0].requestedAstrologerId,'astro-1');
  const assigned=response();
  await state.app.handlers.get('POST /admin/private-chat/approve-question')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-222223'}}),assigned
  );
  assert.equal(assigned.statusCode,200);
  const saved=state.firestore.documents.get('smv_questions/smvqt-222223');
  assert.equal(saved.astrologerId,'astro-1');
  assert.equal(saved.assignmentMode,'direct_selected');
  assert.equal(saved.adminApprovalBypassed,true);
  const other=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer other-astrologer-token'}),other
  );
  assert.equal(other.body.questions.length,0);
});

test('Rejected or refund-processing Private Chat questions disappear from every Astrologer queue',async()=>{
  const state=setup();
  state.firestore.documents.set('smv_questions/smvqt-rejected-1',{
    questionId:'smvqt-rejected-1',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'question_rejected',allocationStatus:'rejected_by_admin',astrologerId:'astro-1',
    refundRequestedAt:{seconds:1794040000},refundStatus:'pending'
  });
  state.firestore.documents.set('smv_questions/smvqt-refunding-1',{
    questionId:'smvqt-refunding-1',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',astrologerId:'astro-1',
    refundRequestedAt:{seconds:1794040000},refundStatus:'processing'
  });
  state.firestore.documents.set('smv_questions/smvqt-status-only-refund-1',{
    questionId:'smvqt-status-only-refund-1',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',astrologerId:'astro-1',
    refundStatus:'pending'
  });
  const result=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer astrologer-token'}),result
  );
  assert.equal(result.statusCode,200);
  assert.equal(result.body.questions.length,0);
});

test('Admin can reallocate an unanswered Private Chat only after 24 hours to another approved Astrologer',async()=>{
  const state=setup();
  const assignedAt=Date.UTC(2026,10,6,4,0,0);
  state.firestore.documents.set('smv_questions/smvqt-reallocate-1',{
    questionId:'smvqt-reallocate-1',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',
    customerId:'customer-1',requestedAstrologerId:'astro-1',requestedAstrologerName:'Test Astrologer',
    astrologerId:'astro-1',astrologerName:'Test Astrologer',astrologerAssignedAt:{seconds:assignedAt/1000},
    question:'Please answer this private question',amount:499,answerMinWords:15,
    commissionPercent:75,adminCommissionPercent:25
  });
  const tooEarly=response();
  await state.app.handlers.get('POST /admin/private-chat/reallocate')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-reallocate-1',astrologerId:'astro-2'}}),tooEarly
  );
  assert.equal(tooEarly.statusCode,200);
  assert.equal(tooEarly.body.astrologerId,'astro-2');
  const saved=state.firestore.documents.get('smv_questions/smvqt-reallocate-1');
  assert.equal(saved.astrologerId,'astro-2');
  assert.equal(saved.previousAstrologerId,'astro-1');
  assert.equal(saved.requestedAstrologerId,'astro-1');
  assert.ok(saved.astrologerReassignedAt);
  assert.equal(saved.astrologerReassignmentCount,1);
  const oldAstrologer=response(),newAstrologer=response();
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer astrologer-token'}),oldAstrologer
  );
  await state.app.handlers.get('GET /astrologer/private-chat/questions')(
    request({authorization:'Bearer other-astrologer-token'}),newAstrologer
  );
  assert.equal(oldAstrologer.body.questions.length,0);
  assert.equal(newAstrologer.body.questions.length,1);
  assert.equal(newAstrologer.body.questions[0].astrologerId,'astro-2');
});

test('Admin cannot reallocate before 24 hours or after an answer has been submitted',async()=>{
  const state=setup();
  const now=Date.UTC(2026,10,7,6,0,0);
  state.firestore.documents.set('smv_questions/smvqt-reallocate-early',{
    questionId:'smvqt-reallocate-early',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',astrologerId:'astro-1',astrologerAssignedAt:{seconds:(now-23*60*60*1000)/1000}
  });
  state.firestore.documents.set('smv_questions/smvqt-reallocate-answered',{
    questionId:'smvqt-reallocate-answered',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'private_chat_assigned',astrologerId:'astro-1',astrologerAssignedAt:{seconds:(now-30*60*60*1000)/1000},
    answerSubmittedAt:{seconds:(now-60*60*1000)/1000},answer:'An answer has been submitted'
  });
  const early=response(),answered=response();
  await state.app.handlers.get('POST /admin/private-chat/reallocate')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-reallocate-early',astrologerId:'astro-2'}}),early
  );
  await state.app.handlers.get('POST /admin/private-chat/reallocate')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-reallocate-answered',astrologerId:'astro-2'}}),answered
  );
  assert.equal(early.statusCode,409);
  assert.equal(answered.statusCode,409);
  assert.equal(state.firestore.documents.get('smv_questions/smvqt-reallocate-early').astrologerId,'astro-1');
  assert.equal(state.firestore.documents.get('smv_questions/smvqt-reallocate-answered').astrologerId,'astro-1');
});

test('Admin answer approval releases an answer to Customer only after acceptance',async()=>{
  const state=setup();
  state.firestore.documents.set('smv_questions/smvqt-333333',{
    questionId:'smvqt-333333',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'processing',astrologerId:'astro-1',astrologerName:'Test Astrologer',
    customerId:'customer-1',question:'Private question',answer:'Long answer',answerWordCount:40,
    amount:499,commissionPercent:75,adminCommissionPercent:25,astrologerCommissionAmount:374.25,adminCommissionAmount:124.75
  });
  const before=response();
  await state.app.handlers.get('GET /customer/private-chat/questions')(request(),before);
  assert.equal(before.body.questions[0].answer,undefined);
  const approved=response();
  await state.app.handlers.get('POST /admin/private-chat/approve-answer')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-333333'}}),approved
  );
  assert.equal(approved.statusCode,200);
  const after=response();
  await state.app.handlers.get('GET /customer/private-chat/questions')(request(),after);
  assert.equal(after.body.questions[0].answer,'Long answer');
  assert.equal(after.body.questions[0].status,'answered');
  assert.equal(state.firestore.documents.get('smv_questions/smvqt-333333').commissionStatus,'pending_customer_view');
});

test('Admin rejects submitted answer back to Astrologer for revision and keeps it hidden from Customer',async()=>{
  const state=setup();
  state.firestore.documents.set('smv_questions/smvqt-444444',{
    questionId:'smvqt-444444',privateChat:true,questionType:'private_chat',paymentStatus:'paid',
    status:'processing',astrologerId:'astro-1',customerId:'customer-1',question:'Question',answer:'Needs changes',
    amount:499,commissionStatus:'pending_admin_approval'
  });
  const rejected=response();
  await state.app.handlers.get('POST /admin/private-chat/reject-answer')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-444444',reason:'Please clarify the timing.'}}),rejected
  );
  assert.equal(rejected.statusCode,200);
  const saved=state.firestore.documents.get('smv_questions/smvqt-444444');
  assert.equal(saved.status,'private_chat_assigned');
  assert.equal(saved.astrologerAnswerStatus,'revision_required');
  const customer=response();
  await state.app.handlers.get('GET /customer/private-chat/questions')(request(),customer);
  assert.equal(customer.body.questions[0].answer,undefined);
});

test('Private Chat rejection uses the shared Admin-controlled Razorpay refund service',async()=>{
  const state=setup();
  const rejected=response();
  await state.app.handlers.get('POST /admin/private-chat/reject-question')(
    request({authorization:'Bearer admin-token',body:{questionId:'smvqt-555555',reason:'Question is not eligible.'}}),rejected
  );
  assert.equal(rejected.statusCode,200);
  assert.deepEqual(state.refundCalls[0],{
    questionId:'smvqt-555555',reason:'Question is not eligible.',actorUid:'admin-1',retry:false
  });
});

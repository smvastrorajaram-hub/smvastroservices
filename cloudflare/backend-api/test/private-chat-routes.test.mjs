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
    'smv_settings/privateChat':{enabled:true,price:499},
    'smv_settings/commission':{astroPercent:20},
    'smv_settings/answer':{minimumWords:40},
    'smv_astrologers/astro-1':{status:'approved',name:'Test Astrologer'},
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
      if(header==='Bearer other-customer-token')return {uid:'customer-2',role:'customer'};
      if(header==='Bearer customer-token')return {uid:'customer-1',role:'customer',email:'customer@example.test'};
      throw Object.assign(new Error('Authentication required.'),{code:'AUTH_REQUIRED',httpStatus:401});
    }
  };
  const paymentDetails=async(...args)=>{calls.push(['paymentDetails',...args]);return {status:'captured'};};
  const recordQuestionPayment=async({questionId,orderId,paymentId})=>{
    calls.push(['recordQuestionPayment',{questionId,orderId,paymentId}]);
    const path='smv_questions/'+questionId;
    await firestore.setDocument(path,{
      paymentStatus:'paid',status:'private_chat_assigned',
      allocationStatus:'assigned_to_astrologer',
      customerPaymentId:'smvpy-123456',razorpayPaymentId:paymentId
    },{merge:true});
    return {customerPaymentId:'smvpy-123456',amount:499,status:'private_chat_assigned'};
  };
  const cryptoImpl={
    counter:0,
    getRandomValues(bytes){bytes[0]=++this.counter;return bytes;}
  };
  registerPrivateChatRoutes({
    app,firestore,identityService,razorpay,razorpayKeyId:'rzp_test_fixture',
    paymentDetails,recordQuestionPayment,cryptoImpl,now:()=>Date.UTC(2026,10,7,6,0,0)
  });
  return {app,firestore,razorpay,orders,calls};
}

test('Admin controls a single Private Chat price and public settings expose only its enabled state and price',async()=>{
  const state=setup();
  const save=response();
  await state.app.handlers.get('POST /admin/private-chat/settings')(
    request({authorization:'Bearer admin-token',body:{enabled:true,price:650.5}}),save
  );
  assert.equal(save.statusCode,200);
  assert.equal(save.body.price,650.5);
  const read=response();
  await state.app.handlers.get('GET /private-chat/settings')(request(),read);
  assert.deepEqual(
    {enabled:read.body.enabled,price:read.body.price,turnaround:read.body.turnaround},
    {enabled:true,price:650.5,turnaround:'24–48 hours'}
  );
  const forbidden=response();
  await state.app.handlers.get('POST /admin/private-chat/settings')(
    request({body:{enabled:true,price:300}}),forbidden
  );
  assert.equal(forbidden.statusCode,403);
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
  assert.equal(state.razorpay.calls.filter(call=>call[0]==='createOrder').length,1);
  const id=created.body.questionId;
  const question=state.firestore.documents.get('smv_questions/'+id);
  assert.equal(question.amount,499);
  assert.equal(question.privateChat,true);
  assert.equal(question.questionType,'private_chat');
  assert.equal(question.astrologerId,'astro-1');
  assert.equal(question.answerMinWords,40);
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
  assert.equal(state.razorpay.calls.filter(call=>call[0]==='createOrder').length,1);
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
  assert.equal(question.status,'private_chat_assigned');
  assert.equal(question.allocationStatus,'assigned_to_astrologer');
  assert.equal(question.customerPaymentId,'smvpy-123456');
  assert.equal(question.razorpayPaymentId,'pay_test_123');
  assert.equal(state.calls.filter(call=>call[0]==='paymentDetails').length,1);
  assert.equal(state.calls.filter(call=>call[0]==='recordQuestionPayment').length,1);
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

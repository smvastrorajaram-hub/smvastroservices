import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWalletRechargeRoutes } from '../src/wallet-recharge-routes.mjs';

function appHarness() {
  const handlers = new Map();
  return { handlers, post(path, handler) { handlers.set(path, handler); } };
}
function responseHarness() {
  return {
    statusCode:200, headers:{}, body:null, ended:false,
    status(code){this.statusCode=code;return this;},
    set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},
    json(body){this.body=body;return this;},
    send(body){this.body=body;this.ended=true;return this;}
  };
}
function request(body, {headers={},authorization='Bearer user-token'}={}) {
  return {
    body,
    get(name){if(name.toLowerCase()==='authorization')return authorization;return headers[name]||headers[name.toLowerCase()]||'';}
  };
}
function baseDeps(overrides={}) {
  const calls=[];
  const walletAdapter={
    async createRechargeIntent(input){calls.push(['intent',input]);return {success:true,acquired:true,rechargeId:'a'.repeat(64),amountPaise:5000};},
    async attachRechargeOrder(input){calls.push(['attach',input]);return {success:true};},
    async markRechargeOrderFailed(input){calls.push(['failed',input]);return {success:true};},
    async getRechargeForOwner(input){calls.push(['getRecharge',input]);return {rechargeId:'a'.repeat(64),customerUid:'customer-1',amountPaise:5000,status:'order_created',orderId:'order_1'};},
    async getWallet(){return {availableBalancePaise:5000,bonusMinutesBalance:3};},
    async finalizeRecharge(input){calls.push(['finalize',input]);return {success:true,alreadyProcessed:false,amountPaise:5000,availableBalancePaise:5000,bonusMinutesCredited:3,bonusMinutesBalance:3};},
    async getRechargeByOrderId(input){calls.push(['byOrder',input]);return {rechargeId:'a'.repeat(64),customerUid:'customer-1',amountPaise:5000,status:'order_created',orderId:'order_1'};},
    async recordWebhookEvent(input){calls.push(['recordWebhook',input]);return {success:true,alreadyProcessed:false,inProgress:false,claimToken:'claim-token-1'};},
    async completeWebhookEvent(eventKey,claimToken){calls.push(['completeWebhook',{eventKey,claimToken}]);return {success:true,changed:1};},
    async releaseWebhookEvent(eventKey,claimToken,reason){calls.push(['releaseWebhook',{eventKey,claimToken,reason}]);return {success:true,changed:1};},
    async markRechargePaymentFailed(input){calls.push(['paymentFailed',input]);return {success:true};}
  };
  const razorpay={
    async createOrder(input){calls.push(['createOrder',input]);return {id:'order_1',amount:5000,currency:'INR'};},
    async verifyPaymentSignature(input){calls.push(['verifySignature',input]);return true;},
    async verifyWebhookSignature(){calls.push(['verifyWebhookSignature']);return true;},
    async fetchPayment(id){calls.push(['fetchPayment',id]);return {id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'authorized'};},
    async capturePayment(id,amount,currency){calls.push(['capturePayment',{id,amount,currency}]);return {id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'};}
  };
  const dependencies={
    app:appHarness(),
    identityService:{async authenticateAuthorization(){return {uid:'customer-1',role:'customer'};}},
    walletAdapter,razorpay,razorpayKeyId:'rzp_test_key',razorpayWebhookSecret:'webhook-secret',
    isReady:async()=>true,
    cryptoImpl:{randomUUID:()=> 'random-key-12345678'},
    ...overrides
  };
  registerWalletRechargeRoutes(dependencies);
  return { ...dependencies, calls };
}

test('Wallet recharge route constructor enforces the selected Razorpay key mode', () => {
  assert.throws(
    () => baseDeps({ razorpayKeyId: 'rzp_live_fixture', razorpayMode: 'test' }),
    /matching Test\/Live Razorpay key mode/
  );
  assert.throws(
    () => baseDeps({ razorpayKeyId: 'rzp_test_fixture', razorpayMode: 'live' }),
    /matching Test\/Live Razorpay key mode/
  );
  const live = baseDeps({ razorpayKeyId: 'rzp_live_fixture', razorpayMode: 'live' });
  assert.equal(live.app.handlers.has('/wallet/recharge/webhook'), true);
});

test('create-order validates paise amount and reuses deterministic recharge intent', async () => {
  const state=baseDeps();
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/create-order')(request({amount:'50.00',idempotencyKey:'request-key-123'}),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body.orderId,'order_1');
  assert.equal(response.body.amount,5000);
  assert.equal(response.body.keyId,'rzp_test_key');
  assert.equal(state.calls[0][1].amountPaise,5000);
  assert.equal(state.calls.find(call=>call[0]==='attach')[1].orderId,'order_1');
});


test('create-order recovers an orphaned Razorpay order after a stale recharge retry', async () => {
  const state=baseDeps();
  state.walletAdapter.createRechargeIntent=async()=>({
    success:true,acquired:true,retrying:true,rechargeId:'a'.repeat(64),amountPaise:5000
  });
  let lookupReceipt='';
  state.razorpay.findOrderByReceipt=async(receipt,options)=>{
    lookupReceipt=receipt;
    assert.equal(options.amountPaise,5000);
    return {id:'order_recovered',amount:5000,currency:'INR',receipt};
  };
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/create-order')(request({amount:'50.00',idempotencyKey:'request-key-123'}),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body.orderId,'order_recovered');
  assert.equal(response.body.recoveredOrder,true);
  assert.equal(state.calls.some(call=>call[0]==='createOrder'),false);
  assert.equal(state.calls.find(call=>call[0]==='attach')[1].orderId,'order_recovered');
  assert.ok(lookupReceipt.startsWith('SMV_WR_'));
});

test('create-order rejects invalid amounts and does not create external orders', async () => {
  const state=baseDeps();
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/create-order')(request({amount:'0.50'}),response);
  assert.equal(response.statusCode,400);
  assert.equal(response.body.code,'WALLET_RECHARGE_AMOUNT_INVALID');
  assert.equal(state.calls.length,0);
});

test('create-order fails closed while D1 recharge schema is not ready', async () => {
  const state=baseDeps({isReady:async()=>false});
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/create-order')(request({amount:'50.00'}),response);
  assert.equal(response.statusCode,503);
  assert.equal(response.body.code,'WALLET_SCHEMA_NOT_READY');
  assert.equal(state.calls.length,0);
});

test('create-order reuses an existing Razorpay order for the same idempotency key', async () => {
  const state=baseDeps();
  state.walletAdapter.createRechargeIntent=async()=>({success:true,acquired:false,orderId:'order_existing',rechargeId:'r'.repeat(64)});
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/create-order')(request({amount:'50.00',idempotencyKey:'request-key-123'}),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body.reusedOrder,true);
  assert.equal(response.body.orderId,'order_existing');
  assert.equal(state.calls.some(call=>call[0]==='createOrder'),false);
});

test('verify validates signature, captures authorized payment and finalizes cash/bonus credit', async () => {
  const state=baseDeps();
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/verify')(request({
    rechargeId:'a'.repeat(64),razorpay_order_id:'order_1',razorpay_payment_id:'pay_1',razorpay_signature:'sig'
  }),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body.verified,true);
  assert.equal(response.body.availableBalance,50);
  assert.equal(response.body.bonusMinutesCredited,3);
  assert.equal(state.calls.some(call=>call[0]==='capturePayment'),true);
  assert.equal(state.calls.some(call=>call[0]==='finalize'),true);
});

test('verify fails when the user token is not an authenticated Customer', async () => {
  const state=baseDeps({identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/verify')(request({
    rechargeId:'a'.repeat(64),razorpay_order_id:'order_1',razorpay_payment_id:'pay_1',razorpay_signature:'sig'
  }),response);
  assert.equal(response.statusCode,403);
  assert.equal(response.body.code,'WALLET_CUSTOMER_REQUIRED');
});

test('webhook deduplication prefers the provider event ID header', async () => {
  const state=baseDeps();
  state.razorpay.fetchPayment=async id=>({id,order_id:'order_1',amount:5000,currency:'INR',status:'captured'});
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.captured',
    payload:{payment:{entity:{id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(
    request(raw,{headers:{'X-Razorpay-Signature':'valid','X-Razorpay-Event-Id':'evt_razorpay_123'}}),
    response
  );
  assert.equal(response.statusCode,200);
  const recorded=state.calls.find(call=>call[0]==='recordWebhook');
  assert.equal(recorded[1].eventKey,'razorpay_evt_razorpay_123');
});

test('webhook verifies raw body signature and atomically finalizes only Wallet order events', async () => {
  const state=baseDeps();
  state.razorpay.fetchPayment=async id=>{
    state.calls.push(['fetchPayment',id]);
    return {id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'};
  };
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.captured',
    payload:{payment:{entity:{id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(request(raw,{headers:{'X-Razorpay-Signature':'valid'}}),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body,'OK');
  assert.equal(state.calls.some(call=>call[0]==='finalize'),true);
  assert.equal(state.calls.some(call=>call[0]==='completeWebhook'),true);
});

test('payment.failed webhook records a failed attempt while keeping a pending recharge retryable', async () => {
  const state=baseDeps();
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.failed',
    payload:{payment:{entity:{id:'pay_failed_attempt',order_id:'order_1',amount:5000,currency:'INR',status:'failed'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(request(raw,{headers:{'X-Razorpay-Signature':'valid'}}),response);
  assert.equal(response.statusCode,200);
  assert.equal(state.calls.some(call=>call[0]==='paymentFailed'),true);
  assert.equal(state.calls.some(call=>call[0]==='completeWebhook'),true);
});

test('late payment.failed webhook cannot downgrade an already paid Wallet recharge', async () => {
  const state=baseDeps();
  state.walletAdapter.getRechargeByOrderId=async input=>{
    state.calls.push(['byOrder',input]);
    return {rechargeId:'a'.repeat(64),customerUid:'customer-1',amountPaise:5000,status:'paid',orderId:'order_1',paymentId:'pay_success'};
  };
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.failed',
    payload:{payment:{entity:{id:'pay_late_failed',order_id:'order_1',amount:5000,currency:'INR',status:'failed'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(request(raw,{headers:{'X-Razorpay-Signature':'valid'}}),response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body,'OK');
  assert.equal(state.calls.some(call=>call[0]==='paymentFailed'),false);
  assert.equal(state.calls.some(call=>call[0]==='completeWebhook'),true);
});

test('webhook rejects an invalid signature before reading order or changing Wallet', async () => {
  const state=baseDeps({razorpay:{...baseDeps().razorpay,async verifyWebhookSignature(){return false;}}});
  const raw=new TextEncoder().encode('{"event":"payment.captured"}');
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(request(raw,{headers:{'X-Razorpay-Signature':'bad'}}),response);
  assert.equal(response.statusCode,401);
  assert.equal(state.calls.length,0);
});

test('webhook acknowledges non-Wallet orders without mutating the Wallet ledger', async () => {
  const state=baseDeps();
  state.walletAdapter.getRechargeByOrderId=async()=>null;
  const raw=new TextEncoder().encode('{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_other","order_id":"order_other"}}}}');
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(request(raw,{headers:{'X-Razorpay-Signature':'valid'}}),response);
  assert.equal(response.statusCode,200);
  assert.equal(state.calls.some(call=>call[0]==='finalize'),false);
  assert.equal(state.calls.some(call=>call[0]==='completeWebhook'),true);
});


test('webhook duplicate delivery while the event lease is active asks the provider to retry', async () => {
  const state=baseDeps();
  state.walletAdapter.recordWebhookEvent=async input=>{
    state.calls.push(['recordWebhook',input]);
    return {success:true,alreadyProcessed:false,inProgress:true,eventKey:input.eventKey,leaseUntilMs:999999};
  };
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.captured',
    payload:{payment:{entity:{id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(
    request(raw,{headers:{'X-Razorpay-Signature':'valid','X-Razorpay-Event-Id':'evt_busy_1'}}),
    response
  );
  assert.equal(response.statusCode,503);
  assert.equal(response.headers['Retry-After'],'5');
  assert.equal(response.body.code,'RAZORPAY_WEBHOOK_IN_PROGRESS');
  assert.equal(state.calls.some(call=>call[0]==='byOrder'),false);
  assert.equal(state.calls.some(call=>call[0]==='finalize'),false);
});

test('payment.authorized webhook captures then credits only after provider reports captured', async () => {
  const state=baseDeps();
  let fetchCount=0;
  state.razorpay.fetchPayment=async id=>{
    fetchCount++;
    state.calls.push(['fetchPayment',id]);
    return {id,order_id:'order_1',amount:5000,currency:'INR',status:fetchCount===1?'authorized':'captured'};
  };
  state.razorpay.capturePayment=async(id,amount,currency)=>{
    state.calls.push(['capturePayment',{id,amount,currency}]);
    throw new Error('simulated network timeout');
  };
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.authorized',
    payload:{payment:{entity:{id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'authorized'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(
    request(raw,{headers:{'X-Razorpay-Signature':'valid','X-Razorpay-Event-Id':'evt_authorized_recovery'}}),
    response
  );
  assert.equal(response.statusCode,200);
  assert.equal(fetchCount,2);
  assert.equal(state.calls.some(call=>call[0]==='capturePayment'),true);
  assert.equal(state.calls.some(call=>call[0]==='finalize'),true);
  assert.equal(state.calls.some(call=>call[0]==='completeWebhook'),true);
});

test('webhook processing failure releases the owned event claim for safe retry', async () => {
  const state=baseDeps();
  state.razorpay.fetchPayment=async()=>{throw new Error('temporary Razorpay network failure');};
  const raw=new TextEncoder().encode(JSON.stringify({
    event:'payment.captured',
    payload:{payment:{entity:{id:'pay_1',order_id:'order_1',amount:5000,currency:'INR',status:'captured'}}}
  }));
  const response=responseHarness();
  await state.app.handlers.get('/wallet/recharge/webhook')(
    request(raw,{headers:{'X-Razorpay-Signature':'valid','X-Razorpay-Event-Id':'evt_retry_after_failure'}}),
    response
  );
  assert.equal(response.statusCode,500);
  assert.equal(state.calls.some(call=>call[0]==='finalize'),false);
  assert.equal(state.calls.some(call=>call[0]==='releaseWebhook'),true);
});

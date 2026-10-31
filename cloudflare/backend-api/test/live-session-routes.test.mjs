import test from 'node:test';
import assert from 'node:assert/strict';
import { registerD1LiveSessionRoutes } from '../src/live-session-routes.mjs';

function appHarness() {
  const handlers=new Map();
  return {
    handlers,
    get(path,handler){handlers.set('GET '+path,handler);},
    post(path,handler){handlers.set('POST '+path,handler);}
  };
}
function responseHarness() {
  return {
    statusCode:200,headers:{},body:null,ended:false,
    status(code){this.statusCode=code;return this;},
    set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},
    json(body){this.body=body;return this;},
    flushHeaders(){},
    write(){return true;},
    end(){this.ended=true;}
  };
}
function req(body={},role='customer',id='session-1',token='token') {
  return {
    body,params:{id,withdrawalDocId:id},query:{},headers:{},
    get(name){return name.toLowerCase()==='authorization'?'Bearer '+token:'';},
    on(){}
  };
}
function fixture(overrides={}) {
  const calls=[];
  const app=appHarness();
  const stub={
    async fetch(url,options={}) {
      const body=options.body?JSON.parse(options.body):{};
      calls.push({url:String(url),body,method:options.method||'GET'});
      if(overrides.doFailure&&String(url).includes('/schedule')) return new Response(JSON.stringify({ok:false}),{status:503});
      return new Response(JSON.stringify({ok:true,deadlines:[],cancelled:1}),{status:200,headers:{'Content-Type':'application/json'}});
    }
  };
  const namespace={idFromName:name=>String(name),get:()=>stub};
  const identityService={
    async authenticateAuthorization(header) {
      if(header!=='Bearer token') throw Object.assign(new Error('Missing auth'),{httpStatus:401,code:'AUTH_REQUIRED'});
      return overrides.user||{uid:'customer-1',role:overrides.role||'customer',isAdmin:overrides.role==='admin'};
    }
  };
  const liveService={
    async getPricing(){return {callRatePaise:1000,chatRatePaise:1200,maxConcurrentSessions:1};},
    async createRequest(input){calls.push({service:'createRequest',input});return overrides.createResult||{
      success:true,kind:'session',session:{
        id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',mode:'call',
        state:'ringing',createdAt:'2026-10-31T10:00:00.000Z',minutes:5
      }
    };},
    async listSessions(){return overrides.sessions||[];},
    async setConnection(input){calls.push({service:'setConnection',input});return {
      success:true,sessionId:input.sessionId,uid:input.uid,connected:input.connected,
      generation:2,deadlineAtMs:input.connected?0:Date.parse('2026-10-31T10:00:20Z')
    };},
    async endSession(input){calls.push({service:'endSession',input});return {success:true,session:{id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',state:'ended'}};},
    async rejectSession(input){calls.push({service:'rejectSession',input});return {success:true,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:input.astrologerUid,state:'ended'}};},
    async acceptSession(input){calls.push({service:'acceptSession',input});return {success:true,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:input.astrologerUid,state:'preparing',preparationUntil:'2026-10-31T10:03:00Z'}};},
    async readySession(input){calls.push({service:'readySession',input});return {success:true,started:false,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:'astro-1',state:'connecting',mode:'call',connectingAt:'2026-10-31T10:00:00Z',minutes:5}};},
    async sendMessage(input){return {success:true,message:{id:'msg-1',sessionId:input.sessionId,senderUid:input.senderUid,text:input.text,createdAt:'2026-10-31T10:00:00Z'},recipientUid:'astro-1'};},
    async signal(input){return {success:true,signalId:'sig-1',recipientUid:'astro-1'};},
    async getCommission(){return {astroPercent:20,adminPercent:80};},
    async saveSetting(){return {astroPercent:20,adminPercent:80,callRatePaise:1000,chatRatePaise:1200,maxConcurrentSessions:1};}
  };
  const withdrawalService={
    async getEarningsDashboard(uid){return {success:true,totalEarnings:500,ledger:[],withdrawals:[]};},
    async createRequest(input){calls.push({service:'createWithdrawal',input});return {success:true,withdrawalId:'SMV-WD-1',amount:300};},
    async listAdminWithdrawals(){return [{id:'withdraw-1',status:'pending'}];},
    async getPrivatePayout(id){return {withdrawal:{id},payout:{accountNumber:'1234'},source:'withdrawal_snapshot'};},
    async markProcessing(input){calls.push({service:'markProcessing',input});return {success:true};},
    async rejectWithdrawal(input){calls.push({service:'rejectWithdrawal',input});return {success:true};},
    async markPaid(input){calls.push({service:'markPaid',input});return {success:true,paymentId:'SMV-PMT-1',withdrawal:{withdrawalId:'SMV-WD-1',amount:300}};}
  };
  registerD1LiveSessionRoutes({
    app,identityService,liveService,withdrawalService,
    env:{LIVE_SESSION_COORDINATOR:namespace,LIVE_USER_EVENT_HUB:namespace},
    routesEnabled:overrides.routesEnabled??true,
    environment:overrides.environment||'staging',
    sourceProjectId:overrides.sourceProjectId||'smv-astro-staging',
    isReady:overrides.isReady|| (async()=>true)
  });
  return {app,calls,liveService,withdrawalService};
}

test('Live routes fail closed when the flag is disabled, environment is production or schema is missing',async()=>{
  for(const opts of [{routesEnabled:false},{environment:'production'},{sourceProjectId:'smv-astro-production'},{isReady:async()=>false}]) {
    const f=fixture(opts),res=responseHarness();
    await f.app.handlers.get('GET /live/pricing')(req(),res);
    assert.equal(res.statusCode,503);
    assert.equal(res.body.success,false);
  }
});

test('Customer can create a Live request and a durable ring timer is scheduled',async()=>{
  const f=fixture(),res=responseHarness();
  await f.app.handlers.get('POST /live/requests')(req({
    astrologerId:'astro-1',mode:'call',minutes:5,requestId:'request-0001',
    customerName:'Customer',birthDetails:{birthDate:'2000-01-01',birthTime:'10:00',birthPlace:'Madurai'}
  }),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.kind,'session');
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='ring_timeout'));
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/publish')&&x.body.type==='live.session.request'));
});

test('Offline booking response schedules its seven-day expiry instead of a ringing timer',async()=>{
  const f=fixture({createResult:{success:true,kind:'booking',booking:{
    id:'booking-1',customerUid:'customer-1',astrologerUid:'astro-1',status:'pending',
    expiresAt:'2026-11-07T10:00:00.000Z'
  }}});
  const res=responseHarness();
  await f.app.handlers.get('POST /live/requests')(req({astrologerId:'astro-1',mode:'chat',minutes:5,requestId:'request-0002',customerName:'Customer',birthDetails:{}}),res);
  assert.equal(res.statusCode,200);
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='booking_expiry'));
  assert.ok(!f.calls.some(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='ring_timeout'));
});

test('Live disconnect status persists a generation-scoped grace deadline',async()=>{
  const f=fixture(),res=responseHarness();
  await f.app.handlers.post('POST /live/sessions/:id/connection')(req({connected:false}),res);
  assert.equal(res.statusCode,200);
  assert.ok(f.calls.some(x=>x.service==='setConnection'&&x.input.connected===false));
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/connection')&&x.body.generation===2));
});

test('Customer cannot read Admin withdrawals or private payout snapshots',async()=>{
  const f=fixture();
  for(const path of ['GET /admin/withdrawals-data','GET /admin/withdrawal-payout/:withdrawalDocId']) {
    const res=responseHarness();
    await f.app.handlers.get(path)(req(),res);
    assert.equal(res.statusCode,403);
  }
});

test('Admin withdrawal actions are routed through the D1 withdrawal service',async()=>{
  const f=fixture({role:'admin',user:{uid:'admin-1',role:'admin',isAdmin:true}});
  const actions=[
    ['POST /admin/withdrawal-mark-processing','markProcessing'],
    ['POST /admin/withdrawal-reject','rejectWithdrawal'],
    ['POST /admin/withdrawal-mark-paid','markPaid']
  ];
  for(const [path,method] of actions) {
    const res=responseHarness();
    await f.app.handlers.post(path)(req({withdrawalDocId:'withdraw-1'},'admin'),res);
    assert.equal(res.statusCode,200,path);
    assert.ok(f.calls.some(x=>x.service===method),method);
  }
});

test('Astrologer earnings and withdrawal requests require the Astrologer role',async()=>{
  const f=fixture(),earnings=responseHarness();
  await f.app.handlers.get('GET /astrologer/earnings')(req(),earnings);
  assert.equal(earnings.statusCode,403);

  const f2=fixture({role:'astrologer',user:{uid:'astro-1',role:'astrologer'}});
  const withdrawal=responseHarness();
  await f2.app.handlers.post('POST /astrologer/withdrawal-request')(req({amount:300},'astrologer'),withdrawal);
  assert.equal(withdrawal.statusCode,200);
  assert.equal(f2.calls.find(x=>x.service==='createWithdrawal').input.amountPaise,30000);
});

test('Live accept route enforces Astrologer identity and books a preparation timer',async()=>{
  const f=fixture({role:'astrologer',user:{uid:'astro-1',role:'astrologer'}});
  const res=responseHarness();
  await f.app.handlers.post('POST /live/sessions/:id/accept')(req({},'astrologer'),res);
  assert.equal(res.statusCode,200);
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='preparation_timeout'));
});

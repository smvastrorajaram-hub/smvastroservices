import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    async cancelBooking(input){calls.push({service:'cancelBooking',input});return {success:true,booking:{id:input.bookingId,customerUid:input.customerUid,astrologerUid:'astro-1',status:'cancelled'}};},
    async rejectBooking(input){calls.push({service:'rejectBooking',input});return {success:true,booking:{id:input.bookingId,customerUid:'customer-1',astrologerUid:input.astrologerUid,status:'rejected'}};},
    async acceptBooking(input){calls.push({service:'acceptBooking',input});return {success:true,session:{id:input.bookingId,customerUid:'customer-1',astrologerUid:input.astrologerUid,mode:'chat',state:'preparing',preparationUntil:'2026-10-31T10:02:15Z'}};},
    async listSessions(){return overrides.sessions||[];},
    async listSessionStatus(input){calls.push({service:'listSessionStatus',input});return overrides.statusSessions||[];},
    async getSessionForParticipant(input){calls.push({service:'getSessionForParticipant',input});return overrides.session||{id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',mode:'chat',state:'ended'};},
    async setConnection(input){calls.push({service:'setConnection',input});return {
      success:true,sessionId:input.sessionId,uid:input.uid,connected:input.connected,
      generation:2,deadlineAtMs:input.connected?0:Date.parse('2026-10-31T10:00:20Z')
    };},
    async endSession(input){calls.push({service:'endSession',input});return {success:true,session:{id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',state:'ended'}};},
    async rejectSession(input){calls.push({service:'rejectSession',input});return {success:true,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:input.astrologerUid,state:'ended'}};},
    async acceptSession(input){calls.push({service:'acceptSession',input});return {success:true,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:input.astrologerUid,state:'preparing',preparationUntil:'2026-10-31T10:02:15Z'}};},
    async readySession(input){calls.push({service:'readySession',input});return {success:true,started:false,session:{id:input.sessionId,customerUid:'customer-1',astrologerUid:'astro-1',state:'connecting',mode:'call',connectingAt:'2026-10-31T10:00:00Z',minutes:5}};},
    async sendMessage(input){if(overrides.messageError)throw overrides.messageError;return {success:true,message:{id:'msg-1',sessionId:input.sessionId,senderUid:input.senderUid,text:input.text,createdAt:'2026-10-31T10:00:00Z'},recipientUid:'astro-1'};},
    async signal(input){return {success:true,signalId:'sig-1',recipientUid:'astro-1'};},
    async getCommission(){return overrides.commission||{astroPercent:20,adminPercent:80};},
    async saveSetting(id,payload,uid){calls.push({service:'saveSetting',id,payload,uid});return {...payload,updatedBy:uid,updatedAtMs:123};}
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
    firestore:overrides.firestore || {async runQuery(){return[];}},
    fcmSender:overrides.fcmSender || null,
    env:{
      LIVE_SESSION_COORDINATOR:namespace,
      LIVE_USER_EVENT_HUB:namespace,
      SMV_BACKEND_CLOUDFLARE_ACTIVE:overrides.backendActive===true?'true':'false'
    },
    routesEnabled:overrides.routesEnabled??true,
    environment:overrides.environment||'staging',
    sourceProjectId:overrides.sourceProjectId||'smv-astro-staging',
    isReady:overrides.isReady|| (async()=>true)
  });
  return {app,calls,liveService,withdrawalService};
}

test('Live routes fail closed when disabled, the Firebase project is mismatched or schema is missing',async()=>{
  for(const opts of [
    {routesEnabled:false},
    {sourceProjectId:'smv-astro'},
    {environment:'staging',sourceProjectId:'smv-astro'},
    {isReady:async()=>false}
  ]) {
    const f=fixture(opts),res=responseHarness();
    await f.app.handlers.get('GET /live/pricing')(req(),res);
    assert.equal(res.statusCode,503);
    assert.equal(res.body.success,false);
  }
});

test('Production Live routes accept only Firebase Project 1 after backend activation',async()=>{
  const allowed=fixture({
    environment:'production',sourceProjectId:'smv-astro',backendActive:true
  });
  const res=responseHarness();
  await allowed.app.handlers.get('GET /live/pricing')(req(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.success,true);

  for(const opts of [
    {environment:'production',sourceProjectId:'smv-astro-staging',backendActive:true},
    {environment:'production',sourceProjectId:'project-5',backendActive:true},
    {environment:'production',sourceProjectId:'smv-astro',backendActive:false}
  ]) {
    const blocked=fixture(opts),response=responseHarness();
    await blocked.app.handlers.get('GET /live/pricing')(req(),response);
    assert.equal(response.statusCode,503);
    assert.equal(response.body.code,'LIVE_ROUTES_DISABLED');
  }
});

test('Customer can create a Live request and a durable ring timer is scheduled',async()=>{
  const f=fixture(),res=responseHarness();
  await f.app.handlers.get('POST /live/requests')(req({
    astrologerId:'astro-1',mode:'call',minutes:5,requestId:'request-0001',
    customerName:'Customer',birthDetails:{birthDate:'2000-01-01',birthTime:'10:00',birthPlace:'Madurai',birthGender:'Female'}
  }),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.kind,'session');
  assert.equal(f.calls.find(x=>x.service==='createRequest').input.birthDetails.birthGender,'Female');
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

test('Customer Live-booking cancellation publishes the updated state to both participants',async()=>{
  const f=fixture(),res=responseHarness();
  await f.app.handlers.get('POST /live/bookings/:id/cancel')(req({},'customer','booking-cancel-1'),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.booking.status,'cancelled');
  assert.ok(f.calls.some(x=>x.service==='cancelBooking'&&x.input.bookingId==='booking-cancel-1'));
  const recipients=f.calls.filter(x=>String(x.url||'').includes('/publish')).map(x=>x.body.targetUid).sort();
  assert.deepEqual(recipients,['astro-1','customer-1']);
  assert.ok(f.calls.filter(x=>String(x.url||'').includes('/publish')).every(x=>x.body.type==='live.booking.updated'));
});

test('Live disconnect status persists a generation-scoped grace deadline',async()=>{
  const f=fixture(),res=responseHarness();
  await f.app.handlers.get('POST /live/sessions/:id/connection')(req({connected:false}),res);
  assert.equal(res.statusCode,200);
  assert.ok(f.calls.some(x=>x.service==='setConnection'&&x.input.connected===false));
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/connection')&&x.body.generation===2));
});


test('Astrologer rejection publishes terminal status to both participants and stops Android ringing',async()=>{
  const token='r'.repeat(64),sent=[];
  const f=fixture({
    user:{uid:'astro-1',role:'astrologer'},
    firestore:{async runQuery(){return [{data:{uid:'astro-1',platform:'native-android',token}}];}},
    fcmSender:{async send(_token,payload){sent.push(payload);return 'projects/smv-astro/messages/stop-1';}}
  });
  const res=responseHarness();
  await f.app.handlers.get('POST /live/sessions/:id/reject')(req({},'astrologer','session-1'),res);
  assert.equal(res.statusCode,200);
  const events=f.calls.filter(x=>String(x.url||'').includes('/publish'));
  assert.deepEqual(events.map(x=>x.body.targetUid).sort(),['astro-1','customer-1']);
  assert.ok(events.every(x=>x.body.type==='live.session.ended'));
  assert.equal(sent.length,1);
  assert.equal(sent[0].data.type,'stop_ringing');
  assert.equal(sent[0].data.sessionId,'session-1');
  assert.equal(sent[0].dataOnly,true);
});

test('Either participant ending a Live session broadcasts the terminal state to both sides',async()=>{
  for(const user of [{uid:'customer-1',role:'customer'},{uid:'astro-1',role:'astrologer'}]){
    const token='s'.repeat(64),sent=[];
    const f=fixture({
      user,
      firestore:{async runQuery(){return [{data:{uid:'astro-1',platform:'native-android',token}}];}},
      fcmSender:{async send(_token,payload){sent.push(payload);return 'projects/smv-astro/messages/stop-2';}}
    });
    const res=responseHarness();
    await f.app.handlers.get('POST /live/sessions/:id/end')(req({reason:'participant_ended'},user.role,'session-1'),res);
    assert.equal(res.statusCode,200,user.role);
    const events=f.calls.filter(x=>String(x.url||'').includes('/publish'));
    assert.deepEqual(events.map(x=>x.body.targetUid).sort(),['astro-1','customer-1']);
    assert.ok(events.every(x=>x.body.type==='live.session.ended'));
    assert.equal(sent.length,1);
    assert.equal(sent[0].data.type,'stop_ringing');
  }
});

test('Astrologer accepting or rejecting a booking stops its matching Android ringtone',async()=>{
  for(const action of ['accept','reject']){
    const token='b'.repeat(64),sent=[];
    const f=fixture({
      user:{uid:'astro-1',role:'astrologer'},
      firestore:{async runQuery(){return [{data:{uid:'astro-1',platform:'native-android',token}}];}},
      fcmSender:{async send(_token,payload){sent.push(payload);return 'projects/smv-astro/messages/stop-booking';}}
    });
    const res=responseHarness();
    await f.app.handlers.get('POST /live/bookings/:id/'+action)(req({},'astrologer','booking-1'),res);
    assert.equal(res.statusCode,200,action);
    assert.equal(sent.length,1,action);
    assert.equal(sent[0].data.type,'stop_ringing',action);
    assert.equal(sent[0].data.bookingId,'booking-1',action);
    assert.equal(sent[0].dataOnly,true,action);
  }
});

test('Live SSE remains open after the HTTP request body completes and closes with the response',async()=>{
  const source=await readFile(new URL('../src/live-session-routes.mjs',import.meta.url),'utf8');
  const start=source.indexOf('async function streamUserEvents(req,res,user)');
  const end=source.indexOf("\n  app.get('/astrologer/earnings'",start);
  assert.ok(start>=0&&end>start,'Live SSE stream implementation exists');
  const handler=source.slice(start,end);
  assert.ok(handler.includes("res.on('close',stop);"),'SSE cleanup follows the response lifecycle');
  assert.ok(handler.includes("res.on('error',stop);"),'response errors cancel the event reader');
  assert.ok(handler.includes("req.on('aborted',stop);"),'aborted requests cancel the event reader');
  assert.equal(handler.includes("req.on('close'"),false,'normal request completion must not terminate the long-lived SSE stream');
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
    await f.app.handlers.get(path)(req({withdrawalDocId:'withdraw-1'},'admin'),res);
    assert.equal(res.statusCode,200,path);
    assert.ok(f.calls.some(x=>x.service===method),method);
  }
});

test('Expired Live Chat message fallback publishes the committed ended state to both participants',async()=>{
  const ended={id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',mode:'chat',state:'ended',minutes:1};
  const f=fixture({
    messageError:Object.assign(new Error('The Live Chat duration has ended.'),{code:'LIVE_SESSION_ENDED',httpStatus:409}),
    sessions:[ended]
  });
  const res=responseHarness();
  await f.app.handlers.get('POST /live/sessions/:id/messages')(req({text:'hello'}),res);
  assert.equal(res.statusCode,409);
  const events=f.calls.filter(call=>String(call.url||'').includes('live-user-hub.internal/publish')&&call.body?.type==='live.session.ended');
  assert.equal(events.length,2,'Both Customer and Astrologer receive the terminal session event.');
  assert.deepEqual(events.map(call=>call.body.data.session.state),['ended','ended']);
  assert.ok(f.calls.some(call=>String(call.url||'').includes('/cancel-deadline')),'Stale deadlines are cancelled after expiry reconciliation.');
});

test('Admin commission GET requires the Admin role and reads the D1 commission setting',async()=>{
  const denied=fixture(),deniedResponse=responseHarness();
  await denied.app.handlers.get('GET /admin/live/commission')(req(),deniedResponse);
  assert.equal(deniedResponse.statusCode,403);

  const f=fixture({
    role:'admin',
    user:{uid:'admin-commission-1',role:'admin',isAdmin:true},
    commission:{astroPercent:25,adminPercent:75}
  });
  const res=responseHarness();
  await f.app.handlers.get('GET /admin/live/commission')(req({},'admin'),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.deepEqual(res.body,{success:true,astroPercent:25,adminPercent:75});
});

test('Admin commission POST validates percentages and writes the D1 domain setting',async()=>{
  const f=fixture({role:'admin',user:{uid:'admin-commission-1',role:'admin',isAdmin:true}});
  const valid=responseHarness();
  await f.app.handlers.get('POST /admin/live/commission')(req({astroPercent:30,adminPercent:70},'admin'),valid);
  assert.equal(valid.statusCode,200);
  assert.equal(valid.body.success,true);
  assert.deepEqual(f.calls.find(x=>x.service==='saveSetting'),{
    service:'saveSetting',id:'commission',payload:{astroPercent:30,adminPercent:70},uid:'admin-commission-1'
  });

  const invalid=responseHarness();
  await f.app.handlers.get('POST /admin/live/commission')(req({astroPercent:30,adminPercent:60},'admin'),invalid);
  assert.equal(invalid.statusCode,400);
  assert.equal(f.calls.filter(x=>x.service==='saveSetting').length,1);
});

test('Astrologer earnings and withdrawal requests require the Astrologer role',async()=>{
  const f=fixture(),earnings=responseHarness();
  await f.app.handlers.get('GET /astrologer/earnings')(req(),earnings);
  assert.equal(earnings.statusCode,403);

  const f2=fixture({role:'astrologer',user:{uid:'astro-1',role:'astrologer'}});
  const withdrawal=responseHarness();
  await f2.app.handlers.get('POST /astrologer/withdrawal-request')(req({amount:300},'astrologer'),withdrawal);
  assert.equal(withdrawal.statusCode,200);
  assert.equal(f2.calls.find(x=>x.service==='createWithdrawal').input.amountPaise,30000);
});

test('Live accept route enforces Astrologer identity and books a preparation timer',async()=>{
  const f=fixture({role:'astrologer',user:{uid:'astro-1',role:'astrologer'}});
  const res=responseHarness();
  await f.app.handlers.get('POST /live/sessions/:id/accept')(req({},'astrologer'),res);
  assert.equal(res.statusCode,200);
  assert.ok(f.calls.some(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='preparation_timeout'));
  const scheduled=f.calls.find(x=>String(x.url||'').includes('/schedule')&&x.body.deadlines[0].type==='preparation_timeout');
  assert.equal(scheduled.body.deadlines[0].atMs,Date.parse('2026-10-31T10:02:15Z'));
});

test('New Cloudflare Live requests notify only the owning Astrologer native Android token',async()=>{
  const nativeToken='n'.repeat(64),webToken='w'.repeat(64),otherToken='x'.repeat(64);
  const queries=[],sent=[];
  const f=fixture({
    firestore:{async runQuery(query){
      queries.push(query);
      return [
        {data:{uid:'astro-1',platform:'native-android',token:nativeToken}},
        {data:{uid:'astro-1',platform:'web',token:webToken}},
        {data:{uid:'someone-else',platform:'native-android',token:otherToken}}
      ];
    }},
    fcmSender:{async send(token,payload){sent.push({token,payload});return 'projects/smv-astro/messages/1';}}
  });
  const res=responseHarness();
  await f.app.handlers.get('POST /live/requests')(req({
    astrologerId:'astro-1',mode:'call',minutes:5,requestId:'request-native-0001',
    customerName:'Customer',birthDetails:{}
  }),res);
  assert.equal(res.statusCode,200);
  assert.equal(queries.length,1);
  assert.deepEqual(queries[0],{
    collectionPath:'smv_push_tokens',
    filters:[{field:'uid',op:'==',value:'astro-1'}],
    limit:25
  });
  assert.deepEqual(sent.map(item=>item.token),[nativeToken],
    'web tokens and tokens owned by another UID must never receive native Android notifications');
  assert.equal(sent[0].payload.data.type,'live_request');
  assert.equal(sent[0].payload.data.sessionId,'session-1');
  assert.equal(sent[0].payload.data.bookingId,'');
  assert.equal(sent[0].payload.data.mode,'call');
  assert.equal(sent[0].payload.dataOnly,true,'native Android incoming calls must use a data-only FCM message');
  assert.equal(sent[0].payload.title,'Incoming Live Call');
  assert.match(sent[0].payload.body,/Tap the notification/);
});

test('New Cloudflare booking alerts use the booking ID and FCM failure cannot undo the booking',async()=>{
  const token='a'.repeat(64),sent=[];
  const f=fixture({
    createResult:{success:true,kind:'booking',booking:{
      id:'booking-native-1',customerUid:'customer-1',astrologerUid:'astro-1',
      mode:'chat',status:'pending',expiresAt:'2026-11-07T10:00:00.000Z'
    }},
    firestore:{async runQuery(){return [{data:{uid:'astro-1',platform:'native-android',token}}];}},
    fcmSender:{async send(deviceToken,payload){sent.push({deviceToken,payload});throw Object.assign(new Error('test provider failure'),{code:'FCM_SEND_FAILED'});}}
  });
  const res=responseHarness();
  await f.app.handlers.get('POST /live/requests')(req({
    astrologerId:'astro-1',mode:'chat',minutes:5,requestId:'request-booking-native-1',
    customerName:'Customer',birthDetails:{}
  }),res);
  assert.equal(res.statusCode,200,'notification provider failure must not roll back the booked request or its Wallet reserve');
  assert.equal(res.body.kind,'booking');
  assert.equal(sent.length,1);
  assert.equal(sent[0].payload.data.type,'live_booking');
  assert.equal(sent[0].payload.data.bookingId,'booking-native-1');
  assert.equal(sent[0].payload.data.sessionId,'');
  assert.equal(sent[0].payload.data.mode,'chat');
  assert.equal(sent[0].payload.dataOnly,true,'native Android bookings must use a data-only FCM message');
  assert.equal(sent[0].payload.title,'New Live Chat Booking');
});


test('Live status polling uses the authenticated participant and returns only the bounded status snapshot',async()=>{
  const statusSessions=[{id:'session-active-1',state:'active',customerUid:'customer-1'}];
  const f=fixture({statusSessions});
  const res=responseHarness();
  await f.app.handlers.get('GET /live/sessions/status')(req({},'customer'),res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body.sessions,statusSessions);
  assert.deepEqual(f.calls.find(x=>x.service==='listSessionStatus').input,{uid:'customer-1',role:'customer'});
  assert.equal(res.headers['Cache-Control'],'no-store');
});

test('Live Session detail route returns only the authenticated participant receipt snapshot',async()=>{
  const f=fixture({session:{id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',mode:'chat',state:'ended'}});
  const res=responseHarness();
  await f.app.handlers.get('GET /live/sessions/:id')(req({},'customer','session-1'),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.success,true);
  assert.equal(res.body.session.id,'session-1');
  assert.equal(res.body.session.state,'ended');
  assert.deepEqual(f.calls.find(x=>x.service==='getSessionForParticipant').input,{sessionId:'session-1',uid:'customer-1'});
});

test('Reading an expired active booked Live Chat settles it and publishes the receipt event to both participants',async()=>{
  const f=fixture({session:{
    id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',
    mode:'chat',state:'active',minutes:1,
    startedAt:new Date(Date.now()-60_001).toISOString()
  }});
  const res=responseHarness();
  await f.app.handlers.get('GET /live/sessions/:id')(req({},'customer','session-1'),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.session.state,'ended');
  const settlement=f.calls.find(item=>item.service==='endSession');
  assert.equal(settlement.input.sessionId,'session-1');
  assert.equal(settlement.input.reason,'duration_complete');
  assert.equal(settlement.input.system,true);
  const events=f.calls.filter(item=>String(item.url||'').includes('/publish')&&item.body.type==='live.session.ended');
  assert.deepEqual(events.map(item=>item.body.targetUid).sort(),['astro-1','customer-1']);
  assert.ok(f.calls.filter(item=>String(item.url||'').includes('/cancel-deadline')).length>=7,
    'the participant-read settlement cancels the stale durable deadlines');
});

test('Reading a still-running booked Live Call does not settle it before its booked duration expires',async()=>{
  const f=fixture({session:{
    id:'session-1',customerUid:'customer-1',astrologerUid:'astro-1',
    mode:'call',state:'active',minutes:5,startedAt:new Date().toISOString()
  }});
  const res=responseHarness();
  await f.app.handlers.get('GET /live/sessions/:id')(req({},'customer','session-1'),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.session.state,'active');
  assert.equal(f.calls.some(item=>item.service==='endSession'),false);
  assert.equal(f.calls.some(item=>String(item.url||'').includes('/publish')),false);
});

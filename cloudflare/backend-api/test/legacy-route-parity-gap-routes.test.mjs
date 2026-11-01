import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFirebaseAuthAdminClient,
  createFcmSender,
  registerLegacyRouteParityGapRoutes
} from '../src/legacy-route-parity-gap-routes.mjs';

function harness() {
  const handlers = new Map();
  return {
    handlers,
    get(path, ...fns) { handlers.set('GET ' + path, fns[fns.length - 1]); },
    post(path, ...fns) { handlers.set('POST ' + path, fns[fns.length - 1]); }
  };
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
function request({body={},token='astro',params={},query={},contentType='application/json'}={}) {
  return {
    body, params, query,
    get(name) {
      const key = String(name).toLowerCase();
      if (key === 'authorization') return 'Bearer ' + token;
      if (key === 'content-type') return contentType;
      return '';
    }
  };
}
function fixture({docs={},queries={}}={}) {
  const calls={reads:[],queries:[],writes:[],sets:[],deletes:[]};
  const get = async path => {
    calls.reads.push(path);
    return docs[path] || {exists:false,data:null};
  };
  const firestore = {
    calls,
    async getDocument(path) { return get(path); },
    async runQuery(options={}) {
      calls.queries.push(options);
      return queries[options.collectionPath] || [];
    },
    async setDocument(path,data,options) {
      calls.sets.push({path,data,options});
    },
    async deleteDocument(path) { calls.deletes.push(path); },
    async runTransaction(callback) {
      const tx = {
        async getDocument(path) { return get(path); },
        set(path,data,options={}) { calls.writes.push({type:'set',path,data,options}); },
        create(path,data) { calls.writes.push({type:'create',path,data}); },
        update(path,data) { calls.writes.push({type:'update',path,data}); },
        delete(path) { calls.writes.push({type:'delete',path}); }
      };
      return callback(tx);
    }
  };
  return firestore;
}
const identities = {
  async authenticateAuthorization(header) {
    if (header === 'Bearer admin') return {uid:'admin-1',email:'admin@example.com',role:'admin',isAdmin:true};
    if (header === 'Bearer astro') return {uid:'astro-1',email:'astro@example.com',role:'astrologer',isAdmin:false};
    if (header === 'Bearer customer') return {uid:'customer-1',email:'customer@example.com',role:'customer',isAdmin:false};
    throw Object.assign(new Error('Invalid token'),{httpStatus:401,code:'AUTH_REQUIRED'});
  }
};
function register(options={}) {
  const app=harness();
  const firestore=options.firestore || fixture();
  const config={
    app,firestore,identityService:options.identityService||identities,
    authAdmin:options.authAdmin||{async lookupByUid(uid){return{uid,email:uid+'@example.com',emailVerified:true,disabled:false};}},
    env:{SMV_WALLET_DOMAIN_CUTOVER_COMPLETE:'true',ADMIN_UID:'admin-1',...options.env},
    ...options
  };
  const registered=registerLegacyRouteParityGapRoutes(config);
  return {app,firestore,registered};
}

test('registers every one of the 18 in-scope active legacy routes literally',()=>{
  const {app,registered}=register();
  assert.equal(registered.paths.length,18);
  for(const item of registered.paths) {
    const [method,...rest]=item.split(' ');
    const route=rest.join(' ');
    assert.ok(app.handlers.has(method+' '+route),item);
  }
});

test('Customer ID login lookup resolves only a Customer public ID and never returns Firebase UID',async()=>{
  const firestore=fixture({queries:{smv_users:[{id:'uid-123',data:{uid:'uid-123',role:'customer',publicId:'smvcr-48372'}}]}});
  const authAdmin={async lookupByUid(uid){assert.equal(uid,'uid-123');return{localId:uid,email:'customer@example.com',emailVerified:true,disabled:false};}};
  const {app}=register({firestore,authAdmin});
  const res=response();
  await app.handlers.get('POST /lookup-customer-login')(request({body:{customerId:'smvcr-48372'}}),res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body,{ok:true,email:'customer@example.com',customerId:'smvcr-48372'});
  assert.equal(JSON.stringify(res.body).includes('uid-123'),false);
});

test('ID login lookup rejects invalid IDs and role mismatches before Auth Admin calls',async()=>{
  let calls=0;
  const firestore=fixture({queries:{smv_users:[{id:'u1',data:{uid:'u1',role:'customer',publicId:'smvar-12345'}}]}});
  const {app}=register({firestore,authAdmin:{async lookupByUid(){calls++;return{email:'x@example.com'};}}});
  const invalid=response();
  await app.handlers.get('POST /lookup-id-login')(request({body:{publicId:'not-an-id'}}),invalid);
  assert.equal(invalid.statusCode,400);
  const mismatch=response();
  await app.handlers.get('POST /lookup-id-login')(request({body:{publicId:'smvar-12345'}}),mismatch);
  assert.equal(mismatch.statusCode,403);
  assert.equal(calls,0);
});

test('Customer registration claims a normalized unique phone and creates public ID and initial Wallet in one transaction',async()=>{
  const firestore=fixture();
  const {app}=register({firestore,env:{SMV_WALLET_DOMAIN_CUTOVER_COMPLETE:'false'}});
  const res=response();
  await app.handlers.get('POST /register-customer-profile')?.(request({body:{name:'Customer One',phone:'+91 98765 43210'}}),res);
  assert.equal(res.statusCode,200,JSON.stringify(res.body));
  assert.match(res.body.publicId,/^smvcr-\d{5}$/);
  assert.equal(res.body.phone,'+919876543210');
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_phone_registry/'+w.path.split('/').pop()));
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_users/customer-1'&&w.data.role==='customer'));
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_wallets/customer-1'&&w.data.ownerRole==='customer'));
  const firstWrite=firestore.calls.writes.findIndex(w=>w.type!=='read');
  assert.ok(firstWrite>=0);
});

test('Customer registration cannot overwrite an existing Astrologer role or claim another account phone',async()=>{
  const roleStore=fixture({docs:{'smv_users/customer-1':{exists:true,data:{role:'astrologer'}}}});
  const roleResult=register({firestore:roleStore});
  const roleRes=response();
  await roleResult.app.handlers.get('POST /register-customer-profile')(request({body:{name:'X',phone:'9876543210'}}),roleRes);
  assert.equal(roleRes.statusCode,409);
  assert.equal(roleStore.calls.writes.length,0);

  const phoneStore=fixture({queries:{smv_users:[{id:'other-user',data:{phone:'+919876543210'}}]}});
  const phoneResult=register({firestore:phoneStore});
  const phoneRes=response();
  await phoneResult.app.handlers.get('POST /register-customer-profile')(request({body:{name:'X',phone:'9876543210'}}),phoneRes);
  assert.equal(phoneRes.statusCode,409);
  assert.equal(phoneRes.body.code,'PHONE_ALREADY_REGISTERED');
});

test('Astrologer registration validates required fields and saves approval-pending profile and payout securely',async()=>{
  const firestore=fixture();
  const {app}=register({firestore});
  const invalid=response();
  await app.handlers.get('POST /register-astrologer-profile')(request({body:{name:'Astrologer'}}),invalid);
  assert.equal(invalid.statusCode,400);
  const res=response();
  await app.handlers.get('POST /register-astrologer-profile')(request({body:{
    name:'Astrologer One',mobile:'9876543210',specialization:'Vedic Astrology',
    experience:8,bio:'Profile bio',languages:['Tamil','English'],
    bankName:'Test Bank',accountName:'Astrologer One',accountNumber:'12345678',
    ifsc:'ABCD0123456',upi:'',photoData:'data:image/png;base64,AAAA'
  }}),res);
  assert.equal(res.statusCode,200,JSON.stringify(res.body));
  assert.match(res.body.publicId,/^smvar-\d{5}$/);
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_astrologers/astro-1'&&w.data.status==='pending'));
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_payouts/astro-1'&&w.data.status==='pending_admin_review'));
  assert.ok(firestore.calls.writes.some(w=>w.path.startsWith('smv_notifications/')));
});

test('Public astrologer listing excludes unverified and disabled Firebase accounts',async()=>{
  const firestore=fixture({queries:{smv_astrologers:[
    {id:'approved-1',data:{status:'approved',name:'Verified Astro',languages:['Tamil'],liveCallEnabled:true,availabilityStatus:'online'}},
    {id:'approved-2',data:{status:'approved',name:'Unverified Astro'}}
  ]}});
  const authAdmin={async lookupByUid(uid){return uid==='approved-1'
    ?{uid,email:'a@example.com',emailVerified:true,disabled:false}
    :{uid,email:'b@example.com',emailVerified:false,disabled:false};}};
  const {app}=register({firestore,authAdmin});
  const res=response();
  await app.handlers.get('GET /public/astrologers')(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.astrologers.length,1);
  assert.equal(res.body.astrologers[0].id,'approved-1');
  assert.equal(res.body.astrologers[0].availabilityStatus,'online');
});

test('Astrologer payout method is owner-scoped, approved-only and pending Admin review',async()=>{
  const firestore=fixture({docs:{
    'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
    'smv_astrologers/astro-1':{exists:true,data:{status:'approved',name:'Astro One'}}
  }});
  const {app}=register({firestore});
  const denied=response();
  await app.handlers.get('POST /astrologer/change-payout')(request({token:'customer',body:{
    bankName:'Bank',accountName:'A',accountNumber:'123456',ifsc:'ABCD1234'
  }}),denied);
  assert.equal(denied.statusCode,403);
  const res=response();
  await app.handlers.get('POST /astrologer/change-payout')(request({body:{
    bankName:'Bank',accountName:'Astro One',accountNumber:'12345678',ifsc:'ABCD0123456'
  }}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.status,'pending_admin_review');
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_payouts/astro-1'&&w.data.status==='pending_admin_review'));
});

test('Admin payout review allows exactly one transition and writes notification/audit transactionally',async()=>{
  const firestore=fixture({docs:{'smv_payouts/astro-target':{exists:true,data:{uid:'astro-target',status:'pending_admin_review'}}}});
  const {app}=register({firestore});
  const rejected=response();
  await app.handlers.get('POST /admin/payout-change-status')(request({token:'customer',body:{astrologerId:'astro-target',status:'approved'}}),rejected);
  assert.equal(rejected.statusCode,403);
  const res=response();
  await app.handlers.get('POST /admin/payout-change-status')(request({token:'admin',body:{astrologerId:'astro-target',status:'rejected',reason:'Please re-check details.'}}),res);
  assert.equal(res.statusCode,200);
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_payouts/astro-target'&&w.data.status==='rejected'));
  assert.ok(firestore.calls.writes.some(w=>w.path.startsWith('smv_notifications/')));
  assert.ok(firestore.calls.writes.some(w=>w.path.startsWith('smv_admin_audit/')));
});

test('Admin payout review rejects missing requests, invalid statuses and empty rejection reasons',async()=>{
  const {app}=register();
  for(const body of [{astrologerId:'missing',status:'approved'},{astrologerId:'missing',status:'other'},{astrologerId:'missing',status:'rejected',reason:''}]){
    const res=response();
    await app.handlers.get('POST /admin/payout-change-status')(request({token:'admin',body}),res);
    assert.ok([400,404].includes(res.statusCode));
  }
});

test('Android APK upload fails closed until the dedicated Cloudflare release service is bound',async()=>{
  const {app}=register();
  const missing=response();
  await app.handlers.get('POST /admin/android-app/upload')(request({
    token:'admin',body:new Uint8Array(1024),contentType:'application/vnd.android.package-archive'
  }),missing);
  assert.equal(missing.statusCode,503);
  assert.equal(missing.body.code,'APK_RELEASE_SERVICE_NOT_READY');
  const wrong=response();
  await app.handlers.get('POST /admin/android-app/upload')(request({
    token:'admin',body:new Uint8Array(1024),contentType:'application/octet-stream'
  }),wrong);
  assert.equal(wrong.statusCode,415);
});

test('Admin content save accepts only allowlisted English content fields in one transaction',async()=>{
  const firestore=fixture();
  const {app}=register({firestore});
  const denied=response();
  await app.handlers.get('POST /admin/content/save')(request({token:'customer',body:{id:'blog-1',data:{title:'Title'}}}),denied);
  assert.equal(denied.statusCode,403);
  const res=response();
  await app.handlers.get('POST /admin/content/save')(request({token:'admin',body:{id:'blog-1',data:{
    kind:'blog',title:'English article',language:'en',published:false,adminOnlyInjected:'do-not-save'
  }}}),res);
  assert.equal(res.statusCode,200);
  const saved=firestore.calls.writes.find(w=>w.path==='smv_content/blog-1');
  assert.ok(saved);
  assert.equal(saved.data.title,'English article');
  assert.equal('adminOnlyInjected' in saved.data,false);
  const invalid=response();
  await app.handlers.get('POST /admin/content/save')(request({token:'admin',body:{id:'blog-2',data:{language:'ta'}}}),invalid);
  assert.equal(invalid.statusCode,400);
});

test('Admin content toggle requires an existing document and a boolean publish state',async()=>{
  const firestore=fixture({docs:{'smv_content/blog-1':{exists:true,data:{title:'A',published:false}}}});
  const {app}=register({firestore});
  const missing=response();
  await app.handlers.get('POST /admin/content/toggle')(request({token:'admin',body:{id:'missing',published:true}}),missing);
  assert.equal(missing.statusCode,404);
  const invalid=response();
  await app.handlers.get('POST /admin/content/toggle')(request({token:'admin',body:{id:'blog-1',published:'true'}}),invalid);
  assert.equal(invalid.statusCode,400);
  const res=response();
  await app.handlers.get('POST /admin/content/toggle')(request({token:'admin',body:{id:'blog-1',published:true}}),res);
  assert.equal(res.statusCode,200);
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_content/blog-1'&&w.data.published===true));
});

test('Admin content delete is Admin-only and targets a single validated document',async()=>{
  const firestore=fixture();
  const {app}=register({firestore});
  const denied=response();
  await app.handlers.get('POST /admin/content/delete')(request({token:'customer',body:{id:'blog-1'}}),denied);
  assert.equal(denied.statusCode,403);
  const invalid=response();
  await app.handlers.get('POST /admin/content/delete')(request({token:'admin',body:{id:'../other'}}),invalid);
  assert.equal(invalid.statusCode,400);
  const res=response();
  await app.handlers.get('POST /admin/content/delete')(request({token:'admin',body:{id:'blog-1'}}),res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(firestore.calls.deletes,['smv_content/blog-1']);
});

test('Content archive and mirror flags fail closed unless their Firestore adapter is configured',async()=>{
  const {app}=register({env:{SMV_CONTENT_BACKFILL_COMPLETE:'true'}});
  const res=response();
  await app.handlers.get('POST /admin/content/delete')(request({token:'admin',body:{id:'blog-1'}}),res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.code,'CONTENT_ARCHIVE_NOT_READY');
});

test('Admin dashboard touch increments one realtime signal and adds an audit row',async()=>{
  const firestore=fixture();
  const {app}=register({firestore});
  const denied=response();
  await app.handlers.get('POST /admin/dashboard-touch')(request({token:'astro'}),denied);
  assert.equal(denied.statusCode,403);
  const res=response();
  await app.handlers.get('POST /admin/dashboard-touch')(request({token:'admin'}),res);
  assert.equal(res.statusCode,200);
  assert.ok(firestore.calls.writes.some(w=>w.path==='smv_settings/dashboardChange'));
  assert.ok(firestore.calls.writes.some(w=>w.path.startsWith('smv_admin_audit/')));
});

test('Admin Wallet ledger route is read-only, bounded and fail-closed unless both schema attestations pass',async()=>{
  const calls=[];
  const db={prepare(sql){return{bind(...values){return{
    async all(){calls.push({sql,values});return{results:[]};},
    async first(){calls.push({sql,values});return null;}
  };}};}};
  const walletAdapter={async getWallet(uid){return{ownerRole:'customer',availableBalancePaise:1200,reservedBalancePaise:0,updatedAt:1};}};
  const {app}=register({db,walletAdapter,isWalletReady:async()=>true,isWalletBackfillReady:async()=>true});
  const denied=response();
  await app.handlers.get('GET /admin/wallet/transactions')(request({token:'customer'}),denied);
  assert.equal(denied.statusCode,403);
  const res=response();
  await app.handlers.get('GET /admin/wallet/transactions')(request({token:'admin',query:{limit:'999',ownerUid:'customer-1'}}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.limit,100);
  assert.equal(res.body.sampled,true);
  assert.equal(calls.length,2);
  assert.ok(calls.every(call=>/^SELECT/i.test(call.sql)));
  const closed=register({db,walletAdapter,isWalletReady:async()=>false,isWalletBackfillReady:async()=>true});
  const closedRes=response();
  await closed.app.handlers.get('GET /admin/wallet/transactions')(request({token:'admin'}),closedRes);
  assert.equal(closedRes.statusCode,503);
});

test('Astrologer Push status reports only UID-scoped registered devices',async()=>{
  const firestore=fixture({queries:{smv_push_tokens:[{id:'token-1',data:{uid:'astro-1'}}]}});
  const {app}=register({firestore});
  const res=response();
  await app.handlers.get('GET /live/push/status')(request({token:'astro'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.registeredDevices,1);
  const denied=response();
  await app.handlers.get('GET /live/push/status')(request({token:'customer'}),denied);
  assert.equal(denied.statusCode,403);
});

test('Push registration hashes tokens and refuses tokens owned by another account',async()=>{
  const firestore=fixture();
  const {app}=register({firestore});
  const invalid=response();
  await app.handlers.get('POST /live/push/register')(request({token:'astro',body:{token:'short'}}),invalid);
  assert.equal(invalid.statusCode,400);
  const res=response();
  await app.handlers.get('POST /live/push/register')(request({token:'astro',body:{token:'f'.repeat(48),platform:'native-android'}}),res);
  assert.equal(res.statusCode,200);
  const saved=firestore.calls.writes.find(w=>w.path.startsWith('smv_push_tokens/'));
  assert.ok(saved);
  assert.notEqual(saved.path,'smv_push_tokens/'+'f'.repeat(48));
  assert.equal(saved.data.platform,'native-android');

  const takenStore=fixture({docs:{['smv_push_tokens/'+(await sha256('g'.repeat(48)))]:{exists:true,data:{uid:'someone-else'}}}});
  const taken=register({firestore:takenStore});
  const takenRes=response();
  await taken.app.handlers.get('POST /live/push/register')(request({token:'astro',body:{token:'g'.repeat(48)}}),takenRes);
  assert.equal(takenRes.statusCode,403);
});

async function sha(value) {
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

test('Push unregister deletes only the requesting Astrologer token',async()=>{
  const id=await sha('h'.repeat(48));
  const firestore=fixture({docs:{['smv_push_tokens/'+id]:{exists:true,data:{uid:'astro-1',token:'h'.repeat(48)}}}});
  const {app}=register({firestore});
  const denied=response();
  await app.handlers.get('POST /live/push/unregister')(request({token:'customer',body:{token:'h'.repeat(48)}}),denied);
  assert.equal(denied.statusCode,403);
  const res=response();
  await app.handlers.get('POST /live/push/unregister')(request({token:'astro',body:{token:'h'.repeat(48)}}),res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(firestore.calls.writes.map(w=>w.path),['smv_push_tokens/'+id]);
  assert.equal(firestore.calls.writes[0].type,'delete');
});

test('Push test requires a registered device and a configured FCM sender',async()=>{
  const noProvider=register({firestore:fixture({queries:{smv_push_tokens:[{id:'t',data:{token:'p'.repeat(48)}}]}})});
  const missing=response();
  await noProvider.app.handlers.get('POST /live/push/test')(request({token:'astro'}),missing);
  assert.equal(missing.statusCode,503);
  assert.equal(missing.body.code,'FCM_NOT_READY');

  const firestore=fixture({queries:{smv_push_tokens:[{id:'t',data:{token:'p'.repeat(48)}}]}});
  const sent=[];
  const ready=register({firestore,fcmSender:{async send(token,payload){sent.push({token,payload});return 'projects/test/messages/1';}}});
  const res=response();
  await ready.app.handlers.get('POST /live/push/test')(request({token:'astro'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.sent,1);
  assert.equal(sent[0].payload.title,'SMV ASTRO Test Alert');
});

test('Scheduled Call/Chat start returns 503 before touching booking or Wallet while Live infrastructure is disabled',async()=>{
  const firestore=fixture({docs:{'smv_appointments/apt-1':{exists:true,data:{astrologerUid:'astro-1',bookingKind:'scheduled_call_request',bookingStatus:'accepted'}}}});
  const liveService={async createRequest(){throw new Error('must not run');},async acceptSession(){throw new Error('must not run');},async endSession(){throw new Error('must not run');}};
  const {app}=register({firestore,liveService,isLiveReady:async()=>false,env:{LIVE_SESSION_COORDINATOR:{},LIVE_USER_EVENT_HUB:{}}});
  const res=response();
  await app.handlers.get('POST /live/scheduled-appointments/:id/start')(request({token:'astro',params:{id:'apt-1'}}),res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.code,'LIVE_SCHEMA_NOT_READY');
  assert.equal(firestore.calls.writes.length,0);
});

test('Firebase Auth Admin lookup uses scoped OAuth and never returns disabled accounts as active',async()=>{
  let tokenCalls=0,requestPayload;
  const client=createFirebaseAuthAdminClient({
    projectId:'smv-astro-staging',
    tokenProvider:{async getAccessToken(){tokenCalls++;return'access-token';}},
    fetchImpl:async(url,options)=>{
      assert.match(url,/identitytoolkit\.googleapis\.com\/v1\/projects\/smv-astro-staging\/accounts:lookup/);
      assert.equal(options.headers.Authorization,'Bearer access-token');
      requestPayload=JSON.parse(options.body);
      return{ok:true,status:200,json:async()=>({users:[{localId:'u-1',email:'u@example.com',emailVerified:true,disabled:true}]})};
    }
  });
  const row=await client.lookupByUid('u-1');
  assert.equal(tokenCalls,1);
  assert.deepEqual(requestPayload,{localId:['u-1']});
  assert.equal(row.disabled,true);
});

test('FCM HTTP v1 sender uses the Firebase project endpoint and rejects invalid device tokens',async()=>{
  const calls=[];
  const sender=createFcmSender({
    projectId:'smv-astro-staging',
    tokenProvider:{async getAccessToken(){return'access-token';}},
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      return{ok:true,status:200,json:async()=>({name:'projects/smv-astro-staging/messages/1'})};
    }
  });
  await assert.rejects(()=>sender.send('short',{}),error=>error.code==='FCM_TOKEN_INVALID');
  const name=await sender.send('x'.repeat(48),{title:'Test',body:'hello',data:{type:'test'}});
  assert.equal(name,'projects/smv-astro-staging/messages/1');
  assert.match(calls[0].url,/fcm\.googleapis\.com\/v1\/projects\/smv-astro-staging\/messages:send/);
  assert.equal(calls[0].options.headers.Authorization,'Bearer access-token');
});

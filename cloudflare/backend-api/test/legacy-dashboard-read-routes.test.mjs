import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyDashboardReadRoutes } from '../src/legacy-dashboard-read-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, get(path, handler) { handlers.set('GET ' + path, handler); } };
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
function req(token='Bearer test') {
  return { params: { astrologerId: 'astro-1' }, get(name) { return String(name).toLowerCase()==='authorization' ? token : ''; } };
}
function firestoreFixture({ docs = {}, queries = {} } = {}) {
  const queryCalls = [];
  return {
    queryCalls,
    async getDocument(path) { return docs[path] || { exists: false, data: null }; },
    async runQuery(options) {
      queryCalls.push(options);
      return queries[options.collectionPath] || [];
    }
  };
}

test('Astrologer appointment read is UID-scoped and applies the IST two-minute missed rule', async () => {
  const app=harness(), firestore=firestoreFixture({
    docs:{
      'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
      'smv_astrologers/astro-1':{exists:true,data:{role:'astrologer'}}
    }
  });
  firestore.runQuery=async options=>[
    {id:'late',data:{bookingStatus:'accepted',preferredDate:'2026-01-01',preferredTime:'10:00',createdAt:'2026-01-01T00:00:00Z'}},
    {id:'active',data:{bookingStatus:'accepted',liveSessionId:'live-1'}}
  ];
  registerLegacyDashboardReadRoutes({
    app,firestore,
    identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}},
    now:()=>Date.parse('2026-01-01T05:03:00Z')
  });
  const res=response();
  await app.handlers.get('GET /astrologer/appointments')(req(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.appointments[0].bookingStatus,'missed_by_astrologer');
  assert.equal(res.body.appointments[0].missedReason,'astrologer_not_connected_within_grace');
  assert.equal(res.body.appointments[1].bookingStatus,'accepted');
});

test('Customer appointments require Customer role and filter only scheduled Call/Chat kinds', async () => {
  const app=harness();
  const firestore=firestoreFixture({queries:{smv_appointments:[
    {id:'call',data:{bookingKind:'scheduled_call_request',bookingStatus:'requested'}},
    {id:'old',data:{bookingKind:'appointment',bookingStatus:'requested'}}
  ]}});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer'};}}});
  const res=response();
  await app.handlers.get('GET /customer/appointments')(req(),res);
  assert.deepEqual(res.body.appointments.map(x=>x.id),['call']);
  const deniedApp=harness();
  registerLegacyDashboardReadRoutes({app:deniedApp,firestore,identityService:{async authenticateAuthorization(){return {uid:'ast-1',role:'astrologer'};}}});
  const denied=response();
  await deniedApp.handlers.get('GET /customer/appointments')(req(),denied);
  assert.equal(denied.statusCode,403);
});

test('Customer review status returns only question ID references for the signed-in customer', async () => {
  const app=harness(), firestore=firestoreFixture({queries:{smv_reviews:[
    {id:'r1',data:{questionId:'q1'}},{id:'r2',data:{questionId:''}}
  ]}});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer'};}}});
  const res=response();
  await app.handlers.get('GET /customer/reviews')(req(),res);
  assert.deepEqual(res.body,{success:true,reviews:[{id:'r1',questionId:'q1'}]});
  assert.equal(firestore.queryCalls[0].filters[0].value,'cus-1');
});

test('Public reviews expose only approved reviews for the requested astrologer', async () => {
  const app=harness(), firestore=firestoreFixture({queries:{smv_reviews:[
    {id:'approved',data:{status:'approved',astrologerId:'astro-1'}},
    {id:'pending',data:{status:'pending',astrologerId:'astro-1'}}
  ]}});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){throw new Error('should not authenticate public reviews');}}});
  const res=response();
  await app.handlers.get('GET /public/astrologers/:astrologerId/reviews')(req(),res);
  assert.deepEqual(res.body.reviews.map(x=>x.id),['approved']);
  assert.equal(firestore.queryCalls[0].filters[0].value,'astro-1');
});

test('Astrologer open questions remain unavailable until profile approved and Admin workflow opens', async () => {
  const app=harness(), firestore=firestoreFixture({docs:{
    'smv_astrologers/astro-1':{exists:true,data:{status:'approved'}},
    'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:false}}
  }});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
  const res=response();
  await app.handlers.get('GET /astrologer/open-questions')(req(),res);
  assert.deepEqual(res.body,{success:true,allowWithoutAdminApproval:false,questions:[]});
});

test('Open paid questions include the Admin commission rate and exclude already allocated questions', async () => {
  const app=harness(), firestore=firestoreFixture({docs:{
    'smv_astrologers/astro-1':{exists:true,data:{status:'approved'}},
    'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}},
    'smv_settings/commission':{exists:true,data:{astroPercent:25}}
  },queries:{smv_questions:[
    {id:'q1',data:{paymentStatus:'paid',status:'available_to_astrologers',allocationStatus:'available_to_astrologers',amount:400}},
    {id:'q2',data:{paymentStatus:'pending',status:'available_to_astrologers',allocationStatus:'available_to_astrologers',amount:400}},
    {id:'q3',data:{paymentStatus:'paid',status:'available_to_astrologers',allocationStatus:'claimed',amount:400}}
  ]}});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
  const res=response();
  await app.handlers.get('GET /astrologer/open-questions')(req(),res);
  assert.equal(res.body.questions.length,1);
  assert.equal(res.body.questions[0].commissionPercent,25);
  assert.equal(res.body.questions[0].astrologerCommissionAmount,100);
});

test('Admin appointment and review reads reject non-admins before Firestore queries', async () => {
  const app=harness(), firestore=firestoreFixture();
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer',isAdmin:false};}}});
  for(const path of ['/admin/appointments','/admin/reviews-data']){
    const res=response();
    await app.handlers.get('GET '+path)(req(),res);
    assert.equal(res.statusCode,403);
  }
  assert.equal(firestore.queryCalls.length,0);
});

test('Admin appointment and review reads use bounded query limits', async () => {
  const app=harness(), firestore=firestoreFixture({queries:{smv_appointments:[],smv_reviews:[]}});
  registerLegacyDashboardReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}});
  const appointments=response(), reviews=response();
  await app.handlers.get('GET /admin/appointments')(req(),appointments);
  await app.handlers.get('GET /admin/reviews-data')(req(),reviews);
  assert.equal(appointments.body.appointments.length,0);
  assert.equal(reviews.body.reviews.length,0);
  assert.equal(firestore.queryCalls[0].limit,200);
  assert.equal(firestore.queryCalls[1].limit,50);
});

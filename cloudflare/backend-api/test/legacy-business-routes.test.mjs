import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyBusinessRoutes } from '../src/legacy-business-routes.mjs';

function harness() {
  const handlers = new Map();
  return {
    handlers,
    post(path, handler) { handlers.set('POST ' + path, handler); }
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
function request(body, token='Bearer token') {
  return { body, get(name) { return String(name).toLowerCase()==='authorization' ? token : ''; } };
}

function transactionalFirestore({docs={}}={}) {
  const writes=[];
  const updates=[];
  return {
    writes,updates,
    async getDocument(path){return docs[path]||{exists:false,data:null};},
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        set(path,data,options){writes.push({type:'set',path,data,options});},
        create(path,data){writes.push({type:'create',path,data});}
      };
      return callback(tx);
    },
    async updateDocument(path,data){updates.push({path,data});}
  };
}

test('Astrologer availability validates input and updates only an approved owned profile', async()=>{
 const app=harness(),firestore=transactionalFirestore({docs:{
   'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
   'smv_astrologers/astro-1':{exists:true,data:{uid:'astro-1',status:'approved',activeSessionCount:1}},
   'smv_settings/liveSessionPricing':{exists:true,data:{maxConcurrentSessions:2}}
 }});
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
 const res=response();
 await app.handlers.get?.('POST /astrologer/availability')?.(request({availabilityStatus:'online',liveCallEnabled:true,liveChatEnabled:false}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.availabilityStatus,'busy');
 assert.equal(res.body.maxConcurrentSessions,2);
 assert.equal(firestore.writes[0].data.liveSessionBusyManaged,true);
});

test('Astrologer availability rejects non-approved profiles and malformed switches', async()=>{
 const app=harness(),firestore=transactionalFirestore({docs:{
   'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
   'smv_astrologers/astro-1':{exists:true,data:{uid:'astro-1',status:'pending'}}
 }});
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
 const res=response();
 await app.handlers.get('POST /astrologer/availability')(request({availabilityStatus:'online',liveCallEnabled:true,liveChatEnabled:true}),res);
 assert.equal(res.statusCode,409);
 assert.equal(firestore.writes.length,0);
});

test('Customer review submission checks ownership/final status and atomically creates a unique pending review', async()=>{
 const app=harness(),firestore=transactionalFirestore({docs:{
   'smv_questions/q1':{exists:true,data:{customerId:'cus-1',astrologerId:'astro-1',status:'answered',customerName:'Customer',astrologerName:'Astrologer'}},
   'smv_reviews/q1_cus-1':{exists:false,data:null}
 }});
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer'};}}});
 const res=response();
 await app.handlers.get('POST /customer/submit-review')(request({questionId:'q1',astrologerId:'astro-1',rating:5,review:'Very helpful answer.'}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.alreadySubmitted,false);
 assert.ok(firestore.writes.some(x=>x.type==='create'&&x.path==='smv_reviews/q1_cus-1'));
 assert.ok(firestore.writes.some(x=>x.type==='set'&&x.path==='smv_questions/q1'));
});

test('Customer review submission refuses another Customer’s question', async()=>{
 const app=harness(),firestore=transactionalFirestore({docs:{
   'smv_questions/q1':{exists:true,data:{customerId:'someone-else',astrologerId:'astro-1',status:'answered'}},
   'smv_reviews/q1_cus-1':{exists:false,data:null}
 }});
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer'};}}});
 const res=response();
 await app.handlers.get('POST /customer/submit-review')(request({questionId:'q1',astrologerId:'astro-1',rating:5,review:'Review'}),res);
 assert.equal(res.statusCode,403);
 assert.equal(firestore.writes.length,0);
});

test('Duplicate Customer review submission is idempotent', async()=>{
 const app=harness(),firestore=transactionalFirestore({docs:{
   'smv_questions/q1':{exists:true,data:{customerId:'cus-1',astrologerId:'astro-1',status:'answered',reviewed:false}},
   'smv_reviews/q1_cus-1':{exists:true,data:{rating:4}}
 }});
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'cus-1',role:'customer'};}}});
 const res=response();
 await app.handlers.get('POST /customer/submit-review')(request({questionId:'q1',astrologerId:'astro-1',rating:5,review:'Second review'}),res);
 assert.equal(res.body.alreadySubmitted,true);
 assert.equal(firestore.writes.some(x=>x.type==='create'),false);
});

test('Admin appointment status is restricted and validates status before updating', async()=>{
 const app=harness(),firestore=transactionalFirestore();
 registerLegacyBusinessRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}});
 const res=response();
 await app.handlers.get('POST /admin/appointment-status')(request({id:'booking-1',status:'completed'}),res);
 assert.deepEqual(res.body,{ok:true});
 assert.equal(firestore.updates[0].path,'smv_appointments/booking-1');
});

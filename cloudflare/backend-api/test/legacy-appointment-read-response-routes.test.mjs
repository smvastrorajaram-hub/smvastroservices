import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyAppointmentReadAndResponseRoutes } from '../src/legacy-appointment-read-response-routes.mjs';

function harness(){const gets=new Map(),posts=new Map();return{gets,posts,get(path,handler){gets.set('GET '+path,handler);},post(path,handler){posts.set('POST '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function request(body={},id='booking-1'){return{body,params:{id},get(name){return String(name).toLowerCase()==='authorization'?'Bearer token':'';}};}
function fixture({docs={},queries={}}={}){const writes=[];return{writes,async getDocument(path){return docs[path]||{exists:false,data:null};},async runQuery(options){return queries[options.collectionPath]||[];},async runTransaction(callback){const tx={async getDocument(path){return docs[path]||{exists:false,data:null};},update(path,data){writes.push({path,data});}};return callback(tx);}};}

test('Customer consultation history is authenticated and strictly UID scoped',async()=>{
 const app=harness(),firestore=fixture({queries:{smv_questions:[
  {id:'old',data:{customerId:'cus-1',status:'answered',createdAt:'2026-01-01'}},
  {id:'new',data:{customerId:'cus-1',status:'pending',createdAt:'2026-10-01'}}
 ]}});
 registerLegacyAppointmentReadAndResponseRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'cus-1',role:'customer'};}}});
 const res=response();await app.gets.get('GET /customer/consultations')(request(),res);
 assert.equal(res.statusCode,200);assert.deepEqual(res.body.questions.map(x=>x.id),['new','old']);
 assert.equal(firestore.writes.length,0);
});

test('Astrologer accepts a scheduled Call booking once and cannot respond to another profile booking',async()=>{
 const app=harness(),firestore=fixture({
  docs:{
   'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
   'smv_astrologers/astro-1':{exists:true,data:{role:'astrologer'}},
   'smv_appointments/booking-1':{exists:true,data:{astrologerUid:'astro-1',bookingKind:'scheduled_call_request',bookingStatus:'requested',preferredDate:'2026-12-01',preferredTime:'18:00'}}
  }
 });
 registerLegacyAppointmentReadAndResponseRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const res=response();await app.posts.get('POST /astrologer/appointments/:id/respond')(request({action:'accept'}),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.bookingStatus,'accepted');
 assert.equal(firestore.writes[0].data.bookingStatus,'accepted');
 const otherApp=harness(),other=fixture({docs:{
  'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
  'smv_appointments/booking-1':{exists:true,data:{astrologerUid:'astro-2',bookingKind:'scheduled_chat_request',bookingStatus:'requested'}}
 }});
 registerLegacyAppointmentReadAndResponseRoutes({app:otherApp,firestore:other,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const denied=response();await otherApp.posts.get('POST /astrologer/appointments/:id/respond')(request({action:'accept'}),denied);
 assert.equal(denied.statusCode,403);assert.equal(other.writes.length,0);
});

test('Astrologer late acceptance marks booking missed after 2-minute IST grace',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
  'smv_appointments/booking-1':{exists:true,data:{astrologerUid:'astro-1',bookingKind:'scheduled_call_request',bookingStatus:'requested',preferredDate:'2026-11-01',preferredTime:'10:00'}}
 }});
 registerLegacyAppointmentReadAndResponseRoutes({
  app,firestore,now:()=>Date.parse('2026-11-01T04:33:00Z'),
  identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}
 });
 const res=response();await app.posts.get('POST /astrologer/appointments/:id/respond')(request({action:'accept'}),res);
 assert.equal(res.statusCode,409);assert.equal(firestore.writes[0].data.bookingStatus,'missed_by_astrologer');
});

test('Astrologer cannot respond to non-scheduled appointment or repeat another terminal action',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_users/astro-1':{exists:true,data:{role:'astrologer'}},
  'smv_appointments/booking-1':{exists:true,data:{astrologerUid:'astro-1',bookingKind:'appointment',bookingStatus:'requested'}}
 }});
 registerLegacyAppointmentReadAndResponseRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'astro-1'};}}});
 const res=response();await app.posts.get('POST /astrologer/appointments/:id/respond')(request({action:'reject'}),res);
 assert.equal(res.statusCode,400);assert.equal(firestore.writes.length,0);
});

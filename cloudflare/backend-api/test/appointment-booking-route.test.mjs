import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAppointmentBookingRoute } from '../src/appointment-booking-route.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, post(path, handler) { handlers.set('POST ' + path, handler); } };
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
function request(body, token='Bearer customer') {
  return { body, get(name) { return String(name).toLowerCase()==='authorization'?token:''; } };
}
function fixture({docs={}}={}) {
  const writes=[];
  return {
    writes,
    async getDocument(path) { return docs[path] || {exists:false,data:null}; },
    async runTransaction(callback) {
      const tx={
        async getDocument(path) { return docs[path] || {exists:false,data:null}; },
        set(path,data,options) { writes.push({type:'set',path,data,options}); },
        create(path,data) { writes.push({type:'create',path,data}); }
      };
      return callback(tx);
    }
  };
}
const baseBody={
  name:'Customer',
  type:'Call Consultation',
  preferredDate:'2026-12-01',
  preferredTime:'18:30',
  scheduledMinutes:30,
  astrologerId:'astro-1',
  birthDate:'1990-01-01',
  birthTime:'10:30',
  birthPlace:'Perambalur',
  birthLatitude:'11.23',
  birthLongitude:'78.88',
  birthTimezone:'Asia/Kolkata'
};

test('scheduled Call booking validates Customer, approved Astrologer, enabled mode and rate; creates request with no payment',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_users/cus-1':{exists:true,data:{uid:'cus-1',role:'customer'}},
   'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{uid:'astro-1',status:'approved',name:'Astrologer',liveCallEnabled:true,callPricePerMinute:15}}
 }});
 registerAppointmentBookingRoute({
   app,firestore,now:()=>Date.parse('2026-11-01T08:00:00Z'),randomId:()=>'appointment-1',
   identityService:{async authenticateAuthorization(){return {uid:'cus-1',email:'customer@example.com'};}}
 });
 const res=response();
 await app.handlers.get('POST /appointment-booking')(request(baseBody),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.bookingId,'SMV-BKG-01112026-01');
 const appointment=firestore.writes.find(x=>x.type==='create');
 assert.equal(appointment.path,'smv_appointments/appointment-1');
 assert.equal(appointment.data.pricePerMinute,15);
 assert.equal(appointment.data.paymentStatus,'not_started');
 assert.equal(appointment.data.bookingStatus,'requested');
});

test('scheduled Chat booking requires Chat enabled and configured per-minute rate',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_users/cus-1':{exists:true,data:{role:'customer'}},
   'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{status:'approved',liveChatEnabled:false,chatPricePerMinute:20}}
 }});
 registerAppointmentBookingRoute({
   app,firestore,now:()=>Date.parse('2026-11-01T08:00:00Z'),
   identityService:{async authenticateAuthorization(){return {uid:'cus-1'};}}
 });
 const res=response();
 await app.handlers.get('POST /appointment-booking')(request({...baseBody,type:'Chat Consultation'}),res);
 assert.equal(res.statusCode,409);
 assert.equal(firestore.writes.length,0);
});

test('invalid schedule, DOB, birth coordinates and duration fail before transaction writes',async()=>{
 const cases=[
   {...baseBody,preferredDate:'2026-02-30'},
   {...baseBody,birthDate:'2030-01-01'},
   {...baseBody,birthLatitude:'91'},
   {...baseBody,scheduledMinutes:1441}
 ];
 for(const body of cases){
   const app=harness(),firestore=fixture({docs:{
     'smv_users/cus-1':{exists:true,data:{role:'customer'}},
     'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{status:'approved',liveCallEnabled:true,callPricePerMinute:15}}
   }});
   registerAppointmentBookingRoute({
     app,firestore,now:()=>Date.parse('2026-11-01T08:00:00Z'),
     identityService:{async authenticateAuthorization(){return {uid:'cus-1'};}}
   });
   const res=response();
   await app.handlers.get('POST /appointment-booking')(request(body),res);
   assert.equal(res.statusCode,400);
   assert.equal(firestore.writes.length,0);
 }
});

test('generic appointment requests still require email/mobile and create no payment record',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_users/cus-1':{exists:true,data:{role:'customer'}}
 }});
 registerAppointmentBookingRoute({
   app,firestore,now:()=>Date.parse('2026-11-01T08:00:00Z'),randomId:()=>'general-1',
   identityService:{async authenticateAuthorization(){return {uid:'cus-1',email:'customer@example.com'};}}
 });
 const res=response();
 await app.handlers.get('POST /appointment-booking')(request({
   name:'Customer',email:'customer@example.com',mobile:'9876543210',
   type:'Call Consultation',preferredDate:'2026-12-01',preferredTime:'18:30'
 }),res);
 assert.equal(res.statusCode,200);
 const appointment=firestore.writes.find(x=>x.type==='create');
 assert.equal(appointment.data.paymentStatus,'not_required');
 assert.equal(appointment.data.bookingKind,undefined);
});

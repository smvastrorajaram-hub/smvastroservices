import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminAstrologerProfileRoutes } from '../src/admin-astrologer-profile-routes.mjs';

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
function request(body) {
  return { body, get(name) { return String(name).toLowerCase()==='authorization' ? 'Bearer admin' : ''; } };
}
function firestoreFixture({docs={},linked=[]}={}) {
  const writes=[],queries=[];
  return {
    writes,queries,
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        async query(options){queries.push(options);return linked;},
        set(path,data,options){writes.push({type:'set',path,data,options});},
        create(path,data){writes.push({type:'create',path,data});}
      };
      return callback(tx);
    }
  };
}

test('profile permission is Admin-only and updates selected, canonical and UID-linked profile docs',async()=>{
 const app=harness(),firestore=firestoreFixture({
   docs:{'smv_astrologers/legacy-id':{exists:true,id:'legacy-id',data:{uid:'astro-1'}}},
   linked:[{id:'legacy-id',data:{uid:'astro-1'}},{id:'another-profile',data:{uid:'astro-1'}}]
 });
 registerAdminAstrologerProfileRoutes({
   app,firestore,
   identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}
 });
 const res=response();
 await app.handlers.get('POST /admin/astrologer-profile-permission')(request({astrologerId:'legacy-id',allow:true}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.uid,'astro-1');
 assert.deepEqual(new Set(firestore.writes.map(x=>x.path)),new Set([
   'smv_astrologers/legacy-id','smv_astrologers/astro-1','smv_astrologers/another-profile'
 ]));
 assert.ok(firestore.writes.every(x=>x.data.profileEditAllowed===true));
});

test('non-admin cannot change profile permission and no Firestore transaction runs',async()=>{
 const app=harness(),firestore=firestoreFixture();
 registerAdminAstrologerProfileRoutes({
   app,firestore,
   identityService:{async authenticateAuthorization(){return {uid:'customer-1',role:'customer',isAdmin:false};}}
 });
 const res=response();
 await app.handlers.get('POST /admin/astrologer-profile-permission')(request({astrologerId:'astro-1',allow:true}),res);
 assert.equal(res.statusCode,403);
 assert.equal(firestore.writes.length,0);
});

test('description save validates length and approval/reject updates every linked profile',async()=>{
 const app=harness(),firestore=firestoreFixture({
   docs:{'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{uid:'astro-1',profileDescriptionPending:'Pending approved description with enough characters.'}}},
   linked:[{id:'astro-1',data:{uid:'astro-1'}},{id:'legacy-astro',data:{uid:'astro-1'}}]
 });
 registerAdminAstrologerProfileRoutes({
   app,firestore,randomId:()=> 'test-notification',
   identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}
 });
 const invalid=response();
 await app.handlers.get('POST /admin/astrologer-profile-description')(request({astrologerId:'astro-1',action:'save',description:'short'}),invalid);
 assert.equal(invalid.statusCode,400);
 assert.equal(firestore.writes.length,0);

 const approve=response();
 await app.handlers.get('POST /admin/astrologer-profile-description')(request({astrologerId:'astro-1',action:'approve'}),approve);
 assert.equal(approve.statusCode,200);
 assert.equal(approve.body.description,'Pending approved description with enough characters.');
 assert.ok(firestore.writes.some(x=>x.type==='create'&&x.path==='smv_notifications/astro-1_profile_approved_test-notification'));
 assert.ok(firestore.writes.filter(x=>x.type==='set').every(x=>x.data.profileDescriptionStatus==='approved'));
});

test('reject clears pending description, records rejection and omits notification',async()=>{
 const app=harness(),firestore=firestoreFixture({
   docs:{'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{uid:'astro-1'}}}
 });
 registerAdminAstrologerProfileRoutes({
   app,firestore,
   identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}
 });
 const res=response();
 await app.handlers.get('POST /admin/astrologer-profile-description')(request({astrologerId:'astro-1',action:'reject'}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.description,'');
 assert.equal(firestore.writes[0].data.profileDescriptionStatus,'rejected');
 assert.equal(firestore.writes.some(x=>x.type==='create'),false);
});

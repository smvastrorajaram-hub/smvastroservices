import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminAstrologerCatalogRoutes } from '../src/admin-astrologer-catalog-routes.mjs';

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
  return { body, get(name) { return String(name).toLowerCase()==='authorization'?'Bearer admin':''; } };
}
function fixture({docs={},byUid=[],byPublicId=[]}={}) {
  const writes=[],queries=[];
  return {
    writes,queries,
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        async query(options) {
          queries.push(options);
          return options.filters[0].field==='uid'?byUid:byPublicId;
        },
        set(path,data,options){writes.push({path,data,options});}
      };
      return callback(tx);
    }
  };
}
const identityService={async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}};

test('Admin language update validates list and updates linked Astrologer plus Customer profile',async()=>{
 const app=harness(),firestore=fixture({
   docs:{'smv_astrologers/legacy-id':{exists:true,id:'legacy-id',data:{uid:'astro-1'}}},
   byUid:[{id:'astro-1',data:{uid:'astro-1'}},{id:'legacy-id',data:{uid:'astro-1'}}]
 });
 registerAdminAstrologerCatalogRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-languages')(request({astrologerId:'legacy-id',languages:[' Tamil ','English','Tamil']}),res);
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body.languages,['Tamil','English']);
 assert.ok(firestore.writes.some(x=>x.path==='smv_users/astro-1'));
 assert.ok(firestore.writes.every(x=>x.data.spokenLanguages.join(',')==='Tamil,English'));
});

test('Admin language update rejects too many or oversized entries before write',async()=>{
 const app=harness(),firestore=fixture({docs:{'smv_astrologers/a':{exists:true,data:{uid:'a'}}}});
 registerAdminAstrologerCatalogRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-languages')(request({astrologerId:'a',languages:Array.from({length:13},(_,i)=>'Language '+i)}),res);
 assert.equal(res.statusCode,400);
 assert.equal(firestore.writes.length,0);
});

test('Admin pricing updates per-minute call/chat and legacy per-question values across linked profiles',async()=>{
 const app=harness(),firestore=fixture({
   docs:{'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:{uid:'astro-1',status:'approved',publicId:'smvar-1',pricePerQuestion:100}}},
   byUid:[{id:'astro-1',data:{uid:'astro-1'}}],
   byPublicId:[{id:'legacy',data:{uid:'astro-1',publicId:'smvar-1'}}]
 });
 registerAdminAstrologerCatalogRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-pricing')(request({
   astrologerId:'astro-1',pricePerQuestion:200,callPricePerMinute:15.5,chatPricePerMinute:0
 }),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.pricePerQuestion,200);
 assert.equal(res.body.callPricePerMinute,15.5);
 assert.equal(res.body.chatPricePerMinute,null);
 assert.equal(firestore.writes.length,2);
 assert.ok(firestore.writes.every(x=>x.data.pricePerQuestion===200));
});

test('Admin pricing rejects unapproved Astrologer and invalid fractional paise',async()=>{
 for(const selected of [
  {uid:'astro-1',status:'pending'},
  {uid:'astro-1',status:'approved'}
 ]){
  const app=harness(),firestore=fixture({
    docs:{'smv_astrologers/astro-1':{exists:true,id:'astro-1',data:selected}}
  });
  registerAdminAstrologerCatalogRoutes({app,firestore,identityService});
  const res=response();
  const value=selected.status==='pending'?{callPricePerMinute:15}:{callPricePerMinute:15.123};
  await app.handlers.get('POST /admin/astrologer-pricing')(request({astrologerId:'astro-1',...value}),res);
  assert.equal(res.statusCode,400);
  assert.equal(firestore.writes.length,0);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminDashboardRoutes } from '../src/admin-dashboard-routes.mjs';

function harness(){const handlers=new Map();return{handlers,get(path,handler){handlers.set('GET '+path,handler);}};}
function response(){return{statusCode:200,headers:{},body:null,status(code){this.statusCode=code;return this;},set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},json(body){this.body=body;return this;}};}
function req(){return{get(name){return String(name).toLowerCase()==='authorization'?'Bearer token':'';}};}
function fixture({docs={},queries={}}={}){const calls=[];return{calls,async getDocument(path){calls.push({type:'get',path});return docs[path]||{exists:false,data:null};},async runQuery(options){calls.push({type:'query',options});return queries[options.collectionPath]||[];}};}
const admin={async authenticateAuthorization(){return{uid:'admin-1',role:'admin',isAdmin:true};}};

test('Admin astrologers data requires Admin and returns both collections in newest-first order',async()=>{
 const app=harness(),firestore=fixture({queries:{
  smv_users:[{id:'u1',data:{role:'customer',createdAt:'2026-01-01'}},{id:'u2',data:{role:'astrologer',createdAt:'2026-10-01'}}],
  smv_astrologers:[{id:'a1',data:{status:'approved',updatedAt:'2026-01-01'}},{id:'a2',data:{status:'pending',updatedAt:'2026-10-01'}}]
 }});
 registerAdminDashboardRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('GET /admin/astrologers-data')(req(),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.users[0].id,'u2');assert.equal(res.body.astrologers[0].id,'a2');
});

test('Admin settings expose current commission/workflow/quiz controls without webhook secret or retired product settings',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_settings/commission':{exists:true,data:{astroPercent:20}},
  'smv_settings/question':{exists:true,data:{minWords:50}},
  'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}},
  'smv_settings/astrologerAutoApproval':{exists:true,data:{enabled:true,passMark:18,formUrl:'https://docs.google.com/forms/d/e/demo/viewform',webhookSecret:'secret-must-not-return'}}
 }});
 registerAdminDashboardRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('GET /admin/settings-data')(req(),res);
 assert.equal(res.body.settings.commission.astroPercent,20);
 assert.equal(res.body.settings.workflow.allowWithoutAdminApproval,true);
 assert.equal(res.body.settings.astrologerAutoApproval.passMark,18);
 assert.equal(JSON.stringify(res.body).includes('secret-must-not-return'),false);
 assert.equal('privateCommission' in res.body.settings,false);
});

test('Admin landing data is bounded and supplies only pending astrologer contact details',async()=>{
 const app=harness(),firestore=fixture({
  docs:{'smv_settings/commission':{exists:true,data:{astroPercent:25}},'smv_settings/astrologerAutoApproval':{exists:false}},
  queries:{
   smv_users:[{id:'cus',data:{role:'customer'}}],
   smv_astrologers:[{id:'astro-1',data:{uid:'astro-1',status:'pending'}},{id:'astro-2',data:{uid:'astro-2',status:'approved'}}],
   smv_payments:[{id:'pay',data:{source:'live_session'}}]
  }
 });
 firestore.getDocument=async path=>path==='smv_users/astro-1'?{exists:true,data:{email:'a@example.com',mobile:'123'}}:
  path==='smv_settings/commission'?{exists:true,data:{astroPercent:25}}:{exists:false,data:null};
 registerAdminDashboardRoutes({app,firestore,identityService:admin});
 const res=response();await app.handlers.get('GET /admin-data')(req(),res);
 assert.equal(res.body.customerCount,1);assert.equal(res.body.astrologerCount,2);
 assert.equal(res.body.astrologers.find(x=>x.id==='astro-1').adminContactEmail,'a@example.com');
 assert.equal('adminContactEmail' in res.body.astrologers.find(x=>x.id==='astro-2'),false);
});

test('Non-admin cannot read dashboard data and triggers no Firestore reads',async()=>{
 const app=harness(),firestore=fixture();
 registerAdminDashboardRoutes({app,firestore,identityService:{async authenticateAuthorization(){return{uid:'c',role:'customer',isAdmin:false};}}});
 for(const path of ['/admin-data','/admin/settings-data','/admin/astrologers-data']){
  const res=response();await app.handlers.get('GET '+path)(req(),res);assert.equal(res.statusCode,403);
 }
 assert.equal(firestore.calls.length,0);
});

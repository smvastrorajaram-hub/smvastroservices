import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWalletDomainBackfillRoutes } from '../src/wallet-domain-backfill-routes.mjs';

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
    statusCode:200,headers:{},body:null,
    status(code){this.statusCode=code;return this;},
    set(name,value){if(typeof name==='object')Object.assign(this.headers,name);else this.headers[name]=value;return this;},
    json(body){this.body=body;return this;}
  };
}
function request(body={},authorization='Bearer admin-token') {
  return {body,query:{},get(name){return name.toLowerCase()==='authorization'?authorization:'';}};
}
function fixture(overrides={}) {
  const calls=[];
  const service={
    async status(){calls.push(['status']);return {collections:[],target:{archived_documents:0}};},
    async assertSourceQuiescent(){calls.push(['preflight']);return overrides.preflight||{ok:true,blockers:[]};},
    async previewPage(options){calls.push(['preview',options]);return {sourceDocuments:1,domainMapped:1,writesPerformed:0,nextPageToken:''};},
    async applyPage(options){calls.push(['apply',options]);return {sourceDocuments:1,targetStatements:2,writesPerformed:2,nextPageToken:''};},
    async reconcilePage(options){calls.push(['reconcile',options]);return overrides.reconcile||{sourceDocuments:1,missingInD1Archive:0,payloadMismatches:0,normalizedMappingsMissing:0,warningCount:0,writesPerformed:0};}
  };
  const state={
    app:appHarness(),calls,service,
    identityService:{async authenticateAuthorization(){
      return overrides.user||{uid:'admin-1',role:'admin',isAdmin:true};
    }},
    backfillService:service,firestore:{},
    toolsEnabled:overrides.toolsEnabled??true,
    environment:overrides.environment||'staging',
    sourceProjectId:overrides.sourceProjectId||'smv-astro-staging',
    quiesced:overrides.quiesced??false,
    cutoverComplete:overrides.cutoverComplete??false,
    backendActive:overrides.backendActive??false,
    isReady:overrides.isReady||(async()=>true)
  };
  registerWalletDomainBackfillRoutes(state);
  return state;
}

test('Customer is blocked from Admin Wallet backfill status',async()=>{
  const state=fixture({user:{uid:'customer-1',role:'customer',isAdmin:false}});
  const res=responseHarness();
  await state.app.handlers.get('GET /admin/wallet/backfill/status')(request(),res);
  assert.equal(res.statusCode,403);
  assert.equal(res.body.code,'ADMIN_REQUIRED');
  assert.equal(state.calls.length,0);
});

test('backfill tools fail closed when the explicit staging flag is off',async()=>{
  const state=fixture({toolsEnabled:false});
  const res=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/preview')(request({collection:'wallets'}),res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.code,'BACKFILL_TOOLS_DISABLED');
  assert.equal(state.calls.length,0);
});

test('backfill tooling refuses non-staging environments and other Firebase projects',async()=>{
  for(const overrides of [
    {environment:'production'},
    {sourceProjectId:'smv-astro-production'}
  ]) {
    const state=fixture(overrides);
    const res=responseHarness();
    await state.app.handlers.get('GET /admin/wallet/backfill/status')(request(),res);
    assert.equal(res.statusCode,403);
    assert.equal(res.body.code,'BACKFILL_STAGING_ONLY');
    assert.equal(state.calls.length,0);
  }
});

test('Preview and reconcile are read-only and return their write count as zero',async()=>{
  const state=fixture();
  const preview=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/preview')(request({collection:'wallets',pageSize:20}),preview);
  assert.equal(preview.statusCode,200);
  assert.equal(preview.body.mode,'read_only_preview');
  assert.equal(preview.body.writesPerformed,0);

  const reconcile=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/reconcile')(request({collection:'wallets'}),reconcile);
  assert.equal(reconcile.statusCode,200);
  assert.equal(reconcile.body.mode,'read_only_reconciliation');
  assert.equal(reconcile.body.cutoverSafe,false);
  assert.equal(reconcile.body.writesPerformed,0);
  assert.equal(state.calls.some(call=>call[0]==='apply'),false);
});

test('Apply remains closed unless the source is quiesced and all traffic/cutover gates are off',async()=>{
  for(const overrides of [
    {quiesced:false},
    {quiesced:true,cutoverComplete:true},
    {quiesced:true,backendActive:true},
    {quiesced:true,preflight:{ok:false,blockers:['active_or_connecting_live_session']}}
  ]) {
    const state=fixture(overrides);
    const res=responseHarness();
    await state.app.handlers.get('POST /admin/wallet/backfill/apply')(
      request({collection:'wallets',confirmSourceProjectId:'smv-astro-staging'}),res
    );
    assert.equal(res.statusCode,409);
    assert.equal(state.calls.some(call=>call[0]==='apply'),false);
  }
});

test('Apply requires an explicit source project confirmation and then imports one staging page',async()=>{
  const state=fixture({quiesced:true});
  const denied=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/apply')(
    request({collection:'wallets'}),denied
  );
  assert.equal(denied.statusCode,400);
  assert.equal(denied.body.code,'BACKFILL_SOURCE_CONFIRMATION_REQUIRED');

  const allowed=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/apply')(
    request({collection:'wallets',confirmSourceProjectId:'smv-astro-staging',pageSize:25}),allowed
  );
  assert.equal(allowed.statusCode,200);
  assert.equal(allowed.body.mode,'staging_page_import');
  assert.equal(allowed.body.sourceDataDeleted,false);
  assert.equal(allowed.body.cutoverComplete,false);
  assert.equal(state.calls.filter(call=>call[0]==='apply').length,1);
});

test('reconciliation returns conflict rather than declaring a mismatched page safe',async()=>{
  const state=fixture({reconcile:{sourceDocuments:1,missingInD1Archive:1,payloadMismatches:0,normalizedMappingsMissing:0,warningCount:0,writesPerformed:0}});
  const res=responseHarness();
  await state.app.handlers.get('POST /admin/wallet/backfill/reconcile')(request({collection:'wallets'}),res);
  assert.equal(res.statusCode,409);
  assert.equal(res.body.success,false);
  assert.equal(res.body.cutoverSafe,false);
});

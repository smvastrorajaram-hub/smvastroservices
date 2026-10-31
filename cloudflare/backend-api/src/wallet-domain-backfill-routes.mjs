import { WALLET_DOMAIN_BACKFILL_COLLECTIONS } from '../../../shared/backend-platform/wallet-domain-backfill.mjs';

function replyError(res,error,fallback) {
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,
    error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'WALLET_BACKFILL_ERROR')
  });
}

function requestOptions(body={}) {
  const collection=String(body.collection||'').trim();
  if(!Object.prototype.hasOwnProperty.call(WALLET_DOMAIN_BACKFILL_COLLECTIONS,collection)) {
    throw Object.assign(new Error('Choose a supported Wallet/Live migration collection.'),{code:'BACKFILL_COLLECTION_UNSUPPORTED',httpStatus:400});
  }
  const pageSize=Number(body.pageSize??40);
  if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100) {
    throw Object.assign(new Error('Page size must be a whole number from 1 to 100.'),{code:'BACKFILL_PAGE_SIZE_INVALID',httpStatus:400});
  }
  const pageToken=String(body.pageToken||'');
  if(pageToken.length>4096) throw Object.assign(new Error('Page token is invalid.'),{code:'BACKFILL_PAGE_TOKEN_INVALID',httpStatus:400});
  const parentId=String(body.parentId||'').trim();
  if(parentId && !/^[A-Za-z0-9_-]{1,180}$/.test(parentId)) {
    throw Object.assign(new Error('Parent Live Session ID is invalid.'),{code:'BACKFILL_PARENT_INVALID',httpStatus:400});
  }
  if(['liveSessionMessages','liveSessionSignals'].includes(collection)&&!parentId) {
    throw Object.assign(new Error('A Live Session ID is required for child records.'),{code:'BACKFILL_PARENT_REQUIRED',httpStatus:400});
  }
  return {collection,pageSize,pageToken,parentId};
}

/**
 * Admin-only, resumable Firestore -> D1 import controls.
 * Preview/reconcile never write. Apply is limited to the explicit staging
 * environment and requires a quiesced source plus an incomplete cutover gate.
 */
export function registerWalletDomainBackfillRoutes({
  app,identityService,backfillService,firestore,
  toolsEnabled=false,environment='unknown',sourceProjectId='',
  quiesced=false,cutoverComplete=false,backendActive=false,
  isReady=async()=>false
}={}) {
  if(!app||typeof app.get!=='function'||typeof app.post!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'||
     !backfillService||typeof backfillService.previewPage!=='function'||
     typeof backfillService.applyPage!=='function'||
     typeof backfillService.reconcilePage!=='function'||
     typeof backfillService.status!=='function'||
     !firestore) {
    throw new TypeError('Wallet backfill routes require Admin identity, Firestore and D1 backfill services.');
  }

  async function requireAdmin(req) {
    const user=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(user.isAdmin!==true&&user.role!=='admin') {
      throw Object.assign(new Error('Admin access is required.'),{code:'ADMIN_REQUIRED',httpStatus:403});
    }
    return user;
  }

  async function requireToolsReady() {
    if(toolsEnabled!==true) {
      throw Object.assign(new Error('Wallet backfill tools are disabled.'),{code:'BACKFILL_TOOLS_DISABLED',httpStatus:503});
    }
    if(environment!=='staging'||String(sourceProjectId)!=='smv-astro-staging') {
      throw Object.assign(new Error('Backfill tooling is restricted to the isolated SMV ASTRO staging Firebase project.'),{code:'BACKFILL_STAGING_ONLY',httpStatus:403});
    }
    if(!(await isReady())) {
      throw Object.assign(new Error('D1 Wallet backfill schema 0005 is not ready.'),{code:'BACKFILL_SCHEMA_NOT_READY',httpStatus:503});
    }
  }

  async function requireApplyGate(req) {
    await requireToolsReady();
    if(quiesced!==true||cutoverComplete===true||backendActive===true) {
      throw Object.assign(new Error('Apply is blocked. Stop all source writers, confirm no active sessions/reservations/recharges, keep cutover incomplete and Cloudflare production traffic OFF.'),{code:'BACKFILL_APPLY_GATE_CLOSED',httpStatus:409});
    }
    const confirmation=String(req.body?.confirmSourceProjectId||'').trim();
    if(confirmation!==String(sourceProjectId)) {
      throw Object.assign(new Error('Explicit source Firebase project confirmation is required.'),{code:'BACKFILL_SOURCE_CONFIRMATION_REQUIRED',httpStatus:400});
    }
    const preflight=await backfillService.assertSourceQuiescent();
    if(!preflight.ok) {
      throw Object.assign(new Error('The source still has active sessions, pending bookings, reserved Wallet bookings or non-terminal recharges.'),{code:'BACKFILL_SOURCE_NOT_QUIESCENT',httpStatus:409,blockers:preflight.blockers});
    }
    return preflight;
  }

  app.get('/admin/wallet/backfill/status',async(req,res)=>{
    try {
      await requireAdmin(req);
      await requireToolsReady();
      const status=await backfillService.status();
      return res.set('Cache-Control','no-store').json({success:true,sourceProjectId,environment,applyEnabled:quiesced===true&&cutoverComplete!==true&&backendActive!==true,status});
    } catch(error) { return replyError(res,error,'Unable to load Wallet backfill status.'); }
  });

  app.post('/admin/wallet/backfill/preflight',async(req,res)=>{
    try {
      await requireAdmin(req);
      await requireToolsReady();
      const preflight=await backfillService.assertSourceQuiescent();
      return res.set('Cache-Control','no-store').json({
        success:true,sourceProjectId,environment,quiescent:preflight.ok,
        blockers:preflight.blockers,writesPerformed:0
      });
    } catch(error) { return replyError(res,error,'Unable to check Wallet backfill preflight.'); }
  });

  app.post('/admin/wallet/backfill/preview',async(req,res)=>{
    try {
      await requireAdmin(req);
      await requireToolsReady();
      const options=requestOptions(req.body||{});
      const result=await backfillService.previewPage(options);
      return res.set('Cache-Control','no-store').json({success:true,sourceProjectId,mode:'read_only_preview',...result});
    } catch(error) { return replyError(res,error,'Unable to preview legacy Wallet data.'); }
  });

  app.post('/admin/wallet/backfill/apply',async(req,res)=>{
    try {
      await requireAdmin(req);
      const preflight=await requireApplyGate(req);
      const options=requestOptions(req.body||{});
      const result=await backfillService.applyPage(options);
      return res.set('Cache-Control','no-store').json({
        success:true,sourceProjectId,mode:'staging_page_import',
        sourceQuiescent:preflight.ok,sourceDataDeleted:false,cutoverComplete:false,...result
      });
    } catch(error) {
      const response=replyError(res,error,'Unable to import the legacy Wallet data page.');
      if(error?.blockers) response.json({success:false,code:error.code||'BACKFILL_SOURCE_NOT_QUIESCENT',blockers:error.blockers});
      return response;
    }
  });

  app.post('/admin/wallet/backfill/reconcile',async(req,res)=>{
    try {
      await requireAdmin(req);
      await requireToolsReady();
      const options=requestOptions(req.body||{});
      const result=await backfillService.reconcilePage(options);
      const ok=result.missingInD1Archive===0&&result.payloadMismatches===0&&
        result.normalizedMappingsMissing===0&&result.warningCount===0;
      return res.status(ok?200:409).set('Cache-Control','no-store').json({
        success:ok,sourceProjectId,mode:'read_only_reconciliation',...result,
        cutoverSafe:false
      });
    } catch(error) { return replyError(res,error,'Unable to reconcile legacy Wallet data.'); }
  });

  return Object.freeze({paths:Object.freeze([
    '/admin/wallet/backfill/status','/admin/wallet/backfill/preflight',
    '/admin/wallet/backfill/preview','/admin/wallet/backfill/apply',
    '/admin/wallet/backfill/reconcile'
  ])});
}

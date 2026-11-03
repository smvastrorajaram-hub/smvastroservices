import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function millis(value) {
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
  if (value && typeof value.toDate === 'function') return value.toDate().getTime() || 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (value && typeof value === 'object') {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (Number.isFinite(seconds)) return seconds * 1000 + Math.floor((Number.isFinite(nanos) ? nanos : 0) / 1e6);
  }
  const result = typeof value === 'number' ? value : Date.parse(String(value || ''));
  return Number.isFinite(result) ? result : 0;
}
function newestFirst(items) {
  return [...items].sort((a,b) => Math.max(millis(b.updatedAt), millis(b.createdAt), millis(b.paidAt)) -
    Math.max(millis(a.updatedAt), millis(a.createdAt), millis(a.paidAt)));
}
function sendError(res,error,fallback) {
  const status=Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,
    error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'ADMIN_DASHBOARD_READ_FAILED')
  });
}

/** Admin-only dashboard and current-product settings reads; retired Horoscope/Private Consultation settings are excluded. */
export function registerAdminDashboardRoutes({app,firestore,identityService}={}) {
  if(!app||typeof app.get!=='function'||typeof firestore?.runQuery!=='function'||
     typeof firestore?.getDocument!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function') {
    throw new TypeError('Admin dashboard routes require verified identity and Firestore REST reads.');
  }

  async function requireAdmin(req) {
    const actor=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(actor.isAdmin!==true&&String(actor.role||'').toLowerCase()!=='admin') {
      throw Object.assign(new Error('Admin access denied.'),{code:'ADMIN_REQUIRED',httpStatus:403});
    }
    return actor;
  }
  async function readItems(collectionPath,options={}) {
    const documents=await firestore.runQuery({collectionPath,limit:options.limit||1000,...(options.filters?{filters:options.filters}:{})});
    return documents.map(document=>({id:document.id,...(document.data||{})}));
  }

  app.get('/admin/astrologers-data',async(req,res)=>{
    try {
      await requireAdmin(req);
      const [users,astrologers]=await Promise.all([
        readItems('smv_users',{limit:1000}),
        readItems('smv_astrologers',{limit:1000})
      ]);
      return res.set('Cache-Control','no-store').json({
        success:true,
        users:newestFirst(users),
        astrologers:newestFirst(astrologers),
        truncated:users.length===1000||astrologers.length===1000
      });
    } catch(error) {
      return sendError(res,error,'Unable to load Admin astrologer data.');
    }
  });

  app.get('/admin/settings-data',async(req,res)=>{
    try {
      await requireAdmin(req);
      const [commission,question,workflow,autoApproval]=await Promise.all([
        firestore.getDocument('smv_settings/commission'),
        firestore.getDocument('smv_settings/question'),
        firestore.getDocument('smv_settings/workflow'),
        firestore.getDocument('smv_settings/astrologerAutoApproval')
      ]);
      const val=snapshot=>snapshot.exists?snapshot.data||{}:null;
      const auto=val(autoApproval);
      return res.set('Cache-Control','no-store').json({
        success:true,
        settings:{
          commission:val(commission),
          question:val(question),
          workflow:val(workflow)||{allowWithoutAdminApproval:false},
          astrologerAutoApproval:auto?{
            enabled:auto.enabled===true,
            formUrl:String(auto.formUrl||''),
            syncWebAppUrl:String(auto.syncWebAppUrl||''),
            passMark:Math.max(1,Math.min(25,Number(auto.passMark||20)))
          }:null
        }
      });
    } catch(error) {
      return sendError(res,error,'Unable to load Admin settings.');
    }
  });

  app.get('/admin-data',async(req,res)=>{
    try {
      await requireAdmin(req);
      const [customers,astrologers,payments,commission,autoApproval]=await Promise.all([
        readItems('smv_users',{limit:1000,filters:[{field:'role',op:'==',value:'customer'}]}),
        readItems('smv_astrologers',{limit:1000}),
        readItems('smv_payments',{limit:1000,filters:[{field:'source',op:'==',value:'live_session'}]}),
        firestore.getDocument('smv_settings/commission'),
        firestore.getDocument('smv_settings/astrologerAutoApproval')
      ]);
      const pendingAstrologerUids=astrologers.filter(a=>String(a.status||'').toLowerCase()==='pending')
        .map(a=>String(a.uid||a.id||'')).filter(Boolean).slice(0,200);
      const contactProfiles=await Promise.all(pendingAstrologerUids.map(async uid=>{
        try {
          const snapshot=await firestore.getDocument('smv_users/'+uid);
          return [uid,snapshot.exists?snapshot.data||{}:{}];
        } catch {
          return [uid,{}];
        }
      }));
      const contacts=new Map(contactProfiles);
      const decorated=astrologers.map(a=>{
        if(String(a.status||'').toLowerCase()!=='pending')return a;
        const profile=contacts.get(String(a.uid||a.id||''))||{};
        return {...a,adminContactEmail:String(profile.email||''),adminContactMobile:String(profile.mobile||profile.phone||'')};
      });
      const auto=autoApproval.exists?autoApproval.data||{}:null;
      return res.set('Cache-Control','no-store').json({
        success:true,
        settings:{
          commission:commission.exists?commission.data||{}:null,
          astrologerAutoApproval:auto?{
            enabled:auto.enabled===true,formUrl:String(auto.formUrl||''),
            syncWebAppUrl:String(auto.syncWebAppUrl||''),passMark:Math.max(1,Math.min(25,Number(auto.passMark||20)))
          }:null
        },
        customerCount:customers.length,
        customerCountMayBeTruncated:customers.length===1000,
        astrologerCount:astrologers.length,
        astrologers:newestFirst(decorated),
        payments:newestFirst(payments),
        errors:{customers:null,astrologers:astrologers.length===1000?'Result capped at 1000 records.':null,payments:null}
      });
    } catch(error) {
      return sendError(res,error,'Unable to load Admin dashboard data.');
    }
  });

  return Object.freeze({paths:Object.freeze(['/admin/astrologers-data','/admin/settings-data','/admin-data'])});
}

import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res,error,fallback) {
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'ASTROLOGER_APPROVAL_FAILED')
  });
}
function uidOf(data,fallback=''){return String(data?.uid||fallback||'').trim();}
function validId(value){const id=String(value||'').trim();return id.length>0&&id.length<=200&&!id.includes('/')?id:'';}
function adminError(){return Object.assign(new Error('Admin access denied.'),{code:'ADMIN_REQUIRED',httpStatus:403});}

export function registerLegacyAstrologerApprovalRoutes({app,firestore,identityService}={}) {
  if(!app||typeof app.post!=='function'||typeof firestore?.runTransaction!=='function'||
     typeof firestore?.getDocument!=='function'||typeof firestore?.runQuery!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function') {
    throw new TypeError('Astrologer approval routes require Firestore transactions and verified identity.');
  }
  async function requireAdmin(req){
    const actor=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(actor.isAdmin!==true&&String(actor.role||'').toLowerCase()!=='admin')throw adminError();
    return actor;
  }

  app.post('/admin/approve-astrologer',async(req,res)=>{
    try {
      const actor=await requireAdmin(req);
      const astrologerId=validId(req.body?.astrologerId);
      if(!astrologerId)return res.status(400).set('Cache-Control','no-store').json({success:false,error:'A valid Astrologer profile ID is required.'});
      const result=await firestore.runTransaction(async tx=>{
        const astroPath='smv_astrologers/'+astrologerId;
        const astroSnapshot=await tx.getDocument(astroPath);
        if(!astroSnapshot.exists)throw Object.assign(new Error('Astrologer application not found.'),{code:'ASTROLOGER_NOT_FOUND',httpStatus:404});
        const astro=astroSnapshot.data||{};
        const uid=uidOf(astro,astroSnapshot.id);
        const status=String(astro.status||'').trim().toLowerCase();
        if(!uid||uid.length>128||uid.includes('/'))throw Object.assign(new Error('This Astrologer profile has no valid linked login UID.'),{code:'ASTROLOGER_UID_INVALID',httpStatus:409});
        if(!['pending','approved','active'].includes(status))throw Object.assign(new Error('This application is no longer pending.'),{code:'ASTROLOGER_STATUS_CHANGED',httpStatus:409});
        const userPath='smv_users/'+uid;
        const userSnapshot=await tx.getDocument(userPath);
        if(!userSnapshot.exists)throw Object.assign(new Error('Linked Firebase user profile is missing; Admin must verify the UID.'),{code:'ASTROLOGER_USER_PROFILE_MISSING',httpStatus:409});
        const timestamp=FirestoreFieldValue.serverTimestamp();
        const userProfile=userSnapshot.data||{};
        const userPatch={uid,role:'astrologer',status:'active',approvedAt:timestamp,updatedAt:timestamp};
        if(!userProfile.name&&astro.name)userPatch.name=String(astro.name);
        if(!userProfile.publicId&&astro.publicId)userPatch.publicId=String(astro.publicId);
        tx.set(astroPath,{uid,role:'astrologer',status:'approved',approvedAt:timestamp,approvedBy:String(actor.uid||''),updatedAt:timestamp},{merge:true});
        tx.set(userPath,userPatch,{merge:true});
        tx.set('smv_notifications/astro_approval_'+uid,{
          userId:uid,type:'approval',title:'Astrologer application approved',
          message:'Your profile has been approved by Admin.',
          astrologerId,createdAt:timestamp,read:false
        },{merge:true});
        tx.set('smv_admin_audit/ASTROLOGER_APPROVED_'+uid,{
          action:'ASTROLOGER_APPROVED',targetUid:uid,actorUid:String(actor.uid||''),createdAt:timestamp
        },{merge:true});
        return {uid,status:'approved'};
      });
      return res.set('Cache-Control','no-store').json({success:true,astrologerId,uid:result.uid,status:result.status});
    } catch(error) {
      return sendError(res,error,'Unable to approve the Astrologer application. No partial profile changes were committed.');
    }
  });

  app.post('/admin/reject-astrologer',async(req,res)=>{
    try {
      const actor=await requireAdmin(req);
      const astrologerId=validId(req.body?.astrologerId);
      const reason=String(req.body?.reason||'').trim();
      if(!astrologerId)return res.status(400).set('Cache-Control','no-store').json({success:false,error:'A valid Astrologer profile ID is required.'});
      if(!reason||reason.length>2000)return res.status(400).set('Cache-Control','no-store').json({success:false,error:'Enter a rejection reason of up to 2000 characters.'});
      const result=await firestore.runTransaction(async tx=>{
        const astroPath='smv_astrologers/'+astrologerId;
        const snapshot=await tx.getDocument(astroPath);
        if(!snapshot.exists)throw Object.assign(new Error('Astrologer application not found.'),{code:'ASTROLOGER_NOT_FOUND',httpStatus:404});
        const astro=snapshot.data||{};
        const uid=uidOf(astro,snapshot.id);
        if(!uid||uid.length>128||uid.includes('/'))throw Object.assign(new Error('This Astrologer profile has no valid linked login UID.'),{code:'ASTROLOGER_UID_INVALID',httpStatus:409});
        if(String(astro.status||'').trim().toLowerCase()!=='pending')throw Object.assign(new Error('This application is no longer pending.'),{code:'ASTROLOGER_STATUS_CHANGED',httpStatus:409});
        const userPath='smv_users/'+uid;
        const userSnapshot=await tx.getDocument(userPath);
        const timestamp=FirestoreFieldValue.serverTimestamp();
        tx.set(astroPath,{uid,role:'astrologer',status:'rejected',rejectionReason:reason,rejectedAt:timestamp,rejectedBy:String(actor.uid||''),updatedAt:timestamp},{merge:true});
        if(userSnapshot.exists)tx.set(userPath,{uid,role:'astrologer',status:'rejected',updatedAt:timestamp},{merge:true});
        tx.set('smv_notifications/astro_rejection_'+uid,{
          userId:uid,type:'rejection',title:'Astrologer application requires changes',
          message:reason,astrologerId,createdAt:timestamp,read:false
        },{merge:true});
        tx.set('smv_admin_audit/ASTROLOGER_REJECTED_'+uid,{
          action:'ASTROLOGER_REJECTED',targetUid:uid,actorUid:String(actor.uid||''),details:{reason},createdAt:timestamp
        },{merge:true});
        return {uid};
      });
      return res.set('Cache-Control','no-store').json({success:true,astrologerId,uid:result.uid,status:'rejected'});
    } catch(error) {
      return sendError(res,error,'Unable to reject the Astrologer application. No partial changes were committed.');
    }
  });

  app.post('/astrologer/sync-approval',async(req,res)=>{
    try {
      const user=await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid=String(user.uid||'').trim();
      if(!uid)return res.status(401).set('Cache-Control','no-store').json({success:false,error:'Authentication required.'});
      const profileSnapshot=await firestore.getDocument('smv_users/'+uid);
      const profile=profileSnapshot.data||{};
      const publicId=String(profile.publicId||'').trim();
      const result=await firestore.runTransaction(async tx=>{
        const paths=new Set();
        const recordData=new Map();
        for(const collection of ['smv_astrologers','smv_astrologer']){
          const direct=await tx.getDocument(collection+'/'+uid);
          if(direct.exists&&(!direct.data?.uid||String(direct.data.uid)===uid)){
            paths.add(collection+'/'+uid);recordData.set(collection+'/'+uid,direct.data||{});
          }
          const byUid=await tx.query({collectionPath:collection,filters:[{field:'uid',op:'==',value:uid}],limit:25});
          for(const row of byUid){
            if(!row.data?.uid||String(row.data.uid)===uid){paths.add(collection+'/'+row.id);recordData.set(collection+'/'+row.id,row.data||{});}
          }
          if(publicId){
            const byPublicId=await tx.query({collectionPath:collection,filters:[{field:'publicId',op:'==',value:publicId}],limit:10});
            for(const row of byPublicId){
              if(String(row.data?.publicId||'')===publicId&&(!row.data?.uid||String(row.data.uid)===uid)){
                paths.add(collection+'/'+row.id);recordData.set(collection+'/'+row.id,row.data||{});
              }
            }
          }
        }
        const records=[...paths].map(path=>({path,data:recordData.get(path)||{}}));
        const approved=records.find(record=>['approved','active'].includes(String(record.data.status||'').trim().toLowerCase()));
        const current=records.find(record=>record.path==='smv_astrologers/'+uid)||records[0];
        if(!approved)return {approved:false,status:String(current?.data?.status||profile.status||'pending').toLowerCase(),count:records.length};
        const canonicalPath='smv_astrologers/'+uid;
        const canonical=await tx.getDocument(canonicalPath);
        if(canonical.exists&&canonical.data?.uid&&String(canonical.data.uid)!==uid){
          throw Object.assign(new Error('Canonical Astrologer UID does not match the signed-in account. Admin repair is required.'),{code:'ASTROLOGER_CANONICAL_UID_MISMATCH',httpStatus:409});
        }
        const price=Number(approved.data.pricePerQuestion??approved.data.chatPrice??0);
        const timestamp=FirestoreFieldValue.serverTimestamp();
        const patch={uid,role:'astrologer',status:'approved',approvedAt:approved.data.approvedAt||timestamp,updatedAt:timestamp};
        if(Number.isFinite(price)&&price>0)patch.pricePerQuestion=price;
        if(approved.data.approvedBy)patch.approvedBy=approved.data.approvedBy;
        tx.set(canonicalPath,{...approved.data,...patch},{merge:true});
        for(const record of records)tx.set(record.path,patch,{merge:true});
        tx.set('smv_users/'+uid,{uid,role:'astrologer',status:'active',approvedAt:patch.approvedAt,updatedAt:timestamp},{merge:true});
        return {approved:true,status:'approved',count:records.length,price:Number.isFinite(price)&&price>0?price:null};
      });
      return res.set('Cache-Control','no-store').json({success:true,approved:result.approved,status:result.status,pricePerQuestion:result.price??null,reconciledProfiles:result.count});
    } catch(error) {
      return sendError(res,error,'Unable to refresh the Astrologer approval state. Please try again.');
    }
  });

  return Object.freeze({paths:Object.freeze(['/admin/approve-astrologer','/admin/reject-astrologer','/astrologer/sync-approval'])});
}

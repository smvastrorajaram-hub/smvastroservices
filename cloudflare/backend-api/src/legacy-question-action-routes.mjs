import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res,error,fallback){
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'QUESTION_ACTION_FAILED')
  });
}
function uidOf(user){return String(user?.uid||'').trim();}
function validQuestionId(value){const id=String(value||'').trim();return id&&id.length<=200&&!id.includes('/')?id:'';}
function splitCommission(amount,percent){
  const astro=Math.round(amount*percent)/100;
  return {astro,admin:Math.round((amount-astro)*100)/100};
}

export function registerLegacyQuestionActionRoutes({app,firestore,identityService}={}){
  if(!app||typeof app.post!=='function'||typeof firestore?.runTransaction!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'){
    throw new TypeError('Question action routes require Firestore Admin transactions and verified identity.');
  }
  async function requireAdmin(req){
    const actor=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(actor.isAdmin!==true&&String(actor.role||'').toLowerCase()!=='admin'){
      throw Object.assign(new Error('Admin access denied.'),{code:'ADMIN_REQUIRED',httpStatus:403});
    }
    return actor;
  }

  app.post('/admin/set-open-workflow',async(req,res)=>{
    try{
      const actor=await requireAdmin(req);
      const allow=req.body?.allowWithoutAdminApproval===true;
      const outcome=await firestore.runTransaction(async tx=>{
        const query=allow
          ? await tx.query({collectionPath:'smv_questions',filters:[{field:'status',op:'in',value:['pending_admin_approval','paid']}],limit:450})
          : await tx.query({collectionPath:'smv_questions',filters:[{field:'status',op:'==',value:'available_to_astrologers'}],limit:450});
        if(query.length>=450){
          throw Object.assign(new Error('More than 449 questions match this workflow update. No records were changed; process them in bounded batches first.'),{
            code:'QUESTION_WORKFLOW_BATCH_LIMIT',httpStatus:409
          });
        }
        let opened=0,closed=0;
        const timestamp=FirestoreFieldValue.serverTimestamp();
        for(const document of query){
          const question=document.data||{};
          if(allow){
            if(question.paymentStatus==='paid'&&!question.astrologerId&&
               ['pending_admin_approval','paid'].includes(String(question.status||''))){
              tx.update('smv_questions/'+document.id,{
                status:'available_to_astrologers',
                allocationStatus:'available_to_astrologers',
                adminApprovalBypassed:true,
                openedToAstrologersAt:timestamp,
                updatedAt:timestamp
              });
              opened++;
            }
          }else if(question.paymentStatus==='paid'&&!question.astrologerId&&
                   String(question.status||'')==='available_to_astrologers'){
            tx.update('smv_questions/'+document.id,{
              status:'pending_admin_approval',
              allocationStatus:'awaiting_admin',
              adminApprovalBypassed:false,
              updatedAt:timestamp
            });
            closed++;
          }
        }
        tx.set('smv_settings/workflow',{
          allowWithoutAdminApproval:allow,
          updatedAt:timestamp,
          updatedBy:uidOf(actor)
        },{merge:true});
        tx.set('smv_admin_audit/OPEN_WORKFLOW',{
          action:allow?'OPEN_WORKFLOW_ENABLED':'OPEN_WORKFLOW_DISABLED',
          actorUid:uidOf(actor),
          details:{opened,closed},
          createdAt:timestamp
        },{merge:true});
        return {opened,closed};
      });
      return res.set('Cache-Control','no-store').json({
        success:true,allowWithoutAdminApproval:allow,...outcome
      });
    }catch(error){
      return sendError(res,error,'Unable to update the question workflow.');
    }
  });

  app.post('/astrologer/claim-question',async(req,res)=>{
    try{
      const user=await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid=uidOf(user);
      if(!uid)return res.status(401).set('Cache-Control','no-store').json({error:'Authentication required.'});
      const questionId=validQuestionId(req.body?.questionId);
      if(!questionId)return res.status(400).set('Cache-Control','no-store').json({error:'Question ID is required.'});
      const result=await firestore.runTransaction(async tx=>{
        const [questionSnapshot,astroSnapshot,workflowSnapshot,commissionSnapshot]=await Promise.all([
          tx.getDocument('smv_questions/'+questionId),
          tx.getDocument('smv_astrologers/'+uid),
          tx.getDocument('smv_settings/workflow'),
          tx.getDocument('smv_settings/commission')
        ]);
        if(!questionSnapshot.exists)throw Object.assign(new Error('Question not found.'),{code:'QUESTION_NOT_FOUND',httpStatus:404});
        if(!astroSnapshot.exists||String(astroSnapshot.data?.status||'').toLowerCase()!=='approved'){
          throw Object.assign(new Error('Your Astrologer profile is not approved.'),{code:'ASTROLOGER_NOT_APPROVED',httpStatus:403});
        }
        const question=questionSnapshot.data||{};
        const workflow=workflowSnapshot.data||{};
        const allow=workflow.allowWithoutAdminApproval===true;
        const isOpen=allow&&!question.astrologerId&&question.paymentStatus==='paid'&&
          String(question.status||'')==='available_to_astrologers'&&
          String(question.allocationStatus||'')==='available_to_astrologers';
        const isAllocated=String(question.astrologerId||'')===uid&&!!question.adminQuestionApprovedAt&&
          ['paid','admin_approved'].includes(String(question.status||''))&&
          ['assigned_to_astrologer','available_to_astrologers','reallocated','claimed_by_astrologer'].includes(String(question.allocationStatus||''));
        if(!isOpen&&!isAllocated){
          throw Object.assign(new Error('This question is no longer available to claim.'),{code:'QUESTION_NOT_AVAILABLE',httpStatus:409});
        }
        const configuredDefault=Number(commissionSnapshot.data?.astroPercent??20);
        const defaultPercent=Number.isFinite(configuredDefault)&&configuredDefault>=0&&configuredDefault<=100?configuredDefault:20;
        const percent=Number(question.commissionPercent??question.commissionRate??defaultPercent);
        const amount=Number(question.amount||0);
        if(!Number.isFinite(percent)||percent<0||percent>100||!Number.isFinite(amount)||amount<=0){
          throw Object.assign(new Error('Question payment or commission details are invalid.'),{code:'QUESTION_COMMISSION_INVALID',httpStatus:409});
        }
        const split=splitCommission(amount,percent);
        const astrologerName=String(astroSnapshot.data?.name||'Astrologer');
        const timestamp=FirestoreFieldValue.serverTimestamp();
        tx.update('smv_questions/'+questionId,{
          status:'admin_approved',
          allocationStatus:'claimed_by_astrologer',
          astrologerId:uid,
          astrologerName,
          claimedAt:timestamp,
          claimedBy:uid,
          commissionPercent:percent,
          commissionRate:percent,
          astrologerCommissionAmount:split.astro,
          adminCommissionAmount:split.admin,
          adminApprovalBypassed:isOpen||question.adminApprovalBypassed===true,
          updatedAt:timestamp
        });
        return {questionId,astrologerId:uid,astrologerName,commissionPercent:percent,astrologerCommissionAmount:split.astro};
      });
      return res.set('Cache-Control','no-store').json({success:true,...result,status:'admin_approved',allocationStatus:'claimed_by_astrologer'});
    }catch(error){
      return sendError(res,error,'Unable to claim this question.');
    }
  });

  return Object.freeze({paths:Object.freeze(['/admin/set-open-workflow','/astrologer/claim-question'])});
}

import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function apiError(message,httpStatus=409,code='ANSWER_CREDIT_FAILED'){
  return Object.assign(new Error(message),{httpStatus,code});
}
function millis(value){
  if(!value)return 0;
  if(typeof value.toMillis==='function')return Number(value.toMillis())||0;
  if(typeof value.toDate==='function')return value.toDate().getTime()||0;
  if(value instanceof Date)return value.getTime()||0;
  if(typeof value==='object'&&(value.seconds??value._seconds)!=null)return Number(value.seconds??value._seconds)*1000;
  const result=typeof value==='number'?value:Date.parse(String(value));
  return Number.isFinite(result)?result:0;
}
function money(value){const amount=Number(value);return Number.isFinite(amount)?Math.round(amount*100)/100:NaN;}

export function createPublicAnswerCreditService({firestore,now=Date.now}={}){
  if(!firestore||typeof firestore.runTransaction!=='function')throw new TypeError('Answer credit requires Firestore transaction support.');
  async function settle(questionId,{customerId}={}){
    const id=String(questionId||'').trim();
    const uid=String(customerId||'').trim();
    if(!id||id.length>200||id.includes('/')||!uid)throw apiError('Question ID and Customer identity are required.',400,'ANSWER_CREDIT_INPUT_INVALID');
    return firestore.runTransaction(async tx=>{
      const questionPath='smv_questions/'+id;
      const snapshot=await tx.getDocument(questionPath);
      if(!snapshot.exists)throw apiError('Answer not found.',404,'ANSWER_NOT_FOUND');
      const question=snapshot.data||{};
      if(String(question.customerId||'')!==uid)throw apiError('You do not own this answer.',403,'ANSWER_CUSTOMER_MISMATCH');
      if(String(question.status||'')!=='answered'||!String(question.answer||'').trim()||
         question.refundId||String(question.paymentStatus||'')!=='paid'){
        throw apiError('Answer is not ready to view.',409,'ANSWER_NOT_READY');
      }

      const alreadyViewed=Boolean(question.customerAnswerViewedAt);
      const patch={updatedAt:FirestoreFieldValue.serverTimestamp()};
      if(!alreadyViewed){
        patch.customerAnswerViewedAt=FirestoreFieldValue.serverTimestamp();
        patch.customerViewStatus='viewed';
      }

      if(String(question.commissionStatus||'')==='credited'||!question.astrologerId||
         question.adminAnswered===true||String(question.answerAuthorType||'')==='admin'){
        if(!alreadyViewed)tx.update(questionPath,patch);
        return {credited:false,already:true,commissionAmount:0};
      }

      const astrologerAmount=money(question.astrologerCommissionAmount??question.commissionAmount);
      const grossAmount=money(question.amount??question.paymentAmount);
      const adminAmount=money(grossAmount-astrologerAmount);
      const percent=Number(question.commissionPercent??question.commissionRate??0);
      if(!Number.isFinite(astrologerAmount)||astrologerAmount<0||
         !Number.isFinite(grossAmount)||grossAmount<=0||
         !Number.isFinite(adminAmount)||adminAmount<0||
         !Number.isFinite(percent)||percent<0||percent>100){
        throw apiError('Saved commission amounts are invalid. Admin reconciliation is required.',409,'ANSWER_COMMISSION_INVALID');
      }

      const paymentId=String(question.astrologerPaymentId||'SMV-Q-EARN-'+id);
      const earningPath='smv_payments/'+paymentId;
      const prior=await tx.getDocument(earningPath);
      if(prior.exists){
        const existing=prior.data||{};
        if(String(existing.questionId||'')!==id||
           String(existing.astrologerId||'')!==String(question.astrologerId)||
           money(existing.earningAmount??existing.commissionAmount)!==astrologerAmount){
          throw apiError('An existing earning ledger entry conflicts with this question. Admin reconciliation is required.',409,'ANSWER_CREDIT_LEDGER_CONFLICT');
        }
      }

      const timestamp=FirestoreFieldValue.serverTimestamp();
      if(!prior.exists){
        tx.create(earningPath,{
          paymentId,
          type:'astrologer_earning',
          source:'customer_answer_view',
          customerId:uid,
          astrologerId:String(question.astrologerId),
          questionId:id,
          question:String(question.question||'Consultation'),
          grossAmount,
          commissionPercent:percent,
          commissionAmount:astrologerAmount,
          earningAmount:astrologerAmount,
          adminCommissionAmount:adminAmount,
          status:'credited',
          paymentStatus:'pending_withdrawal',
          createdAt:timestamp,
          updatedAt:timestamp
        });
      }
      Object.assign(patch,{
        commissionStatus:'credited',
        commissionCreditedAt:timestamp,
        commissionCreditReason:'customer_view',
        astrologerPaymentId:paymentId,
        astrologerCreditedAmount:astrologerAmount,
        adminCommissionStatus:'credited',
        adminCommissionCreditedAt:timestamp,
        adminCreditedAmount:adminAmount
      });
      tx.update(questionPath,patch);
      if(!prior.exists){
        tx.create('smv_notifications/answer-credit-public-'+id,{
          userId:String(question.astrologerId),
          type:'earning_credited',
          title:'Earning Credited',
          message:'Customer viewed your answer. ₹'+astrologerAmount.toFixed(2)+' has been credited.',
          questionId:id,
          commissionAmount:astrologerAmount,
          createdAt:timestamp,
          read:false
        });
      }
      tx.set('smv_settings/dashboardChange',{
        category:'answer_credit',path:questionPath,updatedAt:timestamp
      },{merge:true});
      return {credited:!prior.exists,commissionAmount:astrologerAmount,astrologerAmount,adminAmount};
    });
  }
  return Object.freeze({settle});
}

/** Customer-owned answer view + atomic public Q&A commission settlement. */
export function registerCustomerAnswerCreditRoute({app,firestore,identityService,now=Date.now}={}){
  if(!app||typeof app.post!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'){
    throw new TypeError('Answer view route requires verified Firebase identity.');
  }
  const service=createPublicAnswerCreditService({firestore,now});
  app.post('/customer/mark-answer-viewed',async(req,res)=>{
    try{
      const user=await identityService.authenticateAuthorization(req.get('Authorization'));
      const questionId=String(req.body?.questionId||'').trim();
      if(!questionId)return res.status(400).set('Cache-Control','no-store').json({error:'Answer ID is required.'});
      const result=await service.settle(questionId,{customerId:user.uid});
      return res.set('Cache-Control','no-store').json({
        success:true,questionId,viewed:true,...result
      });
    }catch(error){
      return res.status(Number(error?.httpStatus)||500).set('Cache-Control','no-store').json({
        success:false,error:Number(error?.httpStatus)>=500?'Unable to mark answer viewed and settle commission.':String(error?.message||'Unable to mark answer viewed.'),
        code:String(error?.code||'ANSWER_CREDIT_FAILED')
      });
    }
  });
  return Object.freeze({paths:Object.freeze(['/customer/mark-answer-viewed']),service});
}

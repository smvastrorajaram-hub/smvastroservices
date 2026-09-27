const crypto=require('crypto');
function bankReferences(refund,old={}){
 const a=refund?.acquirer_data||{};
 return {refundRrn:a.rrn||refund?.rrn||old.refundRrn||null,refundArn:a.arn||old.refundArn||null,refundUtr:a.utr||old.refundUtr||null,refundBankReference:a.bank_reference_number||a.reference_number||old.refundBankReference||null};
}
function createRefundService({db,razorpay,FieldValue,keyId,keySecret,fetchImpl=fetch}){
 const now=()=>FieldValue.serverTimestamp();
 const fail=(message,status=409)=>{throw Object.assign(new Error(message),{httpStatus:status});};
 async function save(ref,q,r){
  if(!r?.id||String(r.payment_id)!==String(q.razorpayPaymentId))fail('Refund payment ID does not match this question.');
  const status=String(r.status||'pending').toLowerCase();
  const patch={refundId:r.id,refundPaymentId:r.payment_id,refundAmount:Number(r.amount)/100,refundStatus:status,...bankReferences(r,q),refundCreatedAt:q.refundCreatedAt||(r.created_at?new Date(Number(r.created_at)*1000):now()),refundSyncedAt:now(),refundBusyUntil:0,updatedAt:now()};
  if(status==='processed')patch.refundProcessedAt=q.refundProcessedAt||now();
  if(status==='failed'){patch.refundFailedAt=q.refundFailedAt||now();patch.refundError=r.error_description||r.error?.description||q.refundError||'Razorpay reports that this refund failed. Review it in Razorpay; a second refund is not created automatically.';}
  else{patch.refundError=FieldValue.delete();patch.refundErrorCode=FieldValue.delete();}
  await ref.set(patch,{merge:true});return {success:true,questionId:ref.id,refundId:r.id,refundStatus:status,refundAmount:patch.refundAmount,...bankReferences(r,q),refundCreatedAt:patch.refundCreatedAt,refundProcessedAt:patch.refundProcessedAt||q.refundProcessedAt||null};
 }
 async function notify(q,user,id,result){
  // Notification failures must never turn a completed refund into a failed response.
  try{
   const state=result.refundStatus||'failed';
   for(const uid of new Set([q.customerId,user.uid].filter(Boolean))){
    await db.collection('smv_notifications').doc(`refund_${id}_${uid}_${state}`).set({userId:uid,type:'refund_update',title:'Refund update',message:`Question ${id}: refund ${state}. ${result.refundError||''}`,questionId:id,refundId:result.refundId||null,refundStatus:state,refundRrn:result.refundRrn||null,refundCreatedAt:result.refundCreatedAt||q.refundCreatedAt||null,refundProcessedAt:result.refundProcessedAt||null,createdAt:result.refundProcessedAt||result.refundCreatedAt||result.refundEventAt||q.refundLastAttemptAt||now(),updatedAt:now(),read:false},{merge:true});
   }
   if(q.astrologerId)await db.collection('smv_notifications').doc(`refund_closed_${id}_${q.astrologerId}`).set({userId:q.astrologerId,type:'question_rejected',title:'Question closed by Admin',message:'This question has been rejected by Admin and is no longer available for answering.',questionId:id,createdAt:q.refundRequestedAt||now(),read:false},{merge:true});
  }catch(e){console.warn('Refund notification could not be saved:',e.message);} 
 }
 async function sync(questionId,user,{customer=false}={}){
  const ref=db.collection('smv_questions').doc(questionId),snap=await ref.get();if(!snap.exists)fail('Question not found.',404);
  const q=snap.data();if(customer&&q.customerId!==user.uid)fail('Access denied.',403);
  if(!q.refundId)fail('No refund ID exists. Admin can use Retry refund to validate the payment and try again.');
  const r=await razorpay.refunds.fetch(q.refundId);const result=await save(ref,q,r);await notify(q,user,questionId,result);return result;
 }
 async function reject(questionId,reason,user,{retry=false}={}){
  const ref=db.collection('smv_questions').doc(questionId);let q;
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);if(!snap.exists)fail('Question not found.',404);q=snap.data();
   const closed=['question_rejected','admin_rejected'].includes(q.status);
   if(retry&&!closed)fail('Only a rejected question can be retried.');
   if(!reason&&!q.refundReason)fail('Enter a rejection reason.',400);
   if(Number(q.refundBusyUntil||0)>Date.now())fail('A refund request is already running. Wait and refresh its status.');
   if(!q.customerId||!(q.razorpayPaymentId||q.customerPaymentId||q.paymentStatus==='paid'))fail('This question has no recorded payment.');
   const credited=q.commissionStatus==='credited';
   tx.update(ref,{status:'question_rejected',allocationStatus:'rejected_by_admin',adminQuestionRejectedAt:q.adminQuestionRejectedAt||now(),adminQuestionRejectedBy:user.uid,adminQuestionRejectionReason:reason||q.refundReason,refundReason:reason||q.refundReason,refundPreviousStatus:q.refundPreviousStatus||q.status,refundRequestedAt:q.refundRequestedAt||now(),refundLastAttemptAt:now(),refundBusyUntil:Date.now()+90000,refundStatus:q.refundId?q.refundStatus:'pending',refundAmount:Number(q.amount||q.paymentAmount||0),refundEligible:true,refundCommissionReviewRequired:credited||q.refundCommissionReviewRequired||false,...(credited?{}:{commissionStatus:'refund_pending'}),updatedAt:now()});
  });
  try{
   if(q.refundId){const result=await save(ref,q,await razorpay.refunds.fetch(q.refundId));await notify(q,user,questionId,result);return result;}
   const paymentId=String(q.razorpayPaymentId||'');
   if(!/^pay_[A-Za-z0-9]+$/.test(paymentId))fail('Real Razorpay payment ID is missing. The SMV-PAY reference cannot be used to issue a refund.');
   let payment;
   try{payment=await razorpay.payments.fetch(paymentId);}catch(e){fail('Razorpay payment lookup failed. Check the same account and mode used for this payment. Old Test payments cannot be refunded with Live keys. '+String(e?.error?.description||e.message||''),502);}
   if(q.razorpayOrderId&&payment.order_id!==q.razorpayOrderId)fail('Payment and question order IDs do not match.');
   const amount=Math.round(Number(q.amount||q.paymentAmount||0)*100);
   if(!Number.isSafeInteger(amount)||amount<100||amount>Number(payment.amount)||payment.currency!=='INR')fail('The recorded refund amount does not match the INR payment.');
   // Reconcile earlier successes first, including refunds whose response was lost.
   const refunds=[];
   for(let skip=0;;skip+=100){const page=await razorpay.payments.fetchMultipleRefund(paymentId,{count:100,skip});if(!Array.isArray(page.items))fail('Razorpay did not return a valid refund list.');refunds.push(...page.items);if(page.items.length<100)break;if(skip>=9900)fail('Refund history needs manual review.');}
   const prior=refunds.find(r=>Number(r.amount)===amount&&r.status!=='failed');
   if(prior){const result=await save(ref,q,prior);await notify(q,user,questionId,result);return result;}
   if(payment.status!=='captured')fail('Payment is not captured, or is already refunded. Review its Razorpay status: '+payment.status);
   if(Number(payment.amount_refunded||0)>0||refunds.some(r=>r.status!=='failed'))fail('This payment already has another or partial refund. Review it before requesting more money.');
   // Stable payload + documented header make repeat requests idempotent.
   const digest=crypto.createHash('sha256').update(questionId+':'+paymentId+':'+amount).digest('hex').slice(0,32);
   const idempotencyKey='smv-refund-'+digest;
   const body=JSON.stringify({amount,speed:'normal',receipt:'SMV-'+digest,notes:{questionId}});
   await ref.set({refundIdempotencyKey:idempotencyKey,refundRequestAmountPaise:amount},{merge:true});
   const response=await fetchImpl('https://api.razorpay.com/v1/payments/'+encodeURIComponent(paymentId)+'/refund',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(keyId+':'+keySecret).toString('base64'),'Content-Type':'application/json','X-Refund-Idempotency':idempotencyKey},body,signal:AbortSignal.timeout(25000)});
   const r=await response.json();if(!response.ok)throw Object.assign(new Error(r?.error?.description||'Razorpay refund request failed.'),{refundCode:r?.error?.code,httpStatus:502});
   const result=await save(ref,q,r);await notify(q,user,questionId,result);return result;
  }catch(e){
   const uncertain=e.name==='AbortError'||e.name==='TimeoutError'||e.name==='TypeError';
   const rawDescription=String(e?.error?.description||e?.description||e?.message||'Refund failed.').trim();
   const rawCode=String(e?.refundCode||e?.error?.code||e?.code||'REFUND_REVIEW_REQUIRED').trim();
   const rawReason=String(e?.error?.reason||e?.reason||'').trim();
   const rawSource=String(e?.error?.source||e?.source||'').trim();
   const rawStep=String(e?.error?.step||e?.step||'').trim();
   const insufficientBalance=/not have enough balance|insufficient.{0,20}balance|balance.{0,20}insufficient/i.test(rawDescription+' '+rawReason);
   // Razorpay cannot create a refund (and therefore cannot issue an RRN) until
   // the merchant account has sufficient refundable balance. Keep this state
   // retriable instead of permanently marking it as a generic failure.
   const refundStatus=q.refundId?(q.refundStatus||'pending'):(uncertain?'pending':(insufficientBalance?'waiting_balance':'failed'));
   const message=uncertain
    ?'Razorpay response was not received. Retry refund will reconcile any existing refund before creating another request.'
    :insufficientBalance
      ?'Refund is waiting for sufficient Razorpay account balance. Add/receive sufficient balance in the same Razorpay mode/account, then use Retry Refund. RRN/ARN is issued only after Razorpay creates/processes the refund.'
      :rawDescription;
   const patch={refundStatus,refundError:message,refundErrorCode:rawCode,refundErrorReason:rawReason||FieldValue.delete(),refundErrorSource:rawSource||FieldValue.delete(),refundErrorStep:rawStep||FieldValue.delete(),refundErrorStatusCode:Number(e?.statusCode||e?.status||0)||FieldValue.delete(),refundPendingReason:insufficientBalance?'insufficient_balance':FieldValue.delete(),refundLastAttemptAt:now(),refundFailedAt:(uncertain||insufficientBalance)?(q.refundFailedAt||FieldValue.delete()):now(),refundBusyUntil:0,updatedAt:now()};
   await ref.set(patch,{merge:true});
   const result={success:false,questionId,refundStatus,refundEventAt:now(),refundError:message,error:message,refundErrorCode:rawCode,refundPendingReason:insufficientBalance?'insufficient_balance':null};await notify(q,user,questionId,result);return result;
  }
 }
 return {reject,sync};
}
module.exports={createRefundService,bankReferences};

'use strict';
const DAY=24*60*60*1000;
function millis(value){if(!value)return 0;if(typeof value.toMillis==='function')return value.toMillis();if(value.seconds||value._seconds)return Number(value.seconds||value._seconds)*1000;return new Date(value).getTime()||0;}
function availableAt(q){return millis(q.answerAvailableAt||q.answerApprovedAt||q.adminAnswerApprovedAt||q.answerSubmittedAt);}
module.exports=function createAnswerCredit({db,FieldValue,privateAmounts}){
 const error=(message,httpStatus=409)=>Object.assign(new Error(message),{httpStatus});
 async function settle(kind,id,{customerId,automatic=false,now=Date.now()}={}){
  const privateQuestion=kind==='private';
  const ref=db.collection(privateQuestion?'smv_private_consultations':'smv_questions').doc(id);
  return db.runTransaction(async tx=>{
   const snap=await tx.get(ref);if(!snap.exists)throw error('Answer not found.',404);
   const q=snap.data();const viewedKey=privateQuestion?'customerViewedAt':'customerAnswerViewedAt';
   if(!automatic&&q.customerId!==customerId)throw error('You do not own this answer.',403);
   if(q.status!=='answered'||!String(q.answer||'').trim()||q.refundId||q.paymentStatus!=='paid'||(privateQuestion&&q.answerStatus!=='approved')){
    if(automatic)return {skipped:true};throw error('Answer is not ready to view.');
   }
   if(automatic&&(!availableAt(q)||now-availableAt(q)<DAY))return {skipped:true};
   const stamp=()=>FieldValue.serverTimestamp();
   const patch={updatedAt:stamp()};
   if(!automatic){patch[viewedKey]=q[viewedKey]||stamp();patch.customerViewStatus='viewed';}
   if(q.commissionStatus==='credited'||!q.astrologerId||q.adminAnswered||q.answerAuthorType==='admin'){
    if(!automatic){tx.update(ref,patch);viewNotice(tx,q,kind,id,viewedKey);}return {credited:false,already:true};
   }
   let amount,adminAmount,rate;
   if(privateQuestion){const amounts=await privateAmounts(q);amount=amounts.astrologerAmount;adminAmount=amounts.adminAmount;rate=amounts.privateAstrologerCommissionRate;}
   else {amount=Number(q.astrologerCommissionAmount??q.commissionAmount);adminAmount=Math.round((Number(q.amount)-amount)*100)/100;rate=Number(q.commissionPercent??q.commissionRate??0);}
   if(!Number.isFinite(amount)||amount<0||!Number.isFinite(adminAmount)||adminAmount<0)throw error('Invalid saved commission amounts.');
   // Stable ledger key plus transaction prevents duplicate manual/automatic credits.
   const paymentId=q.astrologerPaymentId||(privateQuestion?'SMV-PC-EARN-':'SMV-Q-EARN-')+id;
   const earning=db.collection('smv_payments').doc(paymentId);const prior=await tx.get(earning);
   if(!prior.exists)tx.set(earning,{paymentId,type:'astrologer_earning',source:automatic?'answer_timeout_24h':(privateQuestion?'private_consultation_customer_view':'customer_answer_view'),customerId:q.customerId,astrologerId:q.astrologerId,questionId:privateQuestion?null:id,consultationId:privateQuestion?id:null,question:q.question||'Consultation',grossAmount:Number(q.chatPrice??q.amount??0),commissionPercent:rate,commissionAmount:amount,earningAmount:amount,adminCommissionAmount:adminAmount,status:'credited',paymentStatus:'pending_withdrawal',createdAt:stamp(),updatedAt:stamp()});
   Object.assign(patch,{commissionStatus:'credited',commissionCreditedAt:stamp(),commissionCreditReason:automatic?'timeout_24h':'customer_view',astrologerPaymentId:paymentId,astrologerCreditedAmount:amount,adminCommissionStatus:'credited',adminCommissionCreditedAt:stamp(),adminCreditedAmount:adminAmount});
   if(privateQuestion)Object.assign(patch,{astrologerAmount:amount,adminAmount,privateAstrologerCommissionRate:rate});
   tx.update(ref,patch);
   if(!automatic)viewNotice(tx,q,kind,id,viewedKey);
   if(!prior.exists)tx.set(db.collection('smv_notifications').doc('answer-credit-'+kind+'-'+id),{userId:q.astrologerId,type:privateQuestion?'private_earning_credited':'earning_credited',title:automatic?(privateQuestion?'Private Consultation Commission Credited':'Astrologer Commission Credited'):(privateQuestion?'Private Consultation Earning Credited':'Earning Credited'),message:automatic?`24-hour automatic settlement completed. ₹${amount.toFixed(2)} astrologer commission has been credited.`:`Customer viewed your answer. ₹${amount.toFixed(2)} has been credited.`,questionId:privateQuestion?null:id,consultationId:privateQuestion?id:null,commissionAmount:amount,createdAt:stamp(),read:false});
   if(privateQuestion&&!prior.exists)tx.set(db.collection('smv_admin_notifications').doc('answer-credit-private-'+id),{type:'private_commission_credited',title:'Private Consultation Commission Credited',message:`${automatic?'24-hour automatic credit':'Customer viewed answer'}: Astrologer ₹${amount.toFixed(2)} / Admin ₹${adminAmount.toFixed(2)}.`,consultationId:id,source:'private_consultation',createdAt:stamp(),read:false});
   tx.set(db.collection('smv_settings').doc('dashboardChange'),{category:'answer_credit',path:ref.path,updatedAt:stamp()},{merge:true});
   return {credited:!prior.exists,commissionAmount:amount,astrologerAmount:amount,adminAmount};
  });
 }
 function viewNotice(tx,q,kind,id,viewedKey){
  if(q[viewedKey]||kind!=='private')return;
  const data={type:'private_answer_viewed',title:'Private Answer Viewed',message:`${q.customerName||'Customer'} viewed the approved answer.`,consultationId:id,source:'private_consultation',createdAt:FieldValue.serverTimestamp(),read:false};
  if(q.astrologerId)tx.set(db.collection('smv_notifications').doc('answer-view-private-'+id),{...data,userId:q.astrologerId});
  tx.set(db.collection('smv_admin_notifications').doc('answer-view-private-'+id),data);
 }
 let running=false;
 async function sweep(){
  if(running)return;running=true;
  try{for(const kind of ['public','private']){
   let last=null;
   for(;;){let query=db.collection(kind==='private'?'smv_private_consultations':'smv_questions').where('commissionStatus','==','pending_customer_view').limit(200);if(last)query=query.startAfter(last);
    const page=await query.get();for(const doc of page.docs){const q=doc.data();if(q.status==='answered'&&availableAt(q)&&Date.now()-availableAt(q)>=DAY)try{await settle(kind,doc.id,{automatic:true});}catch(e){console.error('Answer credit failed:',e.message);}}
    if(page.size<200)break;last=page.docs[page.docs.length-1];
   }
  }}finally{running=false;}
 }
 function start(){sweep().catch(e=>console.error('Answer credit sweep:',e.message));const timer=setInterval(()=>sweep().catch(e=>console.error('Answer credit sweep:',e.message)),15*60*1000);timer.unref?.();return timer;}
 return {settle,sweep,start};
};
module.exports.availableAt=availableAt;

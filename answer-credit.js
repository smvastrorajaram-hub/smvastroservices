'use strict';
const DAY=24*60*60*1000;
const {walletLedgerDocId}=require('./wallet-service');
function millis(value){if(!value)return 0;if(typeof value.toMillis==='function')return value.toMillis();if(value.seconds||value._seconds)return Number(value.seconds||value._seconds)*1000;return new Date(value).getTime()||0;}
function availableAt(q){return millis(q.answerAvailableAt||q.answerApprovedAt||q.adminAnswerApprovedAt||q.answerSubmittedAt);}
module.exports=function createAnswerCredit({db,FieldValue,privateAmounts,publicAmounts,adminUid}){
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
   if(privateQuestion){
    const amounts=await privateAmounts(q);amount=amounts.astrologerAmount;adminAmount=amounts.adminAmount;rate=amounts.privateAstrologerCommissionRate;
   }else if(typeof publicAmounts==='function'){
    const amounts=await publicAmounts(q);amount=amounts.astrologerAmount;adminAmount=amounts.adminAmount;rate=amounts.commissionRate;
   }else{
    amount=Number(q.astrologerCommissionAmount??q.commissionAmount);adminAmount=Math.round((Number(q.amount)-amount)*100)/100;rate=Number(q.commissionPercent??q.commissionRate??0);
   }
   if(!Number.isFinite(amount)||amount<0||!Number.isFinite(adminAmount)||adminAmount<0)throw error('Invalid saved commission amounts.');
   // Stable ledger key plus transaction prevents duplicate manual/automatic credits.
   const paymentId=q.astrologerPaymentId||(privateQuestion?'SMV-PC-EARN-':'SMV-Q-EARN-')+id;
   const earning=db.collection('smv_payments').doc(paymentId),prior=await tx.get(earning);
   let walletCredit={astro:false,admin:false};
   if(!prior.exists){
     const adminOwner=String(adminUid||'').trim();
     if(!adminOwner)throw error('Admin Wallet owner is not configured; earning settlement was not posted.',503);
     const astroUid=String(q.astrologerId||'').trim();
     const astroPaise=Math.round(amount*100),adminPaise=Math.round(adminAmount*100);
     const astroWalletRef=db.collection('smv_wallets').doc(astroUid);
     const adminWalletRef=db.collection('smv_wallets').doc(adminOwner);
     const astroLedgerRef=db.collection('smv_wallet_transactions').doc(walletLedgerDocId('consultation_earning',astroUid+':'+paymentId));
     const adminLedgerRef=db.collection('smv_wallet_transactions').doc(walletLedgerDocId('service_revenue',adminOwner+':'+paymentId));
     const [astroWalletSnap,adminWalletSnap,astroLedgerSnap,adminLedgerSnap]=await Promise.all([
       tx.get(astroWalletRef),tx.get(adminWalletRef),tx.get(astroLedgerRef),tx.get(adminLedgerRef)
     ]);
     if(astroLedgerSnap.exists||adminLedgerSnap.exists)throw error('Wallet ledger is inconsistent with the earning record. Admin reconciliation is required.',503);
     const astroWallet=astroWalletSnap.exists?astroWalletSnap.data()||{}:{};
     const adminWallet=adminWalletSnap.exists?adminWalletSnap.data()||{}:{};
     const astroAvailable=Math.max(0,Number(astroWallet.availableBalancePaise||0)),adminAvailable=Math.max(0,Number(adminWallet.availableBalancePaise||0));
     const astroNext=astroAvailable+Math.max(0,astroPaise),adminNext=adminAvailable+Math.max(0,adminPaise);
     if(!Number.isSafeInteger(astroNext)||!Number.isSafeInteger(adminNext))throw error('Wallet balance is outside the supported range.',503);
     const now=stamp();
     tx.set(earning,{paymentId,type:'astrologer_earning',source:automatic?'answer_timeout_24h':(privateQuestion?'private_consultation_customer_view':'customer_answer_view'),customerId:q.customerId,astrologerId:q.astrologerId,questionId:privateQuestion?null:id,consultationId:privateQuestion?id:null,question:q.question||'Consultation',grossAmount:Number(q.chatPrice??q.amount??0),commissionPercent:rate,commissionAmount:amount,earningAmount:amount,adminCommissionAmount:adminAmount,status:'credited',paymentStatus:'pending_withdrawal',createdAt:now,updatedAt:now});
     if(astroPaise>0){
       tx.set(astroWalletRef,{ownerUid:astroUid,ownerRole:'astrologer',currency:'INR',availableBalancePaise:astroNext,reservedBalancePaise:Math.max(0,Number(astroWallet.reservedBalancePaise||0)),freeSecondsBalance:Math.max(0,Number(astroWallet.freeSecondsBalance||0)),version:Math.max(0,Number(astroWallet.version||0))+1,createdAt:astroWallet.createdAt||now,updatedAt:now},{merge:true});
       tx.create(astroLedgerRef,{ownerUid:astroUid,ownerRole:'astrologer',currency:'INR',type:'consultation_earning',direction:'credit',amountPaise:astroPaise,balanceAfterPaise:astroNext,reservedBalanceAfterPaise:Math.max(0,Number(astroWallet.reservedBalancePaise||0)),idempotencyKey:paymentId,referenceType:privateQuestion?'private_consultation':'ask_now',referenceId:id,note:'Consultation earning credited to Wallet',status:'posted',createdAt:now});
       walletCredit.astro=true;
     }
     if(adminPaise>0){
       tx.set(adminWalletRef,{ownerUid:adminOwner,ownerRole:'admin',currency:'INR',availableBalancePaise:adminNext,reservedBalancePaise:Math.max(0,Number(adminWallet.reservedBalancePaise||0)),freeSecondsBalance:Math.max(0,Number(adminWallet.freeSecondsBalance||0)),version:Math.max(0,Number(adminWallet.version||0))+1,createdAt:adminWallet.createdAt||now,updatedAt:now},{merge:true});
       tx.create(adminLedgerRef,{ownerUid:adminOwner,ownerRole:'admin',currency:'INR',type:'service_revenue',direction:'credit',amountPaise:adminPaise,balanceAfterPaise:adminNext,reservedBalanceAfterPaise:Math.max(0,Number(adminWallet.reservedBalancePaise||0)),idempotencyKey:paymentId,referenceType:privateQuestion?'private_consultation':'ask_now',referenceId:id,note:'Service revenue credited to Admin Wallet',status:'posted',createdAt:now});
       walletCredit.admin=true;
     }
   }
   Object.assign(patch,{commissionStatus:'credited',commissionCreditedAt:stamp(),commissionCreditReason:automatic?'timeout_24h':'customer_view',astrologerPaymentId:paymentId,astrologerCreditedAmount:amount,adminCommissionStatus:'credited',adminCommissionCreditedAt:stamp(),adminCreditedAmount:adminAmount});
   if(privateQuestion)Object.assign(patch,{astrologerAmount:amount,adminAmount,privateAstrologerCommissionRate:rate});
   else Object.assign(patch,{astrologerCommissionAmount:amount,commissionAmount:amount,adminCommissionAmount:adminAmount,commissionPercent:rate,commissionRate:rate});
   tx.update(ref,patch);
   if(!automatic)viewNotice(tx,q,kind,id,viewedKey);
   if(!prior.exists)tx.set(db.collection('smv_notifications').doc('answer-credit-'+kind+'-'+id),{userId:q.astrologerId,type:privateQuestion?'private_earning_credited':'earning_credited',title:'Earning Added to Wallet',message:automatic?`The consultation was settled after the 24-hour review window. ₹${amount.toFixed(2)} has been credited to your Wallet.`:`₹${amount.toFixed(2)} has been credited to your Wallet.`,questionId:privateQuestion?null:id,consultationId:privateQuestion?id:null,createdAt:stamp(),read:false});
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

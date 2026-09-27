/* A receipt is shown only from a successful server verification response.
   No Firestore reads, polling, DOM observers, or persisted success guesses. */
(function(){
 'use strict';
 let receipt=null,timer=null,busy=false;
 const panel=()=>document.getElementById('paymentSuccessPanel');
 const text=(id,value)=>{document.getElementById(id).textContent=String(value||'');};
 async function continueToQuestion(){
  if(!receipt||busy)return;
  clearTimeout(timer);busy=true;
  const button=document.getElementById('continueAfterPayment');
  button.disabled=true;button.textContent='OPENING YOUR QUESTION…';
  text('paymentReceiptStatus','Payment verified. Opening your question…');
  try{
   if(window.__smvFirebaseCurrentUser?.uid!==receipt.uid)throw new Error('Please sign in with the customer account used for this payment.');
   window.__smvPaymentTarget={kind:receipt.kind,id:receipt.id};
   await window.__smvRefreshDashboard();
   const target=Array.from(document.querySelectorAll('[data-smv-question-id]')).find(el=>el.dataset.smvQuestionId===receipt.id&&el.dataset.smvService===receipt.kind);
   if(!target)throw new Error('Payment is successful. Your question could not be displayed yet. Please retry opening the dashboard; do not pay again.');
   // Expand only this question's existing DOM section, without fetching data.
   for(let el=target.parentElement;el&&el!==document.body;el=el.parentElement){
    const toggle=el.classList.contains('smv-v172-collapsed')?el.querySelector(':scope > .smv-v172-collapse-btn'):el.querySelector(':scope > h3 button[aria-expanded="false"],:scope > button[aria-expanded="false"]');
    if(toggle)toggle.click();
    el.classList.remove('smv-v170-collapsed','smv-v172-collapsed');
   }
   panel().close();receipt=null;
   const url=new URL(location.href);url.hash='dashboard';url.searchParams.delete('view');
   history.replaceState({smvView:'dashboard'},'',url);
   target.setAttribute('tabindex','-1');target.setAttribute('aria-label','Paid question');
   requestAnimationFrame(()=>{target.scrollIntoView({behavior:'auto',block:'center'});target.focus({preventScroll:true});});
  }catch(error){text('paymentReceiptStatus',error.message||'Payment is successful. Please retry opening your dashboard.');}
  finally{busy=false;button.disabled=false;button.textContent='VIEW MY QUESTION';}
 }
 window.__smvShowVerifiedPayment=function(result,kind='public'){
  const id=String((kind==='private'?result?.consultationId:result?.questionId)||'');
  const uid=window.__smvFirebaseCurrentUser?.uid;
  if(result?.verified!==true||!id||!result.paymentId||!uid)throw new Error('Verified payment receipt is incomplete. Use your dashboard to check this payment.');
  clearTimeout(timer);receipt={uid,id,kind};busy=false;
  text('paymentReceiptQuestionLabel',kind==='private'?'Private Question / Consultation ID':'Question ID');
  text('paymentReceiptQuestionId',id);text('paymentReceiptPaymentId',result.paymentId);
  text('paymentReceiptReference',result.customerPaymentId||'');
  document.getElementById('paymentReceiptReferenceRow').hidden=!result.customerPaymentId;
  text('paymentReceiptDate',new Date(result.paymentRecordedAt||Date.now()).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST');
  text('paymentReceiptStatus','Payment successful. Your question is saved. Opening your dashboard in 8 seconds.');
  const button=document.getElementById('continueAfterPayment');button.disabled=false;button.textContent='VIEW MY QUESTION';button.onclick=continueToQuestion;
  panel().showModal();
  history.pushState({smvView:'payment-receipt'},'',location.href);
  timer=setTimeout(continueToQuestion,8000);
 };
 panel()?.addEventListener('cancel',event=>{event.preventDefault();continueToQuestion();});
 window.addEventListener('popstate',()=>{if(receipt)continueToQuestion();});
 window.addEventListener('smv:logged-out',()=>{clearTimeout(timer);receipt=null;window.__smvPaymentTarget=null;panel()?.close();});
})();

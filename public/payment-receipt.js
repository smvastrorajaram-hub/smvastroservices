/* SMV V195 payment-window + verified receipt flow.
   - Opens a dedicated payment window/tab from the user's click.
   - Mobile loading/receipt uses a true full-screen layout (no tiny desktop card first).
   - After verified success, the opener switches to Customer Dashboard immediately;
     dashboard hydration continues in the background and the payment tab closes.
   - No polling, MutationObserver, or speculative success state. */
(function(){
 'use strict';
 let receipt=null,timer=null,busy=false,activeFlow=null;
 const $=id=>document.getElementById(id);
 const safeText=(id,value)=>{const el=$(id);if(el)el.textContent=String(value??'');return el;};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isMobile=()=>matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
 function popupHtml(kind,mobile){
  const label=kind==='private'?'Private Consultation':'Ask Now Question';
  const mobileClass=mobile?' smv-mobile-payment':'';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"><title>SMV ASTRO Payment</title><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fffaf3;color:#241b16}body{display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom))}.card{width:min(94vw,430px);border:1px solid #e6d3b1;border-radius:20px;background:#fffaf3;box-shadow:0 14px 38px #0002;padding:26px 22px;text-align:center}.brand{font-weight:900;color:#8f134a;letter-spacing:.4px;font-size:24px}.kind{margin-top:4px;color:#6b584b;font-weight:700}.spin{width:36px;height:36px;border:4px solid #e5dfd7;border-top-color:#8f134a;border-radius:50%;margin:20px auto;animation:r .9s linear infinite}@keyframes r{to{transform:rotate(360deg)}}#status{font-weight:700;line-height:1.5;margin:0}.receipt{display:none;text-align:left;margin-top:18px;border-top:1px solid #e8d9c3;padding-top:16px}.receipt h2{margin:0 0 14px;text-align:center;color:#166534}.row{display:grid;grid-template-columns:120px 1fr;gap:8px;padding:6px 0;border-bottom:1px dashed #eadfce}.row b{color:#5d4637}.row span{overflow-wrap:anywhere}.note{margin:14px 0 0;text-align:center;color:#5f5f5f;font-size:14px}.error{color:#a40000}
  body.smv-mobile-payment{display:block!important;padding:0!important;overflow:auto!important;background:#fffaf3!important}body.smv-mobile-payment .card{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;min-height:100vh!important;min-height:100dvh!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:max(28px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(28px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left))!important;display:flex!important;flex-direction:column!important;justify-content:center!important;text-align:center!important}body.smv-mobile-payment .brand{font-size:clamp(25px,7vw,34px)!important}body.smv-mobile-payment .kind{font-size:clamp(16px,4.5vw,21px)!important}body.smv-mobile-payment #status{font-size:clamp(15px,4vw,19px)!important}body.smv-mobile-payment .receipt{width:min(100%,620px)!important;margin:20px auto 0!important}body.smv-mobile-payment .receipt h2{font-size:clamp(26px,7vw,36px)!important}body.smv-mobile-payment .row{grid-template-columns:1fr!important;text-align:left!important;font-size:clamp(16px,4.3vw,20px)!important;padding:10px 0!important}body.smv-mobile-payment .note{font-size:clamp(15px,4vw,18px)!important}
  @media(max-width:520px){body:not(.smv-mobile-payment){padding:14px}body:not(.smv-mobile-payment) .card{width:100%;padding:24px 18px}body:not(.smv-mobile-payment) .row{grid-template-columns:1fr}body:not(.smv-mobile-payment) .row b{margin-bottom:-4px}}
  </style></head><body class="${mobileClass.trim()}"><main class="card"><div class="brand">SMV ASTRO</div><div class="kind">${esc(label)}</div><div id="loader"><div class="spin" aria-hidden="true"></div><p id="status">Connecting to Payment Gateway…</p></div><section id="receipt" class="receipt"><h2>Payment Successful ✓</h2><div class="row"><b id="idLabel">Question ID</b><span id="questionId"></span></div><div class="row"><b>Payment ID</b><span id="paymentId"></span></div><div class="row"><b>Date & Time</b><span id="paymentDate"></span></div><p class="note" id="next">Opening your Customer Dashboard…</p></section></main></body></html>`;
 }
 function makeFlow(kind){
  let w=null;
  const mobile=isMobile();
  try{
   const features=mobile?'noopener=no,resizable=yes,scrollbars=yes':(()=>{const width=480,height=680,left=Math.max(0,(screen.availWidth-width)/2),top=Math.max(0,(screen.availHeight-height)/2);return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;})();
   // V195: never reuse a previous Razorpay checkout browsing context.
   // A completed payment tab can later become the Customer Dashboard; reusing the
   // same named window and rewriting its document can leave Razorpay's previous
   // checkout frame/contentWindow stale and trigger a false "browser not supported".
   const paymentWindowName='SMVPaymentWindow_'+Date.now()+'_'+Math.floor(performance.now());
   w=window.open('about:blank', paymentWindowName, features);
   if(w){w.document.open();w.document.write(popupHtml(kind,mobile));w.document.close();w.focus();}
  }catch(_e){w=null;}
  const target=()=>w&&!w.closed?w:null;
  const status=(message,isError=false)=>{
   const t=target();
   if(t){const el=t.document.getElementById('status');if(el){el.textContent=String(message||'');el.classList.toggle('error',!!isError);}try{t.focus();}catch{}}
  };
  const next=message=>{const t=target();const el=t?.document?.getElementById('next');if(el)el.textContent=String(message||'');};
  const ensureRazorpay=async()=>{
   const t=target()||window;
   if(t.Razorpay)return t;
   await new Promise((resolve,reject)=>{
    const d=t.document;let s=d.querySelector('script[data-smv-razorpay]');
    if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',()=>reject(Error('Payment Gateway could not load.')),{once:true});return;}
    s=d.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.dataset.smvRazorpay='1';s.onload=resolve;s.onerror=()=>reject(Error('Payment Gateway could not load.'));d.head.appendChild(s);
   });
   if(!t.Razorpay)throw Error('Payment Gateway is unavailable.');
   return t;
  };
  const success=({id,paymentId,date,kind:successKind})=>{
   const t=target();if(!t)return false;
   const d=t.document;const loader=d.getElementById('loader'),r=d.getElementById('receipt');
   if(loader)loader.style.display='none';if(r)r.style.display='block';
   const lab=d.getElementById('idLabel');if(lab)lab.textContent=successKind==='private'?'Private Consultation ID':'Question ID';
   const q=d.getElementById('questionId');if(q)q.textContent=String(id||'');
   const p=d.getElementById('paymentId');if(p)p.textContent=String(paymentId||'');
   const dt=d.getElementById('paymentDate');if(dt)dt.textContent=String(date||'');
   try{t.focus();}catch{} return true;
  };
  const error=message=>status(message||'Payment was not completed.',true);
  const close=()=>{try{if(target())w.close();}catch{} if(activeFlow?.window===w)activeFlow=null;};
  return {kind,window:w,status,next,error,success,close,ensureRazorpay,get target(){return target();}};
 }
 window.__smvStartPaymentWindow=function(kind='public'){
  try{activeFlow?.close?.();}catch{}
  activeFlow=makeFlow(kind);return activeFlow;
 };
 function findReceiptTarget(){
  if(!receipt)return null;
  return Array.from(document.querySelectorAll('[data-smv-question-id]')).find(el=>el.dataset.smvQuestionId===receipt.id&&el.dataset.smvService===receipt.kind)||null;
 }
 function revealReceiptTarget(target){
  if(!target)return false;
  for(let el=target.parentElement;el&&el!==document.body;el=el.parentElement){
   const toggle=el.classList.contains('smv-v172-collapsed')?el.querySelector(':scope > .smv-v172-collapse-btn'):el.querySelector(':scope > h3 button[aria-expanded="false"],:scope > button[aria-expanded="false"]');
   if(toggle)toggle.click();el.classList.remove('smv-v170-collapsed','smv-v172-collapsed');
  }
  target.setAttribute('tabindex','-1');target.setAttribute('aria-label','Paid question');
  requestAnimationFrame(()=>{target.scrollIntoView({behavior:'auto',block:'center'});try{target.focus({preventScroll:true});}catch{}});
  return true;
 }
 async function continueToQuestion(){
  if(!receipt||busy)return;
  clearTimeout(timer);busy=true;
  const currentReceipt=receipt;
  const flow=currentReceipt.flow||activeFlow;
  flow?.next?.('Opening your Customer Dashboard…');
  safeText('paymentReceiptStatus','Payment verified. Opening your question…');
  try{
   if(window.__smvFirebaseCurrentUser?.uid!==currentReceipt.uid)throw new Error('Please sign in with the customer account used for this payment.');
   window.__smvPaymentTarget={kind:currentReceipt.kind,id:currentReceipt.id};
   if(currentReceipt.kind==='public'){
    try{sessionStorage.setItem('smv_last_payment_success',JSON.stringify({customerUid:currentReceipt.uid,questionId:currentReceipt.id,paymentId:currentReceipt.paymentId||'',paymentDate:currentReceipt.date||''}));}catch(_e){}
   }
   const url=new URL(location.href);url.hash='dashboard';url.searchParams.delete('view');history.replaceState({smvView:'dashboard'},'',url);

   // Mobile-safe continuation: the same payment tab that shows the verified
   // receipt becomes the Customer Dashboard. Android Chrome does not reliably
   // close/focus async popup tabs after Razorpay, so do not depend on window.close().
   const paymentTab=flow?.target;
   if(paymentTab){
    try{
     const returnUrl=new URL(location.href);
     returnUrl.hash='dashboard';
     returnUrl.searchParams.set('smvPaymentReturn','1');
     returnUrl.searchParams.set('smvService',currentReceipt.kind);
     returnUrl.searchParams.set('smvTargetId',currentReceipt.id);
     returnUrl.searchParams.set('smvPaymentId',currentReceipt.paymentId||'');
     flow?.next?.('Opening your Customer Dashboard…');
     setTimeout(()=>{
      try{ paymentTab.location.replace(returnUrl.toString()); }
      catch(_e){ paymentTab.location.href=returnUrl.toString(); }
     },350);
     receipt=null;activeFlow=null;
     const panel=$('paymentSuccessPanel');try{panel?.close?.();}catch{}
     return;
    }catch(navErr){
     console.warn('Payment-tab dashboard redirect fallback:',navErr);
    }
   }

   // Popup-blocked/fallback path: switch the current app tab to Dashboard and
   // reveal the exact paid row after hydration.
   let refreshPromise=null;
   try{refreshPromise=window.__smvRefreshDashboard?.();}catch(err){refreshPromise=Promise.reject(err);}
   try{window.focus();}catch{}
   Promise.resolve(refreshPromise).then(async()=>{
    let target=findReceiptTarget();
    for(let attempt=0;attempt<8&&!target;attempt++){
     await new Promise(r=>setTimeout(r,300));
     target=findReceiptTarget();
    }
    if(target)revealReceiptTarget(target);
    else{
     const heading=currentReceipt.kind==='private'?document.querySelector('.customer-private-consultations-title'):document.querySelector('.customer-consultations-title');
     heading?.scrollIntoView?.({behavior:'auto',block:'start'});
    }
   }).catch(err=>console.warn('Paid dashboard refresh delayed:',err));

   receipt=null;activeFlow=null;
   const panel=$('paymentSuccessPanel');try{panel?.close?.();}catch{}
  }catch(error){
   flow?.error?.(error.message||'Payment is successful. Open Customer Dashboard to view your question.');
   safeText('paymentReceiptStatus',error.message||'Payment is successful. Open Customer Dashboard to view your question.');
  }finally{busy=false;}
 }
 window.__smvShowVerifiedPayment=function(result,kind='public',flow=activeFlow){
  const id=String((kind==='private'?result?.consultationId:result?.questionId)||'').trim();
  const paymentId=String(result?.paymentId||result?.customerPaymentId||result?.razorpayPaymentId||'').trim();
  const uid=window.__smvFirebaseCurrentUser?.uid;
  if(result?.verified!==true||!id||!paymentId||!uid)throw new Error('Verified payment receipt is incomplete. Use your dashboard to check this payment; do not pay again.');
  clearTimeout(timer);busy=false;
  const date=new Date(result.paymentRecordedAt||Date.now()).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST';
  receipt={uid,id,kind,flow,paymentId,date};
  if(flow?.success?.({id,paymentId,date,kind})){timer=setTimeout(continueToQuestion,2200);return;}
  safeText('paymentReceiptQuestionLabel',kind==='private'?'Private Consultation ID':'Question ID');safeText('paymentReceiptQuestionId',id);safeText('paymentReceiptPaymentId',paymentId);safeText('paymentReceiptReference',result.customerPaymentId||'');
  const row=$('paymentReceiptReferenceRow');if(row)row.hidden=!result.customerPaymentId;safeText('paymentReceiptDate',date);safeText('paymentReceiptStatus','Payment successful. Opening your Customer Dashboard…');
  const button=$('continueAfterPayment');if(button){button.disabled=false;button.textContent='VIEW MY QUESTION';button.onclick=continueToQuestion;}
  const panel=$('paymentSuccessPanel');if(panel?.showModal){try{panel.showModal();}catch{}}
  timer=setTimeout(continueToQuestion,2200);
 };
 $('paymentSuccessPanel')?.addEventListener('cancel',event=>{event.preventDefault();continueToQuestion();});
 window.addEventListener('popstate',()=>{if(receipt)continueToQuestion();});
 window.addEventListener('smv:logged-out',()=>{clearTimeout(timer);receipt=null;window.__smvPaymentTarget=null;try{activeFlow?.close?.();}catch{}activeFlow=null;try{$('paymentSuccessPanel')?.close?.();}catch{}});
})();

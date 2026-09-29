// SMV ASTRO merged frontend application module
// Consolidated: dashboard-live.mjs + admin-workflows.mjs + app.mjs


// Unified dashboard typography stylesheet. Loaded after the legacy stylesheet so
// Customer, Astrologer and Admin dashboards share one predictable hierarchy.
(function loadDashboardTypography(){
  if(document.querySelector('link[data-smv-dashboard-typography]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='dashboard-typography.css?v=76';
  link.dataset.smvDashboardTypography='true';
  document.head.appendChild(link);
})();

// Coalesce updates, serialize requests and retain edits until a safe refresh.
function createRefreshQueue({run,canRun,onPending=()=>{},onError=()=>{},delay=120}){
 let pending=false,running=false,timer=null,stopped=false;
 async function flush(){
  clearTimeout(timer);timer=null;
  if(stopped||running||!pending)return;
  if(!canRun()){onPending();return;}
  pending=false;running=true;
  try{await run();}catch(e){onError(e);}finally{running=false;if(pending&&!stopped)timer=setTimeout(flush,delay);}
 }
 return {request(){if(stopped)return;pending=true;clearTimeout(timer);timer=setTimeout(flush,delay);},resume(){if(pending)flush();},stop(){stopped=true;pending=false;clearTimeout(timer);},get pending(){return pending;}};
}

// Authenticated fetch stream: only invalidations, never account data or tokens in URLs.
function watchDashboardEvents({url,getToken,onChange,onStatus,isVisible=()=>true}){
 let stopped=false,controller=null,timer=null,retry=0;
 async function connect(){
  if(stopped)return;
  if(!isVisible()){timer=setTimeout(connect,1500);return;}
  controller=new AbortController();
  try{
   const token=await getToken();if(stopped)return;
   const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'text/event-stream'},cache:'no-store',signal:controller.signal});
   if(!response.ok||!response.body)throw new Error('Live connection unavailable');
   retry=0;onStatus('Live updates connected');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(!stopped){
    const {done,value}=await reader.read();if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    let end;while((end=buffer.indexOf('\n\n'))!==-1){
     const event=buffer.slice(0,end);buffer=buffer.slice(end+2);
     if(/^event: (change|ready)$/m.test(event))onChange();
    }
   }
  }catch(e){if(!stopped&&e.name!=='AbortError'){onStatus('Reconnecting live updates…');onChange();}}
  finally{if(!stopped){retry++;timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(retry,4)));}}
 }
 connect();return ()=>{stopped=true;clearTimeout(timer);controller?.abort();};
}


// Shared Tamil/English admin controls. All changes use authenticated backend APIs.
function renderAdminWorkflows({data, api, refresh, lang, escape: esc, date}) {
  const ta=lang==='ta', t=(en,taText)=>ta?taText:en;
  const rows=(data.questions||[]).slice().sort((a,b)=>stamp(b)-stamp(a));
  function stamp(q){const v=q.updatedAt||q.createdAt;return Number(v?._seconds||v?.seconds||0)*1000||Date.parse(v)||0;}
  const rejected=q=>['question_rejected','admin_rejected'].includes(q.status);
  const open=q=>!rejected(q)&&q.status!=='answered'&&(q.paymentStatus==='paid'||q.customerPaymentId||q.razorpayPaymentId||['paid','pending_admin_approval','admin_approved','assigned_to_astrologer','available_to_astrologers','claimed_by_astrologer','processing','answer_draft','admin_review','revision_required'].includes(q.status));
  const astros=(data.astrologers||[]).filter(a=>a.status==='approved');
  const statuses={paid:t('Paid','கட்டணம் பெறப்பட்டது'),pending_admin_approval:t('Awaiting question approval','கேள்வி அங்கீகாரத்திற்குக் காத்திருக்கிறது'),admin_approved:t('Approved','அங்கீகரிக்கப்பட்டது'),processing:t('Answer awaiting review','பதில் பரிசீலனையில் உள்ளது'),admin_review:t('Answer awaiting review','பதில் பரிசீலனையில் உள்ளது'),answer_draft:t('Answer awaiting review','பதில் பரிசீலனையில் உள்ளது'),revision_required:t('Revision requested','பதில் திருத்தம் கோரப்பட்டுள்ளது'),answered:t('Answered','பதிலளிக்கப்பட்டது'),question_rejected:t('Question rejected','கேள்வி நிராகரிக்கப்பட்டது'),admin_rejected:t('Question rejected','கேள்வி நிராகரிக்கப்பட்டது'),pending:t('Pending','நிலுவையில் உள்ளது'),created:t('Created','உருவாக்கப்பட்டது'),initiated:t('Initiated','தொடங்கப்பட்டது'),processing_refund:t('Processing','செயலாக்கத்தில் உள்ளது'),processed:t('Refund processed','பணத்திருப்பம் செயலாக்கப்பட்டது'),completed:t('Completed','முடிந்தது'),waiting_balance:t('Waiting for Razorpay balance — retry required','Razorpay இருப்புத் தொகைக்காக காத்திருக்கிறது — மீண்டும் முயற்சி தேவை'),failed:t('Failed — admin action required','தோல்வி — நிர்வாக நடவடிக்கை தேவை'),available_to_astrologers:t('Open to astrologers','ஜோதிடர்களுக்குக் கிடைக்கிறது'),claimed_by_astrologer:t('Claimed by astrologer','ஜோதிடர் ஏற்றுக்கொண்டார்'),assigned_to_astrologer:t('Allocated','ஒதுக்கப்பட்டது'),awaiting_payment:t('Awaiting payment','கட்டணத்திற்குக் காத்திருக்கிறது'),payment_failed:t('Payment failed','கட்டணம் தோல்வியடைந்தது')};
  const label=s=>statuses[s]||s||t('Pending','நிலுவையில் உள்ளது');
  function button(action,en,tamil){return `<button type="button" class="btn" data-workflow="${action}">${t(en,tamil)}</button>`;}
  function card(q,mode){
    const id=String(q.id||q.questionId||''), assigned=!!q.astrologerId;
    const amount=Number(q.amount||q.paymentAmount||0);
    const birth=q.birthDetails||{};
    const birthLine=[q.birthDate||birth.birthDate,q.birthTime||birth.birthTime,q.birthPlace||birth.birthPlace].filter(Boolean).join(' · ');
    const details=`<p><b>${t('Customer','வாடிக்கையாளர்')}:</b> <span translate="no">${esc(q.customerName||q.birthName||birth.name||'—')}</span></p>${birthLine?`<p>${t('Birth details','பிறப்பு விவரங்கள்')}: <span translate="no">${esc(birthLine)}</span></p>`:''}<p><b>${t('Question ID','கேள்வி எண்')}:</b> ${esc(id)}</p><p class="smv-user-content" translate="no">${esc(q.question||'')}</p><p>${t('Status','நிலை')}: <b>${esc(label(q.status))}</b> · ₹${amount.toFixed(2)}</p>${q.astrologerName?`<p>${t('Astrologer','ஜோதிடர்')}: <span translate="no">${esc(q.astrologerName)}</span></p>`:''}<p class="small">${t('Payment ID','கட்டண எண்')}: ${esc(q.customerPaymentId||q.razorpayPaymentId||'—')}</p>`;
    let controls='';
    if(mode==='refund'){
      const timeLine=(en,tamil,value)=>value?`<p class="small"><b>${t(en,tamil)}:</b> ${esc(date(value))}</p>`:'';
      controls=`<p>${t('Refund status','பணத்திருப்ப நிலை')}: <b>${esc(label(q.refundStatus))}</b></p><p>${t('Refund amount','பணத்திருப்பத் தொகை')}: ₹${Number(q.refundAmount||amount).toFixed(2)}</p><p>${t('Refund ID','பணத்திருப்ப எண்')}: ${esc(q.refundId||'—')}</p><p><b>RRN:</b> ${esc(q.refundRrn||t('Awaiting bank reference','வங்கி வழங்கியதும் காட்டப்படும்'))}</p>${q.refundArn?`<p><b>ARN:</b> ${esc(q.refundArn)}</p>`:''}${q.refundUtr?`<p><b>UTR:</b> ${esc(q.refundUtr)}</p>`:''}${timeLine('Requested','கோரிய தேதி / நேரம்',q.refundRequestedAt)}${timeLine('Refund created','பணத்திருப்பம் தொடங்கிய தேதி / நேரம்',q.refundCreatedAt)}${timeLine('Processed confirmation','செயலாக்கம் உறுதியான தேதி / நேரம்',q.refundProcessedAt)}${timeLine('Last attempt','கடைசியாக முயன்ற தேதி / நேரம்',q.refundLastAttemptAt)}${timeLine('Last status check','நிலை சரிபார்த்த தேதி / நேரம்',q.refundSyncedAt)}<p class="smv-user-content" translate="no">${esc(q.refundReason||q.adminQuestionRejectionReason||'')}</p>${q.refundError?`<p class="error" translate="no">${esc(q.refundError)}</p>`:''}${q.refundCommissionReviewRequired?`<p class="small">${t('An astrologer commission was already credited. Review the commission separately; this refund does not silently delete earnings.','ஜோதிடர் பங்கு ஏற்கெனவே வரவு வைக்கப்பட்டுள்ளது. அந்தப் பங்கைக் தனியாகச் சரிபார்க்கவும்; இந்தப் பணத்திருப்பம் வருமானப் பதிவை நீக்காது.')}</p>`:''}<div class="action-row">${q.refundId?button('sync-refund','Refresh refund status','பணத்திருப்ப நிலையைப் புதுப்பி'):button('retry-refund','Retry refund','பணத்திருப்பத்தை மீண்டும் முயற்சி')}</div>`;
    } else if(mode!=='history'){
      const pct=Number(q.commissionPercent??q.commissionRate??data.settings?.commission?.astroPercent??20);
      controls=`${q.answer?`<details open><summary>${t('Submitted answer','சமர்ப்பிக்கப்பட்ட பதில்')}</summary><p class="smv-user-content" translate="no" style="white-space:pre-wrap">${esc(q.answer)}</p></details><div class="action-row">${button('approve-answer','Approve answer','பதிலை அங்கீகரி')}${button('reject-answer','Reject answer','பதிலை நிராகரி')}</div>`:''}<div class="action-row"><label>${t('Astrologer','ஜோதிடர்')}<select data-field="astrologer"><option value="">${t('Select astrologer','ஜோதிடரைத் தேர்ந்தெடுக்கவும்')}</option>${astros.map(a=>`<option value="${esc(a.id)}" ${a.id===q.astrologerId?'selected':''}>${esc(a.name||a.id)}</option>`).join('')}</select></label><label>${t('Astrologer commission %','ஜோதிடர் பங்கு %')}<input data-field="commission" type="number" min="0" max="100" step="0.01" value="${pct}"></label>${button(assigned?'reallocate-question':'approve-question',assigned?'Reallocate':'Approve & allocate',assigned?'மறு ஒதுக்கீடு':'அங்கீகரித்து ஒதுக்கு')}</div><label>${t('Reason for rejection','நிராகரிப்பதற்கான காரணம்')}<input data-field="reason" maxlength="2000"></label><div class="action-row">${button('reject-question','Reject question & refund','கேள்வியை நிராகரித்து பணத்தைத் திருப்புக')}</div><details><summary>${t('Edit question','கேள்வியைத் திருத்து')}</summary><textarea data-field="question" rows="3" aria-label="${t('Question','கேள்வி')}">${esc(q.question||'')}</textarea>${button('edit-question','Save question','கேள்வியைச் சேமி')}</details><details><summary>${t('Admin answer','நிர்வாகி பதில்')}</summary><p class="small">${t('Minimum words','குறைந்தபட்ச சொற்கள்')}: ${Number(q.answerMinWords||1)}</p><textarea data-field="answer" rows="6" aria-label="${t('Admin answer','நிர்வாகி பதில்')}"></textarea>${button('takeover-answer','Submit admin answer','நிர்வாகி பதிலைச் சமர்ப்பி')}</details>`;
    }
    if(mode==='history'&&q.status==='answered'){
      controls=`<label>${t('Reason for rejection and refund','நிராகரிப்பு / பணத்திருப்பத்திற்கான காரணம்')}<input data-field="reason" maxlength="2000"></label>${button('reject-question','Reject question & refund','கேள்வியை நிராகரித்து பணத்தைத் திருப்புக')}`;
    }
    return `<article class="card smv-workflow-card" data-question="${esc(id)}">${details}${controls}<p data-workflow-message role="status" aria-live="polite"></p></article>`;
  }
  const lists=[['adminPendingQuestions',rows.filter(q=>open(q)&&!String(q.answer||'').trim()),'question'],['adminAnswers',rows.filter(q=>open(q)&&String(q.answer||'').trim()),'answer'],['adminRefunds',rows.filter(rejected),'refund'],['adminQuestions',rows.slice(0,50),'history']];
  for(const [id,items,mode] of lists){
    const box=document.getElementById(id);if(!box)continue;
    box.innerHTML=items.length?items.map(q=>card(q,mode)).join(''):`<div class="empty">${t('No items in this list.','இந்தப் பட்டியலில் பதிவுகள் இல்லை.')}</div>`;
    box.onclick=async event=>{
      const btn=event.target.closest('[data-workflow]');if(!btn||!box.contains(btn))return;
      const root=btn.closest('[data-question]'), questionId=root.dataset.question, action=btn.dataset.workflow;
      const msg=root.querySelector('[data-workflow-message]');
      const value=k=>root.querySelector(`[data-field="${k}"]`)?.value.trim()||'';
      const payload={questionId};
      if(['reject-answer','reject-question'].includes(action)){payload.reason=value('reason');if(!payload.reason){msg.textContent=t('Enter a rejection reason.','நிராகரிப்பதற்கான காரணத்தை உள்ளிடவும்.');return;}}
      if(['approve-question','reallocate-question'].includes(action)){payload.astrologerId=value('astrologer');payload.commissionPercent=Number(value('commission'));if(!payload.astrologerId||!value('commission')||!Number.isFinite(payload.commissionPercent)||payload.commissionPercent<0||payload.commissionPercent>100){msg.textContent=t('Choose an astrologer and a valid commission (0–100).','ஜோதிடரையும் சரியான பங்கு சதவீதத்தையும் (0–100) தேர்ந்தெடுக்கவும்.');return;}}
      if(action==='edit-question'){payload.question=value('question');if(!payload.question){msg.textContent=t('Enter the question.','கேள்வியை உள்ளிடவும்.');return;}}
      if(action==='takeover-answer'){payload.answer=value('answer');if(!payload.answer){msg.textContent=t('Enter your answer.','உங்கள் பதிலை உள்ளிடவும்.');return;}}
      if(['reject-question','retry-refund'].includes(action)&&!confirm(t('Reject this question and request a refund?','இந்தக் கேள்வியை நிராகரித்து பணத்திருப்பத்தைக் கோரவா?')))return;
      root.querySelectorAll('button').forEach(b=>b.disabled=true);msg.textContent=t('Saving…','சேமிக்கப்படுகிறது…');
      try{const result=await api('/admin/'+action,{method:'POST',body:JSON.stringify(payload)});if(!result?.success)throw Error(result?.error||t('Unable to complete action.','செயலை முடிக்க முடியவில்லை.'));msg.textContent=t('Saved. Refreshing…','சேமிக்கப்பட்டது. புதுப்பிக்கப்படுகிறது…');await refresh();}
      catch(e){msg.textContent=e.message||String(e);msg.className='error';if(['reject-question','retry-refund','sync-refund'].includes(action))await refresh().catch(()=>{});}
      finally{root.querySelectorAll('button').forEach(b=>b.disabled=false);}
    };
  }
}



import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, deleteUser, updateProfile, setPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

window.__SMV_BUILD="V120-UI";
const firebaseConfig={apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:"smv-astro.firebaseapp.com",projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
let app=null, auth=null, db=null, functions=null, httpsCallableFn=null, firebaseInitError=null;
try{
  app=initializeApp(firebaseConfig);
  auth=getAuth(app);await setPersistence(auth,browserSessionPersistence);
  db=getFirestore(app);
}catch(initError){
  firebaseInitError=initError;
  console.error("SMV ASTRO Firebase initialization failed",initError);
}
const RAZORPAY_BACKEND_URL="https://smvastroservices.onrender.com";
// Single backend URL used by all protected API calls, including astrologer answer submission.
// Keep this in the main Firebase module so it is available to the answer-submit handler.
const BACKEND=RAZORPAY_BACKEND_URL; window.SMV_BACKEND_URL=RAZORPAY_BACKEND_URL;

function smvAssertLiveCheckout(key){
 const value=String(key||'').trim();
 if(!/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(value))throw new Error('Payment blocked: this backend returned an invalid Razorpay key. Configure a matching Test or Live Razorpay key in the backend. Backend: '+RAZORPAY_BACKEND_URL);
}
// Shared authenticated transport for Admin, Customer and Astrologer actions.
// Firebase reuses a valid ID token; payment/refund mutations are never replayed here.
async function renderApi(path, options={}){
  const user=auth?.currentUser;
  if(!user)throw new Error('Please log in to continue.');
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))throw new Error('Invalid API path.');
  const {timeoutMs=20000,signal,...request}=options;
  const controller=new AbortController();
  const cancel=()=>controller.abort(signal?.reason);
  let timer;
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  const perform=async()=>{
    const token=await user.getIdToken();
    if(auth?.currentUser?.uid!==user.uid)throw new Error('Your login changed. Please try again.');
    if(controller.signal.aborted)throw new Error('Request cancelled.');
    const headers=new Headers(request.headers||{});
    headers.set('Authorization','Bearer '+token);
    headers.set('Accept','application/json');
    if(request.body!=null&&!(request.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    const response=await fetch(RAZORPAY_BACKEND_URL+path,{...request,headers,cache:'no-store',signal:controller.signal});
    if(auth?.currentUser?.uid!==user.uid)throw new Error('Your login changed. Please try again.');
    if(response.status===204)return {};
    let data;
    try{data=await response.json();}catch(e){throw new Error('Server returned an invalid response ('+response.status+'). Please try again.');}
    if(!response.ok||data?.success===false){
      const error=new Error(data?.error||data?.message||'Server request failed ('+response.status+').');
      error.status=response.status;throw error;
    }
    return data;
  };
  try{
    return await Promise.race([perform(),new Promise((_,reject)=>{
      timer=setTimeout(()=>{reject(new Error('Server request timed out. Check the current status before trying again.'));controller.abort();},Number.isFinite(timeoutMs)&&timeoutMs>0?timeoutMs:20000);
    })]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

async function renderPublicApi(path, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  const response=await fetch(RAZORPAY_BACKEND_URL+path,{...options,headers});
  let data=null; try{data=await response.json();}catch(e){data={};}
  if(!response.ok) throw new Error(data?.error||`Render backend error (${response.status})`);
  return data;
}
const ADMIN_UID="TwjeEIFS3Zcf1SxboLZoujm91Ky2";
let currentUser=null, selectedAstro=null, pendingAfterLogin=null, questionServicePrice=5, pendingQuestionId="", pendingQuestionFingerprint="", loginMethod="email";
// ASK NOW is a protected navigation transaction. Firebase auth callbacks must never
// redirect it to Dashboard while the transaction is opening the Question Form.
let askNowTransitionLock=false;
// HARD ASK NOW INTENT: independent of pendingAfterLogin so legacy/async code cannot clear it.
window.__SMV_ASK_NOW_INTENT = false;
let smvNavigationEpoch=0;
// Dashboard hydration state: once a customer dashboard has rendered successfully,
// returning from ASK NOW must reveal that existing dashboard instead of starting
// another loading cycle. This is UI/navigation state only.
let dashboardReadyUid=null;
let dashboardReadyAt=0;
let dashboardReadyRole=null;
const $=id=>document.getElementById(id);
const show=id=>$(id)?.classList.remove("hidden"); const hide=id=>$(id)?.classList.add("hidden");
const go=id=>$(id)?.scrollIntoView({behavior:"smooth",block:"start"});
function hideHomeSurface(){
  // Hide the COMPLETE public Home surface. Internal views such as Question Form
  // and Dashboard must never show Blogs/Media/Horoscope/Create-Horoscope content
  // underneath or beside them.
  ["home","askNowSection","approved-astrologers","faq",
   "smv-content-hub","horoscope-tools","tamil-horoscope","english-horoscope"].forEach(id=>hide(id));
  ["tamilHoroscopeResult","englishHoroscopeResult"].forEach(id=>{const el=$(id);if(el){el.classList.add("hidden");el.innerHTML="";}});
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>hideElement(el));
}
function showHomeSurface(){
  ["home","askNowSection","approved-astrologers","faq"].forEach(id=>show(id));
  hide("register-flow");
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>showElement(el));
}
function hideElement(el){if(el) el.classList.add("hidden");}

/* Dashboard/Admin must be a clean internal view. */
function hideDashboardPublicSections(){
  ["smv-content-hub","horoscope-tools","tamil-horoscope","english-horoscope"].forEach(id=>hide(id));
}

function smvShowRoleNav(){
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>showElement(el));

  // ONE role-aware Dashboard button only.
  const dash=$("dashLink"), admin=$("adminLink");
  if(dash) showElement(dash);
  if(admin){
    hideElement(admin);
    admin.setAttribute('aria-hidden','true');
    admin.setAttribute('tabindex','-1');
  }
}

let smvInternalView="home";
function smvEnterInternalView(view,push=true){
  smvInternalView=view;
  if(view!=="home")window.__SMV_PUBLIC_ROUTE=null;
  if(push){try{history.pushState({smvView:view},"",`#${view}`);}catch(_e){}}
}
$("workspaceHome")?.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
window.__smvPreparePublicNavigation=()=>{
 ++smvNavigationEpoch;askNowTransitionLock=false;window.__SMV_ASK_NOW_INTENT=false;
 pendingAfterLogin=null;smvInternalView='home';
 show('contactNav');if(currentUser)smvShowRoleNav();
};
function smvReturnHome(restoreRoleNav=true){
  ++smvNavigationEpoch;
  askNowTransitionLock=false;
  window.__SMV_ASK_NOW_INTENT=false;
  pendingAfterLogin=null;
  smvInternalView="home";

  // Close every internal view.
  ["dashboard","admin","ask-flow","register-flow","astro-register-form",
   "astro-flow","appointment","contact"].forEach(id=>hide(id));

  // Restore the COMPLETE public Home surface.
  ["home","askNowSection","approved-astrologers","faq","smv-content-hub",
   "english-horoscope"].forEach(id=>{const el=$(id);if(el)el.classList.remove("hidden");});
  hide("horoscope-tools");
  hide("tamil-horoscope");
  const tr=$("tamilHoroscopeResult"), er=$("englishHoroscopeResult");
  if(tr){tr.classList.add("hidden");tr.innerHTML="";}
  if(er){er.classList.add("hidden");er.innerHTML="";}

  if(restoreRoleNav) smvShowRoleNav();
  try{history.replaceState({smvView:"home"},"","#home");}catch(_e){}
  requestAnimationFrame(()=>{
    window.scrollTo({top:0,behavior:"auto"});
    const home=$("home");
    if(home) home.scrollIntoView({behavior:"auto",block:"start"});
  });
}
window.addEventListener("popstate",()=>{
  const id=location.hash.slice(1)||'home';
  if(window.__smvNavigatePublic?.(id,{historyMode:'none'}))return;
  if(id==='dashboard'||id==='admin'){$('dashLink')?.click();return;}
  smvReturnHome(true);
});

function showElement(el){if(el) el.classList.remove("hidden");}
function hidePrimarySections(except=""){
  ["register-flow","astro-register-form","astro-flow","ask-flow","appointment","contact","dashboard","admin"].forEach(id=>{if(id!==except) hide(id);});
  hide("dashLink");
  hide("adminLink");
  if(except==="dashboard" || except==="admin"){
    hideHomeSurface();
    hideDashboardPublicSections();
    hide("register-flow");
    hide("astro-register-form");
    hide("astro-flow");
    hide("ask-flow");
    hide("appointment");
    hide("contact");
  }else{
    showHomeSurface();
  }
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function message(id,html){if($(id)) $(id).innerHTML=html;}
function withTimeout(promise,ms=15000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Firebase did not respond within 15 seconds.")),ms))]);}
window.closeModal=()=>{
  const m=$("modal");
  if(m){
    m.classList.add("hidden");
    m.classList.remove("profile-modal-active","auth-modal-active");
  }

  // If Login was opened from ASK NOW and user closes Login
  // without logging in, return completely to the Home page.
  if(!currentUser && pendingAfterLogin==="question"){
    pendingAfterLogin=null;
    askNowTransitionLock=false;

    hide("dashboard");
    hide("dashboardContent");
    hide("admin");
    hide("ask-flow");
    hide("register-flow");
    hide("astro-register-form");
    hide("astro-flow");
    hide("appointment");
    hide("contact");

    showHomeSurface();

    try{
      smvShowRoleNav();
    }catch(_e){}

    try{
      smvEnterInternalView("home",true);
    }catch(_e){}

    window.scrollTo({top:0,behavior:"smooth"});
  }
};
function openModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden");}
function smvNotice(title,message,icon="✓"){
  const id="smvNoticeDialog"; let el=document.getElementById(id); if(el)el.remove();
  el=document.createElement("div"); el.id=id; el.className="smv-dialog-backdrop";
  el.innerHTML=`<div class="smv-dialog"><div class="smv-dialog-icon">${icon}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="smv-dialog-actions single"><button type="button" class="btn">OK</button></div></div>`;
  document.body.appendChild(el); el.querySelector(".btn").onclick=()=>el.remove(); return el;
}
function smvConfirm(title,message,okText="OK",cancelText="CANCEL",danger=false){
  return new Promise(resolve=>{
    const id="smvConfirmDialog"; let el=document.getElementById(id); if(el)el.remove();
    el=document.createElement("div"); el.id=id; el.className="smv-dialog-backdrop";
    el.innerHTML=`<div class="smv-dialog"><div class="smv-dialog-icon">${danger?"!":"?"}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="smv-dialog-actions"><button type="button" class="btn gray" data-cancel>${escapeHtml(cancelText)}</button><button type="button" class="btn ${danger?"danger":""}" data-ok>${escapeHtml(okText)}</button></div></div>`;
    document.body.appendChild(el); const finish=value=>{el.remove();resolve(value)};
    el.querySelector("[data-cancel]").onclick=()=>finish(false); el.querySelector("[data-ok]").onclick=()=>finish(true);
  });
}

// ---------- Navigation ----------
function openRegister(){hidePrimarySections("register-flow");show("register-flow");go("register-flow");}
function openAstroRegister(){hidePrimarySections("astro-register-form");show("astro-register-form");go("astro-register-form");}

async function openCustomerRegistration(){
  if(currentUser){
    await logoutToHome();
  }
  openRegister();
}

async function openAstrologerRegistration(){
  if(currentUser){
    await logoutToHome();
  }
  openAstroRegister();
}
function openAstroFlow(){openQuestionService();}
async function openQuestionService(options={}){
  // Every entry through ASK NOW owns this transaction until Home/Back/payment completion.
  window.__SMV_ASK_NOW_INTENT=true;
  const fastAfterLogin=options.fastAfterLogin===true;
  const suppliedProfile=options.profile||null;

  // SINGLE ASK NOW ROUTE:
  // 1) Guest -> Login -> this function again after authentication.
  // 2) Signed-in customer -> Question Form directly.
  // No Dashboard render is allowed anywhere in this route.
  askNowTransitionLock=true;
  const askEpoch=++smvNavigationEpoch;

  try{
    const signedInUser=auth?.currentUser||currentUser;
    if(!signedInUser){
      pendingAfterLogin="question";
      openAuth("login");
      return;
    }

    currentUser=signedInUser;
    const activeUser=auth?.currentUser||signedInUser;
    if(!activeUser){
      currentUser=null;
      pendingAfterLogin="question";
      openAuth("login");
      return;
    }

    if(!fastAfterLogin){
      try{ await activeUser.reload(); }catch(_e){ console.warn("ASK NOW auth reload skipped",_e); }
    }

    const verifiedUser=auth?.currentUser||activeUser;
    if(!verifiedUser){
      currentUser=null;
      pendingAfterLogin="question";
      openAuth("login");
      return;
    }

    if(verifiedUser.uid!==ADMIN_UID && !verifiedUser.emailVerified){
      await signOut(auth);
      currentUser=null;
      pendingAfterLogin="question";
      openAuth("login");
      return;
    }

    // ASK NOW must use the same authoritative Admin resolver as Dashboard.
    // Do not infer "customer" from a missing/temporary profile read.
    currentUser=verifiedUser;
    const questionAdmin=await isCurrentAdmin();
    let questionProfile=suppliedProfile;
    if(!questionProfile){
      questionProfile=await getUserProfile(verifiedUser.uid);
    }
    const questionRole=questionAdmin?"admin":String(questionProfile?.role||"customer").toLowerCase();
    if(questionAdmin){
      askNowTransitionLock=false;
      window.__SMV_ASK_NOW_INTENT=false;
      pendingAfterLogin=null;
      hide("ask-flow");
      smvNotice("Customer Login Required","Please login with a Customer account to ask an astrology question.","!");
      return;
    }
    if(questionRole!=="customer"){
      askNowTransitionLock=false;
      window.__SMV_ASK_NOW_INTENT=false;
      pendingAfterLogin=null;
      hide("ask-flow");
      smvNotice("Customer Login Required","Please login with a Customer account to ask an astrology question.","!");
      return;
    }

    currentUser=verifiedUser;
    // If another navigation started while Firebase/profile data was loading,
    // this stale ASK NOW operation must not repaint the page.
    if(askEpoch!==smvNavigationEpoch){ return; }
    pendingAfterLogin=null;

    // Atomic visual transition: hide every competing surface BEFORE showing form.
    hideHomeSurface();
    ["dashboard","dashboardContent","admin","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
    show("ask-flow");
    smvOpenPublicQuestionWindow();
    show("dashLink");
    hide("adminLink");

    selectedAstro=null;
    if($("askTitle")) $("askTitle").textContent="Ask Your Question";
    loadQuestionPrice().catch(err=>console.warn("Question price refresh skipped:",err));
    ["birthName","birthDate","birthTime","birthPlace","birthGender","questionText"].forEach(id=>{if($(id)) $(id).value="";});
    message("askMsg","");
    try{window.__smvTranslateCurrentLanguage?.();}catch(_e){}
    smvShowRoleNav();
    smvEnterInternalView("ask-flow",true);
    requestAnimationFrame(()=>{
      const ask=$("ask-flow");
      if(ask) ask.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }catch(err){
    console.error("ASK NOW -> Question Form failed",err);
    pendingAfterLogin=auth?.currentUser?null:"question";
    // Never fall through to Dashboard on ASK NOW failure.
    hide("dashboard"); hide("dashboardContent");
    const msg=$("askMsg");
    if(msg) msg.innerHTML='<span class="error"><b>Question Form could not be opened.</b><br>'+escapeHtml(err?.message||String(err))+'</span>';
    if(!auth?.currentUser) openAuth("login");
  }finally{
    // Keep the lock through the synchronous destination render. Firebase auth
    // callbacks that fire later will see smvInternalView === "ask-flow" too.
    askNowTransitionLock=false;
  }
}

function smvOpenPublicQuestionWindow(){
  const w=$("smvPublicQuestionWindow");
  if(w){w.classList.remove("hidden");document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden";w.scrollTop=0;}
}
function smvClosePublicQuestionWindow(){
  const w=$("smvPublicQuestionWindow");
  if(w)w.classList.add("hidden");
  document.documentElement.style.overflow="";document.body.style.overflow="";
  hide("ask-flow");
}
window.__smvOpenQuestionService=openQuestionService;
function smvDateTime(value){ try { if(value==null || value==='') return '—'; let d=null; if(value instanceof Date) d=value; else if(typeof value?.toDate==='function') d=value.toDate(); else if(typeof value==='object' && value){ const sec=value.seconds ?? value._seconds; const ns=value.nanoseconds ?? value._nanoseconds ?? 0; if(sec!=null) d=new Date(Number(sec)*1000+Math.floor(Number(ns)/1e6)); else if(value.timestamp) return smvDateTime(value.timestamp); else if(value.date) return smvDateTime(value.date); else if(value.value) return smvDateTime(value.value); } if(!d) d=new Date(value); if(Number.isNaN(d.getTime())) return '—'; return d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); } catch(e){ return '—'; } }
window.__smvOpenQuestionService=openQuestionService;
  window.__smvOpenRegister=openRegister;

function hidePublicHoroscopeSections(){
  ['horoscope-tools','tamil-horoscope','english-horoscope'].forEach(id=>hide(id));
  ['tamilHoroscopeResult','englishHoroscopeResult'].forEach(id=>{const el=$(id);if(el){el.classList.add('hidden');el.innerHTML='';}});
}
if($("authBtn") && $("authBtn").dataset.smvAuthBound!=="1"){ $("authBtn").dataset.smvAuthBound="1"; $("authBtn").addEventListener("click",async()=>{try{hidePublicHoroscopeSections();if(currentUser){await logoutToHome();}else{openAuth("login");}}catch(e){console.error("SMV login action failed",e);}}); }
$("registerNav")?.addEventListener("click",()=>openCustomerRegistration());
document.querySelectorAll('header a[href="#home"]').forEach(el=>{
  el.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
});

// Keep every header control in the same SMV ASTRO style. Logout alone changes to red.
(function syncHeaderAuthStyle(){
  const b=$("authBtn"); if(!b) return;
  const sync=()=>b.classList.toggle("smv-logout-btn",String(b.textContent||"").trim().toLowerCase()==="logout");
  sync();
  new MutationObserver(sync).observe(b,{childList:true,characterData:true,subtree:true});
})();

// Header role label: logged-in role is shown in green.
function setHeaderRoleLabel(role){
  const dash=$('dashLink'), admin=$('adminLink');
  const r=String(role||'').toLowerCase();

  if(dash){
    dash.classList.remove('smv-role-green');
    dash.textContent='Dashboard';

    if(r==='customer'){
      dash.textContent='Customer';
      dash.classList.add('smv-role-green');
    }else if(r==='astrologer'){
      dash.textContent='Astrologer';
      dash.classList.add('smv-role-green');
    }else if(r==='admin'){
      dash.textContent='Admin';
      dash.classList.add('smv-role-green');
    }
  }

  // Admin has NO separate header button.
  if(admin){
    admin.classList.add('hidden');
    admin.setAttribute('aria-hidden','true');
    admin.setAttribute('tabindex','-1');
  }
}

// V149: Horoscope navigation must restore both public horoscope sections after Login
// temporarily hides them. It does not change the website-wide language.
$("contentNav")?.addEventListener("click",(e)=>{
  e.preventDefault();e.stopPropagation();
  const hub=$("smv-content-hub");if(!hub)return;
  hub.classList.remove("hidden");window.__smvContentVisible=true;
  requestAnimationFrame(()=>hub.scrollIntoView({behavior:"smooth",block:"start"}));
});

  document.querySelector('header a[href="#home"]')?.addEventListener("click",e=>{
  e.preventDefault();
  smvReturnHome(true);
});

// FINAL ROLE DASHBOARD ROUTER
(function bindRoleDashboardButton(){
  const dash=$("dashLink");
  if(!dash || dash.dataset.smvDashboardRouterBound==="1") return;
  dash.dataset.smvDashboardRouterBound="1";
  dash.addEventListener("click",async e=>{
    e.preventDefault(); e.stopPropagation();
    const epoch=++smvNavigationEpoch;
    try{
      const user=auth?.currentUser||currentUser;
      if(!user){ pendingAfterLogin="dashboard"; openAuth("login"); return; }
      currentUser=user; window.__SMV_ASK_NOW_INTENT=false; askNowTransitionLock=false;
      // Resolve the role once from the signed-in user's profile.  Do not call
      // isCurrentAdmin() here because it performs another profile read and can
      // race the Firebase auth listener during first dashboard load.
      let roleProfile=null;
      let adminUser=(user.uid===ADMIN_UID);
      if(!adminUser){
        roleProfile=await withTimeout(getUserProfile(user.uid),15000);
        adminUser=String(roleProfile?.role||'').toLowerCase()==='admin';
      }
      if(epoch!==smvNavigationEpoch) return;
      if(adminUser){
        hideHomeSurface();
        ["dashboard","dashboardContent","ask-flow","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
        show("admin"); hide("dashLink"); hide("adminLink");
        smvEnterInternalView("admin",true); go("admin");
        await loadAdminPanel();
        if(epoch!==smvNavigationEpoch) return;
        setHeaderRoleLabel("admin"); smvShowRoleNav(); smvEnterInternalView("admin",true); go("admin");
      }else{
        const profile=roleProfile||await getUserProfile(user.uid);
        const role=String(profile?.role||"customer").toLowerCase();
        if(epoch!==smvNavigationEpoch) return;
        if(role!=="customer" && role!=="astrologer"){ smvNotice("Dashboard Access","Your account role could not be verified. Please try again.","!"); return; }
        hideHomeSurface();
        ["admin","ask-flow","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
        show("dashboard"); show("dashboardContent"); show("dashLink"); hide("adminLink"); hideDashboardPublicSections();
        setHeaderRoleLabel(role); smvEnterInternalView("dashboard",true); go("dashboard");
        await loadDashboard(role);
      }
    }catch(err){
      console.error("Role dashboard navigation failed:",err);
      // The Firebase auth listener is the canonical first-load router. If it
      // has already opened the dashboard while this click is finishing, do not
      // show a false error over a dashboard that is loading successfully.
      if(smvInternalView!=="dashboard" || !document.getElementById("dashboard") || document.getElementById("dashboard").classList.contains("hidden")){
        smvNotice("Dashboard","Unable to open your dashboard. Please try again.","!");
      }
    }
  },true);
})();
$("customerRegBtn")?.addEventListener("click",async e=>{
  e.preventDefault();
  e.stopPropagation();
  try{
    if(currentUser){ await logoutToHome(); }
    openAuth("register");
  }catch(err){ console.error("Customer registration action failed:",err); }
});
$("astroRegBtn")?.addEventListener("click",()=>openAstrologerRegistration());
$("regBackBtn")?.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
$("astroRegBackBtn")?.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
$("backHomeBtn")?.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
$("askNowBackBtn")?.addEventListener("click",e=>{
  e.preventDefault();
  e.stopPropagation();
  if(!currentUser) return smvReturnHome(true);
  askNowTransitionLock=false;
  window.__SMV_ASK_NOW_INTENT=false;
  pendingAfterLogin=null;
  smvClosePublicQuestionWindow();
  // Return through the existing role-aware Dashboard router.
  // It resolves Admin / Astrologer / Customer from the signed-in account
  // instead of forcing every ASK NOW Back action into Customer Dashboard.
  $("dashLink")?.click();
});

// Admin no longer has a separate header button.
$("adminLink")?.addEventListener("click",e=>{e.preventDefault();openAdminEntry();});
$("adminFeatureBtn")?.addEventListener("click",e=>{e.preventDefault();openAdminEntry();});

// ---------- Admin access + Login / customer registration ----------
const smvProfiles=new Map();
async function getUserProfile(uid){
 const cached=smvProfiles.get(uid); if(cached&&Date.now()-cached.at<15000)return cached.data;
  try{const s=await withTimeout(getDoc(doc(db,"smv_users",uid)),10000);const data=s.exists()?s.data():{};smvProfiles.set(uid,{data,at:Date.now()});return data;}
  catch(e){console.warn("Profile lookup failed",e);return {};}
}
async function isCurrentAdmin(){
  if(!currentUser) return false;
  if(currentUser.uid===ADMIN_UID) return true;
  const profile=await getUserProfile(currentUser.uid);
  return String(profile.role||'').toLowerCase()==='admin';
}
let smvBoardRequest=null;
async function smvRefreshWorkflowCards(){
 const uid=currentUser?.uid;if(!uid)return;
 if(smvBoardRequest)return smvBoardRequest;
 smvBoardRequest=(async()=>{
  const data=await renderApi('/admin-data',{method:'GET'});
  if(!data?.success)throw new Error(data?.error||'Admin data unavailable.');
  if(currentUser?.uid!==uid)return;
  renderAdminWorkflows({data,api:renderApi,refresh:smvRefreshWorkflowCards,lang:"en",escape:escapeHtml,date:smvDateTime});
  smvRenderOpenWorkflowControl(data);
  smvRenderPrivateConsultAdmin(data);
 })();
 try{return await smvBoardRequest;}finally{smvBoardRequest=null;}
}
function smvWatchAdminQuestions(){smvStartLive('admin');}
window.__smvRefreshAdmin=()=>loadAdminPanel();
async function openAdminEntry(){
  if(!currentUser){pendingAfterLogin="admin";openAuth("login");return;}
  if(await isCurrentAdmin()){
    hidePrimarySections("admin");
    show("admin");show("adminLink");
    await loadAdminPanel();
    setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
    smvShowRoleNav();
    smvEnterInternalView("admin",true);
    go("admin");return;
  }
  openModal('<h2>Admin Access</h2><div class="error">This account is not an Admin account.</div><p class="small">Please login with the Admin account, then open Admin Dashboard again.</p><button class="btn gray" id="adminAccessClose">Close</button>');
  $("adminAccessClose").onclick=closeModal;
}


function smvPasswordEye(visible){
 return visible?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.8 5.2A12 12 0 0112 5c6 0 10 7 10 7a19 19 0 01-4 4.5M6.3 6.3A20 20 0 002 12s4 7 10 7a12 12 0 005.7-1.5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
}
function openAuth(mode="login"){
  if(mode==='login')hidePublicHoroscopeSections?.();
  hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink"); hide("appointment"); hide("contact"); hide("ask-flow"); hide("register-flow"); hide("astro-register-form"); hide("astro-flow"); hide("smv-content-hub"); window.__smvContentVisible=false;
  closeModal(); loginMethod="email"; const isLogin=mode==="login";
  openModal(`<div class="auth-shell" data-auth-mode="${isLogin?'login':'register'}">
    <div class="auth-hero"><div class="auth-hero-icon"><img src="./assets/smv-brand-logo-v17.png" alt="SMV ASTRO" width="72" height="72"></div><h2>${isLogin?"Welcome Back":"Create Account"}</h2><p>${isLogin?"Sign in to continue to your SMV ASTRO dashboard.":"Create your secure customer account."}</p></div>
    <div id="authMsg" class="small"></div>
    ${!isLogin?`<label class="auth-field-label">Full Name</label><input class="auth-field" id="name" placeholder="Your full name" autocomplete="name"><label class="auth-field-label">Mobile Number</label><input class="auth-field" id="phone" placeholder="Your mobile number" autocomplete="tel">`:""}
    ${isLogin?`<div class="auth-tabs"><button type="button" class="btn gray" id="loginEmailMode">Email Login</button><button type="button" class="btn gray" id="loginCustomerIdMode">Customer ID</button><button type="button" class="btn gray" id="loginAstrologerIdMode">Astrologer ID</button></div>`:""}
    <label class="auth-field-label">${isLogin?"Email / ID":"Email"}</label><input class="auth-field" id="email" type="email" placeholder="Email" autocomplete="email">
    <label class="auth-field-label">Password</label><div class="password-wrap"><input class="auth-field" id="password" type="password" placeholder="Minimum 6 characters" autocomplete="${isLogin?"current-password":"new-password"}"><button type="button" class="password-toggle" id="passwordToggle" aria-label="Show password" aria-pressed="false">${smvPasswordEye(false)}</button></div>
    <button class="btn auth-submit" id="submitAuth">${isLogin?"LOGIN":"CREATE ACCOUNT"}</button>
    ${isLogin?`<div class="auth-divider" aria-hidden="true"><span>OR</span></div><button type="button" class="btn auth-google" id="googleAuthBtn"><span aria-hidden="true" style="font-weight:800;font-size:18px">G</span><span>Continue with Google</span></button>`:""}
    ${isLogin?`<button class="btn gray auth-secondary" id="forgotAuth">Forgot Password?</button>`:""}
    <button class="btn gray auth-secondary" id="switchAuth">${isLogin?(pendingAfterLogin==="question"?"New customer? Create account":"Create new customer account"):"I already have an account"}</button>
  </div>`);
  $("modal")?.classList.add("auth-modal-active");
  const passwordToggle=$("passwordToggle");
  passwordToggle.onclick=()=>{const p=$("password");const showing=p.type==="text";p.type=showing?"password":"text";passwordToggle.innerHTML=smvPasswordEye(!showing);passwordToggle.setAttribute("aria-pressed",String(!showing));passwordToggle.setAttribute("aria-label",showing?"Show password":"Hide password")};
  if(isLogin){
    const setMethod=(m)=>{loginMethod=m; const input=$("email"); if(!input)return; const idMode=m!=="email"; input.type=idMode?"text":"email"; input.placeholder=m==="customerId"?"Customer ID (e.g. SMV-CUS-20082026-01)":m==="astrologerId"?"Astrologer ID (e.g. SMV-AST-20082026-01)":"Email address"; input.autocomplete=idMode?"username":"email"; $("loginEmailMode")?.classList.toggle("active",m==="email"); $("loginCustomerIdMode")?.classList.toggle("active",m==="customerId"); $("loginAstrologerIdMode")?.classList.toggle("active",m==="astrologerId");};
    $("loginEmailMode").onclick=()=>setMethod("email"); $("loginCustomerIdMode").onclick=()=>setMethod("customerId"); $("loginAstrologerIdMode").onclick=()=>setMethod("astrologerId"); setMethod("email");
  }
  $("submitAuth").onclick=()=>submitAuth(mode); $("switchAuth").onclick=()=>openAuth(isLogin?"register":"login");
  if(isLogin && $("googleAuthBtn")) $("googleAuthBtn").onclick=()=>signInWithGoogle();
  if($("forgotAuth")) $("forgotAuth").onclick=async()=>{const email=$("email").value.trim(),m=$("authMsg"); if(!email){m.innerHTML='<span class="error">Enter your registered email first.</span>';return;} try{const {sendPasswordResetEmail}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");await withTimeout(sendPasswordResetEmail(auth,email));m.innerHTML='<span class="success">Password reset email sent. Please check Inbox and Spam.</span>';}catch(e){m.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}};
}
window.__smvOpenAuth = openAuth; window.__smvOpenAstroRegister = openAstroRegister;

// Google Sign-In is a customer login method. Existing Email/Password, Customer ID,
// and Astrologer ID flows remain unchanged.
// IMPORTANT: This production site is hosted on GitHub Pages, not Firebase Hosting.
// We therefore use Firebase signInWithPopup() only here. The redirect flow was
// removed because storage partitioning caused Firebase "missing initial state"
// errors on the production domain.
async function finishGoogleRoleLogin(googleUser, askNowLogin){
  if(!googleUser) throw new Error("Google Sign-In did not return a Firebase user. Please try again.");
  currentUser=googleUser;
  await googleUser.reload();

  let profile=await getUserProfile(googleUser.uid);
  let role=String(profile?.role||"").toLowerCase();
  const adminUser=(googleUser.uid===ADMIN_UID || role==="admin");

  // Only a brand-new Google identity becomes a Customer. Existing Astrologer/Admin
  // roles are never rewritten or duplicated by Google Sign-In.
  if(!profile?.publicId && !adminUser && !role){
    const profileResponse=await renderApi("/register-customer-profile",{
      method:"POST",
      body:JSON.stringify({name:googleUser.displayName||googleUser.email?.split("@")[0]||"Google Customer",phone:""})
    },googleUser);
    if(!profileResponse?.ok) throw new Error(profileResponse?.error||"Customer profile setup failed.");
    profile=await getUserProfile(googleUser.uid);
    role=String(profile?.role||"customer").toLowerCase();
  }

  const resolvedRole=adminUser?"admin":(role||"customer");
  if(!["customer","astrologer","admin"].includes(resolvedRole)){
    await signOut(auth); currentUser=null;
    throw new Error("This account role could not be verified.");
  }

  setHeaderRoleLabel(resolvedRole);
  window.__smvCurrentRole=resolvedRole;
  closeModal();

  // ASK NOW remains Customer-only. Staff Google login always returns to its own dashboard.
  if(askNowLogin && resolvedRole==="customer"){
    await openQuestionService({fastAfterLogin:true,profile});
    pendingAfterLogin=null;
    return;
  }
  if(askNowLogin && resolvedRole!=="customer"){
    askNowTransitionLock=false;
    window.__SMV_ASK_NOW_INTENT=false;
  }

  pendingAfterLogin=null;
  hide("ask-flow"); hide("register-flow"); hide("astro-register-form"); hide("astro-flow");
  hide("appointment"); hide("contact"); hide("home"); hide("askNowSection"); hide("approved-astrologers"); hide("faq");

  if(resolvedRole==="admin"){
    hide("dashboard"); hide("dashLink");
    hidePrimarySections("admin"); show("admin"); show("adminLink");
    smvShowRoleNav(); smvEnterInternalView("admin",true); go("admin");
    await loadAdminPanel();
    setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
    return;
  }

  hide("admin"); hide("adminLink");
  show("dashLink"); show("dashboard"); show("dashboardContent");
  if($("dashboardTitle")) $("dashboardTitle").textContent=resolvedRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
  if($("dashboardContent")) $("dashboardContent").innerHTML='<div class="card"><div class="small">Loading your dashboard...</div></div>';
  smvShowRoleNav(); smvEnterInternalView("dashboard",true); go("dashboard");
  await loadDashboard(resolvedRole);
}

async function signInWithGoogle(){
  const btn=$("googleAuthBtn"), msg=$("authMsg");
  if(!auth || firebaseInitError){
    msg.innerHTML='<span class="error">Google Sign-In is currently unavailable. Please use Email Login.</span>';
    return;
  }
  btn.disabled=true; btn.innerHTML='<span aria-hidden="true" style="font-weight:800;font-size:18px">G</span><span>Signing in with Google...</span>';
  const askNowLogin=pendingAfterLogin==="question" || window.__SMV_ASK_NOW_INTENT===true;
  if(askNowLogin) askNowTransitionLock=true;
  try{
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const result=await withTimeout(signInWithPopup(auth,provider),30000);
    await finishGoogleRoleLogin(result?.user,askNowLogin);
  }catch(e){
    console.error("Google Sign-In failed",e);
    askNowTransitionLock=false;
    try{if(auth?.currentUser) await signOut(auth);}catch(_){ }
    currentUser=null;
    const code=String(e?.code||"");
    let text="Google Sign-In failed. Please try again or use Email Login.";
    if(code==="auth/popup-closed-by-user") text="Google Sign-In was cancelled.";
    else if(code==="auth/popup-blocked") text="Google Sign-In popup was blocked by the browser. Please allow popups for this website and try again.";
    else if(code==="auth/unauthorized-domain") text="This website domain is not authorized for Google Sign-In in Firebase.";
    else if(code==="auth/operation-not-allowed") text="Google Sign-In is not enabled in Firebase Authentication. Please enable Google under Sign-in providers.";
    else if(e?.message) text=e.message;
    msg.innerHTML='<span class="error">'+escapeHtml(text)+'</span>';
  }finally{
    btn.disabled=false; btn.innerHTML='<span aria-hidden="true" style="font-weight:800;font-size:18px">G</span><span>Continue with Google</span>';
  }
}
window.signInWithGoogle=signInWithGoogle;
async function resendVerificationEmail(){
 const email=$("email").value.trim(),password=$("password").value;
 if(!email||!password){
   message("authMsg",'<span class="error">Please enter your email and password first.</span>');
   return;
 }
 try{
   const cred=await signInWithEmailAndPassword(auth,email,password);
   await sendEmailVerification(cred.user);
   await signOut(auth);
   currentUser=null;
   message("authMsg",'<span class="success"><b>Verification link sent successfully.</b> Please check your email.</span>');
 }catch(e){
   try{await signOut(auth);}catch(_){}
   message("authMsg",'<span class="error">Unable to send verification email. Please check your email and password.</span>');
 }
}
window.resendVerificationEmail=resendVerificationEmail;
document.addEventListener("click",e=>{
 const resendBtn=e.target.closest("[data-resend-verification]");
 if(!resendBtn)return;
 e.preventDefault();
 e.stopPropagation();
 if(resendBtn.dataset.sending==="1")return;
 resendBtn.dataset.sending="1";
 resendVerificationEmail().finally(()=>{resendBtn.dataset.sending="";});
});
async function submitAuth(mode){
 const msg=$("authMsg"),rawLogin=$("email").value.trim(),email=rawLogin,password=$("password").value;
 if(!rawLogin||!password){msg.innerHTML='<span class="error">Please enter your email or Customer ID and password.</span>';return;}
 const btn=$("submitAuth");btn.disabled=true;btn.textContent=mode==="login"?"Signing in...":"Creating...";
 try{
  if(mode==="login"){
    let email=rawLogin;
    if(loginMethod==="customerId" || loginMethod==="astrologerId"){
      const lookup=await withTimeout(renderPublicApi("/lookup-id-login",{method:"POST",body:JSON.stringify({publicId:rawLogin})}),15000);
      const expectedRole=loginMethod==="astrologerId"?"astrologer":"customer";
      if(String(lookup?.role||"").toLowerCase()!==expectedRole) throw new Error(loginMethod==="astrologerId"?"This is not a valid Astrologer ID.":"This is not a valid Customer ID.");
      email=String(lookup?.email||"").trim();
      if(!email) throw new Error("The ID is not linked to a login email.");
    }
    // ASK NOW owns this authentication transaction. Set the lock BEFORE calling
    // Firebase so an onAuthStateChanged callback can never open Dashboard between
    // sign-in success and Question Form rendering.
    const askNowLogin= pendingAfterLogin==="question" || window.__SMV_ASK_NOW_INTENT===true;
    if(askNowLogin) askNowTransitionLock=true;
    // Do not wait for a separate auth-state promise here. Firebase already returns
    // the signed-in user from signInWithEmailAndPassword; use that result directly.
    const loginCred=await withTimeout(signInWithEmailAndPassword(auth,email,password),20000);
    if(!loginCred?.user){throw new Error("Login did not return a Firebase user. Please try again.");}
    currentUser=loginCred.user;
    await loginCred.user.reload(); const loginProfile=await getUserProfile(loginCred.user.uid); const loginRole=String(loginProfile?.role||"customer").toLowerCase(); const loginStatus=String(loginProfile?.status||"active").toLowerCase(); if(loginRole!=="admin" && loginCred.user.uid!==ADMIN_UID){
      if(!loginCred.user.emailVerified){
        await signOut(auth);
        currentUser=null;
        pendingAfterLogin=null;
        msg.innerHTML='<span class="error"><b>Please verify your email first.</b><br>Check your email and click the verification link.<br><button type="button" class="btn" data-resend-verification="1" style="margin-top:10px">Resend Verification Email</button></span>';
        return;
      }
      // Pending astrologers can log in. Their restricted dashboard is shown
      // below; protected consultation/earnings queries are skipped until approval.
}
    const goToQuestion=pendingAfterLogin==="question" || window.__SMV_ASK_NOW_INTENT===true;
    const goToAdmin=pendingAfterLogin==="admin";
    const profile=await getUserProfile(loginCred.user.uid);
    const role=String(profile.role||loginRole||"customer").toLowerCase();
    const adminUser=(loginCred.user.uid===ADMIN_UID || role==="admin");
    setHeaderRoleLabel(adminUser?'admin':role);
    window.__smvCurrentRole=adminUser?'admin':role;

    /* IMPORTANT: Do NOT clear pendingAfterLogin before the Firebase
       onAuthStateChanged callback has seen the protected ASK NOW intent.
       signInWithEmailAndPassword() fires onAuthStateChanged asynchronously.
       Clearing this flag here creates a race: the auth listener thinks this
       is a normal login and opens Customer Dashboard while submitAuth() is
       trying to open the Question Form. This was the root cause of the
       screenshot: Dashboard title visible, Question Form missing. */
    closeModal();

    /* ASK NOW routing: Customer -> Customer Dashboard + Question Form.
       Astrologer -> Astrologer Dashboard. Admin -> Admin Dashboard.
       Staff accounts never enter the customer question flow. */
    if(goToQuestion){
      if(adminUser){
        hide("dashboard"); hide("ask-flow"); hide("dashLink");
        hidePrimarySections("admin"); show("admin"); show("adminLink");
        await loadAdminPanel();
        setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
        smvShowRoleNav();
        smvEnterInternalView("admin",true);
        go("admin");
      }else if(role==="astrologer"){
        // ASK NOW is a customer-only transaction. Never route an Astrologer
        // account into the Astrologer Dashboard from this protected action.
        // This prevents the Ask Now flow from interacting with dashboard
        // initialization or causing a dashboard-loading/routing race.
        askNowTransitionLock=false;
        window.__SMV_ASK_NOW_INTENT=false;
        pendingAfterLogin=null;
        hide("dashboard"); hide("dashboardContent"); hide("admin"); hide("ask-flow");
        hide("adminLink");
        smvShowRoleNav();
        smvNotice("Customer Login Required","Ask Now is available for Customer accounts only. Please use a Customer account to ask an astrology question.","!");
      }else{
        await openQuestionService({fastAfterLogin:true,profile});
      }
      // The protected destination has now been consumed. Only clear it AFTER
      // the destination routing has completed so Firebase auth-state callbacks
      // cannot hijack this navigation.
      pendingAfterLogin=null;
      return;
    }
    pendingAfterLogin=null;
    hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink");
    if(goToAdmin || adminUser){
      pendingAfterLogin=null;
      if(adminUser){
        hidePrimarySections("admin");
        show("admin");
        show("adminLink");
        smvShowRoleNav();
        smvEnterInternalView("admin",true);
        go("admin");
        await loadAdminPanel();
        setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
      }else{
        openModal('<h2>Admin Access</h2><div class="error">This account is not an Admin account.</div><p class="small">Please use your Admin login.</p>');
      }
    }else{
      show("dashLink");
      hidePrimarySections("dashboard");
      hide("register-flow");
      hide("astro-register-form");
      hide("astro-flow");
      hide("ask-flow");
      hide("appointment");
      hide("contact");
      hide("home");
      hide("askNowSection");
      hide("approved-astrologers");
      hide("faq");
      // Enter Dashboard immediately after successful authentication. Do not
      // block navigation on the full Firestore/dashboard hydration. This fixes
      // the Login -> Dashboard case when dashboard data is slow or temporarily
      // unavailable. The dashboard renderer hydrates the already-visible shell.
      show("dashboard");
      show("dashboardContent");
      if($("dashboardTitle")) $("dashboardTitle").textContent=role==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
      if($("dashboardContent")) $("dashboardContent").innerHTML='<div class="card"><div class="small">Loading your dashboard...</div></div>';
      smvShowRoleNav();
      smvEnterInternalView("dashboard",true);
      go("dashboard");
      loadDashboard(role).catch(err=>console.warn("Login dashboard load skipped:",err));
    }
    return;
  }
  const name=$("name").value.trim(),phone=$("phone").value.trim();
  const phoneDigits=phone.replace(/\D/g,"");
  if(!name||password.length<6){msg.innerHTML='<span class="error">Enter name and a password of at least 6 characters.</span>';return;}
  if(!phone || phoneDigits.length<7 || phoneDigits.length>15){msg.innerHTML='<span class="error">Enter a valid mobile number. It will be saved to your profile; no SMS/OTP verification is required. Email verification only will be used.</span>';return;}
  let cred=null;
  let createdNewAuthUser=false;
  let profileResponse=null;
  try{
    try{
      cred=await withTimeout(createUserWithEmailAndPassword(auth,email,password),20000);
      createdNewAuthUser=true;
    }catch(authErr){
      // Recovery path: a previous attempt may have created Firebase Auth
      // before the unique-phone/profile transaction failed. Re-authenticate the
      // SAME email with the submitted password, then let the trusted backend
      // create the missing profile/ID using the newly corrected mobile number.
      if(authErr?.code==="auth/email-already-in-use") {
        try {
          cred=await withTimeout(signInWithEmailAndPassword(auth,email,password),20000);
          createdNewAuthUser=false;
        } catch(recoveryAuthErr) {
          recoveryAuthErr.smvRecovery=true;
          throw recoveryAuthErr;
        }
      } else {
        throw authErr;
      }
    }

    currentUser=cred.user;
    try{if(name && cred.user.displayName!==name) await updateProfile(cred.user,{displayName:name});}catch(profileNameErr){console.warn("Display name update skipped",profileNameErr);}
    msg.innerHTML='<span class="small">Account created. Setting up your Customer ID...</span>';
    btn.textContent="CREATING CUSTOMER ID...";

    // Profile/counter writes are intentionally handled by the trusted Render
    // backend. This avoids client-side Firestore Rules mismatches during the
    // first registration and prevents a COUNTER_ERROR from leaving a half
    // created Auth account behind.
    profileResponse=await renderApi("/register-customer-profile",{
      method:"POST",
      body:JSON.stringify({name,phone,language:"en"})
    },cred.user);
    if(!profileResponse?.ok) throw new Error(profileResponse?.error||"Customer profile setup failed.");
    try{await withTimeout(sendEmailVerification(cred.user),15000);}catch(ve){console.warn("Verification email could not be sent immediately",ve);}
  }catch(profileErr){
    console.error("Customer registration/profile save failed",profileErr);
    // Do not leave a half-created Auth account behind when this was a brand-new
    // registration. That was the reason subsequent attempts showed
    // auth/email-already-in-use after a COUNTER_ERROR.
    if(createdNewAuthUser && !profileResponse?.ok && auth?.currentUser?.uid===cred?.user?.uid){
      try{await deleteUser(auth.currentUser);}catch(cleanupErr){console.warn("Auth cleanup failed",cleanupErr);}
      currentUser=null;
    }
    throw profileErr;
  }
  const createdId = profileResponse?.publicId ? `<br><b>Your Customer ID:</b> ${escapeHtml(profileResponse.publicId)}<br><span class="small">Keep this ID safe. It can be used for future Customer ID login.</span>` : '';
  msg.innerHTML='<span class="success"><b>Registration successful ✓</b>'+createdId+'<br>Mobile number saved. One mobile number can be used for only one account.<br>No SMS/OTP is required. Verification email sent. Please verify your email and login again.</span><button class="btn" id="registrationLoginBtn" style="margin-top:10px">Go to Login</button>';
  $("registrationLoginBtn").onclick=async()=>{await logoutToHome();openAuth("login");};
 }catch(e){
  let t=e?.message||String(e);
  if(e?.code==="auth/wrong-password"||e?.code==="auth/invalid-credential") t="Incorrect email or password.";
  if(e?.code==="auth/invalid-email") t="Please enter a correct email ID.";
  if(e?.code==="auth/email-already-in-use") t="This email is already registered. Please use Login. If you have not verified your email, choose Resend Verification Email.";
  if(e?.code==="auth/network-request-failed") t="Network connection failed. Please try again.";
  if(/profile setup failed|server/i.test(t)) t="Registration could not finish the secure profile setup. Please check that the existing Render backend is online, then try again.";
  msg.innerHTML='<span class="error">'+escapeHtml(t)+'</span>';
 }finally{if($("submitAuth")){btn.disabled=false;btn.textContent=mode==="login"?"Login":"Create Account";}}
}
let authReadyResolve;
const authReady=new Promise(r=>authReadyResolve=r);
function waitForAuthReady(){return authReady;}
// ---------- Astrologer list ----------
async function loadAstrologers(){ return loadAstroCards(); }
let smvAstroListRequest=null;
function loadAstroCards(){
 if(smvAstroListRequest)return smvAstroListRequest;
 smvAstroListRequest=smvLoadAstroCards().finally(()=>smvAstroListRequest=null);return smvAstroListRequest;
}
async function smvLoadAstroCards(){
 const box=$("astroCards");if(!box)return;box.innerHTML='<div class="empty">Loading approved astrologers...</div>';
 const clampRating=v=>Math.max(0,Math.min(5,Number(v)||0));
 const ratingStars=v=>{
   const n=clampRating(v);
   return `<span class="smv-rating-stars" aria-label="${n.toFixed(1)} out of 5">${[0,1,2,3,4].map(i=>`<span class="smv-rating-star" style="--fill:${Math.max(0,Math.min(1,n-i))*100}%">★</span>`).join('')}</span>`;
 };
 const ratingSummary=reviews=>{
   const valid=(Array.isArray(reviews)?reviews:[]).filter(r=>Number(r.rating)>0);
   const avg=valid.length?valid.reduce((sum,r)=>sum+clampRating(r.rating),0)/valid.length:0;
   return {avg,count:valid.length};
 };
 const getReviews=async a=>{
   try{
     const rr=await withTimeout(fetch(RAZORPAY_BACKEND_URL+"/public/astrologers/"+encodeURIComponent(a.id)+"/reviews",{cache:"no-store"}),10000);
     const rd=await rr.json().catch(()=>({}));if(!rr.ok)throw new Error(rd.error||`Review service returned HTTP ${rr.status}.`);
     return Array.isArray(rd.reviews)?rd.reviews:[];
   }catch(apiErr){
     console.warn('Public review API unavailable; using Firestore fallback:',apiErr);
     const snap=await withTimeout(getDocs(query(collection(db,'smv_reviews'),where('astrologerId','==',a.id),where('approved','==',true))),10000);
     return snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
   }
 };
 const addPrivateRating=(a,summary)=>{
   const host=$('privateConsultationAstrologers'); if(!host)return;
   const target=[...host.querySelectorAll('.smv-private-consult-row')].find(row=>{
     const name=(row.querySelector('h3')?.textContent||'').trim().toLowerCase();
     return name===String(a.name||'').trim().toLowerCase();
   });
   if(!target)return;
   let el=target.querySelector('.smv-private-rating-summary');
   if(!el){el=document.createElement('div');el.className='smv-private-rating-summary';const desc=target.querySelector('.smv-private-consult-description');(desc||target.querySelector('.smv-private-consult-head')||target).insertAdjacentElement(desc?'beforebegin':'afterend',el);}
   el.innerHTML=summary.count?`${ratingStars(summary.avg)} <strong>${summary.avg.toFixed(1)} / 5</strong>`:`<span class="smv-rating-none">No ratings yet</span>`;
 };
 try{
  let items=[];
  try {
    const r=await withTimeout(fetch(RAZORPAY_BACKEND_URL+"/public/astrologers",{cache:"no-store"}),12000);
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||`Astrologer service returned HTTP ${r.status}.`);
    items=Array.isArray(d.astrologers)?d.astrologers:[];
  } catch(backendErr) {
    console.warn("Public astrologer backend unavailable; using Firestore fallback:",backendErr);
    const snap=await withTimeout(getDocs(query(collection(db,"smv_astrologers"),where("status","==","approved"))),12000);
    items=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
  }
  if(!items.length){box.innerHTML='<div class="empty">No approved astrologers available yet.</div>';return;}
  box.innerHTML="";
  items.forEach(a=>{
    const row=document.createElement("article");
    row.className="smv-astro-directory-row";
    const photo=a.photoData||a.photoURL||a.photoUrl||"";
    const description=a.profileDescription||a.bio||a.about||"Professional astrologer";
    row.innerHTML=`<div class="smv-astro-directory-head">${photo?`<img src="${escapeHtml(photo)}" alt="${escapeHtml(a.name||'Astrologer')} photo">`:''}<div><h3>${escapeHtml(a.name||"Astrologer")}</h3><p class="smv-astro-speciality"><b>${escapeHtml(a.expertise||a.specialization||"Astrology")}</b></p><p class="small">${escapeHtml(a.experience||"Experienced")} years experience</p></div></div><div class="smv-astro-rating-summary"><span class="smv-rating-loading">Loading ratings...</span></div><p class="smv-astro-description">${escapeHtml(description)}</p><button class="btn gray smv-review-toggle" type="button" aria-expanded="false">REVIEWS &amp; RATINGS</button><div class="smv-inline-reviews hidden"><div class="empty">Reviews will load when opened.</div></div>`;
    const btn=row.querySelector('.smv-review-toggle'),reviewBox=row.querySelector('.smv-inline-reviews'),summaryBox=row.querySelector('.smv-astro-rating-summary');
    let loaded=false,reviewsCache=null;
    const ensureReviews=async()=>{if(reviewsCache)return reviewsCache;reviewsCache=await getReviews(a);return reviewsCache;};
    ensureReviews().then(reviews=>{
      const summary=ratingSummary(reviews);
      summaryBox.innerHTML=summary.count?`${ratingStars(summary.avg)} <strong>${summary.avg.toFixed(1)} / 5</strong> <span class="smv-rating-count">(${summary.count} review${summary.count===1?'':'s'})</span>`:`<span class="smv-rating-none">No ratings yet</span>`;
      addPrivateRating(a,summary);
      const host=$('privateConsultationAstrologers');
      if(host&&!host.__smvRatingObserver){host.__smvRatingObserver=new MutationObserver(()=>items.forEach(x=>{if(x.__smvSummary)addPrivateRating(x,x.__smvSummary);}));host.__smvRatingObserver.observe(host,{childList:true,subtree:true});}
      a.__smvSummary=summary;
    }).catch(err=>{console.warn('Rating summary load failed:',err);summaryBox.innerHTML='<span class="smv-rating-none">Ratings unavailable</span>';});
    btn.onclick=async()=>{
      const opening=reviewBox.classList.contains('hidden');
      reviewBox.classList.toggle('hidden',!opening);btn.setAttribute('aria-expanded',String(opening));
      btn.textContent=opening?'HIDE REVIEWS & RATINGS':'REVIEWS & RATINGS';
      if(!opening||loaded)return;
      reviewBox.innerHTML='<div class="empty">Loading reviews...</div>';
      try{
        const reviews=await ensureReviews();
        reviewBox.innerHTML=reviews.length?reviews.map(r=>`<div class="smv-directory-review"><div class="stars">${ratingStars(r.rating)} <strong>${clampRating(r.rating).toFixed(1)} / 5</strong></div><p>${escapeHtml(r.review||'Verified customer review')}</p><span class="small">${escapeHtml(r.customerName||r.name||'Verified customer')}</span></div>`).join(''):'<div class="empty">No approved reviews for this astrologer yet.</div>';
        loaded=true;
      }catch(err){console.error('Directory review load failed:',err);reviewBox.innerHTML='<div class="empty error">Reviews are temporarily unavailable.</div>';}
    };
    box.appendChild(row);
  });
 }catch(e){console.error("Approved astrologers load failed:",e);box.innerHTML='<div class="empty error">Approved astrologers are temporarily unavailable.</div>';}
}
window.__smvReloadAstrologers=loadAstroCards;
window.dispatchEvent(new Event('smv:app-ready'));
let smvOfferQuote=null;
function ensureOfferControls(){
  const rateBox=$("askRate"); if(!rateBox||$("smvPromoCode"))return;
  const wrap=document.createElement("div");wrap.id="smvOfferControls";wrap.className="action-row";wrap.style.margin="8px 0";
  wrap.innerHTML='<input id="smvPromoCode" maxlength="40" autocomplete="off" placeholder="Promotion code (optional)" style="max-width:220px"><button class="btn" type="button" id="smvApplyPromo">APPLY</button><span class="small" id="smvOfferMsg"></span>';
  rateBox.insertAdjacentElement("afterend",wrap);
  $("smvApplyPromo").onclick=()=>refreshOfferQuote(true);
}
async function refreshOfferQuote(showInvalid=false){
  ensureOfferControls(); if(!currentUser||!questionServicePrice)return null;
  const code=String($("smvPromoCode")?.value||"").trim();
  try{
    const q=await renderApi("/offers/quote",{method:"POST",body:JSON.stringify({service:"public_question",originalAmount:questionServicePrice,promoCode:code})});
    smvOfferQuote=q; const rate=$("askRate"),msg=$("smvOfferMsg");
    if(q.offerId){if(rate)rate.innerHTML=`<b><s>₹${Number(q.originalAmount).toFixed(2)}</s> ₹${Number(q.finalAmount).toFixed(2)} per Question</b>`;if(msg)msg.innerHTML=`<span class="success">${escapeHtml(q.bannerText||q.offerName||'Offer applied')}</span>`;}
    else{if(rate)rate.innerHTML=`<b>₹${Number(q.finalAmount||questionServicePrice).toFixed(2)} per Question</b>`;if(msg)msg.innerHTML=code&&showInvalid?'<span class="error">Promotion code is not valid or not eligible for this account.</span>':'';}
    return q;
  }catch(e){if($("smvOfferMsg")&&showInvalid)$("smvOfferMsg").innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';return null;}
}

let questionPriceUnsubscribe=null;
async function loadQuestionPrice(){
  const rateBox=$("askRate");
  if(rateBox) rateBox.innerHTML='<b>Loading current question price...</b>';
  try{
    const snap=await withTimeout(getDoc(doc(db,"smv_settings","question")),10000);
    if(!snap.exists()) throw new Error("Question price document is missing: smv_settings/question");
    const v=Number(snap.data()?.price);
    if(!Number.isFinite(v)||v<1) throw new Error("Question price is invalid in smv_settings/question");
    questionServicePrice=v;
    if(rateBox) rateBox.innerHTML=`<b>₹${questionServicePrice.toFixed(2)} per Question</b>`;
    if($("publicQuestionPrice")) $("publicQuestionPrice").textContent=`₹${questionServicePrice.toFixed(2)}`;
    ensureOfferControls();
    refreshOfferQuote(false).catch(()=>{});
  }catch(e){
    console.error("QUESTION PRICE LOAD ERROR:",e);
    const adminValue=Number($("questionPrice")?.value);
    if(Number.isFinite(adminValue)&&adminValue>=1){
      questionServicePrice=adminValue;
      if(rateBox) rateBox.innerHTML=`<b>₹${questionServicePrice.toFixed(2)} per Question</b><br><span class="error small">Firebase public price read failed; payment will be rechecked by the server.</span>`;
    }else{
      questionServicePrice=0;
      if(rateBox) rateBox.innerHTML='<b class="error">Question price unavailable. Firebase could not read smv_settings/question.</b>';
    }
  }
  if(!questionPriceUnsubscribe){
    questionPriceUnsubscribe=onSnapshot(doc(db,"smv_settings","question"),snap=>{
      const v=Number(snap.data()?.price);
      if(Number.isFinite(v)&&v>=1){
        questionServicePrice=v;
        if($("askRate")) $("askRate").innerHTML=`<b>₹${questionServicePrice.toFixed(2)} per Question</b>`;
        if($("publicQuestionPrice")) $("publicQuestionPrice").textContent=`₹${questionServicePrice.toFixed(2)}`;
        refreshOfferQuote(false).catch(()=>{});
      }
    },err=>console.warn("QUESTION PRICE LISTENER ERROR:",err));
  }
}
function showAskFlow(a){openQuestionService();}
// Customer dashboard retry for questions whose payment was not completed.
// Reuses the existing server-side /create-order endpoint with the SAME questionId,
// so retry never creates a duplicate question.
async function retryCustomerPayment(questionId, triggerButton){
  if(!currentUser) return;
  const id=String(questionId||'').trim();
  if(!id) return;
  const btn=triggerButton; const originalLabel=btn?.textContent||'Retry Payment';
  if(btn){btn.disabled=true;btn.textContent='CREATING PAYMENT...';}
  try{
    const orderRes=await withTimeout(renderApi("/create-order",{method:"POST",body:JSON.stringify({questionId:id,serviceName:"Public Astrology Question"})}),30000);
    if(orderRes?.alreadyPaid){await loadDashboard("customer",true);return;}
    await ensureRazorpayCheckout();
    const {orderId,keyId,amount:paise,currency}=orderRes||{};
    if(!orderId||!keyId) throw new Error(orderRes?.error||"Payment order could not be created. Please try again.");
    const options={
      key:keyId, amount:paise, currency:currency||"INR", name:"SMV ASTRO SERVICES",
      description:"Public astrology question", order_id:orderId,
      prefill:{email:currentUser.email||""}, notes:{questionId:id}, theme:{color:"#6b21a8"},
      handler:async function(response){
        if(btn){btn.disabled=true;btn.textContent='CONFIRMING PAYMENT...';}
        try{
          const vr=await withTimeout(renderApi("/verify-payment",{method:"POST",body:JSON.stringify({
            questionId:id, razorpay_order_id:response.razorpay_order_id,
            razorpay_payment_id:response.razorpay_payment_id, razorpay_signature:response.razorpay_signature
          })}),30000);
          if(!vr?.verified) throw new Error(vr?.error||"Payment verification failed. Please retry.");
          try{sessionStorage.setItem("smv_last_payment_success",JSON.stringify({
            customerUid:currentUser.uid,questionId:id,paymentId:vr.customerPaymentId||"",
            paymentDate:smvDateTime(vr.paymentRecordedAt||new Date())
          }));}catch(_e){}
          await loadDashboard('customer',true);
          await showDashboardPaymentSuccess();
          window.scrollTo({top:0,behavior:'smooth'});
        }catch(e){
          console.error('Retry payment verification failed:',e);
          alert(e?.message||String(e)||'Payment verification failed. Please retry.');
          if(btn){btn.disabled=false;btn.textContent=originalLabel;}
        }
      },
      modal:{ondismiss:function(){if(btn){btn.disabled=false;btn.textContent=originalLabel;}}}
    };
    smvAssertLiveCheckout(options.key);
  const rzp=new Razorpay(options);
    rzp.on('payment.failed',function(resp){
      console.warn('Retry payment failed:',resp);
      alert('Payment failed: '+(resp?.error?.description||'Please try again.'));
      if(btn){btn.disabled=false;btn.textContent=originalLabel;}
    });
    rzp.open();
  }catch(e){
    console.error('Retry payment start failed:',e);
    alert(e?.message||String(e)||'Payment could not be started.');
    if(btn){btn.disabled=false;btn.textContent=originalLabel;}
  }
}
window.__smvRetryCustomerPayment=retryCustomerPayment;
$("submitQuestionBtn")?.addEventListener("click",async()=>{
 const name=$("birthName").value.trim();
 const text=$("questionText").value.trim();
 if(!currentUser){message("askMsg",'<span class="error">Please login before asking.</span>');return;}
 if(!name){message("askMsg",'<span class="error">Please enter the person\'s name.</span>');$("birthName").focus();return;}
 if(!$("birthDate").value||!$("birthTime").value||!$("birthPlace").value.trim()){message("askMsg",'<span class="error">Please complete all birth details.</span>');return;}
 if(!text){message("askMsg",'<span class="error">Please enter your question.</span>');return;}
 const amount=Number(questionServicePrice||0);
 if(!Number.isFinite(amount)||amount<1){message("askMsg",'<span class="error">Invalid question price.</span>');return;}
 const btn=$("submitQuestionBtn");btn.disabled=true;btn.textContent="CREATING PAYMENT...";
 // A new payment attempt must never inherit a previous successful-payment banner.
 // The banner is only recreated after the current Razorpay payment is server-verified.
 try{ sessionStorage.removeItem("smv_last_payment_success"); }catch(_e){}
 try{
  // PAYMENT COMPATIBILITY FIX:
  // Create a non-empty Firestore document ID in the browser before calling Render.
  // This keeps the flow compatible with both the new Render backend and any
  // currently-running older backend that still requires questionId.
  // IMPORTANT: birth date/time are stored as the user's entered wall-clock values
  // and explicitly tagged as Asia/Kolkata; they are NOT converted through UTC.
   const makeQuestionId=()=>{try{return crypto.randomUUID().replace(/-/g,"").slice(0,20);}catch(e){return "q_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);}};
   const birthDate=$("birthDate").value;
   const birthTime=$("birthTime").value;
   const birthPlace=$("birthPlace").value.trim();
   const birthGender=$("birthGender").value;
   const payload={customerName:name,question:text,amount,birthDetails:{name,birthDate,birthTime,birthPlace,birthGender,timezone:"Asia/Kolkata",utcOffsetMinutes:330},serviceName:"Public Astrology Question",customerEmail:currentUser.email||"",promoCode:String($("smvPromoCode")?.value||"").trim()};
  const orderRes=await withTimeout(renderApi("/create-order",{method:"POST",body:JSON.stringify(payload)}),30000);
  if(orderRes?.questionId) pendingQuestionId=String(orderRes.questionId).trim();
  const {orderId,keyId,amount:paise,currency}=orderRes||{};
  if(orderRes?.offerId&&$("smvOfferMsg"))$("smvOfferMsg").innerHTML=`<span class="success">${escapeHtml(orderRes.offerBannerText||orderRes.offerName||'Offer applied')} — Pay ₹${(Number(paise||0)/100).toFixed(2)}</span>`;
  if(!pendingQuestionId||!orderId||!keyId){throw new Error("Payment order was not created correctly. Please retry.");}
  // Keep the red payment button in its normal state while Razorpay is opening.
  // Only after Razorpay closes and returns a payment response do we show
  // CONFIRMING PAYMENT... in this same red button while server verification runs.
  const options={
   key:keyId,amount:paise,currency:currency||"INR",name:"SMV ASTRO SERVICES",
   description:"Public astrology question",order_id:orderId,
   prefill:{email:currentUser.email||""},
   notes:{questionId:pendingQuestionId},
   theme:{color:"#6b21a8"},
   handler:async function(response){
    // Razorpay has returned. The same red button now becomes the only status area.
    btn.disabled=true; btn.textContent="CONFIRMING PAYMENT...";
    try{
     message("askMsg","");
     const vr=await withTimeout(renderApi("/verify-payment",{method:"POST",body:JSON.stringify({
      questionId:pendingQuestionId,razorpay_order_id:response.razorpay_order_id,
      razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature
     })}),30000);
     if(vr?.verified){
      const customerPay=vr.customerPaymentId||'Pending';
      const astroPay=null;
      message("askMsg","");
      btn.disabled=false;btn.textContent="PAYMENT DONE ✓";
      const successPanel=$("paymentSuccessPanel"), successDetails=$("paymentSuccessDetails");
      const verifiedQuestionId=String(vr.questionId||pendingQuestionId).trim();
      pendingQuestionId=verifiedQuestionId;
      if(successDetails) successDetails.innerHTML='<b>Question ID:</b> '+escapeHtml(verifiedQuestionId)+'<br><b>Payment ID:</b> '+escapeHtml(customerPay)+'<br><b>Payment Date & Time:</b> '+escapeHtml(smvDateTime(vr.paymentRecordedAt||new Date()))+'<br><b>Status:</b> Waiting for Admin question approval';
      if(successPanel) show("paymentSuccessPanel");
      // Preserve the verified payment details until the customer dashboard is loaded.
      try{
        sessionStorage.setItem("smv_last_payment_success",JSON.stringify({
          customerUid:currentUser?.uid||"",
          questionId:verifiedQuestionId||"",
          paymentId:customerPay||"",
          paymentDate:smvDateTime(vr.paymentRecordedAt||new Date())
        }));
      }catch(_e){}

      pendingQuestionId="";
      // Razorpay checkout closes itself after a successful payment. Do not ask
      // the customer to press a second "Creating Payment" / Continue button.
      // Close the question window immediately after verification, then open the
      // existing Customer Dashboard and show its existing payment-success state.
      try{ hide("paymentSuccessPanel"); }catch(_e){}
      try{
        window.__SMV_ASK_NOW_INTENT=false;
        pendingAfterLogin=null;
        smvClosePublicQuestionWindow();
        await loadDashboard('customer',true);
        await showDashboardPaymentSuccess();
        window.scrollTo(0,0);
      }catch(dashErr){ console.error("Automatic customer dashboard transition failed:",dashErr); }
      btn.disabled=false; btn.textContent="PAYMENT DONE ✓";
      return;

     }else{throw new Error("Payment verification failed.");}
    }catch(err){const detail=err?.message||String(err)||"Payment verification failed.";message("askMsg",'<span class="error">Payment received, but verification failed.<br><small>'+escapeHtml(detail)+'</small><br>Please retry verification.</span>');btn.disabled=false;btn.textContent="RETRY VERIFICATION";}
   },
   modal:{ondismiss:function(){
     // Closing/backing out of Razorpay is NOT a successful payment.
     // Clear any transient success state and leave the question unpaid.
     try{ sessionStorage.removeItem("smv_last_payment_success"); }catch(_e){}
     message("askMsg",'<span class="small">Payment window closed. No payment was confirmed. Your question is still awaiting payment. You can retry.</span>');
     btn.disabled=false;btn.textContent="RETRY PAYMENT";
   }}
  };
  smvAssertLiveCheckout(options.key);
  const rzp=new Razorpay(options);
  rzp.on("payment.failed",function(resp){
    try{ sessionStorage.removeItem("smv_last_payment_success"); }catch(_e){}
    message("askMsg",'<span class="error">Payment failed: '+escapeHtml(resp.error?.description||"Please try again.")+'</span>');
    btn.disabled=false;btn.textContent="RETRY PAYMENT";
  });
  rzp.open();
 }catch(e){
   const detail=e?.message||e?.details||e?.error?.message||String(e);
   const code=e?.code?` [${escapeHtml(String(e.code))}]`:"";
   console.error("SMV ASTRO payment error",e);
   message("askMsg",'<span class="error"><b>Payment could not be started.</b>'+code+'<br>'+escapeHtml(detail)+'</span>');
   btn.disabled=false;btn.textContent="RETRY PAYMENT";
 }
});

// ---------- Astrologer registration ----------
async function compressPhoto(file){
  if(!file) throw new Error("Profile photo is required.");
  return new Promise((resolve,reject)=>{
    const img=new Image(), reader=new FileReader();
    reader.onload=()=>{img.onload=()=>{const max=320, scale=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale)); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',0.78));}; img.onerror=()=>reject(new Error("Could not read profile photo.")); img.src=reader.result;};
    reader.onerror=()=>reject(new Error("Could not read profile photo.")); reader.readAsDataURL(file);
  });
}
$("astroRegistrationForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const form=e.target,btn=form.querySelector('button[type="submit"]');
 const name=$("arName").value.trim(),mobile=$("arMobile").value.trim(),email=$("arEmail").value.trim(),password=$("arPassword").value,specialization=$("arSpecialization").value.trim(),experience=Number($("arExperience").value||0),bio=$("arBio").value.trim(),bankName=$("arBankName").value.trim(),accountName=$("arAccountName").value.trim(),accountNumber=$("arAccountNumber").value.trim(),ifsc=$("arIfsc").value.trim(),upi=$("arUpi").value.trim(),photoFile=$("arPhoto").files[0];
 if(!name||!mobile||!email||password.length<6||!specialization||experience<0||!bio||!bankName||!accountName||!accountNumber||!ifsc||!photoFile){message("astroRegMsg",'<span class="error">Please complete all required fields.</span>');return;}
 btn.disabled=true;btn.textContent="CREATING ACCOUNT...";message("astroRegMsg",'<span class="small">Creating your account...</span>');
 try{
  const photoData=await compressPhoto(photoFile);
  let cred=null, createdNewAstroAuthUser=false, profileResponse=null;
  try{
    cred=await withTimeout(createUserWithEmailAndPassword(auth,email,password),20000);
    createdNewAstroAuthUser=true;
  }catch(authErr){
    if(authErr?.code==="auth/email-already-in-use"){
      // Recover an orphan Auth account created by an earlier failed mobile/profile attempt.
      cred=await withTimeout(signInWithEmailAndPassword(auth,email,password),20000);
    }else throw authErr;
  }
  const uid=cred.user.uid;
  currentUser=cred.user;
  try{if(name && cred.user.displayName!==name) await updateProfile(cred.user,{displayName:name});}catch(profileNameErr){console.warn("Astrologer display name update skipped",profileNameErr);}
  try {
    profileResponse=await withTimeout(renderApi("/register-astrologer-profile",{
      method:"POST",
      body:JSON.stringify({name,mobile,specialization,experience,bio,bankName,accountName,accountNumber,ifsc,upi,photoData,language:"en"})
    },cred.user),30000);
  } catch(networkErr) {
    const raw=String(networkErr?.message||networkErr||"");
    if(/failed to fetch|networkerror|load failed|cors/i.test(raw)) {
      throw new Error("Server connection failed. The Render backend is not reachable right now. Please wait a few seconds and press SUBMIT REGISTRATION again.");
    }
    throw networkErr;
  }
  if(!profileResponse?.ok) throw new Error(profileResponse?.error||"Astrologer profile setup failed.");
  try{await withTimeout(sendEmailVerification(cred.user));}catch(ve){}
  btn.textContent="SAVING PROFILE...";
  form.reset();btn.disabled=false;btn.textContent="SUBMITTED ✓";await signOut(auth);currentUser=null;selectedAstro=null;hide("astro-register-form");hide("register-flow");hide("astro-flow");window.scrollTo({top:0,behavior:"smooth"});openModal('<h2>Registration Complete ✓</h2><p class="success"><b>Your astrologer application has been submitted successfully.</b></p><p><b>Your Astrologer ID: '+escapeHtml(profileResponse.publicId||'')+'</b></p><p>Keep this ID safe for future Astrologer ID login.</p><p>Your verification email has been sent.</p><p><b>Waiting for Admin Approval.</b></p><button class="btn gray" id="astroRegistrationClose">Close</button>');$("astroRegistrationClose").onclick=closeModal;
 }catch(err){
  // If this attempt created a brand-new Auth user but profile/ID creation failed
  // (for example because the mobile belongs to another account), remove only
  // that brand-new orphan Auth record so the same email can be retried cleanly.
  try{if(createdNewAstroAuthUser && !profileResponse?.ok && auth?.currentUser?.uid===cred?.user?.uid){await deleteUser(auth.currentUser);currentUser=null;}}catch(cleanupErr){console.warn("Astrologer Auth cleanup failed",cleanupErr);}
  let text=err?.message||String(err);if(err?.code==="auth/invalid-email")text="Please enter a correct email ID.";else if(err?.code==="auth/email-already-in-use")text="This email is already registered. Please use Login instead.";else if(err?.code==="auth/operation-not-allowed")text="Email/Password registration is disabled in Firebase Authentication.";else if(err?.code==="auth/network-request-failed")text="Firebase network connection failed. Check your internet connection.";else if(err?.code==="permission-denied")text="Firestore permission denied. Check Firestore Rules.";message("astroRegMsg",'<span class="error"><b>Registration failed:</b> '+escapeHtml(text)+'</span>');btn.disabled=false;btn.textContent="SUBMIT REGISTRATION";}
});
// ---------- Dashboard / admin / session ----------
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_TOUCH_MS = 30 * 1000;
let idleTimer=null, lastActivity=Date.now(), intentionalLogout=false, lastAuthUid=null;
let dashboardLoadSeq=0;
let dashboardLoadPromise=null;
let dashboardLoadUid=null;
function touchSession(){ if(!currentUser) return; lastActivity=Date.now(); sessionStorage.setItem('smv_last_activity',String(lastActivity)); }
function clearIdleTimer(){ if(idleTimer){clearTimeout(idleTimer);idleTimer=null;} }
function armIdleTimer(){ clearIdleTimer(); if(!currentUser) return; const tick=()=>{ if(!currentUser)return; const idle=Date.now()-lastActivity; if(idle>=SESSION_IDLE_MS){ logoutToHome('Your session expired after 30 minutes of inactivity.'); return;} idleTimer=setTimeout(tick, Math.min(SESSION_IDLE_MS-idle,60000)); }; idleTimer=setTimeout(tick,60000); }
['click','touchstart','keydown','scroll','pointerdown'].forEach(ev=>window.addEventListener(ev,()=>{ if(currentUser && Date.now()-lastActivity>SESSION_TOUCH_MS) touchSession(); },{passive:true}));
window.addEventListener('pageshow',()=>{ if(currentUser){ touchSession(); armIdleTimer(); } });
window.__smvLogout = logoutToHome;
async function logoutToHome(reason=''){
  intentionalLogout=true; ++dashboardLoadSeq; dashboardLoadPromise=null; dashboardLoadUid=null; clearIdleTimer(); sessionStorage.removeItem('smv_last_activity');
  selectedAstro=null;
  try{await signOut(auth);}catch(e){console.warn("Logout failed",e);}
  currentUser=null;
  window.__smvCurrentUserPresent=false; window.__smvCurrentRole=null;
  window.__SMV_LOGGED_OUT=true;
  const authButton=$('authBtn');
  if(authButton) authButton.textContent='Login';
  setTimeout(()=>{if(!auth?.currentUser && $('authBtn')) $('authBtn').textContent='Login';},300);
  setTimeout(()=>{if(!auth?.currentUser && $('authBtn')) $('authBtn').textContent='Login';},1200);
  hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
  setHeaderRoleLabel('');
  smvClosePublicQuestionWindow(); hide('register-flow'); hide('astro-register-form'); hide('astro-flow'); hide('appointment'); hide('contact');
  showHomeSurface();
  show('smv-content-hub');
  show('english-horoscope'); window.__smvContentVisible=false;
  $('authBtn').textContent='Login'; closeModal(); window.scrollTo({top:0,behavior:'smooth'});
  window.__SMV_LOGGED_OUT=true;
  try{window.dispatchEvent(new Event('smv:logged-out'));}catch(_){ }
  if(reason) alert(reason);
}

async function renderNotifications(targetId){
  const box=$(targetId); if(!box||!currentUser)return;
  const notificationUid=currentUser.uid;
  try{
    const snap=await withTimeout(getDocs(query(collection(db,'smv_notifications'),where('userId','==',currentUser.uid))),15000);

    /* ================================================================
       SMV ASTRO — CUSTOMER NOTIFICATION LIVE STATUS RECONCILIATION V4
       IMPORTANT: Older payment notifications were created before the
       Question Approved notification existed and therefore may remain
       stored as "Payment successful / waiting for Admin approval".
       Do NOT depend on an Admin-side updateDoc succeeding. Instead,
       reconcile the notification DISPLAY directly from the canonical
       smv_questions document. This guarantees the Customer Dashboard
       shows the current approval state even when the old notification
       document is immutable or was created without questionId.
       ================================================================ */
    let privateNotificationItems=[];
    try{
      const pr=await renderApi('/customer/private-consultations?_fresh='+Date.now(),{method:'GET'});
      if(pr?.success&&Array.isArray(pr.consultations))privateNotificationItems=pr.consultations;
    }catch(privateNoteErr){console.warn('Private notification reconciliation skipped:',privateNoteErr);}
    const privateById=new Map(privateNotificationItems.map(c=>[String(c.id||c.consultationId||''),c]));

    let questionDocs=[];
    try{
      const qs=await withTimeout(getDocs(query(collection(db,'smv_questions'),where('customerId','==',currentUser.uid))),15000);
      questionDocs=qs.docs.map(d=>({id:d.id,data:d.data()||{}}));
    }catch(questionErr){
      console.warn('Customer notification question reconciliation skipped:',questionErr);
    }

    const questionByPayment=new Map();
    const questionById=new Map();
    questionDocs.forEach(item=>{
      const q=item.data||{};
      questionById.set(String(item.id),q);
      if(q.customerPaymentId) questionByPayment.set(String(q.customerPaymentId).trim(),{id:item.id,q});
    });

    if(currentUser?.uid!==notificationUid || $(targetId)!==box)return;
    const rows=snap.docs.map(d=>{
      const original=d.data()||{};
      const n={...original};
      let related=null;
      const directQid=String(n.questionId||'').trim();
      if(directQid && questionById.has(directQid)) related={id:directQid,q:questionById.get(directQid)};
      if(!related){
        const text=String(n.message||'');
        const match=text.match(/SMV-PAY-[A-Z0-9-]+/i);
        if(match) related=questionByPayment.get(match[0].trim())||null;
      }

      const privateId=String(n.consultationId||'').trim();
      const pc=privateId?privateById.get(privateId):null;
      if(pc){
        const astro=pc.astrologerName||'the selected astrologer';
        const st=String(pc.status||'');
        if(st==='question_rejected'){
          n.title='Private consultation question rejected';
          n.message=`Your private consultation question was rejected by Admin. Refund status: ${pc.refundStatus||'pending'}.`;
          n.type='private_question_rejected'; n.__displayTime=pc.refundProcessedAt||pc.refundCreatedAt||pc.updatedAt||n.createdAt;
        }else if(st==='revision_required'){
          n.title='Private answer revision in progress';
          n.message=`Admin requested a revision from ${astro}. The revised answer will be shown after approval.`;
          n.type='private_answer_revision'; n.__displayTime=pc.answerRejectedAt||pc.updatedAt||n.createdAt;
        }else if(st==='answered'){
          n.title='Private consultation answer ready';
          n.message=pc.customerViewedAt?`You viewed the approved private consultation answer from ${astro}.`:`The approved private consultation answer from ${astro} is ready to view.`;
          n.type='private_answer_ready'; n.__displayTime=pc.customerViewedAt||pc.answerApprovedAt||pc.answerSubmittedAt||pc.updatedAt||n.createdAt;
        }else if(st==='answer_pending_admin_approval'){
          n.title='Astrologer answer submitted';
          n.message=`${astro} submitted your private consultation answer. It is waiting for Admin approval.`;
          n.type='private_answer_submitted'; n.__displayTime=pc.answerSubmittedAt||pc.updatedAt||n.createdAt;
        }else if(st==='approved_for_astrologer'){
          n.title=pc.questionApprovalBypassed===true?'Private question auto allowed':'Private consultation question approved';
          n.message=`Your private consultation question is now visible to ${astro}.`;
          n.type='private_question_approved'; n.__displayTime=pc.questionApprovedAt||pc.paidAt||pc.updatedAt||n.createdAt;
        }else if(st==='pending_admin_approval'){
          n.title='Private consultation payment successful';
          n.message=`Your private consultation with ${astro} is waiting for Admin approval.`;
          n.type='private_consultation_payment'; n.__displayTime=pc.paidAt||pc.updatedAt||n.createdAt;
        }
      }

      if(related){
        const q=related.q||{};
        const approved=!!q.adminQuestionApprovedAt ||
          ['assigned_to_astrologer','reallocated','available_to_astrologers','claimed_by_astrologer','admin_approved','processing','answer_draft','admin_review','answered'].includes(String(q.status||''));
        const isOldPaymentNotification=
          String(n.type||'').toLowerCase()==='payment_success' ||
          String(n.type||'').toLowerCase()==='payment_verified' ||
          String(n.title||'').toLowerCase().includes('payment successful') ||
          String(n.message||'').toLowerCase().includes('waiting for admin approval');

        const answerSubmitted = !!String(q.answer||'').trim() &&
          ['processing','answer_draft','admin_review','revision_required','answered'].includes(String(q.status||''));
        const answerRejected = String(q.status||'')==='revision_required' || String(q.astrologerAnswerStatus||'')==='revision_required';
        const answerApproved = String(q.status||'')==='answered' || !!q.answerApprovedAt || !!q.adminAnswerApprovedAt;
        const astroName=q.astrologerName||'the selected astrologer';

        /* ============================================================
           CUSTOMER NOTIFICATION STAGE RECONCILIATION
           Canonical stage comes from smv_questions, not the old notification
           text. This fixes old Payment/Question Approved notifications after
           the astrologer has submitted an answer.
           ============================================================ */
        if(related && answerSubmitted){
          if(answerApproved){
            n.title='Answer Ready';
            n.message='Your astrologer answer has been approved by Admin. Your answer is now ready to view.';
            n.type='answer_ready';
            n.questionId=related.id;
            n.astrologerName=astroName;
            n.__displayTime=q.answerApprovedAt||q.adminAnswerApprovedAt||q.updatedAt||n.updatedAt||n.createdAt||n.dateTime;
          }else if(answerRejected){
            n.title='Answer Rejected — Revision Required';
            n.message='Admin has rejected the astrologer answer and requested a revision. The astrologer can revise and resubmit the answer.' + (q.adminRejectionReason ? ' Reason: '+String(q.adminRejectionReason) : '');
            n.type='answer_rejected';
            n.questionId=related.id;
            n.astrologerName=astroName;
            n.__displayTime=q.adminRejectedAt||q.updatedAt||n.updatedAt||n.createdAt||n.dateTime;
          }else{
            n.title='Astrologer Answer Submitted';
            n.message='Astro '+astroName.replace(/^Astro\s+/i,'')+' has submitted an answer to your question. It is now waiting for Admin approval.';
            n.type='astrologer_answer_submitted';
            n.questionId=related.id;
            n.astrologerName=astroName;
            n.__displayTime=q.answerSubmittedAt||q.updatedAt||n.updatedAt||n.createdAt||n.dateTime;
          }
        }else if(approved && isOldPaymentNotification){
          n.title='Question Approved';
          n.message='Your question has been approved by Admin and allocated to '+astroName+'.';
          n.type='question_approved';
          n.questionId=related.id;
          n.astrologerName=astroName;
          /* Use the real Admin approval time for ordering/display. */
          n.__displayTime=q.adminQuestionApprovedAt||q.updatedAt||n.updatedAt||n.createdAt||n.dateTime;
        }
      }

      /* ================================================================
   SMV ASTRO — CUSTOMER NOTIFICATION STATUS TIME
   Always use the real timestamp of the current notification status.
   ================================================================ */

if(related){

  const q=related.q||{};

  if(n.type==='question_approved'){

    n.__displayTime =
      q.adminQuestionApprovedAt ||
      q.questionApprovedAt ||
      q.updatedAt ||
      n.updatedAt ||
      n.createdAt ||
      n.dateTime;

  }

  else if(n.type==='astrologer_answer_submitted'){

    n.__displayTime =
      q.answerSubmittedAt ||
      q.astrologerAnswerSubmittedAt ||
      q.updatedAt ||
      n.updatedAt ||
      n.createdAt ||
      n.dateTime;

  }

  else if(n.type==='answer_rejected'){

    n.__displayTime =
      q.adminRejectedAt ||
      q.answerRejectedAt ||
      q.updatedAt ||
      n.updatedAt ||
      n.createdAt ||
      n.dateTime;

  }

  else if(n.type==='answer_ready'){

    n.__displayTime =
      q.answerApprovedAt ||
      q.adminAnswerApprovedAt ||
      q.updatedAt ||
      n.updatedAt ||
      n.createdAt ||
      n.dateTime;

  }

  else{

    n.__displayTime =
      n.updatedAt ||
      n.createdAt ||
      n.dateTime;

  }

}else{

  n.__displayTime =
    n.updatedAt ||
    n.createdAt ||
    n.dateTime;

}
      const ts=n.__displayTime;
      const seconds=Number(ts?.seconds||0);
      const millis=Number(ts?.toMillis?.()||0);
      n.__sort=millis||seconds*1000||(typeof ts==='number'?ts:0);
      return {doc:d,n};
    });

    /* ================================================================
   SMV ASTRO — CUSTOMER NOTIFICATION DEDUPLICATION
   Keep only ONE notification for each Question + current status.
   Answer Ready and Answer Rejected are deduplicated.
   Other notification types are left unchanged.
   ================================================================ */

const notificationGroups = new Map();

rows.forEach(row => {

  const n = row.n || {};
  const type = String(n.type || '').trim().toLowerCase();

  let key = '';

  if (
    type === 'answer_ready' ||
    type === 'answer_rejected'
  ) {

    const questionId = String(
      n.questionId || ''
    ).trim();

    if (questionId) {
      key = type + '|' + questionId;
    }

  }

  if (!key) return;

  if (!notificationGroups.has(key)) {
    notificationGroups.set(key, []);
  }

  notificationGroups
    .get(key)
    .push(row);
});


const duplicateIds = new Set();

for (const group of notificationGroups.values()) {

  if (group.length <= 1) continue;

  /* Newest notification is kept */
  group.sort((a,b) => {
    return (
      Number(b.n.__sort || 0) -
      Number(a.n.__sort || 0)
    );
  });

  /* Delete older duplicates from display */
  group.slice(1).forEach(row => {

    if (row.doc && row.doc.id) {
      duplicateIds.add(row.doc.id);
    }

  });
}


/* Remove duplicates from the current notification list */
if (duplicateIds.size) {

  rows.splice(
    0,
    rows.length,
    ...rows.filter(row =>
      !duplicateIds.has(row.doc.id)
    )
  );

}


/* Final notification ordering */
rows.sort((a,b) =>
  (Number(b.n.__sort || 0)) -
  (Number(a.n.__sort || 0))
);
    const docs=rows.slice(0,12);
    box.innerHTML=docs.length?docs.map(({n})=>{
      const when=smvDateTime(n.__displayTime||n.createdAt||n.updatedAt||n.dateTime);
      return `<article class="smv-notification-row"><h4 class="smv-notification-title">${escapeHtml(n.title||'Notification')}</h4><p class="smv-notification-content">${escapeHtml(n.message||'')}</p><p class="smv-notification-meta"><span class="smv-notification-label">Date &amp; Time:</span> <span class="smv-notification-result">${escapeHtml(when)}</span></p></article>`;
    }).join(''):'<div class="empty">No notifications.</div>';
  }catch(e){
    console.error('Customer notifications render error:',e);
    box.innerHTML='<div class="empty">Notifications unavailable.</div>';
  }
}
async function showDashboardPaymentSuccess(){
  const box=$("dashboardContent");
  if(!box || !currentUser) return;
  let info=null;
  try{info=JSON.parse(sessionStorage.getItem("smv_last_payment_success")||"null");}catch(_e){}
  if(!info || info.customerUid!==(currentUser?.uid||"") || !info.questionId) return;

  // Never trust sessionStorage alone. It is only a UI hint. Re-read the exact
  // question from Firestore and require the server-written paymentStatus=paid.
  try{
    const qSnap=await withTimeout(getDoc(doc(db,"smv_questions",String(info.questionId))),12000);
    if(!qSnap.exists()){
      sessionStorage.removeItem("smv_last_payment_success");
      return;
    }
    const q=qSnap.data()||{};
    const isPaid=String(q.customerId||"")===String(currentUser.uid||"") && String(q.paymentStatus||"").toLowerCase()==="paid";
    const samePayment=!info.paymentId || String(q.customerPaymentId||"")===String(info.paymentId||"");
    if(!isPaid || !samePayment){
      // Stale/cancelled/failed attempts must never display a success banner.
      sessionStorage.removeItem("smv_last_payment_success");
      return;
    }
  }catch(err){
    console.warn("Payment success banner verification skipped:",err);
    // Fail closed: if we cannot verify the stored success state, do not show it.
    return;
  }

  $("dashboardPaymentSuccessBox")?.remove();
  const card=document.createElement("div");
  card.id="dashboardPaymentSuccessBox";
  card.className="card";
  card.style.cssText="position:relative;margin:0 0 16px 0;border:2px solid #b8860b;background:#fffaf0;";
  card.innerHTML=`<button type="button" aria-label="Close" id="dashboardPaymentSuccessClose" style="position:absolute;right:10px;top:8px;appearance:none;-webkit-appearance:none;border:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;outline:0!important;padding:0!important;margin:0!important;width:auto!important;min-width:0!important;height:auto!important;font-size:24px;line-height:1;cursor:pointer;color:#000!important">×</button><h3 style="margin-top:0;color:#166534">Payment Successful ✓</h3><p>Your payment has been securely verified.</p><p><b>You Will Get Your Answer Within 24 hrs - 48 hrs.</b></p>${info.questionId?`<div class="small"><b>Question ID:</b> ${escapeHtml(info.questionId)}</div>`:""}${info.paymentId?`<div class="small"><b>Payment ID:</b> ${escapeHtml(info.paymentId)}</div>`:""}`;
  box.insertBefore(card,box.firstChild);
  $("dashboardPaymentSuccessClose")?.addEventListener("click",()=>{card.remove();try{sessionStorage.removeItem("smv_last_payment_success");}catch(_e){}});
}

let smvDashboardDirty=false;
let smvLiveStop=null,smvLiveQueue=null,smvLiveKey=null;
function smvLiveStatus(text){const el=$('smvLiveStatus');if(el)el.textContent=text;}
function smvEditing(root){return !!document.querySelector(`#${root} [data-smv-dirty],#${root} input:focus,#${root} textarea:focus,#${root} select:focus,.modal:not(.hidden) input:focus,.modal:not(.hidden) textarea:focus`);}
function smvStopLive(){smvLiveStop?.();smvLiveQueue?.stop();smvLiveStop=null;smvLiveQueue=null;smvLiveKey=null;}
function smvStartLive(role){
 const uid=currentUser?.uid,key=uid+':'+role;if(!uid||key===smvLiveKey)return;
 smvStopLive();smvLiveKey=key;
 const root=role==='admin'?'admin':'dashboard';
 smvLiveQueue=createRefreshQueue({
  canRun:()=>currentUser?.uid===uid&&!document.hidden&&!$(root)?.classList.contains('hidden')&&!smvEditing(root),
  onPending:()=>{if(currentUser?.uid===uid&&smvEditing(root))smvLiveStatus('New activity ready — finish your edit, then Refresh.');},
  onError:()=>smvLiveStatus('Could not update. Your previous information is still shown.'),
  run:async()=>{
   smvProfiles.delete(uid);
   if(role==='admin')await loadAdminPanel(true);else await loadDashboard(role,true,true);
  }
 });
 smvLiveStop=watchDashboardEvents({url:BACKEND+'/dashboard/events',
  getToken:()=>{if(auth?.currentUser?.uid!==uid)throw new Error('Session changed');return auth.currentUser.getIdToken();},
  isVisible:()=>!document.hidden&&currentUser?.uid===uid,
  onChange:()=>{if(currentUser?.uid!==uid)return;smvDashboardDirty=true;dashboardReadyAt=0;smvLiveQueue?.request();},
  onStatus:smvLiveStatus
 });
}
function smvWatchQuestions(role){smvStartLive(role);}
window.__smvRefreshDashboard=()=>{
 if(!currentUser)throw new Error('Please login again.');
 smvInternalView='dashboard';dashboardReadyAt=0;
 hidePrimarySections('dashboard');show('dashboard');show('dashboardContent');
 return loadDashboard(dashboardReadyRole||null,true);
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)smvLiveQueue?.resume();});
document.addEventListener('focusout',()=>setTimeout(()=>smvLiveQueue?.resume(),0));
window.addEventListener('smv:logged-out',()=>{smvStopLive();dashboardReadyUid=null;dashboardReadyRole=null;dashboardReadyAt=0;smvProfiles.clear();});
async function loadDashboard(expectedRole=null,force=false,background=false){
 const box=$('dashboardContent');
 if(!currentUser){ if(box) box.innerHTML='<div class="card">Please login to continue.</div>'; return; }
 const loadUid=currentUser.uid;
 const requestedRole=String(expectedRole||'').toLowerCase();
 // IMPORTANT: Returning from ASK NOW must not rehydrate an already-rendered
 // dashboard. The old behaviour started another full Firestore load every time
 // the Question Form Back button was pressed, which could create a repeated
 // Loading -> open -> Loading cycle. Explicit data-changing actions can pass
 // force=true when a fresh render is actually required.
 if(!force && !smvDashboardDirty && Date.now()-dashboardReadyAt<15000 && dashboardReadyUid===loadUid && (!requestedRole || dashboardReadyRole===requestedRole) && smvInternalView==='dashboard' && box && !box.querySelector('.error')){
   show('dashboard');
   touchSession();
   armIdleTimer();
   return;
 }
 // IMPORTANT: deduplicate before incrementing the load sequence. A second caller
 // must not invalidate the first caller's active render and then wait on the
 // already-invalidated promise. This was the cause of the permanent "Loading your dashboard..." state when the auth listener and Dashboard navigation
 // both called loadDashboard during first login.
 if(dashboardLoadPromise && dashboardLoadUid===loadUid){
  await dashboardLoadPromise;
  if(force&&currentUser?.uid===loadUid)return loadDashboard(expectedRole,true,background);
  return;
 }
 const loadId=++dashboardLoadSeq;
 const active=()=>loadId===dashboardLoadSeq && !!currentUser && currentUser.uid===loadUid && smvInternalView==='dashboard';
 dashboardLoadUid=loadUid;
 dashboardLoadPromise=(async()=>{
 try{
  if(box && active() && dashboardReadyUid!==loadUid) box.innerHTML='<div class="card"><div class="small">Loading your dashboard...</div></div>';
  const customerRequest=requestedRole==='customer'?Promise.all([
    renderApi('/customer/consultations?_fresh='+Date.now()+'-'+loadId,{method:'GET'}),
    renderApi('/customer/private-consultations?_fresh='+Date.now()+'-'+loadId,{method:'GET'})
  ]).then(value=>({value}),error=>({error})):null;
  const u=await withTimeout(getDoc(doc(db,'smv_users',loadUid))), data=u.exists()?u.data():{};
  if(!active()) return;
   let role=String(expectedRole||data.role||'').toLowerCase();
   let preloadedAstro={};
   if(!expectedRole && role!=='astrologer'){try{const a0=await withTimeout(getDoc(doc(db,'smv_astrologers',loadUid)),10000);if(!active()) return;if(a0.exists()){preloadedAstro=a0.data()||{};role='astrologer';}}catch(_e){}}
   if(role!=='customer' && role!=='astrologer') role='customer';
   if(!active()) return;
   // Keep one stable dashboard heading during loading and after role resolution.
   // The role is already shown by the role badge/content; changing the heading
   // during async loading makes Customer/Astrologer dashboards appear to
   // interact or flash before the final dashboard is rendered.
   $('dashboardTitle').textContent=role==='astrologer'?'ASTROLOGER DASHBOARD':'CUSTOMER DASHBOARD';
   if(role==='astrologer'){
   let ad=preloadedAstro||{};

/* Always load the latest astrologer profile.
   This is required so rejected status and rejectionReason
   are read directly from smv_astrologers. */
try{
  const a=await withTimeout(
    getDoc(doc(db,'smv_astrologers',currentUser.uid)),
    10000
  );

  if(a.exists()){
    ad=a.data()||{};
  }
}catch(profileErr){
  console.warn(
    'Astrologer profile load skipped:',
    profileErr
  );
}

const userStatus=String(
  data.status||ad.status||'pending'
).toLowerCase();
   const astroStatus=String(ad.status||data.status||'pending').toLowerCase();
 
   if(!['active','approved'].includes(astroStatus)){
  const astroId=data.publicId||ad.publicId||'';
  const isRejected=['rejected','declined','admin_rejected'].includes(astroStatus);

  if(isRejected){
    const rejectionReason=ad.rejectionReason||data.rejectionReason||'Your astrologer application was rejected by Admin.';
    if(!active())return;
    if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
    box.innerHTML=`<div class="card" style="max-width:900px;margin:0 auto">
      <h2>ASTROLOGER DASHBOARD</h2>
      <div class="card" style="border:2px solid #c62828;background:#fff5f5">
        <h3 style="margin-top:0;color:#b71c1c">❌ Astrologer Application Rejected</h3>
        <p>Your astrologer application has been rejected by Admin.</p>
        ${astroId?`<p><b>Astrologer ID:</b> ${escapeHtml(astroId)}</p>`:''}
        <p><b>Application Status:</b> Rejected</p>
        <p><b>Admin Reason:</b> ${escapeHtml(rejectionReason)}</p>
        <p class="small">Your astrologer dashboard features are unavailable while the application is rejected.</p>
      </div>
      <div class="action-row"><button class="btn gray" id="astroRefreshApproval">REFRESH STATUS</button><button class="btn" id="astroLogoutPending">LOGOUT</button></div>
    </div>`;
  }else{
    // Resolve qualification mode BEFORE writing the pending dashboard DOM.
    // This prevents Pending -> Test and Test -> Test repaint flashes.
    let qc=null;
    try{qc=await renderApi('/astrologer/qualification-config',{method:'GET'});}catch(e){console.warn('Astrologer qualification config unavailable:',e);}
    if(!active())return;
    if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}

    let pendingContent='';
    if(qc?.enabled&&astroStatus==='pending'){
      const maxScore=Number(qc.maxScore||25),hasAttempt=qc.quizScore!=null,score=hasAttempt?String(qc.quizScore)+' / '+maxScore:'Not attempted';
      const failed=hasAttempt&&(String(qc.quizStatus||'').toLowerCase()==='failed'||Number(qc.quizScore)<Number(qc.passMark));
      const title=failed?'Qualification Test — Not Passed':maxScore+'-Question Astrology Qualification Test';
      const actionText=failed?'RETAKE TEST':'OPEN GOOGLE FORM TEST';
      const result=failed?`<p class="error"><b>Test not passed.</b> Your score is ${escapeHtml(String(qc.quizScore))}/${escapeHtml(String(maxScore))}. Required pass mark: ${escapeHtml(String(qc.passMark))}/${escapeHtml(String(maxScore))}. You can retake the test.</p>`:'';
      pendingContent=`<div class="card" style="margin-top:14px"><h3>${escapeHtml(title)}</h3><p><b>Current Score:</b> ${escapeHtml(score)} · <b>Pass Mark:</b> ${escapeHtml(String(qc.passMark))}/${escapeHtml(String(maxScore))}</p>${result}<p class="small">Use the same registered email address in the Google Form. A verified passing result will auto approve your account.</p>${qc.formUrl?`<a class="btn" href="${escapeHtml(qc.formUrl)}" target="_blank" rel="noopener noreferrer">${actionText}</a>`:'<div class="small">Google Form link is not configured yet.</div>'}</div>`;
    }else{
      pendingContent=`<div class="card" style="border:2px solid var(--gold);background:#fffaf0">
        <h3 style="margin-top:0">⏳ Waiting for Admin Approval</h3>
        <p>Your astrologer account and professional profile have been registered successfully.</p>
        ${astroId?`<p><b>Astrologer ID:</b> ${escapeHtml(astroId)}</p>`:''}
        <p><b>Application Status:</b> Pending Admin Approval</p>
        <p class="small">You can login and view this status now. Customer questions, answering, earnings and withdrawals will become available after Admin approval.</p>
      </div>`;
    }
    box.innerHTML=`<div class="card" style="max-width:900px;margin:0 auto"><h2>ASTROLOGER DASHBOARD</h2>${pendingContent}<div class="action-row"><button class="btn gray" id="astroRefreshApproval">REFRESH STATUS</button><button class="btn" id="astroLogoutPending">LOGOUT</button></div></div>`;
  }

  $('astroRefreshApproval')?.addEventListener('click',()=>loadDashboard('astrologer',true));
  $('astroLogoutPending')?.addEventListener('click',()=>logoutToHome());
  dashboardReadyUid=loadUid;dashboardReadyRole=role;dashboardReadyAt=Date.now();smvWatchQuestions(role);
  return;
}
   const astroReads=await Promise.allSettled([
    withTimeout(getDocs(query(collection(db,'smv_questions'),where('astrologerId','==',loadUid))),12000),
    withTimeout(renderApi('/astrologer/open-questions',{method:'GET'}),12000),
    renderApi('/astrologer/earnings',{method:'GET'}),
    withTimeout(getDocs(query(collection(db,'smv_withdrawals'),where('astrologerId','==',loadUid))),12000)
   ]);
   if(!active())return;
   const readAstro=i=>{if(astroReads[i].status==='rejected')throw astroReads[i].reason;return astroReads[i].value;};
   let inboxSnap={docs:[]}, qs={docs:[]};
   try{
     inboxSnap=readAstro(0);
   }catch(e){ console.warn('Astrologer available-questions query skipped:',e); }
   let availableQuestions=inboxSnap.docs.filter(d=>{const q=d.data()||{};return q.astrologerId===currentUser.uid&&!!q.adminQuestionApprovedAt&&['assigned_to_astrologer','available_to_astrologers','reallocated'].includes(String(q.allocationStatus||''))&&['admin_approved','paid'].includes(String(q.status||''));}).map(d=>({id:d.id,...d.data()}));
   try{
     const openResult=readAstro(1);
     if(openResult?.success && Array.isArray(openResult.questions) && openResult.questions.length){
       const seen=new Set(availableQuestions.map(q=>String(q.id||q.questionId||'')));
       for(const q of openResult.questions){const id=String(q.id||q.questionId||'');if(id&&!seen.has(id)){availableQuestions.push(q);seen.add(id);}}
     }
   }catch(e){console.warn('Open questions load skipped:',e);}

   qs=inboxSnap;
   const activeQuestions=qs.docs.filter(d=>['paid','admin_review','answer_draft','revision_required'].includes(d.data().status));
   const approved=ad.status==='approved';
  // Canonical earnings ledger comes from the trusted Render backend. This
  // prevents a successfully credited astrologer payment from being omitted
  // by client-side Firestore rules or stale question fields.
  let totalEarnings = 0;
  let ledger = [];
  try {
    const epRemote = readAstro(2);
    totalEarnings = Number(epRemote?.totalEarnings || 0);
    ledger = Array.isArray(epRemote?.ledger) ? epRemote.ledger : [];
  } catch (earningsErr) {
    console.warn('Canonical astrologer earnings endpoint unavailable; using question fallback:', earningsErr);
    const earningsDocs = qs.docs.filter(d => {
      const q = d.data() || {};
      return q.astrologerId === currentUser.uid && q.status === 'answered' && q.commissionStatus === 'credited';
    });
    ledger = earningsDocs.map(d => {
      const q = d.data() || {};
      return {id:d.id,question:q.question||'Consultation',commission:Number(q.astrologerCommissionAmount||q.commissionAmount||0),date:q.commissionCreditedAt||q.answerApprovedAt||q.adminAnswerApprovedAt||null};
    });
    totalEarnings = ledger.reduce((sum,x)=>sum+Number(x.commission||0),0);
  }

  let withdrawalSnap={docs:[]};
  try{
   withdrawalSnap = readAstro(3);
  }catch(e){ console.warn('Astrologer withdrawals query skipped:',e); }

  let reservedWithdrawals = 0;
  let totalWithdrawals = 0;
  let latestWithdrawalAt = null;
  withdrawalSnap.docs.forEach(d => {
    const w = d.data() || {};
    const st = String(w.status || 'pending').toLowerCase();
    const amount = Number(w.amount || 0);
    if (['pending','processing','paid'].includes(st)) {
      reservedWithdrawals += amount;
      totalWithdrawals += amount;
      const raw = w.createdAt || w.requestedAt || w.paidAt || null;
      const ms = raw?.toMillis ? raw.toMillis() : (raw instanceof Date ? raw.getTime() : Number(raw || 0));
      if (ms && (!latestWithdrawalAt || ms > latestWithdrawalAt)) latestWithdrawalAt = ms;
    }
  });

  const availableToWithdraw = Math.max(0, Math.round((totalEarnings - reservedWithdrawals) * 100) / 100);
  const minimumWithdrawal = 300;
  const WITHDRAWAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const withdrawalCooldownActive = !!latestWithdrawalAt && (Date.now() - latestWithdrawalAt < WITHDRAWAL_COOLDOWN_MS);
  const withdrawalEligible = availableToWithdraw >= minimumWithdrawal && !withdrawalCooldownActive;
  const withdrawalCooldownEndsAt = withdrawalCooldownActive ? latestWithdrawalAt + WITHDRAWAL_COOLDOWN_MS : null;

  const ep = {totalEarnings,totalWithdrawals,availableToWithdraw,minimumWithdrawal,withdrawalCooldownActive,withdrawalCooldownEndsAt,withdrawalEligible,ledger};
   if(!active()) return;
   if(!active())return;
   if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
   box.innerHTML=`<div class="smv-astrologer-dashboard"><div class="grid astro-dashboard-summary">
    <div class="card astro-profile-summary-card">
      <div class="astro-profile-photo">${ad.photoData?`<img src="${ad.photoData}" alt="${escapeHtml(data.name||'Astrologer')}" loading="lazy">`:''}</div>
      <div class="astro-profile-info">
        <h3>${escapeHtml(data.name||'')}</h3>
        <p>${['approved','active'].includes(String(ad.status||data.status||'').toLowerCase()) ? '<span class="smv-approved-badge"><span class="smv-check">✓</span><span>Approved</span></span>' : '<b>Status:</b> ' + escapeHtml(ad.status||'pending')}</p>
        <p class="smv-astro-profile-value">${escapeHtml(ad.expertise||ad.specialization||'Astrology')}</p>
        <p class="smv-astro-profile-value">${escapeHtml(ad.experience||0)} years experience</p>
        <p class="astro-profile-bio">${escapeHtml(ad.bio||ad.about||'')}</p>
      </div>
    </div>
    <div class="card"><h3>My Questions</h3><p><span class="smv-summary-value">${activeQuestions.length}</span> active question(s)</p><p><span class="smv-summary-label">Approved profile:</span> <span class="smv-summary-value">${
  ad.status === 'approved'
    ? 'Approved'
    : ad.status === 'rejected'
      ? 'Rejected'
      : 'Waiting for Admin'
}</span></p>
${ad.status === 'rejected' && ad.rejectionReason
  ? `<p class="error"><b>Rejection Reason:</b> ${escapeHtml(ad.rejectionReason)}</p>`
  : ''}</div>
    <div class="card"><h3>Total Earnings</h3><p style="font-size:28px"><span class="smv-earnings-total ${Number(ep.totalEarnings||0)>=300?'is-green':''}">₹${Number(ep.totalEarnings||0).toFixed(2)}</span></p><p><span class="smv-summary-label">Total Withdrawal:</span> <span class="smv-summary-value">₹${Number(ep.totalWithdrawals||0).toFixed(2)}</span></p><p><span class="smv-summary-label">Available to Withdraw:</span> <span class="smv-summary-value">₹${Number(ep.availableToWithdraw||0).toFixed(2)}</span></p><p><span class="smv-summary-label">Minimum withdrawal:</span> <span class="smv-summary-value">₹${Number(ep.minimumWithdrawal||300).toFixed(2)}</span></p>${ep.withdrawalCooldownActive ? `<p class="smv-withdraw-locked"><b>🔒 Withdrawal locked for 7 days after the last withdrawal request.</b><br><span class="small">Available again: ${escapeHtml(smvDateTime(new Date(ep.withdrawalCooldownEndsAt)))}</span></p><button class="btn smv-withdraw-btn is-red" id="withdrawBtn" disabled>WITHDRAW</button>` : ep.withdrawalEligible ? '<p class="smv-withdraw-ready"><b>✓ You can withdraw</b></p><button class="btn smv-withdraw-btn is-green" id="withdrawBtn">WITHDRAW</button>' : '<p class="smv-withdraw-locked"><b>Reach ₹300 to request a withdrawal.</b></p><button class="btn smv-withdraw-btn is-red" id="withdrawBtn" disabled>WITHDRAW</button>'}</div>
   </div>
   <div class="card" id="astroProfileDescriptionCard" style="margin-top:16px">
     <h3>Profile Description</h3>
     <p class="small">Your current public description remains unchanged until Admin approves a submitted update.</p>
     <div class="smv-profile-description-body" style="margin:8px 0"><div class="smv-profile-subheading">Current Public Description</div><p>${escapeHtml(ad.profileDescription||ad.bio||ad.about||'No public description yet.')}</p></div>
     ${ad.profileDescriptionPending?`<div style="margin:8px 0"><b>Pending Description</b><p>${escapeHtml(ad.profileDescriptionPending)}</p><p class="small"><b>Status:</b> Pending Admin Approval</p></div>`:''}
     ${ad.profileEditAllowed===true
       ? `<label for="astroProfileDescriptionInput"><b>Edit Profile Description</b></label>
          <textarea id="astroProfileDescriptionInput" rows="5" maxlength="2000" placeholder="Write your public astrologer profile description...">${escapeHtml(ad.profileDescriptionPending||ad.profileDescription||ad.bio||ad.about||'')}</textarea>
          <div class="action-row"><button class="btn" id="astroSubmitProfileDescription">SUBMIT FOR ADMIN APPROVAL</button></div>
          <div id="astroProfileDescriptionMsg" class="small"></div>`
       : `<div class="empty smv-profile-edit-disabled">Profile description editing is currently disabled by Admin.</div>`}
   </div>
   <div class="card" style="margin-top:16px"><h3>Open Questions</h3><p class="small">Paid questions available for you to claim are shown here. When Admin Allow is ON, the same open questions are visible to all approved astrologers until one astrologer claims them.</p>${!approved?'<div class="empty">Your astrologer profile must be approved by Admin before you can claim questions.</div>':availableQuestions.length?availableQuestions.slice(0,50).map(q=>`<div class="card smv-astro-open-question" style="margin:10px 0"><div class="smv-astro-question-text">${escapeHtml(q.question||'Question')}</div><div class="small"><b>Birth Details:</b> ${escapeHtml(q.birthName||q.birthDetails?.name||'')} · ${escapeHtml(q.birthDate||q.birthDetails?.birthDate||'')} · ${escapeHtml(q.birthTime||q.birthDetails?.birthTime||'')} · ${escapeHtml(q.birthPlace||q.birthDetails?.birthPlace||'')} · ${escapeHtml(q.birthGender||q.birthDetails?.birthGender||'')}</div><div class="small"><b>Question ID:</b> ${escapeHtml(q.id||'')} · <b>Date & Time:</b> ${escapeHtml(smvDateTime(q.createdAt||q.paymentRecordedAt||q.updatedAt))}</div><div class="small"><b>Question Price:</b> ₹${Number(q.astrologerCommissionAmount||0).toFixed(2)}</div><button class="btn" data-claim-question="${q.id}">CLAIM & ANSWER</button></div>`).join(''):'<div class="empty">No paid public questions are available right now.</div>'}</div>
<div class="card" id="astroQuestionQueue" style="margin-top:16px">
  <h3>Questions — Unanswered Queue</h3>
  <p class="small">Claimed questions waiting for your answer are kept here. Claiming another question will not hide previous questions.</p>
  ${qs.docs.filter(d=>{const q=d.data()||{};return q.astrologerId===currentUser.uid && ((String(q.status||'')==='admin_approved' && String(q.allocationStatus||'')==='claimed_by_astrologer') || ['revision_required','processing','admin_review'].includes(String(q.status||'')));}).length ? qs.docs.filter(d=>{const q=d.data()||{};return q.astrologerId===currentUser.uid && ((String(q.status||'')==='admin_approved' && String(q.allocationStatus||'')==='claimed_by_astrologer') || ['revision_required','processing','admin_review'].includes(String(q.status||'')));}).map(d=>{const q=d.data()||{};const minWords=Number(q.answerMinWords||150);const birthName=q.birthName||q.birthDetails?.name||'';const birthDate=q.birthDate||q.birthDetails?.birthDate||'';const birthTime=q.birthTime||q.birthDetails?.birthTime||'';const birthPlace=q.birthPlace||q.birthDetails?.birthPlace||'';const birthGender=q.birthGender||q.birthDetails?.birthGender||'';const questionPrice=Number(q.astrologerCommissionAmount||0);const revision=q.status==='revision_required';const waiting=q.status==='processing'||q.status==='admin_review';const badge=waiting?'WAITING FOR ADMIN APPROVAL':(revision?'REVISION REQUIRED':'UNANSWERED');const buttonLabel=waiting?'EDIT & RESUBMIT':(revision?'RESUBMIT FOR ADMIN APPROVAL':'SUBMIT FOR ADMIN APPROVAL');return `<div class="card astro-question-item ${waiting?'pending-approval':''}" style="margin:10px 0" data-question-card="${escapeHtml(d.id)}"><div class="badge">${badge}</div>${waiting?'<div class="small pending-note" style="margin-top:6px">Your answer remains here and can be edited until Admin approval.</div>':''}<div class="smv-astro-question-text" style="margin-top:8px">${escapeHtml(q.question||'Question')}</div><div class="small"><b>Birth Details:</b> ${escapeHtml(birthName)} · ${escapeHtml(birthDate)} · ${escapeHtml(birthTime)} · ${escapeHtml(birthPlace)} · ${escapeHtml(birthGender)}</div><div class="small"><b>Question ID:</b> ${escapeHtml(d.id)} · <b>Date & Time:</b> ${escapeHtml(smvDateTime(q.updatedAt||q.adminQuestionApprovedAt||q.createdAt))} · <b>Question Price:</b> ₹${questionPrice.toFixed(2)} · <b>Minimum:</b> ${minWords} words</div><textarea id="ans_${d.id}" data-answer-protected="true" placeholder="${revision?'Revise with':'Write'} at least ${minWords} words...">${escapeHtml(q.answer||'')}</textarea><div class="small" id="count_${d.id}">${q.answer?Number(String(q.answer).trim().split(/\s+/).filter(Boolean).length):0} / ${minWords} words</div><button class="btn" data-answer="${d.id}">${buttonLabel}</button></div>`;}).join('') : '<div class="empty">No unanswered questions waiting.</div>'}
</div>
<div class="card" id="astroAnsweredBox" style="margin-top:16px">
  <h3>Answers — Answered Questions</h3>
  <p class="small">Submitted answers stay here and are marked with their current approval status.</p>
  ${qs.docs.filter(d=>{const q=d.data()||{};return q.astrologerId===currentUser.uid && !!q.answer && ['admin_review','answered'].includes(String(q.status||''));}).length ? qs.docs.filter(d=>{const q=d.data()||{};return q.astrologerId===currentUser.uid && !!q.answer && ['admin_review','answered'].includes(String(q.status||''));}).map(d=>{const q=d.data()||{};const status=q.status==='answered'?(q.commissionStatus==='credited'?'COMPLETED / EARNING CREDITED':q.customerAnswerViewedAt?'SUBMITTED / CUSTOMER VIEWED':'SUBMITTED / WAITING FOR CUSTOMER VIEW'):'SUBMITTED — WAITING FOR ADMIN APPROVAL';const canEdit=q.status==='answered'&&q.adminApprovalBypassed===true&&!q.customerAnswerViewedAt&&q.commissionStatus!=='credited';const birthName=q.birthName||q.birthDetails?.name||'';const birthDate=q.birthDate||q.birthDetails?.birthDate||'';const birthTime=q.birthTime||q.birthDetails?.birthTime||'';const birthPlace=q.birthPlace||q.birthDetails?.birthPlace||'';const birthGender=q.birthGender||q.birthDetails?.birthGender||'';return `<div class="card astro-answer-item" style="margin:10px 0"><div class="badge">${status}</div><div class="smv-astro-question-text" style="margin-top:8px">${escapeHtml(q.question||'Question')}</div><div class="small"><b>Birth Details:</b> ${escapeHtml(birthName)} · ${escapeHtml(birthDate)} · ${escapeHtml(birthTime)} · ${escapeHtml(birthPlace)} · ${escapeHtml(birthGender)}</div><div class="small"><b>Question ID:</b> ${escapeHtml(d.id)} · <b>Date & Time:</b> ${escapeHtml(smvDateTime(q.answerApprovedAt||q.updatedAt||q.answerSubmittedAt||q.createdAt))}</div><div class="smv-astro-answer-text" style="margin-top:10px;white-space:pre-wrap;line-height:1.65">${escapeHtml(q.answer||'')}</div><div class="small" style="margin-top:8px"><b>Status:</b> ${escapeHtml(status)}</div>${canEdit?`<button class="btn gray" data-edit-final-answer="${escapeHtml(d.id)}" type="button">EDIT ANSWER</button>`:''}</div>`;}).join('') : '<div class="empty">No answered questions yet.</div>'}
</div>
<div class="card" style="margin-top:16px"><h3>Earnings History</h3>${ep.ledger?.length?ep.ledger.slice(0,50).map(x=>`<div class="smv-history-row" style="padding:10px 0;border-bottom:1px solid #eee"><div class="smv-history-amount"><b>₹${Number(x.commission||0).toFixed(2)}</b> · <span class="success">Earning Credited</span></div><div class="smv-history-content">${escapeHtml(x.question||'Consultation')}</div><div class="smv-history-detail"><b>Date & Time:</b> ${escapeHtml(smvDateTime(x.date))}</div><div class="smv-history-detail"><b>Question ID:</b> ${escapeHtml(x.id||'')}</div></div>`).join(''):'<div class="empty">No credited earnings yet.</div>'}<div class="withdrawal-history-section" style="margin-top:14px;padding-top:10px;border-top:1px solid #eee"><div class="withdrawal-history-title">Withdrawal History</div>${withdrawalSnap?.docs?.length?withdrawalSnap.docs.slice().sort((a,b)=>Number(b.data().createdAt?.seconds||0)-Number(a.data().createdAt?.seconds||0)).slice(0,20).map(d=>{const w=d.data()||{};const st=String(w.status||'pending').toLowerCase();const cls=st==='paid'?'success':st==='rejected'?'error':st==='processing'?'small':'small';const label=st==='paid'?'Paid':st==='processing'?'Processing':st==='rejected'?'Rejected':'Pending';return `<div class="smv-history-row smv-withdrawal-row" style="padding:10px 0;border-bottom:1px solid #eee"><div class="smv-history-amount"><b>₹${Number(w.amount||0).toFixed(2)}</b> · <span class="${cls}">${label}</span></div><div class="smv-history-detail"><b>Withdrawal ID:</b> ${escapeHtml(w.withdrawalId||'—')}</div>${st==='paid' && /^SMV-PMT-/.test(String(w.adminPaymentId||'')) ? '<div class="small"><b>Admin Payment ID:</b> '+escapeHtml(w.adminPaymentId)+'</div>' : ''}<div class="small"><b>Requested:</b> ${escapeHtml(smvDateTime(w.createdAt||w.requestedAt))}${st==='paid' && w.paidAt ? '<br><b>Paid Date & Time:</b> '+escapeHtml(smvDateTime(w.paidAt)) : ''}</div></div>`}).join(''):'<div class="small">No withdrawal requests yet.</div>'}</div></div>
<div class="card" style="margin-top:16px"><h3>Payment Method</h3><p class="small">Your bank/UPI details are private. Full details are not displayed again.</p><button class="btn gray" id="changePayoutBtn2">Change Payment Method</button></div></div>`;
  const profileDescriptionSubmit=$('astroSubmitProfileDescription');
  if(profileDescriptionSubmit){
    profileDescriptionSubmit.onclick=async()=>{
      const input=$('astroProfileDescriptionInput'),msg=$('astroProfileDescriptionMsg');
      const description=String(input?.value||'').trim();
      if(description.length<20){if(msg)msg.innerHTML='<span class="error">Please enter at least 20 characters.</span>';return;}
      if(description.length>2000){if(msg)msg.innerHTML='<span class="error">Profile description must be 2000 characters or less.</span>';return;}
      profileDescriptionSubmit.disabled=true;profileDescriptionSubmit.textContent='SUBMITTING...';
      try{
        const latestProfile=await withTimeout(getDoc(doc(db,'smv_astrologers',loadUid)),10000);
        const latestData=latestProfile.exists()?(latestProfile.data()||{}):{};
        if(latestData.profileEditAllowed!==true)throw new Error('Profile editing is currently disabled by Admin.');
        await updateDoc(doc(db,'smv_astrologers',loadUid),{
          profileDescriptionPending:description,
          profileDescriptionStatus:'pending',
          profileDescriptionSubmittedAt:serverTimestamp()
        });
        if(msg)msg.innerHTML='<span class="success">Submitted. Your current public description will stay unchanged until Admin approval.</span>';
        setTimeout(()=>loadDashboard('astrologer',true),700);
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';}
      finally{profileDescriptionSubmit.disabled=false;profileDescriptionSubmit.textContent='SUBMIT FOR ADMIN APPROVAL';}
    };
  }
  document.querySelectorAll('[data-claim-question]').forEach(b=>b.onclick=async()=>{
  const questionId=b.dataset.claimQuestion;

  if(!currentUser){
    alert('Please login again.');
    return;
  }

  b.disabled=true;
  b.textContent='CLAIMING...';

  try{
    const claimed=await renderApi('/astrologer/claim-question',{method:'POST',body:JSON.stringify({questionId})});
    if(!claimed?.success)throw new Error(claimed?.error||'Unable to claim this question.');
    await loadDashboard('astrologer',true);

    // After CLAIM & ANSWER, keep all previously claimed questions visible and move directly to the unanswered queue.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const answerBox = $('ans_' + questionId);
        if (answerBox) {
          answerBox.style.minHeight = '400px'; answerBox.style.height = '400px'; answerBox.style.maxHeight = 'none'; answerBox.style.resize = 'vertical'; answerBox.focus(); answerBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else { $('astroQuestionQueue')?.scrollIntoView({ behavior:'smooth', block:'start' }); }
      }, 100);
    });

  }catch(e){
    console.error('Question claim error:',e);
    alert(e.message||String(e));
    b.disabled=false;
    b.textContent='CLAIM & ANSWER';
  }
});
   document.querySelectorAll('[data-edit-final-answer]').forEach(b=>b.onclick=async()=>{
     const questionId=b.dataset.editFinalAnswer; b.disabled=true; b.textContent='OPENING...';
     try{const r=await renderApi('/astrologer/edit-answer',{method:'POST',body:JSON.stringify({questionId})});if(!r?.success)throw new Error(r?.error||'Unable to edit this answer.');await loadDashboard('astrologer',true);requestAnimationFrame(()=>setTimeout(()=>{const ta=$('ans_'+questionId);(ta||$('astroQuestionQueue'))?.scrollIntoView({behavior:'smooth',block:'center'});ta?.focus();},100));}
     catch(e){alert(e.message||String(e));b.disabled=false;b.textContent='EDIT ANSWER';}
   });
   // Answer-box paste protection: use event delegation because answer textareas are
   // created/re-rendered dynamically after the dashboard loads. This ensures the
   // protection works even when a question is opened or claimed later.
   const isProtectedAnswerBox = (el) => !!(el && el.matches && el.matches('textarea[data-answer-protected="true"]'));
   const showClipboardBlocked = () => smvNotice(
     'Clipboard Not Allowed',
     'For security, answers must be typed directly into the answer box. Copy, cut and paste are not allowed.',
     '🔒'
   );

   document.addEventListener('paste', (e) => {
     if (isProtectedAnswerBox(e.target)) {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
       return false;
     }
   }, true);

   document.addEventListener('dragover', (e) => {
      if (isProtectedAnswerBox(e.target)) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);
    document.addEventListener('drop', (e) => {
     if (isProtectedAnswerBox(e.target)) {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
       return false;
     }
   }, true);

   document.addEventListener('beforeinput', (e) => {
     if (isProtectedAnswerBox(e.target) && (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop' || e.inputType === 'insertFromPasteAsQuotation')) {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
     }
   }, true);

   document.addEventListener('keydown', (e) => {
     if (isProtectedAnswerBox(e.target) && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
     }
   }, true);

   // Block the context menu only on the protected answer box; normal dashboard
   // context menus remain untouched elsewhere.
   document.addEventListener('copy', (e) => {
     if (isProtectedAnswerBox(e.target)) {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
     }
   }, true);

   document.addEventListener('cut', (e) => {
     if (isProtectedAnswerBox(e.target)) {
       e.preventDefault();
       e.stopPropagation();
       showClipboardBlocked();
     }
   }, true);

   document.addEventListener('contextmenu', (e) => {
     if (isProtectedAnswerBox(e.target)) e.preventDefault();
   }, true);

   document.querySelectorAll('[data-answer]').forEach(b => {

  const questionId = b.dataset.answer;
  const textarea = $('ans_' + questionId);

  b.onclick = async () => {

    const answer = textarea?.value.trim();

    if (!answer) {
      alert('Please write an answer.');
      return;
    }

    b.disabled = true;
    b.textContent = 'SUBMITTING...';

    try {

      const questionRef =
        doc(db, 'smv_questions', questionId);

      const snap = await withTimeout(
        getDoc(questionRef),
        15000
      );

      if (!snap.exists()) {
        throw new Error('Question not found.');
      }

      const q = snap.data();

      if (!currentUser) {
        throw new Error('Please login again.');
      }

      if (q.astrologerId !== currentUser.uid) {
        throw new Error(
          'This question is not assigned to you.'
        );
      }

      // The answer remains editable until Admin approval. After approval the
      // dashboard no longer renders an editable textarea.
      if (
        q.status !== 'admin_approved' &&
        q.status !== 'revision_required' &&
        q.status !== 'processing' &&
        q.status !== 'admin_review'
      ) {
        throw new Error(
          'This answer can no longer be edited.'
        );
      }

      const minWords =
        Number(q.answerMinWords || 150);

      const wordCount =
        answer
          .split(/\s+/)
          .filter(Boolean)
          .length;

      if (wordCount < minWords) {
        throw new Error(
          `Please write at least ${minWords} words.`
        );
      }

      const commissionPercent =
        Number(
          q.commissionPercent ||
          q.commissionRate ||
          20
        );

      const commissionAmount =
        Math.round(
          Number(q.amount || 0) *
          commissionPercent
        ) / 100;

      // Use the same authenticated Render API helper used by Admin actions.
      // This avoids the previous 'BACKEND is not defined' browser error and
      // ensures the Firebase ID token is always attached to the request.
      const result = await renderApi('/submit-answer', {
        method: 'POST',
        body: JSON.stringify({
          questionId: questionId,
          answer: answer
        })
      });
      if (!result?.ok) {
        throw new Error(result?.error || 'Unable to submit answer.');
      }

      /* ============================================================
         CUSTOMER NOTIFICATION — ANSWER SUBMITTED
         The Render answer endpoint owns the question status, but older
         deployments may not create the customer notification. Create one
         here using the canonical customerId from the question. The
         Customer Dashboard also reconciles existing notifications from the
         question record, so this remains safe even if this write is denied.
         ============================================================ */
      try{
        const latestSnap=await withTimeout(getDoc(questionRef),15000);
        const latestQ=latestSnap.exists()?(latestSnap.data()||{}):q;
        const customerId=String(latestQ.customerId||q.customerId||'').trim();
        if(customerId){
          const astroName=String(latestQ.astrologerName||q.astrologerName||'Astrologer');
          const answerSubmittedAt=latestQ.answerSubmittedAt||latestQ.updatedAt||serverTimestamp();
          await setDoc(doc(db,'smv_notifications',customerId+'_answer_submitted_'+questionId),{
            userId:customerId,
            type:'astrologer_answer_submitted',
            title:'Astrologer Answer Submitted',
            message:'Astro '+astroName.replace(/^Astro\s+/i,'')+' has submitted an answer to your question. It is now waiting for Admin approval.',
            questionId:questionId,
            customerPaymentId:latestQ.customerPaymentId||q.customerPaymentId||'',
            astrologerId:latestQ.astrologerId||q.astrologerId||'',
            astrologerName:astroName,
            createdAt:answerSubmittedAt,
            updatedAt:serverTimestamp(),
            read:false
          },{merge:true});
        }
      }catch(customerNotificationError){
        console.warn('Customer answer-submitted notification write skipped:',customerNotificationError);
      }

      alert('Answer submitted successfully, Waiting for Approval');

      await loadDashboard('astrologer',true);
      requestAnimationFrame(() => setTimeout(() => {
        $('astroAnsweredBox')?.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 120));

    } catch (e) {

      console.error(
        'Answer submission error:',
        e
      );

      alert(
        e.message || String(e)
      );

      b.disabled = false;
      b.textContent = 'EDIT & RESUBMIT';
    }

  };

});
   document.querySelectorAll('[id^="ans_"]').forEach(t=>{
     const id=t.id.slice(4), btn=document.querySelector(`[data-answer="${id}"]`), counter=$('count_'+id), q=qs.docs.find(x=>x.id===id)?.data()||{}, min=Number(q.answerMinWords||150);
     const updateCount=()=>{const n=t.value.trim()?t.value.trim().split(/\s+/).filter(Boolean).length:0;if(counter)counter.textContent=`${n} / ${min} words`;if(btn)btn.disabled=n<min;};
     t.addEventListener('input',updateCount);updateCount();
   });
  // Private Consultation is deliberately separate from Ask Now/Open Questions.
  try{
    const pr=await renderApi('/astrologer/private-consultations',{method:'GET'});
    const pcs=Array.isArray(pr?.consultations)?pr.consultations:[];
    const privateMinWords=Math.max(1,Number(pr?.settings?.minimumAnswerWords||20));
    const privateAuto=pr?.settings?.allowWithoutAdminApproval===true;
    const privateAstroRate=Number(pr?.settings?.privateCommission?.astrologerRate??20);
    let pcBox=$('astroPrivateConsultations');
    if(!pcBox){pcBox=document.createElement('div');pcBox.id='astroPrivateConsultations';pcBox.className='card';pcBox.style.marginTop='16px';(box.querySelector('.smv-astrologer-dashboard')||box).appendChild(pcBox);}
    const actionable=pcs.filter(c=>['approved_for_astrologer','revision_required','answer_pending_admin_approval','answered'].includes(String(c.status||'')));
    const pcStatus=c=>{
      if(c.commissionStatus==='credited')return 'COMPLETED / EARNING CREDITED';
      if(c.customerViewedAt)return 'SUBMITTED / CUSTOMER VIEWED';
      if(c.status==='revision_required')return 'REVISION REQUIRED';
      if(c.status==='answer_pending_admin_approval')return 'WAITING FOR ADMIN APPROVAL';
      if(c.status==='answered'&&String(c.answer||'').trim())return privateAuto?'ANSWER SUBMITTED — CUSTOMER NOT VIEWED':'ANSWER APPROVED — CUSTOMER NOT VIEWED';
      return 'READY TO ANSWER';
    };
    pcBox.innerHTML=`<h3 class="smv-astro-main-heading">Private Consultations</h3><p class="small">Only customers who selected you are shown here. Minimum answer: <b>${privateMinWords} words</b>.</p>${actionable.length?actionable.map(c=>{
      const hasAnswer=!!String(c.answer||'').trim(),locked=!!c.customerViewedAt||c.commissionStatus==='credited',editing=!hasAnswer||c.status==='revision_required';
      return `<div class="card" style="margin:10px 0"><div class="badge">${escapeHtml(pcStatus(c))}</div><p><b>Question:</b> ${escapeHtml(c.question||'')}</p><div class="small"><b>Customer:</b> ${escapeHtml(c.customerName||'')} · <b>Birth:</b> ${escapeHtml(c.birthDetails?.birthDate||'')} ${escapeHtml(c.birthDetails?.birthTime||'')} · ${escapeHtml(c.birthDetails?.birthPlace||'')}</div><div class="small"><b>Chat Price:</b> ₹${Number(c.chatPrice||c.amount||0).toFixed(2)} · <b>Your Earning:</b> ₹${Number(Number.isFinite(Number(c.astrologerAmount))?c.astrologerAmount:(Number(c.chatPrice||c.amount||0)*privateAstroRate/100)).toFixed(2)}</div>
      <div id="pcview_${c.id}" ${editing&&!locked?'class="hidden"':''}>${hasAnswer?`<p><b>Answer:</b> ${escapeHtml(c.answer||'')}</p>`:''}</div>
      <div id="pcedit_${c.id}" ${editing&&!locked?'':'class="hidden"'}><textarea id="pcans_${c.id}" rows="5" placeholder="Write at least ${privateMinWords} words...">${escapeHtml(c.answer||'')}</textarea><div class="small" id="pcwc_${c.id}">Minimum ${privateMinWords} words</div><button class="btn" data-pc-answer="${c.id}">${hasAnswer?'RESUBMIT ANSWER':'SUBMIT ANSWER'}</button></div>
      ${hasAnswer&&!locked&&!editing?`<button class="btn gray" data-pc-edit="${c.id}">EDIT ANSWER</button>`:''}
      ${c.answerRejectionReason&&c.status==='revision_required'?`<div class="error">Admin reason: ${escapeHtml(c.answerRejectionReason)}</div>`:''}</div>`;
    }).join(''):'<div class="empty">No private consultations assigned to you.</div>'}`;
    pcBox.querySelectorAll('[data-pc-edit]').forEach(b=>b.onclick=()=>{const id=b.dataset.pcEdit;$('pcview_'+id)?.classList.add('hidden');$('pcedit_'+id)?.classList.remove('hidden');b.classList.add('hidden');});
    pcBox.querySelectorAll('[data-pc-answer]').forEach(b=>b.onclick=async()=>{const id=b.dataset.pcAnswer,answer=$('pcans_'+id)?.value.trim()||'',count=answer.split(/\s+/).filter(Boolean).length;if(count<privateMinWords){$('pcwc_'+id).innerHTML='<span class="error">Need at least '+privateMinWords+' words. Current: '+count+'</span>';return;}b.disabled=true;try{await renderApi('/astrologer/private-consultation/submit-answer',{method:'POST',body:JSON.stringify({consultationId:id,answer})});await loadDashboard('astrologer',true);}catch(e){alert(e.message||String(e));b.disabled=false;}});
    const historyItems=Array.isArray(pr?.history)?pr.history.slice():[];
    const histBox=document.createElement('div');
    histBox.className='card';
    histBox.style.marginTop='16px';
    histBox.id='privateConsultationHistoryCard';
    const histStatus=c=>{
      const st=String(c.status||'');
      if(st==='question_rejected'||c.refundId)return 'REFUNDED / REJECTED';
      if(String(c.commissionStatus||'')==='credited')return 'COMPLETED / EARNING CREDITED';
      if(c.customerViewedAt)return 'COMPLETED / CUSTOMER VIEWED';
      if(st==='answered')return 'ANSWERED / WAITING FOR CUSTOMER VIEW';
      if(st==='answer_pending_admin_approval')return 'WAITING FOR ADMIN APPROVAL';
      if(st==='revision_required')return 'REVISION REQUIRED';
      if(st==='approved_for_astrologer')return 'PENDING';
      return (st||'PENDING').replaceAll('_',' ').toUpperCase();
    };
    const histTime=c=>c.commissionCreditedAt||c.customerViewedAt||c.answerApprovedAt||c.answerSubmittedAt||c.questionApprovedAt||c.paidAt||c.updatedAt||c.createdAt;
    historyItems.sort((a,b)=>{const av=histTime(a),bv=histTime(b);const am=av?.seconds?av.seconds*1000:(Date.parse(av||'')||0),bm=bv?.seconds?bv.seconds*1000:(Date.parse(bv||'')||0);return bm-am;});
    histBox.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 class="smv-astro-main-heading" style="margin:0">Private Consultation History</h3><button type="button" id="privateConsultHistoryToggle" class="smv-v170-collapse-btn" aria-label="Minimize or expand Private Consultation History">▼</button></div><div id="privateConsultHistoryBody" style="margin-top:12px">${historyItems.length?historyItems.map(c=>{
      const chat=Number(c.chatPrice||c.amount||0);
      const earning=Number(Number.isFinite(Number(c.astrologerCreditedAmount))?c.astrologerCreditedAmount:(Number.isFinite(Number(c.astrologerAmount))?c.astrologerAmount:(chat*privateAstroRate/100)));
      return `<div style="padding:12px 0;border-bottom:1px solid #eee"><div class="badge">${escapeHtml(histStatus(c))}</div><p><b>Question:</b> ${escapeHtml(c.question||'Private Consultation')}</p><div class="small"><b>Customer:</b> ${escapeHtml(c.customerName||'Customer')}</div><div class="small"><b>Chat Price:</b> ₹${chat.toFixed(2)} · <b>Your Commission:</b> ₹${earning.toFixed(2)}</div><div class="small"><b>Consultation ID:</b> ${escapeHtml(c.id||c.consultationId||'—')}</div><div class="small"><b>Date & Time:</b> ${escapeHtml(smvDateTime(histTime(c)))}</div>${c.refundId?`<div class="small"><b>Refund:</b> ${escapeHtml(c.refundStatus||'Processing')} · <b>Refund ID:</b> ${escapeHtml(c.refundId)}</div>`:''}</div>`;
    }).join(''):'<div class="empty">No Private Consultation history yet.</div>'}</div>`;
    pcBox.insertAdjacentElement('afterend',histBox);
    const ht=$('privateConsultHistoryToggle'),hb=$('privateConsultHistoryBody');
    if(ht&&hb)ht.onclick=()=>{const hidden=hb.classList.toggle('hidden');ht.textContent=hidden?'▶':'▼';};
  }catch(e){console.warn('Private consultation load skipped:',e);}

  if($('withdrawBtn')) $('withdrawBtn').onclick = async () => {

  if(!currentUser){
    alert('Please login again.');
    return;
  }

  try {

    const questionSnap = await withTimeout(
      getDocs(
        query(
          collection(db,'smv_questions'),
          where('astrologerId','==',currentUser.uid)
        )
      ),
      15000
    );

    let totalEarnings = 0;

    questionSnap.docs.forEach(d => {

      const q = d.data();

      if(
        q.status === 'answered' &&
        q.commissionStatus === 'credited'
      ){

        totalEarnings += Number(
          q.astrologerCommissionAmount ||
          q.commissionAmount ||
          0
        );

      }

    });

    const withdrawalSnap = await withTimeout(
      getDocs(
        query(
          collection(db,'smv_withdrawals'),
          where('astrologerId','==',currentUser.uid)
        )
      ),
      15000
    );

    let reservedWithdrawals = 0;
    let totalWithdrawals = 0;
    let latestWithdrawalAt = null;
    withdrawalSnap.docs.forEach(d => {
      const w = d.data() || {};
      const st = String(w.status || 'pending').toLowerCase();
      const amount = Number(w.amount || 0);
      if(['pending','processing','paid'].includes(st)){
        reservedWithdrawals += amount;
        totalWithdrawals += amount;
        const raw = w.createdAt || w.requestedAt || w.paidAt || null;
        const ms = raw?.toMillis ? raw.toMillis() : Number(raw || 0);
        if(ms && (!latestWithdrawalAt || ms > latestWithdrawalAt)) latestWithdrawalAt = ms;
      }
    });
    const available = Math.max(0, Math.round((totalEarnings - reservedWithdrawals) * 100) / 100);
    const min = 300;
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const cooldownActive = !!latestWithdrawalAt && (Date.now() - latestWithdrawalAt < cooldownMs);
    const eligible = available >= min && !cooldownActive;

    openModal(`
      <h2>Withdraw Earnings</h2>

      <p>
        Total Earnings:
        <b>₹${totalEarnings.toFixed(2)}</b>
      </p>

      <p>
        Total Withdrawal:
        <b>₹${totalWithdrawals.toFixed(2)}</b>
      </p>

      <p>
        Available:
        <b class="${(available >= min && !cooldownActive) ? 'smv-modal-available-green' : 'smv-modal-available-red'}">₹${available.toFixed(2)}</b>
      </p>

      <p class="small">
        Minimum withdrawal:
        ₹${min.toFixed(2)}.
        ${cooldownActive ? `<br><b class="smv-withdraw-locked">Withdrawal is blocked for 7 days after the last withdrawal request.</b><br>Available again: ${escapeHtml(smvDateTime(new Date(latestWithdrawalAt + cooldownMs)))}` : 'Payment will be arranged by Admin within 24–48 hours.'}
      </p>

      <div id="withdrawPaymentIds" class="small" style="margin:10px 0"><b>Withdrawal Request ID:</b> Will be generated when you submit the request.</div>

      <input
        id="withdrawAmount"
        type="number"
        min="${min}"
        max="${available}"
        step="0.01"
        value="${available.toFixed(2)}"
        placeholder="Amount"
      >

      <button
        class="btn ${eligible ? 'smv-withdraw-btn is-green' : 'smv-withdraw-btn is-red'}"
        id="confirmWithdraw"
        ${eligible ? '' : 'disabled'}
      >
        REQUEST WITHDRAWAL
      </button>

      <div
        id="withdrawMsg"
        class="small"
        style="margin-top:8px"
      ></div>
    `);

    $('confirmWithdraw').onclick = async () => {

      const amount =
        Number($('withdrawAmount').value);

      const btn2 =
        $('confirmWithdraw');

      if(cooldownActive){
        alert('Withdrawal is blocked for 7 days after the last withdrawal request.');
        return;
      }
      if(available < min){
        alert(`Available withdrawal balance must be at least ₹${min}.`);
        return;
      }
      if(!Number.isFinite(amount)){
        alert('Enter a valid amount.');
        return;
      }

      if(amount < min){
        alert(
          `Minimum withdrawal is ₹${min}.`
        );
        return;
      }

      if(amount > available){
        alert(
          'Withdrawal amount cannot exceed available earnings.'
        );
        return;
      }

      btn2.disabled = true;
      btn2.textContent = 'REQUESTING...';

      try {
        const result = await withTimeout(renderApi('/astrologer/withdrawal-request', {
          method:'POST',
          body:JSON.stringify({amount:Math.round(amount * 100) / 100})
        }), 20000);

        const withdrawalId = String(result.withdrawalId || result.paymentId || '');
        if(!withdrawalId) throw new Error('Withdrawal ID was not returned by the Render backend.');

        $('withdrawPaymentIds').innerHTML = '<b>Withdrawal Request ID:</b> ' + escapeHtml(withdrawalId);

        $('withdrawMsg').innerHTML =
          '<span class="success"><b>Withdrawal request received.</b><br>Requested: '+escapeHtml(smvDateTime(new Date()))+'<br>Admin will arrange payment within 24–48 hours.</span>';

        setTimeout(() => {
          closeModal();
          loadDashboard();
        },1000);

      } catch(e) {

        console.error(
          'Withdrawal request error:',
          e
        );

        $('withdrawMsg').innerHTML =
          '<span class="error">' +
          escapeHtml(
            e.message || String(e)
          ) +
          '</span>';

        btn2.disabled = false;
        btn2.textContent =
          'REQUEST WITHDRAWAL';
      }

    };

  } catch(e) {

    console.error(
      'Earnings calculation error:',
      e
    );

    alert(
      e.message || String(e)
    );

  }

};
   const change=()=>openPayoutChange();
   if($('changePayoutBtn')) $('changePayoutBtn').onclick=change;
   if($('changePayoutBtn2')) $('changePayoutBtn2').onclick=change;
  } else {
   // Customer consultations are loaded from the trusted Render backend. This
   // keeps payment/question ownership and the final answer visible even when
   // the browser's Firestore rules or indexes prevent the direct query.
   const customerResult=customerRequest?await customerRequest:null;
   if(customerResult?.error)throw customerResult.error;
   const customerPayload=customerResult?customerResult.value:await Promise.all([
     renderApi('/customer/consultations?_fresh='+Date.now()+'-'+loadId,{method:'GET'}),
     renderApi('/customer/private-consultations?_fresh='+Date.now()+'-'+loadId,{method:'GET'})
   ]);
   const cr=Array.isArray(customerPayload)?customerPayload[0]:customerPayload;
   const privateCr=Array.isArray(customerPayload)?customerPayload[1]:{success:true,consultations:[]};
   if(!cr?.success||!Array.isArray(cr.questions))throw new Error(cr?.error||'Unable to load current questions.');
   if(cr.customerId && cr.customerId!==loadUid)throw new Error('The response belongs to a different login session.');
   if(!active())return;
   const consultationItems=cr.questions.slice().sort((a,b)=>Date.parse(b.createdAt||'')-Date.parse(a.createdAt||''));
   const privateConsultationItems=privateCr?.success&&Array.isArray(privateCr.consultations)?privateCr.consultations.slice().sort((a,b)=>Date.parse(b.createdAt||'')-Date.parse(a.createdAt||'')):[];
   const hasPendingRefund=false;
   const paid=consultationItems.filter(q=>q.status!=='awaiting_payment').length;
   const qCount=consultationItems.length;
   if(!active()) return;
   if(!active())return;
   if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
   box.innerHTML=`<div class="grid"><div class="card"><span class="badge">CUSTOMER</span><h3>Welcome, ${escapeHtml(data.name||currentUser.email||'Customer')}</h3><p><b>Email verification:</b> ${currentUser.emailVerified?'<span class="smv-verified-badge customer-profile-result"><span class="smv-check">✓</span>Verified</span>':'<span class="customer-profile-result">Pending from registration</span>'}</p><p><b>Mobile:</b> <span class="customer-profile-result">Private</span></p></div><div class="card"><h3>My Questions</h3><p><b>Total:</b> <span class="customer-profile-result">${qCount}</span></p><p><b>Paid/processed:</b> <span class="customer-profile-result">${paid}</span></p></div></div>
   <div class="card" style="margin-top:16px"><h3 class="customer-consultations-title">My Consultations</h3>${!consultationItems.length?'<div class="empty">No consultations yet. Start a private consultation to choose an astrologer.</div>':consultationItems.slice(0,20).map(q=>{const qid=String(q.questionId||q.id||''); const reviewButton=q.status==='answered'&&!q.reviewed?`<button class="btn" data-review="${escapeHtml(qid)}" data-astro="${escapeHtml(q.astrologerId||'')}">Rate & Review</button>`:''; const paymentRetryButton=["awaiting_payment","payment_failed"].includes(String(q.status||""))&&q.paymentStatus!=="paid"&&qid?`<button class="smv-customer-payment-btn" data-retry-payment="${escapeHtml(qid)}" type="button">Retry Payment · ₹${Number(q.amount||0).toFixed(2)}</button>`:""; const statusMap={awaiting_payment:'Payment Pending',payment_failed:'Payment Failed',pending_admin_approval:'Waiting for Admin Approval',assigned_to_astrologer:'Assigned to Astrologer',available_to_astrologers:'Available to Astrologers',claimed_by_astrologer:'Astrologer Answering',admin_approved:'Waiting for Answers',processing:'Processing',answer_draft:'Processing',admin_review:'Processing',revision_required:'Revision Required',answered:'Answer Ready',question_rejected:'Question Rejected',admin_rejected:'Question Rejected'}; const astroName=q.astrologerName||'Selected Astrologer'; const adminQuestionApproved=!!q.adminQuestionApprovedAt||['assigned_to_astrologer','reallocated','available_to_astrologers','claimed_by_astrologer','admin_approved','processing','answer_draft','admin_review','answered'].includes(String(q.status||'')); const statusText=q.status==='paid'&&!adminQuestionApproved?'Waiting for Admin Approval':adminQuestionApproved&&['paid','admin_approved'].includes(String(q.status||''))?`Waiting for Answers — ${astroName}`:q.status==='processing'||q.status==='answer_draft'||q.status==='admin_review'?`Processing — ${astroName} answer received and under Admin review`:q.status==='revision_required'?`Revision Required — ${astroName}`:q.status==='answered'?'Answer Ready':(statusMap[q.status]||q.status||'Processing'); const paymentReceived=!!q.customerPaymentId || !!q.paymentRecordedAt || !!q.paidAt || !!q.paymentDate || !['awaiting_payment','payment_failed'].includes(String(q.status||'')); const refundStatuses=['pending','created','initiated','processing']; const refundCompleted=['processed','completed']; const isQuestionRejected=['question_rejected','admin_rejected'].includes(String(q.status||'')); const refundAmount=Number(q.refundAmount||q.amount||q.paymentAmount||0); const refundStatus=String(q.refundStatus||'').toLowerCase(); const steps=isQuestionRejected?[['Payment Received',paymentReceived],['Question Rejected',true],['Refund Status',refundCompleted.includes(refundStatus)]]:[['Payment Received',paymentReceived],['Question Approved',adminQuestionApproved],['Astrologer Answer Submitted',['processing','answer_draft','admin_review','revision_required','answered'].includes(String(q.status||''))],['Admin Approval',['answered'].includes(String(q.status||''))],['Answer Ready',['answered'].includes(String(q.status||''))]]; const timeline=`<div class="timeline">${steps.map(x=>`<div class="timeline-step ${x[1]?'done':''}"><span>${x[1]?'✓':'○'}</span>${x[0]}</div>`).join('')}</div>`; const paymentLine=q.customerPaymentId?`<div class="small smv-customer-meta-line"><b>Customer Payment ID:</b> <span>${escapeHtml(q.customerPaymentId)}</span> · <b>Payment Date & Time:</b> <span>${escapeHtml(smvDateTime(q.paymentRecordedAt||q.paidAt||q.paymentUpdatedAt||q.paymentDate))}</span></div>`:''; const isRejected=isQuestionRejected; const refundLine='';; const questionIdLine=qid?`<div class="small smv-customer-meta-line"><b>Question ID:</b> <span>${escapeHtml(qid)}</span></div>`:''; return `<div class="smv-consultation-item" style="padding:14px 0;border-bottom:1px solid #eee"><div class="smv-question-text">${escapeHtml(q.question||'Question')}</div>${questionIdLine}<div class="small customer-meta smv-customer-meta-line"><b>Astrologer:</b> <span>${escapeHtml(astroName)}</span> · <b>Status:</b> <span>${escapeHtml(statusText)}</span></div><div class="small smv-customer-meta-line"><b>Date & Time:</b> <span>${escapeHtml(smvDateTime(q.updatedAt||q.answerApprovedAt||q.adminQuestionApprovedAt||q.createdAt))}</span></div>${paymentLine}${refundLine}${isRejected&&refundAmount>0?`<div class="refund-summary" style="margin-top:12px;padding:12px 14px;border-radius:10px;border:1px solid #e6e6e6"><div><b>Question Status:</b> 🔴 Rejected</div><div style="margin-top:4px"><b>Payment:</b> ${paymentReceived?'✅ Payment Received':'⏳ Payment Pending'}</div><div class="small"><b>Paid Amount:</b> ₹${refundAmount.toFixed(2)}</div><div style="margin-top:8px"><b>Refund Status:</b> ${refundCompleted.includes(refundStatus)?'<span class="success">🟢 Refund Completed</span>':refundStatus==='waiting_balance'?'<span style="color:#b26a00">🟠 Waiting for Razorpay Balance — Admin Retry Required</span>':refundStatus==='failed'?'<span class="error">🔴 Refund Failed — Admin Review Required</span>':'<span style="color:#b26a00">🟠 Refund Pending</span>'}</div><div class="small"><b>Refund Amount:</b> ₹${refundAmount.toFixed(2)}</div>${q.refundId?`<div class="small"><b>Refund ID:</b> ${escapeHtml(q.refundId)}</div>`:''}<div class="small"><b>RRN:</b> ${escapeHtml(q.refundRrn||"Available after Razorpay processes the refund")}</div>${q.refundArn?`<div class="small"><b>ARN:</b> ${escapeHtml(q.refundArn)}</div>`:''}${q.refundUtr?`<div class="small"><b>UTR:</b> ${escapeHtml(q.refundUtr)}</div>`:''}${refundCompleted.includes(refundStatus)&&q.refundProcessedAt?`<div class="small"><b>Refund Date:</b> ${escapeHtml(smvDateTime(q.refundProcessedAt))}</div>`:''}<div class="small" style="margin-top:6px"><b>Refund Reason:</b> ${escapeHtml(q.refundReason||q.adminQuestionRejectionReason||'Question rejected by Admin')}</div>${q.adminQuestionRejectedAt?`<div class="small"><b>Rejected On:</b> ${escapeHtml(smvDateTime(q.adminQuestionRejectedAt))}</div>`:''}${refundCompleted.includes(refundStatus)?`<div class="small" style="margin-top:6px">Refund has been processed successfully.<br>The amount may take 5–7 working days to reflect in your bank account/card. You can use the RRN for bank tracking.</div>`:''}</div>`:''}${timeline}${q.answer&&q.status==='answered'?`<div class="card" style="margin-top:10px"><b>${q.answerAuthorType==='admin'||q.adminAnswered?'Admin Answer':'Astrologer Answer'}</b><div class="smv-customer-answer-text" style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(q.answer)}</div>${q.customerAnswerViewedAt?'<div class="small success smv-customer-viewed-status">CUSTOMER VIEWED</div>':`<div class="small success smv-customer-viewed-status">SUBMITTED</div><button class="btn" data-public-view="${escapeHtml(qid)}" type="button">MARK ANSWER VIEWED</button>`}${q.answerAuthorType==='admin'||q.adminAnswered?'<p class="small success"><b>Answered directly by SMV ASTRO Admin.</b></p>':''}</div>`:''}${paymentRetryButton?`<div style="margin-top:10px"><div class="smv-private-payment-note">Retry this saved question at its original price. Current price changes do not apply.</div>${paymentRetryButton}</div>`:""}${reviewButton}</div>`}).join('')}</div>
   <div class="card" style="margin-top:16px"><h3 class="customer-private-consultations-title">My Private Consultations</h3>${!privateConsultationItems.length?'<div class="empty">No private consultations yet.</div>':privateConsultationItems.slice(0,20).map(c=>{const id=String(c.id||c.consultationId||'');const rejected=c.status==='question_rejected';const refundStatus=String(c.refundStatus||'').toLowerCase();const refundDone=['processed','completed'].includes(refundStatus);const answerReady=c.status==='answered'&&!!String(c.answer||'').trim();const unpaid=c.paymentStatus!=='paid'&&!rejected;const statusMap={awaiting_payment:'Payment Pending',pending_admin_approval:'Waiting for Admin Approval',approved_for_astrologer:'Waiting for Selected Astrologer',answer_pending_admin_approval:'Answer Waiting for Admin Approval',revision_required:'Astrologer Revising Answer',answered:c.customerViewedAt?'Answer Viewed':'Answer Ready',question_rejected:'Question Rejected / Refund'};return `<div class="smv-consultation-item" style="padding:14px 0;border-bottom:1px solid #eee"><div class="smv-question-text">${escapeHtml(c.question||'Private Consultation')}</div><div class="small smv-customer-meta-line"><b>Selected Astrologer:</b> <span>${escapeHtml(c.astrologerName||'Astrologer')}</span> · <b>Chat Price:</b> <span>₹${Number(c.chatPrice||c.amount||0).toFixed(2)}</span></div><div class="small smv-customer-meta-line"><b>Status:</b> <span>${escapeHtml(statusMap[c.status]||c.status||'Processing')}</span></div><div class="small smv-customer-meta-line"><b>Payment Status:</b> <span>${escapeHtml(c.paymentStatus||'pending')}</span></div><div class="small smv-customer-meta-line"><b>Consultation ID:</b> <span>${escapeHtml(id)}</span></div>${c.razorpayPaymentId?`<div class="small smv-customer-meta-line"><b>Payment ID:</b> <span>${escapeHtml(c.razorpayPaymentId)}</span></div>`:''}${unpaid?`<div class="smv-private-payment-actions" style="margin-top:8px"><button class="smv-customer-payment-btn" data-private-retry="${escapeHtml(id)}">RETRY PAYMENT ₹${Number(c.chatPrice||c.amount||0).toFixed(2)}</button> <button class="smv-customer-payment-btn" data-private-recover="${escapeHtml(id)}">RECOVER PAYMENT</button></div>`:''}${rejected?`<div class="refund-summary" style="margin-top:10px"><b>Refund Status:</b> ${refundDone?'Refund Completed':(refundStatus==='failed'?'Refund Failed — Admin Retry Required':escapeHtml(c.refundStatus||'Pending'))}<br><span class="small"><b>Refund Amount:</b> ₹${Number(c.refundAmount||c.chatPrice||0).toFixed(2)}</span>${c.refundId?`<br><span class="small"><b>Refund ID:</b> ${escapeHtml(c.refundId)}</span>`:''}<br><span class="small"><b>RRN:</b> ${escapeHtml(c.refundRrn||'Available after Razorpay processes the refund')}</span>${c.refundProcessedAt?`<br><span class="small"><b>Refund Date:</b> ${escapeHtml(smvDateTime(c.refundProcessedAt))}</span>`:''}</div>`:''}${answerReady?`<div class="card" style="margin-top:10px"><b>Astrologer Answer</b><div class="smv-customer-answer-text" style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(c.answer)}</div>${c.customerViewedAt?'<div class="small success smv-customer-viewed-status">CUSTOMER VIEWED</div>':`<div class="small success smv-customer-viewed-status">SUBMITTED</div><button class="btn" data-private-view="${escapeHtml(id)}">MARK ANSWER VIEWED</button>`}</div>`:''}</div>`}).join('')}</div>`;
   document.querySelectorAll('[data-private-recover]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await renderApi('/private-consultation/recover-payment',{method:'POST',body:JSON.stringify({consultationId:b.dataset.privateRecover})});if(r.recovered)await loadDashboard('customer',true);else alert('No captured Razorpay payment was found. Use Retry Payment.');}catch(e){alert(e.message||String(e));}finally{b.disabled=false;}});
   document.querySelectorAll('[data-private-retry]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await renderApi('/private-consultation/retry-payment',{method:'POST',body:JSON.stringify({consultationId:b.dataset.privateRetry})});if(!window.Razorpay)throw new Error('Razorpay is not available. Please refresh and try again.');const rz=new Razorpay({key:r.keyId,amount:r.amount,currency:r.currency,name:'SMV ASTRO',description:'Private Astrology Consultation',order_id:r.orderId,handler:async p=>{await renderApi('/private-consultation/verify-payment',{method:'POST',body:JSON.stringify({consultationId:r.consultationId,...p})});await loadDashboard('customer',true);},modal:{ondismiss:()=>{renderApi('/private-consultation/cancel-payment',{method:'POST',body:JSON.stringify({consultationId:r.consultationId})}).catch(()=>{});b.disabled=false;}}});rz.on('payment.failed',()=>{b.disabled=false;});rz.open();}catch(e){alert(e.message||String(e));b.disabled=false;}});
   document.querySelectorAll('[data-private-view]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/customer/private-consultation/mark-viewed',{method:'POST',body:JSON.stringify({consultationId:b.dataset.privateView})});await loadDashboard('customer',true);}catch(e){alert(e.message||String(e));b.disabled=false;}});
   document.querySelectorAll('[data-retry-payment]').forEach(b=>b.onclick=()=>retryCustomerPayment(b.dataset.retryPayment,b));
   document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>openReview(b.dataset.review,b.dataset.astro)); if(window.__smvRefundRefreshTimer){clearTimeout(window.__smvRefundRefreshTimer);window.__smvRefundRefreshTimer=null;} if(hasPendingRefund){window.__smvRefundRefreshTimer=setTimeout(()=>{if(currentUser&&document.getElementById('dashboard')&&!document.getElementById('dashboard').classList.contains('hidden'))loadDashboard().catch(()=>{});},20000);}

   box.querySelectorAll('[data-public-view]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/customer/mark-answer-viewed',{method:'POST',body:JSON.stringify({questionId:b.dataset.publicView})});await loadDashboard('customer',true);}catch(e){alert(e.message||String(e));b.disabled=false;}});
  }
  if(!active()) return;
  const note=document.createElement('div'); note.className='card'; note.style.marginTop='16px'; note.innerHTML='<h3>Notifications</h3><div id="userNotifications"><div class="small">Loading...</div></div>'; box.appendChild(note);
  // Notifications are supplementary. A Firestore permission/timeout issue in
  // this optional section must never turn a successfully loaded dashboard into
  // a false "Unable to load dashboard" state.
  try{ renderNotifications('userNotifications').catch(e=>console.warn('Notifications unavailable:',e)); }
  catch(notificationErr){
    console.warn('Dashboard notifications skipped:',notificationErr);
    const nb=$('userNotifications');
    if(nb) nb.innerHTML='<div class="small">Notifications are temporarily unavailable.</div>';
  }
  if(!active()) return;
  show('dashboard');
  dashboardReadyUid=loadUid; dashboardReadyAt=Date.now(); smvDashboardDirty=false;
  dashboardReadyRole=role; smvWatchQuestions(role);
  smvLiveStatus('Updated just now');
  const refresh=$('smvRefreshDashboard');if(refresh)refresh.textContent='Refresh';
  touchSession();
  armIdleTimer();
 }catch(e){
   if(!active()) return;
   console.error('Dashboard load failed:',e);
   if(dashboardReadyUid===loadUid){smvLiveStatus('Update failed — previous information retained. Tap Refresh to retry.');return;}
   if(dashboardReadyUid===loadUid){ dashboardReadyUid=null; dashboardReadyRole=null; }
   box.innerHTML='<div class="card error"><b>Dashboard could not be loaded.</b><p class="small">Your login session is active, but some dashboard data could not be read. The basic dashboard is being kept available.</p><button class="btn gray" id="dashboardRetry">RETRY</button></div>';
   $('dashboardRetry')?.addEventListener('click',()=>loadDashboard(expectedRole));
 }
 })();
 const ownedRequest=dashboardLoadPromise;
 try{return await ownedRequest;}finally{if(dashboardLoadPromise===ownedRequest){dashboardLoadPromise=null;dashboardLoadUid=null;}}
}
function openPayoutChange(){
 openModal(`<h2>Change Payment Method</h2><p class="small">For security, your previous bank/UPI details are not displayed. Enter the new details. The new method will remain pending until Admin approval.</p>
 <input id="pBank" placeholder="Bank Name" maxlength="120"><input id="pAccountName" placeholder="Account Holder Name" maxlength="120"><input id="pAccount" inputmode="numeric" placeholder="Account Number" maxlength="40"><input id="pIfsc" placeholder="IFSC" maxlength="20"><input id="pUpi" placeholder="UPI ID (optional)" maxlength="120"><button class="btn" id="savePayout">Submit for Admin Review</button><div id="payoutMsg" class="small"></div>`);
 $('savePayout').onclick=async()=>{
   const btn=$('savePayout'),msg=$('payoutMsg');
   try{
     if(!currentUser) throw new Error('Please login again.');
     const payload={bankName:$('pBank').value.trim(),accountName:$('pAccountName').value.trim(),accountNumber:$('pAccount').value.trim(),ifsc:$('pIfsc').value.trim().toUpperCase(),upi:$('pUpi').value.trim()};
     if(!payload.bankName||!payload.accountName||!payload.accountNumber||!payload.ifsc) throw new Error('Please complete all required payment details.');
     if(payload.accountNumber.length<6) throw new Error('Enter a valid account number.');
     if(payload.ifsc.length<4) throw new Error('Enter a valid IFSC code.');
     btn.disabled=true;btn.textContent='SUBMITTING...';
     const r=await withTimeout(renderApi('/astrologer/change-payout',{method:'POST',body:JSON.stringify(payload)}),20000);
     if(!r?.success) throw new Error(r?.error||'Unable to submit payment method change.');
     msg.innerHTML='<span class="success"><b>Payment method submitted successfully.</b><br>Waiting for Admin Approval.</span>';
     setTimeout(()=>{closeModal();loadDashboard();},900);
   }catch(e){console.error('Payment method change error:',e);msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';btn.disabled=false;btn.textContent='Submit for Admin Review';}
 };
}
function openReview(questionId, astroId) {
  openModal(`<h2>Rate your consultation</h2>
    <select id="reviewStars"><option value="5">★★★★★ — 5</option><option value="4">★★★★☆ — 4</option><option value="3">★★★☆☆ — 3</option><option value="2">★★☆☆☆ — 2</option><option value="1">★☆☆☆☆ — 1</option></select>
    <textarea id="reviewText" placeholder="Write your review"></textarea>
    <button class="btn" id="submitReview">Submit Review</button><div id="reviewMsg" class="small"></div>`);
  $('submitReview').onclick = async () => {
    const btn=$('submitReview'), msg=$('reviewMsg');
    try {
      if(!currentUser) throw new Error('Please login again.');
      if(!questionId||!astroId) throw new Error('Consultation information is missing. Please refresh and try again.');
      const rating=Number($('reviewStars').value), review=$('reviewText').value.trim();
      if(!Number.isInteger(rating)||rating<1||rating>5) throw new Error('Please select a rating from 1 to 5.');
      if(!review) throw new Error('Please write your review.');
      btn.disabled=true; btn.textContent='SUBMITTING...';
      const questionSnap=await withTimeout(getDoc(doc(db,'smv_questions',questionId)),15000);
      if(!questionSnap.exists()) throw new Error('Consultation not found.');
      const q=questionSnap.data()||{};
      if(q.customerId!==currentUser.uid) throw new Error('You are not allowed to review this consultation.');
      if(q.status!=='answered') throw new Error('You can review only after the answer has been approved.');
      if(q.astrologerId!==astroId) throw new Error('Astrologer information does not match.');
      const reviewId=`${questionId}_${currentUser.uid}`;
      await withTimeout(setDoc(doc(db,'smv_reviews',reviewId),{questionId,customerId:currentUser.uid,customerName:q.customerName||q.birthName||'Customer',astrologerId:astroId,astrologerName:q.astrologerName||'Astrologer',rating,review,verified:true,approved:false,status:'pending',createdAt:serverTimestamp()}),15000);
      try { await withTimeout(updateDoc(doc(db,'smv_questions',questionId),{reviewed:true,reviewSubmittedAt:serverTimestamp()}),15000); }
      catch(markError){ console.warn('Review saved but review flag could not be updated:',markError); }
      msg.innerHTML='<span class="success"><b>Thank you!</b> Your review was submitted and is waiting for Admin approval.</span>';
      setTimeout(()=>{closeModal();loadDashboard();},700);
    } catch(e) {
      console.error('Review submission error:',e);
      const raw=String(e?.message||e);
      const friendly=/permission|insufficient permissions/i.test(raw)?'Review permission was denied by Firebase. Please publish the latest firestore.rules to the same smv-astro Firebase project.':raw;
      msg.innerHTML='<span class="error">'+escapeHtml(friendly)+'</span>'; btn.disabled=false; btn.textContent='Submit Review';
    }
  };
}

// ---------- SMV ASTRO Blog (isolated feature) ----------
// Cloudinary stores Blog text (JSON), cover images, PDFs and videos. Firestore keeps lightweight metadata/index fields.
// Existing Horoscope, Login, Ask Now, Question and Payment logic is untouched.
const SMV_CONTENT_COLLECTION="smv_content";
const SMV_CLOUDINARY_CLOUD_NAME="l6r6c8zi";
const SMV_CLOUDINARY_UPLOAD_PRESET="smv_astro_media";
const SMV_CLOUDINARY_UPLOAD_URL=`https://api.cloudinary.com/v1_1/${SMV_CLOUDINARY_CLOUD_NAME}/auto/upload`;
const SMV_MAX_BLOG_IMAGE=10*1024*1024;
const SMV_MAX_PDF=25*1024*1024;
const SMV_MAX_VIDEO=100*1024*1024;
const SMV_MAX_MUSIC=50*1024*1024;
function smvContentType(file){
  if(!file) return "";
  const name=String(file.name||"").toLowerCase();
  if(file.type==="application/pdf" || name.endsWith(".pdf")) return "pdf";
  if(file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i.test(name)) return "image";
  if(file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(name)) return "video";
  if(file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) return "music";
  return "";
}
function smvFileLimit(type){return type==="video"?SMV_MAX_VIDEO:type==="music"?SMV_MAX_MUSIC:type==="pdf"?SMV_MAX_PDF:SMV_MAX_BLOG_IMAGE;}
async function smvUploadFile(file,type,id){
  const kind=smvContentType(file);
  if(kind!==type && !(type==="music" && !kind))
    throw new Error(`Please select a valid ${type.toUpperCase()} file.`);
  if(file.size>smvFileLimit(type)) throw new Error(`File is too large. Maximum size: ${type==="video"?"100 MB":type==="music"?"50 MB":type==="pdf"?"25 MB":"10 MB"}.`);
  if(!SMV_CLOUDINARY_CLOUD_NAME || !SMV_CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary upload settings are missing.");
  const form=new FormData();
  form.append("file",file);
  form.append("upload_preset",SMV_CLOUDINARY_UPLOAD_PRESET);
  form.append("folder",type==="pdf"?"smv-astro/pdfs":type==="video"?"smv-astro/videos":type==="music"?"smv-astro/music":"smv-astro/images");
  form.append("context",`smv_id=${id}|original_name=${file.name}`);
  // Use Cloudinary AUTO so one unsigned preset can correctly detect
  // image, PDF/raw, video and audio/music without resource-type mismatch.
  const endpoint=SMV_CLOUDINARY_UPLOAD_URL;
  const response=await fetch(endpoint,{method:"POST",body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed. Check the upload preset name and make sure it is Unsigned.");
  return {url:result.secure_url,path:result.public_id,publicId:result.public_id,size:file.size,mimeType:file.type,name:file.name,resourceType:result.resource_type||type};
}function smvFormatBytes(n){
  n=Number(n)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`;
}
async function smvGetPublishedContent(){
  const snap=await getDocs(query(collection(db,SMV_CONTENT_COLLECTION),where("published","==",true),where("language","==","en")));
  return snap.docs.map(d=>({id:d.id,...(d.data()||{})})).sort((a,b)=>{
    const av=a.publishedAt?.seconds||a.createdAt?.seconds||0,bv=b.publishedAt?.seconds||b.createdAt?.seconds||0;return bv-av;
  });
}
async function smvFetchBlogBody(bodyUrl){
  if(!bodyUrl) return "";
  try{const r=await fetch(bodyUrl,{cache:"no-store"});if(!r.ok)throw new Error("Blog content unavailable");const j=await r.json();return typeof j.body==="string"?j.body:"";}
  catch(e){console.warn("Unable to load blog body:",e);return "The blog content is temporarily unavailable.";}
}
async function smvRenderPublicContent(items){
  const blogs=items.filter(x=>x.kind==="blog"),media=items.filter(x=>x.kind==="media");
  const blogBox=$("publicBlogs"),mediaBox=$("publicMedia");
  if(blogBox){
    if(!blogs.length) blogBox.innerHTML='<div class="empty">No published blogs yet.</div>';
    else {const cards=await Promise.all(blogs.map(async x=>{const body=await smvFetchBlogBody(x.bodyUrl);return `<article class="card blog-card"><h3>${escapeHtml(x.title||"Untitled")}</h3>${x.coverUrl?`<img class="content-thumb" src="${escapeHtml(x.coverUrl)}" alt="${escapeHtml(x.title||"Blog")}">`:""}${x.summary?`<p class="small"><b>${escapeHtml(x.summary)}</b></p>`:""}<div class="blog-content">${escapeHtml(body)}</div><div class="small" style="margin-top:auto;padding-top:12px">Published ${escapeHtml(smvDateTime(x.publishedAt||x.createdAt))}</div></article>`;}));blogBox.innerHTML=cards.join("");}
  }
  if(mediaBox){
    const mediaTypeRank={video:0,music:1,pdf:2,image:3};
    const orderedMedia=[...media].sort((a,b)=>{
      const ar=mediaTypeRank[a.mediaType]??9, br=mediaTypeRank[b.mediaType]??9;
      if(ar!==br) return ar-br;
      const av=a.publishedAt?.seconds||a.createdAt?.seconds||0, bv=b.publishedAt?.seconds||b.createdAt?.seconds||0;
      return bv-av;
    });
    mediaBox.innerHTML=orderedMedia.length?(()=>{
  const groups=[
    ['video','Video'],
    ['music','Music'],
    ['pdf','PDF'],
    ['image','Images']
  ];
  const renderCard=x=>{
    const title=escapeHtml(x.title||"Content"),desc=x.description?`<p class="small">${escapeHtml(x.description)}</p>`:"";
    if(x.mediaType==="video") return `<article class="card media-card media-video"><h3>${title}</h3><video controls preload="metadata" src="${escapeHtml(x.url)}"></video>${desc}</article>`;
    if(x.mediaType==="music") return `<article class="card media-card media-music"><h3>🎵 ${title}</h3><audio controls preload="metadata" src="${escapeHtml(x.url)}"></audio><p class="small">Music · ${escapeHtml(smvFormatBytes(x.size))}</p>${desc}</article>`;
    if(x.mediaType==="pdf") return `<article class="card media-card media-pdf"><h3>${title}</h3><p class="small">PDF · ${escapeHtml(smvFormatBytes(x.size))}</p>${desc}<a class="btn" href="${escapeHtml(x.url)}" target="_blank" rel="noopener" download>DOWNLOAD PDF</a></article>`;
    return `<article class="card media-card media-image"><h3>${title}</h3><img src="${escapeHtml(x.url)}" alt="${title}" loading="lazy">${desc}</article>`;
  };
  return groups.map(([type,label])=>{
    const items=orderedMedia.filter(x=>x.mediaType===type);
    if(!items.length)return '';
    return `<section class="smv-media-type-section smv-media-type-${type}"><h3 class="smv-media-type-title">${label}</h3><div class="smv-media-type-grid">${items.map(renderCard).join('')}</div></section>`;
  }).join('');
})():'<div class="empty">No published media yet.</div>';
  }
}
async function loadPublicContent(){try{await smvRenderPublicContent(await smvGetPublishedContent());}catch(e){console.warn("Public content unavailable:",e);if($("publicBlogs"))$("publicBlogs").innerHTML='<div class="empty">Content is temporarily unavailable.</div>';if($("publicMedia"))$("publicMedia").innerHTML='<div class="empty">Media is temporarily unavailable.</div>';}}
function smvClearBlogForm(){
  ["blogEditId","blogTitle","blogSummary","blogBody"].forEach(id=>{if($(id))$(id).value="";});
  if($("blogCoverFile"))$("blogCoverFile").value="";if($("saveBlogBtn"))$("saveBlogBtn").textContent="PUBLISH BLOG";
}
function smvClearMediaForm(){
  ["mediaEditId","mediaTitle","mediaDescription"].forEach(id=>{if($(id))$(id).value="";});
  ["mediaImageFile","mediaPdfFile","mediaVideoFile","mediaMusicFile"].forEach(id=>{if($(id))$(id).value="";});
  if($("mediaSelectedFile"))$("mediaSelectedFile").textContent="No file selected.";
  if($("uploadMediaBtn"))$("uploadMediaBtn").textContent="UPLOAD & PUBLISH";
}
async function loadAdminContent(){
  const box=$("adminBlogsMedia");if(!box)return;
  try{
    const snap=await getDocs(query(collection(db,SMV_CONTENT_COLLECTION),where("language","==","en")));
    const items=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    box.innerHTML=items.length?items.map(x=>{
      const status=x.published?'<span class="success">PUBLISHED</span>':'<span class="small">DRAFT</span>';
      return `<div class="admin-content-row"><b>${escapeHtml(x.title||"Untitled")}</b> · ${escapeHtml(x.kind||"")} ${x.mediaType?`· ${escapeHtml(x.mediaType)}`:""} · ${status}<div class="small">${escapeHtml(x.summary||x.description||"")}</div><div class="admin-blog-actions">${x.kind==="blog"?`<button class="btn gray" data-content-edit="${x.id}">EDIT</button>`:""}<button class="btn gray" data-content-toggle="${x.id}">${x.published?"UNPUBLISH":"PUBLISH"}</button><button class="btn danger" data-content-delete="${x.id}">DELETE</button></div></div>`;
    }).join(""):'<div class="empty">No blogs or uploaded content yet.</div>';
    box.querySelectorAll("[data-content-edit]").forEach(b=>b.onclick=async()=>{
      const x=items.find(i=>i.id===b.dataset.contentEdit);if(!x)return;$("blogEditId").value=x.id;$("blogTitle").value=x.title||"";$("blogSummary").value=x.summary||"";$("blogBody").value=await smvFetchBlogBody(x.bodyUrl);if($("blogCoverFile"))$("blogCoverFile").value="";$("saveBlogBtn").textContent="SAVE & REPUBLISH";$("adminContentManager")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    box.querySelectorAll("[data-content-toggle]").forEach(b=>b.onclick=async()=>{
      try{const item=items.find(x=>x.id===b.dataset.contentToggle);await updateDoc(doc(db,SMV_CONTENT_COLLECTION,b.dataset.contentToggle),{published:!item?.published,publishedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});await loadAdminContent();await loadPublicContent();}catch(e){smvNotice("Unable to update",e.message||String(e),"!");}
    });
    box.querySelectorAll("[data-content-delete]").forEach(b=>b.onclick=async()=>{
      if(!(await smvConfirm("Delete content","This will remove the content record from SMV ASTRO. The Cloudinary files remain stored for safety; automatic Cloudinary deletion requires a secure server-side API key.","DELETE","CANCEL",true)))return;
      const x=items.find(i=>i.id===b.dataset.contentDelete);try{await deleteDoc(doc(db,SMV_CONTENT_COLLECTION,b.dataset.contentDelete));await loadAdminContent();await loadPublicContent();}catch(e){smvNotice("Unable to delete",e.message||String(e),"!");}
    });
  }catch(e){box.innerHTML='<div class="empty error">Unable to load content: '+escapeHtml(e.message||String(e))+'</div>';}
}
async function smvUploadBlogText(body,id){
  const payload=JSON.stringify({version:1,id,body,updatedAt:new Date().toISOString()});
  const file=new Blob([payload],{type:"application/json"});
  const form=new FormData();form.append("file",file,`blog-${id}.json`);form.append("upload_preset",SMV_CLOUDINARY_UPLOAD_PRESET);form.append("folder","smv-astro/blogs");form.append("public_id",`blog-${id}-${Date.now()}`);form.append("context",`smv_id=${id}|type=blog_text`);
  const response=await fetch(SMV_CLOUDINARY_UPLOAD_URL,{method:"POST",body:form});const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.secure_url)throw new Error(result.error?.message||"Cloudinary blog text upload failed. Check the unsigned upload preset and raw-file delivery settings.");
  return {url:result.secure_url,publicId:result.public_id,size:file.size};
}
async function saveBlog(){
  const title=$("blogTitle")?.value.trim(),summary=$("blogSummary")?.value.trim(),body=$("blogBody")?.value.trim(),editId=$("blogEditId")?.value.trim();
  if(!title||!body){smvNotice("Blog Writer","Enter a title and blog content before publishing.","!");return;}const b=$("saveBlogBtn");b.disabled=true;b.textContent=editId?"SAVING...":"PUBLISHING...";
  try{let id=editId,old=null;if(editId){const oldSnap=await getDoc(doc(db,SMV_CONTENT_COLLECTION,editId));if(!oldSnap.exists())throw new Error("Blog not found.");old=oldSnap.data()||{};}else id=doc(collection(db,SMV_CONTENT_COLLECTION)).id;
    let coverUrl=old?.coverUrl||"",coverPath=old?.coverPath||"";const file=$("blogCoverFile")?.files?.[0];if(file){const up=await smvUploadFile(file,"image",id);coverUrl=up.url;coverPath=up.path;}
    const textUp=await smvUploadBlogText(body,id);
    const data={kind:"blog",title,summary,language:"en",bodyUrl:textUp.url,bodyPublicId:textUp.publicId,bodySize:textUp.size,coverUrl,coverPath,published:true,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
    if(editId)await updateDoc(doc(db,SMV_CONTENT_COLLECTION,editId),data);else await setDoc(doc(db,SMV_CONTENT_COLLECTION,id),{...data,createdAt:serverTimestamp(),publishedAt:serverTimestamp(),authorUid:currentUser.uid});
    smvClearBlogForm();await loadAdminContent();await loadPublicContent();$("blogManagerMsg").innerHTML='<span class="success">Blog published successfully. Blog text is stored on Cloudinary.</span>';
  }catch(e){$("blogManagerMsg").innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;if(!b.textContent.includes("PUBLISH"))b.textContent="PUBLISH BLOG";}
}
async function uploadMedia(){
  const title=$("mediaTitle")?.value.trim(),desc=$("mediaDescription")?.value.trim();
  const musicFile=$("mediaMusicFile")?.files?.[0];
  let file=$("mediaImageFile")?.files?.[0] || $("mediaPdfFile")?.files?.[0] || $("mediaVideoFile")?.files?.[0] || musicFile;
  if(!title||!file){smvNotice("Upload Content","Enter a title and select a PDF, image, video or music file.","!");return;}

  // When the user selected the Music button, treat that selected file as music
  // even if Android reports an empty MIME type or hides the extension.
  let type=musicFile ? "music" : smvContentType(file);
  if(!type){smvNotice("Upload Content","Only PDF, image, video and music files are supported.","!");return;}

  // Give Cloudinary a reliable audio filename/MIME when Android supplied neither.
  if(musicFile && !file.type){
    file=new File([file], file.name && /\.[a-z0-9]{2,5}$/i.test(file.name) ? file.name : `${file.name || "music"}.mp3`, {type:"audio/mpeg"});
  }

  const b=$("uploadMediaBtn");b.disabled=true;b.textContent="UPLOADING...";
  try{const id=doc(collection(db,SMV_CONTENT_COLLECTION)).id,up=await smvUploadFile(file,type,id);await setDoc(doc(db,SMV_CONTENT_COLLECTION,id),{kind:"media",title,description:desc,language:"en",mediaType:type,url:up.url,storagePath:up.path,cloudinaryPublicId:up.publicId,size:up.size,mimeType:up.mimeType,fileName:up.name,published:true,createdAt:serverTimestamp(),publishedAt:serverTimestamp(),authorUid:currentUser.uid});smvClearMediaForm();await loadAdminContent();await loadPublicContent();$("mediaManagerMsg").innerHTML='<span class="success">Content uploaded and published successfully.</span>';}catch(e){$("mediaManagerMsg").innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;b.textContent="UPLOAD & PUBLISH";}
}
function initContentManager(){
  $("saveBlogBtn")?.addEventListener("click",saveBlog);
  $("clearBlogBtn")?.addEventListener("click",smvClearBlogForm);
  $("uploadMediaBtn")?.addEventListener("click",uploadMedia);
  $("clearMediaBtn")?.addEventListener("click",smvClearMediaForm);
  const picker=(id,type)=>{
    $(id)?.addEventListener("click",()=>$(type)?.click());
  };
  picker("chooseMediaImage","mediaImageFile");
  picker("chooseMediaPdf","mediaPdfFile");
  picker("chooseMediaVideo","mediaVideoFile");
  picker("chooseMediaMusic","mediaMusicFile");
  ["mediaImageFile","mediaPdfFile","mediaVideoFile","mediaMusicFile"].forEach(id=>$(id)?.addEventListener("change",()=>{
    const f=$(id)?.files?.[0];
    if(f && $("mediaSelectedFile")) $("mediaSelectedFile").textContent=`Selected: ${f.name} (${smvFormatBytes(f.size)})`;
  }));
}
initContentManager();
loadPublicContent();

function smvRenderPrivateConsultAdmin(data){
 const host=$('adminPrivatePending'),answers=$('adminPrivateAnswers'),control=$('privateConsultWorkflowControl');
 if(!host||!answers||!control)return;
 const items=Array.isArray(data?.privateConsultations)?data.privateConsultations:[];
 const adminNotes=Array.isArray(data?.adminNotifications)?data.adminNotifications.slice():[];
 const adminNoteBox=$('adminPrivateNotifications');
 if(adminNoteBox){const seen=new Set(),unique=adminNotes.filter(n=>{const k=[n.type||'',n.consultationId||n.questionId||n.astrologerId||'',n.title||''].join('|');if(seen.has(k))return false;seen.add(k);return true;});const nt=n=>{const t=n?.createdAt;if(t?.seconds)return Number(t.seconds)*1000;if(typeof t==='string')return Date.parse(t)||0;if(t instanceof Date)return t.getTime();return 0;};unique.sort((a,b)=>nt(b)-nt(a));adminNoteBox.innerHTML=unique.length?unique.slice(0,100).map(n=>`<article class="smv-notification-row smv-admin-notification-row"><h4 class="smv-notification-title">${escapeHtml(n.title||'Admin Event')}</h4><p class="smv-notification-content">${escapeHtml(n.message||'')}</p><p class="smv-notification-meta"><span class="smv-notification-label">Date &amp; Time:</span> <span class="smv-notification-result">${escapeHtml(smvDateTime(n.createdAt))}</span></p></article>`).join(''):'<div class="empty">No Admin notifications.</div>';}
 const auto=data?.settings?.privateWorkflow?.allowWithoutAdminApproval===true;
 const privateMinWords=Math.max(1,Number(data?.settings?.privateWorkflow?.minimumAnswerWords||20));
 const privateCommission=data?.settings?.privateCommission||{astrologerRate:20,adminRate:80};
 const pcAstro=$('privateAstroCommission'),pcAdmin=$('privateAdminCommission'),pcSave=$('savePrivateCommission'),pcMsg=$('privateCommissionMsg');
 if(pcAstro){pcAstro.value=Number(privateCommission.astrologerRate??20);pcAstro.oninput=()=>{if(pcAdmin)pcAdmin.value=(100-Math.max(0,Math.min(100,Number(pcAstro.value||0)))).toFixed(2).replace(/\.00$/,'');};}
 if(pcAdmin)pcAdmin.value=Number(privateCommission.adminRate??80);
 if(pcSave)pcSave.onclick=async()=>{const rate=Number(pcAstro?.value);pcSave.disabled=true;try{const r=await renderApi('/admin/private-consultation/set-commission',{method:'POST',body:JSON.stringify({astrologerRate:rate})});if(pcMsg)pcMsg.innerHTML='<span class="success">Saved: Astrologer '+escapeHtml(String(r.astrologerRate))+'% / Admin '+escapeHtml(String(r.adminRate))+'%. Backfilled '+escapeHtml(String(r.backfilled||0))+' eligible past consultation(s).</span>';await loadAdminPanel(true);}catch(e){if(pcMsg)pcMsg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{pcSave.disabled=false;}};
 const wcInput=$('privateMinimumAnswerWords'),wcBtn=$('savePrivateMinimumAnswerWords'),wcMsg=$('privateMinimumAnswerWordsMsg');
 if(wcInput)wcInput.value=privateMinWords;
 if(wcBtn)wcBtn.onclick=async()=>{const n=Math.round(Number(wcInput?.value));wcBtn.disabled=true;try{const r=await renderApi('/admin/private-consultation/set-word-count',{method:'POST',body:JSON.stringify({minimumAnswerWords:n})});if(wcMsg)wcMsg.innerHTML='<span class="success">Private Consultation minimum answer words saved: '+escapeHtml(String(r.minimumAnswerWords))+'</span>';await loadAdminPanel(true);}catch(e){if(wcMsg)wcMsg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{wcBtn.disabled=false;}};
 control.innerHTML=`<div class="action-row"><button class="btn ${auto?'':'gray'}" id="privateWorkflowToggle">${auto?'AUTO ALLOW ON':'ADMIN ALLOW ON'}</button><span class="small">${auto?'Paid questions go directly to the selected astrologer; submitted answers go directly to the customer.':'Admin must approve private questions and answers.'}</span></div><div id="privateWorkflowMsg" class="small"></div>`;
 $('privateWorkflowToggle').onclick=async()=>{const b=$('privateWorkflowToggle');b.disabled=true;try{await renderApi('/admin/private-consultation/set-workflow',{method:'POST',body:JSON.stringify({allowWithoutAdminApproval:!auto})});await loadAdminPanel();}catch(e){$('privateWorkflowMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';b.disabled=false;}};
 const pending=items.filter(c=>c.paymentStatus==='paid'&&c.status==='pending_admin_approval');
 host.innerHTML=pending.length?pending.map(c=>`<div class="card" style="margin:10px 0"><b>${escapeHtml(c.customerName||'Customer')}</b> → <b>${escapeHtml(c.astrologerName||'Selected Astrologer')}</b><p>${escapeHtml(c.question||'')}</p><div class="small">Chat Price: ₹${Number(c.chatPrice||c.amount||0).toFixed(2)} · Consultation ID: ${escapeHtml(c.id||c.consultationId||'')}</div><div class="action-row"><button class="btn" data-pc-approve="${c.id}">ACCEPT QUESTION</button><button class="btn gray" data-pc-reject="${c.id}">REJECT & REFUND</button></div></div>`).join(''):'<div class="empty">No private questions waiting for approval.</div>';
 let refundMonitor=$('adminPrivateRefundMonitor');
 if(!refundMonitor){refundMonitor=document.createElement('div');refundMonitor.id='adminPrivateRefundMonitor';refundMonitor.className='card';refundMonitor.style.marginTop='16px';(answers.closest('.card')||answers).insertAdjacentElement('afterend',refundMonitor);}
 const refundItems=items.filter(c=>c.status==='question_rejected'||c.refundId||['failed','pending','processed','completed'].includes(String(c.refundStatus||'').toLowerCase()));
 refundMonitor.innerHTML=`<h3>Private Consultation — Refund Monitor</h3>${refundItems.length?refundItems.map(c=>{const st=String(c.refundStatus||'failed').toLowerCase(),done=['processed','completed'].includes(st),id=String(c.id||c.consultationId||'');return `<div style="padding:12px 0;border-bottom:1px solid #eee"><b>${escapeHtml(c.customerName||'Customer')}</b> · ${escapeHtml(c.astrologerName||'Selected Astrologer')}<div class="small"><b>Consultation ID:</b> ${escapeHtml(id)} · <b>Amount:</b> ₹${Number(c.refundAmount||c.chatPrice||c.amount||0).toFixed(2)}</div><div class="small"><b>Refund Status:</b> ${escapeHtml(c.refundStatus||'Failed / Not Created')}</div>${c.refundId?`<div class="small"><b>Refund ID:</b> ${escapeHtml(c.refundId)}</div>`:''}<div class="small"><b>RRN:</b> ${escapeHtml(c.refundRrn||'Available after Razorpay processes the refund')}</div>${c.refundArn?`<div class="small"><b>ARN:</b> ${escapeHtml(c.refundArn)}</div>`:''}${c.refundUtr?`<div class="small"><b>UTR:</b> ${escapeHtml(c.refundUtr)}</div>`:''}${c.refundProcessedAt?`<div class="small"><b>Refund Date:</b> ${escapeHtml(smvDateTime(c.refundProcessedAt))}</div>`:''}${c.refundLastError?`<div class="small error">${escapeHtml(c.refundLastError)}</div>`:''}<div class="action-row">${!c.refundId?`<button class="btn" data-private-refund-retry="${escapeHtml(id)}">RETRY REFUND</button>`:!done?`<button class="btn" data-private-refund-sync="${escapeHtml(id)}">SYNC RAZORPAY REFUND</button>`:'<span class="success">REFUND COMPLETED</span>'}</div></div>`;}).join(''):'<div class="empty">No Private Consultation refunds.</div>'}`;
 refundMonitor.querySelectorAll('[data-private-refund-retry]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/admin/private-consultation/retry-refund',{method:'POST',body:JSON.stringify({consultationId:b.dataset.privateRefundRetry})});await loadAdminPanel(true);}catch(e){alert(e.message||String(e));b.disabled=false;}});
 refundMonitor.querySelectorAll('[data-private-refund-sync]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/admin/private-consultation/sync-refund',{method:'POST',body:JSON.stringify({consultationId:b.dataset.privateRefundSync})});await loadAdminPanel(true);}catch(e){alert(e.message||String(e));b.disabled=false;}});
 const waiting=items.filter(c=>c.status==='answer_pending_admin_approval'&&String(c.answer||'').trim());
 answers.innerHTML=waiting.length?waiting.map(c=>`<div class="card" style="margin:10px 0"><b>${escapeHtml(c.astrologerName||'Astrologer')}</b><p><b>Question:</b> ${escapeHtml(c.question||'')}</p><p><b>Answer:</b> ${escapeHtml(c.answer||'')}</p><div class="action-row"><button class="btn" data-pca-approve="${c.id}">APPROVE ANSWER</button><button class="btn gray" data-pca-reject="${c.id}">REJECT ANSWER</button></div></div>`).join(''):'<div class="empty">No private answers waiting for approval.</div>';
 host.querySelectorAll('[data-pc-approve]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/admin/private-consultation/approve-question',{method:'POST',body:JSON.stringify({consultationId:b.dataset.pcApprove})});await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
 host.querySelectorAll('[data-pc-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('Reason for rejection and refund:');if(!reason)return;b.disabled=true;try{const r=await renderApi('/admin/private-consultation/reject-question',{method:'POST',body:JSON.stringify({consultationId:b.dataset.pcReject,reason})});alert('Refund '+(r.refundStatus||'requested')+(r.refundRrn?' · RRN: '+r.refundRrn:''));await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
 answers.querySelectorAll('[data-pca-approve]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await renderApi('/admin/private-consultation/approve-answer',{method:'POST',body:JSON.stringify({consultationId:b.dataset.pcaApprove})});await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
 answers.querySelectorAll('[data-pca-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('Reason for answer rejection:');if(!reason)return;b.disabled=true;try{await renderApi('/admin/private-consultation/reject-answer',{method:'POST',body:JSON.stringify({consultationId:b.dataset.pcaReject,reason})});await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
}

function smvRenderOpenWorkflowControl(data){
 const host=$('adminSummary'); if(!host)return; let card=$('smvOpenWorkflowControl');
 if(!card){card=document.createElement('div');card.id='smvOpenWorkflowControl';card.className='card';card.style.marginTop='16px';host.insertAdjacentElement('afterend',card);}
 const on=data?.settings?.workflow?.allowWithoutAdminApproval===true;
 card.innerHTML=`<h3>Question / Answer Approval Control</h3><p class="small">When <b>ALLOW</b> is ON, paid questions go directly to Open Questions for all approved astrologers. The first astrologer to claim owns the question, and submitted answers go directly to the customer without Admin approval. The astrologer can edit only until the customer views the answer.</p><div class="action-row"><button class="btn ${on?'':'gray'}" id="smvWorkflowAllow" type="button">${on?'ALLOW ON':'ALLOW OFF'}</button><span class="small"><b>Current mode:</b> ${on?'Open questions + direct answers':'Admin question/answer approval required'}</span></div><div id="smvWorkflowMsg" class="small"></div>`;
 $('smvWorkflowAllow').onclick=async()=>{const b=$('smvWorkflowAllow'),next=!on;b.disabled=true;try{const r=await renderApi('/admin/set-open-workflow',{method:'POST',body:JSON.stringify({allowWithoutAdminApproval:next})});if(!r?.success)throw new Error(r?.error||'Unable to change workflow.');$('smvWorkflowMsg').innerHTML='<span class="success">Saved. '+(next?'Open Questions mode is ON.':'Admin approval mode is ON.')+'</span>';await loadAdminPanel();}catch(e){$('smvWorkflowMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';b.disabled=false;}};
}

let smvAdminLoad=null,smvAdminLoadUid=null;
async function renderAdminOffers(){
  const anchor=$("questionPrice")?.closest(".card"); if(!anchor)return;
  let card=$("adminOffersPromotions"); if(!card){card=document.createElement("div");card.id="adminOffersPromotions";card.className="card";card.style.marginTop="16px";anchor.insertAdjacentElement("afterend",card);}
  card.innerHTML='<h3>Offers & Promotions</h3><p class="small">Built-in ₹1 Welcome Offer, promo codes, festival/season offers and invisible payment-only promotions. Discounts never stack; server verifies the Razorpay amount.</p><div id="adminOfferEditor"></div><div id="adminOfferList"><div class="empty">Loading offers...</div></div><div class="small" id="adminOfferMsg"></div>';
  $("adminOfferEditor").innerHTML=`<input type="hidden" id="offerEditId"><div class="grid"><label><b>Offer Name</b><input id="offerName" placeholder="Pongal Special"></label><label><b>Promo Code</b><input id="offerPromoCode" maxlength="40" placeholder="PONGAL49"></label><label><b>Discount Type</b><select id="offerDiscountType"><option value="fixed_price">Fixed Price</option><option value="percentage">Percentage Discount</option><option value="flat">Flat Discount</option></select></label><label><b>Offer Price ₹</b><input id="offerPrice" type="number" min="1" step="0.01" value="1"></label><label><b>Discount Value</b><input id="offerDiscountValue" type="number" min="0" step="0.01" value="0"></label><label><b>Eligibility</b><select id="offerEligibility"><option value="all">All Customers</option><option value="new_customer">New Customers Only</option><option value="existing_customer">Existing Customers Only</option></select></label><label><b>Applies To</b><select id="offerAppliesTo"><option value="public_question">Ask Question</option><option value="private_consultation">Private Consultation</option><option value="all">Both</option></select></label><label><b>Display Mode</b><select id="offerDisplayMode"><option value="payment_only">Payment Only / Invisible</option><option value="hidden">Hidden</option><option value="home_banner">Home Banner</option><option value="customer_dashboard">Customer Dashboard</option><option value="home_dashboard">Home + Dashboard</option></select></label><label><b>Start Date & Time</b><input id="offerStartAt" type="datetime-local"></label><label><b>End Date & Time</b><input id="offerEndAt" type="datetime-local"></label><label><b>Per Customer Limit</b><input id="offerPerCustomerLimit" type="number" min="0" value="1"></label><label><b>Total Usage Limit (0 = unlimited)</b><input id="offerTotalUsageLimit" type="number" min="0" value="0"></label><label><b>Minimum Amount ₹</b><input id="offerMinimumAmount" type="number" min="0" step="0.01" value="1"></label><label><b>Automatic Offer</b><select id="offerAutomatic"><option value="true">YES</option><option value="false">NO — Promo Code Required</option></select></label><label><b>Enabled</b><select id="offerEnabled"><option value="true">ON</option><option value="false">OFF</option></select></label></div><label><b>Banner / Payment Message</b><input id="offerBannerText" maxlength="240" placeholder="Pongal Special Offer Applied"></label><div class="action-row"><button class="btn" id="saveOfferBtn" type="button">SAVE OFFER</button><button class="btn gray" id="clearOfferBtn" type="button">CLEAR</button></div>`;
  const clear=()=>{for(const id of ['offerEditId','offerName','offerPromoCode','offerStartAt','offerEndAt','offerBannerText'])if($(id))$(id).value='';$('offerPrice').value='1';$('offerDiscountValue').value='0';$('offerPerCustomerLimit').value='1';$('offerTotalUsageLimit').value='0';$('offerMinimumAmount').value='1';$('offerEnabled').value='true';$('offerAutomatic').value='true';}; $("clearOfferBtn").onclick=clear;
  async function reload(){const r=await renderApi('/admin/offers',{method:'GET'}),list=$("adminOfferList"),offers=r.offers||[];list.innerHTML=offers.length?offers.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).map(o=>`<div class="card" style="margin-top:8px"><b>${escapeHtml(o.name||'Offer')}</b> ${o.enabled?'<span class="success">ON</span>':'<span class="small">OFF</span>'}<div class="small">${escapeHtml(o.promoCode||'Automatic')} · ${escapeHtml(o.discountType||'fixed_price')} · Used ${Number(o.usedCount||0)}${Number(o.totalUsageLimit||0)>0?' / '+Number(o.totalUsageLimit):''} · Successful Payments ${Number(o.successfulPayments||0)} · Discount Given ₹${Number(o.totalDiscountGiven||0).toFixed(2)}</div><div class="action-row">${o.builtIn?`<button class="btn ${o.enabled?'gray':''}" data-welcome-toggle="${escapeHtml(o.id)}">${o.enabled?'TURN OFF':'TURN ON'}</button>`:`<button class="btn" data-offer-edit="${escapeHtml(o.id)}">EDIT</button><button class="btn gray" data-offer-delete="${escapeHtml(o.id)}">DELETE</button>`}</div></div>`).join(''):'<div class="empty">No offers created yet.</div>';list.querySelectorAll('[data-welcome-toggle]').forEach(b=>b.onclick=async()=>{const o=offers.find(x=>x.id===b.dataset.welcomeToggle);if(!o||!o.builtIn)return;b.disabled=true;try{await renderApi('/admin/offers/save',{method:'POST',body:JSON.stringify({id:o.id,name:'₹1 New Customer Welcome Offer',discountType:'fixed_price',offerPrice:1,discountValue:0,eligibility:'new_customer',appliesTo:['public_question','private_consultation'],displayMode:o.displayMode||'payment_only',startAt:o.startAt||null,endAt:o.endAt||null,perCustomerLimit:1,totalUsageLimit:0,minimumAmount:1,automatic:true,enabled:!o.enabled,bannerText:'Welcome Offer Applied — First Paid Service ₹1',usageRule:'first_paid_service'})});$('adminOfferMsg').innerHTML='<span class="success">₹1 Welcome Offer '+(!o.enabled?'enabled.':'disabled.')+'</span>';clear();await reload();}catch(e){$('adminOfferMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';b.disabled=false;}});list.querySelectorAll('[data-offer-edit]').forEach(b=>b.onclick=()=>{const o=offers.find(x=>x.id===b.dataset.offerEdit);if(!o||o.builtIn)return;$('offerEditId').value=o.id;$('offerName').value=o.name||'';$('offerPromoCode').value=o.promoCode||'';$('offerDiscountType').value=o.discountType||'fixed_price';$('offerPrice').value=o.offerPrice??1;$('offerDiscountValue').value=o.discountValue??0;$('offerEligibility').value=o.eligibility||'all';$('offerAppliesTo').value=(o.appliesTo||['public_question'])[0]||'public_question';$('offerDisplayMode').value=o.displayMode||'payment_only';$('offerStartAt').value=typeof o.startAt==='string'?o.startAt.slice(0,16):'';$('offerEndAt').value=typeof o.endAt==='string'?o.endAt.slice(0,16):'';$('offerPerCustomerLimit').value=o.perCustomerLimit??1;$('offerTotalUsageLimit').value=o.totalUsageLimit??0;$('offerMinimumAmount').value=o.minimumAmount??1;$('offerAutomatic').value=String(o.automatic!==false);$('offerEnabled').value=String(o.enabled===true);$('offerBannerText').value=o.bannerText||'';card.scrollIntoView({behavior:'smooth',block:'start'});});list.querySelectorAll('[data-offer-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this offer?'))return;await renderApi('/admin/offers/delete',{method:'POST',body:JSON.stringify({id:b.dataset.offerDelete})});await reload();});}
  $("saveOfferBtn").onclick=async()=>{
    const b=$("saveOfferBtn");b.disabled=true;b.textContent='SAVING...';
    try{
      const applies=$("offerAppliesTo").value;
      const payload={id:$("offerEditId").value||undefined,name:$("offerName").value.trim(),promoCode:$("offerPromoCode").value.trim(),discountType:$("offerDiscountType").value,offerPrice:Number($("offerPrice").value),discountValue:Number($("offerDiscountValue").value),eligibility:$("offerEligibility").value,appliesTo:applies==='all'?['all']:[applies],displayMode:$("offerDisplayMode").value,startAt:$("offerStartAt").value||null,endAt:$("offerEndAt").value||null,perCustomerLimit:Number($("offerPerCustomerLimit").value),totalUsageLimit:Number($("offerTotalUsageLimit").value),minimumAmount:Number($("offerMinimumAmount").value),automatic:$("offerAutomatic").value==='true',enabled:$("offerEnabled").value==='true',bannerText:$("offerBannerText").value.trim()};
      if(!payload.name)throw new Error('Offer Name is required.');
      if(payload.discountType==='fixed_price'&&(!Number.isFinite(payload.offerPrice)||payload.offerPrice<1))throw new Error('Offer Price must be at least ₹1.');
      const result=await renderApi('/admin/offers/save',{method:'POST',body:JSON.stringify(payload)});
      if(!result?.success||!result?.id)throw new Error('Offer was not confirmed by the server.');
      // Re-read from the server and keep the editor values until persistence is verified.
      const verify=await renderApi('/admin/offers',{method:'GET'});
      const saved=(verify.offers||[]).find(o=>o.id===result.id);
      if(!saved)throw new Error('Offer was not found after saving. Please deploy the updated server.js.');
      const same=String(saved.name||'')===payload.name && String(saved.discountType||'')===payload.discountType && Number(saved.offerPrice||0)===Number(payload.offerPrice||0) && Number(saved.discountValue||0)===Number(payload.discountValue||0) && String(saved.eligibility||'')===payload.eligibility && String(saved.displayMode||'')===payload.displayMode && Boolean(saved.automatic)===payload.automatic && Boolean(saved.enabled)===payload.enabled;
      if(!same)throw new Error('Server returned old offer values. Deploy the changed server.js before testing again.');
      $('adminOfferMsg').innerHTML='<span class="success">Offer saved and verified: '+escapeHtml(saved.name||payload.name)+'</span>';
      clear();await reload();
    }catch(e){$('adminOfferMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}
    finally{b.disabled=false;b.textContent='SAVE OFFER';}
  };try{await reload();}catch(e){$("adminOfferList").innerHTML='<div class="error">'+escapeHtml(e.message||String(e))+'</div>';}
}

async function loadAdminPanel(background=false){
 if(smvAdminLoad&&smvAdminLoadUid===currentUser?.uid){const uid=currentUser.uid;await smvAdminLoad;if(background&&currentUser?.uid===uid)return loadAdminPanel(true);return;}
 smvAdminLoadUid=currentUser?.uid;
 const task=loadAdminPanelData(background);smvAdminLoad=task;
 try{return await task;}finally{if(smvAdminLoad===task)smvAdminLoad=null;}
}
async function loadAdminPanelData(background=false){
 if(!currentUser || !(await isCurrentAdmin())){hide('admin');hide('adminLink');return;}
  if(!background)loadAdminContent().catch(e=>console.warn('Admin content unavailable:',e));
 if(!background){hidePrimarySections('admin');show('smv-dashboard-page');show('admin');}
 setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
 try{
  const adminLoadUid=currentUser.uid;
  const adminReads=await Promise.allSettled([
   withTimeout(renderApi('/admin-data',{method:'GET'}),20000),
   withTimeout(getDoc(doc(db,'smv_settings','commission'))),withTimeout(getDoc(doc(db,'smv_settings','question'))),withTimeout(getDoc(doc(db,'smv_settings','answer')))
  ]);
  const adminRead=i=>{if(adminReads[i].status==='rejected')throw adminReads[i].reason;return adminReads[i].value;};
  const adminData=adminRead(0);
  if(currentUser?.uid!==adminLoadUid)return;
  if(background&&($('admin')?.classList.contains('hidden')||smvEditing('admin'))){smvLiveQueue?.request();return;}

  if(!adminData?.success) throw new Error(adminData?.error||'Admin data could not be loaded.');
  const toDocs=(arr)=>({docs:(arr||[]).map(x=>({id:x.id,data:()=>x})),size:(arr||[]).length,empty:!(arr||[]).length});
  const users=toDocs(adminData.users), astros=toDocs(adminData.astrologers), questions=toDocs(adminData.questions), payments=toDocs(adminData.payments);
  if(!currentUser || currentUser.uid!==adminLoadUid || currentUser.uid!==auth?.currentUser?.uid) return;
  renderAdminWorkflows({data:adminData,api:renderApi,refresh:smvRefreshWorkflowCards,lang:"en",escape:escapeHtml,date:smvDateTime});
  smvRenderOpenWorkflowControl(adminData);
  smvRenderPrivateConsultAdmin(adminData);
  smvWatchAdminQuestions();
  const adminReadErrors=adminData.errors||{};
  const readErrorText=Object.entries(adminReadErrors).filter(([,v])=>v).map(([k,v])=>k+': '+v).join(' | ');
  $('adminDataLoadMsg') && ($('adminDataLoadMsg').innerHTML=readErrorText?'<div class="empty error">Some Admin data could not be loaded: '+escapeHtml(readErrorText)+'</div>':'');
  const customers=(adminData.customers||[]).length, pendingDocs=astros.docs.filter(d=>d.data().status==='pending');
  const userMap=new Map(users.docs.map(d=>[d.id,d.data()]));
  $('adminSummary').innerHTML=`<div class="stat">Customers <b>${customers}</b></div><div class="stat">Astrologers <b>${astros.size}</b></div><div class="stat">Pending <b>${pendingDocs.length}</b></div><div class="stat">Questions <b>${questions.size}</b></div>`;
  const apmt=$('adminAstrologerProfileManagementToggle'),apmb=$('adminAstrologerProfileManagementBody');
  if(apmt&&apmb&&!apmt.dataset.smvBound){apmt.dataset.smvBound='1';apmt.onclick=()=>{const hidden=apmb.classList.toggle('hidden');apmt.textContent=hidden?'▶':'▼';apmt.title=hidden?'Expand':'Collapse';apmt.setAttribute('aria-label',(hidden?'Expand':'Collapse')+' Astrologer Profile Management');};}

  let aqCard=$('astrologerAutoApprovalCard');
  if(!aqCard){aqCard=document.createElement('div');aqCard.id='astrologerAutoApprovalCard';aqCard.className='card';$('adminSummary')?.insertAdjacentElement('afterend',aqCard);}
  const aq=adminData.settings?.astrologerAutoApproval||{enabled:false,formUrl:'',passMark:20,defaultChatPrice:25,webhookSecret:''};
  aqCard.innerHTML=`<h3>Astrologer Auto Approval — Google Form Qualification</h3><div class="grid"><label><b>Auto Approval</b><select id="astroAutoApprovalEnabled"><option value="false">OFF — Manual Admin Approval</option><option value="true">ON — Auto Approve Passed Test</option></select></label><label><b>Pass Mark / 25</b><input id="astroAutoPassMark" type="number" min="1" max="25" step="1"></label><label><b>Default Private Chat Price ₹</b><input id="astroAutoChatPrice" type="number" min="1" step="0.01"></label><label><b>Published Google Form URL</b><input id="astroAutoFormUrl" type="url" placeholder="https://docs.google.com/forms/..."></label><label><b>Apps Script Web App URL</b><input id="astroQuizSyncWebAppUrl" type="url" placeholder="https://script.google.com/macros/s/.../exec"></label></div><p class="small">When enabled: registered pending Astrologer → 25-question Google Form quiz → verified score reaches this backend → pass mark reached → account auto approved. When OFF, existing Admin manual approval continues unchanged.</p><div class="small"><b>Webhook Secret:</b> <code id="astroQuizWebhookSecret">${escapeHtml(aq.webhookSecret||'Not generated yet')}</code></div><div class="action-row"><button class="btn" id="saveAstroAutoApproval">SAVE AUTO APPROVAL</button><button class="btn gray" id="rotateAstroQuizSecret">ROTATE WEBHOOK SECRET</button></div><div class="small" id="astroAutoApprovalMsg"></div>`;
  $('astroAutoApprovalEnabled').value=String(aq.enabled===true);$('astroAutoPassMark').value=Number(aq.passMark||20);$('astroAutoChatPrice').value=Number(aq.defaultChatPrice||25);$('astroAutoFormUrl').value=aq.formUrl||'';$('astroQuizSyncWebAppUrl').value=aq.syncWebAppUrl||'';
  const saveAQ=async rotate=>{const b=rotate?$('rotateAstroQuizSecret'):$('saveAstroAutoApproval');b.disabled=true;try{const r=await renderApi('/admin/astrologer-auto-approval/settings',{method:'POST',body:JSON.stringify({enabled:$('astroAutoApprovalEnabled').value==='true',passMark:Number($('astroAutoPassMark').value),defaultChatPrice:Number($('astroAutoChatPrice').value),formUrl:$('astroAutoFormUrl').value.trim(),syncWebAppUrl:$('astroQuizSyncWebAppUrl').value.trim(),rotateSecret:rotate})});$('astroQuizWebhookSecret').textContent=r.webhookSecret;$('astroAutoApprovalMsg').innerHTML='<span class="success">Astrologer Auto Approval settings saved.</span>';}catch(e){$('astroAutoApprovalMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;}};
  $('saveAstroAutoApproval').onclick=()=>saveAQ(false);$('rotateAstroQuizSecret').onclick=()=>saveAQ(true);
  let qm=$('astrologerQuizQuestionManager');
  if(!qm){qm=document.createElement('div');qm.id='astrologerQuizQuestionManager';qm.className='card';aqCard.insertAdjacentElement('afterend',qm);}
  const renderQuizManager=async()=>{
    try{
      const r=await renderApi('/admin/astrologer-quiz/questions',{method:'GET'}),qs=r.questions||[];
      qm.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h3 style="margin:0;color:#e60000;font-weight:900">Astrologer Qualification Test — Question Manager</h3><button type="button" id="astrologerQuizQuestionManagerToggle" class="smv-v170-collapse-btn" aria-label="Collapse 25 Question Section" title="Collapse">▼</button></div><div id="astrologerQuizQuestionManagerBody"><p class="small">Edit Tamil + English question, four choices, correct answer, order and Enable/Disable. Only enabled questions are sent to Google Form. Pass Mark is controlled above.</p><div class="action-row"><button class="btn" id="quizLoadDefaults">LOAD DEFAULT 25 QUESTIONS</button><button class="btn" id="quizAddQuestion">ADD QUESTION</button><button class="btn" id="quizSyncGoogleForm">SYNC GOOGLE FORM</button></div><div id="quizManagerMsg" class="small"></div><div id="quizQuestionList"></div></div>`;
      const qmt=$('astrologerQuizQuestionManagerToggle'),qmb=$('astrologerQuizQuestionManagerBody');
      if(qmt&&qmb)qmt.onclick=()=>{const hidden=qmb.classList.toggle('hidden');qmt.textContent=hidden?'▶':'▼';qmt.title=hidden?'Expand':'Collapse';qmt.setAttribute('aria-label',(hidden?'Expand':'Collapse')+' 25 Question Section');};
      const list=$('quizQuestionList');
      const editor=q=>`<div class="card" data-qcard="${escapeHtml(q.id||'new')}" style="margin:10px 0"><div class="grid"><label><b>Order</b><input data-f="order" type="number" min="1" value="${escapeHtml(String(q.order||qs.length+1))}"></label><label><b>Status</b><select data-f="enabled"><option value="true">Enabled</option><option value="false">Disabled</option></select></label></div><label><b>Tamil Question</b><textarea data-f="questionTa">${escapeHtml(q.questionTa||'')}</textarea></label><label><b>English Question</b><textarea data-f="questionEn">${escapeHtml(q.questionEn||'')}</textarea></label>${[0,1,2,3].map(i=>`<div class="grid"><label><b>Choice ${i+1} — Tamil</b><input data-ta="${i}" value="${escapeHtml(q.choicesTa?.[i]||'')}"></label><label><b>Choice ${i+1} — English</b><input data-en="${i}" value="${escapeHtml(q.choicesEn?.[i]||'')}"></label></div>`).join('')}<label><b>Correct Answer</b><select data-f="correctIndex">${[0,1,2,3].map(i=>`<option value="${i}">Choice ${i+1}</option>`).join('')}</select></label><div class="action-row"><button class="btn" data-qsave="${escapeHtml(q.id||'')}">SAVE</button>${q.id?`<button class="btn gray" data-qdelete="${escapeHtml(q.id)}">DELETE</button>`:''}</div></div>`;
      list.innerHTML=qs.length?qs.map(editor).join(''):'<div class="empty">No saved questions yet. Use ADD QUESTION to create the Question Bank.</div>';
      qs.forEach((q,i)=>{const c=list.children[i];c.querySelector('[data-f="enabled"]').value=String(q.enabled!==false);c.querySelector('[data-f="correctIndex"]').value=String(Number(q.correctIndex||0));});
      const bind=()=>{
        list.querySelectorAll('[data-qsave]').forEach(b=>b.onclick=async()=>{const c=b.closest('[data-qcard]'),payload={id:b.dataset.qsave||undefined,order:Number(c.querySelector('[data-f="order"]').value),enabled:c.querySelector('[data-f="enabled"]').value==='true',questionTa:c.querySelector('[data-f="questionTa"]').value.trim(),questionEn:c.querySelector('[data-f="questionEn"]').value.trim(),choicesTa:[...c.querySelectorAll('[data-ta]')].map(x=>x.value.trim()),choicesEn:[...c.querySelectorAll('[data-en]')].map(x=>x.value.trim()),correctIndex:Number(c.querySelector('[data-f="correctIndex"]').value)};b.disabled=true;try{await renderApi('/admin/astrologer-quiz/questions',{method:'POST',body:JSON.stringify(payload)});await renderQuizManager();}catch(e){$('quizManagerMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';b.disabled=false;}});
        list.querySelectorAll('[data-qdelete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this qualification question?'))return;await renderApi('/admin/astrologer-quiz/questions/delete',{method:'POST',body:JSON.stringify({id:b.dataset.qdelete})});await renderQuizManager();});
      };bind();
      $('quizLoadDefaults').onclick=async()=>{const b=$('quizLoadDefaults');b.disabled=true;try{const r=await renderApi('/admin/astrologer-quiz/load-defaults',{method:'POST',body:JSON.stringify({fillMissing:false})});$('quizManagerMsg').innerHTML='<span class="success">Default professional Vedic Astrology questions loaded: '+escapeHtml(String(r.created))+'/25.</span>';await renderQuizManager();}catch(e){$('quizManagerMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';b.disabled=false;}};
      $('quizAddQuestion').onclick=()=>{list.insertAdjacentHTML('afterbegin',editor({id:'',order:qs.length+1,enabled:true,choicesTa:['','','',''],choicesEn:['','','',''],correctIndex:0}));const c=list.firstElementChild;c.querySelector('[data-f="enabled"]').value='true';c.querySelector('[data-f="correctIndex"]').value='0';bind();};
      $('quizSyncGoogleForm').onclick=async()=>{const b=$('quizSyncGoogleForm');b.disabled=true;b.textContent='SYNCING...';$('quizManagerMsg').textContent='';try{const r=await renderApi('/admin/astrologer-quiz/sync-google-form',{method:'POST',body:JSON.stringify({}),timeoutMs:95000});$('quizManagerMsg').innerHTML='<span class="success">Google Form synced successfully. Enabled Questions: '+escapeHtml(String(r.enabledQuestions||0))+' · Pass Mark: '+escapeHtml(String(r.passMark||''))+'</span>';}catch(e){$('quizManagerMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;b.textContent='SYNC GOOGLE FORM';}};
    }catch(e){qm.innerHTML='<h3>Astrologer Qualification Test — Question Manager</h3><div class="error">'+escapeHtml(e.message||String(e))+'</div>';}
  };
  renderQuizManager();


  let settings={astroPercent:20,adminPercent:80}; try{const ss=adminRead(1);if(ss.exists())settings=ss.data();}catch(e){}
  let questionSettings={price:5}; try{const qps=adminRead(2);if(qps.exists())questionSettings=qps.data();}catch(e){}

  try{
    const hf=await withTimeout(getDoc(doc(db,'smv_settings','horoscope_features')),10000), h=hf.exists()?hf.data():{};
    if($('advancedAnalysisEnabled'))$('advancedAnalysisEnabled').value=String(h.advancedAnalysisEnabled!==false);
    if($('advancedAnalysisPrice'))$('advancedAnalysisPrice').value=Number(h.advancedAnalysisPrice||0);
    if($('marriageMatchingEnabled'))$('marriageMatchingEnabled').value=String(h.marriageMatchingEnabled!==false);
    if($('marriageMatchingPrice'))$('marriageMatchingPrice').value=Number(h.marriageMatchingPrice||0);
  }catch(e){console.warn('HOROSCOPE FEATURE SETTINGS LOAD ERROR',e);}
  if($('saveHoroscopePaidFeatures'))$('saveHoroscopePaidFeatures').onclick=async()=>{
    const b=$('saveHoroscopePaidFeatures'),msg=$('horoscopePaidFeaturesMsg');
    const advancedAnalysisEnabled=$('advancedAnalysisEnabled').value==='true', marriageMatchingEnabled=$('marriageMatchingEnabled').value==='true';
    const advancedAnalysisPrice=Math.round(Number($('advancedAnalysisPrice').value)*100)/100, marriageMatchingPrice=Math.round(Number($('marriageMatchingPrice').value)*100)/100;
    if(!Number.isFinite(advancedAnalysisPrice)||advancedAnalysisPrice<0||!Number.isFinite(marriageMatchingPrice)||marriageMatchingPrice<0){if(msg)msg.innerHTML='<span class="error">Prices must be ₹0 or higher.</span>';return;}
    b.disabled=true;try{await setDoc(doc(db,'smv_settings','horoscope_features'),{advancedAnalysisEnabled,advancedAnalysisPrice,marriageMatchingEnabled,marriageMatchingPrice,updatedAt:serverTimestamp(),updatedBy:currentUser.uid},{merge:true});if(msg)msg.innerHTML='<span class="success">Horoscope feature settings saved.</span>';}catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;}
  };
  $('questionPrice').value=Number(questionSettings.price||5);
  renderAdminOffers().catch(e=>console.error('Offers manager load failed:',e));
  $('saveQuestionPrice').onclick=async()=>{const price=Math.round(Number($('questionPrice').value)*100)/100;if(!Number.isFinite(price)||price<1){$('questionPriceMsg').innerHTML='<span class="error">Enter a valid price of at least ₹1.</span>';return;}const b=$('saveQuestionPrice');b.disabled=true;b.textContent='SAVING...';try{await setDoc(doc(db,'smv_settings','question'),{price,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});questionServicePrice=price;if($('askRate'))$('askRate').innerHTML=`<b>₹${price.toFixed(2)} per Question</b>`;if($('publicQuestionPrice'))$('publicQuestionPrice').textContent=`₹${price.toFixed(2)}`;$('questionPriceMsg').innerHTML='<span class="success">Current public question price saved: ₹'+price.toFixed(2)+'</span>';}catch(e){$('questionPriceMsg').innerHTML='<span class="error">Unable to save price: '+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;b.textContent='SAVE PRICE';}};
  $('astroCommission').value=settings.astroPercent??20;$('adminCommission').value=settings.adminPercent??80;
  $('saveCommission').onclick=async()=>{const a=Number($('astroCommission').value),ad=Number($('adminCommission').value);if(a<0||ad<0||Math.abs(a+ad-100)>0.001){$('commissionMsg').innerHTML='<span class="error">Astrologer % + Admin % must equal 100%.</span>';return;}await setDoc(doc(db,'smv_settings','commission'),{astroPercent:a,adminPercent:ad,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$('commissionMsg').innerHTML='<span class="success">Commission settings saved.</span>';};
  let answerSettings={minimumWords:150}; try{const aw=adminRead(3);if(aw.exists())answerSettings=aw.data();}catch(e){}
  $('minimumAnswerWords').value=Number(answerSettings.minimumWords||150);
  $('saveAnswerWords').onclick=async()=>{const n=Math.floor(Number($('minimumAnswerWords').value));if(!Number.isFinite(n)||n<1||n>10000){$('answerWordsMsg').innerHTML='<span class="error">Enter a minimum between 1 and 10000 words.</span>';return;}await setDoc(doc(db,'smv_settings','answer'),{minimumWords:n,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$('answerWordsMsg').innerHTML='<span class="success">Minimum answer length saved: '+n+' words. It applies to new paid questions.</span>';};
  $('testRazorpayBtn').onclick=async()=>{const b=$('testRazorpayBtn');b.disabled=true;b.textContent='TESTING...';try{const r=await withTimeout(renderApi('/test-razorpay',{method:'GET'}),60000);$('razorpayTestMsg').innerHTML='<span class="success"><b>Razorpay connection OK.</b> '+escapeHtml(r?.message||'Render payment server and Razorpay API are working.')+'</span>';}catch(e){$('razorpayTestMsg').innerHTML='<span class="error"><b>Razorpay test failed:</b> '+escapeHtml(e.message||String(e))+'</span>';}b.disabled=false;b.textContent='TEST RAZORPAY CONNECTION';};

  const box=$('pendingAstros');
  box.innerHTML=pendingDocs.length?pendingDocs.map(d=>{const a=d.data();return `<div class="card" style="margin:10px 0">${a.photoData?`<img src="${a.photoData}" style="width:100px;height:100px;border-radius:50%;object-fit:cover">`:''}<h3>${escapeHtml(a.name||'Astrologer')}</h3><p><b>Email:</b> ${escapeHtml(userMap.get(d.id)?.email||'')}</p><p><b>Mobile:</b> ${escapeHtml(userMap.get(d.id)?.mobile||userMap.get(d.id)?.phone||'')}</p><p><b>Expertise:</b> ${escapeHtml(a.expertise||a.specialization||'')}</p><p><b>Experience:</b> ${escapeHtml(a.experience||0)} years</p><p><b>Bio:</b> ${escapeHtml(a.bio||a.about||'')}</p><div id="payout_${d.id}" class="small">Loading private payout details...</div><div class="action-row"><input id="price_${d.id}" type="number" min="1" step="0.01" placeholder="Private Consultation Chat Price ₹"><button class="btn" data-approve="${d.id}">APPROVE</button><button class="btn gray" data-reject="${d.id}">REJECT</button></div><input id="reject_${d.id}" placeholder="Rejection reason (required if rejecting)"></div>`}).join(''):'<div class="empty">No pending astrologer applications.</div>';
  for(const d of pendingDocs){try{const ps=await getDoc(doc(db,'smv_payouts',d.id));if(ps.exists()){const p=ps.data();$('payout_'+d.id).innerHTML=`<b>PRIVATE BANK/UPI:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'')} · Status: ${escapeHtml(p.status||'')}`;}}catch(e){$('payout_'+d.id).textContent='Payout details unavailable.';}}
  box.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{const id=b.dataset.approve,price=Number($('price_'+id).value);if(!price||price<1){alert('Admin must set the Private Consultation Chat Price before approval.');return;}await updateDoc(doc(db,'smv_astrologers',id),{status:'approved',pricePerQuestion:price,approvedAt:serverTimestamp(),approvedBy:currentUser.uid});await updateDoc(doc(db,'smv_users',id),{status:'active'});await setDoc(doc(db,'smv_notifications',id+'_approval_'+Date.now()),{userId:id,type:'approval',title:'Astrologer application approved',message:'Your profile has been approved by Admin.',createdAt:serverTimestamp(),read:false});loadAdminPanel();});
  box.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const id=b.dataset.reject,reason=$('reject_'+id).value.trim();if(!reason){alert('Enter rejection reason.');return;}await updateDoc(doc(db,'smv_astrologers',id),{status:'rejected',rejectionReason:reason,rejectedAt:serverTimestamp(),rejectedBy:currentUser.uid});await updateDoc(doc(db,'smv_users',id),{status:'rejected'});await setDoc(doc(db,'smv_notifications',id+'_reject_'+Date.now()),{userId:id,type:'rejection',title:'Astrologer application requires changes',message:reason,createdAt:serverTimestamp(),read:false});loadAdminPanel();});

  // STEP 4 — Approved astrologer profile-description administration.
  const profileBox=$('adminAstrologerProfiles');
  if(profileBox){
    const approvedAstros=astros.docs.filter(d=>['approved','active'].includes(String(d.data().status||'').toLowerCase()));
    profileBox.innerHTML=approvedAstros.length?approvedAstros.map(d=>{
      const a=d.data()||{};
      const current=a.profileDescription||a.bio||a.about||'';
      const pending=String(a.profileDescriptionPending||'').trim();
      const allowed=a.profileEditAllowed===true;
      return `<div class="card" style="margin:10px 0">
        <h3>${escapeHtml(a.name||'Astrologer')}</h3>
        <div class="small"><b>Astrologer ID:</b> ${escapeHtml(d.id)} · <b>Profile Edit:</b> ${allowed?'Allowed':'Blocked'}</div>
        <div style="margin:10px 0">
          <label for="adminChatPrice_${d.id}"><b>Private Consultation Chat Price (₹)</b></label>
          <div class="action-row">
            <input id="adminChatPrice_${d.id}" type="number" min="1" step="0.01" value="${escapeHtml(String(Number(a.pricePerQuestion||0)||''))}" placeholder="Chat Price ₹">
            <button class="btn" data-chat-price-save="${d.id}">SAVE CHAT PRICE</button>
          </div>
          <div class="small" id="adminChatPriceMsg_${d.id}"></div>
        </div>
        <p><b>Current Public Description</b></p>
        <textarea id="adminProfile_${d.id}" rows="5" maxlength="2000">${escapeHtml(current)}</textarea>
        <div class="action-row">
          <button class="btn gray" data-profile-permission="${d.id}" data-next="${allowed?'block':'allow'}">${allowed?'BLOCK PROFILE EDIT':'ALLOW PROFILE EDIT'}</button>
          <button class="btn" data-profile-save="${d.id}">SAVE PUBLIC DESCRIPTION</button>
        </div>
        ${pending?`<div class="card" style="margin-top:10px"><p><b>Pending Description — Awaiting Admin Approval</b></p><p>${escapeHtml(pending)}</p><div class="action-row"><button class="btn" data-profile-approve="${d.id}">APPROVE DESCRIPTION</button><button class="btn gray" data-profile-reject="${d.id}">REJECT DESCRIPTION</button></div></div>`:'<div class="small" style="margin-top:8px">No pending profile-description update.</div>'}
        <div class="small" id="adminProfileMsg_${d.id}"></div>
      </div>`;
    }).join(''):'<div class="empty">No approved astrologers available.</div>';

    profileBox.querySelectorAll('[data-chat-price-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.chatPriceSave,input=$('adminChatPrice_'+id),msg=$('adminChatPriceMsg_'+id);
      const price=Number(input?.value);
      if(!Number.isFinite(price)||price<1){if(msg)msg.innerHTML='<span class="error">Enter a valid Chat Price of ₹1 or more.</span>';return;}
      b.disabled=true;b.textContent='SAVING...';
      try{
        await updateDoc(doc(db,'smv_astrologers',id),{
          pricePerQuestion:Math.round(price*100)/100,
          chatPriceUpdatedAt:serverTimestamp(),
          chatPriceUpdatedBy:currentUser.uid
        });
        if(msg)msg.innerHTML='<span class="success">Private Consultation Chat Price updated.</span>';
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}
      finally{b.disabled=false;b.textContent='SAVE CHAT PRICE';}
    });

    profileBox.querySelectorAll('[data-profile-permission]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profilePermission,allow=b.dataset.next==='allow';
      b.disabled=true;
      try{
        await updateDoc(doc(db,'smv_astrologers',id),{profileEditAllowed:allow,profileEditPermissionUpdatedAt:serverTimestamp(),profileEditPermissionUpdatedBy:currentUser.uid});
        await loadAdminPanel();
      }catch(e){alert(e.message||String(e));b.disabled=false;}
    });

    profileBox.querySelectorAll('[data-profile-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profileSave,input=$('adminProfile_'+id),msg=$('adminProfileMsg_'+id);
      const description=String(input?.value||'').trim();
      if(description.length<20){if(msg)msg.innerHTML='<span class="error">Enter at least 20 characters.</span>';return;}
      if(description.length>2000){if(msg)msg.innerHTML='<span class="error">Description must be 2000 characters or less.</span>';return;}
      b.disabled=true;b.textContent='SAVING...';
      try{
        await updateDoc(doc(db,'smv_astrologers',id),{profileDescription:description,profileDescriptionStatus:'approved',profileDescriptionApprovedAt:serverTimestamp(),profileDescriptionApprovedBy:currentUser.uid});
        if(msg)msg.innerHTML='<span class="success">Public description updated by Admin.</span>';
        loadAstroCards().catch(()=>{});
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}
      finally{b.disabled=false;b.textContent='SAVE PUBLIC DESCRIPTION';}
    });

    profileBox.querySelectorAll('[data-profile-approve]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profileApprove;
      b.disabled=true;
      try{
        const snap=await getDoc(doc(db,'smv_astrologers',id)),a=snap.exists()?(snap.data()||{}):{};
        const pending=String(a.profileDescriptionPending||'').trim();
        if(!pending)throw new Error('No pending description to approve.');
        await updateDoc(doc(db,'smv_astrologers',id),{
          profileDescription:pending,
          profileDescriptionPending:'',
          profileDescriptionStatus:'approved',
          profileDescriptionApprovedAt:serverTimestamp(),
          profileDescriptionApprovedBy:currentUser.uid
        });
        await setDoc(doc(db,'smv_notifications',id+'_profile_approved_'+Date.now()),{userId:id,type:'profile_description',title:'Profile description approved',message:'Your updated profile description has been approved by Admin.',createdAt:serverTimestamp(),read:false});
        await loadAdminPanel();
        loadAstroCards().catch(()=>{});
      }catch(e){alert(e.message||String(e));b.disabled=false;}
    });

    profileBox.querySelectorAll('[data-profile-reject]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profileReject;
      const ok=await smvConfirm('Reject Profile Description','Reject this pending profile-description update?','REJECT','CANCEL',true);
      if(!ok)return;
      b.disabled=true;
      try{
        await updateDoc(doc(db,'smv_astrologers',id),{profileDescriptionPending:'',profileDescriptionStatus:'rejected',profileDescriptionRejectedAt:serverTimestamp(),profileDescriptionRejectedBy:currentUser.uid});
        await setDoc(doc(db,'smv_notifications',id+'_profile_rejected_'+Date.now()),{userId:id,type:'profile_description',title:'Profile description not approved',message:'Your submitted profile description was not approved by Admin. Your existing public description remains unchanged.',createdAt:serverTimestamp(),read:false});
        await loadAdminPanel();
      }catch(e){alert(e.message||String(e));b.disabled=false;}
    });
  }

  // Approved Astrologer payment-method changes awaiting Admin review.
  const payoutBox=$('adminPayoutChanges');
  try{
    const payoutSnap=await withTimeout(getDocs(query(collection(db,'smv_payouts'),where('status','==','pending_admin_review'))),12000);
    const pendingPayouts=payoutSnap.docs.filter(d=>{const a=astros.docs.find(x=>x.id===d.id)?.data()||{};return String(a.status||'').toLowerCase()==='approved';});
    payoutBox.innerHTML=pendingPayouts.length?pendingPayouts.map(d=>{const p=d.data()||{};const a=astros.docs.find(x=>x.id===d.id)?.data()||{};return `<div class="card" style="margin:10px 0"><h3>${escapeHtml(a.name||d.id)}</h3><div class="small"><b>Astrologer ID:</b> ${escapeHtml(d.id)} · <b>Submitted:</b> ${escapeHtml(smvDateTime(p.requestedAt||p.updatedAt))}</div><div class="small" style="margin-top:8px"><b>PRIVATE PAYMENT DETAILS:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'—')}</div><div class="action-row" style="margin-top:10px"><button class="btn" data-payout-approve="${escapeHtml(d.id)}">APPROVE</button><button class="btn gray" data-payout-reject="${escapeHtml(d.id)}">REJECT</button></div><input id="payoutReject_${escapeHtml(d.id)}" placeholder="Rejection reason (required if rejecting)"></div>`;}).join(''):'<div class="empty">No payment method changes waiting for Admin approval.</div>';
    payoutBox.querySelectorAll('[data-payout-approve]').forEach(b=>b.onclick=async()=>{const id=b.dataset.payoutApprove;b.disabled=true;try{const r=await withTimeout(renderApi('/admin/payout-change-status',{method:'POST',body:JSON.stringify({astrologerId:id,status:'approved'})}),15000);if(!r?.success)throw new Error(r?.error||'Unable to approve payment method.');alert('Payment method approved.');await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
    payoutBox.querySelectorAll('[data-payout-reject]').forEach(b=>b.onclick=async()=>{const id=b.dataset.payoutReject,reason=$('payoutReject_'+id)?.value.trim()||'';if(!reason){alert('Enter rejection reason.');return;}b.disabled=true;try{const r=await withTimeout(renderApi('/admin/payout-change-status',{method:'POST',body:JSON.stringify({astrologerId:id,status:'rejected',reason})}),15000);if(!r?.success)throw new Error(r?.error||'Unable to reject payment method.');alert('Payment method rejected.');await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
  }catch(e){payoutBox.innerHTML='<div class="empty error">Payment method approval list could not be loaded right now.</div>';console.warn('Admin payout changes load skipped:',e);}

  // Public Question Admin Approval: Admin selects exactly one approved astrologer and commission rate.
  const withdrawalSnap=await getDocs(collection(db,'smv_withdrawals'));
  const withdrawalDocs=withdrawalSnap.docs.slice().sort((a,b)=>Number(b.data().createdAt?.seconds||0)-Number(a.data().createdAt?.seconds||0)).slice(0,50);
  $('adminWithdrawals').innerHTML=withdrawalDocs.length?withdrawalDocs.map(d=>{const w=d.data();return `<div class="card" style="margin:10px 0"><b>₹${Number(w.amount||0).toFixed(2)}</b> · <b>${escapeHtml(w.status||'pending').toUpperCase()}</b><div class="small">Astrologer: ${escapeHtml(w.astrologerName||w.astrologerId||'')} · Astrologer ID: ${escapeHtml(w.astrologerId||'')}<br><b>Withdrawal ID:</b> ${escapeHtml(w.withdrawalId||'—')}${String(w.status||'').toLowerCase()==='paid' && /^SMV-PMT-/.test(String(w.adminPaymentId||'')) ? `<br><b>Admin Payment ID:</b> ${escapeHtml(w.adminPaymentId)}` : ''}<br>Requested: ${escapeHtml(smvDateTime(w.createdAt||w.requestedAt))}${String(w.status||'').toLowerCase()==='paid' && w.paidAt ? `<br><b>Paid Date & Time:</b> ${escapeHtml(smvDateTime(w.paidAt))}` : ''}</div><div id="withdrawBank_${d.id}" class="small" style="margin-top:8px"><b>PRIVATE PAYMENT DETAILS:</b> Loading…</div><div class="action-row">${w.status==='pending'?`<button class="btn" data-wstatus="${d.id}" data-status="processing">MARK PROCESSING</button><button class="btn gray" data-wstatus="${d.id}" data-status="rejected">REJECT</button>`:''}${w.status==='processing'?`<button class="btn" data-wstatus="${d.id}" data-status="paid">MARK PAID</button>`:''}${String(w.status||'').toLowerCase()==='paid' && !/^SMV-PMT-/.test(String(w.adminPaymentId||''))?`<button class="btn" data-wstatus="${d.id}" data-status="paid">CREATE ADMIN PAYMENT ID</button>`:''}</div></div>`}).join(''):'<div class="empty">No withdrawal requests.</div>';
  for(const d of withdrawalDocs){
    try{
      const p=await withTimeout(renderApi('/admin/withdrawal-payout/'+encodeURIComponent(d.id),{method:'GET'}),15000);
      const box=$('withdrawBank_'+d.id);
      if(box) box.innerHTML=p?.available?`<b>PRIVATE PAYMENT DETAILS:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'—')}`:'<b>PRIVATE PAYMENT DETAILS:</b> Not available.';
    }catch(e){ const box=$('withdrawBank_'+d.id); if(box) box.textContent='Private payment details unavailable.'; console.warn('Withdrawal payout details load failed:',d.id,e); }
  }
 $('adminWithdrawals')
  .querySelectorAll('[data-wstatus]')
  .forEach(b => {

    b.onclick = async () => {

      const withdrawalId =
        b.dataset.wstatus;

      const newStatus =
        b.dataset.status;

      b.disabled = true;
      b.textContent = 'UPDATING...';

      try {

        const withdrawalRef =
          doc(
            db,
            'smv_withdrawals',
            withdrawalId
          );

        const snap =
          await withTimeout(
            getDoc(withdrawalRef),
            15000
          );

        if(!snap.exists()){
          throw new Error(
            'Withdrawal request not found.'
          );
        }

        const w = snap.data();

        let adminPaymentId = String(w.adminPaymentId || w.paymentId || '');

        // IMPORTANT: SMV-PMT is created only when Admin actually marks the
        // withdrawal as PAID. Withdrawal request itself remains SMV-WDT.
        if(newStatus === 'paid'){
          const paidResult = await withTimeout(
            renderApi('/admin/withdrawal-mark-paid', {
              method:'POST',
              body:JSON.stringify({withdrawalDocId: withdrawalId})
            }),
            20000
          );
          adminPaymentId = String(paidResult.paymentId || '');
          if(!adminPaymentId) throw new Error('Admin Payment ID was not returned.');
        } else {
          const updateData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
          };

          if(newStatus === 'processing'){
            updateData.processingAt = serverTimestamp();
          }

          if(newStatus === 'rejected'){
            updateData.rejectedAt = serverTimestamp();
          }

          await withTimeout(
            updateDoc(withdrawalRef, updateData),
            15000
          );
        }

        if(w.astrologerId){

          let title = '';
          let message = '';

          if(newStatus === 'processing'){
            title =
              'Withdrawal is processing';
            message =
              `Your withdrawal request of ₹${Number(w.amount || 0).toFixed(2)} is being processed by Admin. Withdrawal ID: ${w.withdrawalId || withdrawalId}.`;
          }

          if(newStatus === 'paid'){
            title =
              'Withdrawal paid';
            message =
              `Your withdrawal of ₹${Number(w.amount || 0).toFixed(2)} has been marked as paid. Withdrawal ID: ${w.withdrawalId || withdrawalId}. Admin Payment ID: ${adminPaymentId}.`;
          }

          if(newStatus === 'rejected'){
            title =
              'Withdrawal rejected';
            message =
              `Your withdrawal request of ₹${Number(w.amount || 0).toFixed(2)} was rejected by Admin. Withdrawal ID: ${w.withdrawalId || withdrawalId}.`;
          }

          if(message){

            await setDoc(
              doc(
                db,
                'smv_notifications',
                w.astrologerId +
                '_withdrawal_' +
                Date.now()
              ),
              {
                userId:
                  w.astrologerId,

                type:
                  'withdrawal_' + newStatus,

                title:
                  title,

                message:
                  message,

                withdrawalId:
                  withdrawalId,

                adminPaymentId:
                  newStatus === 'paid' ? adminPaymentId : '',

                amount:
                  Number(w.amount || 0),

                createdAt:
                  serverTimestamp(),

                read:
                  false
              }
            );

          }

        }

        alert(
          newStatus === 'paid' && adminPaymentId
            ? `Withdrawal marked as paid. Admin Payment ID: ${adminPaymentId}`
            : `Withdrawal status updated to ${newStatus}.`
        );

        await loadAdminPanel();

      } catch(e) {

        console.error(
          'Withdrawal status error:',
          e
        );

        alert(
          e.message || String(e)
        );

        b.disabled = false;

        b.textContent =
          newStatus === 'processing'
            ? 'MARK PROCESSING'
            : newStatus === 'paid'
              ? 'MARK PAID'
              : 'REJECT';

      }

    };

  });
  /* ADMIN EARNINGS HISTORY — display-only ledger from credited answered questions. */
  try {
    const adminEarnedQuestions = questions.docs.filter(d=>{const q=d.data()||{};return q.status==='answered' && q.commissionStatus==='credited';}).slice().sort((a,b)=>{const at=Number(b.data()?.commissionCreditedAt?.seconds||b.data()?.answerApprovedAt?.seconds||0);const bt=Number(a.data()?.commissionCreditedAt?.seconds||a.data()?.answerApprovedAt?.seconds||0);return at-bt;});
    const creditedPayments = payments.docs.filter(d=>{const p=d.data()||{};return String(p.type||'').toLowerCase()==='astrologer_earning' && String(p.status||'').toLowerCase()==='credited';});
    let adminTotal=0;
    const questionLedgerIds=new Set();
    const questionRows=adminEarnedQuestions.map(d=>{const q=d.data()||{};questionLedgerIds.add(String(d.id));const paid=Number(q.amount||q.customerAmount||0);const astro=Number(q.astrologerCommissionAmount||q.commissionAmount||0);const adminEarn=Math.max(0,Math.round((paid-astro)*100)/100);adminTotal+=adminEarn;const dt=q.commissionCreditedAt||q.answerApprovedAt||q.adminAnswerApprovedAt||q.updatedAt||q.createdAt||null;const dateText=smvDateTime(dt);const customer=q.customerName||q.birthName||q.birthDetails?.name||'Customer';return `<div style="padding:12px 0;border-bottom:1px solid #eee"><div><b>₹${adminEarn.toFixed(2)}</b> <span class="success">Admin Earned</span></div><div class="small"><b>Customer:</b> ${escapeHtml(customer)} · <b>Question ID:</b> ${escapeHtml(d.id)}</div><div class="small">${escapeHtml(q.question||'Consultation')}</div><div class="small">Credited: ${escapeHtml(dateText)}</div></div>`;}).join('');
    const paymentRows=creditedPayments.filter(d=>{const p=d.data()||{};return !questionLedgerIds.has(String(p.questionId||''));}).map(d=>{const p=d.data()||{};const gross=Number(p.grossAmount||0);const astro=Number(p.commissionAmount||p.earningAmount||0);const adminEarn=Math.max(0,Math.round((gross-astro)*100)/100);adminTotal+=adminEarn;const dt=p.createdAt||p.updatedAt||p.creditedAt||null;const dateText=smvDateTime(dt);return `<div style="padding:12px 0;border-bottom:1px solid #eee"><div><b>₹${adminEarn.toFixed(2)}</b> <span class="success">Admin Earned</span></div><div class="small"><b>Payment ID:</b> ${escapeHtml(p.paymentId||d.id)} · ${p.consultationId?`<b>Private Consultation ID:</b> ${escapeHtml(p.consultationId)}`:`<b>Question ID:</b> ${escapeHtml(p.questionId||'—')}`}</div><div class="small">${p.consultationId?'Private Consultation':'Astrologer'} earning credited</div><div class="small">Credited: ${escapeHtml(dateText)}</div></div>`;}).join('');
    const adminRows=questionRows+paymentRows;
    
$('adminEarningsHistory').innerHTML=`<div class="stats-grid" style="margin-bottom:12px"><div class="stat">Total Admin Earnings <b>₹${adminTotal.toFixed(2)}</b></div><div class="stat">Completed Consultations <b>${adminEarnedQuestions.length}</b></div></div>${adminRows||'<div class="empty">No credited admin earnings yet.</div>'}`;
  } catch(e) { console.warn('Admin earnings history load skipped:',e); if($('adminEarningsHistory'))$('adminEarningsHistory').innerHTML='<div class="empty">Admin earnings history could not be loaded right now.</div>'; }

  const reviewsSnap = await getDocs(
  collection(db, 'smv_reviews')
);

$('adminReviews').innerHTML =
  reviewsSnap.empty
    ? '<div class="empty">No reviews yet.</div>'
    : reviewsSnap.docs
        .slice(-50)
        .reverse()
        .map(d => {

          const r = d.data();

          return `
            <div style="padding:10px;border-bottom:1px solid #eee">

              <div>
                ⭐ <b>${Number(r.rating || 0)}/5</b>
              </div>

              <div style="margin-top:5px">
                ${escapeHtml(r.review || '')}
              </div>

              <div class="small" style="margin-top:5px">
                Verified customer ·
                Astrologer:
                ${escapeHtml(r.astrologerId || '')}
                · Status:
                <b>
                  ${r.approved === true
                    ? 'Approved'
                    : 'Pending'}
                </b>
              </div>

              <div class="action-row">

                <button
                  class="btn"
                  data-review-edit="${d.id}">
                  EDIT REVIEW
                </button>

                ${
                  r.approved === true
                    ? ''
                    : `
                      <button
                        class="btn"
                        data-review-approve="${d.id}">
                        APPROVE REVIEW
                      </button>

                      <button
                        class="btn gray"
                        data-review-reject="${d.id}">
                        REJECT REVIEW
                      </button>
                    `
                }

              </div>

            </div>
          `;

        })
        .join('');


/* EDIT REVIEW + RATING */

$('adminReviews')
  .querySelectorAll('[data-review-edit]')
  .forEach(b => {

    b.onclick = async () => {

      const reviewId =
        b.dataset.reviewEdit;

      try {

        const reviewRef =
          doc(
            db,
            'smv_reviews',
            reviewId
          );

        const snap =
          await withTimeout(
            getDoc(reviewRef),
            15000
          );

        if (!snap.exists()) {
          throw new Error(
            'Review not found.'
          );
        }

        const r =
          snap.data();

        openModal(`
          <h2>Edit Customer Review</h2>

          <label>Rating</label>

          <select id="editReviewRating">
            <option value="5"
              ${Number(r.rating) === 5 ? 'selected' : ''}>
              ★★★★★ — 5
            </option>

            <option value="4"
              ${Number(r.rating) === 4 ? 'selected' : ''}>
              ★★★★☆ — 4
            </option>

            <option value="3"
              ${Number(r.rating) === 3 ? 'selected' : ''}>
              ★★★☆☆ — 3
            </option>

            <option value="2"
              ${Number(r.rating) === 2 ? 'selected' : ''}>
              ★★☆☆☆ — 2
            </option>

            <option value="1"
              ${Number(r.rating) === 1 ? 'selected' : ''}>
              ★☆☆☆☆ — 1
            </option>
          </select>

          <label style="display:block;margin-top:10px">
            Review
          </label>

          <textarea
            id="editReviewText"
            placeholder="Customer review"
            style="width:100%;min-height:120px"
          >${escapeHtml(r.review || '')}</textarea>

          <button
            class="btn"
            id="saveEditedReview"
            style="margin-top:10px">
            SAVE CHANGES
          </button>

          <div
            id="editReviewMsg"
            class="small"
            style="margin-top:8px">
          </div>
        `);

        $('saveEditedReview').onclick =
          async () => {

            const saveBtn =
              $('saveEditedReview');

            const msg =
              $('editReviewMsg');

            const rating =
              Number(
                $('editReviewRating').value
              );

            const review =
              $('editReviewText')
                .value
                .trim();

            if (
              rating < 1 ||
              rating > 5
            ) {
              msg.innerHTML =
                '<span class="error">Please select a valid rating.</span>';
              return;
            }

            if (!review) {
              msg.innerHTML =
                '<span class="error">Review cannot be empty.</span>';
              return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent =
              'SAVING...';

            try {

              await withTimeout(
                updateDoc(
                  reviewRef,
                  {
                    rating:
                      rating,

                    review:
                      review,

                    updatedAt:
                      serverTimestamp(),

                    updatedBy:
                      currentUser.uid
                  }
                ),
                15000
              );

              msg.innerHTML =
                '<span class="success">Review updated successfully.</span>';

              setTimeout(() => {
                closeModal();
                loadAdminPanel();
              }, 500);

            } catch (e) {

              msg.innerHTML =
                '<span class="error">' +
                escapeHtml(
                  e.message || String(e)
                ) +
                '</span>';

              saveBtn.disabled = false;
              saveBtn.textContent =
                'SAVE CHANGES';
            }

          };

      } catch (e) {

        alert(
          e.message || String(e)
        );

      }

    };

  });


/* APPROVE REVIEW */

$('adminReviews')
  .querySelectorAll('[data-review-approve]')
  .forEach(b => {

    b.onclick = async () => {

      b.disabled = true;

      try {

        await withTimeout(
          updateDoc(
            doc(
              db,
              'smv_reviews',
              b.dataset.reviewApprove
            ),
            {
              approved:
                true,

              status:
                'approved',

              approvedAt:
                serverTimestamp(),

              approvedBy:
                currentUser.uid
            }
          ),
          15000
        );

        await loadAdminPanel();

      } catch (e) {

        alert(
          e.message || String(e)
        );

        b.disabled = false;
      }

    };

  });


/* REJECT REVIEW */

$('adminReviews')
  .querySelectorAll('[data-review-reject]')
  .forEach(b => {

    b.onclick = async () => {

      const choice = await smvConfirm(
        'Reject Customer Review',
        'This review will be permanently deleted.\n\nChoose Reject & Delete to continue.',
        'REJECT & DELETE',
        'CANCEL',
        true
      );

      if (!choice) {
        return;
      }

      b.disabled = true;
      b.textContent = 'REJECTING...';

      try {

        await withTimeout(
          deleteDoc(
            doc(
              db,
              'smv_reviews',
              b.dataset.reviewReject
            )
          ),
          15000
        );

        smvNotice('Review Deleted','The customer review was rejected and deleted successfully.','✓');

        await loadAdminPanel();

      } catch (e) {

        smvNotice('Unable to Reject Review',e.message || String(e),'!');

        b.disabled = false;
        b.textContent = 'REJECT REVIEW';
      }

    };

  });
  $('adminQuestions').innerHTML=questions.empty?'<div class="empty">No questions yet.</div>':questions.docs.slice(-50).reverse().map(d=>{const q=d.data();return `<div style="padding:10px;border-bottom:1px solid #eee"><b>${escapeHtml(q.question||'Question')}</b><div class="small">Status: ${escapeHtml(q.status||'')} · Customer: ${escapeHtml(q.customerId||'')} · Price paid: ₹${Number(q.amount||0).toFixed(2)} · Astrologer share: ₹${Number(q.astrologerCommissionAmount||0).toFixed(2)} · Admin share: ₹${Number(q.adminCommissionAmount||0).toFixed(2)} · ${escapeHtml(q.astrologerName||'Unclaimed')}</div><div class="small"><b>Date & Time:</b> ${escapeHtml(smvDateTime(q.updatedAt||q.answerApprovedAt||q.adminQuestionApprovedAt||q.createdAt))}</div></div>`}).join('');
  smvLiveStatus('Updated just now');
  const refresh=$('smvRefreshAdmin');if(refresh)refresh.textContent='Refresh';
 }catch(e){
 const message='<div class="empty error">'+escapeHtml(e.message||String(e))+'</div>';
 if($('adminDataLoadMsg'))$('adminDataLoadMsg').innerHTML=message;
 document.querySelectorAll('#admin .empty').forEach(el=>{if(/^Loading\b/i.test(el.textContent.trim()))el.innerHTML=message;});
 for(const id of ['adminPendingQuestions','adminAnswers','adminRefunds']){const el=$(id);if(el&&!el.querySelector('[data-question]'))el.innerHTML=message;}
 }
}
if(auth){ onAuthStateChanged(auth,async user=>{
   const previousUid=lastAuthUid;
   if(previousUid!==user?.uid)smvStopLive();
   if(previousUid!== (user?.uid||null)){ ++dashboardLoadSeq; dashboardLoadPromise=null; dashboardLoadUid=null; }
   currentUser=user; window.__smvFirebaseCurrentUser=user||null; window.__smvCurrentUserPresent=!!user;
   if(authReadyResolve){authReadyResolve();authReadyResolve=null;}
   if(previousUid && (!user || previousUid!==user.uid)){
     hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
   }
   $('authBtn').textContent=user?'Logout':'Login';
   if(user){
     hide('smv-content-hub'); window.__smvContentVisible=false;
     lastAuthUid=user.uid; window.__SMV_LOGGED_OUT=false; touchSession(); armIdleTimer(); window.dispatchEvent(new Event('smv:auth-user'));
     if(user.uid!==ADMIN_UID && !user.emailVerified){ await signOut(auth); currentUser=null; clearIdleTimer(); lastAuthUid=null; hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink"); $("authBtn").textContent="Login"; return; }
     // ASK NOW login has a protected destination. Let submitAuth() continue
     // to Customer Dashboard + Question Form instead of this normal dashboard-only path.
     // Never let a late auth-state callback replace an already-open Question Form.
     // This protects the second and later Home -> ASK NOW cycles.
     if(pendingAfterLogin==='question' || window.__SMV_ASK_NOW_INTENT===true || askNowTransitionLock || smvInternalView==='ask-flow'){
       // ASK NOW owns this auth transition. NEVER fall through to the normal
       // login -> Dashboard renderer while the protected Question Form route
       // is active or being completed.
       armIdleTimer();
       return;
     }
     // Re-check immediately before any automatic dashboard navigation. This is
     // intentionally duplicated after async auth/profile work to close the race
     // window where ASK NOW can start while this callback is already suspended.
     if(pendingAfterLogin==='question' || window.__SMV_ASK_NOW_INTENT===true || askNowTransitionLock || smvInternalView==='ask-flow'){
       armIdleTimer();
       return;
     }
     if(window.__SMV_PUBLIC_ROUTE){smvShowRoleNav();armIdleTimer();return;}
     const listenerEpoch=smvNavigationEpoch;
     const adminUser=await isCurrentAdmin();
     const headerProfile=adminUser?{role:'admin'}:await getUserProfile(user.uid).catch(()=>({role:'customer'}));
     const headerRole=adminUser?'admin':String(headerProfile?.role||'customer').toLowerCase();
     setHeaderRoleLabel(headerRole);
     window.__smvCurrentRole=headerRole;
     // CRITICAL LATE-RACE GUARD: ASK NOW may have started while the auth
     // listener was awaiting Firebase/profile data. Never let this older
     // listener resume and overwrite the Question Form with Dashboard.
     if(listenerEpoch!==smvNavigationEpoch || pendingAfterLogin==='question' || askNowTransitionLock || smvInternalView==='ask-flow'){
       armIdleTimer();
       return;
     }
     if(adminUser){
       hidePrimarySections('admin');
       show('admin');
       hide('dashLink'); show('adminLink');
       smvShowRoleNav();
       smvEnterInternalView('admin',false);
       try{history.replaceState({smvView:"admin"},"","#admin");}catch(_e){}
       go('admin');
       loadAdminPanel().catch(err=>console.warn('Admin restore failed:',err));
     }
     else {
       show('dashLink'); hide('adminLink');
       // Restore the dashboard immediately after auth/profile resolution.
       // Do NOT await the full dashboard data renderer before entering the view:
       // the first Firebase session can be slower than subsequent sessions, and
       // blocking navigation here makes Dashboard appear stuck until Home/Login
       // is opened again. Render the shell first, then hydrate its data.
       hidePrimarySections('dashboard');
       show('dashboard');
       show('dashboardContent');
       $('dashboardTitle').textContent=headerRole==='astrologer'?'ASTROLOGER DASHBOARD':'CUSTOMER DASHBOARD';
       $('dashboardContent').innerHTML='<div class="card"><div class="small">Loading your dashboard...</div></div>';
       smvShowRoleNav(); smvInternalView="dashboard";
       try{history.replaceState({smvView:"dashboard"},"","#dashboard");}catch(_e){}
       go('dashboard');
       loadDashboard(headerRole==='astrologer'?'astrologer':'customer').catch(err=>console.warn('Initial dashboard load skipped:',err));
     }
   }else{
     window.__smvCurrentUserPresent=false;
     clearIdleTimer(); lastAuthUid=null;
     hide('dashLink');hide('adminLink');hide('dashboard');hide('admin');
     setHeaderRoleLabel('');
     show('smv-content-hub'); window.__smvContentVisible=false;
     showHomeSurface();
     smvInternalView="home";
   }
 }); }
if(firebaseInitError){
  console.error("SMV ASTRO Firebase is unavailable. Basic navigation is still available.",firebaseInitError);
}

window.__SMV_APP_READY=true;

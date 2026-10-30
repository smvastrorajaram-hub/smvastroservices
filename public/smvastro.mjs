import { ensureRazorpayCheckout } from './razorpay-checkout-loader.mjs?v=20261026-payment-reliability-v1';
import './chat-moderation.js?v=20261030-chat-moderation-v1';

// SMV ASTRO merged frontend application module
// Consolidated: dashboard-live.mjs + admin-workflows.mjs + app.mjs


// Unified dashboard typography stylesheet. Loaded after the legacy stylesheet so
// Customer, Astrologer and Admin dashboards share one predictable hierarchy.
(function loadDashboardTypography(){
  if(document.querySelector('link[data-smv-dashboard-typography]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='dashboard-typography.css?v=20261024-blog-cover-picker-center-v1';
  link.dataset.smvDashboardTypography='true';
  document.head.appendChild(link);
})();

// Coalesce updates, serialize requests and retain edits until a safe refresh.
async function smvMapLimit(items,limit,worker){
 const list=Array.from(items||[]), cap=Math.max(1,Math.floor(Number(limit)||1));
 let cursor=0;
 const runners=Array.from({length:Math.min(cap,list.length)},async()=>{
  while(cursor<list.length){const index=cursor++;await worker(list[index],index);}
 });
 await Promise.allSettled(runners);
}

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
   retry=0;
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(!stopped){
    const {done,value}=await reader.read();if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    let end;while((end=buffer.indexOf('\n\n'))!==-1){
     const event=buffer.slice(0,end);buffer=buffer.slice(end+2);
     if(/^event: change$/m.test(event))onChange();
    }
   }
  }catch(e){if(!stopped&&e.name!=='AbortError'){console.warn('Dashboard live connection retrying:',e.message||e);}}
  finally{if(!stopped){retry++;timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(retry,4)));}}
 }
 connect();return ()=>{stopped=true;clearTimeout(timer);controller?.abort();};
}


import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, deleteUser, updateProfile, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

window.__SMV_BUILD="V120-UI";
const IS_SMV_PHASE1_STAGING = ["smv-astro-phase1-browser-staging.onrender.com", "smv-astro-phase1-browser-isolated.onrender.com"].includes(location.hostname);
const firebaseConfig = IS_SMV_PHASE1_STAGING
  ? {apiKey:"AIzaSyD9LzJ-7OKZMaVVf5kXa9aABBECS6kE8mA",authDomain:"smv-astro-staging.firebaseapp.com",projectId:"smv-astro-staging",storageBucket:"smv-astro-staging.firebasestorage.app",messagingSenderId:"73946216796",appId:"1:73946216796:web:09500761bec02699a4e999"}
  : {apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:(location.hostname==='smvastroservices.pages.dev'||location.hostname.endsWith('.smvastroservices.pages.dev')?'smv-astro.firebaseapp.com':'auth.smvastroservices.in'),projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
let app=null, auth=null, db=null, functions=null, httpsCallableFn=null, firebaseInitError=null;
try{
  app=initializeApp(firebaseConfig);
  auth=getAuth(app);await setPersistence(auth,browserLocalPersistence);
  db=getFirestore(app);
}catch(initError){
  firebaseInitError=initError;
  console.error("SMV ASTRO Firebase initialization failed",initError);
}
const RAZORPAY_BACKEND_URL = IS_SMV_PHASE1_STAGING ? "https://smv-astro-phase1-staging.onrender.com" : "https://smvastroservices.onrender.com";
// Single backend URL used by all protected API calls, including astrologer answer submission.
// Keep this in the main Firebase module so it is available to the answer-submit handler.
const BACKEND=RAZORPAY_BACKEND_URL; window.SMV_BACKEND_URL=RAZORPAY_BACKEND_URL;

let smvHomeWalletOffersFetchedAt=0, smvHomeWalletOffersRequest=null;
function smvHomeOfferMoney(minimumPaise){
 const paise=Math.max(100,Number.isSafeInteger(Number(minimumPaise))?Number(minimumPaise):0);
 return '₹'+(paise/100).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
}
function smvHomeOfferWhen(value){
 if(!value)return '';
 let raw=String(value);
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw))raw+='+05:30';
 const millis=Date.parse(raw);
 return Number.isFinite(millis)?new Date(millis).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
}
async function smvLoadHomeWalletRechargeOffers(force=false){
 const banner=document.getElementById('smvWalletOffersBanner');
 const list=document.getElementById('smvWalletOfferBannerItems');
 if(!banner||!list)return;
 if(!force&&Date.now()-smvHomeWalletOffersFetchedAt<30000)return;
 if(smvHomeWalletOffersRequest)return smvHomeWalletOffersRequest;
 smvHomeWalletOffersRequest=(async()=>{
  try{
   const response=await fetch(BACKEND+'/wallet/recharge-offers',{headers:{Accept:'application/json'},cache:'no-store'});
   if(!response.ok)throw new Error('Offer request failed ('+response.status+').');
   const result=await response.json();
   if(result?.success!==true||!Array.isArray(result.offers))throw new Error(result?.error||'Active Wallet offers are unavailable.');
   const themeLabels={auto:'Festival Offer',generic:'Wallet Offer',pongal:'Pongal Offer',diwali:'Diwali Offer',navaratri:'Navaratri Offer',dasara:'Dasara Offer',ayudha_pooja:'Ayudha Pooja Offer',shivaratri:'Shivaratri Offer',tamil_new_year:'Tamil New Year Offer',vinayagar_chaturthi:'Vinayagar Chaturthi Offer',karthigai_deepam:'Karthigai Deepam Offer',thaipusam:'Thaipusam Offer',new_year:'New Year Offer',onam:'Onam Offer',christmas:'Christmas Offer',eid:'Eid Offer'};
   const allowedThemes=new Set(Object.keys(themeLabels));
   const offers=result.offers.filter(o=>o&&Number.isSafeInteger(Number(o.bonusMinutes))&&Number(o.bonusMinutes)>0&&Number(o.bonusMinutes)<=1440);
   list.innerHTML=offers.map(offer=>{
    const theme=allowedThemes.has(String(offer.bannerTheme||'auto'))?String(offer.bannerTheme||'auto'):'auto';
    const name=String(offer.name||'Wallet Recharge Bonus');
    const minutes=Number(offer.bonusMinutes);
    const limit=Number(offer.perCustomerLimit||0);
    const minimum=smvHomeOfferMoney(offer.minimumRechargeAmountPaise);
    const start=smvHomeOfferWhen(offer.startAt),end=smvHomeOfferWhen(offer.endAt);
    const validity=start||end?'<p class="smv-wallet-offer-validity">'+(start?'Starts: '+escapeHtml(start):'Available now')+(end?' · Ends: '+escapeHtml(end):'')+'</p>':'';
    return '<article class="smv-wallet-offer-card" data-theme="'+theme+'">'+
     '<span class="smv-wallet-offer-theme">'+escapeHtml(themeLabels[theme])+'</span>'+
     '<h3>'+escapeHtml(name)+'</h3>'+
     '<p class="smv-wallet-offer-minimum">Recharge <strong>'+escapeHtml(minimum)+'</strong> or more</p>'+
     '<p class="smv-wallet-offer-bonus"><strong>'+minutes+'</strong> FREE Live '+(minutes===1?'Minute':'Minutes')+'</p>'+
     '<p class="smv-wallet-offer-applies">Credited automatically after successful recharge verification.</p>'+
     '<p class="smv-wallet-offer-limit">'+(limit===0?'Unlimited uses per Customer':String(limit)+' use(s) per Customer')+' where eligible</p>'+
     validity+
     '</article>';
   }).join('');
   banner.hidden=offers.length===0;
   smvHomeWalletOffersFetchedAt=Date.now();
  }catch(error){
   banner.hidden=true;
   console.warn('Home Wallet Offers are not available:',error?.message||error);
  }finally{
   smvHomeWalletOffersRequest=null;
  }
 })();
 return smvHomeWalletOffersRequest;
}


if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>smvLoadHomeWalletRechargeOffers().catch(()=>{}),{once:true});
else smvLoadHomeWalletRechargeOffers().catch(()=>{});


function smvAssertLiveCheckout(key){
 const value=String(key||'').trim();
 if(!/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(value))throw new Error('Payment blocked: this backend returned an invalid Razorpay key. Configure a matching Test or Live Razorpay key in the backend. Backend: '+RAZORPAY_BACKEND_URL);
}
// Shared authenticated transport for Admin, Customer and Astrologer actions.
// Firebase reuses a valid ID token; payment/refund mutations are never replayed here.
async function renderApi(path, options={}, authUserOverride=null){
  const user=authUserOverride||auth?.currentUser;
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
const ADMIN_UID = IS_SMV_PHASE1_STAGING ? "" : "TwjeEIFS3Zcf1SxboLZoujm91Ky2";
let currentUser=null, selectedAstro=null, pendingAfterLogin=null;
let smvRegistrationInProgress=false; // V200: prevent auth listener from signing out a just-created unverified registration before secure profile setup finishes.
let smvNavigationEpoch=0;
// Dashboard hydration state is UI/navigation state only.
let dashboardReadyUid=null;
let dashboardReadyAt=0;
let dashboardReadyRole=null;
const $=id=>document.getElementById(id);
const syncAccountSurface=id=>{if(id==='dashboard'||id==='admin')window.__smvSyncWorkspace?.();};
const show=id=>{$(id)?.classList.remove("hidden");syncAccountSurface(id);};const hide=id=>{$(id)?.classList.add("hidden");syncAccountSurface(id);};
const go=id=>$(id)?.scrollIntoView({behavior:"smooth",block:"start"});
function hideHomeSurface(){
  // Hide the public Home surface while an internal Dashboard is open.
  ["home","smvWalletOffersBanner","askNowSection","approved-astrologers","faq",
   "smv-content-hub","horoscope-tools","tamil-horoscope","english-horoscope"].forEach(id=>hide(id));
  ["tamilHoroscopeResult","englishHoroscopeResult"].forEach(id=>{const el=$(id);if(el){el.classList.add("hidden");el.innerHTML="";}});
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>hideElement(el));
}
function showHomeSurface(){
  ["home","smvWalletOffersBanner","askNowSection","approved-astrologers","faq"].forEach(id=>show(id));
  smvLoadHomeWalletRechargeOffers().catch(()=>{});
  hide("register-flow");
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>showElement(el));
}
function hideElement(el){if(el) el.classList.add("hidden");}

/* Dashboard/Admin must be a clean internal view. */
function hideDashboardPublicSections(){
  ["smv-content-hub","horoscope-tools","tamil-horoscope","english-horoscope"].forEach(id=>hide(id));
}

function smvSyncHeaderAuthNav(user=auth?.currentUser||currentUser){
  const signedIn=!!user;
  const dash=$("dashLink"), admin=$("adminLink"), authButton=$("authBtn"), register=$("registerNav");
  if(authButton) authButton.textContent=signedIn?"Logout":"Login";
  if(register) signedIn?hideElement(register):showElement(register);
  if(dash) signedIn?showElement(dash):hideElement(dash);
  // Admin intentionally uses the same single Dashboard entry as every role.
  if(admin){
    hideElement(admin);
    admin.setAttribute('aria-hidden','true');
    admin.setAttribute('tabindex','-1');
  }
}
function smvShowRoleNav(){
  document.querySelectorAll('header a[href="#home"], header a[href="#contact"], header a[href="#services"], #contactNav').forEach(el=>showElement(el));
  smvSyncHeaderAuthNav(auth?.currentUser||currentUser);
}

let smvInternalView="home";
function smvEnterInternalView(view,push=true){
  smvInternalView=view;
  if(view!=="home")window.__SMV_PUBLIC_ROUTE=null;
  if(push){try{history.pushState({smvView:view},"",`#${view}`);}catch(_e){}}
}
$("workspaceHome")?.addEventListener("click",e=>{e.preventDefault();smvReturnHome(true);});
window.__smvPreparePublicNavigation=()=>{
 ++smvNavigationEpoch;
 pendingAfterLogin=null;smvInternalView='home';
 show('contactNav');if(currentUser)smvShowRoleNav();
};
function smvReturnHome(restoreRoleNav=true){
  ++smvNavigationEpoch;
  
  
  pendingAfterLogin=null;
  smvInternalView="home";

  // Close every internal view.
  ["dashboard","admin","register-flow","astro-register-form",
   "astro-flow","appointment","contact"].forEach(id=>hide(id));

  // Restore the COMPLETE public Home surface.
  ["home","smvWalletOffersBanner","askNowSection","approved-astrologers","faq","smv-content-hub",
   "english-horoscope"].forEach(id=>{const el=$(id);if(el)el.classList.remove("hidden");});
  smvLoadHomeWalletRechargeOffers().catch(()=>{});
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
  ["register-flow","astro-register-form","astro-flow","appointment","contact","dashboard","admin"].forEach(id=>{if(id!==except) hide(id);});
  hide("dashLink");
  hide("adminLink");
  if(except==="dashboard" || except==="admin"){
    hideHomeSurface();
    hideDashboardPublicSections();
    hide("register-flow");
    hide("astro-register-form");
    hide("astro-flow");
    
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
  if(m?.querySelector(".smv-live-session-panel"))smvLiveDismissSessionUi();
  if(m){
    m.classList.add("hidden");
    m.classList.remove("profile-modal-active","auth-modal-active");
  }

  
};
function openModal(html){
 const modal=$("modal"),content=$("modalContent"),box=modal?.querySelector(".modalbox");
 modal?.classList.remove("profile-modal-active");
 modal?.classList.remove("smv-live-session-modal");
 if(content)content.innerHTML=html;
 const livePanel=content?.querySelector(".smv-live-session-panel");
 if(livePanel&&modal&&box){
  modal.classList.add("smv-live-session-modal");
  modal.style.padding="8px 8px calc(8px + env(safe-area-inset-bottom))";
  box.style.width="min(100%,600px)";
  box.style.maxWidth="600px";
  box.style.maxHeight="calc(100dvh - 16px - env(safe-area-inset-bottom))";
  box.style.minHeight="0";
  box.style.overflow="hidden";
  box.style.display="flex";
  box.style.flexDirection="column";
  box.style.boxSizing="border-box";
  if(content){content.style.display="flex";content.style.flex="1 1 auto";content.style.flexDirection="column";content.style.minHeight="0";content.style.width="100%";}
  livePanel.style.height="calc(100dvh - 60px - env(safe-area-inset-bottom))";
  livePanel.style.maxHeight="calc(100dvh - 60px - env(safe-area-inset-bottom))";
  livePanel.style.minHeight="0";
  livePanel.style.flex="1 1 auto";
  livePanel.style.display="flex";
  livePanel.style.flexDirection="column";
  livePanel.style.overflow="hidden";
  livePanel.style.overscrollBehavior="contain";
  const sessionBody=livePanel.querySelector(".smv-live-session-body");
  if(sessionBody){
   sessionBody.style.flex="1 1 auto";
   sessionBody.style.minHeight="0";
   sessionBody.style.overflowY="auto";
   sessionBody.style.overflowX="hidden";
   sessionBody.style.overscrollBehavior="contain";
  }
  const sessionActions=livePanel.querySelector(".smv-live-session-actions");
  if(sessionActions){
   sessionActions.style.position="static";
   sessionActions.style.flex="0 0 auto";
   sessionActions.style.display="grid";
   sessionActions.style.gridTemplateColumns="repeat(2,minmax(0,1fr))";
   sessionActions.style.alignItems="stretch";
   sessionActions.style.gap="8px";
   sessionActions.style.marginTop="8px";
  }
 }else if(box){
  box.style.width="";
  box.style.maxWidth="";
  box.style.maxHeight="calc(100dvh - 20px)";
  box.style.minHeight="";
  box.style.overflow="auto";
  box.style.display="";
  box.style.flexDirection="";
  if(content){content.style.display="";content.style.flex="";content.style.flexDirection="";content.style.minHeight="";content.style.width="";}
 }
 modal?.classList.remove("hidden");
}
function smvNotice(title,message,icon="✓"){
  const id="smvNoticeDialog"; let el=document.getElementById(id); if(el)el.remove();
  el=document.createElement("div"); el.id=id; el.className="smv-dialog-backdrop";
  el.innerHTML=`<div class="smv-dialog"><div class="smv-dialog-icon smv-dialog-icon-brand" aria-hidden="true"><img class="smv-dialog-brand" src="./assets/smv-brand-logo.png" alt="" width="44" height="44" decoding="async"></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="smv-dialog-actions single"><button type="button" class="btn">OK</button></div></div>`;
  document.body.appendChild(el); el.querySelector(".btn").onclick=()=>el.remove(); return el;
}
function smvConfirm(title,message,okText="OK",cancelText="CANCEL",danger=false){
  return new Promise(resolve=>{
    const id="smvConfirmDialog"; let el=document.getElementById(id); if(el)el.remove();
    el=document.createElement("div"); el.id=id; el.className="smv-dialog-backdrop";
    el.innerHTML=`<div class="smv-dialog"><div class="smv-dialog-icon smv-dialog-icon-brand" aria-hidden="true"><img class="smv-dialog-brand" src="./assets/smv-brand-logo.png" alt="" width="44" height="44" decoding="async"></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="smv-dialog-actions"><button type="button" class="btn gray" data-cancel>${escapeHtml(cancelText)}</button><button type="button" class="btn ${danger?"danger":""}" data-ok>${escapeHtml(okText)}</button></div></div>`;
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
function smvDateTime(value){ try { if(value==null || value==='') return '—'; let d=null; if(value instanceof Date) d=value; else if(typeof value?.toDate==='function') d=value.toDate(); else if(typeof value==='object' && value){ const sec=value.seconds ?? value._seconds; const ns=value.nanoseconds ?? value._nanoseconds ?? 0; if(sec!=null) d=new Date(Number(sec)*1000+Math.floor(Number(ns)/1e6)); else if(value.timestamp) return smvDateTime(value.timestamp); else if(value.date) return smvDateTime(value.date); else if(value.value) return smvDateTime(value.value); } if(!d) d=new Date(value); if(Number.isNaN(d.getTime())) return '—'; return d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); } catch(e){ return '—'; } }
function smvDateSortMs(value){ try { if(value==null||value==='')return 0; if(typeof value?.toMillis==='function')return Number(value.toMillis())||0; if(typeof value?.toDate==='function')return value.toDate().getTime()||0; if(value instanceof Date)return value.getTime()||0; if(typeof value==='object'&&value){const sec=value.seconds??value._seconds;const ns=value.nanoseconds??value._nanoseconds??0;if(sec!=null)return Number(sec)*1000+Math.floor(Number(ns)/1e6);if(value.timestamp!=null)return smvDateSortMs(value.timestamp);if(value.date!=null)return smvDateSortMs(value.date);if(value.value!=null)return smvDateSortMs(value.value);} const n=typeof value==='number'?value:Date.parse(String(value));return Number.isFinite(n)?n:0;}catch(_e){return 0;} }
function smvDashboardActivityMs(item={}){return smvDateSortMs(item.paymentRecordedAt||item.paidAt||item.paymentUpdatedAt||item.commissionCreditedAt||item.customerViewedAt||item.answerApprovedAt||item.answerSubmittedAt||item.adminQuestionApprovedAt||item.questionApprovedAt||item.requestedAt||item.date||item.updatedAt||item.createdAt||item.submittedAt);}
function smvDashboardData(item){try{return typeof item?.data==='function'?(item.data()||{}):(item||{});}catch(_e){return {};}}
function smvSortDashboardDesc(items){return (Array.isArray(items)?items:[]).slice().sort((a,b)=>smvDashboardActivityMs(smvDashboardData(b))-smvDashboardActivityMs(smvDashboardData(a)));}
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

// Header keeps one stable Dashboard label for Customer, Astrologer and Admin.
function setHeaderRoleLabel(role){
  const dash=$("dashLink"), admin=$("adminLink");
  const r=String(role||"").toLowerCase();
  if(dash){
    dash.textContent="Dashboard";
    dash.classList.toggle("smv-role-green",["customer","astrologer","admin"].includes(r));
  }
  if(admin){
    admin.classList.add("hidden");
    admin.setAttribute("aria-hidden","true");
    admin.setAttribute("tabindex","-1");
  }
}

// V149: Horoscope navigation must restore both public horoscope sections after Login
// temporarily hides them. It does not change the website-wide language.
$("contentNav")?.addEventListener("click",(e)=>{
  e.preventDefault();e.stopPropagation();
  const hub=$("smv-content-hub");if(!hub)return;
  hub.classList.remove("hidden");window.__smvContentVisible=true;
  window.__smvEnsurePublicContent?.().catch(err=>console.warn("Public content lazy load failed:",err));
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
    smvUnlockDashboardNavigation();
    try{
      const user=auth?.currentUser||currentUser;
      if(!user){ pendingAfterLogin="dashboard"; openAuth("login"); return; }
      currentUser=user;  

      // Reopening the role button while its dashboard is already rendered must
      // reuse the current view. Do not re-read the profile or dashboard merely
      // because the header button was touched again. Live change events and
      // explicit Refresh/data-changing actions remain the only refresh triggers.
      if(smvInternalView==='dashboard' && dashboardReadyUid===user.uid && dashboardReadyAt>0 && !smvDashboardDirty && !$("dashboard")?.classList.contains('hidden') && !!dashboardReadyRole){
        hideHomeSurface(); hideDashboardPublicSections(); show('dashboard'); show('dashboardContent');
        setHeaderRoleLabel(dashboardReadyRole||window.__smvCurrentRole||'customer'); smvShowRoleNav();
        try{history.replaceState({smvView:'dashboard'},'', '#dashboard');}catch(_e){}
        touchSession(); armIdleTimer(); return;
      }
      if(smvInternalView==='admin' && !$("admin")?.classList.contains('hidden') && await isAdminAccount(user)){
        hideHomeSurface(); show('admin'); setHeaderRoleLabel('admin'); smvShowRoleNav();
        try{history.replaceState({smvView:'admin'},'', '#admin');}catch(_e){}
        touchSession(); armIdleTimer(); return;
      }
      // Reopen a known Customer/Astrologer shell immediately, then validate role and refresh data.
      const cachedRole=smvCachedDashboardRole(user.uid);
      const dashboardAlreadyVisible=smvInternalView==='dashboard'&&dashboardReadyUid===user.uid&&dashboardReadyAt>0&&!$("dashboard")?.classList.contains('hidden');
      if(cachedRole&&!dashboardAlreadyVisible){
        hideHomeSurface();
        ["admin","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
        show("dashboard");show("dashboardContent");show("dashLink");hide("adminLink");hideDashboardPublicSections();
        $("dashboardTitle").textContent=cachedRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
        smvRenderFastDashboardShell(cachedRole);
        go("dashboard");
      }
      // Resolve the server-authorized role before refreshing Dashboard data.
      const roleProfile=await withTimeout(getUserProfile(user.uid),15000);
      const resolvedRole=await resolveSmvRole(user,roleProfile);
      const adminUser=resolvedRole==='admin';
      if(epoch!==smvNavigationEpoch) return;
      if(adminUser){
        hideHomeSurface();
        ["dashboard","dashboardContent","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
        show("admin"); hide("dashLink"); hide("adminLink");
        smvEnterInternalView("admin",true); go("admin");
        await loadAdminPanel();
        if(epoch!==smvNavigationEpoch) return;
        setHeaderRoleLabel("admin"); smvShowRoleNav(); smvEnterInternalView("admin",true); go("admin");
      }else{
        const role=resolvedRole;
        if(epoch!==smvNavigationEpoch) return;
        if(role!=="customer" && role!=="astrologer"){ smvNotice("Dashboard Access","Your account role could not be verified. Please try again.","!"); return; }
        hideHomeSurface();
        ["admin","register-flow","astro-register-form","astro-flow","appointment","contact"].forEach(hide);
        show("dashboard"); show("dashboardContent"); show("dashLink"); hide("adminLink"); hideDashboardPublicSections();
        setHeaderRoleLabel(role);
        if(cachedRole!==role){
          $("dashboardTitle").textContent=role==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
          smvRenderFastDashboardShell(role);
        }
        smvEnterInternalView("dashboard",true); go("dashboard");
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
// Admin no longer has a separate header button.
$("adminLink")?.addEventListener("click",e=>{e.preventDefault();openAdminEntry();});
$("adminFeatureBtn")?.addEventListener("click",e=>{e.preventDefault();openAdminEntry();});

// ---------- Admin access + Login / customer registration ----------
const smvProfiles=new Map();
const SMV_DASHBOARD_ROLE_CACHE_PREFIX='smv.dashboard-role.';
function smvCachedDashboardRole(uid){
 try{
  const role=String(localStorage.getItem(SMV_DASHBOARD_ROLE_CACHE_PREFIX+String(uid||''))||'').toLowerCase();
  return ['customer','astrologer'].includes(role)?role:'';
 }catch(_e){return '';}
}
function smvRememberDashboardRole(uid,role){
 const safeRole=String(role||'').toLowerCase();
 if(!uid||!['customer','astrologer'].includes(safeRole))return;
 try{localStorage.setItem(SMV_DASHBOARD_ROLE_CACHE_PREFIX+String(uid),safeRole);}catch(_e){}
}
async function getUserProfile(uid){
 const cached=smvProfiles.get(uid); if(cached&&Date.now()-cached.at<15000)return cached.data;
  try{const s=await withTimeout(getDoc(doc(db,"smv_users",uid)),10000);const data=s.exists()?s.data():{};smvProfiles.set(uid,{data,at:Date.now()});return data;}
  catch(e){
   console.warn("Profile lookup failed",e);
   // A failed read during quota exhaustion must not be repeated immediately by
   // login role resolution and Dashboard hydration. Keep only an empty profile
   // for the same short TTL as the normal cache; a later retry can read Firestore again.
   smvProfiles.set(uid,{data:{_smvProfileReadFailed:true},at:Date.now()});
   return {_smvProfileReadFailed:true};
  }
}

// Admin authorization must come from the backend's verified token/custom-claim
// or server-controlled smv_admins/{uid} allowlist. The client profile role alone
// is not authoritative, especially on the isolated Phase 1 staging project.
const smvAdminAccessCache=new Map();
async function isAdminAccount(user, profileHint=null){
 if(!user)return false;
 const uid=String(user.uid||"").trim();
 if(!uid)return false;
 if(ADMIN_UID&&uid===ADMIN_UID)return true;
 const cached=smvAdminAccessCache.get(uid);
 if(cached&&Date.now()-cached.at<15000)return cached.allowed;
 try{
  const result=await renderApi("/admin/access",{method:"GET",timeoutMs:10000},user);
  const allowed=result?.isAdmin===true;
  smvAdminAccessCache.set(uid,{allowed,at:Date.now()});
  if(allowed)return true;
 }catch(e){
  console.warn("Server Admin access check failed:",e?.message||e);
 }
 // Preserve the existing production compatibility path for legacy Admin profiles.
 // Phase 1 staging never grants Admin UI from smv_users.role alone.
 if(!IS_SMV_PHASE1_STAGING){
  const profile=profileHint||await getUserProfile(uid);
  return String(profile?.role||"").toLowerCase()==="admin";
 }
 return false;
}
async function resolveSmvRole(user, profileHint=null){
 if(!user)return "customer";

 // On isolated Phase 1 staging, resolve the role with the authenticated
 // backend/Admin SDK first. This avoids silently downgrading a legacy
 // Astrologer because browser Firestore rules or a missing role field blocked
 // the client-side profile lookup.
 if(IS_SMV_PHASE1_STAGING){
  try{
   const resolved=await withTimeout(renderApi("/account/role",{method:"GET",timeoutMs:12000},user),14000);
   const serverRole=String(resolved?.role||"").toLowerCase();
   if(["admin","customer","astrologer"].includes(serverRole)){
    smvAdminAccessCache.set(String(user.uid),{allowed:serverRole==="admin",at:Date.now()});
    window.__smvAccountRoleDiagnostics={
     role:serverRole,
     profileFound:resolved?.profileFound===true,
     astrologerProfileFound:resolved?.astrologerProfileFound===true,
     astrologerProfileCollection:String(resolved?.astrologerProfileCollection||""),
     checkedAt:Date.now()
    };
    smvRememberDashboardRole(user.uid,serverRole);
     return serverRole;
   }
  }catch(e){
   console.warn("Server account role lookup failed; using authenticated profile fallback:",e?.message||e);
  }
 }

 if(!IS_SMV_PHASE1_STAGING){
  const resolvedProfile=profileHint||await getUserProfile(user.uid);
  profileHint=resolvedProfile;
  const profileRole=String(resolvedProfile?.role||"").trim().toLowerCase();
  if(["customer","astrologer"].includes(profileRole)){
   smvRememberDashboardRole(user.uid,profileRole);
   return profileRole;
  }
  if(resolvedProfile?._smvProfileReadFailed===true){
   const cachedRole=smvCachedDashboardRole(user.uid);
   if(cachedRole)return cachedRole;
  }
 }
 if(await isAdminAccount(user,profileHint))return "admin";
 const profile=profileHint||await getUserProfile(user.uid);
 const role=String(profile?.role||"").toLowerCase();

 // Last-resort staging fallback. Document ownership (UID) is authoritative;
 // older valid astrologer records may not contain an explicit role field.
 if(IS_SMV_PHASE1_STAGING && role!=="astrologer"){
  try{
   const astroSnap=await withTimeout(getDoc(doc(db,"smv_astrologers",user.uid)),10000);
   if(astroSnap.exists()){
    const astro=astroSnap.data()||{};
    if(!astro.uid || String(astro.uid)===String(user.uid)){smvRememberDashboardRole(user.uid,"astrologer");return "astrologer";}
   }
  }catch(e){
   console.warn("Astrologer role profile lookup failed:",e?.message||e);
  }
 }
 if(IS_SMV_PHASE1_STAGING&&role==="admin")return "customer";
 const resolvedRole=["customer","astrologer"].includes(role)?role:"customer";
 if(!profile?._smvProfileReadFailed)smvRememberDashboardRole(user.uid,resolvedRole);
 return resolvedRole;
}

// V194 — A cold reopen deliberately stays on Home, so the initial auth callback
// does not spend a Firestore read resolving the role. Protected customer actions
// (for example Private Consultation -> SELECT ASTROLOGER) can lazily resolve the
// already-authenticated user's role on the first explicit click. This does NOT
// open Dashboard and therefore preserves the V116/V193 cold-reopen invariant.
async function smvEnsureCustomerSessionForProtectedAction(){
  const user=auth?.currentUser||currentUser||window.__smvFirebaseCurrentUser||null;
  if(!user)return {ok:false,user:null,role:'',reason:'login'};
  currentUser=user;
  window.__smvFirebaseCurrentUser=user;
  window.__smvCurrentUserPresent=true;
  let role=String(window.__smvCurrentRole||'').toLowerCase();
  if(!role){
    const profile=await getUserProfile(user.uid);
    role=await resolveSmvRole(user,profile);
    if(!['customer','astrologer','admin'].includes(role)) role='customer';
    window.__smvCurrentRole=role;
    setHeaderRoleLabel(role);
    smvShowRoleNav();
  }
  return {ok:role==='customer',user,role,reason:role==='customer'?'':'role'};
}
window.__smvEnsureCustomerSession=smvEnsureCustomerSessionForProtectedAction;
async function isCurrentAdmin(){
  if(!currentUser) return false;
  return isAdminAccount(currentUser);
}
let smvBoardRequest=null;
const SMV_ADMIN_SHORTCUTS=[
 ['adminWalletLedger','Wallet Ledger','self'],
 ['adminHoroscopePriceSet','Horoscope Settings','self'],
 ['adminWithdrawals','Withdrawals','parent'],
 ['adminOffersPromotions','Wallet Offers','self'],
 ['adminCommissionSettings','Live / Booking Commission','self'],
 ['adminAndroidAppManagementCard','Android App Releases','self']
];
function smvWalletAuditMoney(paise){
 const n=Number(paise);
 return '₹'+((Number.isSafeInteger(n)&&n>=0?n:0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
async function smvLoadAdminWalletLedger(){
 const host=$('adminWalletLedgerRows');
 if(!host||!currentUser)return;
 const button=$('adminWalletLedgerRefresh'),filter=$('adminWalletLedgerOwnerUid'),msg=$('adminWalletLedgerMsg');
 if(button&&!button.dataset.smvBound){
  button.dataset.smvBound='1';
  button.addEventListener('click',()=>smvLoadAdminWalletLedger().catch(e=>console.warn('Admin Wallet ledger refresh failed:',e)));
 }
 if(button){button.disabled=true;button.textContent='LOADING…';}
 if(msg)msg.textContent='Loading latest Wallet ledger entries…';
 try{
  const ownerUid=String(filter?.value||'').trim();
  const url='/admin/wallet/transactions?limit=50'+(ownerUid?'&ownerUid='+encodeURIComponent(ownerUid):'');
  const result=await renderApi(url,{method:'GET'});
  if(!result?.success)throw new Error(result?.error||'Wallet audit could not be loaded.');
  const rows=Array.isArray(result.transactions)?result.transactions:[];
  const totals=result.pageTotals||{};
  const summary=$('adminWalletLedgerSummary');
  if(summary)summary.innerHTML='<div class="stat">Transactions in this result <b>'+escapeHtml(String(totals.transactionCount||0))+'</b></div><div class="stat">Credits in result <b>'+smvWalletAuditMoney(totals.creditPaise||0)+'</b></div><div class="stat">Debits in result <b>'+smvWalletAuditMoney(totals.debitPaise||0)+'</b></div>'+(result.wallet?'<div class="stat">Selected Wallet available <b>'+smvWalletAuditMoney(result.wallet.availableBalancePaise||0)+'</b></div><div class="stat">Selected Wallet reserved <b>'+smvWalletAuditMoney(result.wallet.reservedBalancePaise||0)+'</b></div>':'');
  if(host){
   host.innerHTML=rows.length?rows.map(t=>{
    const credit=String(t.direction||'').toLowerCase()==='credit';
    const ref=[t.referenceType,t.referenceId].filter(Boolean).join(' · ');
    return '<article class="smv-history-row" style="padding:12px 0;border-bottom:1px solid rgba(128,128,128,.22)"><div style="display:flex;gap:12px;justify-content:space-between;align-items:start;flex-wrap:wrap"><div><b>'+escapeHtml(String(t.type||'transaction').replace(/_/g,' '))+'</b><div class="small">'+escapeHtml(smvDateTime(t.createdAt))+' · '+escapeHtml(t.status||'')+'</div><div class="small">Owner: '+escapeHtml(t.ownerRole||'')+' · UID: '+escapeHtml(t.ownerUid||'')+'</div>'+(ref?'<div class="small">Reference: '+escapeHtml(ref)+'</div>':'')+(t.source?'<div class="small">Source: '+escapeHtml(t.source)+'</div>':'')+'<div class="small">Ledger ID: '+escapeHtml(t.id||'')+'</div></div><b class="'+(credit?'success':'error')+'" style="white-space:nowrap">'+(credit?'+':'−')+smvWalletAuditMoney(t.amountPaise)+'</b></div>'+(t.balanceAfterPaise!=null?'<div class="small">Balance after: '+smvWalletAuditMoney(t.balanceAfterPaise)+' · Reserved after: '+smvWalletAuditMoney(t.reservedBalanceAfterPaise||0)+'</div>':'')+'</article>';
   }).join(''):'<div class="empty">No Wallet ledger entries matched this filter.</div>';
  }
  if(msg)msg.textContent='Showing the latest '+rows.length+' transaction(s). Totals above describe this result only, not the complete account reconciliation.';
 }catch(e){
  if(host)host.innerHTML='<div class="empty error">'+escapeHtml(e?.message||String(e))+'</div>';
  if(msg)msg.textContent='Wallet ledger unavailable. Use Refresh to try again.';
 }finally{
  if(button&&document.contains(button)){button.disabled=false;button.textContent='REFRESH WALLET LEDGER';}
 }
}
function smvBindAdminWalletLedger(){
 const button=$('adminWalletLedgerRefresh');
 if(button&&!button.dataset.smvBound){
  button.dataset.smvBound='1';
  button.addEventListener('click',()=>smvLoadAdminWalletLedger().catch(e=>console.warn('Admin Wallet ledger refresh failed:',e)));
 }
}
function smvEnsureAdminQuickLinks(){
 const admin=$('admin'); if(!admin)return null;
 let nav=$('smvAdminQuickLinks')||admin.querySelector('.smv-admin-shortcuts');
 if(!nav){nav=document.createElement('div');nav.className='smv-admin-shortcuts';}
 nav.id='smvAdminQuickLinks'; nav.setAttribute('role','navigation'); nav.setAttribute('aria-label','Admin quick links');
 if(nav.dataset.smvBuilt!=='1'){
  nav.replaceChildren();
  for(const [id,label,mode] of SMV_ADMIN_SHORTCUTS){
   const b=document.createElement('button');b.type='button';b.className='smv-admin-shortcut';b.textContent=label;b.dataset.adminShortcut=id;
   b.addEventListener('click',()=>{const el=$(id),target=mode==='parent'?el?.parentElement:el;target?.scrollIntoView({behavior:'smooth',block:'start'});});
   nav.appendChild(b);
  }
  nav.dataset.smvBuilt='1';
 }
 const summaryCard=$('adminSummary')?.closest('.card')||admin.querySelector(':scope > .card');
 const loadMsg=$('adminDataLoadMsg');
 if(summaryCard){
  /* Keep shortcuts immediately below the Admin Dashboard title/subtitle.
     Dynamic summary/workflow inserts and live refreshes must never push them down. */
  if(loadMsg && loadMsg.parentElement===summaryCard){
   if(nav.parentElement!==summaryCard || nav.nextElementSibling!==loadMsg) summaryCard.insertBefore(nav,loadMsg);
  }else if(nav.parentElement!==summaryCard){
   const title=summaryCard.querySelector('.admin-dashboard-title');
   const titleBlock=title?.parentElement;
   if(titleBlock?.parentElement) titleBlock.insertAdjacentElement('afterend',nav);
   else summaryCard.insertBefore(nav,summaryCard.firstChild?.nextSibling||null);
  }
 }else if(nav.parentElement!==admin) admin.insertBefore(nav,admin.firstChild);
 return nav;
}
window.__smvEnsureAdminQuickLinks=smvEnsureAdminQuickLinks;

async function smvAdminTouch(){
 try{await renderApi('/admin/dashboard-touch',{method:'POST',body:JSON.stringify({})});}
 catch(e){console.warn('Admin dashboard cache/signal touch skipped:',e);}
}
function smvWatchAdminEvents(){smvStartLive('admin');}
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
  hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink"); hide("appointment"); hide("contact"); hide("register-flow"); hide("astro-register-form"); hide("astro-flow"); hide("smv-content-hub"); window.__smvContentVisible=false;
  closeModal(); const isLogin=mode==="login";
  openModal(`<div class="auth-shell" data-auth-mode="${isLogin?'login':'register'}">
    <div class="auth-hero"><div class="auth-hero-icon"><img src="./assets/smv-brand-logo.png" alt="SMV ASTRO" width="72" height="72"></div><h2>${isLogin?"Welcome Back":"Create Account"}</h2><p>${isLogin?"Sign in to continue to your SMV ASTRO dashboard.":"Create your secure customer account."}</p></div>
    <div id="authMsg" class="small"></div>
    ${!isLogin?`<label class="auth-field-label">Full Name</label><input class="auth-field" id="name" placeholder="Your full name" autocomplete="name"><label class="auth-field-label">Mobile Number</label><input class="auth-field" id="phone" placeholder="Your mobile number" autocomplete="tel">`:""}
    <label class="auth-field-label"><strong>${isLogin?"Email / Customer ID / Astrologer ID":"Email"}</strong></label><input class="auth-field" id="email" type="${isLogin?'text':'email'}" placeholder="${isLogin?'Email / Customer ID / Astrologer ID':'Email'}" autocomplete="${isLogin?'username':'email'}"${isLogin?' autocapitalize="none" spellcheck="false"':''}>
    <label class="auth-field-label"><strong>Password</strong></label><div class="password-wrap"><input class="auth-field" id="password" type="password" placeholder="Minimum 6 characters" autocomplete="${isLogin?"current-password":"new-password"}"><button type="button" class="password-toggle" id="passwordToggle" aria-label="Show password" aria-pressed="false">${smvPasswordEye(false)}</button></div>
    <button class="btn auth-submit" id="submitAuth">${isLogin?"LOGIN":"CREATE ACCOUNT"}</button>
    ${isLogin?`<div class="auth-divider" aria-hidden="true"><span>OR</span></div><button type="button" class="btn auth-google" id="googleAuthBtn"><span class="google-g" aria-hidden="true"><svg viewBox="0 0 18 18" width="18" height="18"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.877 2.684-6.614Z"/><path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.963 10.705A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.705V4.963H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.037l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.963l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"/></svg></span><span>Continue with Google</span></button><div class="auth-note"><a href="#" id="forgotAuth">Forgot Password?</a><span aria-hidden="true"> · </span><a href="#" id="switchAuth">Create new customer account</a></div>`:`<button class="btn gray auth-secondary" id="switchAuth">I already have an account</button>`}
  </div>`);
  $("modal")?.classList.add("auth-modal-active");
  const passwordToggle=$("passwordToggle");
  passwordToggle.onclick=()=>{const p=$("password");const showing=p.type==="text";p.type=showing?"password":"text";passwordToggle.innerHTML=smvPasswordEye(!showing);passwordToggle.setAttribute("aria-pressed",String(!showing));passwordToggle.setAttribute("aria-label",showing?"Show password":"Hide password")};
  $("submitAuth").onclick=()=>submitAuth(mode); $("switchAuth").onclick=(e)=>{e?.preventDefault?.();openAuth(isLogin?"register":"login")};
  $("password")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitAuth(mode)}});
  if(isLogin && $("googleAuthBtn")) $("googleAuthBtn").onclick=()=>signInWithGoogle();
  if($("forgotAuth")) $("forgotAuth").onclick=async(e)=>{e?.preventDefault?.();const identifier=$("email").value.trim(),m=$("authMsg"); if(!identifier){m.innerHTML='<span class="error">Enter your registered Email, Customer ID or Astrologer ID first.</span>';return;} try{const resolved=await smvResolveLoginIdentifier(identifier);const {sendPasswordResetEmail}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");await withTimeout(sendPasswordResetEmail(auth,resolved.email));m.innerHTML='<span class="success">Password reset email sent. Please check Inbox and Spam.</span>';}catch(e){m.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}};
}
window.__smvOpenAuth = openAuth; window.__smvOpenAstroRegister = openAstroRegister;

// Google Sign-In is a customer login method. Existing Email/Password, Customer ID,
// and Astrologer ID flows remain unchanged.
// We therefore use Firebase signInWithPopup() only here. The redirect flow was
// removed because storage partitioning caused Firebase "missing initial state"
// errors on the production domain.
let smvGoogleLoginInProgress=false;
let smvEmailLoginInProgress=false;
// The first Firebase auth callback after a fresh page/app start is session
// restoration, not an explicit Login action. Keep the authenticated session,
// but start on Home. Explicit Email/Google login continues to own Dashboard routing.
let smvInitialAuthStateHandled=false;
// A persisted Firebase session starts at Home until the user explicitly opens a Dashboard.
let smvColdStartHomeLock=true;if(smvColdStartHomeLock && /^(#dashboard|#admin)$/i.test(location.hash||'')){
  try{history.replaceState({smvView:'home'},'',location.pathname+location.search);}catch(_e){}
}
function smvUnlockDashboardNavigation(){ smvColdStartHomeLock=false; }
async function finishGoogleRoleLogin(googleUser){
  if(!googleUser) throw new Error("Google Sign-In did not return a Firebase user. Please try again.");
  currentUser=googleUser;
  smvAdminAccessCache.delete(googleUser.uid);
  await googleUser.reload();

  // Google Sign-In is login-only. Never create a Customer profile here.
  // A direct Firestore read intentionally has no artificial 10/15-second timeout:
  // a slow first response is not a failed login and must not fall into registration.
  smvProfiles.delete(googleUser.uid);
  let profile={};
  try{
    const profileSnap=await getDoc(doc(db,"smv_users",googleUser.uid));
    if(profileSnap.exists()) profile=profileSnap.data()||{};
  }catch(profileErr){
    console.error("Google role lookup failed",profileErr);
    throw new Error("Unable to verify your registered account. Please try Google Login again.");
  }
  const role=await resolveSmvRole(googleUser,profile);
  const adminUser=role==="admin";

  if(!["customer","astrologer","admin"].includes(role)){
    try{await signOut(auth);}catch(_e){}
    currentUser=null;
    throw new Error("No registered SMV ASTRO account was found for this Google email. Please register first.");
  }
  smvProfiles.set(googleUser.uid,{data:profile,at:Date.now()});

  const resolvedRole=adminUser?"admin":role;
  if(!["customer","astrologer","admin"].includes(resolvedRole)){
    await signOut(auth); currentUser=null;
    throw new Error("This account role could not be verified.");
  }

  setHeaderRoleLabel(resolvedRole);
  window.__smvCurrentRole=resolvedRole;
  closeModal();

  pendingAfterLogin=null;
  hide("register-flow"); hide("astro-register-form"); hide("astro-flow");
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
  smvRenderFastDashboardShell(resolvedRole);
  smvShowRoleNav(); smvEnterInternalView("dashboard",true); go("dashboard");
  await loadDashboard(resolvedRole);
}

async function signInWithGoogle(){
  smvUnlockDashboardNavigation();
  const btn=$("googleAuthBtn"), msg=$("authMsg");
  if(!auth || firebaseInitError){
    msg.innerHTML='<span class="error">Google Sign-In is currently unavailable. Please use Email Login.</span>';
    return;
  }
  btn.disabled=true; btn.querySelector('span:last-child').textContent='Signing in with Google...';
  try{
    smvGoogleLoginInProgress=true;
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const result=await withTimeout(signInWithPopup(auth,provider),30000);
    await finishGoogleRoleLogin(result?.user);
    smvGoogleLoginInProgress=false;
  }catch(e){
    smvGoogleLoginInProgress=false;
    console.error("Google Sign-In failed",e);
    
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
    btn.disabled=false; btn.querySelector('span:last-child').textContent='Continue with Google';
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
async function smvResolveLoginIdentifier(identifier){
 const value=String(identifier||"").trim();
 if(!value)throw new Error("Enter your Email, Customer ID or Astrologer ID.");
 if(value.includes("@"))return {email:value,role:"email"};
 const lookup=await withTimeout(renderPublicApi("/lookup-id-login",{method:"POST",body:JSON.stringify({publicId:value})}),15000);
 const email=String(lookup?.email||"").trim();
 if(!email)throw new Error("This ID is not linked to a login email.");
 return {email,role:String(lookup?.role||"").toLowerCase(),publicId:String(lookup?.publicId||value)};
}
async function submitAuth(mode){
 if(mode==="login") smvUnlockDashboardNavigation();
 const msg=$("authMsg"),rawLogin=$("email").value.trim(),email=rawLogin,password=$("password").value;
 if(!rawLogin||!password){msg.innerHTML='<span class="error">Please enter your Email, Customer ID or Astrologer ID and password.</span>';return;}
 const btn=$("submitAuth");btn.disabled=true;btn.textContent=mode==="login"?"Signing in...":"Creating...";
 try{
  if(mode==="login"){
    const resolvedLogin=await smvResolveLoginIdentifier(rawLogin);
    const email=resolvedLogin.email;
    // Do not wait for a separate auth-state promise here. Firebase already returns
    // the signed-in user from signInWithEmailAndPassword; use that result directly.
    // Do not race Firebase Authentication against a client-side timeout here.
    // A timed-out Promise.race does not cancel Firebase sign-in: on slower accounts
    // Firebase can still authenticate moments later, the auth listener opens the
    // dashboard, and the stale timeout then writes a false error into the Login
    // modal. Await the canonical Firebase Auth result for this explicit login.
    // Explicit Email/ID login owns this auth transition. The auth listener must
    // not start a second profile/dashboard read in parallel. This both removes
    // the login-vs-listener race and protects Firestore read quota.
    smvEmailLoginInProgress=true;
    const loginCred=await signInWithEmailAndPassword(auth,email,password);
    if(!loginCred?.user){throw new Error("Login did not return a Firebase user. Please try again.");}
    currentUser=loginCred.user;
    smvAdminAccessCache.delete(loginCred.user.uid);
    // Do not reuse a stale profile role from a previous login/session.
    smvProfiles.delete(loginCred.user.uid);
    // A successful signInWithEmailAndPassword credential already contains the
    // current verification state. Do not add a second reload network wait here.
    // That wait used to keep the Login modal visible even though Firebase had
    // already authenticated the user.
    if(loginCred.user.uid!==ADMIN_UID && !loginCred.user.emailVerified){
      smvEmailLoginInProgress=false;
      await signOut(auth);
      currentUser=null;
      pendingAfterLogin=null;
      msg.innerHTML='<span class="error"><b>Please verify your email first.</b><br>Check your email and click the verification link.<br><button type="button" class="btn" data-resend-verification="1" style="margin-top:10px">Resend Verification Email</button></span>';
      return;
    }

    // Authentication is complete. Close Login immediately and expose a stable
    // dashboard shell before any Firestore/profile hydration. Customer and
    // Astrologer share this shell; the resolved role updates its heading below.
    // Explicit Admin entry keeps its protected destination.
    const goToAdmin=pendingAfterLogin==="admin" || loginCred.user.uid===ADMIN_UID;
    let loginShellRole=smvCachedDashboardRole(loginCred.user.uid);

    // Close Login immediately after Firebase Auth succeeds. Show a fast
    // role-specific shell only when Customer/Astrologer role is already known;
    // Admin must never flash the generic Dashboard while its role is resolved.
    closeModal();
    if(!goToAdmin && loginShellRole){
      hideHomeSurface();
      hidePrimarySections("dashboard");
      show("dashboard");
      show("dashboardContent");
      show("dashLink");
      hide("adminLink");
      hide("askNowSection");
      hide("approved-astrologers");
      hide("faq");
      if($("dashboardTitle"))$("dashboardTitle").textContent=loginShellRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
      smvRenderFastDashboardShell(loginShellRole);
      smvEnterInternalView("dashboard",true);
      go("dashboard");
    }

    // Resolve the authoritative server role before exposing any role-specific controls.
    // This prevents a stale/previous role title from flashing during login.
    const loginProfile=await getUserProfile(loginCred.user.uid);
    const loginRole=String(loginProfile?.role||"customer").toLowerCase();
    const profileShellRole=String(loginProfile?.role||"").toLowerCase();
    if(!goToAdmin&&["customer","astrologer"].includes(profileShellRole)&&loginShellRole!==profileShellRole){
      loginShellRole=profileShellRole;
      if(!$("dashboard")||$("dashboard").classList.contains("hidden")){
        hideHomeSurface();
        hidePrimarySections("dashboard");
        show("dashboard");show("dashboardContent");show("dashLink");hide("adminLink");
        hide("askNowSection");hide("approved-astrologers");hide("faq");
        smvEnterInternalView("dashboard",true);
        go("dashboard");
      }
      if($("dashboardTitle"))$("dashboardTitle").textContent=loginShellRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";
      smvRenderFastDashboardShell(loginShellRole);
    }
    const loginStatus=String(loginProfile?.status||"active").toLowerCase(); if(loginRole!=="admin" && loginCred.user.uid!==ADMIN_UID){
      // Pending astrologers can log in. Their restricted dashboard is shown
      // below; protected consultation/earnings queries are skipped until approval.
}
    const profile=loginProfile;
    const profileRole=String(profile.role||loginRole||"customer").toLowerCase();
    const role=await resolveSmvRole(loginCred.user,profile);
    closeModal();
    const adminUser=role==="admin";
    setHeaderRoleLabel(adminUser?'admin':role);
    window.__smvCurrentRole=adminUser?'admin':role;

    pendingAfterLogin=null;
    if(goToAdmin || adminUser){
      hide("dashboard"); hide("dashboardContent"); hide("dashLink"); hide("adminLink");
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
      hide("admin"); hide("adminLink");
      show("dashLink");
      hidePrimarySections("dashboard");
      hide("register-flow");
      hide("astro-register-form");
      hide("astro-flow");
      
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
      if(loginShellRole!==role)smvRenderFastDashboardShell(role);
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
  smvRegistrationInProgress=true;
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
    // Registration is complete. Leave no unverified authenticated session behind;
    // the user verifies email and then performs a normal explicit login.
    try{if(auth?.currentUser?.uid===cred.user.uid) await signOut(auth);}catch(signOutErr){console.warn("Post-registration sign-out skipped",signOutErr);}
    currentUser=null;
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
 }finally{
  smvEmailLoginInProgress=false;
  if(mode!=="login") smvRegistrationInProgress=false;
  if($("submitAuth")){btn.disabled=false;btn.textContent=mode==="login"?"Login":"Create Account";}
 }
}
let authReadyResolve;
const authReady=new Promise(r=>authReadyResolve=r);
function waitForAuthReady(){return authReady;}
// Shared public data promises persist when returning to the consultation view.
let smvPublicListPromise=null;
const smvPublicReviews=new Map();
async function publicJSON(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(RAZORPAY_BACKEND_URL+path,{cache:'no-store',signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Public service unavailable');return d;}finally{clearTimeout(timer);}
}
window.__smvGetPublicAstrologersOnce=()=>{
 if(!smvPublicListPromise)smvPublicListPromise=(async()=>{
  try{const d=await publicJSON('/public/astrologers');if(!Array.isArray(d.astrologers))throw Error('Invalid directory');return d.astrologers;}
  catch(e){const snap=await withTimeout(getDocs(query(collection(db,'smv_astrologers'),where('status','==','approved'))),12000);return snap.docs.map(d=>{const a=d.data();return {...a,id:d.id,chatPrice:Number(a.pricePerQuestion??a.chatPrice??0)};});}
 })().catch(e=>{smvPublicListPromise=null;throw e;});
 return smvPublicListPromise;
};
window.__smvInvalidatePublicAstrologersOnce=()=>{
 smvPublicListPromise=null;
 smvAstroListRequest=null;
};
window.__smvGetPublicReviewsOnce=a=>{
 const id=String(a.id||'');if(!id)return Promise.resolve([]);
 if(!smvPublicReviews.has(id))smvPublicReviews.set(id,(async()=>{
  try{const d=await publicJSON('/public/astrologers/'+encodeURIComponent(id)+'/reviews');if(!Array.isArray(d.reviews))throw Error('Invalid reviews');return d.reviews;}
  catch(e){const snap=await withTimeout(getDocs(query(collection(db,'smv_reviews'),where('astrologerId','==',id),where('approved','==',true))),12000);return snap.docs.map(d=>({id:d.id,...d.data()}));}
 })().catch(e=>{smvPublicReviews.delete(id);throw e;}));
 return smvPublicReviews.get(id);
};
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
 const getReviews=a=>window.__smvGetPublicReviewsOnce(a);
 try{
  const items=await window.__smvGetPublicAstrologersOnce();
  if(!items.length){box.innerHTML='<div class="empty">No approved astrologers available yet.</div>';return;}
  box.innerHTML="";
  items.forEach(a=>{
    const row=document.createElement("article");
    row.className="smv-astro-directory-row";
    const photo=a.photoData||a.photoURL||a.photoUrl||"";
    const description=a.profileDescription||a.bio||a.about||"Professional astrologer";
    row.innerHTML=`<div class="smv-astro-directory-head">${photo?`<img loading="lazy" decoding="async" src="${escapeHtml(photo)}" alt="${escapeHtml(a.name||'Astrologer')} photo">`:''}<div><h3>${escapeHtml(a.name||"Astrologer")}</h3><p class="smv-astro-speciality"><b>${escapeHtml(a.expertise||a.specialization||"Astrology")}</b></p><p class="small">${escapeHtml(a.experience||"Experienced")} years experience</p></div></div><div class="smv-astro-rating-summary"><span class="smv-rating-loading">Loading ratings...</span></div><p class="smv-astro-description">${escapeHtml(description)}</p><button class="btn gray smv-review-toggle" type="button" aria-expanded="false">REVIEWS &amp; RATINGS</button><div class="smv-inline-reviews hidden"><div class="empty">Reviews will load when opened.</div></div>`;
    const btn=row.querySelector('.smv-review-toggle'),reviewBox=row.querySelector('.smv-inline-reviews'),summaryBox=row.querySelector('.smv-astro-rating-summary');
    let loaded=false,reviewsCache=null;
    const ensureReviews=async()=>{if(reviewsCache)return reviewsCache;reviewsCache=await getReviews(a);return reviewsCache;};
    const displayRating=reviews=>{const avg=reviews?ratingSummary(reviews).avg:clampRating(a.rating||a.averageRating);summaryBox.innerHTML=avg?`${ratingStars(avg)} <strong>${Number(avg.toFixed(1))}/5</strong>`:'<span class="smv-rating-none">No ratings yet</span>';};
    displayRating(null);
    btn.onclick=async()=>{
      const opening=reviewBox.classList.contains('hidden');
      reviewBox.classList.toggle('hidden',!opening);btn.setAttribute('aria-expanded',String(opening));
      btn.textContent=opening?'HIDE REVIEWS & RATINGS':'REVIEWS & RATINGS';
      if(!opening||loaded)return;
      reviewBox.innerHTML='<div class="empty">Loading reviews...</div>';
      try{
        const reviews=await ensureReviews();displayRating(reviews);
        reviewBox.innerHTML=reviews.length?reviews.map(r=>`<div class="smv-directory-review"><div class="stars">${ratingStars(r.rating)}</div><p>${escapeHtml(r.review||'Verified customer review')}</p><span class="smv-review-customer">${escapeHtml(r.customerName||r.name||'Verified customer')}</span></div>`).join(''):'<div class="empty">No approved reviews for this astrologer yet.</div>';
        loaded=true;
      }catch(err){console.error('Directory review load failed:',err);reviewBox.innerHTML='<div class="empty error">Reviews are temporarily unavailable.</div>';}
    };
    box.appendChild(row);
  });
 }catch(e){console.error("Approved astrologers load failed:",e);box.innerHTML='<div class="empty error">Approved astrologers are temporarily unavailable.</div>';}
}
window.__smvReloadAstrologers=loadAstroCards;
window.dispatchEvent(new Event('smv:app-ready'));
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
 const name=$("arName").value.trim(),mobile=$("arMobile").value.trim(),email=$("arEmail").value.trim(),password=$("arPassword").value,specialization=$("arSpecialization").value.trim(),experience=Number($("arExperience").value||0),languages=String($("arLanguages")?.value||"").split(/[,;|]/).map(v=>v.trim().replace(/\s+/g," ")).filter(Boolean),bio=$("arBio").value.trim(),bankName=$("arBankName").value.trim(),accountName=$("arAccountName").value.trim(),accountNumber=$("arAccountNumber").value.trim(),ifsc=$("arIfsc").value.trim(),upi=$("arUpi").value.trim(),photoFile=$("arPhoto").files[0];
 if(!name||!mobile||!email||password.length<6||!specialization||experience<0||!languages.length||languages.length>12||languages.some(v=>v.length>40)||languages.join(", ").length>240||!bio||!bankName||!accountName||!accountNumber||!ifsc||!photoFile){message("astroRegMsg",'<span class="error">Please complete all required fields.</span>');return;}
 btn.disabled=true;btn.textContent="CREATING ACCOUNT...";message("astroRegMsg",'<span class="small">Creating your account...</span>');
 smvRegistrationInProgress=true;
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
      body:JSON.stringify({name,mobile,specialization,experience,languages,bio,bankName,accountName,accountNumber,ifsc,upi,photoData,language:"en"})
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
  let text=err?.message||String(err);if(err?.code==="auth/invalid-email")text="Please enter a correct email ID.";else if(err?.code==="auth/email-already-in-use")text="This email is already registered. Please use Login instead.";else if(err?.code==="auth/operation-not-allowed")text="Email/Password registration is disabled in Firebase Authentication.";else if(err?.code==="auth/network-request-failed")text="Firebase network connection failed. Check your internet connection.";else if(err?.code==="permission-denied")text="Firestore permission denied. Check Firestore Rules.";message("astroRegMsg",'<span class="error"><b>Registration failed:</b> '+escapeHtml(text)+'</span>');btn.disabled=false;btn.textContent="SUBMIT REGISTRATION";
 }finally{
  smvRegistrationInProgress=false;
 }
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
  smvColdStartHomeLock=true;
  intentionalLogout=true; ++dashboardLoadSeq; dashboardLoadPromise=null; dashboardLoadUid=null; clearIdleTimer(); sessionStorage.removeItem('smv_last_activity');
  selectedAstro=null;
  try{await signOut(auth);}catch(e){console.warn("Logout failed",e);}
  currentUser=null;
  window.__smvCurrentUserPresent=false; window.__smvCurrentRole=null;
  window.__SMV_LOGGED_OUT=true;
  smvSyncHeaderAuthNav(null);
  setTimeout(()=>{if(!auth?.currentUser && $('authBtn')) $('authBtn').textContent='Login';},300);
  setTimeout(()=>{if(!auth?.currentUser && $('authBtn')) $('authBtn').textContent='Login';},1200);
  hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
  setHeaderRoleLabel('');
   hide('register-flow'); hide('astro-register-form'); hide('astro-flow'); hide('appointment'); hide('contact');
  showHomeSurface();
  show('smv-content-hub');
  show('english-horoscope'); window.__smvContentVisible=false;
  smvSyncHeaderAuthNav(null); closeModal(); window.scrollTo({top:0,behavior:'smooth'});
  window.__SMV_LOGGED_OUT=true;
  try{window.dispatchEvent(new Event('smv:logged-out'));}catch(_){ }
  if(reason) alert(reason);
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
function smvWatchDashboardEvents(role){smvStartLive(role);}
window.__smvRefreshDashboard=()=>{
 if(!currentUser)throw new Error('Please login again.');
 smvInternalView='dashboard';dashboardReadyAt=0;
 hidePrimarySections('dashboard');show('dashboard');show('dashboardContent');
 return loadDashboard(dashboardReadyRole||null,true);
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)smvLiveQueue?.resume();});
document.addEventListener('focusout',()=>setTimeout(()=>smvLiveQueue?.resume(),0));
window.addEventListener('smv:logged-out',()=>{smvStopLive();dashboardReadyUid=null;dashboardReadyRole=null;dashboardReadyAt=0;smvProfiles.clear();});
function smvCustomerBookingChatCardHtml(){
 return '<section class="card smv-customer-book-chat" id="smvCustomerBookChatCard" style="margin-top:16px" aria-labelledby="smvCustomerBookChatTitle">'+
 '<div class="grid" style="align-items:center;gap:14px"><div><span class="badge">CONSULTATION</span><h3 id="smvCustomerBookChatTitle" style="margin:8px 0">Consult an Astrologer</h3><p>Browse approved astrologers, compare each Astrologer’s Call and Chat rates per minute, and consult using your Wallet balance.</p></div>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="smvCustomerBookChat" type="button">CONSULT AN ASTROLOGER</button></div></div></section>';
}
function smvBindCustomerBookingChat(){
 const button=$('smvCustomerBookChat');
 if(!button)return;
 button.onclick=()=>{
  if(!currentUser||!auth?.currentUser){$('authBtn')?.click();return;}
  const role=String(window.__smvCurrentRole||'customer').toLowerCase();
  if(role!=='customer'){alert('Consult an Astrologer is available for Customer accounts. Please sign in with a Customer account.');return;}
  if(typeof window.__smvOpenBookingChat==='function'){window.__smvOpenBookingChat();return;}
  if(typeof window.__smvNavigatePublic==='function'){window.__smvNavigatePublic('private-consultation');return;}
  location.href='./?view=consult';
 };
}
function smvWalletDashboardCardHtml(){
 return '<section class="card smv-customer-wallet-card" id="smvCustomerWalletCard" style="margin-top:16px" aria-labelledby="smvWalletTitle">'+
 '<div class="grid" style="align-items:center;gap:14px"><div><span class="badge">CUSTOMER WALLET</span><h3 id="smvWalletTitle" style="margin:8px 0">My Wallet</h3><div class="small">Use your Wallet for Live Call, Live Chat and consultation charges.</div></div>'+
 '<div><div class="small">Available Balance</div><div id="smvWalletBalance" style="font-size:1.8rem;font-weight:800;margin:4px 0">Loading…</div><div class="small">Reserved: <b id="smvWalletReserved">₹0.00</b></div></div></div>'+
 '<div class="smv-wallet-bonus-summary" aria-live="polite"><div><span class="small">Bonus Free Minutes Available</span><strong id="smvWalletBonusMinutes">Loading…</strong></div><div><span class="small">Reserved for active / booked sessions</span><strong id="smvWalletBonusReserved">0 minutes</strong></div><p>These promotional minutes are used before paid minutes for eligible Live Call and Live Chat sessions.</p></div>'+
 '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px"><button class="btn" id="smvWalletRefresh" type="button">Refresh Wallet</button></div>'+
 '<form id="smvWalletRechargeForm" style="display:flex;flex-wrap:nowrap;align-items:stretch;gap:10px;margin-top:16px;width:100%;max-width:100%;box-sizing:border-box">'+
 '<label style="display:flex;flex:1 1 0%;flex-direction:column;gap:6px;min-width:0;width:50%"><b>Recharge amount (₹)</b><input id="smvWalletRechargeAmount" type="number" min="1" step="0.01" value="100" inputmode="decimal" required style="display:block;width:100%;min-width:0;height:46px;min-height:46px;max-height:46px;box-sizing:border-box"></label>'+
 '<div style="display:flex;flex:1 1 0%;flex-direction:column;gap:6px;min-width:0;width:50%"><b aria-hidden="true" style="visibility:hidden">Recharge amount (₹)</b><button class="btn" id="smvWalletRechargeButton" type="submit" style="display:block;width:100%;min-width:0;height:46px;min-height:46px;max-height:46px;margin-top:4px;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere">RECHARGE WALLET</button></div></form>'+
 '<div id="smvWalletMessage" class="small" role="status" aria-live="polite" style="margin-top:10px">Loading Wallet details…</div>'+
 '<div style="margin-top:18px"><h4 style="margin-bottom:8px">Recent Wallet Transactions</h4><div id="smvWalletTransactions"><div class="small">Loading transactions…</div></div></div></section>';
}
function smvRenderFastDashboardShell(roleValue=''){
 const box=$('dashboardContent');if(!box)return;
 const role=String(roleValue||'').toLowerCase();
 const user=currentUser||auth?.currentUser;
 if(role==='customer'){
  const name=[user?.displayName].map(value=>String(value||'').trim()).find(Boolean)||'Customer';
  box.innerHTML='<div class="grid"><div class="card"><span class="badge">CUSTOMER</span><h3>Welcome, <span class="smv-dashboard-name">'+escapeHtml(name)+'</span></h3><p>Your dashboard is ready.</p></div></div>'+smvCustomerBookingChatCardHtml()+smvWalletDashboardCardHtml();
  smvBindCustomerBookingChat();
  smvBindCustomerWallet({load:false});
  return;
 }
 if(role==='astrologer'){
  box.innerHTML='<div class="card smv-dashboard-fast-shell"><span class="badge">ASTROLOGER</span></div>';
  return;
 }
 box.innerHTML='<div class="card smv-dashboard-fast-shell"><span class="badge">SMV ASTRO</span></div>';
}
function smvWalletMoney(paise){
 const n=Number(paise);
 const safe=Number.isSafeInteger(n)&&n>=0?n:0;
 return '₹'+(safe/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function smvWalletNewRequestKey(){
 const random=(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 return 'smv-wallet-recharge-'+random;
}
function smvWalletSetMessage(message,kind='info'){
 const el=$('smvWalletMessage');
 if(!el)return;
 el.className='small'+(kind==='error'?' error':kind==='success'?' success':'');
 el.textContent=String(message||'');
}
async function smvLoadCustomerWallet(){
 const card=$('smvCustomerWalletCard');
 if(!card)return;
 const refresh=$('smvWalletRefresh'),balance=$('smvWalletBalance'),reserved=$('smvWalletReserved'),bonus=$('smvWalletBonusMinutes'),bonusReserved=$('smvWalletBonusReserved'),host=$('smvWalletTransactions');
 if(refresh)refresh.disabled=true;
 if(balance)balance.textContent='Loading…';
 if(bonus)bonus.textContent='Loading…';
 if(bonusReserved)bonusReserved.textContent='Loading…';
 if(host)host.innerHTML='<div class="small">Loading transactions…</div>';
 try{
  // Load the actual balance first. A failed ledger query must never block it.
  const walletResult=await renderApi('/wallet',{method:'GET',timeoutMs:90000});
  const wallet=walletResult?.wallet||{};
  if(!walletResult?.success||!walletResult.wallet)throw new Error(walletResult?.error||'The backend did not return Wallet balance.');
  if(wallet.ownerRole&&String(wallet.ownerRole).toLowerCase()!=='customer')throw new Error('The signed-in account is not a Customer Wallet owner.');
  const availablePaise=Number.isSafeInteger(Number(wallet.availableBalancePaise))?Number(wallet.availableBalancePaise):Math.round(Number(wallet.availableBalance||0)*100);
  const reservedPaise=Number.isSafeInteger(Number(wallet.reservedBalancePaise))?Number(wallet.reservedBalancePaise):Math.round(Number(wallet.reservedBalance||0)*100);
  if(balance)balance.textContent=smvWalletMoney(availablePaise);
  if(reserved)reserved.textContent=smvWalletMoney(reservedPaise);
  const bonusMinutes=Number.isSafeInteger(Number(wallet.bonusMinutesBalance))&&Number(wallet.bonusMinutesBalance)>=0?Number(wallet.bonusMinutesBalance):0;
  const reservedBonusMinutes=Number.isSafeInteger(Number(wallet.reservedBonusMinutes))&&Number(wallet.reservedBonusMinutes)>=0?Number(wallet.reservedBonusMinutes):0;
  if(bonus)bonus.textContent=bonusMinutes+' '+(bonusMinutes===1?'minute':'minutes');
  if(bonusReserved)bonusReserved.textContent=reservedBonusMinutes+' '+(reservedBonusMinutes===1?'minute':'minutes');
  let transactionError=null;
  try{
   const transactionResult=await renderApi('/wallet/transactions?limit=10',{method:'GET'});
   const transactions=Array.isArray(transactionResult?.transactions)?transactionResult.transactions:[];
   if(host){
    host.innerHTML=transactions.length?transactions.map(t=>{
     const credit=String(t.direction||'').toLowerCase()==='credit';
     const amount=Number.isSafeInteger(Number(t.amountPaise))?Number(t.amountPaise):Math.round(Number(t.amount||0)*100);
     const label=String(t.type||'transaction').replace(/_/g,' ');
     const when=t.createdAt?smvDateTime(t.createdAt):'Date unavailable';
     const status=String(t.status||'posted');
     return '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(128,128,128,.22)"><div style="min-width:0"><b>'+escapeHtml(label)+'</b><div class="small">'+escapeHtml(when)+' · '+escapeHtml(status)+'</div>'+(t.note?'<div class="small">'+escapeHtml(t.note)+'</div>':'')+(t.balanceAfterPaise!=null?'<div class="small">Balance after: '+smvWalletMoney(t.balanceAfterPaise)+'</div>':'')+'</div><b class="smv-wallet-transaction-amount '+(credit?'success':'error')+'" style="white-space:nowrap">'+(credit?'+':'−')+smvWalletMoney(amount)+'</b></div>';
    }).join(''):'<div class="empty">No Wallet transactions yet.</div>';
   }
  }catch(error){
   transactionError=error;
   console.warn('Customer Wallet balance loaded; transaction history unavailable:',error);
   if(host)host.innerHTML='<div class="empty error">Wallet balance is available, but recent transactions could not be loaded. Use Refresh Wallet to retry.</div>';
  }
  if(transactionError)smvWalletSetMessage('Wallet balance loaded. Recent transaction history is temporarily unavailable.','info');
  else smvWalletSetMessage('Wallet balance and transaction history updated.','success');
 }catch(error){
  console.error('Customer Wallet load failed:',error);
  if(balance)balance.textContent='Unavailable';
  if(reserved)reserved.textContent='—';
  if(bonus)bonus.textContent='—';
  if(bonusReserved)bonusReserved.textContent='—';
  if(host)host.innerHTML='<div class="small">Wallet transactions are temporarily unavailable. Refresh to retry.</div>';
  smvWalletSetMessage('Unable to load Wallet balance: '+(error?.message||String(error)),'error');
 }finally{
  if(refresh&&document.contains(refresh))refresh.disabled=false;
 }
}
function smvBindCustomerWallet({load=true}={}){
 if(!$('smvCustomerWalletCard'))return;
 const refresh=$('smvWalletRefresh');
 if(refresh)refresh.onclick=()=>smvLoadCustomerWallet();
 const form=$('smvWalletRechargeForm');
 const submit=$('smvWalletRechargeButton');
 if(form){
  const originalButtonLabel=submit?.textContent||'RECHARGE WALLET';
  let rechargeInFlight=false;
  ensureRazorpayCheckout().catch(error=>console.warn('Razorpay Checkout preload failed; click-to-retry remains available:',error?.message||error));
  let requestKey=smvWalletNewRequestKey();
  let requestAmount='';
  form.onsubmit=async event=>{
   event.preventDefault();
   if(rechargeInFlight)return;
   if(!currentUser||!auth?.currentUser){smvWalletSetMessage('Please log in again before recharging.','error');return;}
   const input=$('smvWalletRechargeAmount');
   const amount=String(input?.value||'').trim();
   if(!/^\d+(?:\.\d{1,2})?$/.test(amount)||!Number.isFinite(Number(amount))||Number(amount)<1){
    smvWalletSetMessage('Enter a valid recharge amount of at least ₹1.00, using up to two decimal places.','error');return;
   }
   if(requestAmount!==amount){requestKey=smvWalletNewRequestKey();requestAmount=amount;}
   rechargeInFlight=true;
   let verificationInProgress=false;
   const releaseButton=()=>{
    rechargeInFlight=false;
    if(submit&&document.contains(submit)){submit.disabled=false;submit.textContent=originalButtonLabel;}
   };
   if(submit){submit.disabled=true;submit.textContent='CONNECTING TO PAYMENT…';}
   smvWalletSetMessage('Connecting securely and preparing your Wallet recharge…');
   try{
    const checkoutReadyPromise=ensureRazorpayCheckout().then(value=>({value}),error=>({error}));
    const order=await renderApi('/wallet/recharge/create-order',{
     method:'POST',timeoutMs:90000,body:JSON.stringify({amount,idempotencyKey:requestKey})
    });
    if(order?.alreadyPaid){
     smvWalletSetMessage('This recharge was already paid. Refreshing the Wallet balance.','success');
     requestKey=smvWalletNewRequestKey();requestAmount='';
     await smvLoadCustomerWallet();
     smvWalletSetMessage('Wallet balance refreshed. No second payment is required.','success');
     releaseButton();return;
    }
    const checkoutReady=await checkoutReadyPromise;
    if(checkoutReady?.error)throw checkoutReady.error;
    const checkoutWindow=checkoutReady?.value;
    const RazorpayCtor=checkoutWindow?.Razorpay||window.Razorpay;
    if(typeof RazorpayCtor!=='function')throw new Error('Razorpay Checkout did not finish initializing. Please retry.');
    if(!order?.rechargeId||!order?.orderId||!order?.keyId)throw new Error('The backend did not return a complete Wallet recharge order.');
    smvWalletSetMessage('Recharge order ready. Opening secure Razorpay Checkout…');
    const checkout=new RazorpayCtor({
     key:order.keyId,amount:Number(order.amount),currency:String(order.currency||'INR'),
     name:'SMV ASTRO',description:'Customer Wallet Recharge',order_id:order.orderId,
     handler:async paymentResponse=>{
      verificationInProgress=true;
      try{
       smvWalletSetMessage('Payment response received. Verifying securely before crediting your Wallet…');
       const verificationPayload={rechargeId:order.rechargeId,...paymentResponse};
       let verified=null,lastVerificationError=null;
       for(let attempt=0;attempt<3;attempt++){
        try{
         verified=await renderApi('/wallet/recharge/verify',{method:'POST',timeoutMs:90000,body:JSON.stringify(verificationPayload)});
         lastVerificationError=null;break;
        }catch(error){
         lastVerificationError=error;
         const status=Number(error?.status||0),reason=String(error?.message||error||'');
         const retryable=[408,425,429,500,502,503,504].includes(status)||
          (!status&&/timed out|failed to fetch|fetch failed|network|temporarily unavailable|aborted/i.test(reason))||
          (status===409&&/capture is pending/i.test(reason));
         if(!retryable||attempt===2)throw error;
         smvWalletSetMessage('Payment was received. Checking the same transaction again; do not pay again ('+(attempt+1)+'/2)…');
         await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
        }
       }
       if(!verified?.verified)throw lastVerificationError||new Error('The backend has not confirmed this payment as verified. Do not pay again; refresh Wallet or contact support.');
       requestKey=smvWalletNewRequestKey();requestAmount='';
       await smvLoadCustomerWallet();
       const bonusMinutesCredited=Number.isSafeInteger(Number(verified.bonusMinutesCredited))&&Number(verified.bonusMinutesCredited)>0?Number(verified.bonusMinutesCredited):0;
       smvWalletSetMessage('Payment Successful — recharge verified. Cash Wallet balance: '+smvWalletMoney(Math.round(Number(verified.availableBalance||0)*100))+'.'+(bonusMinutesCredited?' '+bonusMinutesCredited+' bonus free minute(s) added.':' No bonus-minute offer applied.'),'success');
      }catch(error){
       smvWalletSetMessage('Payment returned but server verification is not confirmed: '+(error?.message||String(error))+'. Do not pay again until this transaction is checked.','error');
      }finally{verificationInProgress=false;releaseButton();}
     },
     modal:{ondismiss:()=>setTimeout(()=>{
      if(verificationInProgress)return;
      smvWalletSetMessage('Checkout closed. If payment completed, refresh Wallet before starting another recharge.');
      releaseButton();
     },250)}
    });
    checkout.on('payment.failed',failure=>{
     const reason=failure?.error?.description||failure?.error?.reason||'Payment was not completed.';
     smvWalletSetMessage('Payment Failed / not confirmed: '+reason+'. Wallet credit requires server verification.','error');
     releaseButton();
    });
    checkout.open();
    if(submit&&document.contains(submit))submit.textContent='WAITING FOR PAYMENT…';
    smvWalletSetMessage('Razorpay Checkout is opening. Complete payment in the secure payment window.');
   }catch(error){
    smvWalletSetMessage('Unable to start Wallet recharge: '+(error?.message||String(error)),'error');
    releaseButton();
   }
  };
 }
 if(load)smvLoadCustomerWallet();
}
window.addEventListener('smv:wallet-updated',()=>{
 if(currentUser&&auth?.currentUser?.uid===currentUser.uid){
  smvLoadCustomerWallet().catch(error=>smvWalletSetMessage('Wallet refresh failed after a Call/Chat action: '+(error?.message||String(error)),'error'));
 }
});
async function loadDashboard(expectedRole=null,force=false,background=false){
 const box=$('dashboardContent');
 if(!currentUser){ if(box) box.innerHTML='<div class="card">Please login to continue.</div>'; return; }
 const loadUid=currentUser.uid;
 const requestedRole=String(expectedRole||'').toLowerCase();
 // Reuse an already-rendered Dashboard unless a data-changing action explicitly requests a refresh.
 if(!force && !smvDashboardDirty && dashboardReadyAt>0 && dashboardReadyUid===loadUid && (!requestedRole || dashboardReadyRole===requestedRole) && smvInternalView==='dashboard' && box && !box.querySelector('.error')){
   // Navigation may have rebuilt the fast shell while preserving Dashboard readiness.
   // The shell deliberately skips its own Wallet read; hydrate the new Wallet DOM
   // before returning through this cache path, otherwise it stays at "Loading…".
   const walletBalance=$('smvWalletBalance');
   if(dashboardReadyRole==='customer' && $('smvCustomerWalletCard') && String(walletBalance?.textContent||'').trim().toLowerCase().startsWith('loading')){
     void smvLoadCustomerWallet();
   }
   show('dashboard');
   touchSession();
   armIdleTimer();
   return;
 }
 // Deduplicate concurrent first-load requests before incrementing the load sequence.
 // This prevents auth and navigation work from invalidating each other.
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
  if(box && active() && dashboardReadyUid!==loadUid && !box.innerHTML.trim())smvRenderFastDashboardShell(requestedRole);
  const shouldPreloadAstroProfile=requestedRole==='astrologer'||smvCachedDashboardRole(loadUid)==='astrologer'||String(window.__smvCurrentRole||'').toLowerCase()==='astrologer';
  const readAstrologerProfile=()=>withTimeout(getDoc(doc(db,'smv_astrologers',loadUid)),10000)
   .then(snapshot=>({snapshot}),error=>({error}));
  const astrologerProfilePromise=shouldPreloadAstroProfile?readAstrologerProfile():null;
  const astrologerEarningsPromise=astrologerProfilePromise
   ?astrologerProfilePromise.then(profileResult=>{
      const status=String(profileResult.snapshot?.data()?.status||'').toLowerCase();
      if(!profileResult.snapshot?.exists()||!['active','approved'].includes(status))return null;
      return renderApi('/astrologer/earnings',{method:'GET'}).then(value=>({value}),error=>({error}));
    }).catch(error=>({error}))
   :null;
  let astrologerProfileResult=null;
  const data=await getUserProfile(loadUid);
  if(!active()) return;
   let role=String(expectedRole||data.role||'').toLowerCase();
   let preloadedAstro={};
   if(!expectedRole && role!=='astrologer'){
     astrologerProfileResult=astrologerProfilePromise?await astrologerProfilePromise:await readAstrologerProfile();
     if(!active())return;
     const a0=astrologerProfileResult.snapshot;
     if(a0?.exists()){preloadedAstro=a0.data()||{};role='astrologer';}
     else if(astrologerProfileResult.error)console.warn('Astrologer role profile lookup deferred:',astrologerProfileResult.error?.message||astrologerProfileResult.error);
   }
   if(role!=='customer' && role!=='astrologer') role='customer';
   if(!active()) return;
   // Keep one stable dashboard heading during loading and after role resolution.
   // The role is already shown by the role badge/content; changing the heading
   // during async loading makes Customer/Astrologer dashboards appear to
   // interact or flash before the final dashboard is rendered.
   $('dashboardTitle').textContent=role==='astrologer'?'ASTROLOGER DASHBOARD':'CUSTOMER DASHBOARD';
   if(role==='astrologer'){
   let ad=preloadedAstro||{};
let astroProfileReadFailed=!!data._smvProfileReadFailed;
const profileResult=astrologerProfileResult||(astrologerProfilePromise?await astrologerProfilePromise:await readAstrologerProfile());
astrologerProfileResult=profileResult;
if(!active())return;
if(profileResult.snapshot?.exists()){
  ad=profileResult.snapshot.data()||{};
  astroProfileReadFailed=false;
}else if(profileResult.error){
  astroProfileReadFailed=true;
  console.warn('Astrologer profile load skipped:',profileResult.error?.message||profileResult.error);
}else if(data._smvProfileReadFailed){
  astroProfileReadFailed=true;
}

// If the profile is unavailable, preserve the known role without guessing approval status.
if(data._smvProfileReadFailed&&astroProfileReadFailed&&!Object.keys(ad).length){
  box.innerHTML='<div class="card smv-dashboard-fast-shell"><span class="badge">ASTROLOGER</span><button class="btn gray" id="smvAstroDataRetry" type="button">REFRESH DASHBOARD</button></div>';
  $('smvAstroDataRetry')?.addEventListener('click',()=>{
    smvProfiles.delete(loadUid);
    loadDashboard('astrologer',true).catch(error=>console.warn('Astrologer Dashboard refresh deferred:',error?.message||error));
  });
  dashboardReadyUid=loadUid;dashboardReadyRole=role;dashboardReadyAt=Date.now();
  smvWatchDashboardEvents(role);
  return;
}
let userStatus=String(
  data.status||ad.status||'pending'
).toLowerCase();
let astroStatus=String(ad.status||data.status||'pending').toLowerCase();

   // A directory-visible approved record may be a legacy/duplicate document
   // while this dashboard reads the UID-keyed document. Reconcile only when the
   // local state is pending; the server confirms an existing approved record
   // before synchronizing the canonical profile and user status.
   if(!['active','approved','rejected','declined','admin_rejected'].includes(astroStatus)){
     try{
       const sync=await renderApi('/astrologer/sync-approval',{method:'POST',body:JSON.stringify({})});
       if(!active())return;
       if(sync?.approved===true){
         const refreshed=await withTimeout(getDoc(doc(db,'smv_astrologers',loadUid)),10000).catch(()=>null);
         if(!active())return;
         if(refreshed?.exists())ad={...ad,...(refreshed.data()||{})};
         ad={...ad,uid:loadUid,role:'astrologer',status:'approved',pricePerQuestion:sync.pricePerQuestion??ad.pricePerQuestion};
         data.status='active';data.role='astrologer';
         userStatus='active';astroStatus='approved';
       }
     }catch(syncError){console.warn('Astrologer approval status refresh deferred:',syncError?.message||syncError);}
   }
 
   if(!['active','approved'].includes(astroStatus)){
  const astroId=data.publicId||ad.publicId||'';
  const isRejected=['rejected','declined','admin_rejected'].includes(astroStatus);

  if(isRejected){
    const rejectionReason=ad.rejectionReason||data.rejectionReason||'Your astrologer application was rejected by Admin.';
    if(!active())return;
    if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
    box.innerHTML=`<div class="card" style="max-width:900px;margin:0 auto">
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
    box.innerHTML=`<div class="card" style="max-width:900px;margin:0 auto">${pendingContent}<div class="action-row"><button class="btn gray" id="astroRefreshApproval">REFRESH STATUS</button><button class="btn" id="astroLogoutPending">LOGOUT</button></div></div>`;
  }

  $('astroRefreshApproval')?.addEventListener('click',()=>loadDashboard('astrologer',true));
  $('astroLogoutPending')?.addEventListener('click',()=>logoutToHome());
  dashboardReadyUid=loadUid;dashboardReadyRole=role;dashboardReadyAt=Date.now();smvWatchDashboardEvents(role);
  return;
}
   // Keep slow earnings/history reads off the first full Dashboard render path.
   const earningsResultPromise=(async()=>{
    let result=astrologerEarningsPromise?await astrologerEarningsPromise:null;
    if(!result)result=await renderApi('/astrologer/earnings',{method:'GET'}).then(value=>({value}),error=>({error}));
    return result;
   })();
   let epRemote=null;
   let totalEarnings=0;
   let ledger=[];
   let withdrawalSnap={docs:[]};
   let reservedWithdrawals=0;
   let totalWithdrawals=0;
   let latestWithdrawalAt=null;
   const minimumWithdrawal=300;
   const WITHDRAWAL_COOLDOWN_MS=7*24*60*60*1000;
   let availableToWithdraw=0;
   let withdrawalCooldownActive=false;
   let withdrawalEligible=false;
   let withdrawalCooldownEndsAt=null;
   let ep={totalEarnings,totalWithdrawals,availableToWithdraw,minimumWithdrawal,withdrawalCooldownActive,withdrawalCooldownEndsAt,withdrawalEligible,ledger};
   if(!active()) return;
   if(!active())return;
   if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
   const availabilityStatus=["online","busy","offline"].includes(String(ad.availabilityStatus||"").toLowerCase())?String(ad.availabilityStatus).toLowerCase():"offline";
   const rawLanguages=ad.languages??ad.spokenLanguages??ad.language??data.languages??data.spokenLanguages??data.language??[];
   const astrologerLanguages=(Array.isArray(rawLanguages)?rawLanguages:String(rawLanguages||"").split(/[,;|]/)).map(v=>String(v||"").trim()).filter(Boolean);
   const astroDisplayName=smvLiveName(ad.name,ad.fullName,ad.displayName,ad.astrologerName,data.name,data.fullName,data.displayName,data.astrologerName,currentUser.displayName)||"Astrologer";
   box.innerHTML=`<div class="smv-astrologer-dashboard"><div class="grid astro-dashboard-summary">
    <div class="card astro-profile-summary-card">
      <div class="astro-profile-photo">${ad.photoData?`<img src="${ad.photoData}" alt="${escapeHtml(astroDisplayName)}" loading="lazy">`:''}</div>
      <div class="astro-profile-info">
        <h3><span class="smv-dashboard-name">${escapeHtml(astroDisplayName)}</span></h3>
        <p>${['approved','active'].includes(String(ad.status||data.status||'').toLowerCase()) ? '<span class="smv-approved-badge"><span class="smv-check">✓</span><span>Approved</span></span>' : '<b>Status:</b> ' + escapeHtml(ad.status||'pending')}</p>
        <p class="smv-astro-profile-value">${escapeHtml(ad.expertise||ad.specialization||'Astrology')}</p>
        <p class="smv-astro-profile-value">${escapeHtml(ad.experience||0)} years experience</p>
        <p class="astro-profile-bio">${escapeHtml(ad.bio||ad.about||'')}</p>
        <p class="small"><b>Languages:</b> ${escapeHtml(astrologerLanguages.length?astrologerLanguages.join(', '):'Not specified in profile')}</p>
        <div id="smvLiveDashboardMount" style="margin-top:12px"></div>
      </div>
    </div>
    <div class="card"><h3>Total Earnings</h3><p style="font-size:28px"><span id="smvAstroTotalEarnings" class="smv-earnings-total">Loading…</span></p><p><span class="smv-summary-label">Total Withdrawal:</span> <span id="smvAstroTotalWithdrawal" class="smv-summary-value">Loading…</span></p><p><span class="smv-summary-label">Available to Withdraw:</span> <span id="smvAstroAvailableWithdrawal" class="smv-summary-value">Loading…</span></p><p><span class="smv-summary-label">Minimum withdrawal:</span> <span id="smvAstroMinimumWithdrawal" class="smv-summary-value">₹300.00</span></p><div id="smvAstroWithdrawalStatus" class="small" aria-live="polite">Checking withdrawal eligibility…</div><button class="btn smv-withdraw-btn is-red" id="withdrawBtn" type="button" disabled>WITHDRAW</button></div>
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
   <div class="card" style="margin-top:16px"><h3>Earnings History</h3><div id="smvAstroEarningsHistory" class="small" aria-live="polite">Loading earnings history…</div><div class="withdrawal-history-section" style="margin-top:14px;padding-top:10px;border-top:1px solid #eee"><h4 style="margin:0 0 8px">Withdrawal History</h4><div id="smvAstroWithdrawalHistory" class="small" aria-live="polite">Loading withdrawal history…</div></div></div>
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
  // Legacy Private Consultation panel removed from the Astrologer Dashboard; Live Call / Chat is the consultation entry point.

  if($('withdrawBtn')) $('withdrawBtn').onclick = async () => {

  if(!currentUser){
    alert('Please login again.');
    return;
  }

  try {

    // Phase 1: the dashboard already loaded and server-validated earnings +
    // withdrawals. Reuse that snapshot for the modal instead of re-reading the
    // same Firestore collections on every WITHDRAW click. The POST endpoint
    // revalidates balance and cooldown before creating a withdrawal.
    const totalEarnings = Number(ep.totalEarnings || 0);
    const totalWithdrawals = Number(ep.totalWithdrawals || 0);
    const available = Number(ep.availableToWithdraw || 0);
    const min = Number(ep.minimumWithdrawal || 300);
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const cooldownActive = ep.withdrawalCooldownActive === true;
    const latestWithdrawalAt = cooldownActive && ep.withdrawalCooldownEndsAt ? Number(ep.withdrawalCooldownEndsAt) - cooldownMs : null;
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
   // Hydrate earnings only after the profile, Live Call/Chat mount and the
   // rest of the Astrologer Dashboard are already visible.
   earningsResultPromise.then(async earningsRead=>{
    if(!active()||!$('smvAstroTotalEarnings'))return;
    try{
     if(earningsRead?.error)throw earningsRead.error;
     epRemote=earningsRead?.value||null;
     if(!epRemote)throw new Error('Astrologer earnings endpoint returned no data.');
    }catch(e){
     epRemote=null;
     console.warn('Astrologer earnings hydration deferred:',e?.message||e);
    }
    let withdrawalItems=Array.isArray(epRemote?.withdrawals)?epRemote.withdrawals:[];
    let withdrawalHistoryAvailable=!!epRemote;
    if(!epRemote){
     try{
      const ws=await getDocs(query(collection(db,'smv_withdrawals'),where('astrologerId','==',currentUser.uid)));
      if(!active())return;
      withdrawalItems=ws.docs.map(d=>({id:d.id,...(d.data()||{})}));
      withdrawalHistoryAvailable=true;
     }catch(fallbackErr){
      console.warn('Astrologer withdrawals fallback unavailable:',fallbackErr?.message||fallbackErr);
      withdrawalHistoryAvailable=false;
     }
    }
    withdrawalSnap={docs:withdrawalItems.map(w=>({id:String(w.id||''),data:()=>w}))};
    totalEarnings=Number(epRemote?.totalEarnings||0);
    ledger=smvSortDashboardDesc(Array.isArray(epRemote?.ledger)?epRemote.ledger:[]);
    reservedWithdrawals=0;
    totalWithdrawals=0;
    latestWithdrawalAt=null;
    withdrawalSnap.docs.forEach(d=>{
     const w=d.data()||{};
     const st=String(w.status||'pending').toLowerCase();
     const amount=Number(w.amount||0);
     if(['pending','processing','paid'].includes(st)){
      reservedWithdrawals+=amount;
      totalWithdrawals+=amount;
      const raw=w.createdAt||w.requestedAt||w.paidAt||null;
      const ms=smvDateSortMs(raw);
      if(ms&&(!latestWithdrawalAt||ms>latestWithdrawalAt))latestWithdrawalAt=ms;
     }
    });
    availableToWithdraw=epRemote?Math.max(0,Math.round((totalEarnings-reservedWithdrawals)*100)/100):0;
    withdrawalCooldownActive=!!latestWithdrawalAt&&(Date.now()-latestWithdrawalAt<WITHDRAWAL_COOLDOWN_MS);
    withdrawalEligible=!!epRemote&&availableToWithdraw>=minimumWithdrawal&&!withdrawalCooldownActive;
    withdrawalCooldownEndsAt=withdrawalCooldownActive?latestWithdrawalAt+WITHDRAWAL_COOLDOWN_MS:null;
    ep={totalEarnings,totalWithdrawals,availableToWithdraw,minimumWithdrawal,withdrawalCooldownActive,withdrawalCooldownEndsAt,withdrawalEligible,ledger};
    if(!active()||!$('smvAstroTotalEarnings'))return;
    const earningsTotalNode=$('smvAstroTotalEarnings');
    const totalWithdrawalNode=$('smvAstroTotalWithdrawal');
    const availableWithdrawalNode=$('smvAstroAvailableWithdrawal');
    const minimumWithdrawalNode=$('smvAstroMinimumWithdrawal');
    const withdrawalStatusNode=$('smvAstroWithdrawalStatus');
    const withdrawButton=$('withdrawBtn');
    if(epRemote){
     earningsTotalNode.textContent='₹'+Number(ep.totalEarnings||0).toFixed(2);
     earningsTotalNode.classList.toggle('is-green',Number(ep.totalEarnings||0)>=300);
     if(totalWithdrawalNode)totalWithdrawalNode.textContent='₹'+Number(ep.totalWithdrawals||0).toFixed(2);
     if(availableWithdrawalNode)availableWithdrawalNode.textContent='₹'+Number(ep.availableToWithdraw||0).toFixed(2);
     if(withdrawalStatusNode){
      if(ep.withdrawalCooldownActive){
       withdrawalStatusNode.innerHTML='<p class="smv-withdraw-locked"><b>🔒 Withdrawal locked for 7 days after the last withdrawal request.</b><br><span class="small">Available again: '+escapeHtml(smvDateTime(new Date(ep.withdrawalCooldownEndsAt)))+'</span></p>';
      }else if(ep.withdrawalEligible){
       withdrawalStatusNode.innerHTML='<p class="smv-withdraw-ready"><b>✓ You can withdraw</b></p>';
      }else{
       withdrawalStatusNode.innerHTML='<p class="smv-withdraw-locked"><b>Reach ₹300 to request a withdrawal.</b></p>';
      }
     }
    }else{
     earningsTotalNode.textContent='Unavailable';
     if(totalWithdrawalNode)totalWithdrawalNode.textContent=withdrawalHistoryAvailable?'₹'+Number(ep.totalWithdrawals||0).toFixed(2):'Unavailable';
     if(availableWithdrawalNode)availableWithdrawalNode.textContent='Unavailable';
     if(withdrawalStatusNode)withdrawalStatusNode.innerHTML='<p class="error">Earnings are temporarily unavailable. Tap REFRESH DASHBOARD to retry.</p>';
    }
    if(minimumWithdrawalNode)minimumWithdrawalNode.textContent='₹'+Number(minimumWithdrawal||300).toFixed(2);
    if(withdrawButton){
     withdrawButton.disabled=!ep.withdrawalEligible;
     withdrawButton.className='btn smv-withdraw-btn '+(ep.withdrawalEligible?'is-green':'is-red');
    }
    const earningsHistoryNode=$('smvAstroEarningsHistory');
    if(earningsHistoryNode){
     earningsHistoryNode.innerHTML=epRemote
      ?(ledger.length?ledger.slice(0,50).map(x=>'<div class="smv-history-row" style="padding:10px 0;border-bottom:1px solid #eee"><div class="smv-history-amount"><b>₹'+Number(x.commission||0).toFixed(2)+'</b> · <span class="success">Earning Credited</span></div><div class="smv-history-content">'+escapeHtml(x.question||'Consultation')+'</div><div class="smv-history-detail"><b>Date & Time:</b> '+escapeHtml(smvDateTime(x.date))+'</div><div class="smv-history-detail"><b>Session / Booking ID:</b> '+escapeHtml(x.id||'')+'</div></div>').join('')
        :'<div class="empty">No credited earnings yet.</div>')
      :'<div class="empty">Earnings history is temporarily unavailable.</div>';
    }
    const withdrawalHistoryNode=$('smvAstroWithdrawalHistory');
    if(withdrawalHistoryNode){
     withdrawalHistoryNode.innerHTML=withdrawalHistoryAvailable
      ?(withdrawalSnap.docs.length?smvSortDashboardDesc(withdrawalSnap.docs).slice(0,20).map(d=>{
        const w=d.data()||{};
        const st=String(w.status||'pending').toLowerCase();
        const cls=st==='paid'?'success':st==='rejected'?'error':st==='processing'?'small':'small';
        const label=st==='paid'?'Paid':st==='processing'?'Processing':st==='rejected'?'Rejected':'Pending';
        return '<div class="smv-history-row smv-withdrawal-row" style="padding:10px 0;border-bottom:1px solid #eee"><div class="smv-history-amount"><b>₹'+Number(w.amount||0).toFixed(2)+'</b> · <span class="'+cls+'">'+label+'</span></div><div class="smv-history-detail"><b>Withdrawal ID:</b> '+escapeHtml(w.withdrawalId||'—')+'</div>'+(st==='paid'&&/^(?:smvpt-|smv-pmt-)/i.test(String(w.adminPaymentId||''))?'<div class="small"><b>Admin Payment ID:</b> '+escapeHtml(w.adminPaymentId)+'</div>':'')+'<div class="small"><b>Requested:</b> '+escapeHtml(smvDateTime(w.createdAt||w.requestedAt))+(st==='paid'&&w.paidAt?'<br><b>Paid Date & Time:</b> '+escapeHtml(smvDateTime(w.paidAt)):'')+'</div></div>';
       }).join('')
       :'<div class="small">No withdrawal requests yet.</div>')
      :'<div class="small">Withdrawal history is temporarily unavailable.</div>';
    }
   }).catch(error=>console.warn('Astrologer earnings UI refresh skipped:',error?.message||error));
  } else {
   const customerDisplayName=[data.name,data.fullName,data.displayName,data.firstName,data.customerName,data.customer_name,data.profileName,currentUser.displayName]
    .map(v=>String(v||'').trim()).find(v=>v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))||'Customer';
   window.__smvCustomerProfileName=customerDisplayName;
   if(!active())return;
   if(background&&smvEditing("dashboard")){smvLiveQueue?.request();return;}
   box.innerHTML=`<div class="grid"><div class="card"><span class="badge">CUSTOMER</span><h3>Welcome, <span class="smv-dashboard-name">${escapeHtml(customerDisplayName)}</span></h3><p><b>Email verification:</b> ${currentUser.emailVerified?'<span class="smv-verified-badge customer-profile-result"><span class="smv-check">✓</span>Verified</span>':'<span class="customer-profile-result">Pending from registration</span>'}</p><p><b>Mobile:</b> <span class="customer-profile-result">Private</span></p></div></div>
   ${smvCustomerBookingChatCardHtml()}
   ${smvWalletDashboardCardHtml()}`;
   smvBindCustomerBookingChat();
   smvBindCustomerWallet({load:false});
   // The fast shell only binds handlers. Load real balance/minutes after this
   // final Customer Dashboard DOM has mounted, so the request updates live nodes.
   void smvLoadCustomerWallet();
  }
  // Mount the Live Call/Chat panel only after the role-specific Dashboard DOM exists.
  // Without this call, the render helpers are defined but the controls never enter the DOM.
  if(role==='customer'||role==='astrologer')smvLiveBindDashboard(role);
  if(!active())return;
  dashboardReadyUid=loadUid; dashboardReadyAt=Date.now(); smvDashboardDirty=false;
  dashboardReadyRole=role; smvWatchDashboardEvents(role);
  smvLiveStatus('Updated just now');
  const refresh=$('smvRefreshDashboard');if(refresh)refresh.textContent='Refresh';
  touchSession();
  armIdleTimer();
 }catch(e){
   if(!active()) return;
   console.error('Dashboard data refresh deferred:',e);
   // Preserve the fast shell or previous Dashboard content for the next refresh.
   if(!box?.innerHTML?.trim())smvRenderFastDashboardShell(expectedRole||smvCachedDashboardRole(loadUid));
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
// ---------- SMV ASTRO Blog (isolated feature) ----------
// Cloudinary stores Blog text (JSON), cover images, PDFs and videos. Firestore keeps lightweight metadata/index fields.
// Existing Horoscope, Login, Wallet and Live Session flows remain independent.
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
let smvPublishedContentItems=null,smvPublishedContentRequest=null,smvPublicContentRendered=false;
async function smvGetPublishedContent(force=false){
  if(force){smvPublishedContentItems=null;smvPublishedContentRequest=null;}
  if(smvPublishedContentItems)return smvPublishedContentItems;
  if(smvPublishedContentRequest)return smvPublishedContentRequest;
  smvPublishedContentRequest=(async()=>{
    const response=await renderApi('/public/content',{method:'GET'});
    if(!response?.success||!Array.isArray(response.items))throw new Error(response?.error||'Published content is temporarily unavailable.');
    const items=response.items.sort((a,b)=>smvDashboardActivityMs(b)-smvDashboardActivityMs(a));
    smvPublishedContentItems=items;return items;
  })().finally(()=>{smvPublishedContentRequest=null;});
  return smvPublishedContentRequest;
}
async function smvFetchBlogBody(bodyUrl){
  if(!bodyUrl) return "";
  try{const r=await fetch(bodyUrl,{cache:"default"});if(!r.ok)throw new Error("Blog content unavailable");const j=await r.json();return typeof j.body==="string"?j.body:"";}
  catch(e){console.warn("Unable to load blog body:",e);return "The blog content is temporarily unavailable.";}
}
function smvArmLazyBlogBodies(blogBox){
  const cards=[...blogBox.querySelectorAll('[data-smv-blog-body-url]')];
  if(!cards.length)return;
  const hydrate=async card=>{
    if(card.dataset.smvBlogLoaded==='1'||card.dataset.smvBlogLoading==='1')return;
    card.dataset.smvBlogLoading='1';
    const body=card.querySelector('[data-smv-blog-body]'),url=card.dataset.smvBlogBodyUrl||'';
    try{const text=await smvFetchBlogBody(url);if(body)body.textContent=text||'';card.dataset.smvBlogLoaded='1';}
    finally{delete card.dataset.smvBlogLoading;}
  };
  if(!('IntersectionObserver' in window)){
    cards.slice(0,2).forEach(card=>hydrate(card));
    return;
  }
  const io=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){io.unobserve(entry.target);hydrate(entry.target);}});
  },{rootMargin:'320px 0px'});
  cards.forEach(card=>io.observe(card));
}
async function smvRenderPublicContent(items){
  const blogs=items.filter(x=>x.kind==="blog"),media=items.filter(x=>x.kind==="media");
  const blogBox=$("publicBlogs"),mediaBox=$("publicMedia");
  if(blogBox){
    if(!blogs.length) blogBox.innerHTML='<div class="empty">No published blogs yet.</div>';
    else {
      blogBox.innerHTML=blogs.map(x=>`<article class="card blog-card" data-smv-blog-body-url="${escapeHtml(x.bodyUrl||'')}"><h3>${escapeHtml(x.title||"Untitled")}</h3>${x.coverUrl?`<img class="content-thumb" loading="lazy" decoding="async" src="${escapeHtml(x.coverUrl)}" alt="${escapeHtml(x.title||"Blog")}">`:""}${x.summary?`<p class="small"><b>${escapeHtml(x.summary)}</b></p>`:""}<div class="blog-content" data-smv-blog-body>${x.bodyUrl?'Loading article…':''}</div><div class="small" style="margin-top:auto;padding-top:12px">Published ${escapeHtml(smvDateTime(x.publishedAt||x.createdAt))}</div></article>`).join("");
      smvArmLazyBlogBodies(blogBox);
    }
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
      const groups=[['video','Video'],['music','Music'],['pdf','PDF'],['image','Images']];
      const renderCard=x=>{
        const title=escapeHtml(x.title||"Content"),desc=x.description?`<p class="small">${escapeHtml(x.description)}</p>`:"";
        if(x.mediaType==="video") return `<article class="card media-card media-video"><h3>${title}</h3><video controls preload="none" playsinline src="${escapeHtml(x.url)}"></video>${desc}</article>`;
        if(x.mediaType==="music") return `<article class="card media-card media-music"><h3>🎵 ${title}</h3><audio controls preload="none" src="${escapeHtml(x.url)}"></audio><p class="small">Music · ${escapeHtml(smvFormatBytes(x.size))}</p>${desc}</article>`;
        if(x.mediaType==="pdf") return `<article class="card media-card media-pdf"><h3>${title}</h3><p class="small">PDF · ${escapeHtml(smvFormatBytes(x.size))}</p>${desc}<a class="btn" href="${escapeHtml(x.url)}" target="_blank" rel="noopener" download>DOWNLOAD PDF</a></article>`;
        return `<article class="card media-card media-image"><h3>${title}</h3><img src="${escapeHtml(x.url)}" alt="${title}" loading="lazy" decoding="async">${desc}</article>`;
      };
      return groups.map(([type,label])=>{const groupItems=orderedMedia.filter(x=>x.mediaType===type);if(!groupItems.length)return '';return `<section class="smv-media-type-section smv-media-type-${type}"><h3 class="smv-media-type-title">${label}</h3><div class="smv-media-type-grid">${groupItems.map(renderCard).join('')}</div></section>`;}).join('');
    })():'<div class="empty">No published media yet.</div>';
  }
}
let smvPublicContentLoadRequest=null;
async function loadPublicContent(force=false){
  if(smvPublicContentRendered&&!force)return;
  if(smvPublicContentLoadRequest&&!force)return smvPublicContentLoadRequest;
  smvPublicContentLoadRequest=(async()=>{
    try{await smvRenderPublicContent(await smvGetPublishedContent(force));smvPublicContentRendered=true;}
    catch(e){console.warn("Public content unavailable:",e);if($("publicBlogs"))$("publicBlogs").innerHTML='<div class="empty">Content is temporarily unavailable.</div>';if($("publicMedia"))$("publicMedia").innerHTML='<div class="empty">Media is temporarily unavailable.</div>';}
    finally{smvPublicContentLoadRequest=null;}
  })();
  return smvPublicContentLoadRequest;
}
function smvInvalidatePublicContent(){
  smvPublishedContentItems=null;smvPublishedContentRequest=null;smvPublicContentRendered=false;
  if(window.__smvContentVisible)loadPublicContent(true).catch(()=>{});
  else smvArmPublicContentLazyLoad();
}
window.__smvEnsurePublicContent=()=>loadPublicContent(false);
function smvArmPublicContentLazyLoad(){
  const hub=$("smv-content-hub");if(!hub)return;
  if(!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){io.disconnect();loadPublicContent(false).catch(()=>{});}
  },{rootMargin:'350px 0px'});
  io.observe(hub);
}
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
    const response=await renderApi('/admin/content',{method:'GET'});
    if(!response?.success||!Array.isArray(response.items))throw new Error(response?.error||'Admin content list is unavailable.');
    const items=response.items.sort((a,b)=>smvDashboardActivityMs(b)-smvDashboardActivityMs(a));
    box.innerHTML=items.length?items.map(x=>{
      const status=x.published?'<span class="success">PUBLISHED</span>':'<span class="small">DRAFT</span>';
      return `<div class="admin-content-row"><b>${escapeHtml(x.title||"Untitled")}</b> · ${escapeHtml(x.kind||"")} ${x.mediaType?`· ${escapeHtml(x.mediaType)}`:""} · ${status}<div class="small">${escapeHtml(x.summary||x.description||"")}</div><div class="admin-blog-actions">${x.kind==="blog"?`<button class="btn gray" data-content-edit="${x.id}">EDIT</button>`:""}<button class="btn gray" data-content-toggle="${x.id}">${x.published?"UNPUBLISH":"PUBLISH"}</button><button class="btn danger" data-content-delete="${x.id}">DELETE</button></div></div>`;
    }).join(""):'<div class="empty">No blogs or uploaded content yet.</div>';
    box.querySelectorAll("[data-content-edit]").forEach(b=>b.onclick=async()=>{
      const x=items.find(i=>i.id===b.dataset.contentEdit);if(!x)return;$("blogEditId").value=x.id;$("blogTitle").value=x.title||"";$("blogSummary").value=x.summary||"";$("blogBody").value=await smvFetchBlogBody(x.bodyUrl);if($("blogCoverFile"))$("blogCoverFile").value="";$("saveBlogBtn").textContent="SAVE & REPUBLISH";$("adminContentManager")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    box.querySelectorAll("[data-content-toggle]").forEach(b=>b.onclick=async()=>{
      try{const item=items.find(x=>x.id===b.dataset.contentToggle);const result=await renderApi('/admin/content/toggle',{method:'POST',body:JSON.stringify({id:b.dataset.contentToggle,published:!item?.published})});if(!result?.success)throw new Error(result?.error||'Content update was not confirmed.');await loadAdminContent();smvInvalidatePublicContent();}catch(e){smvNotice("Unable to update",e.message||String(e),"!");}
    });
    box.querySelectorAll("[data-content-delete]").forEach(b=>b.onclick=async()=>{
      if(!(await smvConfirm("Delete content","This will remove the content record from SMV ASTRO. The Cloudinary files remain stored for safety; automatic Cloudinary deletion requires a secure server-side API key.","DELETE","CANCEL",true)))return;
      const x=items.find(i=>i.id===b.dataset.contentDelete);try{const result=await renderApi('/admin/content/delete',{method:'POST',body:JSON.stringify({id:b.dataset.contentDelete})});if(!result?.success)throw new Error(result?.error||'Content deletion was not confirmed.');await loadAdminContent();smvInvalidatePublicContent();}catch(e){smvNotice("Unable to delete",e.message||String(e),"!");}
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
  try{let id=editId,old=null;if(editId){const list=await renderApi('/admin/content',{method:'GET'});if(!list?.success)throw new Error(list?.error||"Unable to load current content.");old=(list.items||[]).find(x=>x.id===editId)||null;if(!old)throw new Error("Blog not found.");}else id=doc(collection(db,SMV_CONTENT_COLLECTION)).id;
    let coverUrl=old?.coverUrl||"",coverPath=old?.coverPath||"";const file=$("blogCoverFile")?.files?.[0];if(file){const up=await smvUploadFile(file,"image",id);coverUrl=up.url;coverPath=up.path;}
    const textUp=await smvUploadBlogText(body,id);
    const data={kind:"blog",title,summary,language:"en",bodyUrl:textUp.url,bodyPublicId:textUp.publicId,bodySize:textUp.size,coverUrl,coverPath,published:true,updatedBy:currentUser.uid};
    const saved=await renderApi('/admin/content/save',{method:'POST',body:JSON.stringify({id,data})});
    if(!saved?.success)throw new Error(saved?.error||'Blog save was not confirmed.');
    smvClearBlogForm();await loadAdminContent();smvInvalidatePublicContent();$("blogManagerMsg").innerHTML='<span class="success">Blog published successfully. Blog text is stored on Cloudinary.</span>';
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
  try{const id=doc(collection(db,SMV_CONTENT_COLLECTION)).id,up=await smvUploadFile(file,type,id);const saved=await renderApi('/admin/content/save',{method:'POST',body:JSON.stringify({id,data:{kind:"media",title,description:desc,language:"en",mediaType:type,url:up.url,storagePath:up.path,cloudinaryPublicId:up.publicId,size:up.size,mimeType:up.mimeType,fileName:up.name,published:true}})});if(!saved?.success)throw new Error(saved?.error||'Content save was not confirmed.');smvClearMediaForm();await loadAdminContent();smvInvalidatePublicContent();$("mediaManagerMsg").innerHTML='<span class="success">Content uploaded and published successfully.</span>';}catch(e){$("mediaManagerMsg").innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;b.textContent="UPLOAD & PUBLISH";}
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
async function loadAdminAndroidAppRelease(){
  const current=$('adminAndroidAppCurrent'),msg=$('adminAndroidAppMsg');
  if(!current||!msg||!currentUser)return;
  msg.textContent='Loading current Android app release…';
  try{
    const release=await renderApi('/admin/android-app',{method:'GET'});
    if(release?.success!==true)throw new Error(release?.error||'Unable to load Android app release.');
    if(release.storageReady!==true){
      current.innerHTML='<div class="empty">Cloudinary APK storage is not enabled yet.</div>';
      msg.textContent=release.storageMessage||'Cloudinary APK publishing is disabled until the .apk file type is approved for this account.';
      return;
    }
    if(release.available!==true){
      current.innerHTML='<div class="empty">No permanent Android APK has been published yet.</div>';
      msg.textContent='The first website-managed APK must be v1.1 or newer because the permanent v1.0 APK is already in use.';
      return;
    }
    const size=Number(release.size||0);
    const sizeLabel=size>0?(size/1024/1024).toFixed(2)+' MB':'—';
    const uploaded=release.uploadedAt?smvDateTime(new Date(release.uploadedAt)):'—';
    current.innerHTML='<div class="stats-grid admin-summary-grid">'+
      '<div class="card"><b>Current version</b><div>'+escapeHtml(release.versionName||'—')+'</div></div>'+
      '<div class="card"><b>Android versionCode</b><div>'+escapeHtml(String(release.versionCode||'—'))+'</div></div>'+
      '<div class="card"><b>APK size</b><div>'+escapeHtml(sizeLabel)+'</div></div>'+
      '</div><p class="small">Uploaded: '+escapeHtml(uploaded)+'</p>';
    msg.textContent='Current permanent Android APK is published. A new upload must have a higher versionCode and the same permanent Release signing key.';
  }catch(error){
    current.innerHTML='<div class="empty error">Unable to load current Android release.</div>';
    msg.textContent=error?.message||String(error);
    throw error;
  }
}
async function uploadAdminAndroidApp(){
  const file=$('adminAndroidAppFile')?.files?.[0],button=$('adminAndroidAppUpload'),msg=$('adminAndroidAppMsg');
  if(!file){if(msg)msg.textContent='Select the production signed APK first.';return;}
  if(!/\.apk$/i.test(file.name||'')||file.size<1024||file.size>100*1024*1024){
    if(msg)msg.textContent='Select a valid .apk file between 1 KB and 100 MB.';
    return;
  }
  if(button){button.disabled=true;button.textContent='VALIDATING & UPLOADING…';}
  if(msg)msg.textContent='Uploading the APK. The server will verify package, version and signing certificate.';
  try{
    const result=await renderApi('/admin/android-app/upload',{
      method:'POST',
      headers:{'Content-Type':'application/vnd.android.package-archive'},
      body:file,
      timeoutMs:120000
    });
    if(result?.success!==true||result.available!==true)throw new Error(result?.error||'APK upload was not confirmed.');
    if($('adminAndroidAppFile'))$('adminAndroidAppFile').value='';
    if(msg)msg.textContent='Published successfully: '+result.versionName+' (versionCode '+result.versionCode+'). Website download/update status now uses this version.';
    await loadAdminAndroidAppRelease();
  }catch(error){
    if(msg)msg.textContent=error?.message||String(error);
  }finally{
    if(button){button.disabled=false;button.textContent='UPLOAD NEW APP VERSION';}
  }
}
(function initAdminAndroidAppManager(){
  const upload=$('adminAndroidAppUpload'),refresh=$('adminAndroidAppRefresh');
  if(upload&&!upload.dataset.smvBound){upload.dataset.smvBound='1';upload.addEventListener('click',uploadAdminAndroidApp);}
  if(refresh&&!refresh.dataset.smvBound){refresh.dataset.smvBound='1';refresh.addEventListener('click',()=>loadAdminAndroidAppRelease().catch(()=>{}));}
})();

smvArmPublicContentLazyLoad();

async function smvRenderAdminWalletOffers(){
 const admin=$('admin');if(!admin||!currentUser)return;
 let card=$('adminOffersPromotions');
 const anchor=$('adminSummary')?.closest('.card');
 if(!card){card=document.createElement('section');card.id='adminOffersPromotions';card.className='card';card.style.marginTop='16px';}
 if(anchor&&card.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',card);
 else if(!anchor&&!admin.contains(card))admin.appendChild(card);
 const themes=[
  ['auto','Auto'],['generic','Generic'],['pongal','Pongal'],['diwali','Diwali'],
  ['navaratri','Navaratri'],['dasara','Dasara'],['ayudha_pooja','Ayudha Pooja'],
  ['shivaratri','Shivaratri'],['tamil_new_year','Tamil New Year'],['vinayagar_chaturthi','Vinayagar Chaturthi'],
  ['karthigai_deepam','Karthigai Deepam'],['thaipusam','Thaipusam'],['new_year','New Year'],
  ['onam','Onam'],['christmas','Christmas'],['eid','Eid']
 ];
 card.innerHTML=[
  '<h3>Wallet Recharge Bonus Offers</h3>',
  '<p class="small">When an Offer is ON and inside its Start / End Date window, it appears on the public Home page banner. OFF, not-yet-started, expired or fully redeemed offers are hidden. A Customer must recharge the Wallet through Razorpay at or above the minimum amount; after successful payment capture, one eligible Offer credits promotional time to My Wallet → Bonus Free Minutes. Those minutes are used before paid minutes for eligible Live Call / Live Chat sessions. Per-customer limits apply, offers do not stack, and bonus minutes are not cash.</p>',
  '<input id="smvWalletOfferId" type="hidden">',
  '<div class="grid">',
  '<label><b>Offer Name</b><input id="smvWalletOfferName" maxlength="120" placeholder="Diwali Bonus Minutes"></label>',
  '<label><b>Festival / Theme</b><select id="smvWalletOfferTheme"></select></label>',
  '<label><b>Minimum Recharge Amount (₹)</b><input id="smvWalletOfferMinimum" type="number" min="0" step="0.01" value="0"></label>',
  '<label><b>Bonus Free Minutes</b><input id="smvWalletOfferBonusMinutes" type="number" min="1" max="1440" step="1" value="1"></label>',
  '<label><b>Maximum Redemptions per Customer (0 = unlimited)</b><input id="smvWalletOfferPerCustomerLimit" type="number" min="0" step="1" value="1"></label>',
  '<label><b>Total Redemptions (0 = unlimited)</b><input id="smvWalletOfferTotalUsageLimit" type="number" min="0" step="1" value="0"></label>',
  '<label><b>Priority (higher wins)</b><input id="smvWalletOfferPriority" type="number" min="-1000" max="1000" step="1" value="0"></label>',
  '<label><b>Start Date &amp; Time (India)</b><input id="smvWalletOfferStartAt" type="datetime-local"></label>',
  '<label><b>End Date &amp; Time (India)</b><input id="smvWalletOfferEndAt" type="datetime-local"></label>',
  '<label><b>Offer Status</b><select id="smvWalletOfferEnabled"><option value="false">OFF — Do not award</option><option value="true">ON — Award after successful recharge</option></select></label>',
  '</div>',
  '<div class="action-row"><button class="btn" id="saveSmvWalletOfferBtn" type="button">SAVE OFFER</button><button class="btn gray" id="clearSmvWalletOfferBtn" type="button">CLEAR</button><button class="btn gray" id="refreshSmvWalletOffersBtn" type="button">REFRESH OFFERS</button></div>',
  '<div class="small" id="smvWalletOfferMsg" role="status" aria-live="polite"></div>',
  '<div id="smvWalletOfferList"><div class="empty">Loading Wallet Offers…</div></div>'
 ].join('');
 $('smvWalletOfferTheme').innerHTML=themes.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
 const formIds=['smvWalletOfferId','smvWalletOfferName','smvWalletOfferTheme','smvWalletOfferMinimum','smvWalletOfferBonusMinutes','smvWalletOfferPerCustomerLimit','smvWalletOfferTotalUsageLimit','smvWalletOfferPriority','smvWalletOfferStartAt','smvWalletOfferEndAt','smvWalletOfferEnabled'];
 const clearForm=()=>{
  $('smvWalletOfferId').value='';$('smvWalletOfferName').value='';$('smvWalletOfferTheme').value='auto';
  $('smvWalletOfferMinimum').value='0';$('smvWalletOfferBonusMinutes').value='1';
  $('smvWalletOfferPerCustomerLimit').value='1';$('smvWalletOfferTotalUsageLimit').value='0';
  $('smvWalletOfferPriority').value='0';$('smvWalletOfferStartAt').value='';$('smvWalletOfferEndAt').value='';
  $('smvWalletOfferEnabled').value='false';
 };
 const dateInputValue=value=>{
  if(!value)return '';
  const raw=String(value);
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)&&!/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw))return raw.slice(0,16);
  const millis=Date.parse(raw);if(!Number.isFinite(millis))return '';
  return new Date(millis-330*60000).toISOString().slice(0,16);
 };
 const editOffer=offer=>{
  $('smvWalletOfferId').value=offer.id||'';$('smvWalletOfferName').value=offer.name||'';
  $('smvWalletOfferTheme').value=offer.bannerTheme||'auto';
  $('smvWalletOfferMinimum').value=(Number(offer.minimumRechargeAmountPaise||0)/100).toFixed(2);
  $('smvWalletOfferBonusMinutes').value=Number(offer.bonusMinutes||1);
  $('smvWalletOfferPerCustomerLimit').value=Number(offer.perCustomerLimit??1);
  $('smvWalletOfferTotalUsageLimit').value=Number(offer.totalUsageLimit||0);
  $('smvWalletOfferPriority').value=Number(offer.priority||0);
  $('smvWalletOfferStartAt').value=dateInputValue(offer.startAt);
  $('smvWalletOfferEndAt').value=dateInputValue(offer.endAt);
  $('smvWalletOfferEnabled').value=String(offer.enabled===true);
  $('smvWalletOfferName').focus();card.scrollIntoView({behavior:'smooth',block:'start'});
 };
 let offerRows=[];
 const reloadOffers=async()=>{
  const list=$('smvWalletOfferList'),msg=$('smvWalletOfferMsg');
  if(list)list.innerHTML='<div class="empty">Loading Wallet Offers…</div>';
  try{
   const result=await renderApi('/admin/offers',{method:'GET'});
   if(!result?.success||!Array.isArray(result.offers))throw new Error(result?.error||'The server did not confirm Wallet Offers.');
   offerRows=result.offers;
   if(!list)return;
   list.innerHTML=offerRows.length?offerRows.map(offer=>{
    const minimum=(Number(offer.minimumRechargeAmountPaise||0)/100).toFixed(2);
    const limit=Number(offer.totalUsageLimit||0)>0?String(offer.usedCount||0)+' / '+String(offer.totalUsageLimit):String(offer.usedCount||0)+' / unlimited';
    const status=offer.enabled?'<span class="success">ON</span>':'<span class="small">OFF</span>';
    const theme=themes.find(row=>row[0]===offer.bannerTheme)?.[1]||'Festival';
    return '<article class="card" style="margin-top:10px"><b>'+escapeHtml(offer.name||'Wallet Offer')+'</b> · '+status+
     '<p class="small">'+escapeHtml(theme)+' · ₹'+minimum+' minimum recharge · '+Number(offer.bonusMinutes||0)+' free Live minute(s)</p>'+
     '<p class="small">Redemptions: '+escapeHtml(limit)+' · Per Customer: '+(Number(offer.perCustomerLimit||0)===0?'unlimited':Number(offer.perCustomerLimit||0))+
     ' · Total bonus minutes: '+Number(offer.totalBonusMinutesAwarded||0)+'</p>'+
     (offer.startAt||offer.endAt?'<p class="small">Start: '+escapeHtml(offer.startAt||'Now')+' · End: '+escapeHtml(offer.endAt||'No end date')+'</p>':'')+
     '<div class="action-row"><button class="btn" type="button" data-wallet-offer-edit="'+escapeHtml(offer.id)+'">EDIT</button>'+
     '<button class="btn gray" type="button" data-wallet-offer-toggle="'+escapeHtml(offer.id)+'">'+(offer.enabled?'TURN OFF':'TURN ON')+'</button>'+
     '<button class="btn gray" type="button" data-wallet-offer-delete="'+escapeHtml(offer.id)+'">DELETE</button></div></article>';
   }).join(''):'<div class="empty">No Wallet recharge bonus offers created yet.</div>';
   list.querySelectorAll('[data-wallet-offer-edit]').forEach(button=>button.onclick=()=>{
    const offer=offerRows.find(row=>row.id===button.dataset.walletOfferEdit);if(offer)editOffer(offer);
   });
   list.querySelectorAll('[data-wallet-offer-toggle]').forEach(button=>button.onclick=async()=>{
    const offer=offerRows.find(row=>row.id===button.dataset.walletOfferToggle);if(!offer)return;
    button.disabled=true;
    try{
     await renderApi('/admin/offers/save',{method:'POST',body:JSON.stringify({
      id:offer.id,name:offer.name,bannerTheme:offer.bannerTheme,
      minimumRechargeAmount:(Number(offer.minimumRechargeAmountPaise||0)/100),
      bonusMinutes:Number(offer.bonusMinutes),perCustomerLimit:Number(offer.perCustomerLimit||0),
      totalUsageLimit:Number(offer.totalUsageLimit||0),priority:Number(offer.priority||0),
      startAt:offer.startAt||null,endAt:offer.endAt||null,enabled:!offer.enabled
     })});
     if(msg)msg.innerHTML='<span class="success">Offer '+escapeHtml(offer.name||'')+' saved as '+(!offer.enabled?'ON':'OFF')+'.</span>';
     await reloadOffers();
    }catch(error){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(error.message||String(error))+'</span>';button.disabled=false;}
   });
   list.querySelectorAll('[data-wallet-offer-delete]').forEach(button=>button.onclick=async()=>{
    const offer=offerRows.find(row=>row.id===button.dataset.walletOfferDelete);if(!offer)return;
    if(!window.confirm('Delete Wallet Offer "'+String(offer.name||'Offer')+'"? Offers with redemption history must be turned OFF instead.'))return;
    button.disabled=true;
    try{
     await renderApi('/admin/offers/delete',{method:'POST',body:JSON.stringify({id:offer.id})});
     if(msg)msg.innerHTML='<span class="success">Wallet Offer deleted.</span>';
     await reloadOffers();
    }catch(error){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(error.message||String(error))+'</span>';button.disabled=false;}
   });
  }catch(error){
   if(list)list.innerHTML='<div class="empty error">'+escapeHtml(error.message||String(error))+'</div>';
  }
 };
 const save=$('saveSmvWalletOfferBtn'),msg=$('smvWalletOfferMsg');
 if(save)save.onclick=async()=>{
  const payload={
   id:$('smvWalletOfferId').value.trim()||undefined,
   name:$('smvWalletOfferName').value.trim(),bannerTheme:$('smvWalletOfferTheme').value,
   minimumRechargeAmount:$('smvWalletOfferMinimum').value,
   bonusMinutes:Number($('smvWalletOfferBonusMinutes').value),
   perCustomerLimit:Number($('smvWalletOfferPerCustomerLimit').value),
   totalUsageLimit:Number($('smvWalletOfferTotalUsageLimit').value),
   priority:Number($('smvWalletOfferPriority').value),
   startAt:$('smvWalletOfferStartAt').value||null,endAt:$('smvWalletOfferEndAt').value||null,
   enabled:$('smvWalletOfferEnabled').value==='true'
  };
  if(!payload.name){msg.innerHTML='<span class="error">Offer Name is required.</span>';return;}
  if(!Number.isSafeInteger(payload.bonusMinutes)||payload.bonusMinutes<1||payload.bonusMinutes>1440){msg.innerHTML='<span class="error">Free minutes must be a whole number between 1 and 1,440.</span>';return;}
  if(!Number.isFinite(Number(payload.minimumRechargeAmount))||Number(payload.minimumRechargeAmount)<0){msg.innerHTML='<span class="error">Enter a valid minimum recharge amount.</span>';return;}
  save.disabled=true;save.textContent='SAVING…';msg.textContent='Saving Wallet recharge offer…';
  try{
   const saved=await renderApi('/admin/offers/save',{method:'POST',body:JSON.stringify(payload)});
   if(!saved?.success||!saved?.id)throw new Error(saved?.error||'The server did not confirm this Offer.');
   await reloadOffers();
   const verified=offerRows.find(row=>row.id===saved.id);
   if(!verified||verified.name!==payload.name||Number(verified.bonusMinutes)!==payload.bonusMinutes||
      Number(verified.minimumRechargeAmountPaise)!==Math.round(Number(payload.minimumRechargeAmount)*100)||
      verified.enabled!==payload.enabled)throw new Error('Offer save returned, but the saved values could not be verified by reloading the server list.');
   msg.innerHTML='<span class="success">Offer saved and verified: '+escapeHtml(verified.name)+' · '+verified.bonusMinutes+' bonus minute(s) after a successful recharge.</span>';
   clearForm();
  }catch(error){msg.innerHTML='<span class="error">Unable to save Wallet Offer: '+escapeHtml(error.message||String(error))+'</span>';}
  finally{save.disabled=false;save.textContent='SAVE OFFER';}
 };
 $('clearSmvWalletOfferBtn').onclick=clearForm;
 $('refreshSmvWalletOffersBtn').onclick=()=>reloadOffers().catch(()=>{});
 clearForm();
 await reloadOffers();
}

let smvAdminLoad=null,smvAdminLoadUid=null;
async function loadAdminPanel(background=false){
 if(smvAdminLoad&&smvAdminLoadUid===currentUser?.uid){const uid=currentUser.uid;await smvAdminLoad;if(background&&currentUser?.uid===uid)return loadAdminPanel(true);return;}
 smvAdminLoadUid=currentUser?.uid;
 const task=loadAdminPanelData(background);smvAdminLoad=task;
 try{return await task;}finally{if(smvAdminLoad===task)smvAdminLoad=null;}
}
async function loadAdminPanelData(background=false){
 if(!currentUser || !(await isCurrentAdmin())){hide('admin');hide('adminLink');return;}
  if(!background)loadAdminContent().catch(e=>console.warn('Admin content unavailable:',e));
  if(!background)loadAdminAndroidAppRelease().catch(e=>console.warn('Android app release status unavailable:',e));
 if(!background){hidePrimarySections('admin');show('smv-dashboard-page');show('admin');}
 smvEnsureAdminQuickLinks();
 setTimeout(()=>window.__smvRefreshAdminSections?.(),0);
 try{
  const adminLoadUid=currentUser.uid;
  const adminReads=await Promise.allSettled([
   withTimeout(renderApi('/admin-data',{method:'GET'}),20000)
  ]);
  const adminRead=i=>{if(adminReads[i].status==='rejected')throw adminReads[i].reason;return adminReads[i].value;};
  const adminData=adminRead(0);
  // Keep every date-based Admin operational list newest-first. Notification arrays
  // are deliberately excluded so their existing behaviour remains untouched.
  ['astrologers','payments'].forEach(k=>{
    if(Array.isArray(adminData?.[k]))adminData[k]=smvSortDashboardDesc(adminData[k]);
  });
  if(currentUser?.uid!==adminLoadUid)return;
  if(background&&($('admin')?.classList.contains('hidden')||smvEditing('admin'))){smvLiveQueue?.request();return;}

  if(!adminData?.success) throw new Error(adminData?.error||'Admin data could not be loaded.');
  const toDocs=(arr)=>({docs:(arr||[]).map(x=>({id:x.id,data:()=>x})),size:(arr||[]).length,empty:!(arr||[]).length});
  const astros=toDocs(adminData.astrologers), payments=toDocs(adminData.payments);
  if(!currentUser || currentUser.uid!==adminLoadUid || currentUser.uid!==auth?.currentUser?.uid) return;
  smvBindAdminWalletLedger();
  smvLiveBindAdminPricing();
  smvRenderAdminWalletOffers().catch(error=>console.warn('Admin Wallet Offers unavailable:',error?.message||error));
  if(!background)smvLoadAdminWalletLedger().catch(e=>console.warn('Admin Wallet ledger unavailable:',e));
  smvWatchAdminEvents();
  const adminReadErrors=adminData.errors||{};
  const readErrorText=Object.entries(adminReadErrors).filter(([,v])=>v).map(([k,v])=>k+': '+v).join(' | ');
  $('adminDataLoadMsg') && ($('adminDataLoadMsg').innerHTML=readErrorText?'<div class="empty error">Some Admin data could not be loaded: '+escapeHtml(readErrorText)+'</div>':'');
  const customers=adminData.customerCount==null?'—':Number(adminData.customerCount), pendingDocs=astros.docs.filter(d=>d.data().status==='pending');
  $('adminSummary').innerHTML=`<div class="stat">Customers <b>${customers}</b></div><div class="stat">Astrologers <b>${adminData.astrologerCount??astros.size}</b></div><div class="stat">Pending Applications <b>${pendingDocs.length}</b></div>`;
  const adminQuickLinks=smvEnsureAdminQuickLinks();
  const adminSummaryCard=$('adminSummary')?.closest('.card');
  const apmt=$('adminAstrologerProfileManagementToggle'),apmb=$('adminAstrologerProfileManagementBody');
  if(apmt&&apmb&&!apmt.dataset.smvBound){apmt.dataset.smvBound='1';apmt.onclick=()=>{const hidden=apmb.classList.toggle('hidden');apmt.textContent=hidden?'▶':'▼';apmt.title=hidden?'Expand':'Collapse';apmt.setAttribute('aria-label',(hidden?'Expand':'Collapse')+' Astrologer Profile Management');};}

  let aqCard=$('astrologerAutoApprovalCard');
  if(!aqCard){aqCard=document.createElement('div');aqCard.id='astrologerAutoApprovalCard';aqCard.className='card';}
  const adminDynamicAnchor=$('pendingAstros')?.closest('.card')||adminQuickLinks||adminSummaryCard;
  if(adminDynamicAnchor && aqCard.previousElementSibling!==adminDynamicAnchor) adminDynamicAnchor.insertAdjacentElement('afterend',aqCard);
  const aq=adminData.settings?.astrologerAutoApproval||{enabled:false,formUrl:'',passMark:20,webhookSecret:''};
  aqCard.innerHTML=`<h3>Astrologer Auto Approval — Google Form Qualification</h3><div class="grid"><label><b>Auto Approval</b><select id="astroAutoApprovalEnabled"><option value="false">OFF — Manual Admin Approval</option><option value="true">ON — Auto Approve Passed Test</option></select></label><label><b>Pass Mark / 25</b><input id="astroAutoPassMark" type="number" min="1" max="25" step="1"></label><label><b>Published Google Form URL</b><input id="astroAutoFormUrl" type="url" placeholder="https://docs.google.com/forms/..."></label><label><b>Apps Script Web App URL</b><input id="astroQuizSyncWebAppUrl" type="url" placeholder="https://script.google.com/macros/s/.../exec"></label></div><p class="small">When enabled: registered pending Astrologer → 25-question Google Form quiz → verified score reaches this backend → pass mark reached → account auto approved. When OFF, existing Admin manual approval continues unchanged.</p><div class="small"><b>Webhook Secret:</b> <code id="astroQuizWebhookSecret">${escapeHtml(aq.webhookSecret||'Not generated yet')}</code></div><div class="action-row"><button class="btn" id="saveAstroAutoApproval">SAVE AUTO APPROVAL</button><button class="btn gray" id="rotateAstroQuizSecret">ROTATE WEBHOOK SECRET</button></div><div class="small" id="astroAutoApprovalMsg"></div>`;
  $('astroAutoApprovalEnabled').value=String(aq.enabled===true);$('astroAutoPassMark').value=Number(aq.passMark||20);$('astroAutoFormUrl').value=aq.formUrl||'';$('astroQuizSyncWebAppUrl').value=aq.syncWebAppUrl||'';
  const saveAQ=async rotate=>{const b=rotate?$('rotateAstroQuizSecret'):$('saveAstroAutoApproval');b.disabled=true;try{const r=await renderApi('/admin/astrologer-auto-approval/settings',{method:'POST',body:JSON.stringify({enabled:$('astroAutoApprovalEnabled').value==='true',passMark:Number($('astroAutoPassMark').value),formUrl:$('astroAutoFormUrl').value.trim(),syncWebAppUrl:$('astroQuizSyncWebAppUrl').value.trim(),rotateSecret:rotate})});$('astroQuizWebhookSecret').textContent=r.webhookSecret;$('astroAutoApprovalMsg').innerHTML='<span class="success">Astrologer Auto Approval settings saved.</span>';}catch(e){$('astroAutoApprovalMsg').innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;}};
  $('saveAstroAutoApproval').onclick=()=>saveAQ(false);$('rotateAstroQuizSecret').onclick=()=>saveAQ(true);
  let qm=$('astrologerQuizQuestionManager');
  if(!qm){qm=document.createElement('div');qm.id='astrologerQuizQuestionManager';qm.className='card';}
  if(qm.previousElementSibling!==aqCard) aqCard.insertAdjacentElement('afterend',qm);
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


  // /admin-data already includes the same commission settings document.
  // Reuse that payload instead of issuing a second Firestore read.
  let settings=adminData?.settings?.commission||{astroPercent:20,adminPercent:80};
  const hp=adminData.settings?.horoscopePayment||{advancedAnalysisEnabled:false,advancedAnalysisPrice:51,marriageMatchingEnabled:false,marriageMatchingPrice:51};
  if($('advancedAnalysisPaymentEnabled'))$('advancedAnalysisPaymentEnabled').value=String(hp.advancedAnalysisEnabled===true);
  if($('advancedAnalysisPrice'))$('advancedAnalysisPrice').value=Number(hp.advancedAnalysisPrice??51);
  if($('marriageMatchingPaymentEnabled'))$('marriageMatchingPaymentEnabled').value=String(hp.marriageMatchingEnabled===true);
  if($('marriageMatchingPrice'))$('marriageMatchingPrice').value=Number(hp.marriageMatchingPrice??51);
  if($('saveHoroscopePaymentSettings'))$('saveHoroscopePaymentSettings').onclick=async()=>{const b=$('saveHoroscopePaymentSettings'),msg=$('horoscopePaymentSettingsMsg');b.disabled=true;try{const payload={advancedAnalysisEnabled:$('advancedAnalysisPaymentEnabled').value==='true',advancedAnalysisPrice:Number($('advancedAnalysisPrice').value),marriageMatchingEnabled:$('marriageMatchingPaymentEnabled').value==='true',marriageMatchingPrice:Number($('marriageMatchingPrice').value)},r=await renderApi('/admin/horoscope-feature-settings',{method:'POST',body:JSON.stringify(payload)}),a={enabled:r.settings.advancedAnalysisEnabled===true,price:Number(r.settings.advancedAnalysisPrice??0)},m={enabled:r.settings.marriageMatchingEnabled===true,price:Number(r.settings.marriageMatchingPrice??0)};try{localStorage.setItem('smv-horoscope-feature-config',JSON.stringify({advanced_analysis:a,marriage_matching:m}));}catch(_){}msg.innerHTML='<span class="success">Horoscope settings saved. Advanced: '+(a.enabled?'ON':'OFF')+' ₹'+a.price.toFixed(2)+' · Marriage: '+(m.enabled?'ON':'OFF')+' ₹'+m.price.toFixed(2)+'</span>';}catch(e){msg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}finally{b.disabled=false;}};
  $('astroCommission').value=settings.astroPercent??20;$('adminCommission').value=settings.adminPercent??80;
  $('saveCommission').onclick=async()=>{
   const btn=$('saveCommission'),msg=$('commissionMsg');
   const a=Number($('astroCommission').value),ad=Number($('adminCommission').value);
   if(!Number.isFinite(a)||!Number.isFinite(ad)||a<0||a>100||ad<0||ad>100||Math.abs(a+ad-100)>0.001){
    msg.innerHTML='<span class="error">Astrologer % + Admin % must each be 0–100% and add up to 100%.</span>';
    return;
   }
   btn.disabled=true;btn.textContent='SAVING...';msg.textContent='Saving Live / Booking commission settings…';
   try{
    const result=await renderApi('/admin/live/commission',{method:'POST',body:JSON.stringify({astroPercent:a,adminPercent:ad})});
    if(!result?.success)throw new Error(result?.error||'Commission settings were not saved.');
    msg.innerHTML='<span class="success">Saved successfully. Astrologer: '+a+'% · Admin: '+ad+'%. These rates apply to completed, charged Live Calls, Live Chats and accepted Live bookings.</span>';
    try{await smvAdminTouch();}catch(refreshError){console.warn('Admin dashboard refresh after commission save skipped:',refreshError?.message||refreshError);}
   }catch(error){
    msg.innerHTML='<span class="error">Unable to save commission settings: '+escapeHtml(error?.message||String(error))+'</span>';
   }finally{btn.disabled=false;btn.textContent='SAVE COMMISSION';}
  };
  $('testRazorpayBtn').onclick=async()=>{const b=$('testRazorpayBtn');b.disabled=true;b.textContent='TESTING...';try{const r=await withTimeout(renderApi('/test-razorpay',{method:'GET'}),60000);$('razorpayTestMsg').innerHTML='<span class="success"><b>Razorpay connection OK.</b> '+escapeHtml(r?.message||'Render payment server and Razorpay API are working.')+'</span>';}catch(e){$('razorpayTestMsg').innerHTML='<span class="error"><b>Razorpay test failed:</b> '+escapeHtml(e.message||String(e))+'</span>';}b.disabled=false;b.textContent='TEST RAZORPAY CONNECTION';};

  const box=$('pendingAstros');
  box.innerHTML=pendingDocs.length?pendingDocs.map(d=>{const a=d.data();return `<div class="card" style="margin:10px 0">${a.photoData?`<img src="${a.photoData}" style="width:100px;height:100px;border-radius:50%;object-fit:cover">`:''}<h3>${escapeHtml(a.name||'Astrologer')}</h3><p><b>Email:</b> ${escapeHtml(a.adminContactEmail||'')}</p><p><b>Mobile:</b> ${escapeHtml(a.adminContactMobile||'')}</p><p><b>Expertise:</b> ${escapeHtml(a.expertise||a.specialization||'')}</p><p><b>Experience:</b> ${escapeHtml(a.experience||0)} years</p><p><b>Bio:</b> ${escapeHtml(a.bio||a.about||'')}</p><div id="payout_${d.id}" class="small">Loading private payout details...</div><div class="action-row"><button class="btn" data-approve="${d.id}">APPROVE</button><button class="btn gray" data-reject="${d.id}">REJECT</button></div><input id="reject_${d.id}" placeholder="Rejection reason (required if rejecting)"><div id="astroApprovalMsg_${d.id}" class="small" role="status" aria-live="polite"></div></div>`}).join(''):'<div class="empty">No pending astrologer applications.</div>';
  await smvMapLimit(pendingDocs,4,async d=>{try{const ps=await getDoc(doc(db,'smv_payouts',d.id));if(ps.exists()){const p=ps.data();const target=$('payout_'+d.id);if(target)target.innerHTML=`<b>PRIVATE BANK/UPI:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'')} · Status: ${escapeHtml(p.status||'')}`;}}catch(e){const target=$('payout_'+d.id);if(target)target.textContent='Payout details unavailable.';}});
  box.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.approve;
    const root=b.closest('.card'),msg=root?.querySelector('[id^="astroApprovalMsg_"]');
    root?.querySelectorAll('[data-approve],[data-reject]').forEach(btn=>btn.disabled=true);
    b.textContent='APPROVING…';
    if(msg)msg.textContent='Approving Astrologer securely…';
    try{
      const result=await renderApi('/admin/approve-astrologer',{method:'POST',body:JSON.stringify({astrologerId:id})});
      if(!result?.success)throw new Error(result?.error||'The backend did not confirm Astrologer approval.');
      if(msg)msg.innerHTML='<span class="success">Astrologer approved successfully.</span>';
      await loadAdminPanel();
    }catch(e){
      if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';
      root?.querySelectorAll('[data-approve],[data-reject]').forEach(btn=>btn.disabled=false);
      b.textContent='APPROVE';
    }
  });
  box.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.reject,reason=String($('reject_'+id)?.value||'').trim();
    const root=b.closest('.card'),msg=root?.querySelector('[id^="astroApprovalMsg_"]');
    if(!reason){if(msg)msg.innerHTML='<span class="error">Enter a rejection reason.</span>';return;}
    root?.querySelectorAll('[data-approve],[data-reject]').forEach(btn=>btn.disabled=true);
    b.textContent='REJECTING…';
    if(msg)msg.textContent='Rejecting Astrologer application securely…';
    try{
      const result=await renderApi('/admin/reject-astrologer',{method:'POST',body:JSON.stringify({astrologerId:id,reason})});
      if(!result?.success)throw new Error(result?.error||'The backend did not confirm rejection.');
      if(msg)msg.innerHTML='<span class="success">Application rejected successfully.</span>';
      await loadAdminPanel();
    }catch(e){
      if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';
      root?.querySelectorAll('[data-approve],[data-reject]').forEach(btn=>btn.disabled=false);
      b.textContent='REJECT';
    }
  });

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
          <label for="adminAstrologerLanguages_${d.id}"><b>Languages Spoken</b><input id="adminAstrologerLanguages_${d.id}" type="text" maxlength="240" value="${escapeHtml((()=>{const raw=a.languages??a.spokenLanguages??a.language??[];return (Array.isArray(raw)?raw:String(raw||'').split(/[,;|]/)).map(v=>String(v||'').trim()).filter(Boolean).join(', ');})())}" placeholder="Tamil, English"></label>
          <div class="action-row"><button class="btn" data-languages-save="${d.id}" type="button">SAVE LANGUAGES</button></div>
          <div class="small" id="adminAstrologerLanguagesMsg_${d.id}" role="status"></div>
        </div>
        <div style="margin:10px 0">
          <div class="grid" style="align-items:end;gap:10px">
            <label for="adminCallPrice_${d.id}"><b>Live Call Price per minute (₹)</b><input id="adminCallPrice_${d.id}" type="number" min="0" max="10000" step="0.01" value="${escapeHtml(String(Number(a.callPricePerMinute??a.pricePerMinute??a.callRatePerMinute??0)||''))}" placeholder="Not configured (₹0 to unset)"></label>
            <label for="adminLiveChatPrice_${d.id}"><b>Live Chat Price per minute (₹)</b><input id="adminLiveChatPrice_${d.id}" type="number" min="0" max="10000" step="0.01" value="${escapeHtml(String(Number(a.chatPricePerMinute??a.liveChatPricePerMinute??a.chatRatePerMinute??0)||''))}" placeholder="Not configured (₹0 to unset)"></label>
          </div>
          <div class="action-row"><button class="btn" data-live-prices-save="${d.id}">SAVE LIVE RATES</button></div>
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

    profileBox.querySelectorAll('[data-languages-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.languagesSave,input=$('adminAstrologerLanguages_'+id),msg=$('adminAstrologerLanguagesMsg_'+id);
      const languages=String(input?.value||'').split(/[,;|]/).map(v=>v.trim().replace(/\s+/g,' ')).filter(Boolean);
      if(!languages.length||languages.length>12||languages.some(v=>v.length>40)||languages.join(', ').length>240){if(msg)msg.innerHTML='<span class="error">Enter 1–12 languages, each up to 40 characters.</span>';return;}
      b.disabled=true;b.textContent='SAVING…';
      try{
        const result=await renderApi('/admin/astrologer-languages',{method:'POST',body:JSON.stringify({astrologerId:id,languages})});
        if(!result?.success)throw new Error(result?.error||'The backend did not confirm the language update.');
        await smvAdminTouch();window.__smvInvalidatePublicAstrologersOnce?.();window.dispatchEvent(new Event('smv:astrologer-languages-changed'));
        if(msg)msg.innerHTML='<span class="success">Languages saved.</span>';
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';}
      finally{b.disabled=false;b.textContent='SAVE LANGUAGES';}
    });

    profileBox.querySelectorAll('[data-live-prices-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.livePricesSave,callInput=$('adminCallPrice_'+id),liveChatInput=$('adminLiveChatPrice_'+id),msg=$('adminChatPriceMsg_'+id);
      const callRaw=String(callInput?.value||'').trim();
      const callPrice=callRaw===''?null:Number(callRaw);
      const liveChatRaw=String(liveChatInput?.value||'').trim();
      const liveChatPrice=liveChatRaw===''?null:Number(liveChatRaw);
      if(callRaw===''&&liveChatRaw===''){
        if(msg)msg.innerHTML='<span class="error">Enter at least one price to save.</span>';return;
      }
      if(callRaw!==''&&(!Number.isFinite(callPrice)||callPrice<0||(callPrice!==0&&callPrice<1)||callPrice>10000||Math.abs(callPrice*100-Math.round(callPrice*100))>1e-7)){
        if(msg)msg.innerHTML='<span class="error">Live Call Price must be ₹0 (unset) or ₹1–₹10000 per minute, up to two decimals.</span>';return;
      }
      if(liveChatRaw!==''&&(!Number.isFinite(liveChatPrice)||liveChatPrice<0||(liveChatPrice!==0&&liveChatPrice<1)||liveChatPrice>10000||Math.abs(liveChatPrice*100-Math.round(liveChatPrice*100))>1e-7)){
        if(msg)msg.innerHTML='<span class="error">Live Chat Price must be ₹0 (unset) or ₹1–₹10000 per minute, up to two decimals.</span>';return;
      }
      b.disabled=true;b.textContent='SAVING…';
      try{
        const payload={astrologerId:id};
        if(callRaw!=='')payload.callPricePerMinute=callPrice;
        if(liveChatRaw!=='')payload.chatPricePerMinute=liveChatPrice;
        const result=await renderApi('/admin/astrologer-pricing',{method:'POST',body:JSON.stringify(payload)});
        if(!result?.success)throw new Error(result?.error||'The backend did not confirm pricing changes.');
        await smvAdminTouch();
        window.__smvInvalidatePublicAstrologersOnce?.();
        window.dispatchEvent(new Event('smv:astrologer-pricing-changed'));
        const changed=[callRaw!==''?'Live Call rate':'',liveChatRaw!==''?'Live Chat rate':''].filter(Boolean);
        if(msg)msg.innerHTML='<span class="success">'+escapeHtml(changed.join(', '))+' saved. Blank fields are unchanged; enter ₹0 in a per-minute field to unset that rate.</span>';
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e?.message||String(e))+'</span>';}
      finally{b.disabled=false;b.textContent='SAVE PRICES';}
    });

    profileBox.querySelectorAll('[data-profile-permission]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profilePermission,allow=b.dataset.next==='allow';
      b.disabled=true;
      try{
        const r=await renderApi('/admin/astrologer-profile-permission',{method:'POST',body:JSON.stringify({astrologerId:id,allow})});
        if(!r?.success)throw new Error(r?.error||'The backend did not confirm profile permission changes.');
        await smvAdminTouch();
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
        const r=await renderApi('/admin/astrologer-profile-description',{method:'POST',body:JSON.stringify({astrologerId:id,action:'save',description})});
        if(!r?.success)throw new Error(r?.error||'The backend did not confirm the description update.');
        await smvAdminTouch();
        if(msg)msg.innerHTML='<span class="success">Public description updated by Admin.</span>';
        loadAstroCards().catch(()=>{});
      }catch(e){if(msg)msg.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';}
      finally{b.disabled=false;b.textContent='SAVE PUBLIC DESCRIPTION';}
    });

    profileBox.querySelectorAll('[data-profile-approve]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.profileApprove;
      b.disabled=true;
      try{
        const r=await renderApi('/admin/astrologer-profile-description',{method:'POST',body:JSON.stringify({astrologerId:id,action:'approve'})});
        if(!r?.success)throw new Error(r?.error||'The backend did not confirm description approval.');
        await smvAdminTouch();
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
        const r=await renderApi('/admin/astrologer-profile-description',{method:'POST',body:JSON.stringify({astrologerId:id,action:'reject'})});
        if(!r?.success)throw new Error(r?.error||'The backend did not confirm description rejection.');
        await setDoc(doc(db,'smv_notifications',id+'_profile_rejected_'+Date.now()),{userId:id,type:'profile_description',title:'Profile description not approved',message:'Your submitted profile description was not approved by Admin. Your existing public description remains unchanged.',createdAt:serverTimestamp(),read:false});
        await smvAdminTouch();
        await loadAdminPanel();
      }catch(e){alert(e.message||String(e));b.disabled=false;}
    });
  }

  // Approved Astrologer payment-method changes awaiting Admin review.
  const payoutBox=$('adminPayoutChanges');
  try{
    const payoutSnap=await withTimeout(getDocs(query(collection(db,'smv_payouts'),where('status','==','pending_admin_review'))),12000);
    const pendingPayouts=smvSortDashboardDesc(payoutSnap.docs.filter(d=>{const a=astros.docs.find(x=>x.id===d.id)?.data()||{};return String(a.status||'').toLowerCase()==='approved';}));
    payoutBox.innerHTML=pendingPayouts.length?pendingPayouts.map(d=>{const p=d.data()||{};const a=astros.docs.find(x=>x.id===d.id)?.data()||{};return `<div class="card" style="margin:10px 0"><h3>${escapeHtml(a.name||d.id)}</h3><div class="small"><b>Astrologer ID:</b> ${escapeHtml(d.id)} · <b>Submitted:</b> ${escapeHtml(smvDateTime(p.requestedAt||p.updatedAt))}</div><div class="small" style="margin-top:8px"><b>PRIVATE PAYMENT DETAILS:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'—')}</div><div class="action-row" style="margin-top:10px"><button class="btn" data-payout-approve="${escapeHtml(d.id)}">APPROVE</button><button class="btn gray" data-payout-reject="${escapeHtml(d.id)}">REJECT</button></div><input id="payoutReject_${escapeHtml(d.id)}" placeholder="Rejection reason (required if rejecting)"></div>`;}).join(''):'<div class="empty">No payment method changes waiting for Admin approval.</div>';
    payoutBox.querySelectorAll('[data-payout-approve]').forEach(b=>b.onclick=async()=>{const id=b.dataset.payoutApprove;b.disabled=true;try{const r=await withTimeout(renderApi('/admin/payout-change-status',{method:'POST',body:JSON.stringify({astrologerId:id,status:'approved'})}),15000);if(!r?.success)throw new Error(r?.error||'Unable to approve payment method.');alert('Payment method approved.');await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
    payoutBox.querySelectorAll('[data-payout-reject]').forEach(b=>b.onclick=async()=>{const id=b.dataset.payoutReject,reason=$('payoutReject_'+id)?.value.trim()||'';if(!reason){alert('Enter rejection reason.');return;}b.disabled=true;try{const r=await withTimeout(renderApi('/admin/payout-change-status',{method:'POST',body:JSON.stringify({astrologerId:id,status:'rejected',reason})}),15000);if(!r?.success)throw new Error(r?.error||'Unable to reject payment method.');alert('Payment method rejected.');await loadAdminPanel();}catch(e){alert(e.message||String(e));b.disabled=false;}});
  }catch(e){payoutBox.innerHTML='<div class="empty error">Payment method approval list could not be loaded right now.</div>';console.warn('Admin payout changes load skipped:',e);}

  // Admin payout and withdrawal history is loaded from trusted backend records.
  const withdrawalPayload=await renderApi('/admin/withdrawals-data',{method:'GET'});
  const withdrawalDocs=smvSortDashboardDesc(Array.isArray(withdrawalPayload?.withdrawals)?withdrawalPayload.withdrawals:[]).slice(0,50);
  $('adminWithdrawals').innerHTML=withdrawalDocs.length?withdrawalDocs.map(w=>{const docId=String(w.id||'');return `<div class="card" style="margin:10px 0"><b>₹${Number(w.amount||0).toFixed(2)}</b> · <b>${escapeHtml(w.status||'pending').toUpperCase()}</b><div class="small">Astrologer: ${escapeHtml(w.astrologerName||w.astrologerId||'')} · Astrologer ID: ${escapeHtml(w.astrologerId||'')}<br><b>Withdrawal ID:</b> ${escapeHtml(w.withdrawalId||'—')}${String(w.status||'').toLowerCase()==='paid' && /^(?:smvpt-|smv-pmt-)/i.test(String(w.adminPaymentId||'')) ? `<br><b>Admin Payment ID:</b> ${escapeHtml(w.adminPaymentId)}` : ''}<br>Requested: ${escapeHtml(smvDateTime(w.createdAt||w.requestedAt))}${String(w.status||'').toLowerCase()==='paid' && w.paidAt ? `<br><b>Paid Date & Time:</b> ${escapeHtml(smvDateTime(w.paidAt))}` : ''}</div><div id="withdrawBank_${docId}" class="small" style="margin-top:8px"><b>PRIVATE PAYMENT DETAILS:</b> Loading…</div><div class="action-row">${w.status==='pending'?`<button class="btn" data-wstatus="${docId}" data-status="processing">MARK PROCESSING</button><button class="btn gray" data-wstatus="${docId}" data-status="rejected">REJECT</button>`:''}${w.status==='processing'?`<button class="btn" data-wstatus="${docId}" data-status="paid">MARK PAID</button>`:''}${String(w.status||'').toLowerCase()==='paid' && !/^(?:smvpt-|smv-pmt-)/i.test(String(w.adminPaymentId||''))?`<button class="btn" data-wstatus="${docId}" data-status="paid">CREATE ADMIN PAYMENT ID</button>`:''}</div></div>`}).join(''):'<div class="empty">No withdrawal requests.</div>';
  withdrawalDocs.forEach(w=>{
    const docId=String(w.id||''),p=w.payout||{},bankBox=$('withdrawBank_'+docId);
    if(!bankBox)return;
    bankBox.innerHTML=p.available?`<b>PRIVATE PAYMENT DETAILS:</b> Bank: ${escapeHtml(p.bankName||'')} · Holder: ${escapeHtml(p.accountName||'')} · Account: ${escapeHtml(p.accountNumber||'')} · IFSC: ${escapeHtml(p.ifsc||'')} · UPI: ${escapeHtml(p.upi||'—')}`:'<b>PRIVATE PAYMENT DETAILS:</b> Not available.';
  });
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

        const withdrawalRef = doc(db,'smv_withdrawals',withdrawalId);
        const w = withdrawalDocs.find(x=>String(x.id||'')===String(withdrawalId||''))||{};
        if(!w.id)throw new Error('Withdrawal request not found in the current Admin list. Please refresh and try again.');

        let adminPaymentId = String(w.adminPaymentId || w.paymentId || '');

        // IMPORTANT: smvpt is created only when Admin actually marks the
        // withdrawal as PAID. Withdrawal request itself remains smvwd.
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

        await smvAdminTouch();

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
  /* Active Admin earnings history: completed Live Call / Chat and scheduled bookings only. */
  try {
    const livePayments=payments.docs
      .map(d=>({id:d.id,...(d.data()||{})}))
      .filter(p=>p.source==='live_session'&&p.type==='astrologer_earning'&&p.status==='credited');
    let adminTotal=0;
    const earningRows=livePayments.map(p=>{
      const gross=Number(p.grossAmount||0);
      const astrologerShare=Number(p.commissionAmount??p.earningAmount??0);
      const adminShare=Number(p.adminCommissionAmount??Math.max(0,Math.round((gross-astrologerShare)*100)/100));
      adminTotal+=adminShare;
      const dt=p.commissionCreditedAt||p.createdAt||p.updatedAt||null;
      const mode=String(p.mode||'chat').toUpperCase();
      const sessionId=String(p.sessionId||p.bookingId||p.paymentId||p.id);
      return {
        time:smvDateSortMs(dt),
        html:`<div style="padding:12px 0;border-bottom:1px solid #eee"><div><b>₹${adminShare.toFixed(2)}</b> <span class="success">Admin Earnings Credited</span></div><div class="small"><b>Live ${escapeHtml(mode)} / Booking ID:</b> ${escapeHtml(sessionId)}</div><div class="small"><b>Customer:</b> ${escapeHtml(p.customerName||p.customerId||'Customer')} · <b>Astrologer:</b> ${escapeHtml(p.astrologerName||p.astrologerId||'Astrologer')}</div><div class="small">Gross ₹${gross.toFixed(2)} · Astrologer share ₹${astrologerShare.toFixed(2)} · Credited: ${escapeHtml(smvDateTime(dt))}</div></div>`
      };
    });
    const adminRows=earningRows.sort((a,b)=>b.time-a.time).map(x=>x.html).join('');
    $('adminEarningsHistory').innerHTML=`<div class="stats-grid" style="margin-bottom:12px"><div class="stat">Total Admin Earnings <b>₹${adminTotal.toFixed(2)}</b></div><div class="stat">Credited Live Sessions / Bookings <b>${livePayments.length}</b></div></div>${adminRows||'<div class="empty">No credited Live Call / Chat earnings yet.</div>'}`;
  } catch(e) {
    console.warn('Admin Live earnings history load skipped:',e);
    if($('adminEarningsHistory'))$('adminEarningsHistory').innerHTML='<div class="empty">Live earnings history could not be loaded right now.</div>';
  }

  const reviewsPayload=await renderApi('/admin/reviews-data',{method:'GET'});
  const adminReviewItems=smvSortDashboardDesc(Array.isArray(reviewsPayload?.reviews)?reviewsPayload.reviews:[]).slice(0,50);

$('adminReviews').innerHTML =
  !adminReviewItems.length
    ? '<div class="empty">No reviews yet.</div>'
    : adminReviewItems
        .map(r => {

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
                  data-review-edit="${r.id}">
                  EDIT REVIEW
                </button>

                ${
                  r.approved === true
                    ? ''
                    : `
                      <button
                        class="btn"
                        data-review-approve="${r.id}">
                        APPROVE REVIEW
                      </button>

                      <button
                        class="btn gray"
                        data-review-reject="${r.id}">
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

        const reviewRef=doc(db,'smv_reviews',reviewId);
        const r=adminReviewItems.find(x=>String(x.id||'')===String(reviewId||''));
        if(!r)throw new Error('Review not found in the current Admin list. Please refresh and try again.');

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

              await smvAdminTouch();

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

        await smvAdminTouch();
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

        await smvAdminTouch();
        smvNotice('Review Deleted','The customer review was rejected and deleted successfully.','✓');

        await loadAdminPanel();

      } catch (e) {

        smvNotice('Unable to Reject Review',e.message || String(e),'!');

        b.disabled = false;
        b.textContent = 'REJECT REVIEW';
      }

    };

  });
  smvLiveStatus('Updated just now');
  const refresh=$('smvRefreshAdmin');if(refresh)refresh.textContent='Refresh';
 }catch(e){
 const message='<div class="empty error">'+escapeHtml(e.message||String(e))+'</div>';
 if($('adminDataLoadMsg'))$('adminDataLoadMsg').innerHTML=message;
 document.querySelectorAll('#admin .empty').forEach(el=>{if(/^Loading\b/i.test(el.textContent.trim()))el.innerHTML=message;});
  }
}
if(auth){ onAuthStateChanged(auth,async user=>{
   const isInitialAuthState=!smvInitialAuthStateHandled;
   smvInitialAuthStateHandled=true;
   const previousUid=lastAuthUid;
   if(previousUid!==user?.uid)smvStopLive();
   if(previousUid!== (user?.uid||null)){ ++dashboardLoadSeq; dashboardLoadPromise=null; dashboardLoadUid=null; }
   currentUser=user; window.__smvFirebaseCurrentUser=user||null; window.__smvCurrentUserPresent=!!user;
   if(authReadyResolve){authReadyResolve();authReadyResolve=null;}
   if(previousUid && (!user || previousUid!==user.uid)){
     hide('dashboard'); hide('admin'); hide('dashLink'); hide('adminLink');
   }
   smvSyncHeaderAuthNav(user);
   if(user){
     hide('smv-content-hub'); window.__smvContentVisible=false;
     lastAuthUid=user.uid; window.__SMV_LOGGED_OUT=false; touchSession(); armIdleTimer(); window.dispatchEvent(new Event('smv:auth-user'));
     if(user.uid!==ADMIN_UID && !user.emailVerified){
       // V200 registration race guard: createUserWithEmailAndPassword emits this
       // callback before the trusted backend has created smv_users/public ID.
       // Do not sign out the just-created user until that registration transaction finishes.
       if(smvRegistrationInProgress){ armIdleTimer(); return; }
       await signOut(auth); currentUser=null; clearIdleTimer(); lastAuthUid=null; hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink"); smvSyncHeaderAuthNav(null); return;
     }
     // signInWithPopup also fires this listener. Let the explicit Google role
     // resolver own navigation until the registered SMV role is verified.
     if(smvGoogleLoginInProgress || smvEmailLoginInProgress){ armIdleTimer(); return; }
     // Fresh website/PWA launch with a persisted Firebase user is NOT a new
     // login. Preserve authentication, but never reopen the last Customer,
     // Astrologer or Admin dashboard automatically. The user starts at Home
     // and can open Dashboard explicitly. This branch is intentionally after
     // the explicit-login guard so first-time Login still opens its dashboard.
     if(isInitialAuthState){
       hide('dashboard'); hide('admin');
       smvInternalView='home';
       try{history.replaceState({smvView:'home'},'',location.pathname+location.search);}catch(_e){}
       showHomeSurface();
       smvShowRoleNav();
       armIdleTimer();
       return;
     }
     // Firebase can emit another auth callback after the initial restore. Keep a
     // freshly opened website on Home until the user explicitly requests a
     // dashboard. This prevents a late token/profile callback from restoring the
     // previous dashboard after a tab/app reopen.
     if(smvColdStartHomeLock){
       hide('dashboard'); hide('admin');
       smvInternalView='home';
       try{history.replaceState({smvView:'home'},'',location.pathname+location.search);}catch(_e){}
       showHomeSurface();
       smvShowRoleNav();
       armIdleTimer();
       return;
     }
     if(window.__SMV_PUBLIC_ROUTE){smvShowRoleNav();armIdleTimer();return;}
     const listenerEpoch=smvNavigationEpoch;
     const headerRole=await resolveSmvRole(user);
     const adminUser=headerRole==='admin';
     setHeaderRoleLabel(headerRole);
     window.__smvCurrentRole=headerRole;
     // Keep this auth callback from overriding a newer explicit navigation.
      if(listenerEpoch!==smvNavigationEpoch){armIdleTimer();return;}
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
       smvRenderFastDashboardShell(headerRole);
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
     smvSyncHeaderAuthNav(null);
     show('smv-content-hub'); window.__smvContentVisible=false;
     showHomeSurface();
     smvInternalView="home";
   }
 }); }
if(firebaseInitError){
  console.error("SMV ASTRO Firebase is unavailable. Basic navigation is still available.",firebaseInitError);
}


// Phase 1 Live Call / Chat client. Prices and settlement remain server-owned.
let smvLiveEventController=null,smvLiveEventUid='',smvLiveEventRetry=null,smvLiveCurrentSession=null,smvLivePanelSessionId='',smvLivePricingLoadedAt=0;
let smvLivePeer=null,smvLiveLocalStream=null,smvLiveRemoteStream=null,smvLiveSignalTimer=null,smvLiveMessageTimer=null,smvLiveDashboardTimer=null,smvLiveClockTimer=null;
let smvLiveEventStreamConnected=false,smvLiveTransportPrimedSessionId='';
let smvLiveDashboardStatusTimer=null;
const smvLiveDashboardSessionsById=new Map();
let smvLivePollBusy=false,smvLiveSignalSeen=new Set(),smvLiveMessageSeen=new Set(),smvLiveQueuedIce=[],smvLiveReadySentKey='',smvLiveOfferStartedKey='',smvLiveSignalSinceMs=0,smvLiveMessageSinceMs=0;
let smvLiveAudioContext=null,smvLiveRingTimer=null,smvLiveRingActive=false,smvLiveRingMuted=false,smvLiveRingUnlocked=false,smvLiveScheduledPollAt=0;
let smvLiveScheduledRefreshTimer=null,smvLiveScheduledAppointmentsCache=[];
let smvLiveRingSuppressedIds=new Set(),smvLiveRingCurrentId='',smvLiveRingtoneNodes=new Set();
let smvLivePreparationTimer=null,smvLivePreparationSessionId='',smvLiveCustomerAppointmentsPollAt=0;
let smvLiveForegroundMessagingBound = false, smvLivePendingPushOpen = null;
let smvLiveNativePushTokenRegistered = '';
async function smvLiveRegisterNativePushToken(tokenOverride=''){
 const bridge=window.SMVNativeCalls;
 if(!bridge||typeof bridge.isNativeApp!=='function'||!bridge.isNativeApp())return false;
 if(String(window.__smvCurrentRole||'').toLowerCase()!=='astrologer'||!auth?.currentUser)return false;
 let token=String(tokenOverride||window.__smvNativeFcmToken||'').trim();
 if(!token){try{token=String(bridge.getFcmToken?.()||'').trim();}catch(_){}}
 if(!token){try{bridge.requestTokenRefresh?.();}catch(_){}return false;}
 if(smvLiveNativePushTokenRegistered===token)return true;
 try{
  const permissionCheck=typeof bridge.areNotificationsEnabled==='function'?bridge.areNotificationsEnabled():true;
  if(!permissionCheck)throw new Error('Android notifications are disabled for SMV ASTRO. Enable them in Android App settings.');
  await renderApi('/live/push/register',{method:'POST',body:JSON.stringify({token,platform:'native-android',userAgent:'SMV ASTRO Android'})});
  smvLiveNativePushTokenRegistered=token;
  return true;
 }catch(error){console.warn('Native Android FCM registration failed:',error?.message||error);return false;}
}
window.__smvNativeFcmTokenReady=token=>{
 window.__smvNativeFcmToken=String(token||'').trim();
 if(String(window.__smvCurrentRole||'').toLowerCase()==='astrologer'){
  void smvLiveRegisterNativePushToken(window.__smvNativeFcmToken);
 }
};
async function smvLiveEnableBackgroundAlerts(){
 if(String(window.__smvCurrentRole||'').toLowerCase()!=='astrologer')throw new Error('Background Alerts can only be enabled from the Astrologer Dashboard.');
 if(window.SMVNativeCalls?.isNativeApp?.()){
  const nativeRegistered=await smvLiveRegisterNativePushToken();
  if(nativeRegistered)return {registered:true,platform:'native-android'};
  throw new Error('Native Call Ringtone is not configured on this SMV ASTRO app yet. Register the Android app in Firebase project smv-astro, set SMV_FIREBASE_ANDROID_APP_ID when building, then reopen SMV ASTRO.');
 }
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('Notification' in window))throw new Error('Background Alerts require HTTPS and a supported browser. Install SMV ASTRO as a PWA on mobile for the most reliable experience.');
 if(!navigator.serviceWorker?.register)throw new Error('This browser cannot register a background notification worker.');
 if(Notification.permission==='denied')throw new Error('Notifications are blocked for this site. Enable notifications in your browser or Android app settings, then try again.');
 const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Allow notifications for SMV ASTRO to receive background Call, Chat and Booking alerts.');
 if(!app)throw new Error('Firebase has not initialized. Refresh SMV ASTRO and try again.');
 const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
 await navigator.serviceWorker.ready;
 if(!registration.pushManager)throw new Error('Push notifications are not supported by this browser. On iPhone, install SMV ASTRO to the Home Screen and open the installed app.');
 const messagingModule=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js');
 if(!(await messagingModule.isSupported()))throw new Error('Firebase Web Push is not supported in this browser. Use current Chrome on Android, or install SMV ASTRO to the Home Screen on a supported iPhone/iPad.');
 const pushConfig=await renderApi('/public/push-config',{method:'GET',timeoutMs:12000});
 const vapidKey=String(pushConfig?.vapidPublicKey||'').trim();
 if(!vapidKey)throw new Error('Firebase Web Push key is not configured on the server. Set Render environment variable FCM_VAPID_PUBLIC_KEY from Firebase Console → Project settings → Cloud Messaging → Web Push certificates.');
 const messaging=messagingModule.getMessaging(app);
 const token=await messagingModule.getToken(messaging,{vapidKey,serviceWorkerRegistration:registration});
 if(!token)throw new Error('The push service did not issue a device token. Check Firebase Cloud Messaging setup and retry.');
 const onMessage=messagingModule.onMessage;
 await renderApi('/live/push/register',{method:'POST',body:JSON.stringify({token,userAgent:navigator.userAgent})});
 if(!smvLiveForegroundMessagingBound){
  onMessage(messaging,payload=>{
   const data=payload?.data||{},type=String(data.type||'');
   if(type==='push_test'&&Notification.permission==='granted'){
    navigator.serviceWorker.ready.then(registration=>registration.showNotification(String(data.title||'SMV ASTRO Test Alert'),{body:String(data.body||'Background alert delivery is active.'),icon:'/assets/icon-192.png',badge:'/assets/favicon-64.png',tag:String(data.tag||'smv-push-test'),data:{url:'/'}})).catch(error=>console.warn('Foreground push test display failed:',error?.message||error));
    const status=$('smvLivePushStatus');if(status)status.textContent='Test Alert arrived while SMV ASTRO was open. Close the browser or turn the screen off to test background delivery.';
   }
  });
  smvLiveForegroundMessagingBound=true;
 }
 return {registered:true};
}
function smvLiveBindPushControls(){
 if(String(window.__smvCurrentRole||'').toLowerCase()!=='astrologer')return;
 const enable=$('smvLivePushEnable'),test=$('smvLivePushTest'),status=$('smvLivePushStatus');
 const nativeMode=!!window.SMVNativeCalls?.isNativeApp?.();
 if(nativeMode&&test)test.disabled=true;
 if(nativeMode){
  void smvLiveRegisterNativePushToken().then(registered=>{
   if(test)test.disabled=!registered;
   if(status)status.textContent=registered
    ?'Native Android incoming-call ringtone is registered on this SMV ASTRO app. Keep Android notifications and ringtone volume enabled.'
    :'Native Android ringtone is not configured on this SMV ASTRO app. Firebase Android App ID setup is required; the ordinary browser Push setting is separate.';
  });
 }
 if(enable&&!enable.dataset.bound){
  enable.dataset.bound='1';
  enable.onclick=async()=>{
   enable.disabled=true;
   if(status)status.textContent='Requesting notification permission and registering this device…';
   try{
    await smvLiveEnableBackgroundAlerts();
    const nativeMode=!!window.SMVNativeCalls?.isNativeApp?.();
    enable.textContent=nativeMode?'ANDROID CALL ALERTS ENABLED':'BACKGROUND ALERTS ENABLED';
    if(status)status.textContent=nativeMode
      ?'Native Android incoming-call ringtone is registered. Ringing stops when the request is opened/handled or times out.'
      :'This device is registered for Call, Chat and Booking Push Alerts. Keep Android notifications enabled.';
    if(test)test.disabled=false;
   }catch(error){if(status)status.textContent=error?.message||String(error);}
   finally{enable.disabled=false;}
  };
 }
 if(test&&!test.dataset.bound){
  test.dataset.bound='1';
  test.onclick=async()=>{
   test.disabled=true;if(status)status.textContent='Sending a test push alert…';
   try{
    await renderApi('/live/push/test',{method:'POST',body:JSON.stringify({})});
    if(status)status.textContent='Test alert accepted by Firebase. If this page is visible, look for an SMV ASTRO Test Alert. For background testing, close the site or turn the screen off.';
   }catch(error){if(status)status.textContent=error?.message||String(error);}
   finally{test.disabled=false;}
  };
 }
 renderApi('/live/push/status',{method:'GET',timeoutMs:12000}).then(r=>{
  if(status)status.textContent=Number(r.registeredDevices||0)
   ? 'Registered push device(s): '+Number(r.registeredDevices)+'. Enable alerts on every phone/browser that should ring.'
   : 'Background alerts are not enabled on this device yet. Tap ENABLE BACKGROUND ALERTS and allow notifications.';
 }).catch(()=>{});
}
function smvLiveMoney(paise){const n=Number(paise);return '₹'+((Number.isSafeInteger(n)&&n>=0?n:0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function smvLiveCanonicalMode(session,fallback=''){
 const values=[session?.mode,session?.sessionMode,session?.consultationMode,session?.type,fallback];
 for(const value of values){
  const raw=String(value||'').toLowerCase().replace(/[^a-z]/g,'');
  if(raw.includes('chat'))return 'chat';
  if(raw.includes('call')||raw.includes('voice'))return 'call';
 }
 return '';
}
function smvLiveName(...values){
 return values.map(v=>String(v||'').trim()).find(v=>v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))||'';
}
function smvLiveOtherParticipantName(session=smvLiveCurrentSession){
 const s=session||{},uid=String(currentUser?.uid||'');
 if(uid&&uid===String(s.customerUid||''))return smvLiveName(s.astrologerName,s.astrologerFullName,s.astrologerDisplayName)||'Astrologer';
 if(uid&&uid===String(s.astrologerUid||''))return smvLiveName(s.customerName,s.customerFullName,s.customerDisplayName)||'Customer';
 return smvLiveName(s.astrologerName,s.astrologerFullName,s.astrologerDisplayName,s.customerName,s.customerFullName,s.customerDisplayName)||'Other participant';
}
function smvLiveRingButtonSync(){
 const buttons=[$('smvLiveRingToggle'),$('smvLiveRingToggleSession')].filter(Boolean);
 for(const button of buttons){
  button.textContent=!smvLiveRingUnlocked?'ENABLE RING SOUND':(smvLiveRingMuted?'UNMUTE RING SOUND':'MUTE RING SOUND');
  button.setAttribute('aria-pressed',String(smvLiveRingUnlocked&&!smvLiveRingMuted));
  button.title=!smvLiveRingUnlocked?'Tap once to allow the browser to play incoming-request melody':(smvLiveRingMuted?'Tap to unmute incoming-request melody':'Tap to mute incoming-request melody');
 }
}
function smvLiveStopRingtone(){
 smvLiveRingActive=false;
 if(smvLiveRingTimer){clearTimeout(smvLiveRingTimer);smvLiveRingTimer=null;}
 for(const node of smvLiveRingtoneNodes){
  try{node.oscillator.onended=null;node.oscillator.stop();}catch(_){}
  try{node.oscillator.disconnect();node.gain.disconnect();}catch(_){}
 }
 smvLiveRingtoneNodes.clear();
 smvLiveRingCurrentId='';
}
function smvLiveDismissSessionUi(sessionId){const id=String(sessionId||smvLivePanelSessionId||'');if(id)smvLiveRingSuppressedIds.add(id);smvLiveStopRingtone();smvLiveStopPreparationCountdown();}
function smvLivePlayRingtoneMelody(){
 if(!smvLiveRingActive||smvLiveRingMuted||!smvLiveRingUnlocked||!smvLiveAudioContext||smvLiveAudioContext.state!=='running')return;
 const ctx=smvLiveAudioContext,start=ctx.currentTime+0.03;
 const notes=[[784,0],[988,.19],[1175,.38],[988,.70],[880,.91],[659,1.12]];
 for(const [frequency,offset] of notes){
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=start+offset;
  const node={oscillator,gain};smvLiveRingtoneNodes.add(node);
  oscillator.onended=()=>{smvLiveRingtoneNodes.delete(node);try{oscillator.disconnect();gain.disconnect();}catch(_){}};
  oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);
  gain.gain.setValueAtTime(0.0001,at);gain.gain.linearRampToValueAtTime(0.13,at+.025);gain.gain.exponentialRampToValueAtTime(0.0001,at+.17);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(at);oscillator.stop(at+.19);
 }
 if(smvLiveRingTimer)clearTimeout(smvLiveRingTimer);
 smvLiveRingTimer=setTimeout(()=>{smvLiveRingTimer=null;smvLivePlayRingtoneMelody();},1900);
}
function smvLiveStartRingtone(sourceId=''){
 if(String(window.__smvCurrentRole||'').toLowerCase()!=='astrologer')return;
 const id=String(sourceId||smvLiveCurrentSession?.id||'');
 if(id&&smvLiveRingSuppressedIds.has(id)){if(smvLiveRingCurrentId===id)smvLiveStopRingtone();return;}
 if(id)smvLiveRingCurrentId=id;
 smvLiveRingActive=true;
 if(smvLiveRingMuted){smvLiveRingButtonSync();return;}
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!smvLiveAudioContext)smvLiveAudioContext=new Audio();
  if(smvLiveRingUnlocked&&smvLiveAudioContext.state!=='running')smvLiveAudioContext.resume().then(()=>smvLivePlayRingtoneMelody()).catch(()=>{});
  else if(smvLiveRingUnlocked)smvLivePlayRingtoneMelody();
 }catch(error){console.warn('Incoming melody is unavailable in this browser:',error);}
 smvLiveRingButtonSync();
}
function smvLiveToggleRingtone(){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){const b=$('smvLiveRingToggle');if(b)b.textContent='SOUND NOT SUPPORTED';return;}
  if(!smvLiveAudioContext)smvLiveAudioContext=new Audio();
  if(!smvLiveRingUnlocked){
   smvLiveRingUnlocked=true;smvLiveRingMuted=false;
   const resumed=smvLiveAudioContext.resume();
   if(resumed&&typeof resumed.then==='function')resumed.then(()=>{if(smvLiveRingActive)smvLivePlayRingtoneMelody();}).catch(()=>{});
   else if(smvLiveRingActive)smvLivePlayRingtoneMelody();
  }else{
   smvLiveRingMuted=!smvLiveRingMuted;
   if(smvLiveRingMuted&&smvLiveRingTimer){clearTimeout(smvLiveRingTimer);smvLiveRingTimer=null;}
   else if(!smvLiveRingMuted&&smvLiveRingActive)smvLiveAudioContext.resume().then(()=>smvLivePlayRingtoneMelody()).catch(()=>{});
  }
 }catch(error){console.warn('Incoming melody toggle failed:',error);}
 smvLiveRingButtonSync();
}
const SMV_LIVE_SESSION_STATE_RANK=Object.freeze({ringing:0,preparing:1,connecting:2,active:3,ended:4});
function smvLiveMergeSessionState(previous,incoming){
 const before=previous&&typeof previous==='object'?previous:{};
 const next=incoming&&typeof incoming==='object'?incoming:{};
 const merged={...before,...next};
 const previousState=String(before.state||before.status||'');
 const incomingState=String(next.state||next.status||'');
 const previousRank=SMV_LIVE_SESSION_STATE_RANK[previousState];
 const incomingRank=SMV_LIVE_SESSION_STATE_RANK[incomingState];
 // An older Firestore/SSE/poll response must never move a session backwards.
 // In particular, a delayed "connecting" event must not hide an active Live Chat.
 if(previousState==='ended'&&incomingState!=='ended')return {...merged,...before,state:'ended',status:'ended'};
 if(Number.isInteger(previousRank)&&Number.isInteger(incomingRank)&&incomingRank<previousRank)return {...merged,...before};
 return merged;
}
function smvLiveChatIsActive(session){return smvLiveCanonicalMode(session)==='chat'&&String(session?.state||session?.status||'')==='active';}
function smvLiveSessionStatusLabel(session){
 const s=String(session?.state||session?.status||'');
 const mode=smvLiveCanonicalMode(session);
 if(s==='preparing'){
  const until=Date.parse(session?.preparationUntil||'');
  const started=Date.parse(session?.preparationStartedAt||session?.acceptedAt||session?.createdAt||'');
  const deadline=Number.isFinite(until)?until:(Number.isFinite(started)?started+180000:Date.now()+180000);
  const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  const clock=String(Math.floor(remaining/60))+':'+String(remaining%60).padStart(2,'0');
  if(String(session?.customerUid||'')===String(currentUser?.uid||''))return 'Please wait.... '+clock;
  return 'Generate Customer Horoscope · '+clock;
 }
 if(s==='connecting'){
  if(mode==='chat')return String(session?.astrologerUid||'')===String(currentUser?.uid||'')?'Connect Customer Chat Now to open Live Chat…':'Waiting for Astrologer to connect Chat…';
  if(mode==='call')return String(session?.customerUid||'')===String(currentUser?.uid||'')?'Connect to Astrologer':'Connect Customer Call / Microphone';
  return 'Connecting…';
 }
 return ({ringing:'Ringing — waiting for Astrologer',active:'Connected',ended:'Session ended'})[s]||s||'Request sent';
}
function smvLivePanelHtml(s,incoming){
 const id=String(s.id||s.sessionId||''),mode=smvLiveCanonicalMode(s),call=mode==='call',chat=mode==='chat',active=s.state==='active',ringing=s.state==='ringing',inv=!!incoming&&ringing,connectable=call&&['connecting','active'].includes(String(s.state||''));
 const viewerIsCustomer=String(currentUser?.uid||'')===String(s.customerUid||''),youName=viewerIsCustomer?smvLiveName(s.customerName,s.customerFullName,s.customerDisplayName)||'Customer':smvLiveName(s.astrologerName,s.astrologerFullName,s.astrologerDisplayName)||'Astrologer',otherName=viewerIsCustomer?smvLiveName(s.astrologerName,s.astrologerFullName,s.astrologerDisplayName)||'Astrologer':smvLiveName(s.customerName,s.customerFullName,s.customerDisplayName)||'Customer';
 const rootStyle='height:calc(100dvh - 60px - env(safe-area-inset-bottom));max-height:calc(100dvh - 60px - env(safe-area-inset-bottom));overflow:hidden;display:flex;flex-direction:column;overscroll-behavior:contain;box-sizing:border-box;width:100%;max-width:100%;min-width:0;padding:8px 10px;background:#fff8e7;color:#30251b;-webkit-text-fill-color:#30251b;border:1px solid #d4af37;border-radius:10px;overflow-wrap:anywhere;line-height:1.35';
 const primaryStyle='background:#5b2a86;color:#fff;-webkit-text-fill-color:#fff;border:1px solid #d4af37;border-radius:8px;padding:7px 10px;min-height:36px;max-width:100%;white-space:normal;font-weight:700';
 const secondaryStyle='background:#fffaf0;color:#30251b;-webkit-text-fill-color:#30251b;border:1px solid #c9b8e4;border-radius:8px;padding:7px 10px;min-height:36px;max-width:100%;white-space:normal;font-weight:700';
 return '<div id="smvLiveSessionPanel" class="smv-live-session-panel" data-live-session="'+escapeHtml(id)+'" style="'+rootStyle+'"><div class="smv-live-session-body" style="flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;box-sizing:border-box;padding-bottom:8px"><span class="badge" style="display:inline-block;background:#5b2a86;color:#fff;-webkit-text-fill-color:#fff;border:1px solid #d4af37;padding:4px 8px;border-radius:6px">'+(call?'LIVE VOICE CALL':'LIVE TEXT CHAT')+'</span>'+
 '<div style="display:flex;justify-content:flex-end;margin-top:6px" '+(incoming&&String(window.__smvCurrentRole||'').toLowerCase()==='astrologer'?'':'hidden')+'><button id="smvLiveRingToggleSession" class="btn smv-modal-action" style="'+secondaryStyle+'" type="button">ENABLE RING SOUND</button></div>'+
 '<h2 style="color:#30251b;-webkit-text-fill-color:#30251b;font-size:1.25rem;line-height:1.3;margin:12px 0;padding-right:40px;margin:6px 0;font-size:1.15rem">SMV ASTRO — '+(call?'Call':'Chat')+' Session</h2><p style="color:#30251b;-webkit-text-fill-color:#30251b;margin:4px 0"><b>Astrologer:</b> '+escapeHtml(smvLiveName(s.astrologerName,s.astrologerFullName,s.astrologerDisplayName)||'Astrologer')+'</p><p style="color:#30251b;-webkit-text-fill-color:#30251b;margin:4px 0"><b>Customer:</b> '+escapeHtml(smvLiveName(s.customerName,s.customerFullName,s.customerDisplayName)||'Customer')+'</p><p style="color:#6b6257;-webkit-text-fill-color:#6b6257;margin:4px 0"><b>You:</b> '+escapeHtml(youName)+' · <b>Other participant:</b> '+escapeHtml(otherName)+'</p>'+(s.birthDetails?'<p style="color:#30251b;-webkit-text-fill-color:#30251b;overflow-wrap:anywhere"><b>Customer Birth Details:</b> '+escapeHtml([s.birthDetails.birthDate,s.birthDetails.birthTime,s.birthDetails.birthPlace].filter(Boolean).join(' · '))+'</p>':'')+'<p style="color:#30251b;-webkit-text-fill-color:#30251b;margin:4px 0"><b>Duration:</b> '+Number(s.minutes||1)+' minute(s) · <b>Rate:</b> '+smvLiveMoney(s.ratePerMinutePaise)+' / minute</p><p style="color:#30251b;-webkit-text-fill-color:#30251b;margin:4px 0"><b>Status:</b> <span id="smvLiveSessionStatus">'+escapeHtml(smvLiveSessionStatusLabel(s))+'</span></p><p class="small" id="smvLiveSessionBilling" style="color:#6b6257;-webkit-text-fill-color:#6b6257;overflow-wrap:anywhere">Reserved: '+smvLiveMoney(s.reservedAmountPaise)+' · Each started minute is charged.</p><p class="small" id="smvLiveSessionCountdown" style="color:#6b6257;-webkit-text-fill-color:#6b6257"></p>'+
 '<div id="smvLiveCallArea" '+(call&&['connecting','active'].includes(String(s.state||''))?'':'hidden')+' style="margin:6px 0;padding:8px;border:1px solid #d4af37;border-radius:10px;background:#fffaf0;color:#2d1919"><audio id="smvLiveRemoteAudio" autoplay playsinline></audio><p id="smvLiveVoiceStatus" class="small" role="status" aria-live="polite" style="color:#5a3026;-webkit-text-fill-color:#5a3026;font-size:.95rem;line-height:1.5">Microphone not connected. Allow microphone access when asked, then connect.</p><div class="action-row" style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn smv-modal-action" style="'+primaryStyle+'" type="button" id="smvLiveConnectMic" '+(connectable?'':'hidden')+'>'+(viewerIsCustomer?'CONNECT TO ASTROLOGER':'CONNECT CUSTOMER CALL / MICROPHONE')+'</button><button class="btn smv-modal-action gray" style="'+secondaryStyle+'" type="button" id="smvLiveMute" disabled>Mute microphone</button></div><div id="smvLiveAudioInputWrap" hidden style="align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;color:#30251b"><label for="smvLiveAudioInput" style="font-weight:700;font-size:.9rem">Microphone input</label><select id="smvLiveAudioInput" aria-label="Microphone input device" style="flex:1 1 180px;min-width:0;min-height:42px;box-sizing:border-box;padding:8px;border:1px solid #b9a17b;border-radius:8px;background:#fffaf0;color:#30251b"><option value="default">System default (phone / connected headset)</option></select><button class="btn smv-modal-action gray" style="'+secondaryStyle+'" type="button" id="smvLiveRefreshAudioInputs">REFRESH DEVICES</button><p class="small" style="flex:1 0 100%;margin:0;color:#5a3026">Select your connected headset, Bluetooth, earbuds or earphones microphone here.</p></div></div>'+
 '<div id="smvLiveIncomingActions" class="action-row" '+(inv?'':'hidden')+' style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><button class="btn smv-modal-action" style="'+primaryStyle+'" id="smvLiveAccept" type="button">ACCEPT '+(call?'CALL':'CHAT')+'</button><button class="btn smv-modal-action gray" style="'+secondaryStyle+'" id="smvLiveReject" type="button">REJECT</button></div>'+
 '<p id="smvLiveWaiting" class="small" '+(active||inv||s.state==='ended'?'hidden':'')+' style="color:#6b6257;-webkit-text-fill-color:#6b6257">'+(s.state==='preparing'?(viewerIsCustomer?'Astrologer Generating Your Horoscope...':'Please generate the Customer horoscope now. The Customer is waiting for you.'):(incoming?'Incoming request. Accept to continue.':'Waiting for the Astrologer to accept. Billing starts only after both participants connect.'))+'</p>'+
 '<div id="smvLiveConnectChatWrap" '+(chat&&s.state==='connecting'&&String(s.astrologerUid||'')===String(currentUser?.uid||'')?'':'hidden')+' style="margin:10px 0"><button class="btn smv-modal-action" style="'+primaryStyle+'" id="smvLiveConnectChat" type="button">CONNECT CUSTOMER CHAT NOW</button></div>'+'<div id="smvLiveChatArea" '+(chat&&active?'':'hidden')+' style="margin:6px 0;padding:8px;border:1px solid #d4af37;border-radius:10px;background:#fffaf0;color:#2d1919"><div id="smvLiveMessages" role="log" aria-live="polite" style="flex:1 1 auto;min-height:120px;max-height:none;overflow:auto;border:1px solid #c9b8a0;border-radius:8px;padding:10px;background:#fffaf0;color:#30251b;overflow-wrap:anywhere"><p class="small" style="color:#62483b">Loading chat history…</p></div><form id="smvLiveMessageForm" style="display:grid;gap:10px;margin-top:10px"><textarea id="smvLiveMessageInput" maxlength="4000" rows="2" required placeholder="Type your message…" style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:60px;padding:7px;border:1px solid #b9a17b;border-radius:8px;background:#fffaf0;color:#30251b;resize:vertical;overflow-wrap:anywhere"></textarea><p id="smvLiveModerationNotice" role="status" aria-live="polite" hidden style="margin:0;color:#b91c1c;font-size:13px;font-weight:600"></p><button class="btn smv-modal-action" style="'+primaryStyle+'" id="smvLiveSendMessage" type="submit">SEND MESSAGE</button></form></div>'+
 '<p id="smvLiveSessionResult" class="small" role="status" aria-live="polite" style="color:#30251b;-webkit-text-fill-color:#30251b;overflow-wrap:anywhere"></p></div><div class="action-row smv-live-session-actions" style="position:static;flex:0 0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;gap:8px;margin-top:8px;padding:7px 0 calc(7px + env(safe-area-inset-bottom));background:#fff8e7;border-top:1px solid #d4af37"><button class="btn smv-modal-action" style="'+primaryStyle+'" id="smvLiveDownloadReceipt" type="button" '+(s.state==='ended'?'':'hidden')+'>PRINT / SAVE AS PDF</button><button class="btn smv-modal-action gray" style="'+secondaryStyle+'" id="smvLiveEndSession" type="button" '+(s.state==='ended'?'hidden':'')+'>'+(active?'END SESSION':'CANCEL SESSION')+'</button><button class="btn smv-modal-action gray" style="'+secondaryStyle+'" id="smvLiveClosePanel" type="button" '+(s.state==='ended'?'hidden':'')+'>CLOSE WINDOW</button></div></div>';
}
async function smvLivePrintReceipt(session){
 const s=session||{};
 if(s.state!=='ended')throw new Error('The Bill is available after the Live Session ends.');
 const popup=window.open('','_blank');
 if(!popup)throw new Error('Allow pop-ups to print or save the Bill as PDF.');
 popup.opener=null;
 const esc=v=>escapeHtml(String(v??''));
 const money=v=>smvLiveMoney(Number(v)||0);
 const isChat=smvLiveCanonicalMode(s)==='chat';
 const transcriptById=new Map();
 let historyLoadWarning='';
 const addTranscriptMessage=m=>{
  const id=String(m?.id||'');
  if(!id||id.startsWith('pending-'))return;
  const text=String(m?.text??'');
  const senderUid=String(m?.senderUid||'');
  const sender=senderUid&&senderUid===String(s.astrologerUid||'')
   ?('Astrologer'+(s.astrologerName?' — '+s.astrologerName:''))
   :('Customer'+(s.customerName?' — '+s.customerName:''));
  transcriptById.set(id,{id,text,sender,createdAt:String(m?.createdAt||''),order:transcriptById.size});
 };
 if(isChat){
  // Fetch the server's saved messages as well as messages already rendered during this session.
  // The open print window is created synchronously above, so browser popup blockers still allow it.
  try{
   const result=await renderApi('/live/sessions/'+encodeURIComponent(String(s.id||s.sessionId||''))+'/messages',{method:'GET',timeoutMs:12000});
   for(const m of result.messages||[])addTranscriptMessage(m);
  }catch(error){
   historyLoadWarning='Server history could not be refreshed. The transcript below includes messages already loaded in this session.';
  }
  const host=$('smvLiveMessages');
  for(const row of host?.querySelectorAll('[data-message-id]')||[]){
   const id=String(row.dataset.messageId||'');
   if(!id||id.startsWith('pending-'))continue;
   const body=row.querySelector('p')?.textContent||'';
   const who=row.querySelector('b')?.textContent||'';
   const uid=String(row.dataset.senderUid||'');
   const match=transcriptById.get(id);
   const createdAt=String(row.dataset.createdAt||'');
   const sender=uid&&uid===String(s.astrologerUid||'')
    ?('Astrologer'+(s.astrologerName?' — '+s.astrologerName:''))
    :(/^Astrologer:/i.test(who)?('Astrologer'+(s.astrologerName?' — '+s.astrologerName:'')):('Customer'+(s.customerName?' — '+s.customerName:'')));
   if(!match)transcriptById.set(id,{id,text:body,sender,createdAt,order:transcriptById.size});
   else{
    if(!match.text&&body)match.text=body;
    if(!match.createdAt&&createdAt)match.createdAt=createdAt;
   }
  }
 }
 const transcriptMessages=[...transcriptById.values()].sort((a,b)=>{
  const at=Date.parse(a.createdAt),bt=Date.parse(b.createdAt);
  if(Number.isFinite(at)&&Number.isFinite(bt)&&at!==bt)return at-bt;
  if(Number.isFinite(at)!==Number.isFinite(bt))return Number.isFinite(at)?-1:1;
  return a.order-b.order;
 });
 const historySection=isChat
  ?'<section class="chat-history"><h2>Live Chat History ('+transcriptMessages.length+' message'+(transcriptMessages.length===1?'':'s')+')</h2>'+
   (historyLoadWarning?'<p class="history-warning">'+esc(historyLoadWarning)+'</p>':'')+
   (transcriptMessages.length
    ?transcriptMessages.map(m=>'<article class="message"><p class="message-meta"><strong>'+esc(m.sender)+'</strong>'+(m.createdAt?'<time>'+esc(new Date(m.createdAt).toLocaleString('en-IN'))+'</time>':'')+'</p><p class="message-text">'+esc(m.text)+'</p></article>').join('')
    :'<p>No saved chat messages were available for this session.</p>')+
   '</section>'
  :'';
 const bill='<html><head><title>SMV ASTRO Live Session Bill</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:light}*{box-sizing:border-box}body{font:16px/1.6 Arial,Helvetica,sans-serif;color:#24103F;background:#fff;max-width:760px;margin:24px auto;padding:20px}h1{color:#5b2a86;font-size:clamp(24px,5vw,32px);line-height:1.25}h2{color:#24103F;font-size:clamp(19px,4vw,25px);line-height:1.35}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{padding:10px;border-bottom:1px solid #d4af37;text-align:left;vertical-align:top;color:#24103F;overflow-wrap:anywhere;word-break:break-word}th{width:38%;font-weight:700;background:#f5f0fb}.note{margin-top:24px;color:#514063}.chat-history{margin-top:32px;page-break-before:auto}.chat-history h2{border-bottom:2px solid #d4af37;padding-bottom:8px}.message{padding:10px 0;border-bottom:1px solid #d9d1e6;break-inside:avoid;overflow-wrap:anywhere}.message-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;margin:0 0 4px;color:#514063;font-size:13px}.message-meta time{font-weight:400}.message-text{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:0;color:#24103F}.history-warning{padding:10px;background:#fff8e7;border:1px solid #d4af37;color:#5a3026}button{font:700 16px/1.4 Arial,Helvetica,sans-serif;background:#5b2a86;color:#fff;border:1px solid #d4af37;border-radius:8px;min-height:44px;padding:10px 16px;max-width:100%;white-space:normal;overflow-wrap:anywhere}@media(max-width:520px){body{margin:0 auto;padding:14px}td,th{padding:8px;font-size:15px}th{width:42%}}@media print{button{display:none}body{margin:0 auto;max-width:none;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.chat-history{break-before:page}.message{break-inside:avoid}}</style></head><body><h1>SMV ASTRO SERVICES</h1><h2>Live '+esc(String(smvLiveCanonicalMode(s)||'call').toUpperCase())+' Bill / Receipt</h2><table><tr><th>Session ID</th><td>'+esc(s.id||s.sessionId||'')+'</td></tr><tr><th>Customer</th><td>'+esc(s.customerName||'Customer')+'</td></tr><tr><th>Astrologer</th><td>'+esc(s.astrologerName||'Astrologer')+'</td></tr><tr><th>Started minutes charged</th><td>'+esc(s.billableMinutes||0)+'</td></tr><tr><th>Rate</th><td>'+esc(money(s.ratePerMinutePaise))+' / minute</td></tr><tr><th>Amount charged</th><td><strong>'+esc(money(s.actualChargePaise))+'</strong></td></tr><tr><th>Unused reserve returned</th><td>'+esc(money(s.releasedAmountPaise))+'</td></tr><tr><th>Session ended</th><td>'+esc(s.endedAt||new Date().toISOString())+'</td></tr></table>'+historySection+'<p class="note">This receipt is based on the SMV ASTRO Live Session Wallet ledger. Select “Save as PDF” in the browser print dialog to save the bill'+(isChat?' and Live Chat history':'')+'.</p><button onclick="window.print()">PRINT / SAVE AS PDF</button></body></html>';
 popup.document.open();popup.document.write(bill);popup.document.close();popup.focus();setTimeout(()=>{try{popup.print();}catch(_){}},250);
}
function smvLiveClearTransport(){if(smvLiveSignalTimer)clearInterval(smvLiveSignalTimer);if(smvLiveMessageTimer)clearInterval(smvLiveMessageTimer);if(smvLiveClockTimer)clearInterval(smvLiveClockTimer);smvLiveSignalTimer=smvLiveMessageTimer=smvLiveClockTimer=null;smvLiveStopChatRecovery();smvLiveSignalSeen=new Set();smvLiveMessageSeen=new Set();smvLiveQueuedIce=[];smvLiveReadySentKey='';smvLiveOfferStartedKey='';smvLiveSignalSinceMs=0;smvLiveMessageSinceMs=0;smvLiveTransportPrimedSessionId='';}
function smvLiveMuteUntilVoiceConnected(){const audio=$('smvLiveRemoteAudio');if(audio)audio.muted=true;}
function smvLiveSyncRemoteAudio(){
 const audio=$('smvLiveRemoteAudio');if(!audio)return;
 const connected=smvLiveCurrentSession?.mode==='call'&&smvLiveCurrentSession?.state==='active'&&smvLivePeer?.connectionState==='connected';
 audio.muted=!connected;
 if(connected&&audio.srcObject)audio.play?.().catch(()=>{});
}
function smvLiveCloseMedia(){
 const audio=$('smvLiveRemoteAudio');
 if(audio){audio.muted=true;try{audio.pause();audio.srcObject=null;}catch(_){}}
 try{smvLivePeer?.close();}catch(_){}
 smvLivePeer=null;
 for(const track of smvLiveLocalStream?.getTracks?.()||[])try{track.stop();}catch(_){}
 smvLiveLocalStream=null;smvLiveRemoteStream=null;
}
function smvLiveSessionEndedMessage(session,wallet){
 const uid=String(currentUser?.uid||auth?.currentUser?.uid||'');
 if(uid&&uid===String(session?.customerUid||'')){
  const available=wallet?.availableBalancePaise;
  return Number.isFinite(Number(available))?'Session ended. Your available Wallet balance: '+smvLiveMoney(Number(available))+'.':'Session ended. Your Wallet settlement is complete.';
 }
 if(uid&&uid===String(session?.astrologerUid||''))return 'Session ended. Your Astrologer earnings summary has been refreshed.';
 return 'Session ended.';
}
function smvLiveShowError(error){const el=$('smvLiveSessionResult');if(el)el.textContent=String(error?.message||error||'Live Session request failed.');}
function smvLiveApplySession(session){
 if(!session||String(session.id||session.sessionId||'')!==smvLivePanelSessionId)return;
 const wasEnded=String(smvLiveCurrentSession?.state||'')==='ended';
 const mergedSession=smvLiveMergeSessionState(smvLiveCurrentSession,{...session,id:smvLivePanelSessionId});
 const canonicalMode=smvLiveCanonicalMode(mergedSession,smvLiveCurrentSession?.mode);
 if(canonicalMode)mergedSession.mode=canonicalMode;
 smvLiveCurrentSession=mergedSession;
 const s=smvLiveCurrentSession,active=s.state==='active',ringing=s.state==='ringing',mode=smvLiveCanonicalMode(s),call=mode==='call',chat=mode==='chat';
 smvLiveSyncRemoteAudio();
 if(s.state!=='preparing')smvLiveStopPreparationCountdown();
 if(s.state!=='ringing'&&smvLiveRingCurrentId===String(s.id||''))smvLiveStopRingtone();
 if(active||s.state==='ended')smvLiveStopRingtone();
 const callArea=$('smvLiveCallArea');if(callArea)callArea.hidden=!(call&&['connecting','active'].includes(String(s.state||'')));
 if($('smvLiveSessionStatus'))$('smvLiveSessionStatus').textContent=smvLiveSessionStatusLabel(s);
 if(s.state==='preparing')smvLiveUpdatePreparationCountdown(s);
 if($('smvLiveSessionBilling'))$('smvLiveSessionBilling').textContent='Reserved: '+smvLiveMoney(s.reservedAmountPaise)+' · Charged: '+smvLiveMoney(s.actualChargePaise)+' · Released: '+smvLiveMoney(s.releasedAmountPaise);
 if($('smvLiveIncomingActions'))$('smvLiveIncomingActions').hidden=!(ringing&&s.astrologerUid===currentUser?.uid);
 const connectMic=$('smvLiveConnectMic');if(connectMic){connectMic.hidden=!(call&&['connecting','active'].includes(String(s.state||'')));connectMic.textContent=String(s.customerUid||'')===String(currentUser?.uid||'')?'CONNECT TO ASTROLOGER':'CONNECT CUSTOMER CALL / MICROPHONE';if(s.state==='ended')connectMic.disabled=true;}
 const connectChatWrap=$('smvLiveConnectChatWrap');if(connectChatWrap)connectChatWrap.hidden=!(chat&&s.state==='connecting'&&String(s.astrologerUid||'')===String(currentUser?.uid||''));
 const waiting=$('smvLiveWaiting');if(waiting){waiting.hidden=active||(ringing&&s.astrologerUid===currentUser?.uid)||s.state==='ended';if(s.state==='preparing')waiting.textContent=String(s.customerUid||'')===String(currentUser?.uid||'')?'Astrologer Generating Your Horoscope...':'Please generate the Customer horoscope now. The Customer is waiting for you.';else if(s.state==='connecting')waiting.textContent=call?(String(s.customerUid||'')===String(currentUser?.uid||'')?'Horoscope preparation is complete. Tap CONNECT TO ASTROLOGER to start the voice call.':'Horoscope preparation is complete. Tap CONNECT CUSTOMER CALL / MICROPHONE to answer the voice call.'):(String(s.customerUid||'')===String(currentUser?.uid||'')?'Horoscope preparation is complete. Waiting for the Astrologer to accept Chat.':'Horoscope preparation is complete. Click ACCEPT CHAT to open the live Chat.');else if(ringing)waiting.textContent=s.astrologerUid===currentUser?.uid?'Customer request is ready. Accept to continue.':'Waiting for the Astrologer to accept. Billing starts only after both participants connect.';}
 const receipt=$('smvLiveDownloadReceipt');if(receipt)receipt.hidden=s.state!=='ended';
 const chatArea=$('smvLiveChatArea');if(chatArea)chatArea.hidden=!smvLiveChatIsActive(s);
  if(chat&&active)smvLiveStartChatRecovery(s.id,s);else smvLiveStopChatRecovery();
 if($('smvLiveEndSession')){ $('smvLiveEndSession').hidden=s.state==='ended';$('smvLiveEndSession').disabled=s.state==='ended';$('smvLiveEndSession').textContent=active?'END SESSION':'CANCEL SESSION';}
 if($('smvLiveClosePanel'))$('smvLiveClosePanel').hidden=s.state==='ended';
 if(s.state==='connecting'&&!call&&String(s.customerUid||'')===String(currentUser?.uid||''))smvLiveMarkReady(s.id,false).catch(smvLiveShowError);
 // The Customer now starts WebRTC from the explicit microphone button, preserving the browser permission gesture.
 if(active)smvLiveStartClock(s);
 if(s.state==='ended'){
  if(!wasEnded&&String(s.astrologerUid||'')===String(currentUser?.uid||'')&&!s.__smvEarningsRefreshTriggered){
   s.__smvEarningsRefreshTriggered=true;
   setTimeout(()=>{if(typeof loadDashboard==='function')Promise.resolve(loadDashboard('astrologer',true)).catch(error=>console.warn('Astrologer earnings refresh after Live Session was skipped:',error));},300);
  }
  const voiceStatus=$('smvLiveVoiceStatus');if(voiceStatus)voiceStatus.textContent='Call session ended. Microphone is no longer in use.';
  const result=$('smvLiveSessionResult');if(result&&!result.textContent)result.textContent='Session ended. Charged '+smvLiveMoney(s.actualChargePaise)+'; unused reserve returned '+smvLiveMoney(s.releasedAmountPaise)+'.' ;
  smvLiveCloseMedia();smvLiveClearTransport();
  if(!wasEnded&&!s.__smvScheduleRefreshTriggered){
   s.__smvScheduleRefreshTriggered=true;
   const dashboardRole=String(window.__smvCurrentRole||'').toLowerCase();
   setTimeout(async()=>{
    try{
     if(dashboardRole==='astrologer')await smvLiveLoadScheduledAppointments();
     else if(dashboardRole==='customer'){
      const [scheduled,live]=await Promise.all([
       renderApi('/customer/appointments',{method:'GET',timeoutMs:12000}),
       renderApi('/live/sessions',{method:'GET',timeoutMs:12000})
      ]);
      smvLiveRenderCustomerScheduledBookings(smvLiveNormalizeScheduledAppointments(scheduled.appointments||[],live.sessions||[]));
      smvLiveCustomerAppointmentsPollAt=Date.now();
     }
    }catch(refreshError){console.warn('Ended Live Session booking refresh skipped:',refreshError?.message||refreshError);}
   },250);
  }
 }
}
function smvLiveChatBoxIsVisible(){
 const modal=$('modal'),chat=$('smvLiveChatArea'),messages=$('smvLiveMessages');
 if(!modal||modal.classList.contains('hidden')||!chat||chat.hidden||!messages||!chat.isConnected||!messages.isConnected)return false;
 if(typeof chat.getBoundingClientRect!=='function'||typeof messages.getBoundingClientRect!=='function')return false;
 const chatRect=chat.getBoundingClientRect(),messagesRect=messages.getBoundingClientRect();
 const style=typeof window.getComputedStyle==='function'?window.getComputedStyle(chat):null;
 return (!style||(style.display!=='none'&&style.visibility!=='hidden'))&&chat.getClientRects().length>0&&chatRect.width>0&&chatRect.height>0&&messagesRect.width>0&&messagesRect.height>0;
}
function smvLiveOpenSession(session,wallet,incoming){
 if(!session)return;const id=String(session.id||session.sessionId||'');if(!id)return;
 const samePanelSession=smvLivePanelSessionId===id;
 if(!samePanelSession){smvLiveCloseMedia();smvLiveClearTransport();}
 const incomingSession={...session,id,mode:smvLiveCanonicalMode(session)||String(session.mode||'').toLowerCase()};
 smvLivePanelSessionId=id;
 smvLiveCurrentSession=samePanelSession?smvLiveMergeSessionState(smvLiveCurrentSession,incomingSession):incomingSession;
 smvLiveSignalSeen=new Set();smvLiveMessageSeen=new Set();
 if(incoming&&String(window.__smvCurrentRole||'').toLowerCase()==='astrologer'&&String(session.state||'')==='ringing')smvLiveStartRingtone(id);
 openModal(smvLivePanelHtml(smvLiveCurrentSession,!!incoming));
 const ringSession=$('smvLiveRingToggleSession');if(ringSession)ringSession.onclick=smvLiveToggleRingtone;smvLiveRingButtonSync();
 const accept=$('smvLiveAccept'),reject=$('smvLiveReject'),end=$('smvLiveEndSession'),close=$('smvLiveClosePanel'),receipt=$('smvLiveDownloadReceipt');
 if(receipt)receipt.onclick=()=>{smvLivePrintReceipt(smvLiveCurrentSession).catch(e=>smvLiveShowError(e));};
 if(accept)accept.onclick=async()=>{smvLiveStopRingtone();smvLiveMuteUntilVoiceConnected();accept.disabled=true;try{const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/accept',{method:'POST',body:JSON.stringify({})});smvLiveApplySession(r.session||{...smvLiveCurrentSession,state:'preparing'});}catch(e){smvLiveShowError(e);accept.disabled=false;smvLiveSyncRemoteAudio();}};
 if(reject)reject.onclick=async()=>{smvLiveStopRingtone();reject.disabled=true;try{const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/reject',{method:'POST',body:JSON.stringify({})});smvLiveApplySession(r.session||{...smvLiveCurrentSession,state:'ended'});}catch(e){smvLiveShowError(e);reject.disabled=false;}};
 if(end)end.onclick=async()=>{smvLiveStopRingtone();end.disabled=true;try{const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/end',{method:'POST',body:JSON.stringify({reason:'participant_ended'})});const endedSession=r.session||{...smvLiveCurrentSession,state:'ended'};smvLiveApplySession(endedSession);if($('smvLiveSessionResult'))$('smvLiveSessionResult').textContent=smvLiveSessionEndedMessage(endedSession,r.wallet);}catch(e){smvLiveShowError(e);end.disabled=false;}};
 if(close)close.onclick=()=>{smvLiveDismissSessionUi(id);window.closeModal?.();};
 const form=$('smvLiveMessageForm');
 const input=$('smvLiveMessageInput'),button=$('smvLiveSendMessage'),notice=$('smvLiveModerationNotice');
 const moderationResult=body=>window.SMVChatModeration?.inspectMessageText(String(body||''));
 const refreshModerationNotice=()=>{
  const check=moderationResult(input?.value||'');
  const blocked=check?.reason==='abusive_language';
  if(notice){notice.hidden=!blocked;notice.textContent=blocked?(check.message||'Please remove abusive words before sending.') :'';}
  if(button&&!button.dataset.smvSending)button.disabled=blocked;
  return !blocked;
 };
 if(input)input.oninput=refreshModerationNotice;
 if(form)form.onsubmit=async e=>{
  e.preventDefault();
  const body=String(input?.value||'').trim();
  if(!body)return;
  if(!refreshModerationNotice())return;
  if(button){button.disabled=true;button.dataset.smvSending='true';button.textContent='SENDING…';}
  const pendingId='pending-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const pendingRow=smvLiveAppendMessage({id:pendingId,sessionId:id,senderUid:currentUser?.uid,text:body,createdAt:new Date().toISOString()});
  if(input)input.value='';
  if(notice){notice.hidden=true;notice.textContent='';}
  try{
   const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/messages',{method:'POST',body:JSON.stringify({text:body})});
   if(pendingRow?.isConnected)pendingRow.remove();
   smvLiveMessageSeen.delete(pendingId);
   smvLiveAppendMessage(r.message);
  }catch(err){
   if(pendingRow?.isConnected)pendingRow.remove();
   smvLiveMessageSeen.delete(pendingId);
   smvLiveShowError(err);
   if(input&&!input.value)input.value=body;
  }finally{
   if(button){delete button.dataset.smvSending;button.textContent='SEND MESSAGE';refreshModerationNotice();}
  }
 };
 const connectChat=$('smvLiveConnectChat');
 if(connectChat)connectChat.onclick=async()=>{
  const current=smvLiveCurrentSession;
  if(!current||current.mode!=='chat'||current.state!=='connecting')return;
  connectChat.disabled=true;connectChat.textContent='CONNECTING CHAT…';
  try{
   const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/ready',{method:'POST',body:JSON.stringify({mediaConnected:false})});
   const responseSession=r.session;
   if(responseSession){
    const responseId=String(responseSession.id||responseSession.sessionId||'');
    if(responseId!==id)throw new Error('The server response did not match this Live Chat session. Reopen the correct session and retry.');
    if(smvLivePanelSessionId!==id)throw new Error('The Live Chat panel changed while connecting. Open this session again from your Dashboard.');
    smvLiveApplySession(responseSession);
   }
   if(responseSession?.state==='active'&&smvLivePanelSessionId===id&&(!smvLiveChatBoxIsVisible()||smvLiveCurrentSession?.state!=='active'||smvLiveCanonicalMode(smvLiveCurrentSession)!=='chat')){
    // Re-render from the server-confirmed active session if an out-of-order UI update left the Chat Box hidden.
    smvLiveOpenSession(responseSession,null,false);
    smvLivePollMessages(id).catch(()=>{});
   }
   const connected=!!responseSession&&responseSession.state==='active'&&smvLivePanelSessionId===id&&smvLiveCurrentSession?.state==='active'&&smvLiveCanonicalMode(smvLiveCurrentSession)==='chat'&&smvLiveChatBoxIsVisible();
   const result=$('smvLiveSessionResult');
   if(result)result.textContent=connected?'Customer Chat is connected. You can now exchange messages.':responseSession?.state==='active'?'The server started this Chat, but the Chat Box is not ready yet. Reopen this session from your Dashboard.':'Your readiness is confirmed. Waiting for the Customer to connect.';
  }catch(error){smvLiveShowError(error);}
  finally{if(connectChat.isConnected){connectChat.disabled=false;connectChat.textContent='CONNECT CUSTOMER CHAT NOW';}}
 };
 const connectMic=$('smvLiveConnectMic');
 if(connectMic)connectMic.onclick=async()=>{
  const current=smvLiveCurrentSession;
  if(!current||!['connecting','active'].includes(String(current.state||'')))return;
  const voice=$('smvLiveVoiceStatus');
  connectMic.disabled=true;connectMic.textContent='CONNECTING MICROPHONE…';
  if(voice)voice.textContent='Requesting microphone permission. Please allow access in your browser.';
  try{
   const pc=await smvLiveEnsurePeer(id);
   if(smvLiveCurrentSession?.customerUid===currentUser?.uid)await smvLiveStartOffer(id);
   // The Astrologer's offer event can arrive before microphone permission is granted.
   // That signal remains unconsumed, so fetch it again once the peer is ready.
   await smvLiveReconcileCallSignals(id);
   if(voice&&pc.connectionState!=='connected')voice.textContent='Microphone ready. Waiting for '+smvLiveOtherParticipantName()+ '…';
   const muteButton=$('smvLiveMute');if(muteButton)muteButton.disabled=false;
   connectMic.textContent='MICROPHONE READY';
  }catch(error){
   const message=smvLiveMediaErrorText(error);
   if(voice)voice.textContent=message;
   smvLiveShowError(new Error(message));
   connectMic.textContent='RETRY MICROPHONE';
  }finally{if(connectMic.isConnected)connectMic.disabled=false;}
 };
 const audioInputSelect=$('smvLiveAudioInput');
 if(audioInputSelect)audioInputSelect.onchange=async()=>{
  const selected=String(audioInputSelect.value||'default');
  try{await smvLiveSwitchAudioInput(id,selected);}
  catch(error){
   const message=String(error?.message||error||'Microphone switch failed.');
   if($('smvLiveSessionResult'))$('smvLiveSessionResult').textContent=message;
   console.warn('Live voice microphone input switch failed:',error);
   await smvLiveRefreshAudioInputs(smvLiveLocalStream?.getAudioTracks?.()[0]).catch(()=>{});
  }
 };
 const refreshAudioInputs=$('smvLiveRefreshAudioInputs');
 if(refreshAudioInputs)refreshAudioInputs.onclick=async()=>{
  refreshAudioInputs.disabled=true;
  try{await smvLiveRefreshAudioInputs(smvLiveLocalStream?.getAudioTracks?.()[0]);}
  catch(error){smvLiveShowError(new Error('Unable to list microphone devices. Check microphone permission and retry.'));console.warn('Audio input enumeration failed:',error);}
  finally{refreshAudioInputs.disabled=false;}
 };
 const mute=$('smvLiveMute');if(mute)mute.onclick=()=>{const tracks=smvLiveLocalStream?.getAudioTracks?.()||[];if(!tracks.length)return;const enabled=tracks[0].enabled===false;tracks.forEach(t=>t.enabled=enabled);mute.textContent=enabled?'Mute microphone':'Unmute microphone';};
 smvLiveApplySession(smvLiveCurrentSession);smvLiveStartTransport(id,smvLiveCurrentSession);
}
window.__smvOpenLiveSession=(session)=>smvLiveOpenSession(session,null,false);
async function smvLiveMarkReady(id,mediaConnected){
 const key=String(id)+':'+String(currentUser?.uid||'');if(smvLiveReadySentKey===key)return;smvLiveReadySentKey=key;
 try{const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/ready',{method:'POST',body:JSON.stringify({mediaConnected:!!mediaConnected})});if(r.session)smvLiveApplySession(r.session);}
 catch(e){smvLiveReadySentKey='';smvLiveShowError(e);}
}
function smvLiveStopPreparationCountdown(){
 if(smvLivePreparationTimer){clearInterval(smvLivePreparationTimer);smvLivePreparationTimer=null;}
 smvLivePreparationSessionId='';
}
let smvLivePreparationReconcileId='',smvLivePreparationReconcileRetryAt=0;
async function smvLiveReconcileExpiredPreparation(sessionId){
 const id=String(sessionId||'');if(!id||(smvLivePreparationReconcileId===id&&Date.now()<smvLivePreparationReconcileRetryAt))return;
 smvLivePreparationReconcileId=id;smvLivePreparationReconcileRetryAt=Date.now()+5000;
 try{
  const list=await renderApi('/live/sessions',{method:'GET',timeoutMs:10000});
  const fresh=(list.sessions||[]).find(row=>String(row.id||row.sessionId||'')===id);
  if(fresh){smvLiveUpdateDashboardSessionStatus(fresh);if(smvLivePanelSessionId===id)smvLiveApplySession(fresh);}
 }catch(error){console.warn('Live preparation deadline reconciliation deferred:',error?.message||error);}
}
function smvLiveUpdatePreparationCountdown(session){
 const s=session||smvLiveCurrentSession;
 const uid=String(currentUser?.uid||'');
 const isCustomer=String(s?.customerUid||'')===uid,isAstrologer=String(s?.astrologerUid||'')===uid;
 if(!s||s.state!=='preparing'||(!isCustomer&&!isAstrologer)||$('modal')?.classList.contains('hidden')){smvLiveStopPreparationCountdown();return;}
 const id=String(s.id||s.sessionId||'');
 if(smvLivePreparationSessionId!==id){smvLiveStopPreparationCountdown();smvLivePreparationSessionId=id;}
 const tick=()=>{
  const current=smvLiveCurrentSession||s;
  const currentUid=String(currentUser?.uid||'');
  if(current.state!=='preparing'||![String(current.customerUid||''),String(current.astrologerUid||'')].includes(currentUid)){smvLiveStopPreparationCountdown();return;}
  const until=Date.parse(current.preparationUntil||''),started=Date.parse(current.preparationStartedAt||current.acceptedAt||current.createdAt||'');
  const deadline=Number.isFinite(until)?until:(Number.isFinite(started)?started+180000:Date.now()+180000);
  const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  const clock=String(Math.floor(seconds/60))+':'+String(seconds%60).padStart(2,'0');
  const label=currentUid===String(current.customerUid||'')?'Please wait.... '+clock:'Generate Customer Horoscope · '+clock;
  if($('smvLiveSessionStatus'))$('smvLiveSessionStatus').textContent=label;
   smvLiveUpdateDashboardSessionStatus(current);
   if(seconds===0)smvLiveReconcileExpiredPreparation(id);
 };
 tick();
 if(!smvLivePreparationTimer)smvLivePreparationTimer=setInterval(tick,1000);
}
function smvLiveStartClock(s){
 if(smvLiveClockTimer)return;smvLiveClockTimer=setInterval(()=>{const current=smvLiveCurrentSession;if(!current||current.state!=='active')return;const start=Date.parse(current.startedAt||'');if(!Number.isFinite(start))return;const remaining=Math.max(0,Math.ceil((start+Math.max(1,Number(current.minutes||1))*60000-Date.now())/1000));const el=$('smvLiveSessionCountdown');if(el)el.textContent='Time remaining: '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');if(!remaining)smvLiveSetStatus('Time ended — waiting for server settlement…');},1000);
}
function smvLiveSetStatus(v){if($('smvLiveSessionStatus'))$('smvLiveSessionStatus').textContent=String(v||'');}
function smvLiveMediaErrorText(error){
 const name=String(error?.name||'');
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)return 'Microphone access needs an HTTPS page and a browser with microphone support. Open the secure site in a supported browser.';
 if(name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError')return 'Microphone permission is blocked. Allow Microphone for this site in browser settings, then tap RETRY MICROPHONE.';
 if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'No microphone was detected. Connect or enable a microphone, then retry.';
 if(name==='NotReadableError'||name==='TrackStartError')return 'The microphone is busy or unavailable. Close other apps using it, then retry.';
 if(name==='OverconstrainedError'||name==='ConstraintNotSatisfiedError')return 'The microphone settings are unsupported by this device. Check the microphone and retry.';
 return 'Microphone could not connect: '+String(error?.message||error||'Unknown browser error')+'. Check site permissions and retry.';
}
async function smvLiveRefreshAudioInputs(activeTrack=null){
 const select=$('smvLiveAudioInput'),wrap=$('smvLiveAudioInputWrap');
 if(!select||!wrap||!navigator.mediaDevices?.enumerateDevices)return;
 const currentId=String(activeTrack?.getSettings?.().deviceId||'');
 const previous=String(select.value||'default');
 const devices=await navigator.mediaDevices.enumerateDevices();
 const inputs=devices.filter(device=>device.kind==='audioinput'&&device.deviceId&&device.deviceId!=='default');
 select.replaceChildren();
 const addOption=(value,label)=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);};
 addOption('default','System default (phone / connected headset)');
 inputs.forEach((device,index)=>addOption(device.deviceId,String(device.label||('Microphone '+(index+1)))));
 if(currentId&&inputs.some(device=>device.deviceId===currentId))select.value=currentId;
 else if(inputs.some(device=>device.deviceId===previous))select.value=previous;
 else select.value='default';
 wrap.hidden=false;wrap.style.display='flex';
}
async function smvLiveSwitchAudioInput(sessionId,deviceId){
 const activeSession=smvLiveCurrentSession,pc=smvLivePeer,oldStream=smvLiveLocalStream;
 if(!activeSession||String(activeSession.id||activeSession.sessionId||'')!==String(sessionId)||!pc||!oldStream)throw new Error('Connect the microphone first, then select its input device.');
 const voice=$('smvLiveVoiceStatus'),select=$('smvLiveAudioInput'),sender=pc.getSenders().find(item=>item.track?.kind==='audio');
 if(!sender)throw new Error('The current microphone connection is not ready. Keep the current microphone and retry.');
 if(voice)voice.textContent='Switching microphone input…';
 const audio=deviceId&&deviceId!=='default'
  ?{deviceId:{exact:String(deviceId)},echoCancellation:true,noiseSuppression:true,autoGainControl:true}
  :{echoCancellation:true,noiseSuppression:true,autoGainControl:true};
 let nextStream;
 try{nextStream=await navigator.mediaDevices.getUserMedia({audio,video:false});}
 catch(error){if(voice)voice.textContent='Could not switch microphone. Your current microphone has been kept. '+smvLiveMediaErrorText(error);throw error;}
 const nextTrack=nextStream.getAudioTracks()[0],oldTrack=oldStream.getAudioTracks()[0];
 if(!nextTrack){for(const track of nextStream.getTracks())track.stop();throw new Error('The selected device did not provide an audio microphone.');}
 if(smvLivePeer!==pc||smvLiveLocalStream!==oldStream){
  for(const track of nextStream.getTracks())track.stop();
  throw new Error('The voice connection changed while selecting a microphone. Please select the device again.');
 }
 nextTrack.enabled=oldTrack?.enabled!==false;
 try{await sender.replaceTrack(nextTrack);}
 catch(error){for(const track of nextStream.getTracks())track.stop();if(voice)voice.textContent='Could not switch microphone. Your current microphone is still connected.';throw error;}
 smvLiveLocalStream=nextStream;
 for(const track of oldStream.getTracks())if(track!==nextTrack)try{track.stop();}catch(_){}
 await smvLiveRefreshAudioInputs(nextTrack).catch(error=>console.warn('Could not refresh microphone list:',error));
 const picked=select?.selectedOptions?.[0]?.textContent||nextTrack.label||'selected microphone';
 if(voice)voice.textContent='Microphone input: '+picked+'. Voice connection: '+pc.connectionState+'.';
}
if(navigator.mediaDevices?.addEventListener&&!window.__smvLiveAudioDeviceChangeBound){
 window.__smvLiveAudioDeviceChangeBound=true;
 navigator.mediaDevices.addEventListener('devicechange',()=>{
  if(smvLiveCurrentSession?.mode==='call'&&smvLiveLocalStream)
   smvLiveRefreshAudioInputs(smvLiveLocalStream.getAudioTracks()[0]).catch(error=>console.warn('Audio input refresh after device change failed:',error));
 });
}
async function smvLiveHandleMediaFailure(id,error){const message=smvLiveMediaErrorText(error);console.warn('Live voice setup failed:',error);smvLiveShowError(new Error(message));const voice=$('smvLiveVoiceStatus');if(voice)voice.textContent=message;try{const r=await renderApi('/live/sessions/'+encodeURIComponent(id)+'/end',{method:'POST',body:JSON.stringify({reason:'connection_failed'})});if(r.session)smvLiveApplySession(r.session);}catch(e){console.warn('Call settlement retry required:',e);}}
async function smvLiveEnsurePeer(id){
 if(smvLivePeer)return smvLivePeer;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection!=='function')throw new Error('Microphone access requires HTTPS and a browser that supports WebRTC.');
 const voiceStatus=$('smvLiveVoiceStatus');if(voiceStatus)voiceStatus.textContent='Requesting microphone permission…';
 try{smvLiveLocalStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}
 // Keep the existing system-default microphone as the initial input. The participant can switch to a connected headset/earbud input below without rebuilding the call.

 catch(error){if(voiceStatus)voiceStatus.textContent=smvLiveMediaErrorText(error);throw error;}
 if(voiceStatus)voiceStatus.textContent='Microphone ready. Connecting to '+smvLiveOtherParticipantName()+'…';
 smvLiveRemoteStream=new MediaStream();let iceServers=[{urls:'stun:stun.l.google.com:19302'}];try{const ice=await renderApi('/live/ice-config',{method:'GET',timeoutMs:8000});if(Array.isArray(ice.iceServers)&&ice.iceServers.length)iceServers=ice.iceServers;}catch(iceError){console.warn('TURN relay is not configured/reachable; using STUN only:',iceError?.message||iceError);}const pc=new RTCPeerConnection({iceServers});smvLivePeer=pc;
 for(const track of smvLiveLocalStream.getAudioTracks())pc.addTrack(track,smvLiveLocalStream);
 pc.ontrack=e=>{if(e.streams?.[0])smvLiveRemoteStream=e.streams[0];else if(e.track)smvLiveRemoteStream.addTrack(e.track);const audio=$('smvLiveRemoteAudio');if(audio){audio.srcObject=smvLiveRemoteStream;smvLiveMuteUntilVoiceConnected();smvLiveSyncRemoteAudio();}if($('smvLiveVoiceStatus'))$('smvLiveVoiceStatus').textContent='Voice connected.';};
 pc.onicecandidate=e=>{if(e.candidate)renderApi('/live/sessions/'+encodeURIComponent(id)+'/signal',{method:'POST',body:JSON.stringify({type:'ice',payload:{candidate:e.candidate.toJSON()}})}).catch(err=>console.warn('ICE relay failed:',err));};
 pc.onconnectionstatechange=()=>{if($('smvLiveVoiceStatus'))$('smvLiveVoiceStatus').textContent='Voice connection: '+pc.connectionState;smvLiveSyncRemoteAudio();if(pc.connectionState==='connected')smvLiveMarkReady(id,true).catch(()=>{});if(pc.connectionState==='failed')smvLiveHandleMediaFailure(id,new Error('Voice network connection failed. Unused Wallet reserve is being returned.'));};
 const mute=$('smvLiveMute');if(mute)mute.disabled=false;smvLiveRefreshAudioInputs(smvLiveLocalStream.getAudioTracks()[0]).catch(error=>console.warn('Microphone input list unavailable:',error));return pc;
}
async function smvLiveStartOffer(id){
 const key=String(id)+':'+String(currentUser?.uid||'');if(smvLiveOfferStartedKey===key)return;smvLiveOfferStartedKey=key;
 try{const pc=await smvLiveEnsurePeer(id);if(pc.signalingState!=='stable')return;const offer=await pc.createOffer();await pc.setLocalDescription(offer);await renderApi('/live/sessions/'+encodeURIComponent(id)+'/signal',{method:'POST',body:JSON.stringify({type:'offer',payload:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}})});}
 catch(e){smvLiveOfferStartedKey='';throw e;}
}
async function smvLiveProcessSignal(sig){
 if(!sig||!sig.id)return true;
 if(smvLiveSignalSeen.has(sig.id)||sig.senderUid===currentUser?.uid)return true;
 const s=smvLiveCurrentSession;if(!s||s.mode!=='call')return true;
 // Do not trigger a microphone permission prompt from the polling timer. Let the
 // participant explicitly connect their microphone; leave this signal unconsumed
 // so it will be processed on the next poll after the peer is ready.
 if(!smvLivePeer){const voice=$('smvLiveVoiceStatus'),connect=$('smvLiveConnectMic');if(voice)voice.textContent=smvLiveOtherParticipantName()+' is connecting. Tap CONNECT MICROPHONE to allow voice access on this device.';if(connect&&['connecting','active'].includes(String(s.state||'')))connect.hidden=false;return;}
 smvLiveSignalSeen.add(sig.id);
 try{
 const pc=await smvLiveEnsurePeer(sig.sessionId);
 if(sig.type==='offer'){
  await pc.setRemoteDescription(new RTCSessionDescription(sig.payload?.description||sig.payload));
  for(const ice of smvLiveQueuedIce.splice(0))try{await pc.addIceCandidate(new RTCIceCandidate(ice));}catch(e){console.warn('Queued ICE candidate rejected:',e);}
  const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await renderApi('/live/sessions/'+encodeURIComponent(sig.sessionId)+'/signal',{method:'POST',body:JSON.stringify({type:'answer',payload:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}})});
 }else if(sig.type==='answer'){
  if(pc.signalingState!=='stable')await pc.setRemoteDescription(new RTCSessionDescription(sig.payload?.description||sig.payload));
  for(const ice of smvLiveQueuedIce.splice(0))try{await pc.addIceCandidate(new RTCIceCandidate(ice));}catch(e){console.warn('Queued ICE candidate rejected:',e);}
 }else if(sig.type==='ice'){
  const candidate=sig.payload?.candidate||sig.payload;if(candidate){if(!pc.remoteDescription)smvLiveQueuedIce.push(candidate);else try{await pc.addIceCandidate(new RTCIceCandidate(candidate));}catch(e){console.warn('ICE candidate rejected:',e);}}
 }
 return true;
 }catch(error){smvLiveSignalSeen.delete(sig.id);throw error;}
}
function smvLiveAppendMessage(m){
 const host=$('smvLiveMessages');if(!host||!m||!m.id||smvLiveMessageSeen.has(m.id))return null;
 smvLiveMessageSeen.add(m.id);
 if(host.children.length===1&&/Loading chat history/.test(host.textContent))host.innerHTML='';
 const row=document.createElement('div');row.style.cssText='padding:6px 0;border-bottom:1px solid #eee;color:#24103F;-webkit-text-fill-color:#24103F';row.dataset.messageId=String(m.id);row.dataset.senderUid=String(m.senderUid||'');row.dataset.createdAt=String(m.createdAt||'');
 const session=smvLiveCurrentSession||{};const who=document.createElement('b');who.style.cssText='color:#24103F;-webkit-text-fill-color:#24103F';who.textContent=(m.senderUid===session.astrologerUid?'Astrologer: '+(session.astrologerName||'Astrologer'):'Customer: '+(session.customerName||'Customer'))+' · '+(m.createdAt?new Date(m.createdAt).toLocaleTimeString():new Date().toLocaleTimeString());
 const body=document.createElement('p');body.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0;color:#24103F;-webkit-text-fill-color:#24103F';body.textContent=String(m.text||'');row.append(who,body);host.append(row);host.scrollTop=host.scrollHeight;return row;
}
const smvLiveMessagePollsInFlight=new Map();
const smvLiveSignalPollsInFlight=new Map();
let smvLiveChatRecoveryTimer=null,smvLiveChatRecoverySessionId='';
function smvLiveStopChatRecovery(){if(smvLiveChatRecoveryTimer)clearInterval(smvLiveChatRecoveryTimer);smvLiveChatRecoveryTimer=null;smvLiveChatRecoverySessionId='';}
function smvLiveStartChatRecovery(id,session){
 const key=String(id||''),current=session||smvLiveCurrentSession;
 if(!key||String(current?.id||'')!==key||current?.state!=='active'||smvLiveCanonicalMode(current)!=='chat'){smvLiveStopChatRecovery();return;}
 if(smvLiveChatRecoveryTimer&&smvLiveChatRecoverySessionId===key)return;
 smvLiveStopChatRecovery();smvLiveChatRecoverySessionId=key;
 // SSE delivers immediately. This bounded read-after-cursor catches missed events across instances/reconnects.
 smvLiveChatRecoveryTimer=setInterval(()=>{
  const activeSession=smvLiveCurrentSession;
  if(smvLivePanelSessionId!==key||!activeSession||activeSession.state!=='active'||smvLiveCanonicalMode(activeSession)!=='chat'||!$('smvLiveMessages')){smvLiveStopChatRecovery();return;}
  smvLivePollMessages(key).catch(()=>{});
 },1500);
}
async function smvLivePollMessages(id){
 const key=String(id||'');if(!key||!$('smvLiveMessages'))return;
 const pending=smvLiveMessagePollsInFlight.get(key);if(pending)return pending;
 const request=(async()=>{try{
  const suffix=smvLiveMessageSinceMs>0?'?afterMs='+encodeURIComponent(smvLiveMessageSinceMs):'';
  const d=await renderApi('/live/sessions/'+encodeURIComponent(key)+'/messages'+suffix,{method:'GET',timeoutMs:10000});
  for(const m of d.messages||[]){
   if(!$('smvLiveMessages'))break;
   const messageId=String(m.id||m.messageId||'');
   const appended=smvLiveAppendMessage({...m,id:messageId});
   const ms=Date.parse(m.createdAt||'');
   if(Number.isFinite(ms)&&(appended||smvLiveMessageSeen.has(messageId)))smvLiveMessageSinceMs=Math.max(smvLiveMessageSinceMs,ms);
  }
 }catch(e){if(!$('smvLiveSessionResult'))return;}})();
 smvLiveMessagePollsInFlight.set(key,request);
 try{return await request;}finally{if(smvLiveMessagePollsInFlight.get(key)===request)smvLiveMessagePollsInFlight.delete(key);}
}
async function smvLivePollSignals(id){
 const key=String(id||'');if(!key)return;
 const pending=smvLiveSignalPollsInFlight.get(key);if(pending)return pending;
 const request=(async()=>{try{
  const suffix=smvLiveSignalSinceMs>0?'?afterMs='+encodeURIComponent(smvLiveSignalSinceMs):'';
  const d=await renderApi('/live/sessions/'+encodeURIComponent(key)+'/signals'+suffix,{method:'GET',timeoutMs:10000});
  for(const s of d.signals||[]){
   const ms=Date.parse(s.createdAt||'');
   const processed=await smvLiveProcessSignal({...s,id:s.id||s.signalId});
   if(processed&&Number.isFinite(ms))smvLiveSignalSinceMs=Math.max(smvLiveSignalSinceMs,ms);
  }
 }catch(e){if(!$('smvLiveSessionResult'))return;}})();
 smvLiveSignalPollsInFlight.set(key,request);
 try{return await request;}finally{if(smvLiveSignalPollsInFlight.get(key)===request)smvLiveSignalPollsInFlight.delete(key);}
}
async function smvLiveReconcileCallSignals(id){
 const key=String(id||'');if(!key)return;
 const pending=smvLiveSignalPollsInFlight.get(key);
 if(pending)await pending.catch(()=>{});
 await smvLivePollSignals(key);
}
function smvLiveStopFallbackPolling(){
 if(smvLiveSignalTimer)clearInterval(smvLiveSignalTimer);
 if(smvLiveMessageTimer)clearInterval(smvLiveMessageTimer);
 if(smvLiveDashboardTimer)clearInterval(smvLiveDashboardTimer);
 smvLiveSignalTimer=smvLiveMessageTimer=smvLiveDashboardTimer=null;
}
function smvLiveStartFallbackPolling(){
 if(smvLiveEventStreamConnected||!currentUser||!auth?.currentUser||currentUser.uid!==auth.currentUser.uid)return;
 // Recovery-only pollers: a healthy SSE stream already carries session, booking,
 // chat-message and WebRTC-signal events, so running both transports wastes reads.
 if(!smvLiveDashboardTimer)smvLiveDashboardTimer=setInterval(()=>smvLivePollSessions().catch(()=>{}),12000);
 const session=smvLiveCurrentSession,id=smvLivePanelSessionId;
 if(!session||!id||session.state==='ended')return;
 if(session.mode==='call'&&!smvLiveSignalTimer)smvLiveSignalTimer=setInterval(()=>{if(smvLivePanelSessionId===id&&smvLiveCurrentSession?.state!=='ended')smvLivePollSignals(id).catch(()=>{});},1800);
 if(session.mode==='chat'&&!smvLiveMessageTimer)smvLiveMessageTimer=setInterval(()=>{if(smvLivePanelSessionId===id&&smvLiveCurrentSession?.state!=='ended')smvLivePollMessages(id).catch(()=>{});},1200);
}
function smvLiveStartTransport(id,s){
 if(smvLiveEventStreamConnected)smvLiveStopFallbackPolling();
 else smvLiveStartFallbackPolling();
 // Load the existing signal/message history once per session, even when SSE is healthy.
 // Subsequent updates arrive over SSE, avoiding repeated reads every 600–1200ms.
 if(smvLiveTransportPrimedSessionId!==String(id)){
  smvLiveTransportPrimedSessionId=String(id);
  if(s.mode==='call')smvLivePollSignals(id).catch(()=>{});
  if(s.mode==='chat')smvLivePollMessages(id).catch(()=>{});
 }
}
async function smvLiveReconcileAfterEventStreamConnect(){
 await smvLivePollSessions().catch(error=>console.warn('Live session recovery after SSE reconnect skipped:',error?.message||error));
 const session=smvLiveCurrentSession,id=smvLivePanelSessionId;
 if(!session||!id||session.state==='ended')return;
 if(session.mode==='chat')await smvLivePollMessages(id).catch(error=>console.warn('Chat history recovery after SSE reconnect skipped:',error?.message||error));
 else if(session.mode==='call')await smvLiveReconcileCallSignals(id).catch(error=>console.warn('Call signal recovery after SSE reconnect skipped:',error?.message||error));
}
function smvLiveHandleEvent(ev){
 if(!ev||typeof ev!=='object')return;
 if(ev.type==='live.session.request'||ev.type==='live.session.updated'){
  const s=ev.session;if(!s)return;
  smvLiveUpdateDashboardSessionStatus(s);
  if(s.state==='ringing'&&s.astrologerUid===currentUser?.uid&&s.id!==smvLivePanelSessionId){smvLiveStartRingtone(s.id);smvLiveOpenSession(s,null,true);}
  else if(s.id===smvLivePanelSessionId){if(s.state!=='ringing'&&smvLiveRingCurrentId===String(s.id||''))smvLiveStopRingtone();smvLiveApplySession(s);}
  else if(['preparing','connecting','active'].includes(s.state)&&s.astrologerUid===currentUser?.uid&&!smvLiveRingSuppressedIds.has(String(s.id||'')))smvLiveOpenSession(s,null,false);
  else if(['preparing','ringing','connecting','active'].includes(s.state)&&s.customerUid===currentUser?.uid&&!smvLiveRingSuppressedIds.has(String(s.id||'')))smvLiveOpenSession(s,null,false);
 }else if(ev.type==='live.session.ended'){
  const s=ev.session;if(s)smvLiveUpdateDashboardSessionStatus(s);if(s&&s.id===smvLivePanelSessionId){smvLiveApplySession(s);const result=$('smvLiveSessionResult');if(result)result.textContent=smvLiveSessionEndedMessage(s,ev.wallet);loadDashboard(window.__smvCurrentRole||null,true,true).catch(()=>{});}
 }else if(ev.type==='live.chat.message'&&ev.message?.sessionId===smvLivePanelSessionId){
  if($('smvLiveMessages')){const ms=Date.parse(ev.message.createdAt||'');if(Number.isFinite(ms))smvLiveMessageSinceMs=Math.max(smvLiveMessageSinceMs,ms);smvLiveAppendMessage(ev.message);}
 }else if(ev.type==='live.call.signal'&&ev.signal?.sessionId===smvLivePanelSessionId){
  const signal=ev.signal;
  // A signal can arrive before this participant grants microphone permission.
  // Keep the replay cursor unchanged until WebRTC has actually consumed it.
  smvLiveProcessSignal(signal).then(processed=>{
   if(processed!==true)return;
   const ms=Date.parse(signal.createdAt||'');
   if(Number.isFinite(ms))smvLiveSignalSinceMs=Math.max(smvLiveSignalSinceMs,ms);
  }).catch(smvLiveShowError);
 }
 else if(ev.type==='live.booking.pending'||ev.type==='live.booking.updated'){if(ev.type==='live.booking.pending')smvLiveStartRingtone();smvLivePollSessions().catch(()=>{});}
}
function smvLiveStopEventStream(){
 if(smvLiveEventRetry){clearTimeout(smvLiveEventRetry);smvLiveEventRetry=null;}
 if(smvLiveEventController){smvLiveEventController.abort();smvLiveEventController=null;}
 smvLiveEventStreamConnected=false;
 smvLiveEventUid='';
 smvLiveStopFallbackPolling();
}
function smvLiveStartEventStream(){
 const user=auth?.currentUser;if(!user||!currentUser||currentUser.uid!==user.uid)return;if(smvLiveEventUid===user.uid&&smvLiveEventController)return;
 smvLiveStopEventStream();smvLiveEventUid=user.uid;const uid=user.uid,controller=new AbortController();smvLiveEventController=controller;
 // Keep recovery polling active until the server's live.ready frame confirms the stream.
 smvLiveStartFallbackPolling();
 (async()=>{
  let watchdog=null,lastByteAt=Date.now();
  try{
   const token=await user.getIdToken(),resp=await fetch(BACKEND+'/live/events',{headers:{Authorization:'Bearer '+token,Accept:'text/event-stream'},cache:'no-store',signal:controller.signal});
   if(!resp.ok||!resp.body)throw new Error('Live event stream HTTP '+resp.status);
   const reader=resp.body.getReader(),decoder=new TextDecoder();let buffer='';
   // Some proxies keep HTTP 200 open after the application stream has stalled.
   // Abort a silent stream so the existing recovery pollers and reconnect can resume.
   watchdog=setInterval(()=>{if(Date.now()-lastByteAt>45000)controller.abort();},5000);
   while(true){
    const item=await reader.read();
    if(item.done)break;
    if(!item.value)continue;
    lastByteAt=Date.now();
    buffer+=decoder.decode(item.value,{stream:true});
    let n;
    while((n=buffer.indexOf('\n\n'))>=0){
     const frame=buffer.slice(0,n);buffer=buffer.slice(n+2);
     const line=frame.split('\n').find(x=>x.startsWith('data:'));
     if(!line)continue;
     try{
      const event=JSON.parse(line.slice(5).trim());
      if(event?.type==='live.ready'&&!smvLiveEventStreamConnected){
       smvLiveEventStreamConnected=true;
       smvLiveStopFallbackPolling();
       // Reconcile state, chat history and WebRTC signals missed while reconnecting.
       smvLiveReconcileAfterEventStreamConnect().catch(()=>{});
      }
      smvLiveHandleEvent(event);
     }catch(e){console.warn('Invalid Live Session event:',e);}
    }
   }
  }catch(e){
   if(e?.name!=='AbortError')console.warn('Live events disconnected; enabling recovery polling.',e?.message||e);
   if(smvLiveEventController===controller){smvLiveEventStreamConnected=false;smvLiveStartFallbackPolling();}
  }finally{
   if(watchdog)clearInterval(watchdog);
   const isCurrent=smvLiveEventController===controller;
   if(isCurrent){smvLiveEventController=null;smvLiveEventStreamConnected=false;}
   if(isCurrent&&currentUser?.uid===uid&&auth?.currentUser?.uid===uid){
    smvLiveStartFallbackPolling();
    smvLiveEventRetry=setTimeout(()=>{smvLiveEventRetry=null;smvLiveStartEventStream();},3000);
   }
  }
 })();
}
function smvLiveUpdateDashboardSessionStatus(session){
 const id=String(session?.id||session?.sessionId||'');
 if(!id)return;
 const previous=smvLiveDashboardSessionsById.get(id)||{};
 const current=smvLiveMergeSessionState(previous,{...session,id});
 smvLiveDashboardSessionsById.set(id,current);
 // Wallet settlement may be reported by the recovery poll after the session modal
 // was closed. Refresh on the authoritative terminal transition, not only in the modal.
 if(current.state==='ended'&&String(previous.state||'')!=='ended'&&String(current.customerUid||'')===String(currentUser?.uid||'')){
  window.dispatchEvent(new Event('smv:wallet-updated'));
 }
 const updateRow=()=>{
  const host=$('smvLiveDashboardSessions');if(!host)return;
  const openButton=Array.from(host.querySelectorAll('[data-live-open]')).find(button=>String(button.dataset.liveOpen||'')===id);
  const status=openButton?.closest('article')?.querySelector('[data-live-dashboard-status]');
  if(status)status.textContent=smvLiveSessionStatusLabel(current);
 };
 updateRow();
 if(current.state==='preparing'&&!smvLiveDashboardStatusTimer){
  smvLiveDashboardStatusTimer=setInterval(()=>{
   let preparing=false;
   for(const row of smvLiveDashboardSessionsById.values()){
    if(row.state!=='preparing')continue;
    preparing=true;
    const host=$('smvLiveDashboardSessions');if(!host)continue;
    const openButton=Array.from(host.querySelectorAll('[data-live-open]')).find(button=>String(button.dataset.liveOpen||'')===String(row.id||''));
    const status=openButton?.closest('article')?.querySelector('[data-live-dashboard-status]');
    if(status)status.textContent=smvLiveSessionStatusLabel(row);
   }
   if(!preparing){clearInterval(smvLiveDashboardStatusTimer);smvLiveDashboardStatusTimer=null;}
  },1000);
 }
}
async function smvLivePollSessions(){
 if(smvLivePollBusy||!currentUser||!auth?.currentUser||currentUser.uid!==auth.currentUser.uid)return;
 const role=String(window.__smvCurrentRole||'').toLowerCase();if(!['customer','astrologer'].includes(role))return;smvLivePollBusy=true;
 try{
  const list=await renderApi('/live/sessions',{method:'GET',timeoutMs:12000});
  for(const session of list.sessions||[]){smvLiveUpdateDashboardSessionStatus(session);
   if(session.state==='ringing'&&session.astrologerUid===currentUser.uid&&role==='astrologer'&&smvLivePanelSessionId!==session.id){smvLiveStartRingtone(session.id);smvLiveOpenSession(session,null,true);}
   else if(session.id===smvLivePanelSessionId){if(session.state!=='ringing'&&smvLiveRingCurrentId===String(session.id||''))smvLiveStopRingtone();smvLiveApplySession(session);}
   else if(['preparing','connecting','active'].includes(session.state)&&session.astrologerUid===currentUser.uid&&role==='astrologer'&&!smvLiveRingSuppressedIds.has(String(session.id||'')))smvLiveOpenSession(session,null,false);
   else if(['preparing','ringing','connecting','active'].includes(session.state)&&session.customerUid===currentUser.uid&&role==='customer'&&!smvLiveRingSuppressedIds.has(String(session.id||'')))smvLiveOpenSession(session,null,false);
  }
  if(role==='astrologer'){
   const b=await renderApi('/live/bookings/pending',{method:'GET',timeoutMs:12000});smvLiveRenderBookings(b.bookings||[]);
   const pendingSession=(list.sessions||[]).find(x=>x.astrologerUid===currentUser.uid&&x.state==='ringing'&&!smvLiveRingSuppressedIds.has(String(x.id||'')));
   const pendingBooking=(b.bookings||[]).find(x=>!smvLiveRingSuppressedIds.has(String(x.id||x.bookingId||'')));
   const ringSourceId=String(pendingSession?.id||pendingBooking?.id||pendingBooking?.bookingId||'');
   if(ringSourceId)smvLiveStartRingtone(ringSourceId);else if(smvLiveRingActive)smvLiveStopRingtone();
   if($('smvScheduledBookings')&&Date.now()-smvLiveScheduledPollAt>12000){smvLiveScheduledPollAt=Date.now();try{await smvLiveLoadScheduledAppointments();}catch(scheduleError){console.warn('Scheduled booking refresh skipped:',scheduleError?.message||scheduleError);}}
  }else{
   const b=await renderApi('/live/bookings/mine',{method:'GET',timeoutMs:12000});smvLiveRenderCustomerBookings(b.bookings||[]);
   if($('smvLiveCustomerScheduledBookings')&&Date.now()-smvLiveCustomerAppointmentsPollAt>12000){
    smvLiveCustomerAppointmentsPollAt=Date.now();
    try{const scheduled=await renderApi('/customer/appointments',{method:'GET',timeoutMs:12000});smvLiveRenderCustomerScheduledBookings(smvLiveNormalizeScheduledAppointments(scheduled.appointments||[],list.sessions||[]));}
    catch(scheduleError){const box=$('smvLiveCustomerScheduledBookings');if(box)box.innerHTML='<p class="error">Scheduled bookings unavailable: '+escapeHtml(scheduleError?.message||String(scheduleError))+'</p>'; }
   }
  }
 }catch(e){if(!/403|role/i.test(String(e?.message||e)))console.warn('Live session polling skipped:',e?.message||e);}
 finally{smvLivePollBusy=false;}
}
function smvLiveScheduledBookingEpoch(a){
 const date=String(a?.preferredDate||''),time=String(a?.preferredTime||'');
 if(date.length!==10||date[4]!=='-'||date[7]!=='-'||![0,1,2,3,5,6,8,9].every(i=>date[i]>='0'&&date[i]<='9')||time.length!==5||time[2]!==':'||![0,1,3,4].every(i=>time[i]>='0'&&time[i]<='9'))return NaN;
 const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);
 const utc=Date.UTC(y,m-1,d,hh,mm),check=new Date(utc);
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return NaN;
 return utc-330*60*1000;
}
async function smvLiveRefreshScheduledBookingRole(role){
 const activeRole=String(window.__smvCurrentRole||role||'').toLowerCase();
 if(activeRole==='astrologer'&&$('smvScheduledBookings')){
  await smvLiveLoadScheduledAppointments();
 }else if(activeRole==='customer'&&$('smvLiveCustomerScheduledBookings')){
  const [scheduled,live]=await Promise.all([
   renderApi('/customer/appointments',{method:'GET',timeoutMs:12000}),
   renderApi('/live/sessions',{method:'GET',timeoutMs:12000})
  ]);
  smvLiveRenderCustomerScheduledBookings(smvLiveNormalizeScheduledAppointments(scheduled.appointments||[],live.sessions||[]));
  smvLiveCustomerAppointmentsPollAt=Date.now();
 }
}
function smvLiveScheduleBookingRefreshRetry(role,attempt=1){
 if(smvLiveScheduledRefreshTimer){clearTimeout(smvLiveScheduledRefreshTimer);smvLiveScheduledRefreshTimer=null;}
 const retryDelayMs=Math.min(60_000,5_000*(2**Math.min(attempt-1,4)));
 smvLiveScheduledRefreshTimer=setTimeout(async()=>{
  smvLiveScheduledRefreshTimer=null;
  try{await smvLiveRefreshScheduledBookingRole(role);}
  catch(error){
   console.warn('Scheduled booking transition retry failed:',error?.message||error);
   smvLiveScheduleBookingRefreshRetry(role,attempt+1);
  }
 },retryDelayMs);
}
function smvLiveScheduleBookingTransitionRefresh(appointments,role){
 if(smvLiveScheduledRefreshTimer){clearTimeout(smvLiveScheduledRefreshTimer);smvLiveScheduledRefreshTimer=null;}
 const now=Date.now();
 let nextAt=Infinity;
 for(const appointment of Array.isArray(appointments)?appointments:[]){
  if(String(appointment?.bookingStatus||appointment?.status||'').toLowerCase()!=='accepted')continue;
  const start=smvLiveScheduledBookingEpoch(appointment);
  if(!Number.isFinite(start))continue;
  const deadline=start+120_000;
  if(start>now)nextAt=Math.min(nextAt,start);
  if(deadline>now)nextAt=Math.min(nextAt,deadline);
 }
 if(!Number.isFinite(nextAt))return;
 const delay=Math.max(25,Math.min(2_147_483_000,nextAt-now+50));
 smvLiveScheduledRefreshTimer=setTimeout(async()=>{
  smvLiveScheduledRefreshTimer=null;
  const activeRole=String(window.__smvCurrentRole||role||'').toLowerCase();
  try{await smvLiveRefreshScheduledBookingRole(activeRole);}
  catch(error){
   console.warn('Scheduled booking time transition refresh skipped:',error?.message||error);
   smvLiveScheduleBookingRefreshRetry(activeRole);
  }
 },delay);
}
function smvLiveRenderScheduledBookings(appointments){
 const host=$('smvScheduledBookings');if(!host)return;
 smvLiveScheduledAppointmentsCache=Array.isArray(appointments)?appointments:[];
 if(!smvLiveScheduledAppointmentsCache.length){smvLiveScheduleBookingTransitionRefresh([],'astrologer');host.innerHTML='<p class="small">No scheduled Call or Chat bookings yet.</p>';return;}
 const stateText=a=>{
  const status=String(a.bookingStatus||a.status||'requested').toLowerCase();
  if(status==='requested')return 'Awaiting your confirmation';
  if(status==='accepted'){
   const t=smvLiveScheduledBookingEpoch(a);
   if(!Number.isFinite(t))return 'Accepted · schedule needs correction';
   if(Date.now()<t)return 'Accepted · waiting for scheduled time';
   return Date.now()<t+120_000?'Scheduled time reached · waiting for Astrologer to start (2-minute grace period)':'Missed · Astrologer did not start within 2 minutes of scheduled time';
  }
  if(status==='rejected')return 'Rejected by Astrologer';
  if(status==='missed_by_astrologer'||status==='missed')return 'Missed · start window expired (2 minutes after schedule)';
  if(status==='in_progress')return 'Live session started';
  if(status==='waiting_for_online')return 'Queued · set availability Online to continue';
  if(status==='rejected')return 'Rejected';
  if(status==='completed')return 'Completed';
  return status.replaceAll('_',' ');
 };
 host.innerHTML=appointments.map(a=>{
  const isChat=a.type==='Chat Consultation'||a.bookingKind==='scheduled_chat_request';
  const modeLabel=isChat?'CHAT BOOKING':'CALL BOOKING';
  const status=String(a.bookingStatus||a.status||'requested').toLowerCase();
  const birth=a.birthDetails||{};
  const time=smvLiveScheduledBookingEpoch(a);
  const startDeadline=Number.isFinite(time)?time+120_000:NaN;
  const startReady=status==='accepted'&&Number.isFinite(time)&&Date.now()>=time&&Date.now()<startDeadline;
  let buttons='';
  if(status==='requested'){
   buttons='<div class="action-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button class="btn" data-scheduled-respond="accept" data-appointment-id="'+escapeHtml(a.id)+'" type="button">ACCEPT BOOKING</button><button class="btn gray" data-scheduled-respond="reject" data-appointment-id="'+escapeHtml(a.id)+'" type="button">REJECT BOOKING</button></div>';
  }else if(status==='accepted'){
   buttons='<div class="action-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button class="btn" data-scheduled-start="'+escapeHtml(a.id)+'" type="button" '+(startReady?'':'disabled')+'>'+(startReady?'START SCHEDULED '+(isChat?'CHAT':'CALL'):'START AVAILABLE AT BOOKED TIME')+'</button></div>';
  }else if(status==='in_progress'&&a.liveSessionId){
   buttons='<div class="action-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button class="btn" data-scheduled-open="'+escapeHtml(a.liveSessionId)+'" type="button">OPEN LIVE '+(isChat?'CHAT':'CALL')+'</button></div>';
  }else if(status==='waiting_for_online'){
   buttons='<p class="small" style="margin-top:8px">This appointment was moved to the Live queue because the session could not start immediately. Check Pending Bookings above and accept the queued request after going Online.</p>';
  }
  return '<article class="card" style="margin:8px 0;min-width:0;overflow-wrap:anywhere"><div class="badge">'+modeLabel+'</div><h4 style="margin:6px 0">'+escapeHtml(a.bookingId||'Booking')+'</h4><p class="small"><b>Customer:</b> '+escapeHtml(a.name||'Customer')+'</p><p class="small"><b>Preferred date/time (IST):</b> '+escapeHtml(String(a.preferredDate||'')+' '+String(a.preferredTime||''))+'</p><p class="small"><b>Duration:</b> '+Number(a.scheduledMinutes||5)+' minute(s) · <b>Status:</b> '+escapeHtml(stateText(a))+'</p>'+(isChat&&a.question?'<div class="small" style="white-space:pre-wrap;overflow-wrap:anywhere"><b>Previous Chat Question:</b> '+escapeHtml(a.question)+'</div>':'')+(birth.birthDate||birth.birthTime||birth.birthPlace?'<p class="small"><b>Birth details:</b> '+escapeHtml([birth.birthDate,birth.birthTime,birth.birthPlace].filter(Boolean).join(' · '))+'</p>':'')+(a.notes?'<p class="small" style="white-space:pre-wrap;overflow-wrap:anywhere"><b>Notes:</b> '+escapeHtml(a.notes)+'</p>':'')+buttons+'</article>';
 }).join('');
 smvLiveScheduleBookingTransitionRefresh(appointments,'astrologer');
 host.querySelectorAll('[data-scheduled-respond]').forEach(btn=>btn.onclick=async()=>{
  const appointmentId=String(btn.dataset.appointmentId||''),action=String(btn.dataset.scheduledRespond||'');
  if(!appointmentId||!['accept','reject'].includes(action))return;
  if(action==='reject'&&!confirm('Reject this scheduled Call/Chat booking?'))return;
  btn.disabled=true;
  try{
   const result=await renderApi('/astrologer/appointments/'+encodeURIComponent(appointmentId)+'/respond',{method:'POST',body:JSON.stringify({action})});
   const nextStatus=String(result.bookingStatus||(action==='accept'?'accepted':'rejected')).toLowerCase();
   const updatedAppointments=smvLiveScheduledAppointmentsCache.map(appointment=>String(appointment.id||'')===appointmentId?{...appointment,bookingStatus:nextStatus,status:nextStatus}:appointment);
   smvLiveRenderScheduledBookings(updatedAppointments);
   const msg=$('smvLiveDashboardMsg');if(msg)msg.textContent=action==='accept'?'Booking accepted. The Start button will enable automatically at the booked time.':'Scheduled booking rejected.';
   smvLiveLoadScheduledAppointments().catch(refreshError=>console.warn('Accepted booking follow-up refresh skipped:',refreshError?.message||refreshError));
  }catch(error){smvLiveShowError(error);btn.disabled=false;}
 });
 host.querySelectorAll('[data-scheduled-start]').forEach(btn=>btn.onclick=async()=>{
  const appointmentId=String(btn.dataset.scheduledStart||'');if(!appointmentId)return;
  btn.disabled=true;btn.textContent='STARTING…';
  const recoverStartedSession=async()=>{
   const [appointmentsResult,sessionsResult]=await Promise.all([
    renderApi('/astrologer/appointments',{method:'GET',timeoutMs:12000}),
    renderApi('/live/sessions',{method:'GET',timeoutMs:12000})
   ]);
   const appointment=(appointmentsResult.appointments||[]).find(a=>String(a.id||a.appointmentId||'')===appointmentId);
   const sessionId=String(appointment?.liveSessionId||'');
   const session=(sessionsResult.sessions||[]).find(s=>String(s.id||'')===sessionId||(String(s.appointmentId||'')===appointmentId&&['preparing','connecting','active'].includes(String(s.state||''))));
   return {appointment,session};
  };
  try{
   const result=await renderApi('/live/scheduled-appointments/'+encodeURIComponent(appointmentId)+'/start',{method:'POST',body:JSON.stringify({})});
   let session=result.session||null;
   if(!session){const recovery=await recoverStartedSession();session=recovery.session||null;}
   if(session){
    smvLiveOpenSession(session,result.wallet||null,false);
    smvLiveShowDashboardMessage('Scheduled Live Session opened. The Horoscope timer and Call / Chat connect controls are available in the Live Session window.');
   }else if(result.booking){
    smvLiveShowDashboardMessage('Scheduled booking is queued. Set availability Online to receive the request, then accept it under Pending Bookings.');
   }else{
    throw new Error('The scheduled session was not returned. Checking for an already-started session.');
   }
   await smvLivePollSessions();
   await smvLiveLoadScheduledAppointments();
  }catch(error){
   try{
    const recovery=await recoverStartedSession();
    if(recovery.session){
     smvLiveOpenSession(recovery.session,null,false);
     smvLiveShowDashboardMessage('The scheduled session was already started and has now been opened.');
     await smvLivePollSessions();
     await smvLiveLoadScheduledAppointments();
     return;
    }
   }catch(recoveryError){console.warn('Scheduled session recovery could not complete:',recoveryError?.message||recoveryError);}
   smvLiveShowDashboardMessage(error?.message||String(error));
   btn.disabled=false;
   btn.textContent='START SCHEDULED '+(btn.closest('article')?.textContent.includes('CHAT BOOKING')?'CHAT':'CALL');
  }
 });
 host.querySelectorAll('[data-scheduled-open]').forEach(btn=>btn.onclick=async()=>{
  const id=String(btn.dataset.scheduledOpen||'');if(!id)return;
  try{const list=await renderApi('/live/sessions',{method:'GET'});const session=(list.sessions||[]).find(x=>String(x.id||'')===id);if(session)smvLiveOpenSession(session,null,false);else throw new Error('Live session is not available yet. Refresh the dashboard.');}
  catch(error){smvLiveShowError(error);}
 });
}
async function smvLiveLoadScheduledAppointments(){
 const host=$('smvScheduledBookings');if(!host||String(window.__smvCurrentRole||'').toLowerCase()!=='astrologer')return;
 const [r,live]=await Promise.all([renderApi('/astrologer/appointments',{method:'GET',timeoutMs:12000}),renderApi('/live/sessions',{method:'GET',timeoutMs:12000})]);
 smvLiveRenderScheduledBookings(smvLiveNormalizeScheduledAppointments(r.appointments||[],live.sessions||[]));
}
function smvLiveRenderBookings(bookings){
 const host=$('smvLiveBookings');if(!host)return;
 if(!bookings.length){host.innerHTML='<p class="small">No pending Live Call / Chat bookings.</p>';return;}
 host.innerHTML=bookings.map(b=>'<article class="card" style="margin:8px 0"><b>'+escapeHtml(String(b.mode||'chat').toUpperCase())+' · '+Number(b.minutes||1)+' min</b><p class="small">Booking status: '+escapeHtml(b.status||'pending')+' · Maximum selected cost: '+smvLiveMoney(Number(b.ratePerMinutePaise||0)*Number(b.minutes||1))+'</p><div class="action-row"><button class="btn" type="button" data-live-booking-accept="'+escapeHtml(b.id)+'">ACCEPT BOOKING</button><button class="btn gray" type="button" data-live-booking-reject="'+escapeHtml(b.id)+'">REJECT BOOKING</button></div></article>').join('');
 host.querySelectorAll('[data-live-booking-accept]').forEach(btn=>btn.onclick=async()=>{
  btn.disabled=true;
  try{const r=await renderApi('/live/bookings/'+encodeURIComponent(btn.dataset.liveBookingAccept)+'/accept',{method:'POST',body:JSON.stringify({})});if(r.session)smvLiveOpenSession(r.session,r.wallet,false);await smvLivePollSessions();}
  catch(e){smvLiveShowError(e);btn.disabled=false;}
 });
 host.querySelectorAll('[data-live-booking-reject]').forEach(btn=>btn.onclick=async()=>{
  if(!confirm('Reject this pending Live booking?'))return;
  btn.disabled=true;
  try{await renderApi('/live/bookings/'+encodeURIComponent(btn.dataset.liveBookingReject)+'/reject',{method:'POST',body:JSON.stringify({})});await smvLivePollSessions();}
  catch(e){smvLiveShowError(e);btn.disabled=false;}
 });
}
function smvLiveRenderCustomerBookings(bookings){
 const host=$('smvLiveCustomerBookings');if(!host)return;
 if(!bookings.length){host.innerHTML='<p class="small">No Live Call / Chat bookings yet.</p>';return;}
 host.innerHTML=bookings.map(b=>'<article class="card" style="margin:8px 0"><b>'+escapeHtml(String(b.mode||'chat').toUpperCase())+' · '+Number(b.minutes||1)+' minute(s)</b><p class="small">Astrologer: '+escapeHtml(b.astrologerName||'Astrologer')+' · Status: <b>'+escapeHtml(b.status||'pending')+'</b></p><p class="small">Selected maximum cost: '+smvLiveMoney(Number(b.ratePerMinutePaise||0)*Number(b.minutes||1))+' · Charged: '+smvLiveMoney(b.actualChargePaise)+' · Released: '+smvLiveMoney(b.releasedAmountPaise)+'</p>'+(b.status==='pending'?'<button class="btn gray" type="button" data-live-booking-cancel="'+escapeHtml(b.id)+'">CANCEL BOOKING</button>':'')+'</article>').join('');
 host.querySelectorAll('[data-live-booking-cancel]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Cancel this pending Live booking?'))return;btn.disabled=true;try{await renderApi('/live/bookings/'+encodeURIComponent(btn.dataset.liveBookingCancel)+'/cancel',{method:'POST',body:JSON.stringify({})});await smvLivePollSessions();}catch(e){smvLiveShowError(e);btn.disabled=false;}});
}
function smvLiveNormalizeScheduledAppointments(appointments,sessions){
 const sessionById=new Map((Array.isArray(sessions)?sessions:[]).map(s=>[String(s?.id||s?.sessionId||''),s]));
 return (Array.isArray(appointments)?appointments:[]).map(a=>{
  const liveId=String(a?.liveSessionId||'');
  const session=liveId?sessionById.get(liveId):null;
  if(!session||String(session.state||'').toLowerCase()!=='ended')return a;
  const connected=!!session.startedAt||Number(session.connectedDurationMs)>0;
  const reason=String(session.endReason||'').toLowerCase();
  const status=connected?'completed':(['rejected','rejected_by_astrologer'].includes(reason)?'rejected':(['connection_failed','no_answer','missed_by_astrologer','scheduled_connection_timeout'].includes(reason)?'missed_by_astrologer':'cancelled'));
  return {...a,bookingStatus:status,status,liveSessionId:liveId||String(session.id||''),liveEndedAt:session.endedAt||a.liveEndedAt||null};
 });
}
function smvLiveRenderCustomerScheduledBookings(appointments){
 const host=$('smvLiveCustomerScheduledBookings');if(!host)return;
 if(!appointments.length){smvLiveScheduleBookingTransitionRefresh([],'customer');host.innerHTML='<p class="small">No scheduled Call / Chat bookings yet.</p>';return;}
 const describe=a=>{
  const s=String(a.bookingStatus||a.status||'requested').toLowerCase();
  if(s==='requested')return 'Request received · Please be patient. Your Astrologer will review it; the session can start at the scheduled time once confirmed.';
  if(s==='accepted'){
   const t=smvLiveScheduledBookingEpoch(a);
   if(!Number.isFinite(t))return 'Accepted · schedule needs correction';
   if(Date.now()<t)return 'Accepted · waiting for the scheduled time';
   return Date.now()<t+120_000?'Scheduled time reached · please wait while the Astrologer starts (2-minute grace period)':'Missed · Astrologer did not start within 2 minutes of the scheduled time';
  }
  if(s==='waiting_for_online')return 'Queued · waiting for Astrologer to come Online';
  if(s==='in_progress')return 'Horoscope preparation / Live Session in progress';
  if(s==='completed')return 'Completed';
  if(s==='rejected')return 'Astrologer rejected this booking. No live session was started.';
  if(s==='missed_by_astrologer'||s==='missed')return 'Missed · Astrologer did not start/connect within 2 minutes of the scheduled time. Please choose another time.';
  if(s==='cancelled')return 'Cancelled';
  return s.replaceAll('_',' ');
 };
 host.innerHTML=appointments.map(a=>{
  const isChat=String(a.bookingKind||'')==='scheduled_chat_request'||String(a.type||'')==='Chat Consultation';
  const status=String(a.bookingStatus||a.status||'requested').toLowerCase();
  const mode=isChat?'CHAT':'CALL';
  const open=!!a.liveSessionId&&['in_progress','completed'].includes(status);
  return '<article class="card" style="margin:8px 0;overflow-wrap:anywhere"><b>'+mode+' BOOKING · '+escapeHtml(a.bookingId||a.id||'')+'</b>'+
   '<p class="small">Astrologer: '+escapeHtml(a.astrologerName||'Astrologer')+'</p>'+
   '<p class="small">Scheduled time (IST): '+escapeHtml(String(a.preferredDate||'')+' '+String(a.preferredTime||''))+'</p>'+
   '<p class="small">Duration: '+Number(a.scheduledMinutes||5)+' minute(s)</p>'+
   '<p class="small">Status: <b>'+escapeHtml(describe(a))+'</b></p>'+
   (a.liveSessionId&&status==='in_progress'?'<button class="btn" type="button" data-customer-scheduled-open="'+escapeHtml(a.liveSessionId)+'">OPEN LIVE '+mode+'</button>':'')+
   (a.liveSessionId&&status==='completed'?'<button class="btn gray" type="button" data-customer-scheduled-open="'+escapeHtml(a.liveSessionId)+'">VIEW SESSION RECEIPT</button>':'')+
   '</article>';
 }).join('');
 smvLiveScheduleBookingTransitionRefresh(appointments,'customer');
 host.querySelectorAll('[data-customer-scheduled-open]').forEach(btn=>btn.onclick=async()=>{
  const id=String(btn.dataset.customerScheduledOpen||'');if(!id)return;
  try{
   const list=await renderApi('/live/sessions',{method:'GET'});
   const session=(list.sessions||[]).find(x=>String(x.id||'')===id);
   if(session)smvLiveOpenSession(session,null,false);
   else throw new Error('The Live Session is not available. Refresh your bookings.');
  }catch(error){smvLiveShowDashboardMessage(error?.message||String(error));}
 });
}
function smvLiveShowDashboardMessage(message){
 const target=$('smvLiveDashboardMsg');
 if(target){target.textContent=String(message||'');target.setAttribute('role','status');}
 else smvLiveShowError(new Error(String(message||'Live Session action failed.')));
}
function smvLiveDashboardHtml(role){
 return '<section class="card" id="smvLiveDashboardCard" style="margin-top:16px"><h3>Live Call / Live Chat</h3><p class="small">Voice and real-time messages use the built-in SMV ASTRO session service. Rates are charged per started minute from the Customer Wallet.</p>'+
 (role==='astrologer'?'<div class="action-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px"><button class="btn" id="smvLivePushEnable" type="button">ENABLE BACKGROUND ALERTS</button><button class="btn gray" id="smvLivePushTest" type="button">SEND TEST ALERT</button></div><p id="smvLivePushStatus" class="small" role="status" aria-live="polite">Enable Push Alerts once on each mobile device that should receive incoming requests.</p><div class="action-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px"><label>Availability <select id="smvLiveAvailability"><option value="offline">Offline</option><option value="online">Online</option><option value="busy">Busy</option></select></label><button class="btn" id="smvLiveSetAvailability" type="button">SAVE STATUS</button><button class="btn gray" id="smvLiveRingToggle" type="button" aria-pressed="false">ENABLE RING SOUND</button></div><div class="action-row" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px"><label><input id="smvLiveCallEnabled" type="checkbox"> Live Call ON</label><label><input id="smvLiveChatEnabled" type="checkbox"> Live Chat ON</label></div><p class="small" id="smvLiveAvailabilityMsg">Choose Live Call and/or Live Chat. Any enabled mode automatically sets Online; both OFF sets Offline. An active live session sets Busy. Enable ring sound once on this browser for incoming requests.</p><h4>Pending Bookings</h4><div id="smvLiveBookings"><p class="small">Loading…</p></div>':'<h4>My Scheduled Call / Chat Bookings</h4><div id="smvLiveCustomerScheduledBookings"><p class="small">Loading scheduled bookings…</p></div><h4>My Live Bookings</h4><div id="smvLiveCustomerBookings"><p class="small">Loading your bookings…</p></div>')+
 (role==='astrologer'?'<h4>Scheduled Call / Chat Bookings</h4><div id="smvScheduledBookings"><p class="small">Loading scheduled bookings…</p></div>':'')+'<h4>My Live Sessions</h4><div id="smvLiveDashboardSessions"><p class="small">Loading…</p></div><button type="button" class="btn gray" id="smvLiveRefreshDashboard">REFRESH LIVE SESSIONS / BOOKINGS</button><p id="smvLiveDashboardMsg" class="small" role="status"></p></section>';
}
async function smvLiveLoadDashboard(role){
 const host=$('smvLiveDashboardSessions'),msg=$('smvLiveDashboardMsg');if(!host)return;
 const reload=async()=>{
  try{
   const list=await renderApi('/live/sessions',{method:'GET'}),rows=list.sessions||[];smvLiveDashboardSessionsById.clear();
   host.innerHTML=rows.length?rows.map(s=>'<article class="card" style="margin:8px 0"><b>'+escapeHtml(String(s.mode||'chat').toUpperCase())+' · '+Number(s.minutes||1)+' min</b><p class="small">Status: <span data-live-dashboard-status="'+escapeHtml(s.id)+'">'+escapeHtml(smvLiveSessionStatusLabel(s))+'</span> · Rate '+smvLiveMoney(s.ratePerMinutePaise)+'/min</p><p class="small">Charged: '+smvLiveMoney(s.actualChargePaise)+' · Released: '+smvLiveMoney(s.releasedAmountPaise)+'</p><button type="button" class="smv-plain-text-action" data-live-open="'+escapeHtml(s.id)+'" style="padding:0;border:0;background:transparent;color:inherit;font:inherit;font-weight:700;text-decoration:none;cursor:pointer;box-shadow:none;min-height:0">OPEN SESSION / RECEIPT</button></article>').join(''):'<p class="small">No Live Sessions yet.</p>';
    rows.forEach(s=>smvLiveUpdateDashboardSessionStatus(s));
   host.querySelectorAll('[data-live-open]').forEach(btn=>btn.onclick=()=>{const s=rows.find(x=>x.id===btn.dataset.liveOpen);if(s)smvLiveOpenSession(s,null,String(window.__smvCurrentRole||'').toLowerCase()==='astrologer'&&s.astrologerUid===currentUser?.uid&&s.state==='ringing');});
   if(role==='astrologer'){
    const data=await renderApi('/public/astrologers',{method:'GET'}),astro=(data.astrologers||[]).find(a=>a.id===currentUser?.uid),sel=$('smvLiveAvailability');
    const callToggle=$('smvLiveCallEnabled'),chatToggle=$('smvLiveChatEnabled');
    if(sel&&!sel.dataset.initialized){
     if(astro)sel.value=astro.availabilityStatus||'offline';
     if(callToggle)callToggle.checked=astro?.liveCallEnabled===true;
     if(chatToggle)chatToggle.checked=astro?.liveChatEnabled===true;
     sel.dataset.initialized='1';
    }
    smvLiveRenderBookings((await renderApi('/live/bookings/pending',{method:'GET'})).bookings||[]);
    try{const scheduled=await renderApi('/astrologer/appointments',{method:'GET',timeoutMs:12000});smvLiveRenderScheduledBookings(smvLiveNormalizeScheduledAppointments(scheduled.appointments||[],list.sessions||[]));}
    catch(bookingError){const bookingHost=$('smvScheduledBookings');if(bookingHost)bookingHost.innerHTML='<p class="error">Scheduled bookings unavailable: '+escapeHtml(bookingError?.message||String(bookingError))+'</p>';}
   }else{
    smvLiveRenderCustomerBookings((await renderApi('/live/bookings/mine',{method:'GET'})).bookings||[]);
    const scheduled=await renderApi('/customer/appointments',{method:'GET',timeoutMs:12000});
    smvLiveRenderCustomerScheduledBookings(smvLiveNormalizeScheduledAppointments(scheduled.appointments||[],list.sessions||[]));
    smvLiveCustomerAppointmentsPollAt=Date.now();
   }
   if(msg)msg.textContent='Live session status refreshed.';
  }catch(e){if(host)host.innerHTML='<p class="error">'+escapeHtml(e.message||String(e))+'</p>';if(msg)msg.textContent='Live Sessions unavailable: '+String(e.message||e);}
 };
 const refresh=$('smvLiveRefreshDashboard');if(refresh&&!refresh.dataset.bound){refresh.dataset.bound='1';refresh.onclick=reload;}
 const callToggle=$('smvLiveCallEnabled'),chatToggle=$('smvLiveChatEnabled'),availabilitySelect=$('smvLiveAvailability'),availabilityMessage=$('smvLiveAvailabilityMsg'),set=$('smvLiveSetAvailability');
 let modeSaveTimer=null;
 const modeNote=(call,chat,status)=>{
  let note=call&&chat
   ? 'Live Call and Live Chat are enabled. Status automatically changes to Online to receive Calls and Chats.'
   : call
    ? 'Live Call is enabled; Live Chat is disabled. Status automatically changes to Online to receive Calls.'
    : chat
     ? 'Live Chat is enabled; Live Call is disabled. Status automatically changes to Online to receive Chats.'
     : 'Live Call and Live Chat are both disabled. Status automatically changes to Offline.';
  if(status==='busy')note+=' A Live session is active, so the current status remains Busy.';
  return note;
 };
 const syncModes=()=>{
  const call=callToggle?.checked===true,chat=chatToggle?.checked===true;
  if(availabilitySelect&&availabilitySelect.value!=='busy')availabilitySelect.value=(call||chat)?'online':'offline';
  if(availabilityMessage)availabilityMessage.textContent=modeNote(call,chat,availabilitySelect?.value||'offline');
 };
 const saveModes=async()=>{
  if(!set||set.disabled)return;
  set.disabled=true;
  if(callToggle)callToggle.disabled=true;
  if(chatToggle)chatToggle.disabled=true;
  try{
   const r=await renderApi('/astrologer/availability',{method:'POST',body:JSON.stringify({
    availabilityStatus:availabilitySelect?.value||'offline',
    liveCallEnabled:callToggle?.checked===true,
    liveChatEnabled:chatToggle?.checked===true
   })});
   if(availabilitySelect)availabilitySelect.value=r.availabilityStatus||'offline';
   if(callToggle)callToggle.checked=r.liveCallEnabled===true;
   if(chatToggle)chatToggle.checked=r.liveChatEnabled===true;
   if(availabilityMessage)availabilityMessage.textContent='Saved. '+modeNote(r.liveCallEnabled===true,r.liveChatEnabled===true,r.availabilityStatus||'offline');
   await reload();
  }catch(e){if(availabilityMessage)availabilityMessage.textContent=e.message||String(e);}
  finally{
   set.disabled=false;
   if(callToggle)callToggle.disabled=false;
   if(chatToggle)chatToggle.disabled=false;
  }
 };
 for(const toggle of [callToggle,chatToggle])if(toggle&&!toggle.dataset.bound){
  toggle.dataset.bound='1';
  toggle.addEventListener('change',()=>{
   syncModes();
   if(modeSaveTimer)clearTimeout(modeSaveTimer);
   modeSaveTimer=setTimeout(()=>{modeSaveTimer=null;saveModes();},250);
  });
 }
 if(set&&!set.dataset.bound){set.dataset.bound='1';set.onclick=saveModes;}
 syncModes();
 const ring=$('smvLiveRingToggle');if(ring&&!ring.dataset.bound){ring.dataset.bound='1';ring.onclick=smvLiveToggleRingtone;}
 smvLiveRingButtonSync();
 smvLiveBindPushControls();
 await reload();
 syncModes();
}
async function smvLiveHandlePushOpen(payload = {}){
 const sessionId=String(payload.sessionId||'');
 const bookingId=String(payload.bookingId||'');
 if(!currentUser)return;
 let role=String(window.__smvCurrentRole||'').toLowerCase();
 if(role!=='astrologer'){
  const account=await renderApi('/account/role',{method:'GET',timeoutMs:12000});
  role=String(account.role||'').toLowerCase();
  if(role!=='astrologer')return;
  window.__smvCurrentRole='astrologer';
 }
 if(!$('smvLiveDashboardCard')&&typeof loadDashboard==='function')await loadDashboard('astrologer',true);
 if(!$('smvLiveDashboardCard'))throw new Error('Open the Astrologer Dashboard after logging in to respond to this request.');
 await smvLiveLoadDashboard('astrologer');
 if(sessionId){
  const list=await renderApi('/live/sessions',{method:'GET',timeoutMs:12000});
  const session=(list.sessions||[]).find(item=>String(item.id||'')===sessionId);
  if(session&&session.state!=='ended'){
   smvLiveOpenSession(session,null,session.state==='ringing');
   return;
  }
  smvLiveShowDashboardMessage('This Live request is no longer pending. Refresh your Live Sessions.');
  return;
 }
 if(bookingId){
  const target=document.querySelector('[data-live-booking-accept="'+CSS.escape(bookingId)+'"]')||
    document.querySelector('[data-scheduled-respond][data-appointment-id="'+CSS.escape(bookingId)+'"]');
  target?.closest('article')?.scrollIntoView?.({behavior:'smooth',block:'center'});
  smvLiveShowDashboardMessage('Booking alert opened. Review Pending Live Bookings or Scheduled Call / Chat Bookings.');
  return;
 }
 if(String(payload.type||'')==='push_test')smvLiveShowDashboardMessage('SMV ASTRO Test Alert was opened successfully.');
}
function smvLiveBindPushOpenListener(){
 if(!('serviceWorker' in navigator)||window.__smvLivePushOpenMessageBound)return;
 window.__smvLivePushOpenMessageBound=true;
 navigator.serviceWorker.addEventListener('message',event=>{
  const message=event.data||{};
  if(message.type!=='SMV_LIVE_PUSH_OPEN')return;
  const payload=message.payload||{};
  if(!currentUser){smvLivePendingPushOpen=payload;return;}
  smvLiveHandlePushOpen(payload).catch(error=>smvLiveShowDashboardMessage(error?.message||String(error)));
 });
}
function smvLiveBindDashboard(role){
 if(!['customer','astrologer'].includes(role))return;const box=$('dashboardContent');if(!box||$('smvLiveDashboardCard'))return;
 const host=role==='astrologer'?(box.querySelector('#smvLiveDashboardMount')||box):box;
 host.insertAdjacentHTML('beforeend',smvLiveDashboardHtml(role));smvLiveLoadDashboard(role).catch(smvLiveShowError);smvLiveStartEventStream();
 if(role==='astrologer'){
  const params=new URLSearchParams(window.location.search);
  if(params.get('smvLivePush')==='1'){
   const payload={type:'push_open',sessionId:params.get('smvSessionId')||'',bookingId:params.get('smvBookingId')||''};
   params.delete('smvLivePush');params.delete('smvSessionId');params.delete('smvBookingId');
   const cleanUrl=window.location.pathname+(params.toString()?'?'+params.toString():'')+window.location.hash;
   window.history.replaceState(window.history.state,'',cleanUrl);
   setTimeout(()=>smvLiveHandlePushOpen(payload).catch(error=>smvLiveShowDashboardMessage(error?.message||String(error))),350);
  }
 }
}
function smvLiveBindAdminPricing(){
 const save=$('saveLiveSessionPricing'),refresh=$('refreshLiveSessionPricing'),msg=$('liveSessionPricingMsg');
 async function load(force=false){
  if(!force&&smvLivePricingLoadedAt&&Date.now()-smvLivePricingLoadedAt<30000)return;
  if(msg)msg.textContent='Loading session settings…';
  try{
   const r=await renderApi('/live/pricing',{method:'GET'});
   if($('liveMaxConcurrentSessions'))$('liveMaxConcurrentSessions').value=String(r.maxConcurrentSessions||1);
   if(msg)msg.textContent='Per-minute Call and Chat prices are configured separately for each approved Astrologer in Astrologer Profile Management.';
   smvLivePricingLoadedAt=Date.now();
  }catch(e){if(msg)msg.textContent='Session settings load failed: '+(e.message||String(e));}
 }
 if(save&&!save.dataset.bound){
  save.dataset.bound='1';
  save.onclick=async()=>{
   save.disabled=true;
   if(msg)msg.textContent='Saving session settings…';
   try{
    const r=await renderApi('/admin/live/pricing',{method:'POST',body:JSON.stringify({maxConcurrentSessions:Number($('liveMaxConcurrentSessions')?.value||1)})});
    if(msg)msg.textContent='Saved. Maximum concurrent sessions per Astrologer: '+r.maxConcurrentSessions+'. Individual per-minute rates remain unchanged.';
   }catch(e){if(msg)msg.textContent='Save failed: '+(e.message||String(e));}
   finally{save.disabled=false;}
  };
 }
 if(refresh&&!refresh.dataset.bound){refresh.dataset.bound='1';refresh.onclick=()=>load(true);}
 if(!smvLivePricingLoadedAt)load();
}
smvLiveBindPushOpenListener();
window.addEventListener('smv:logged-out',()=>{smvLiveStopEventStream();smvLiveStopRingtone();smvLiveStopPreparationCountdown();smvLiveRingSuppressedIds.clear();smvLiveCloseMedia();smvLiveClearTransport();if(smvLiveDashboardStatusTimer){clearInterval(smvLiveDashboardStatusTimer);smvLiveDashboardStatusTimer=null;}smvLiveDashboardSessionsById.clear();smvLiveCurrentSession=null;smvLivePanelSessionId='';});
window.addEventListener('smv:auth-user',()=>{
 setTimeout(smvLiveStartEventStream,200);
 if(smvLivePendingPushOpen){
  const payload=smvLivePendingPushOpen;smvLivePendingPushOpen=null;
  setTimeout(()=>smvLiveHandlePushOpen(payload).catch(error=>smvLiveShowDashboardMessage(error?.message||String(error))),400);
 }
});

window.__SMV_APP_READY=true;
window.dispatchEvent(new Event('smv:app-ready'));
window.__smvSyncWorkspace?.();

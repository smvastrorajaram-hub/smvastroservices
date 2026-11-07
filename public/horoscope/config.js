// SMV HOROSCOPE backend configuration.
// Access settings are online-only; astrology calculations remain browser-local.
window.SMV_BACKEND_URL = '';

(()=>{
'use strict';

const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const FEATURES=new Set(['advanced_analysis','marriage_matching']);
const LEGACY_KEYS=[
  'smv-horoscope-feature-config',
  'smv-horoscope-feature-policy-v244',
  'smv-horoscope-policy-v245'
];

let legacyRenderLock=null;
const modeCache=new Map();

for(const key of LEGACY_KEYS){
  try{localStorage.removeItem(key)}catch(_){}
}

const ta=()=>document.documentElement.lang==='ta'||document.body?.classList?.contains('tamil-mode');
const T=(en,tt)=>ta()?tt:en;
const backend=()=>String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).trim().replace(/\/+$/,'');

/*
  Older horoscope-auth.mjs may still request /horoscope-feature-config with
  Cache-Control/Pragma request headers. Strip those headers only for this one
  public GET so Chrome/Opera do not create a failing CORS preflight.
*/
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{
  try{
    const raw=typeof input==='string'?input:String(input?.url||'');
    const url=new URL(raw,location.href);
    if(url.pathname.endsWith('/horoscope-feature-config')){
      const headers=new Headers(
        init?.headers ||
        ((typeof input==='object'&&input?.headers)?input.headers:undefined)
      );
      headers.delete('Cache-Control');
      headers.delete('Pragma');
      return nativeFetch(input,{...init,cache:'no-store',headers});
    }
  }catch(_){}
  return nativeFetch(input,init);
};

function normalizeFeature(v){
  const price=Number(v?.price??0);
  return {
    enabled:v?.enabled===true,
    price:Number.isFinite(price)&&price>=0?price:0
  };
}

async function getOnlineConfig(){
  for(const key of LEGACY_KEYS){
    try{localStorage.removeItem(key)}catch(_){}
  }

  let response=null,lastError=null;
  for(let attempt=0;attempt<5;attempt++){
    try{
      response=await nativeFetch(
        backend()+'/horoscope-feature-config?_='+Date.now(),
        {
          cache:'no-store',
          headers:{'Accept':'application/json'}
        }
      );
      if(response.ok||![502,503,504].includes(response.status)||attempt===4)break;
    }catch(error){
      lastError=error;
      if(attempt===4)throw error;
    }
    // The existing Render Free instance may need time to wake after idling.
    // Honour Retry-After when supplied; otherwise use bounded exponential
    // backoff (1, 2, 4, 8 seconds). Admin settings remain no-store.
    const retryAfter=Number(response?.headers?.get?.('Retry-After')||0);
    const delay=retryAfter>0?Math.min(8000,retryAfter*1000):Math.min(8000,1000*Math.pow(2,attempt));
    await new Promise(resolve=>setTimeout(resolve,delay));
  }
  if(!response)throw lastError||Error('Horoscope settings endpoint did not respond.');
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json?.error||('HTTP '+response.status));

  return {
    advanced_analysis:normalizeFeature(json?.advanced_analysis),
    marriage_matching:normalizeFeature(json?.marriage_matching)
  };
}

async function restoreLogin(){
  try{await window.__smvEnsureHoroscopeAuthReady?.()}catch(_){}
  try{return !!window.__smvHoroscopeLoggedIn?.()}catch{return false}
}

async function paidEntitled(feature){
  try{return !!(await window.__smvHasPaidFeatureAccess?.(feature))}catch{return false}
}

async function stateFor(feature){
  const loggedIn=await restoreLogin();

  if(!FEATURES.has(feature)){
    const state={
      feature,mode:'online_unavailable',
      enabled:true,price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false,
      exportAllowed:false
    };
    modeCache.set(feature,state.mode);
    return state;
  }

  let config;
  try{
    config=await getOnlineConfig();
  }catch(error){
    console.warn('Current Admin Horoscope setting could not be read online.',error);
    const state={
      feature,mode:'online_unavailable',
      enabled:true,price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false,
      exportAllowed:false
    };
    modeCache.set(feature,state.mode);
    return state;
  }

  const raw=config[feature];
  const actualPrice=Number(raw?.price||0);
  const adminEnabled=raw?.enabled===true;
  const paidMode=adminEnabled&&actualPrice>=1;

  /*
    The Admin switch and stored Rupee amount are independent policy inputs.

    ADMIN OFF + Rs.0:
      Full Horoscope / Advanced Analysis and Full Marriage Matching are free
      before and after Login. No Basic-only downgrade or payment gate.

    ADMIN OFF + Rs.1+:
      Before Login: public Basic Horoscope / Basic Nakshatra Matching.
      After Customer Login: free Full Horoscope and Full Matching, including
      the existing Save / browser-native PDF path.

    ADMIN ON + Rs.1+:
      Basic remains free; Full Horoscope and Full Matching use Razorpay.

    Keep the actual Admin price in actualPrice. Synthetic price is retained
    only for legacy callers; state.fullAllowed is the authoritative decision.
  */
  if(!adminEnabled){
    let state;
    if(actualPrice<1){
      state={
        feature,mode:loggedIn?'off_free_full_no_export':'off_free_full',enabled:true,
        price:0,actualPrice,loggedIn,
        entitled:true,fullAllowed:true,exportAllowed:false
      };
    }else if(loggedIn){
      state={
        feature,mode:'off_full_export',enabled:true,
        price:0,actualPrice,loggedIn:true,
        entitled:true,fullAllowed:true,exportAllowed:true
      };
    }else{
      state={
        feature,mode:'off_public_basic',enabled:true,
        price:1,actualPrice,loggedIn:false,
        entitled:false,fullAllowed:false,exportAllowed:false
      };
    }
    modeCache.set(feature,state.mode);
    return state;
  }

  // ADMIN ON + Rs.0: preserve the existing V259 behavior unchanged.
  if(!paidMode){
    const state=loggedIn
      ? {
          feature,mode:'off_full_no_export',
          enabled:true,price:0,actualPrice:0,
          loggedIn:true,entitled:true,fullAllowed:true,
          exportAllowed:false
        }
      : {
          feature,mode:'off_public_basic',
          enabled:true,price:1,actualPrice:0,
          loggedIn:false,entitled:false,fullAllowed:false,
          exportAllowed:false
        };
    modeCache.set(feature,state.mode);
    return state;
  }

  /*
    ADMIN ON + Rs.1+:
    Login before/after still begins with Basic/Nakshatra + paid benefits lock.
    Only verified payment unlocks Full and permits Save/Print.
  */
  const entitled=loggedIn ? await paidEntitled(feature) : false;
  const state={
    feature,mode:'paid',
    enabled:true,price:actualPrice,actualPrice,
    loggedIn,entitled,fullAllowed:entitled,
    exportAllowed:entitled
  };

  modeCache.set(feature,state.mode);
  return state;
}

function clearGate(root){
  if(!root)return;
  root.replaceChildren();
  root.classList.add('hidden');
  delete root.dataset.smvPaidPrice;
  delete root.dataset.smvPaidFeature;
}

function renderOnlineUnavailable(root){
  if(!root)return;
  root.classList.remove('hidden');
  root.innerHTML=`<section class="smv-horoscope-pay-gate">
    <h3>${T('Online access check required','Online access சரிபார்ப்பு தேவை')}</h3>
    <p>${T(
      'Connect to the internet to read the current Admin setting. Basic calculation remains available.',
      'தற்போதைய Admin setting-ஐ பெற இணையத்துடன் இணைக்கவும். Basic calculation தொடர்ந்து கிடைக்கும்.'
    )}</p>
  </section>`;
}

function syncPaidButton(root,price){
  if(!root)return;
  const button=root.querySelector('[data-smv-unlock]');
  if(!button)return;

  const loggedIn=!!window.__smvHoroscopeLoggedIn?.();
  const amount=Number(price||0).toFixed(2);
  if(loggedIn){
    button.textContent=root.dataset.smvPaidFeature==='marriage_matching'
      ? `${T('Full Marriage Matching ₹','முழு திருமணப் பொருத்தம் ₹')}${amount}`
      : `${T('Unlock Full Report — ₹','முழு அறிக்கை திறக்க — ₹')}${amount}`;
  }else{
    button.textContent=root.dataset.smvPaidFeature==='marriage_matching'
      ? `${T('Full Marriage Matching ₹','முழு திருமணப் பொருத்தம் ₹')}${amount} — ${T('Login to Pay','Login செய்து கட்டணம் செலுத்தவும்')}`
      : `${T('Full Horoscope ₹','முழு ஜாதகம் ₹')}${amount} — ${T('Login to Pay','Login செய்து கட்டணம் செலுத்தவும்')}`;
  }
}

function syncAllPaidButtons(){
  document.querySelectorAll('[data-smv-paid-price]').forEach(root=>{
    syncPaidButton(root,Number(root.dataset.smvPaidPrice||0));
  });
}

async function renderPolicyLock(feature,root,_legacyFeature,onUnlock,beforePay,stateOverride=null){
  const state=stateOverride||await stateFor(feature);

  if(state.mode==='online_unavailable'){
    renderOnlineUnavailable(root);
    return;
  }

  // Admin OFF with Rs.1+ and before Login keeps the free Basic route.
  if(state.mode==='off_public_basic'){
    clearGate(root);
    return;
  }

  // Public or authenticated free Full modes never enter the payment renderer.
  if(state.mode==='off_free_full'||state.mode==='off_free_full_no_export'||state.mode==='off_full_no_export'||state.mode==='off_full_export'||state.fullAllowed){
    clearGate(root);
    return;
  }

  if(typeof legacyRenderLock!=='function'){
    renderOnlineUnavailable(root);
    return;
  }

  // Admin ON + Rs.1+: reuse the existing benefits/index + Razorpay flow.
  root.dataset.smvPaidFeature=feature;
  legacyRenderLock(
    feature,
    root,
    {enabled:true,price:state.actualPrice},
    onUnlock,
    beforePay
  );

  root.dataset.smvPaidPrice=String(state.actualPrice);
  syncPaidButton(root,state.actualPrice);
}

async function requireAccess(feature,gateRoot,onUnlock){
  const state=await stateFor(feature);
  const paidFullReportLaunch=window.__smvPaidFullReportLaunch===true;
  window.__smvPaidFullReportLaunch=false;

  if(state.mode==='online_unavailable'){
    renderOnlineUnavailable(gateRoot);
    return false;
  }

  if(state.mode==='off_public_basic'){
    clearGate(gateRoot);
    return false;
  }

  // Admin ON + a positive configured price + Customer Login keeps the
  // Generate button Basic-only even after a previous payment. Only a
  // payment-button launch may open the complete Advanced Analysis report.
  if(feature==='advanced_analysis'&&state.mode==='paid'&&state.loggedIn===true&&
     Number(state.actualPrice||0)>=1&&!paidFullReportLaunch){
    clearGate(gateRoot);
    return false;
  }

  if(state.mode==='off_full_no_export'){
    clearGate(gateRoot);
    return true;
  }

  if(state.fullAllowed){
    clearGate(gateRoot);
    return true;
  }

  await renderPolicyLock(
    feature,
    gateRoot,
    {enabled:true,price:state.actualPrice},
    onUnlock
  );
  return false;
}

async function configForLegacy(){
  return getOnlineConfig();
}

function protect(name,value,onSet){
  try{
    Object.defineProperty(window,name,{
      configurable:true,
      enumerable:true,
      get(){return value},
      set(v){onSet?.(v)}
    });
  }catch(_){
    window[name]=value;
  }
}

// Single access-policy entry points.
// horoscope-auth.mjs remains responsible only for auth/payment implementation.
protect('__smvGetHoroscopeFeatureConfig',configForLegacy);
protect('__smvFeatureState',stateFor);
protect('__smvRequireHoroscopeFeatureAccess',requireAccess);
protect('__smvRenderFeatureLock',renderPolicyLock,v=>{
  if(typeof v==='function')legacyRenderLock=v;
});

/*
  Preserve the previously locked Admin-ON + Rs.0 no-export behavior.
  Admin OFF + Rs.0 is public Full mode and must never be marked basicOnly.
  Admin OFF + Rs.1+ after Login remains a full, no-payment report.
*/
window.addEventListener('smv:report-ready',event=>{
  const feature=event?.detail?.feature;
  if(!FEATURES.has(feature))return;

  const mode=modeCache.get(feature);
  if(mode==='off_full_no_export'){
    // Preserve the existing Admin ON + ₹0 handling exactly.
    event.detail.basicOnly=true;
    event.detail.noSavePrint=true;
  }else if(mode==='off_free_full_no_export'){
    // Admin OFF + ₹0 keeps the complete result, but never mounts Save/Print.
    event.detail.noSavePrint=true;
  }

  if(event.detail?.noSavePrint){
    queueMicrotask(()=>{
      const root=event?.detail?.root;
      root?.querySelectorAll?.('.smv-manual-save-actions').forEach(el=>el.remove());
    });
  }
},true);

function clearCurrentResults(){
  for(const id of [
    'englishHoroscopeResult',
    'tamilHoroscopeResult',
    'englishAdvancedAstrology',
    'mmResult'
  ]){
    const el=document.getElementById(id);
    if(!el)continue;
    el.replaceChildren();
    el.classList.add('hidden');
    el.removeAttribute('aria-busy');
  }
}

function clearAfterAuthRemount(){
  queueMicrotask(clearCurrentResults);
  setTimeout(clearCurrentResults,0);
}

function setPaidModeGenerateLabels(active){
  window.__smvAdminPaidQuickMode=!!active;
  const isTamil=ta();
  const englishButton=document.getElementById('generateEnglishHoroscope');
  const tamilButton=document.getElementById('generateTamilHoroscope');
  if(englishButton)englishButton.textContent=active
    ? T('Calculate Basic Horoscope','அடிப்படை ஜாதகம் கணிக்க')
    : T('Create Horoscope','ஜாதகம் உருவாக்குக');
  if(tamilButton)tamilButton.textContent=active
    ? T('Calculate Basic Horoscope','அடிப்படை ஜாதகம் கணிக்க')
    : (isTamil?'தமிழில் ஜாதகம் உருவாக்குக':'Create Horoscope');
}

function horoscopePaymentCallbacks(item,paymentRoots){
  const beforePay=async()=>{
    if(typeof window.__smvPrepareHoroscopePaymentContext!=='function'){
      throw Error(T('Horoscope birth details are not ready. Reload the page and try again.','ஜாதகப் பிறந்த விவரங்கள் தயாராகவில்லை. பக்கத்தை மீண்டும் திறந்து முயற்சிக்கவும்.'));
    }
    await window.__smvPrepareHoroscopePaymentContext(item.language);
  };
  const onUnlock=()=>{
    for(const root of paymentRoots)clearGate(root);
    if(typeof window.__smvGenerateHoroscopeFromCurrentFields!=='function'){
      throw Error(T('Horoscope calculation is not ready. Reload the page and try again.','ஜாதகக் கணிப்பு தயாராகவில்லை. பக்கத்தை மீண்டும் திறந்து முயற்சிக்கவும்.'));
    }
    return window.__smvGenerateHoroscopeFromCurrentFields(item.language,{fullReport:true});
  };
  return {beforePay,onUnlock};
}

function renderHoroscopePaymentMirror(item,state,paymentRoots){
  const {beforePay,onUnlock}=horoscopePaymentCallbacks(item,paymentRoots);
  // The single post-login card uses the original ten-section renderer,
  // configured price, Razorpay window and verification.
  renderPolicyLock(
    'advanced_analysis',
    item.root,
    {enabled:true,price:state.actualPrice},
    onUnlock,
    beforePay,
    state
  );
}

function syncHoroscopePaidEntry(){
  const benefitsRoots=[
    {root:document.getElementById('smvHoroscopePaidEntryEnglish'),language:'en'},
    {root:document.getElementById('smvHoroscopePaidEntryTamil'),language:'ta'}
  ].filter(item=>item.root);
  const quickRoots=[
    {root:document.getElementById('smvHoroscopeQuickPaidEntryEnglish'),language:'en'},
    {root:document.getElementById('smvHoroscopeQuickPaidEntryTamil'),language:'ta'}
  ].filter(item=>item.root);
  return stateFor('advanced_analysis').then(state=>{
    const paidCustomerMode=state.mode==='paid'&&state.loggedIn===true&&Number(state.actualPrice||0)>=1;
    const showPaymentMirror=paidCustomerMode&&state.entitled!==true;
    const allPaymentRoots=[...benefitsRoots,...quickRoots].map(item=>item.root);
    setPaidModeGenerateLabels(paidCustomerMode);

    // The new mirror is visible only for Admin ON + Rs.1 or above,
    // after Customer Login and until this report has been paid.
    for(const item of quickRoots){
      if(!showPaymentMirror){clearGate(item.root);continue;}
      renderHoroscopePaymentMirror(item,state,allPaymentRoots);
    }

    // The lower Benefits preview remains for visitors before Login.
    // After Login, keep the one payment card directly below Calculate Basic;
    // clearing this second host prevents the Full Report INDEX/CTA appearing twice.
    for(const item of benefitsRoots){
      if(state.mode!=='paid'||Number(state.actualPrice||0)<1||state.entitled||state.loggedIn===true){
        clearGate(item.root);
        continue;
      }
      // Preserve the original pre-login Login-to-Pay behavior unchanged.
      renderPolicyLock(
        'advanced_analysis',
        item.root,
        {enabled:true,price:state.actualPrice},
        undefined,
        undefined,
        state
      );
    }
  });
}

window.__smvOnlineAccessPolicy={
  state:stateFor,
  refresh:getOnlineConfig,
  currentMode:feature=>modeCache.get(feature)||''
};

window.addEventListener('smv:horoscope-local-auth',event=>{
  if(event?.detail?.loggedIn){
    /*
      Matching remounts on this same event. Its applyFeatureMode() will now see:
      OFF + Rs.1 logged in => synthetic price 0 => Full Matching button.
      OFF + Rs.0 => synthetic price 1 => Nakshatra-only button.
      ON + paid => existing payment state.
    */
    queueMicrotask(syncAllPaidButtons);
    setTimeout(syncAllPaidButtons,0);
    syncHoroscopePaidEntry().catch(()=>{});
    return;
  }

  // Logout closes any Full/current calculation and returns to public/basic mode.
  modeCache.clear();
  clearAfterAuthRemount();
  syncHoroscopePaidEntry().catch(()=>{});
});

window.addEventListener('smv-language',()=>{
  if(!window.__smvHoroscopeLoggedIn?.())clearAfterAuthRemount();
  else queueMicrotask(syncAllPaidButtons);
  syncHoroscopePaidEntry().catch(()=>{});
});
document.addEventListener('DOMContentLoaded',()=>syncHoroscopePaidEntry().catch(()=>{}),{once:true});
document.addEventListener('click',event=>{
  if(!event.target?.closest?.('#generateEnglishHoroscope,#generateTamilHoroscope'))return;
  for(const id of ['smvHoroscopePaidEntryEnglish','smvHoroscopePaidEntryTamil']){
    const root=document.getElementById(id);
    if(root)root.classList.add('hidden');
  }
},true);
})();
/*
  PUBLIC NAKSHATRA PORUTHAM FAST PATH

  marriage-matching.js calls getChart(prefix, true) for public Nakshatra
  Porutham, but the current getChart() does not pass that basicOnly flag into
  SMVOffline.full(). The offline engine itself already supports
  body.basicOnly === true and then skips Tajaka, Advanced, Panchang, Transit
  and Dasa.

  This narrow wrapper applies basicOnly:true ONLY while:
    - Marriage Matching calculation is actively running, and
    - the button is in publicPoruthamOnly mode.

  Full Matching, paid Full Matching and Horoscope calculations are untouched.
*/
(()=>{
'use strict';

function installPublicNakshatraBasicPath(){
  const offline=window.SMVOffline;
  if(!offline||typeof offline.full!=='function')return false;
  if(offline.full.__smvPublicNakshatraBasicFix===true)return true;

  const original=offline.full.bind(offline);

  const wrapped=async body=>{
    const button=document.getElementById('mmCheck');
    const publicOnly=button?.dataset?.publicPoruthamOnly==='1';
    const matchingBusy=window.__smvMatchingCalculationBusy===true;

    if(publicOnly&&matchingBusy){
      return original({...body,basicOnly:true});
    }

    return original(body);
  };

  Object.defineProperty(wrapped,'__smvPublicNakshatraBasicFix',{
    value:true,
    configurable:false
  });

  offline.full=wrapped;
  return true;
}

Promise.resolve(window.SMVEngineReady)
  .then(()=>installPublicNakshatraBasicPath())
  .catch(()=>{});

window.addEventListener('smv:engine-mode',()=>{
  installPublicNakshatraBasicPath();
});
})();

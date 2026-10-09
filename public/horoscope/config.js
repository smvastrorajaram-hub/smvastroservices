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

  const response=await nativeFetch(
    backend()+'/horoscope-feature-config?_='+Date.now(),
    {
      cache:'no-store',
      headers:{'Accept':'application/json'}
    }
  );

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
    V260: The admin ON/OFF switch and configured Rupee amount are two
    INDEPENDENT inputs. In particular, ADMIN OFF + Rs.1 is NOT paid mode.

    ADMIN OFF + Rs.0:
      Basic Horoscope only, Nakshatra Porutham only, before/after login.
      No full-report Save/Print/PDF or payment panel.

    ADMIN OFF + Rs.1+:
      Before login: Basic Horoscope / public Nakshatra Porutham only.
      After customer login: Full Horoscope and Full Marriage Matching with
      Save + browser-native PDF/Print (no Razorpay payment).

    NOTE: marriage-matching.js uses synthetic price<=0 as the full matching
    mode signal. Set synthetic price=1 for basic and 0 for free full.
    Actual Admin price is separately preserved in actualPrice.
  */
  if(!adminEnabled){
    let state;
    if(actualPrice>=1&&loggedIn){
      state={
        feature,mode:'off_full_export',enabled:true,
        price:0,actualPrice,loggedIn:true,
        entitled:true,fullAllowed:true,exportAllowed:true
      };
    }else{
      state={
        feature,mode:actualPrice>=1?'off_public_basic':'off_zero_basic',
        enabled:true,price:1,actualPrice,loggedIn,
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
  button.textContent=loggedIn
    ? `${T('Unlock Full Report — ₹','முழு அறிக்கை திறக்க — ₹')}${Number(price||0).toFixed(2)}`
    : T('Login to Continue','தொடர Login செய்யவும்');
}

function syncAllPaidButtons(){
  document.querySelectorAll('[data-smv-paid-price]').forEach(root=>{
    syncPaidButton(root,Number(root.dataset.smvPaidPrice||0));
  });
}

async function renderPolicyLock(feature,root,_legacyFeature,onUnlock,beforePay){
  const state=await stateFor(feature);

  if(state.mode==='online_unavailable'){
    renderOnlineUnavailable(root);
    return;
  }

  // Admin OFF before login:
  // keep the public/basic calculation controls, but show NO payment panel.
  if(state.mode==='off_public_basic'||state.mode==='off_zero_basic'){
    clearGate(root);
    return;
  }

  // Admin OFF after login:
  // Full calculation is already allowed; no payment panel.
  if(state.mode==='off_full_no_export'||state.mode==='off_full_export'){
    clearGate(root);
    return;
  }

  if(typeof legacyRenderLock!=='function'){
    renderOnlineUnavailable(root);
    return;
  }

  // Admin ON + Rs.1+: reuse the existing benefits/index + Razorpay flow.
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

  if(state.mode==='online_unavailable'){
    renderOnlineUnavailable(gateRoot);
    return false;
  }

  if(state.mode==='off_public_basic'||state.mode==='off_zero_basic'){
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

  The V260 Admin-OFF + Rs.1 Full case must NEVER be marked as basicOnly:
  report-store.mjs adds Save + Print/PDF actions to the completed full report.
  This listener only marks the pre-existing V259 no-export mode as basicOnly.
*/
window.addEventListener('smv:report-ready',event=>{
  const feature=event?.detail?.feature;
  if(!FEATURES.has(feature))return;

  if(modeCache.get(feature)==='off_full_no_export'){
    event.detail.basicOnly=true;
    event.detail.noSavePrint=true;

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
    return;
  }

  // Logout closes any Full/current calculation and returns to public/basic mode.
  modeCache.clear();
  clearAfterAuthRemount();
});

window.addEventListener('smv-language',()=>{
  if(!window.__smvHoroscopeLoggedIn?.())clearAfterAuthRemount();
  else queueMicrotask(syncAllPaidButtons);
});
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

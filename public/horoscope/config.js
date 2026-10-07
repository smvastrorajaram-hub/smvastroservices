// SMV HOROSCOPE backend configuration.
// Admin/access decisions are online-only. No browser Admin-setting cache is used.
window.SMV_BACKEND_URL = '';

(()=>{
'use strict';

const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const FEATURES=new Set(['advanced_analysis','marriage_matching']);
const LEGACY_BROWSER_KEYS=[
  'smv-horoscope-feature-config',
  'smv-horoscope-feature-policy-v244',
  'smv-horoscope-policy-v245'
];

let legacyRenderLock=null;

for(const key of LEGACY_BROWSER_KEYS){
  try{localStorage.removeItem(key)}catch(_){}
}

const ta=()=>document.documentElement.lang==='ta'||document.body?.classList?.contains('tamil-mode');
const T=(en,tt)=>ta()?tt:en;
const backend=()=>String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).trim().replace(/\/+$/,'');

function normalizeFeature(v){
  const price=Number(v?.price??0);
  return {
    enabled:v?.enabled===true,
    price:Number.isFinite(price)&&price>=0?price:0
  };
}

async function getOnlineConfig(){
  // IMPORTANT:
  // cache:'no-store' + timestamp prevents browser HTTP reuse.
  // Do NOT send Cache-Control/Pragma request headers here: those headers trigger
  // a CORS preflight in Chrome/Opera and caused the old
  // "Online access check required" false failure.
  const response=await fetch(backend()+'/horoscope-feature-config?_='+Date.now(),{
    cache:'no-store',
    headers:{'Accept':'application/json'}
  });
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
    return {
      feature,mode:'online_unavailable',
      enabled:true,price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false
    };
  }

  let config;
  try{
    config=await getOnlineConfig();
  }catch(error){
    console.warn('Current Admin Horoscope setting could not be read online.',error);
    return {
      feature,mode:'online_unavailable',
      enabled:true,price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false
    };
  }

  const raw=config[feature];
  const actualPrice=Number(raw?.price||0);
  const paidMode=raw?.enabled===true&&actualPrice>=1;

  // ADMIN OFF + Rs.0:
  // Basic calculation only. There is intentionally NO free-full unlock,
  // NO payment button and NO Print/Save attachment for the current result.
  if(!paidMode){
    // marriage-matching.js historically treats price<=0 as public FULL.
    // Return a synthetic gate price of 1 only to keep it on public/basic mode;
    // renderPolicyLock() below suppresses the payment gate completely.
    return {
      feature,mode:'basic',
      enabled:true,price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false
    };
  }

  // ADMIN ON + Rs.1+:
  // Basic remains visible until this exact report is paid.
  const entitled=loggedIn ? await paidEntitled(feature) : false;
  return {
    feature,mode:'paid',
    enabled:true,price:actualPrice,actualPrice,
    loggedIn,entitled,fullAllowed:entitled
  };
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

  if(state.mode==='basic'){
    // OFF + Rs.0: no payment/index panel at all.
    clearGate(root);
    return;
  }

  if(typeof legacyRenderLock!=='function'){
    renderOnlineUnavailable(root);
    return;
  }

  // Reuse the already-working paid benefits/index + Razorpay implementation.
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

  if(state.mode==='basic'){
    clearGate(gateRoot);
    return false;
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
  // Online-only. There is no localStorage/cache fallback.
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

// horoscope-auth.mjs still owns Login + Razorpay + entitlement verification.
// It cannot overwrite the current Admin access rule.
protect('__smvGetHoroscopeFeatureConfig',configForLegacy);
protect('__smvFeatureState',stateFor);
protect('__smvRequireHoroscopeFeatureAccess',requireAccess);
protect('__smvRenderFeatureLock',renderPolicyLock,v=>{
  if(typeof v==='function')legacyRenderLock=v;
});

function clearCurrentCalculationResults(){
  for(const id of [
    'englishHoroscopeResult',
    'tamilHoroscopeResult',
    'englishAdvancedAstrology',
    'mmResult'
  ]){
    const element=document.getElementById(id);
    if(!element)continue;
    element.replaceChildren();
    element.classList.add('hidden');
    element.removeAttribute('aria-busy');
  }

  // Remove only current-result action bars. Saved Reports remain account-owned
  // and are handled by report-store.mjs.
  document.querySelectorAll(
    '#englishHoroscopeResult .smv-manual-save-actions,'+
    '#tamilHoroscopeResult .smv-manual-save-actions,'+
    '#mmResult .smv-manual-save-actions'
  ).forEach(e=>e.remove());
}

function clearAfterOtherAuthHandlers(){
  // marriage-matching.js remounts on the same auth event. Run after that
  // synchronous remount so an old matching snapshot cannot remain visible.
  queueMicrotask(clearCurrentCalculationResults);
  setTimeout(clearCurrentCalculationResults,0);
}

window.__smvOnlineAccessPolicy={
  state:stateFor,
  refresh:getOnlineConfig
};

window.addEventListener('smv:horoscope-local-auth',event=>{
  if(event?.detail?.loggedIn){
    queueMicrotask(syncAllPaidButtons);
    setTimeout(syncAllPaidButtons,0);
    return;
  }

  // LOGOUT:
  // current Horoscope/Matching calculation is closed completely.
  clearAfterOtherAuthHandlers();
});

window.addEventListener('smv-language',()=>{
  // A logged-out language remount must not restore an old Matching snapshot.
  if(!window.__smvHoroscopeLoggedIn?.())clearAfterOtherAuthHandlers();
  else queueMicrotask(syncAllPaidButtons);
});
})();

// SMV HOROSCOPE backend configuration.
// Admin/access decisions are online-only. No browser Admin-setting cache is authoritative.
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

for(const key of LEGACY_KEYS){
  try{localStorage.removeItem(key)}catch(_){}
}

const ta=()=>document.documentElement.lang==='ta'||document.body?.classList?.contains('tamil-mode');
const T=(en,tt)=>ta()?tt:en;
const backend=()=>String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).trim().replace(/\/+$/,'');

/*
  Compatibility guard:
  horoscope-auth.mjs in older runtime code still creates a GET request with
  Cache-Control / Pragma request headers. Those headers force a CORS preflight.
  Strip them ONLY for /horoscope-feature-config so every old/new caller becomes
  the same simple online GET. This is not a cache fallback.
*/
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{
  try{
    const raw=typeof input==='string'?input:String(input?.url||'');
    const url=new URL(raw,location.href);
    if(url.pathname.endsWith('/horoscope-feature-config')){
      const headers=new Headers(init?.headers||((typeof input==='object'&&input?.headers)?input.headers:undefined));
      headers.delete('Cache-Control');
      headers.delete('Pragma');
      return nativeFetch(input,{
        ...init,
        cache:'no-store',
        headers
      });
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

  // ADMIN OFF + Rs.0 -> BASIC ONLY.
  // No payment, no full unlock, no Print/Save for the current result.
  if(!paidMode){
    return {
      feature,mode:'basic',
      enabled:true,
      // Synthetic value keeps legacy Marriage Matching on public/basic mode.
      price:1,actualPrice:0,
      loggedIn,entitled:false,fullAllowed:false
    };
  }

  // ADMIN ON + Rs.1+ -> PAID MODE.
  // Login does not unlock Full. Only verified payment for this report does.
  const entitled=loggedIn ? await paidEntitled(feature) : false;
  return {
    feature,mode:'paid',
    enabled:true,
    price:actualPrice,actualPrice,
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
    clearGate(root);
    return;
  }

  if(typeof legacyRenderLock!=='function'){
    renderOnlineUnavailable(root);
    return;
  }

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

// Single browser access policy.
// horoscope-auth.mjs continues to provide Auth/Razorpay implementation only.
protect('__smvGetHoroscopeFeatureConfig',configForLegacy);
protect('__smvFeatureState',stateFor);
protect('__smvRequireHoroscopeFeatureAccess',requireAccess);
protect('__smvRenderFeatureLock',renderPolicyLock,v=>{
  if(typeof v==='function')legacyRenderLock=v;
});

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
  refresh:getOnlineConfig
};

window.addEventListener('smv:horoscope-local-auth',event=>{
  if(event?.detail?.loggedIn){
    queueMicrotask(syncAllPaidButtons);
    setTimeout(syncAllPaidButtons,0);
    return;
  }

  // Logout must close all current calculations.
  clearAfterAuthRemount();
});

window.addEventListener('smv-language',()=>{
  if(!window.__smvHoroscopeLoggedIn?.())clearAfterAuthRemount();
  else queueMicrotask(syncAllPaidButtons);
});
})();

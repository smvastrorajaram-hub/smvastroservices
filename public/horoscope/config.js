// SMV HOROSCOPE backend configuration.
// Empty keeps the production default below. A separate deployment may set its API URL here.
window.SMV_BACKEND_URL = '';

/*
  ONLINE SOURCE OF TRUTH
  ----------------------
  Horoscope and Marriage Matching access decisions are NEVER restored from
  browser cache/localStorage. The current Admin setting is read online from
  /horoscope-feature-config every time an access decision is required.

  User-facing modes:
    PAID MODE:
      Admin ON + price >= Rs.1
      -> Basic result before/after login + full-benefits/payment lock.
      -> Payment button asks for Customer login when logged out.
      -> Verified payment unlocks Full + existing Save/Print.

    FREE AFTER LOGIN MODE:
      Admin OFF + Rs.0
      -> Before login: Basic only.
      -> After Customer login: Full result free.

  Any historical mixed combination is NOT allowed to recreate the old matrix:
    only ON + price >= Rs.1 = paid;
    all other combinations = free-after-login.
*/
(()=>{
'use strict';

const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const LEGACY_BROWSER_KEYS=[
  'smv-horoscope-feature-config',
  'smv-horoscope-feature-policy-v244',
  'smv-horoscope-policy-v245'
];
const FEATURES=new Set(['advanced_analysis','marriage_matching']);
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
function normalizeConfig(j){
  return {
    advanced_analysis:normalizeFeature(j?.advanced_analysis),
    marriage_matching:normalizeFeature(j?.marriage_matching)
  };
}
function modeOf(f){
  return f?.enabled===true && Number(f?.price)>=1 ? 'paid' : 'free_login';
}
async function getOnlineConfig(){
  // Deliberately no browser/localStorage fallback.
  // Every access check reflects the current backend Admin setting.
  for(const key of LEGACY_BROWSER_KEYS){
    try{localStorage.removeItem(key)}catch(_){}
  }
  const r=await fetch(backend()+'/horoscope-feature-config?_='+Date.now(),{
    cache:'no-store',
    headers:{
      'Accept':'application/json',
      'Cache-Control':'no-cache, no-store, must-revalidate',
      'Pragma':'no-cache'
    }
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j?.error||('HTTP '+r.status));
  return normalizeConfig(j);
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
    return {feature,mode:'online_unavailable',enabled:true,price:1,actualPrice:0,loggedIn,entitled:false,free:false,fullAllowed:false};
  }

  let cfg;
  try{
    cfg=await getOnlineConfig();
  }catch(e){
    console.warn('Current Admin Horoscope setting is unavailable online.',e);
    return {feature,mode:'online_unavailable',enabled:true,price:1,actualPrice:0,loggedIn,entitled:false,free:false,fullAllowed:false};
  }

  const raw=cfg[feature];
  const mode=modeOf(raw);

  if(mode==='paid'){
    const entitled=loggedIn ? await paidEntitled(feature) : false;
    return {
      feature,mode,enabled:true,
      price:Number(raw.price),actualPrice:Number(raw.price),
      loggedIn,entitled,free:false,fullAllowed:entitled
    };
  }

  // Synthetic display price prevents the old Marriage Matching code from
  // treating price=0 as public-full. actualPrice remains 0.
  return {
    feature,mode:'free_login',enabled:true,
    price:1,actualPrice:0,
    loggedIn,entitled:loggedIn,free:true,fullAllowed:loggedIn
  };
}
function clearGate(root){
  if(!root)return;
  root.replaceChildren();
  root.classList.add('hidden');
}
function openLogin(){
  const button=document.querySelector('#smvHoroscopeAuth [data-login]');
  if(button){button.click();return}
  document.getElementById('smvHoroscopeAuth')?.scrollIntoView?.({behavior:'auto',block:'center'});
}
function featureName(feature){
  return feature==='marriage_matching'
    ?T('Full Marriage Matching','முழு திருமணப் பொருத்தம்')
    :T('Full Horoscope','முழு ஜாதகம்');
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
function renderFreeLoginGate(feature,root,onUnlock,beforeUnlock){
  if(!root)return;
  root.classList.remove('hidden');
  root.innerHTML=`<section class="smv-horoscope-pay-gate">
    <h3>${featureName(feature)}</h3>
    <p>${T(
      'Basic calculation is available before login. Customer login unlocks the complete advanced result free.',
      'Login முன் Basic calculation கிடைக்கும். Customer Login செய்த பிறகு முழு Advanced result இலவசமாக கிடைக்கும்.'
    )}</p>
    <p><b>${T('Full report after login — FREE','Login பிறகு முழு அறிக்கை — இலவசம்')}</b></p>
    <button type="button" data-smv-online-free></button>
    <p data-smv-online-free-msg></p>
  </section>`;

  const button=root.querySelector('[data-smv-online-free]');
  const msg=root.querySelector('[data-smv-online-free-msg]');
  const sync=()=>{
    const logged=!!window.__smvHoroscopeLoggedIn?.();
    button.textContent=logged
      ?(feature==='marriage_matching'
        ?T('Generate Full Matching — FREE','முழு திருமணப் பொருத்தம் உருவாக்குக — இலவசம்')
        :T('Generate Full Horoscope — FREE','முழு ஜாதகம் உருவாக்குக — இலவசம்'))
      :T('Login for Full Report — FREE','முழு அறிக்கைக்கு Login — இலவசம்');
  };
  sync();

  button.onclick=async()=>{
    const logged=await restoreLogin();
    if(!logged){
      openLogin();
      if(msg)msg.textContent=T(
        'Login first, then generate the free full report.',
        'முதலில் Login செய்து பிறகு இலவச முழு அறிக்கையை உருவாக்கவும்.'
      );
      sync();
      return;
    }
    button.disabled=true;
    try{
      if(typeof beforeUnlock==='function')await beforeUnlock();
      clearGate(root);
      if(typeof onUnlock==='function')await onUnlock();
    }catch(e){
      if(msg)msg.textContent=e?.message||String(e);
      button.disabled=false;
    }
  };
}
async function renderPolicyLock(feature,root,_legacyFeature,onUnlock,beforePay){
  const s=await stateFor(feature);
  if(s.mode==='online_unavailable'){renderOnlineUnavailable(root);return}
  if(s.mode==='free_login'){renderFreeLoginGate(feature,root,onUnlock,beforePay);return}
  if(typeof legacyRenderLock==='function'){
    return legacyRenderLock(feature,root,{enabled:true,price:s.actualPrice},onUnlock,beforePay);
  }
  renderOnlineUnavailable(root);
}
async function requireAccess(feature,root,onUnlock){
  const s=await stateFor(feature);

  if(s.mode==='online_unavailable'){
    renderOnlineUnavailable(root);
    return false;
  }

  if(s.fullAllowed){
    clearGate(root);
    return true;
  }

  if(s.mode==='free_login'){
    renderFreeLoginGate(feature,root,onUnlock);
    return false;
  }

  await renderPolicyLock(feature,root,{enabled:true,price:s.actualPrice},onUnlock);
  return false;
}
async function configForLegacy(){
  try{return await getOnlineConfig()}
  catch{
    // Safe shape only. It is not an Admin-state cache.
    return {
      advanced_analysis:{enabled:true,price:1},
      marriage_matching:{enabled:true,price:1}
    };
  }
}
function protect(name,value,onSet){
  try{
    Object.defineProperty(window,name,{
      configurable:true,
      enumerable:true,
      get(){return value},
      set(v){onSet?.(v)}
    });
  }catch(_){window[name]=value}
}

// These are the only access-policy entry points.
// horoscope-auth.mjs may provide payment/auth helpers, but it cannot replace
// the online Admin decision logic.
protect('__smvGetHoroscopeFeatureConfig',configForLegacy);
protect('__smvFeatureState',stateFor);
protect('__smvRequireHoroscopeFeatureAccess',requireAccess);
protect('__smvRenderFeatureLock',renderPolicyLock,v=>{if(typeof v==='function')legacyRenderLock=v});

async function syncFreeButtons(){
  const auth=document.getElementById('smvHoroscopeAuth');
  if(!auth)return;

  let box=document.getElementById('smvOnlineFreeFullActions');
  if(!box){
    box=document.createElement('div');
    box.id='smvOnlineFreeFullActions';
    box.className='action-row';
    box.hidden=true;
    auth.insertAdjacentElement('afterend',box);
  }

  const logged=await restoreLogin();
  let cfg;
  try{cfg=await getOnlineConfig()}catch{box.hidden=true;box.replaceChildren();return}

  if(!logged){box.hidden=true;box.replaceChildren();return}

  const freeH=modeOf(cfg.advanced_analysis)==='free_login';
  const freeM=modeOf(cfg.marriage_matching)==='free_login';

  box.replaceChildren();

  if(freeH){
    const b=document.createElement('button');
    b.type='button';b.className='btn';
    b.textContent=T('Generate Full Horoscope — FREE','முழு ஜாதகம் உருவாக்குக — இலவசம்');
    b.onclick=()=>{
      document.getElementById('english-horoscope')?.scrollIntoView?.({behavior:'auto',block:'start'});
      document.getElementById('generateEnglishHoroscope')?.click();
    };
    box.append(b);
  }

  if(freeM){
    const b=document.createElement('button');
    b.type='button';b.className='btn';
    b.textContent=T('Generate Full Matching — FREE','முழு திருமணப் பொருத்தம் உருவாக்குக — இலவசம்');
    b.onclick=()=>{
      document.getElementById('smvMarriageMatching')?.scrollIntoView?.({behavior:'auto',block:'start'});
      document.getElementById('mmCheck')?.click();
    };
    box.append(b);
  }

  box.hidden=!(freeH||freeM);
}

window.__smvOnlineAccessPolicy={
  state:stateFor,
  refresh:getOnlineConfig
};

window.addEventListener('smv:horoscope-local-auth',()=>syncFreeButtons().catch(()=>{}));
window.addEventListener('smv-language',()=>syncFreeButtons().catch(()=>{}));
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>syncFreeButtons().catch(()=>{}));
}else{
  queueMicrotask(()=>syncFreeButtons().catch(()=>{}));
}
})();

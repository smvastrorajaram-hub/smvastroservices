// SMV HOROSCOPE backend configuration.
// Empty keeps the production default below. A separate deployment may set its API URL here.
window.SMV_BACKEND_URL = '';

/*
 V244 - Single authoritative Horoscope / Marriage Matching access policy.

 Exactly one client rule now decides BOTH features:
   Admin OFF                    -> disabled
   Admin ON + Rs.0              -> full/free
   Admin ON + Rs.1+ + paid      -> full/unlocked
   Admin ON + Rs.1+ + not paid  -> index/payment lock

 The older horoscope-auth.mjs globals are intentionally captured but cannot overwrite
 these three policy entry points. This prevents a later UI/print deployment or a stale
 persisted config from changing the Admin matrix again.
*/
(()=>{
'use strict';

const VERSION='244';
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const LAST_GOOD_KEY='smv-horoscope-feature-policy-v244';
const OLD_STALE_KEY='smv-horoscope-feature-config';
const CLOSED=Object.freeze({
  advanced_analysis:Object.freeze({enabled:false,price:0}),
  marriage_matching:Object.freeze({enabled:false,price:0})
});

let cached=null;
let cachedAt=0;
let inFlight=null;

try{ localStorage.removeItem(OLD_STALE_KEY); }catch(_){}

function backend(){
  const custom=String(window.SMV_BACKEND_URL||'').trim();
  return (custom||DEFAULT_BACKEND).replace(/\/+$/,'');
}
function cleanFeature(raw,name){
  if(!raw || typeof raw!=='object')throw new Error(`Missing ${name} feature config.`);
  const price=Number(raw.price);
  if(typeof raw.enabled!=='boolean' || !Number.isFinite(price) || price<0){
    throw new Error(`Invalid ${name} feature config.`);
  }
  return {enabled:raw.enabled===true,price};
}
function normalize(payload){
  return {
    advanced_analysis:cleanFeature(payload?.advanced_analysis,'advanced_analysis'),
    marriage_matching:cleanFeature(payload?.marriage_matching,'marriage_matching')
  };
}
function validStored(v){
  try{return normalize(v)}catch{return null}
}
function readOfflineSnapshot(){
  try{
    const row=JSON.parse(localStorage.getItem(LAST_GOOD_KEY)||'null');
    return validStored(row?.config);
  }catch{return null}
}
function saveSnapshot(config){
  try{localStorage.setItem(LAST_GOOD_KEY,JSON.stringify({version:VERSION,savedAt:Date.now(),config}))}catch(_){}
}
async function fetchPolicy(force=false){
  if(!force && cached && Date.now()-cachedAt<1500)return cached;
  if(inFlight)return inFlight;
  inFlight=(async()=>{
    try{
      const r=await fetch(backend()+'/horoscope-feature-config?_='+Date.now(),{
        cache:'no-store',
        headers:{'Cache-Control':'no-cache, no-store','Pragma':'no-cache','Accept':'application/json'}
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j?.error||`Feature config HTTP ${r.status}`);
      const next=normalize(j);
      cached=next;
      cachedAt=Date.now();
      saveSnapshot(next);
      return next;
    }catch(e){
      // Never use an old persisted Admin setting while the device says it is online.
      // Offline only: use the last known GOOD V244 snapshot for offline parity.
      if(typeof navigator!=='undefined' && navigator.onLine===false){
        const offline=readOfflineSnapshot();
        if(offline){
          cached=offline;
          cachedAt=Date.now();
          return offline;
        }
      }
      console.warn('SMV feature policy unavailable; restricted mode used.',e);
      cached=CLOSED;
      cachedAt=Date.now();
      return CLOSED;
    }finally{
      inFlight=null;
    }
  })();
  return inFlight;
}
async function restoreCustomerSession(){
  try{
    if(typeof window.__smvEnsureHoroscopeAuthReady==='function'){
      await window.__smvEnsureHoroscopeAuthReady();
    }
  }catch(_){}
  try{return !!window.__smvHoroscopeLoggedIn?.()}catch{return false}
}
async function paidFor(feature){
  try{
    if(typeof window.__smvHasPaidFeatureAccess==='function'){
      return !!(await window.__smvHasPaidFeatureAccess(feature));
    }
  }catch(_){}
  return false;
}
function hideGate(root){
  if(!root)return;
  root.innerHTML='';
  root.classList.add('hidden');
}
async function waitForLockRenderer(){
  for(let i=0;i<40;i++){
    if(typeof window.__smvRenderFeatureLock==='function')return window.__smvRenderFeatureLock;
    await new Promise(r=>setTimeout(r,25));
  }
  return null;
}
async function stateFor(feature,force=false){
  if(feature!=='advanced_analysis' && feature!=='marriage_matching'){
    return {feature,mode:'disabled',enabled:false,price:0,free:false,loggedIn:false,entitled:false,fullAllowed:false,policyVersion:VERSION};
  }
  const all=await fetchPolicy(force);
  const f=all?.[feature]||CLOSED[feature];
  const price=Number(f.price||0);

  if(!f.enabled){
    return {feature,mode:'disabled',enabled:false,price,free:false,loggedIn:false,entitled:false,fullAllowed:false,policyVersion:VERSION};
  }

  // Restore an already-persisted Customer session before a free/full report is
  // dispatched, so report-store can attach Save + Print without the old race.
  const loggedIn=await restoreCustomerSession();

  if(price<=0){
    return {feature,mode:'free',enabled:true,price:0,free:true,loggedIn,entitled:true,fullAllowed:true,policyVersion:VERSION};
  }

  const entitled=loggedIn ? await paidFor(feature) : false;
  return {
    feature,
    mode:entitled?'paid_unlocked':'paid_locked',
    enabled:true,
    price,
    free:false,
    loggedIn,
    entitled,
    fullAllowed:entitled,
    policyVersion:VERSION
  };
}
async function requireAccess(feature,gateRoot,onUnlock){
  const s=await stateFor(feature,true);

  if(s.mode==='disabled'){
    hideGate(gateRoot);
    return false;
  }
  if(s.mode==='free' || s.mode==='paid_unlocked'){
    hideGate(gateRoot);
    return true;
  }

  const renderer=await waitForLockRenderer();
  if(renderer){
    renderer(feature,gateRoot,{enabled:true,price:s.price},onUnlock);
  }else if(gateRoot){
    gateRoot.classList.remove('hidden');
    gateRoot.textContent=document.documentElement.lang==='ta'
      ? 'முழு அறிக்கைக்கு Login / Payment தேவை.'
      : 'Login / Payment is required for the full report.';
  }
  return false;
}
async function configForConsumers(force=false){
  return fetchPolicy(force);
}

function protect(name,value){
  let legacy=null;
  try{
    Object.defineProperty(window,name,{
      configurable:true,
      enumerable:true,
      get(){return value},
      set(v){legacy=v}
    });
  }catch(_){
    window[name]=value;
  }
  return ()=>legacy;
}

// These are the ONLY authoritative access entry points.
// horoscope-auth.mjs may assign its historical functions later; the setters above
// capture those assignments without allowing them to replace this V244 policy.
protect('__smvGetHoroscopeFeatureConfig',configForConsumers);
protect('__smvFeatureState',stateFor);
protect('__smvRequireHoroscopeFeatureAccess',requireAccess);

window.__smvFeaturePolicyV244={
  version:VERSION,
  refresh:async()=>{cached=null;cachedAt=0;return fetchPolicy(true)},
  state:stateFor,
  getConfig:configForConsumers
};
})();

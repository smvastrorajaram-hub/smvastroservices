const BACKEND='https://smvastroservices.onrender.com';
let cachedToken='';
const paidState={};
Object.defineProperties(paidState,{
  user:{enumerable:true,get(){try{return window.__smvHoroscopeOwner?.()||null}catch{return null}}},
  token:{enumerable:true,get(){return cachedToken}}
});
window.__smvHoroscopePaidState=paidState;
async function currentFirebaseUser(){
  try{await window.__smvEnsureHoroscopeAuthReady?.();}catch{}
  const owner=window.__smvHoroscopeOwner?.();
  if(!owner?.uid){cachedToken='';return null;}
  const appMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
  const authMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
  const app=appMod.getApps().find(a=>a.name==='smv-horoscope-local');
  if(!app){cachedToken='';return null;}
  const auth=authMod.getAuth(app);
  if(auth.authStateReady)await auth.authStateReady();
  const user=auth.currentUser;
  if(!user||user.uid!==owner.uid){cachedToken='';return null;}
  cachedToken=await user.getIdToken(false);
  return user;
}
window.__smvHoroscopeApi=async function(path,opt={}){
  const user=await currentFirebaseUser();
  if(!user||!cachedToken)throw new Error(document.documentElement.lang==='ta'?'Saved Reports பார்க்க Customer Login தேவை.':'Customer login is required for Saved Reports.');
  const headers=new Headers(opt.headers||{});
  headers.set('Authorization','Bearer '+cachedToken);
  if(opt.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const response=await fetch(BACKEND+path,{...opt,headers});
  const text=await response.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text||('Request failed ('+response.status+')')}}
  if(!response.ok)throw new Error(data?.error||('Request failed ('+response.status+')'));
  return data;
};
window.addEventListener('smv:horoscope-local-auth',e=>{if(!e?.detail?.loggedIn)cachedToken='';});

// V61 — SMV Horoscope paid-feature gate. Core horoscope calculations remain offline-capable.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).replace(/\/$/,''),token:'',user:null,config:null,locks:new Map(),paid:new Set(),auth:null,authReady:null,accessCache:new Map(),accessPending:new Map(),epoch:0,contexts:new Map(),marriagePrepaid:false};
const FIREBASE_CONFIG={apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:"auth.smvastroservices.in",projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ta=()=>document.documentElement.lang==='ta'||document.body.classList.contains('tamil-mode');
async function initLocalAuth(){
 if(state.authReady)return state.authReady;
 state.authReady=(async()=>{
  const appMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
  const authMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
  const app=appMod.getApps().find(a=>a.name==='smv-horoscope-local')||appMod.initializeApp(FIREBASE_CONFIG,'smv-horoscope-local');
  const auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserLocalPersistence);
  if(auth.authStateReady)await auth.authStateReady();
  state.auth=auth;
  if(auth.currentUser){await refreshLocalUser(auth.currentUser,false)}
  return {auth,authMod};
 })();return state.authReady;
}
async function refreshLocalUser(u,verifyRole=true){
 if(!u){state.token='';state.user=null;state.paid.clear();renderAuthStatus();return false}
 await u.reload();
 if(!u.emailVerified){state.token='';state.user=null;state.paid.clear();state.accessCache.clear();state.epoch++;renderAuthStatus(ta()?'மின்னஞ்சல் சரிபார்ப்பு முடிந்த பிறகு Login செய்யவும்.':'Verify your email before logging in.');return false}
 const token=await u.getIdToken(true);
 if(verifyRole){const r=await fetch(state.backend+'/horoscope-auth/session',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.role!=='customer')throw Error(j.error||'Customer account is required.')}
 if(state.user?.uid!==u.uid){state.paid.clear();state.accessCache.clear();state.accessPending.clear();state.epoch++;}
 state.token=token;state.user={uid:u.uid,email:u.email||''};try{sessionStorage.setItem('smv-offline-owner',JSON.stringify(state.user));}catch{}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true,uid:u.uid}}));try{await window.__smvRefreshSavedReportsFromAuth?.();}catch(e){console.warn('Saved reports login refresh failed:',e);}return true;
}
function renderAuthStatus(message=''){
 const host=document.getElementById('smvHoroscopeAuth');if(!host)return;
 const status=host.querySelector('[data-auth-status]');if(status){status.textContent=message||'';status.hidden=!message;}
 if(state.user){host.querySelectorAll('.smv-login-required-note').forEach(e=>e.remove());document.querySelectorAll('.smv-login-required-note').forEach(e=>e.remove());}
 host.classList.toggle('is-logged-in',!!state.user);
}
function showAuthForm(mode='login'){const host=document.getElementById('smvHoroscopeAuth');if(!host)return;host.dataset.mode=mode;host.querySelector('[data-auth-form]')?.removeAttribute('hidden');host.querySelector('[data-name-row]')?.toggleAttribute('hidden',mode==='login');host.querySelector('[data-phone-row]')?.toggleAttribute('hidden',mode==='login');const submit=host.querySelector('[data-auth-submit]');if(submit)submit.textContent=mode==='login'?(ta()?'LOGIN':'LOGIN'):(ta()?'REGISTER':'REGISTER');host.scrollIntoView({behavior:'auto',block:'center'});}
async function loginLocal(){const host=document.getElementById('smvHoroscopeAuth'),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!email||!password)throw Error(ta()?'Email மற்றும் Password தேவை.':'Email and password are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.signInWithEmailAndPassword(auth,email,password);await refreshLocalUser(c.user,true);host.querySelector('[data-auth-form]')?.setAttribute('hidden','');}
async function registerLocal(){const host=document.getElementById('smvHoroscopeAuth'),name=host.querySelector('[data-name]')?.value.trim(),phone=host.querySelector('[data-phone]')?.value.trim(),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!name||!phone||!email||password.length<6)throw Error(ta()?'பெயர், செல்லுபடியாகும் மொபைல், Email மற்றும் குறைந்தது 6 எழுத்து Password தேவை.':'Name, valid mobile, email and a password of at least 6 characters are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.createUserWithEmailAndPassword(auth,email,password);try{const token=await c.user.getIdToken();const r=await fetch(state.backend+'/register-customer-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({name,phone,language:ta()?'ta':'en'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Customer profile registration failed.');await authMod.sendEmailVerification(c.user);await authMod.signOut(auth);state.token='';state.user=null;renderAuthStatus(ta()?'Verification email அனுப்பப்பட்டது. Verify செய்த பிறகு Login செய்யவும்.':'Verification email sent. Verify it, then login here.');}catch(e){try{await c.user.delete()}catch(_){}throw e}}
async function logoutLocal(){try{sessionStorage.removeItem('smv-offline-owner')}catch{}const {auth,authMod}=await initLocalAuth();await authMod.signOut(auth);state.token='';state.user=null;state.paid.clear();state.accessCache.clear();state.accessPending.clear();state.epoch++;state.contexts.clear();window.__smvSwitchHoroscopeLanguage=null;window.__smvLastFullReport=null;for(const id of ['englishHoroscopeResult','tamilHoroscopeResult','mmResult']){const el=document.getElementById(id);if(el){el.replaceChildren();el.classList.add('hidden');}}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:false}}));try{await window.__smvRefreshSavedReportsFromAuth?.();}catch(e){console.warn('Saved reports logout refresh failed:',e);}}
function authErrorMessage(error){
 const code=String(error?.code||'');
 const messages={
 'auth/invalid-credential':['Email or password is incorrect. Please try again.','மின்னஞ்சல் அல்லது கடவுச்சொல் தவறாக உள்ளது. மீண்டும் முயற்சிக்கவும்.'],
 'auth/wrong-password':['Email or password is incorrect. Please try again.','மின்னஞ்சல் அல்லது கடவுச்சொல் தவறாக உள்ளது. மீண்டும் முயற்சிக்கவும்.'],
 'auth/user-not-found':['Email or password is incorrect. Please try again.','மின்னஞ்சல் அல்லது கடவுச்சொல் தவறாக உள்ளது. மீண்டும் முயற்சிக்கவும்.'],
 'auth/invalid-email':['Please enter a valid email address.','சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.'],
 'auth/too-many-requests':['Too many attempts. Please wait and try again.','அதிக முயற்சிகள் செய்யப்பட்டுள்ளன. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'],
 'auth/network-request-failed':['Check your internet connection and try again.','இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'],
 'auth/email-already-in-use':['This email is already registered. Please log in.','இந்த மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. உள்நுழையவும்.'],
 'auth/weak-password':['Use a password with at least 6 characters.','குறைந்தது 6 எழுத்துகள் கொண்ட கடவுச்சொல்லைப் பயன்படுத்தவும்.'],
 'auth/user-disabled':['This account is disabled. Please contact support.','இந்தக் கணக்கு முடக்கப்பட்டுள்ளது. உதவிக்கு எங்களைத் தொடர்புகொள்ளவும்.']};
 if(messages[code])return messages[code][ta()?1:0];
 if(code.startsWith('auth/')||/Firebase|auth\//i.test(error?.message||''))return ta()?'உள்நுழைய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.':'Unable to sign in. Please try again.';
 return error?.message||(ta()?'மீண்டும் முயற்சிக்கவும்.':'Please try again.');
}
function bindPasswordToggle(host){
 const input=host.querySelector('[data-password]'),button=host.querySelector('[data-password-toggle]');
 if(!input||!button)return;
 const update=()=>{const visible=input.type==='text';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',ta()?(visible?'கடவுச்சொல்லை மறை':'கடவுச்சொல்லைக் காட்டு'):(visible?'Hide password':'Show password'));button.querySelector('[data-eye-slash]')?.toggleAttribute('hidden',!visible);};
 button.addEventListener('click',()=>{input.type=input.type==='password'?'text':'password';update();});
 window.addEventListener('smv-language',update);update();
}
function bindAuthUI(){const host=document.getElementById('smvHoroscopeAuth');if(!host||host.dataset.bound==='1')return;host.dataset.bound='1';bindPasswordToggle(host);host.querySelector('[data-login]')?.addEventListener('click',()=>showAuthForm('login'));host.querySelector('[data-register]')?.addEventListener('click',()=>showAuthForm('register'));host.querySelector('[data-logout]')?.addEventListener('click',()=>logoutLocal().catch(e=>renderAuthStatus(authErrorMessage(e))));host.querySelector('[data-auth-submit]')?.addEventListener('click',async()=>{const b=host.querySelector('[data-auth-submit]');b.disabled=true;try{host.dataset.mode==='register'?await registerLocal():await loginLocal()}catch(e){renderAuthStatus(authErrorMessage(e))}finally{b.disabled=false}});initLocalAuth().then(()=>renderAuthStatus()).catch(e=>{if(!navigator.onLine){try{state.user=JSON.parse(sessionStorage.getItem('smv-offline-owner')||'null');if(state.user)window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true,offline:true}}));}catch{}}renderAuthStatus(authErrorMessage(e));});}
async function ensureCustomerAuth(){
 await initLocalAuth();
 const u=state.auth?.currentUser;
 if(u&&(!state.user||state.user.uid!==u.uid||!state.token))await refreshLocalUser(u,false);
 if(!state.user||!state.token)throw Error(ta()?'Customer Login செய்யவும்.':'Customer login is required.');
 return true;
}
async function authHeaders(){if(state.auth?.currentUser&&state.user?.uid===state.auth.currentUser.uid)state.token=await state.auth.currentUser.getIdToken();return {'Content-Type':'application/json',...(state.token?{Authorization:'Bearer '+state.token}:{})};}
async function api(path,opt={}){const r=await fetch(state.backend+path,{signal:AbortSignal.timeout(20000),...opt,cache:'no-store',headers:{...await authHeaders(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw Error(j.error||('Request failed: '+r.status));return j}
function reportContext(feature){const value=state.contexts.get(feature);if(!value)throw Error(ta()?'முதலில் பிறந்த விவரங்களை உள்ளிடவும்.':'Enter the birth details first.');return value;}
function reportCacheKey(feature){return window.SMVReportIdentity.canonical(feature,reportContext(feature));}
window.__smvSetReportContext=(feature,value)=>{window.SMVReportIdentity.canonical(feature,value);state.contexts.set(feature,JSON.parse(JSON.stringify(value)));};
window.__smvGetReportContext=reportContext;
window.__smvHoroscopeApi=api;
function markPaid(feature,key=reportCacheKey(feature)){state.paid.add(key);state.accessCache.set(key,{enabled:true,unlocked:true,free:false});window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature,key}}));}
let configPending=null;
async function config(){
 // Revalidate for each new calculation; a former free price is not an entitlement.
 if(configPending)return configPending;
 configPending=(async()=>{
  const data=await api('/horoscope-feature/config'),features=data.features;
  for(const feature of ['advanced_analysis','marriage_matching']){
   const item=features?.[feature];
   if(!item||typeof item.enabled!=='boolean'||typeof item.price!=='number'||!Number.isFinite(item.price)||item.price<0)throw Error(ta()?'கட்டண அமைப்பை சரிபார்க்க முடியவில்லை. மீண்டும் முயலவும்.':'Unable to verify feature pricing. Please try again.');
  }
  state.config=features;return features;
 })();
 try{return await configPending;}finally{configPending=null;}
}
function fragmentLock(el){if(!el||state.locks.has(el))return;const f=document.createDocumentFragment();while(el.firstChild)f.appendChild(el.firstChild);state.locks.set(el,f)}
function fragmentUnlock(el){const f=state.locks.get(el);if(!f)return;el.replaceChildren(f);state.locks.delete(el)}
function money(n){return '₹'+Number(n||0).toFixed(2)}
async function ensureCheckout(){if(typeof window.Razorpay==='function')return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(Error('Razorpay checkout could not load.'));document.head.appendChild(s)})}
async function ensureCheckoutIn(win){
 if(!win||win.closed)throw Error('Payment window was closed. Please try again.');
 if(win.Razorpay)return win.Razorpay;
 await new Promise((resolve,reject)=>{
  const d=win.document,s=d.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(Error('Razorpay checkout is unavailable.'));d.head.appendChild(s);
 });
 if(!win.Razorpay)throw Error('Razorpay checkout is unavailable.');
 return win.Razorpay;
}
function openPaymentProgress(feature){
 const w=window.open('about:blank','smv_feature_payment_'+Date.now(),'width=520,height=620');
 if(!w)return null;
 const title=feature==='marriage_matching'?(ta()?'திருமணப் பொருத்த கட்டணம்':'Marriage Matching Payment'):(ta()?'மேம்பட்ட ஜாதக ஆய்வு கட்டணம்':'Advanced Horoscope Payment');
 const render=message=>{try{w.document.open();w.document.write(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#fffaf0;color:#2c241b}.box{max-width:430px;padding:32px;text-align:center}.spin{width:38px;height:38px;margin:0 auto 22px;border:4px solid #eadfca;border-top-color:#8b1a1a;border-radius:50%;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}h1{font-size:1.25rem}p{font-size:1rem;line-height:1.6}</style><div class="box"><div class="spin"></div><h1>SMV ASTRO SERVICES</h1><p>${esc(message)}</p></div>`);w.document.close();}catch(_){}};
 render(ta()?'கட்டணப் பக்கம் தயாராகிறது…':'Preparing secure payment…');
 try{window.focus()}catch(_){}
 return {window:w,show:render,close(){try{if(!w.closed)w.close()}catch(_){}}};
}
function paymentSuccessMessage(){return ta()?'கட்டணம் வெற்றிகரமாக முடிந்தது.':'Payment completed successfully.';}
function paymentFailedMessage(){return ta()?'கட்டணம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.':'Payment failed. Please try again.';}
function calculationMessage(feature){return feature==='marriage_matching'?(ta()?'முழு திருமணப் பொருத்த அறிக்கை கணக்கிடப்படுகிறது… தயவுசெய்து காத்திருக்கவும்…':'Calculating Full Marriage Matching Report... Please Wait...'):(ta()?'மேம்பட்ட பகுப்பாய்வு அறிக்கை கணக்கிடப்படுகிறது… தயவுசெய்து காத்திருக்கவும்…':'Calculating Advanced Analysis Report... Please Wait...');}
async function buy(feature,button,onUnlocked){
 try{await ensureCustomerAuth();}catch(e){showAuthForm('login');throw e;}
 let progress=null;
 const birthIdentity=reportContext(feature),key=reportCacheKey(feature);
 const inputs=[...document.querySelectorAll(feature==='marriage_matching'?'#smvMarriageMatching input':'#english-horoscope input,#english-horoscope select')].filter(e=>!e.disabled);inputs.forEach(e=>e.disabled=true);
 const old=button.textContent,epoch=state.epoch,reset=()=>{inputs.forEach(e=>e.disabled=false);button.disabled=false;button.textContent=old;},fail=e=>{console.error(e);progress?.close();alert(e.message||String(e));reset();};
 button.disabled=true;button.textContent=ta()?'கட்டணம் தயாராகிறது…':'Preparing payment…';
 const unlock=async paid=>{if(epoch!==state.epoch)throw Error('Account changed. Log in to the paying account to restore access.');if(paid)markPaid(feature,key);if(key!==reportCacheKey(feature))throw Error('Birth details changed during payment. Reopen the paid birth details.');await onUnlocked();};
 try{
  const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature,birthIdentity})});
  if(o.free||o.alreadyPaid||o.unlocked){progress?.show(calculationMessage(feature));await unlock(!o.free);progress?.show(ta()?'அறிக்கை தயார்.':'Report ready.');setTimeout(()=>progress?.close(),900);reset();return;}
  if(epoch!==state.epoch)throw Error('Account changed before checkout. Please try again.');
  progress=openPaymentProgress(feature);
  if(!progress)throw Error('Allow the temporary payment window and try again.');
  const RazorpayCtor=await ensureCheckoutIn(progress.window);
  const rz=new RazorpayCtor({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Advanced Horoscope Analysis':'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature},retry:{enabled:false},handler:async r=>{
   try{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature,birthIdentity,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification is pending. Log in again to restore the paid access; do not pay again.');progress?.show(paymentSuccessMessage());await new Promise(resolve=>setTimeout(resolve,450));progress?.show(calculationMessage(feature));try{progress?.window?.focus()}catch(_){}await unlock(true);progress?.show(ta()?'அறிக்கை தயார்.':'Report ready.');setTimeout(()=>progress?.close(),1200);reset();}catch(e){fail(e);}
  },modal:{ondismiss:()=>{progress?.close();reset();}}});rz.on('payment.failed',r=>fail(Error(r?.error?.description||paymentFailedMessage())));rz.open();
 }catch(e){fail(e);}
}
async function buyMarriagePreinput(button,onUnlocked){
 await ensureCustomerAuth();
 let progress=null;
 const inputs=[];button.disabled=true;button.textContent=ta()?'கட்டணம் தயாராகிறது…':'Preparing payment…';
 const reset=()=>{button.disabled=false;button.textContent=ta()?'செலுத்தி திறக்க':'Pay & Unlock'};
 const fail=e=>{progress?.close();reset();throw e};
 try{
  const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature:'marriage_matching',preinput:true})});
  if(o.free||o.alreadyPaid){state.marriagePrepaid=true;progress?.show(calculationMessage('marriage_matching'));await onUnlocked?.();progress?.show(ta()?'அறிக்கை தயார்.':'Report ready.');setTimeout(()=>progress?.close(),900);reset();return;}
  progress=openPaymentProgress('marriage_matching');
  if(!progress)throw Error('Allow the temporary payment window and try again.');
  const RazorpayCtor=await ensureCheckoutIn(progress.window);
  const rz=new RazorpayCtor({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature:'marriage_matching'},retry:{enabled:false},handler:async r=>{
   try{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature:'marriage_matching',preinput:true,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification is pending. Do not pay again.');state.marriagePrepaid=true;progress?.show(calculationMessage('marriage_matching'));try{progress?.window?.focus()}catch(_){}await onUnlocked?.();progress?.show(ta()?'அறிக்கை தயார்.':'Report ready.');setTimeout(()=>progress?.close(),1200);reset();}catch(e){progress?.close();button.disabled=false;button.textContent=ta()?'செலுத்தி திறக்க':'Pay & Unlock';alert(e.message||e);}
  },modal:{ondismiss:()=>{progress?.close();reset();}}});rz.on('payment.failed',r=>{progress?.close();reset();alert(r?.error?.description||paymentFailedMessage())});rz.open();
 }catch(e){return fail(e)}
}
async function claimMarriagePayment(){const birthIdentity=reportContext('marriage_matching');const out=await api('/horoscope-feature/claim-marriage-payment',{method:'POST',body:JSON.stringify({birthIdentity})});if(out?.unlocked){state.marriagePrepaid=false;markPaid('marriage_matching');return true;}return false;}
window.__smvClaimMarriagePayment=claimMarriagePayment;
function validateAdvancedBirthDetails(){
 const en=document.getElementById('english-horoscope');
 const tamil=document.getElementById('tamil-horoscope');
 const useTa=ta()&&!tamil?.hidden;
 const ids=useTa?['tamilDob','tamilTob','tamilLat','tamilLon']:['englishDob','englishTob','englishLat','englishLon'];
 const vals=ids.map(id=>String(document.getElementById(id)?.value??'').trim());
 if(vals.some(v=>!v))throw Error(ta()?'முழு பிறப்பு விவரங்களை உள்ளிடவும்.':'Please enter complete birth details.');
 return true;
}
function payCard(feature,price,onUnlocked,singleLayer=false,beforeBuy=null){const box=document.createElement('div');box.className=(singleLayer?'smv-horoscope-pay-gate smv-horoscope-pay-gate-single':'card smv-horoscope-pay-gate');box.dataset.feature=feature;const title=feature==='advanced_analysis'?(ta()?'மேம்பட்ட ஜாதக ஆய்வு':'Advanced Horoscope Analysis'):(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching');const note=feature==='advanced_analysis'?(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு இந்த அம்சங்களின் முழுமையான கணக்கீடுகள் மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete calculations and results for these features will be shown after successful payment.'):(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு முழுமையான திருமணப் பொருத்த கணக்கீடு மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete Marriage Matching calculations and results will be shown after successful payment.');box.innerHTML=`<h3>${esc(title)}</h3><p class="small"><b>${money(price)}</b></p><button class="btn" type="button">${ta()?money(price)+' செலுத்தி திறக்க':'Pay '+money(price)+' & Unlock'}</button><p class="small">${esc(note)}</p>`;const b=box.querySelector('button');b.onclick=async()=>{try{if(feature==='advanced_analysis')validateAdvancedBirthDetails();if(typeof beforeBuy==='function')await beforeBuy();await buy(feature,b,async()=>{await onUnlocked();box.remove()});}catch(e){alert(e.message||String(e));}};return box}
async function access(feature,cfg){
 if(!cfg.enabled)return {enabled:false,unlocked:false};
 // V133: Admin ON + Rs.0 is public/free. Do not force Login or a payment gate.
 if(Number(cfg.price||0)<=0)return {enabled:true,unlocked:true,free:true,price:0};
 if(!state.token)await initLocalAuth().catch(()=>{});
 if(!state.token)return {enabled:true,unlocked:false,free:false,price:cfg.price,loginRequired:true};
 const key=reportCacheKey(feature),birthIdentity=reportContext(feature);
 if(state.accessPending.has(key))return state.accessPending.get(key);
 const epoch=state.epoch;
 const promise=(async()=>{const out=await api('/horoscope-feature/access?feature='+encodeURIComponent(feature)+'&birthIdentity='+encodeURIComponent(JSON.stringify(birthIdentity)));if(epoch!==state.epoch)return {enabled:true,unlocked:false,price:cfg.price};state.accessCache.set(key,out);if(out.unlocked===true&&out.free!==true)markPaid(feature,key);return out;})();
 state.accessPending.set(key,promise);try{return await promise;}finally{if(state.accessPending.get(key)===promise)state.accessPending.delete(key);}
}
async function gateAdvanced(root){
 const cfg=(await config()).advanced_analysis;
 const parts=[...root.querySelectorAll('.smv-advanced-part')].filter(x=>!x.classList.contains('detailed-dasha-predictions')&&!x.classList.contains('detailed-transit-predictions')).slice(0,10);
 if(!parts.length)return;
 if(!cfg.enabled){parts.forEach(p=>p.hidden=true);return}
 const a=await access('advanced_analysis',cfg);if(a.unlocked){parts.forEach(p=>fragmentUnlock(p.querySelector('.smv-advanced-part-content')));root.querySelectorAll('.smv-horoscope-pay-gate').forEach(e=>e.remove());return;}
 const previews=[];
 const contents=[];
 parts.forEach((p,i)=>{
   const content=p.querySelector('.smv-advanced-part-content');if(!content)return;
   const title=((p.querySelector('.smv-advanced-part-title')||p.querySelector('h3,h4')||{}).textContent||'').trim();
   const subs=[...content.querySelectorAll('h2,h3,h4,h5,summary')].map(x=>(x.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean).filter((v,j,a)=>a.indexOf(v)===j).slice(0,24);
   previews.push({n:i+1,title,subs});contents.push(content);fragmentLock(content);
   const pv=document.createElement('div');pv.className='smv-paid-heading-preview';pv.innerHTML=subs.length?`<ul>${subs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="small">${esc(ta()?'விரிவான துணைப் பகுதிகள் கட்டணத்திற்குப் பிறகு திறக்கப்படும்.':'Detailed subsections unlock after payment.')}</p>`;content.appendChild(pv);
 });
 const card=payCard('advanced_analysis',cfg.price,async()=>{contents.forEach(fragmentUnlock);parts.forEach(p=>p.hidden=false)});
 const list=previews.map(x=>`${x.n}. ${x.title}`).filter(Boolean);if(list.length)card.insertAdjacentHTML('beforeend',`<p class="small">${esc(ta()?'கிடைக்கும் பகுதிகள்: ':'Included sections: ')}${list.map(esc).join(' · ')}</p>`);
 parts[0].before(card)
}
async function gateMarriage(){
 const sec=document.getElementById('smvMarriageMatching'); if(!sec)return;
 const cfg=(await config()).marriage_matching;
 if(!cfg.enabled){sec.hidden=true;sec.setAttribute('aria-hidden','true');window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:false,publicPoruthamOnly:false,featureHidden:true,paymentRequired:false}}));return;}
 sec.removeAttribute('aria-hidden');
 fragmentUnlock(sec);sec.hidden=false;
}

function advancedPreviewHtml(){
 const rows=ta()?[
 ['I','ஜாதக பகுப்பாய்வு',['பாவ சிறப்பு அம்சங்கள்','சிறப்பு லக்னங்கள்','அரூட பதங்கள் A1–A12','கிரக பார்வை / ராசி பார்வை','அஷ்டகவர்க்கம் / பலங்கள் / யோகங்கள்']],
 ['II','தசா பகுப்பாய்வு',['அஷ்டோத்தரி','நாராயண தசா','லக்ன கேந்திராதி','சுதசா / திரிக் தசா','காலசக்கர தசா']],
 ['III','தாஜக பகுப்பாய்வு',['தாஜக பார்வைகள்','தாஜக யோகங்கள்','ஹர்ஷ பலம்','பிரத்யயினி தசா']],
 ['IV','கோச்சார பகுப்பாய்வு',['சுதர்சன சக்கரம்','கோட்டா சக்கரம்','சர்வதோபத்ர சக்கரம்','ஜன்ம ராசி கோச்சாரம்']],
 ['V','பரிகார நடவடிக்கைகள்',['ஜாதக ஆதார பரிகார வழிகாட்டல்']],
 ['VI','எண் கணிதம்',['பிறப்பு எண்','வாழ்க்கைப் பாதை எண்','பெயர் எண்']],
 ['VII','தினசரி வாழ்க்கை மந்திரங்கள்',['ஜாதக ஆதார தினசரி மந்திரங்கள்']],
 ['VIII','அதிதேவதைகள்',['கிரக / ஜாதக ஆதார அதிதேவதை ஆய்வு']],
 ['IX','தெய்வங்கள்',['ஜாதக ஆதார தெய்வ வழிகாட்டல்']]
 ]:[
 ['I','CHART ANALYSIS',['Bhava Special Features','Special Lagnas','Arudha Padas A1–A12','Graha / Rasi Drishti','Ashtakavarga / strengths / yogas']],
 ['II','DASA ANALYSIS',['Ashtottari','Narayana Dasa','Lagna Kendradi','Sudasa / Drig Dasa','Kalachakra Dasa']],
 ['III','TAJAKA ANALYSIS',['Tajaka aspects','Tajaka yogas','Harsha Bala','Pratyayini Dasa']],
 ['IV','TRANSIT ANALYSIS',['Sudarshana Chakra','Kota Chakra','Sarvatobhadra Chakra','Janma Rasi Transit']],
 ['V','REMEDIAL MEASURES',['Chart-based remedial guidance']],
 ['VI','NUMEROLOGY',['Birth number','Life-path number','Name number']],
 ['VII','DAILY LIFE MANTRAS',['Chart-based daily mantras']],
 ['VIII','ADHIDEVATAS',['Planet/chart-based Adhidevata review']],
 ['IX','DEITIES',['Chart-based deity guidance']]
 ];
 return `<div class="smv-paid-heading-preview smv-paid-i-x-preview"><h3>${esc(ta()?'மேம்பட்ட பகுப்பாய்வு — உள்ளடக்கம்':'Advanced Analysis — Contents')}</h3>${rows.map(([r,t,subs])=>`<div class="smv-preview-part"><b>${r}. ${esc(t)}</b><ul>${subs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
}
async function requireFeature(feature,mount,onFeatureUnlocked){
 try{
 await initLocalAuth().catch(()=>{});
 const epoch=state.epoch,cfg=(await config())[feature];
 if(epoch!==state.epoch)return false;
 if(!cfg.enabled){if(mount)mount.replaceChildren();return false;}
 const requestedKey=reportCacheKey(feature),a=await access(feature,cfg);if(epoch!==state.epoch||requestedKey!==reportCacheKey(feature))return false;
 if(a.enabled===false){if(mount)mount.replaceChildren();return false;}
 if(a.enabled===true&&a.unlocked===true)return true;
 if(a.loginRequired){if(mount){mount.innerHTML=feature==='advanced_analysis'?advancedPreviewHtml():'';const card=payCard(feature,a.price??cfg.price,async()=>{if(typeof onFeatureUnlocked==='function')await onFeatureUnlocked();});mount.appendChild(card);}return false;}
 if(a.legacyNeedsLink){if(mount){mount.replaceChildren();const note=document.createElement('p');note.textContent=ta()?'முந்தைய கட்டணத்திற்கு அசல் பிறந்த விவரங்களை நிர்வாகி இணைக்க வேண்டும். மீண்டும் கட்டணம் செலுத்த வேண்டாம்.':a.error;mount.append(note);}return false;}
 if(!mount)return false;
 mount.innerHTML=feature==='advanced_analysis'?advancedPreviewHtml():'';
 const card=payCard(feature,a.price??cfg.price,async()=>{
   mount.innerHTML=`<p class="smv-payment-success">${esc(ta()?'கட்டணம் வெற்றிகரமாக முடிந்தது. மேம்பட்ட பகுப்பாய்வு கணக்கிடப்படுகிறது…':'Payment successful. Calculating Advanced Analysis…')}</p>`;
   if(typeof onFeatureUnlocked==='function') await onFeatureUnlocked();
   window.dispatchEvent(new CustomEvent('smv:horoscope-feature-unlocked',{detail:{feature,handled:typeof onFeatureUnlocked==='function'}}));
   requestAnimationFrame(()=>{const first=document.querySelector('#englishAdvancedAstrology .smv-advanced-part, #tamilAdvancedAstrology .smv-advanced-part');(first||mount)?.scrollIntoView({behavior:'auto',block:'start'});});
 });
 mount.appendChild(card);
 // IMPORTANT: do not keep the main Horoscope generation Promise pending while the
 // user is deciding whether to pay. Core Horoscope is complete at this point.
 return false;
 }catch(e){
  // Keep the completed free core visible when paid authorization is unavailable.
  if(mount){mount.replaceChildren();const note=document.createElement('p');note.className='error';note.textContent=e.message||String(e);mount.appendChild(note);}
  return false;
 }
}
async function downloadPaidPdf(feature,source,title){
 if(!state.user)throw Error(ta()?'முதலில் Customer Login செய்யவும்.':'Customer login is required.');
 if(!source||!String(source.textContent||'').trim())throw Error(ta()?'முதலில் அறிக்கையை உருவாக்கவும்.':'Generate the report first.');
 // V131: PDFKit/pdf-lib/Chromium/Cloud PDF are retired. Use the browser native
 // print pipeline; on mobile this opens the system viewer where Save as PDF is available.
 window.print();
 return true;
}
window.__smvMountMarriagePaymentCard=async(mount,beforeBuy,onUnlocked)=>{
 try{await initLocalAuth();if(state.auth?.currentUser&&!state.user)await refreshLocalUser(state.auth.currentUser,false);}catch(e){console.warn('Marriage auth readiness:',e);}
 if(!mount)return false;
 await initLocalAuth().catch(()=>{});
 const cfg=(await config()).marriage_matching;mount.replaceChildren();
 const nakshatraGate=document.getElementById('mmNakshatraGate');
 const showForm=()=>window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:true,paymentRequired:cfg.enabled&&cfg.price>0}}));
 const hideForm=()=>window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:true,paymentRequired:true}}));
 // V127: public users always get only the lightweight Nakshatra Porutham entry/result.
 // Admin OFF hides the complete Matching/Porutham section for every auth state.
 const sec=document.getElementById('smvMarriageMatching');
 if(!cfg.enabled){if(sec){sec.hidden=true;sec.setAttribute('aria-hidden','true');}if(nakshatraGate)nakshatraGate.hidden=true;mount.replaceChildren();window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:false,publicPoruthamOnly:false,featureHidden:true,paymentRequired:false}}));return false;}
 if(sec){sec.hidden=false;sec.removeAttribute('aria-hidden');}
 if(nakshatraGate)nakshatraGate.hidden=false;
 if(!state.user){
   mount.replaceChildren();
   window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:true,publicPoruthamOnly:true,featureHidden:false,paymentRequired:cfg.price>0}}));
   if(cfg.price>0){const card=payCard('marriage_matching',cfg.price,async()=>{},true);const b=card.querySelector('button');b.onclick=()=>showAuthForm('login');mount.appendChild(card);}
   return false;
 }
 if(!cfg.enabled){
   mount.replaceChildren();
   window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:false,publicPoruthamOnly:false,featureHidden:false,paymentRequired:false}}));
   return false;
 }
 // Logged-in + Admin ON + Rs.0 opens the complete matching calculation with no payment card.
 if(cfg.price<=0){showForm();return true;}
 if(nakshatraGate)nakshatraGate.hidden=false;
 if(!state.user){hideForm();}
 else{try{const a=await api('/horoscope-feature/access?feature=marriage_matching&preinput=1');if(a?.unlocked){state.marriagePrepaid=true;showForm();return true;}}catch(_){}hideForm();}
 const card=payCard('marriage_matching',cfg.price,async()=>{},true);const b=card.querySelector('button');
 b.onclick=async()=>{try{if(typeof beforeBuy==='function')await beforeBuy();await buy('marriage_matching',b,async()=>{mount.replaceChildren();showForm();if(typeof onUnlocked==='function')await onUnlocked();});}catch(e){alert(e.message||String(e));}};
 mount.appendChild(card);return false;
};
window.__smvDownloadPaidFeaturePdf=downloadPaidPdf;
window.__smvIsPaidHoroscopeFeature=feature=>{try{return state.paid.has(reportCacheKey(feature));}catch{return false;}};
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{bindAuthUI();config().then(()=>gateMarriage()).catch(()=>{});});
window.addEventListener('smv-language',()=>renderAuthStatus());
window.addEventListener('smv:horoscope-local-auth',()=>{renderAuthStatus();gateMarriage().catch(e=>renderAuthStatus(authErrorMessage(e)));});
window.__smvHoroscopePaidState=state;
window.__smvHoroscopeLoggedIn=()=>!!state.user;
window.__smvEnsureHoroscopeAuthReady=async()=>{await initLocalAuth();if(state.auth?.currentUser&&!state.user)await refreshLocalUser(state.auth.currentUser,false);return !!state.user;};

window.addEventListener('smv:marriage-mounted',()=>gateMarriage().catch(e=>renderAuthStatus(authErrorMessage(e))));

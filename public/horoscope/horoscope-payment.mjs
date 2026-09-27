// V61 — SMV Horoscope paid-feature gate. Core horoscope calculations remain offline-capable.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).replace(/\/$/,''),token:'',user:null,config:null,locks:new Map(),auth:null,authReady:null};
const FIREBASE_CONFIG={apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:"smv-astro.firebaseapp.com",projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ta=()=>document.documentElement.lang==='ta'||document.body.classList.contains('tamil-mode');
async function initLocalAuth(){
 if(state.authReady)return state.authReady;
 state.authReady=(async()=>{
  const appMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
  const authMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
  const app=appMod.getApps().find(a=>a.name==='smv-horoscope-local')||appMod.initializeApp(FIREBASE_CONFIG,'smv-horoscope-local');
  const auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserSessionPersistence);
  if(auth.authStateReady)await auth.authStateReady();
  state.auth=auth;
  if(auth.currentUser){await refreshLocalUser(auth.currentUser,false)}
  return {auth,authMod};
 })();return state.authReady;
}
async function refreshLocalUser(u,verifyRole=true){
 if(!u){state.token='';state.user=null;renderAuthStatus();return false}
 await u.reload();
 if(!u.emailVerified){state.token='';state.user=null;renderAuthStatus(ta()?'மின்னஞ்சல் சரிபார்ப்பு முடிந்த பிறகு Login செய்யவும்.':'Verify your email before logging in.');return false}
 const token=await u.getIdToken(true);
 if(verifyRole){const r=await fetch(state.backend+'/horoscope-auth/session',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.role!=='customer')throw Error(j.error||'Customer account is required.')}
 state.token=token;state.user={uid:u.uid,email:u.email||''};renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true}}));return true;
}
function renderAuthStatus(message=''){
 const host=document.getElementById('smvHoroscopeAuth');if(!host)return;
 const status=host.querySelector('[data-auth-status]');if(status)status.textContent=message||(state.user?(ta()?'Customer Login செயலில் உள்ளது: ':'Customer logged in: ')+(state.user.email||''):(ta()?'கட்டண சேவைகளுக்கு இங்கே Login / Register செய்யவும்.':'Login or register here for paid horoscope services.'));
 host.classList.toggle('is-logged-in',!!state.user);
}
function showAuthForm(mode='login'){const host=document.getElementById('smvHoroscopeAuth');if(!host)return;host.dataset.mode=mode;host.querySelector('[data-auth-form]')?.removeAttribute('hidden');host.querySelector('[data-name-row]')?.toggleAttribute('hidden',mode==='login');host.querySelector('[data-phone-row]')?.toggleAttribute('hidden',mode==='login');const submit=host.querySelector('[data-auth-submit]');if(submit)submit.textContent=mode==='login'?(ta()?'LOGIN':'LOGIN'):(ta()?'REGISTER':'REGISTER');host.scrollIntoView({behavior:'smooth',block:'center'});}
async function loginLocal(){const host=document.getElementById('smvHoroscopeAuth'),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!email||!password)throw Error(ta()?'Email மற்றும் Password தேவை.':'Email and password are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.signInWithEmailAndPassword(auth,email,password);await refreshLocalUser(c.user,true);host.querySelector('[data-auth-form]')?.setAttribute('hidden','');}
async function registerLocal(){const host=document.getElementById('smvHoroscopeAuth'),name=host.querySelector('[data-name]')?.value.trim(),phone=host.querySelector('[data-phone]')?.value.trim(),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!name||!phone||!email||password.length<6)throw Error(ta()?'பெயர், செல்லுபடியாகும் மொபைல், Email மற்றும் குறைந்தது 6 எழுத்து Password தேவை.':'Name, valid mobile, email and a password of at least 6 characters are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.createUserWithEmailAndPassword(auth,email,password);try{const token=await c.user.getIdToken();const r=await fetch(state.backend+'/register-customer-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({name,phone,language:ta()?'ta':'en'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Customer profile registration failed.');await authMod.sendEmailVerification(c.user);await authMod.signOut(auth);state.token='';state.user=null;renderAuthStatus(ta()?'Verification email அனுப்பப்பட்டது. Verify செய்த பிறகு Login செய்யவும்.':'Verification email sent. Verify it, then login here.');}catch(e){try{await c.user.delete()}catch(_){}throw e}}
async function logoutLocal(){const {auth,authMod}=await initLocalAuth();await authMod.signOut(auth);state.token='';state.user=null;renderAuthStatus();}
function bindAuthUI(){const host=document.getElementById('smvHoroscopeAuth');if(!host||host.dataset.bound==='1')return;host.dataset.bound='1';host.querySelector('[data-login]')?.addEventListener('click',()=>showAuthForm('login'));host.querySelector('[data-register]')?.addEventListener('click',()=>showAuthForm('register'));host.querySelector('[data-logout]')?.addEventListener('click',()=>logoutLocal().catch(e=>renderAuthStatus(e.message)));host.querySelector('[data-auth-submit]')?.addEventListener('click',async()=>{const b=host.querySelector('[data-auth-submit]');b.disabled=true;try{host.dataset.mode==='register'?await registerLocal():await loginLocal()}catch(e){renderAuthStatus(e.message||String(e))}finally{b.disabled=false}});initLocalAuth().then(()=>renderAuthStatus()).catch(e=>renderAuthStatus(e.message||String(e)));}
async function api(path,opt={}){const r=await fetch(state.backend+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json',...(opt.headers||{}),...(state.token?{Authorization:'Bearer '+state.token}:{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||('Request failed: '+r.status));return j}
async function config(){if(state.config)return state.config;await initLocalAuth().catch(()=>{});try{state.config=(await api('/horoscope-feature/config')).features||{};}catch(e){console.warn('Paid feature config unavailable; offline horoscope remains enabled.',e);state.config={advanced_analysis:{enabled:false,price:0,serviceUnavailable:true},marriage_matching:{enabled:false,price:0,serviceUnavailable:true}};}return state.config}
function fragmentLock(el){if(!el||state.locks.has(el))return;const f=document.createDocumentFragment();while(el.firstChild)f.appendChild(el.firstChild);state.locks.set(el,f)}
function fragmentUnlock(el){const f=state.locks.get(el);if(!f)return;el.replaceChildren(f);state.locks.delete(el)}
function money(n){return '₹'+Number(n||0).toFixed(2)}
async function ensureCheckout(){if(typeof window.Razorpay==='function')return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(Error('Razorpay checkout could not load.'));document.head.appendChild(s)})}
async function buy(feature,button,onUnlocked){
 if(!state.token){showAuthForm('login');renderAuthStatus(ta()?'கட்டணம் செலுத்த முதலில் இங்கே Customer Login செய்யவும்.':'Login here as a Customer before payment.');return}
 const old=button.textContent;button.disabled=true;button.textContent=ta()?'கட்டணம் தயாராகிறது…':'Preparing payment…';
 try{const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature})});if(o.free||o.alreadyPaid||o.unlocked){if(!o.free)window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));await onUnlocked();return}await ensureCheckout();const rz=new Razorpay({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Advanced Horoscope Analysis':'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature},handler:async r=>{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification failed.');window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));await onUnlocked();},modal:{ondismiss:()=>{button.disabled=false;button.textContent=old}}});rz.on('payment.failed',r=>{alert(r?.error?.description||'Payment failed.');button.disabled=false;button.textContent=old});rz.open()}catch(e){console.error(e);alert(e.message||String(e));button.disabled=false;button.textContent=old}}
function payCard(feature,price,onUnlocked,singleLayer=false){const box=document.createElement('div');box.className=(singleLayer?'smv-horoscope-pay-gate smv-horoscope-pay-gate-single':'card smv-horoscope-pay-gate');box.dataset.feature=feature;const title=feature==='advanced_analysis'?(ta()?'மேம்பட்ட ஜாதக ஆய்வு':'Advanced Horoscope Analysis'):(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching');box.innerHTML=`<h3>${esc(title)}</h3><p class="small">${ta()?'Admin நிர்ணயித்த கட்டணம்: ':'Admin-set price: '}<b>${money(price)}</b></p><button class="btn" type="button">${ta()?money(price)+' செலுத்தி திறக்க':'Pay '+money(price)+' & Unlock'}</button>`;const b=box.querySelector('button');b.onclick=()=>buy(feature,b,async()=>{await onUnlocked();box.remove()});return box}
async function access(feature,cfg){if(!cfg.enabled)return {enabled:false,unlocked:false};if(Number(cfg.price||0)<=0)return {enabled:true,unlocked:true,free:true};if(!state.token)await initLocalAuth().catch(()=>{});if(!state.token)return {enabled:true,unlocked:false,price:cfg.price};try{const out=await api('/horoscope-feature/access?feature='+encodeURIComponent(feature));if(out.unlocked&&!out.free)window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));return out}catch(_){return {enabled:true,unlocked:false,price:cfg.price}}}
async function gateAdvanced(root){const cfg=(await config()).advanced_analysis||{enabled:true,price:0};const parts=[...root.querySelectorAll('.smv-advanced-part')].filter(x=>!x.classList.contains('detailed-dasha-predictions')&&!x.classList.contains('detailed-transit-predictions')).slice(0,10);if(!parts.length)return;if(!cfg.enabled){parts.forEach(p=>p.hidden=true);return}const a=await access('advanced_analysis',cfg);if(a.unlocked)return;const contents=parts.map(p=>p.querySelector('.smv-advanced-part-content')).filter(Boolean);contents.forEach(fragmentLock);const preview=parts.map((p,i)=>`${i+1}. ${(p.querySelector('.smv-advanced-part-title')||p.querySelector('h3,h4')||{}).textContent||''}`.trim()).filter(Boolean);const card=payCard('advanced_analysis',cfg.price,async()=>{contents.forEach(fragmentUnlock);parts.forEach(p=>p.hidden=false)});if(preview.length)card.insertAdjacentHTML('beforeend',`<p class="small">${esc(ta()?'கட்டணம் செய்தால் கிடைக்கும் பகுதிகள்: ':'Included after payment: ')}${preview.map(esc).join(' · ')}</p>`);parts[0].before(card)}
async function gateMarriage(){const sec=document.getElementById('smvMarriageMatching');if(!sec)return;const cfg=(await config()).marriage_matching||{enabled:true,price:0};if(!cfg.enabled){sec.hidden=true;return}const a=await access('marriage_matching',cfg);if(a.unlocked)return;fragmentLock(sec);const card=payCard('marriage_matching',cfg.price,async()=>{fragmentUnlock(sec);sec.hidden=false},true);sec.append(card)}
async function requireFeature(feature,mount){
 const cfg=(await config())[feature]||{enabled:true,price:0};
 if(!cfg.enabled){
   if(mount){
     const unavailable=!!cfg.serviceUnavailable;
     mount.innerHTML=`<div class="card smv-horoscope-pay-gate"><h3>${esc(ta()?'இந்த சேவை தற்போது கிடைக்கவில்லை':'This service is currently unavailable')}</h3><p class="small">${esc(unavailable?(ta()?'Payment server-ஐ தற்போது தொடர்புகொள்ள முடியவில்லை. Core Horoscope மட்டும் தொடர்ந்து பயன்படுத்தலாம்.':'The payment server is temporarily unavailable. Core Horoscope remains available.'):(ta()?'Admin இந்த சேவையை OFF செய்துள்ளார்.':'Admin has turned this service OFF.'))}</p></div>`;
   }
   return false;
 }
 const a=await access(feature,cfg);
 if(a.unlocked)return true;
 if(!mount)return false;
 mount.innerHTML='';
 const card=payCard(feature,cfg.price,async()=>{
   mount.innerHTML='';
   window.dispatchEvent(new CustomEvent('smv:horoscope-feature-unlocked',{detail:{feature}}));
 });
 card.insertAdjacentHTML('beforeend',`<p class="small">${esc(ta()?'கட்டணம் வெற்றிகரமாக சரிபார்க்கப்பட்ட பிறகே இந்த கணக்கீடு தொடங்கும்.':'This calculation starts only after payment is verified.')}</p>`);
 mount.appendChild(card);
 // IMPORTANT: do not keep the main Horoscope generation Promise pending while the
 // user is deciding whether to pay. Core Horoscope is complete at this point.
 return false;
}
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{bindAuthUI();config().then(()=>gateMarriage()).catch(()=>{});});
window.__smvHoroscopePaidState=state;

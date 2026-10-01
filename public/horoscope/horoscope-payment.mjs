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
  const auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserSessionPersistence);
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
 state.token=token;state.user={uid:u.uid,email:u.email||''};try{sessionStorage.setItem('smv-offline-owner',JSON.stringify(state.user));}catch{}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true}}));return true;
}
function renderAuthStatus(message=''){
 const host=document.getElementById('smvHoroscopeAuth');if(!host)return;
 const status=host.querySelector('[data-auth-status]');if(status)status.textContent=message||(state.user?(ta()?'Customer Login செயலில் உள்ளது: ':'Customer logged in: ')+(state.user.email||''):(ta()?'ஜாதக சேவைகளுக்கு இங்கே Login / Register செய்யவும்.':'Login or register here for horoscope services.'));
 host.classList.toggle('is-logged-in',!!state.user);
}
function showAuthForm(mode='login'){const host=document.getElementById('smvHoroscopeAuth');if(!host)return;host.dataset.mode=mode;host.querySelector('[data-auth-form]')?.removeAttribute('hidden');host.querySelector('[data-name-row]')?.toggleAttribute('hidden',mode==='login');host.querySelector('[data-phone-row]')?.toggleAttribute('hidden',mode==='login');const submit=host.querySelector('[data-auth-submit]');if(submit)submit.textContent=mode==='login'?(ta()?'LOGIN':'LOGIN'):(ta()?'REGISTER':'REGISTER');host.scrollIntoView({behavior:'smooth',block:'center'});}
async function loginLocal(){const host=document.getElementById('smvHoroscopeAuth'),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!email||!password)throw Error(ta()?'Email மற்றும் Password தேவை.':'Email and password are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.signInWithEmailAndPassword(auth,email,password);await refreshLocalUser(c.user,true);host.querySelector('[data-auth-form]')?.setAttribute('hidden','');}
async function registerLocal(){const host=document.getElementById('smvHoroscopeAuth'),name=host.querySelector('[data-name]')?.value.trim(),phone=host.querySelector('[data-phone]')?.value.trim(),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!name||!phone||!email||password.length<6)throw Error(ta()?'பெயர், செல்லுபடியாகும் மொபைல், Email மற்றும் குறைந்தது 6 எழுத்து Password தேவை.':'Name, valid mobile, email and a password of at least 6 characters are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.createUserWithEmailAndPassword(auth,email,password);try{const token=await c.user.getIdToken();const r=await fetch(state.backend+'/register-customer-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({name,phone,language:ta()?'ta':'en'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Customer profile registration failed.');await authMod.sendEmailVerification(c.user);await authMod.signOut(auth);state.token='';state.user=null;renderAuthStatus(ta()?'Verification email அனுப்பப்பட்டது. Verify செய்த பிறகு Login செய்யவும்.':'Verification email sent. Verify it, then login here.');}catch(e){try{await c.user.delete()}catch(_){}throw e}}
async function logoutLocal(){try{sessionStorage.removeItem('smv-offline-owner')}catch{}const {auth,authMod}=await initLocalAuth();await authMod.signOut(auth);state.token='';state.user=null;state.paid.clear();state.accessCache.clear();state.accessPending.clear();state.epoch++;state.contexts.clear();window.__smvSwitchHoroscopeLanguage=null;window.__smvLastFullReport=null;for(const id of ['englishHoroscopeResult','tamilHoroscopeResult','mmResult']){const el=document.getElementById(id);if(el){el.replaceChildren();el.classList.add('hidden');}}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:false}}));}
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
 const features={advanced_analysis:{enabled:true,price:0},marriage_matching:{enabled:true,price:0}};
 state.config=features;return features;
}
async function access(feature,cfg={enabled:true,price:0}){return {success:true,feature,enabled:true,unlocked:true,free:true,price:0};}
async function gateAdvanced(root){if(!root)return;root.querySelectorAll('.smv-horoscope-pay-gate').forEach(e=>e.remove());root.querySelectorAll('.smv-advanced-part-content').forEach(e=>{e.hidden=false;e.removeAttribute('hidden')});return true;}
async function gateMarriage(){window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:true,paymentRequired:false}}));return true;}
async function requireFeature(feature,onUnlocked){if(typeof onUnlocked==='function')await onUnlocked();return true;}
window.__smvClaimMarriagePayment=async()=>true;
async function downloadPaidPdf(feature,source,title){
 if(source?.__smvPrepareReport)await source.__smvPrepareReport();
 const clone=source?.cloneNode(true);if(!clone)throw Error('Generate the report before downloading.');clone.querySelectorAll('button,script,style,.smv-horoscope-pay-gate').forEach(e=>e.remove());
 clone.querySelectorAll('p,div,section,tr,h1,h2,h3,h4,h5,li,summary').forEach(e=>e.appendChild(document.createTextNode('\n')));const text=String(clone.textContent||'').replace(/\n{3,}/g,'\n\n').trim();if(!text)throw Error('The report is empty.');
 const r=await fetch(state.backend+'/horoscope-feature/pdf',{method:'POST',cache:'no-store',headers:await authHeaders(),body:JSON.stringify({feature,birthIdentity:reportContext(feature),language:source?.dataset.resultLanguage||(ta()?'ta':'en'),title,text})});
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'PDF download failed.');}
 const blob=await r.blob();if(!blob.size||!String(r.headers.get('content-type')).includes('application/pdf'))throw Error('The server did not return a complete PDF.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=feature==='marriage_matching'?'SMV-Marriage-Matching.pdf':'SMV-Horoscope.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true;
}
window.__smvMountMarriagePaymentCard=async(mount,beforeBuy,onUnlocked)=>{if(mount)mount.replaceChildren();window.dispatchEvent(new CustomEvent('smv:marriage-gate-state',{detail:{showForm:true,paymentRequired:false}}));if(typeof onUnlocked==='function')await onUnlocked();return true;};
window.__smvDownloadPaidFeaturePdf=downloadPaidPdf;
window.__smvIsPaidHoroscopeFeature=feature=>true;
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{bindAuthUI();config().then(()=>gateMarriage()).catch(()=>{});});
window.addEventListener('smv:horoscope-local-auth',()=>{gateMarriage().catch(e=>renderAuthStatus(authErrorMessage(e)));});
window.__smvHoroscopePaidState=state;

window.addEventListener('smv:marriage-mounted',()=>gateMarriage().catch(e=>renderAuthStatus(authErrorMessage(e))));

// SMV HOROSCOPE authentication only. Horoscope calculations and location search are browser-local.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:DEFAULT_BACKEND,token:'',user:null,auth:null,authReady:null,epoch:0};
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
  if(auth.currentUser){await refreshLocalUser(auth.currentUser,true)}
  return {auth,authMod};
 })();return state.authReady;
}
async function refreshLocalUser(u,verifyRole=true){
 if(!u){state.token='';state.user=null;renderAuthStatus();return false}
 await u.reload();
 if(!u.emailVerified){state.token='';state.user=null;state.epoch++;renderAuthStatus(ta()?'மின்னஞ்சல் சரிபார்ப்பு முடிந்த பிறகு Login செய்யவும்.':'Verify your email before logging in.');return false}
 const token=await u.getIdToken(true);
 if(verifyRole){const app=state.auth.app;const fsMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');const fs=fsMod.getFirestore(app);const snap=await fsMod.getDoc(fsMod.doc(fs,'smv_users',u.uid));const role=String(snap.data()?.role||'customer').toLowerCase();if(role!=='customer')throw Error('Customer account is required.');}
 if(state.user?.uid!==u.uid)state.epoch++;
 state.token=token;state.user={uid:u.uid,email:u.email||''};try{sessionStorage.setItem('smv-offline-owner',JSON.stringify(state.user));}catch{}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true,uid:u.uid}}));return true;
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
async function logoutLocal(){try{sessionStorage.removeItem('smv-offline-owner')}catch{}const {auth,authMod}=await initLocalAuth();await authMod.signOut(auth);state.token='';state.user=null;state.epoch++;contexts.clear();window.__smvSwitchHoroscopeLanguage=null;window.__smvLastFullReport=null;for(const id of ['englishHoroscopeResult','tamilHoroscopeResult','mmResult']){const el=document.getElementById(id);if(el){el.replaceChildren();el.classList.add('hidden');}}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:false}}));}
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

const contexts=new Map();
window.__smvSetReportContext=(feature,value)=>{contexts.set(feature,JSON.parse(JSON.stringify(value||{})));};
window.__smvGetReportContext=feature=>{const v=contexts.get(feature);if(!v)throw Error(ta()?'முதலில் பிறந்த விவரங்களை உள்ளிடவும்.':'Enter the birth details first.');return v;};
const FREE_CONFIG={advanced_analysis:{enabled:false,price:0},marriage_matching:{enabled:false,price:0}};
let featureConfig=null,featureConfigAt=0,paymentWindow=null,paymentFeature='';
const paidReportKeys=new Set();
async function hasPaidAccess(feature){try{return paidReportKeys.has(feature+':'+await reportKey(feature));}catch{return false;}}
function rememberPaidAccess(feature,key){if(key)paidReportKeys.add(feature+':'+key);}
async function authApi(path,options={}){await initLocalAuth();const u=state.auth?.currentUser;if(!u)throw Error(ta()?'தொடர Customer Login தேவை.':'Customer login is required to continue.');const token=await u.getIdToken();const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+token);headers.set('Accept','application/json');if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');const r=await fetch(state.backend+path,{...options,headers,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||('HTTP '+r.status));return j;}
async function getFeatureConfig(force=false){
 if(!force&&featureConfig&&Date.now()-featureConfigAt<2500)return featureConfig;
 try{
  const r=await fetch(state.backend+'/horoscope-feature-config?_='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}}),j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j.error||'Unable to load Horoscope settings.');
  const a=j.advanced_analysis||{},m=j.marriage_matching||{};
  featureConfig={advanced_analysis:{enabled:a.enabled===true,price:Number(a.price??0)},marriage_matching:{enabled:m.enabled===true,price:Number(m.price??0)}};
  featureConfigAt=Date.now();
  try{localStorage.setItem('smv-horoscope-feature-config',JSON.stringify(featureConfig));}catch{}
  return featureConfig;
 }catch(e){
  try{const c=JSON.parse(localStorage.getItem('smv-horoscope-feature-config')||'null');if(c){featureConfig=c;featureConfigAt=Date.now();return c;}}catch{}
  console.warn('Horoscope feature config unavailable; using restricted mode.',e);
  return FREE_CONFIG;
 }
}
window.addEventListener('storage',e=>{if(e.key==='smv-horoscope-feature-config'){featureConfig=null;featureConfigAt=0;}});
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
async function reportKey(feature){const ctx=contexts.get(feature);if(!ctx)throw Error(ta()?'முதலில் பிறந்த விவரங்களை உள்ளிடவும்.':'Enter the birth details first.');const canonical=JSON.parse(JSON.stringify(ctx));if(canonical&&typeof canonical==='object')delete canonical.language;const bytes=new TextEncoder().encode(stable({feature,ctx:canonical})),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function flowText(en,tt){return ta()?tt:en;}
function isMobilePaymentViewport(){return matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;}
function paymentLoaderMarkup(){return '<div class="smv-payment-loader-card"><h2>SMV ASTRO</h2><div class="smv-payment-spinner" aria-hidden="true"></div><p id="s">Connecting to Payment Gateway…</p></div>';}
function openPaymentWindow(){
 if(isMobilePaymentViewport())return null;
 try{
  const width=460,height=430,left=Math.max(0,Math.round((screen.availWidth-width)/2)),top=Math.max(0,Math.round((screen.availHeight-height)/2));
  const w=window.open('','SMVHoroscopePayment',`popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  if(w){
   w.document.open();
   w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>SMV ASTRO Payment</title><style>*{box-sizing:border-box}html,body{width:100%;min-height:100%;margin:0}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fffaf3;color:#202020;display:grid;place-items:center;padding:20px}.smv-payment-loader-card{width:min(100%,360px);padding:28px 22px;border:1px solid #ead9bd;border-radius:18px;text-align:center;background:#fffaf3;box-shadow:0 10px 30px #0002}.smv-payment-loader-card h2{color:#8b164e;margin:0}.smv-payment-spinner{width:34px;height:34px;border:4px solid #ddd;border-top-color:#8b164e;border-radius:50%;margin:18px auto;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}#s{margin:0;line-height:1.45}</style></head><body>'+paymentLoaderMarkup()+'</body></html>');
   w.document.close();return w;
  }
 }catch{}
 return null;
}
function clearPaymentFallback(){document.getElementById('smvPaymentFlowFallback')?.remove();}
function paymentStatus(text){
 if(paymentWindow&&!paymentWindow.closed){const e=paymentWindow.document.getElementById('s');if(e)e.textContent=text;paymentWindow.focus();return;}
 let host=document.getElementById('smvPaymentFlowFallback');
 if(!host){
  host=document.createElement('div');host.id='smvPaymentFlowFallback';host.setAttribute('role','status');host.setAttribute('aria-live','polite');
  host.style.cssText='position:fixed;z-index:2147483000;inset:0;width:100vw;height:100vh;height:100dvh;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));display:grid;place-items:center;background:rgba(255,250,243,.96);overflow:auto;box-sizing:border-box';
  host.innerHTML='<style>#smvPaymentFlowFallback *{box-sizing:border-box}#smvPaymentFlowFallback .smv-payment-loader-card{width:min(92vw,360px);padding:26px 22px;border:1px solid #ead9bd;border-radius:18px;text-align:center;background:#fffaf3;box-shadow:0 10px 30px #0002}#smvPaymentFlowFallback h2{color:#8b164e;margin:0;font-size:clamp(20px,5vw,26px)}#smvPaymentFlowFallback .smv-payment-spinner{width:34px;height:34px;border:4px solid #ddd;border-top-color:#8b164e;border-radius:50%;margin:18px auto;animation:smvPaySpin 1s linear infinite}@keyframes smvPaySpin{to{transform:rotate(360deg)}}#smvPaymentFlowFallback #s{margin:0;font-weight:700;line-height:1.45;font-size:clamp(14px,3.8vw,17px)}</style>'+paymentLoaderMarkup();
  document.body.append(host);
 }
 const e=host.querySelector('#s');if(e)e.textContent=text;
}
function closePaymentWindow(){try{if(paymentWindow&&!paymentWindow.closed)paymentWindow.close();}catch{}paymentWindow=null;paymentFeature='';clearPaymentFallback();}
async function loadRazorpay(target=window){if(target.Razorpay)return;await new Promise((resolve,reject)=>{const d=target.document,old=d.querySelector('script[data-smv-razorpay]');if(old){if(target.Razorpay)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}const sc=d.createElement('script');sc.src='https://checkout.razorpay.com/v1/checkout.js';sc.dataset.smvRazorpay='1';sc.onload=resolve;sc.onerror=()=>reject(Error('Razorpay Checkout could not be loaded.'));d.head.append(sc);});}
async function payForFeature(feature){
 if(!state.user){showAuthForm('login');throw Error(flowText('Login first, then continue to payment.','முதலில் Login செய்து பிறகு Payment தொடரவும்.'));}
 const key=await reportKey(feature);paymentWindow=openPaymentWindow();paymentFeature=feature;paymentStatus(flowText('Connecting to Payment Gateway…','Payment Gateway-க்கு இணைக்கப்படுகிறது…'));
 const order=await authApi('/horoscope-payment/create-order',{method:'POST',body:JSON.stringify({feature,reportKey:key})});
 if(order.entitled){rememberPaidAccess(feature,key);paymentStatus(flowText('Access verified. Calculating…','அணுகல் உறுதி செய்யப்பட்டது. கணக்கிடப்படுகிறது…'));setTimeout(()=>closePaymentWindow(),650);return true;}
 const checkoutWindow=(paymentWindow&&!paymentWindow.closed)?paymentWindow:window;
 await loadRazorpay(checkoutWindow);
 paymentStatus(flowText('Payment Gateway ready. Opening Razorpay…','Payment Gateway தயார். Razorpay திறக்கப்படுகிறது…'));
 if(checkoutWindow===window)clearPaymentFallback();
 return await new Promise((resolve,reject)=>{let settled=false;const fail=e=>{if(settled)return;settled=true;paymentStatus(flowText('Payment was not completed.','Payment நிறைவடையவில்லை.'));setTimeout(()=>closePaymentWindow(),1800);reject(e instanceof Error?e:Error(String(e||'Payment was not completed.')));};const RazorpayCtor=checkoutWindow.Razorpay||window.Razorpay;const rz=new RazorpayCtor({key:order.keyId,amount:order.amount,currency:order.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Full Horoscope Report':'Full Marriage Matching Report',order_id:order.orderId,handler:async r=>{try{paymentStatus(flowText('Payment received. Verifying Payment…','Payment பெறப்பட்டது. Payment சரிபார்க்கப்படுகிறது…'));await authApi('/horoscope-payment/verify',{method:'POST',body:JSON.stringify({feature,reportKey:key,...r})});rememberPaidAccess(feature,key);paymentStatus(feature==='advanced_analysis'?flowText('Payment verified. Full Horoscope is starting…','Payment உறுதி செய்யப்பட்டது. முழு ஜாதகம் தொடங்குகிறது…'):flowText('Payment verified. Full Marriage Matching is starting…','Payment உறுதி செய்யப்பட்டது. முழு திருமணப் பொருத்தம் தொடங்குகிறது…'));settled=true;setTimeout(()=>closePaymentWindow(),850);resolve(true);}catch(e){fail(e);}},modal:{ondismiss:()=>fail(Error(flowText('Payment window was closed.','Payment window மூடப்பட்டது.')))},theme:{color:'#8b164e'}});rz.on?.('payment.failed',r=>fail(Error(r?.error?.description||'Payment failed.')));rz.open();});
}
function featureLabel(feature){return feature==='advanced_analysis'?flowText('Full Horoscope Report','முழு ஜாதக அறிக்கை'):flowText('Full Marriage Matching Report','முழு திருமணப் பொருத்த அறிக்கை');}
function featureIndex(feature){return feature==='advanced_analysis'?[flowText('I. Core Chart — D1, planetary positions, houses, lords and aspects','I. அடிப்படை ஜாதகம் — D1, கிரக நிலைகள், பாவங்கள், அதிபதிகள், பார்வைகள்'),flowText('II. Divisional Evidence — D2, D7, D9, D10 and supporting Vargas','II. வர்க்க ஆதாரம் — D2, D7, D9, D10 மற்றும் துணை வர்க்கங்கள்'),flowText('III. Special Strengths — Pushkara, Vargottama, Graha Yuddha, Yogi and special Lagnas','III. சிறப்பு பலங்கள் — புஷ்கர, வர்கோத்தம, கிரக யுத்தம், யோகி, சிறப்பு லக்னங்கள்'),flowText('IV. Arudha & Strength — Arudha, Drishti, Argala, Ashtakavarga and Shadbala','IV. ஆரூடம் & பலம் — ஆரூடம், திருஷ்டி, அர்களா, அஷ்டகவர்க்கம், ஷட்பலம்'),flowText('V. Dasa — Vimshottari MD/AD/PD, Ashtottari, Narayana and Kalachakra','V. தசை — விம்சோத்தரி MD/AD/PD, அஷ்டோத்தரி, நாராயண, காலசக்கரம்'),flowText('VI. Tajaka — aspects, yogas, Harsha Bala and Patyayini Dasa','VI. தாஜக — பார்வைகள், யோகங்கள், ஹர்ஷ பலம், பத்யாயினி தசை'),flowText('VII. Transit — Janma Rasi, Sudarshana, Kota and Sarvatobhadra','VII. கோச்சாரம் — ஜன்ம ராசி, சுதர்சன, கோட்ட, சர்வதோபத்ர'),flowText('VIII. Panchang & Annual Timing — selected-date and yearly timing layers','VIII. பஞ்சாங்கம் & வருட காலம் — தேர்ந்தெடுத்த தேதி மற்றும் வருட கால அடுக்குகள்'),flowText('IX. Remedies & Numerology — remedial guidance and number analysis','IX. பரிகாரம் & எண் கணிதம் — பரிகார வழிகாட்டல் மற்றும் எண் ஆய்வு')]:[flowText('1. Nakshatra Porutham — Dina, Gana, Mahendra, Sthree Deergha, Yoni, Rasi, Rasi Lord, Vasya, Rajju and Vedha','1. நட்சத்திரப் பொருத்தம் — தினம், கணம், மகேந்திரம், ஸ்திரீ தீர்க்கம், யோனி, ராசி, ராசி அதிபதி, வசியம், ரஜ்ஜு, வேதை'),flowText('2. Nadi & Moon-sign Relationship — Nadi rule, exceptions and Rasi relationship','2. நாடி & சந்திர ராசி உறவு — நாடி விதி, விலக்குகள் மற்றும் ராசி உறவு'),flowText('3. Lagna & 7th House — Lagna, 7th house/lord and spouse indicators','3. லக்னம் & 7-ஆம் பாவம் — லக்னம், 7-ஆம் பாவம்/அதிபதி மற்றும் துணைவர் குறியீடுகள்'),flowText('4. Venus, Jupiter & Moon — relationship, family and emotional strength','4. சுக்கிரன், குரு & சந்திரன் — உறவு, குடும்பம் மற்றும் மன பலம்'),flowText('5. Kuja/Mars Dosha — houses, intensity, Samyam and Bhanga','5. செவ்வாய் தோஷம் — பாவங்கள், தீவிரம், சாம்யம் மற்றும் பங்கம்'),flowText('6. Rahu/Ketu & Naga/Sarpa — nodal axis, Naga/Sarpa rule and mitigation','6. ராகு/கேது & நாக/சர்ப்பம் — அச்சு நிலை, நாக/சர்ப்ப விதி மற்றும் விலக்கு'),flowText('7. Kala Sarpa — degree-based enclosure check and exceptions','7. கால சர்ப்பம் — பாகை அடிப்படை அடைப்பு ஆய்வு மற்றும் விலக்குகள்'),flowText('8. Mangalya, Putra, Sukra & Kalathra — separate residual dosha review','8. மாங்கல்ய, புத்திர, சுக்கிர & களத்திர — தனித்தனி மீதமுள்ள தோஷ ஆய்வு'),flowText('9. Papasamyam & Dosha Balance — partner balance and residual pressure','9. பாபசாம்யம் & தோஷ சமநிலை — இருவர் சமநிலை மற்றும் மீதமுள்ள பாதிப்பு'),flowText('10. D1, D7 & D9 — natal, children and marriage supporting evidence','10. D1, D7 & D9 — பிறப்பு, குழந்தை மற்றும் திருமண துணை ஆதாரம்'),flowText('11. Dasha & Gochara — Dasha Sandhi, Dasha–Dosha sync and transit support','11. தசை & கோச்சாரம் — தசா சந்தி, தசா–தோஷ ஒத்திசைவு மற்றும் கோச்சார ஆதாரம்'),flowText('12. Numerology & Final Verdict — supporting number analysis, Match / Consultation / No Match evidence','12. எண் கணிதம் & இறுதி தீர்ப்பு — துணை எண் ஆய்வு, பொருத்தம் / ஆலோசனை / பொருத்தமில்லை ஆதாரம்')];}
function renderFeatureLock(feature,root,f,onUnlock,beforePay){if(!root)return;root.classList.remove('hidden');root.innerHTML=`<section class="smv-horoscope-pay-gate"><h3>${featureLabel(feature)}</h3><p>${flowText('Full-report index is shown below. Unlock the complete report for the configured price. Calculation remains in this browser.','முழு அறிக்கையின் INDEX கீழே காட்டப்படுகிறது. நிர்ணயிக்கப்பட்ட கட்டணத்தில் முழு அறிக்கையை திறக்கலாம். கணக்கீடு இந்த browser-லேயே நடைபெறும்.')}</p><p class="smv-lock-price"><b>${flowText('Full Report Payment','முழு அறிக்கை கட்டணம்')}: ₹${Number(f.price||0).toFixed(2)}</b></p><ul>${featureIndex(feature).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button type="button" data-smv-unlock>${flowText('Unlock Full Report — ₹','முழு அறிக்கை திறக்க — ₹')}${Number(f.price||0).toFixed(2)}</button><p data-smv-lock-msg></p></section>`;root.querySelector('[data-smv-unlock]')?.addEventListener('click',async e=>{const b=e.currentTarget,m=root.querySelector('[data-smv-lock-msg]');b.disabled=true;try{if(typeof beforePay==='function')await beforePay();await payForFeature(feature);root.innerHTML='';root.classList.add('hidden');if(typeof onUnlock==='function')await onUnlock();}catch(x){if(m)m.textContent=x.message||x;b.disabled=false;}});}
window.__smvGetHoroscopeFeatureConfig=getFeatureConfig;
window.__smvRenderFeatureLock=renderFeatureLock;
window.__smvHasPaidFeatureAccess=hasPaidAccess;
window.__smvRequireHoroscopeFeatureAccess=async(feature,gateRoot,onUnlock)=>{const cfg=await getFeatureConfig(true),f=cfg?.[feature]||FREE_CONFIG[feature];
 if(!state.user){if(gateRoot){gateRoot.innerHTML='';gateRoot.classList.add('hidden');}return false;}
 if(!f?.enabled){if(gateRoot){gateRoot.innerHTML='';gateRoot.classList.add('hidden');}return false;}
 if(Number(f.price??0)<=0){if(gateRoot){gateRoot.innerHTML='';gateRoot.classList.add('hidden');}return true;}
 if(await hasPaidAccess(feature)){if(gateRoot){gateRoot.innerHTML='';gateRoot.classList.add('hidden');}return true;}
 renderFeatureLock(feature,gateRoot,f,onUnlock);return false;};
window.__smvFeatureState=async feature=>{const cfg=await getFeatureConfig(true),f=cfg?.[feature]||FREE_CONFIG[feature],loggedIn=!!state.user,price=Number(f.price??0);let entitled=false;if(loggedIn&&f.enabled){entitled=price<=0||(await hasPaidAccess(feature));}return {loggedIn,enabled:!!f.enabled,price,free:!!f.enabled&&price<=0,entitled};};
window.__smvHoroscopeLoggedIn=()=>!!state.user;
window.__smvHoroscopeOwner=()=>state.user?{...state.user}:null;
window.__smvEnsureHoroscopeAuthReady=async()=>{await initLocalAuth();if(state.auth?.currentUser&&!state.user)await refreshLocalUser(state.auth.currentUser,false);return !!state.user;};
window.addEventListener('smv:report-ready',e=>{if(paymentFeature&&e.detail?.feature===paymentFeature){setTimeout(()=>{closePaymentWindow();e.detail?.root?.scrollIntoView?.({behavior:'auto',block:'start'});},350);}});
window.addEventListener('DOMContentLoaded',bindAuthUI);
window.addEventListener('smv-language',()=>renderAuthStatus());

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
  if(auth.currentUser){await refreshLocalUser(auth.currentUser,false)}
  return {auth,authMod};
 })();return state.authReady;
}
async function refreshLocalUser(u,verifyRole=true){
 if(!u){state.token='';state.user=null;renderAuthStatus();return false}
 await u.reload();
 if(!u.emailVerified){state.token='';state.user=null;state.epoch++;renderAuthStatus(ta()?'மின்னஞ்சல் சரிபார்ப்பு முடிந்த பிறகு Login செய்யவும்.':'Verify your email before logging in.');return false}
 const token=await u.getIdToken(true);
 if(verifyRole){const r=await fetch(state.backend+'/horoscope-auth/session',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.role!=='customer')throw Error(j.error||'Customer account is required.')}
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
const FALLBACK_CONFIG={advanced_analysis:{enabled:false,price:0},marriage_matching:{enabled:false,price:0}};
let featureConfigCache=null,featureConfigAt=0;
async function loadFeatureConfig(force=false){if(!force&&featureConfigCache&&Date.now()-featureConfigAt<60000)return featureConfigCache;try{const r=await fetch(state.backend+'/horoscope-feature/config',{cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j?.features)throw Error(j?.error||'Feature settings unavailable.');featureConfigCache=j.features;featureConfigAt=Date.now();return featureConfigCache;}catch(e){console.warn('Horoscope feature config unavailable; using safe restricted mode.',e);return featureConfigCache||FALLBACK_CONFIG;}}
window.__smvGetHoroscopeFeatureConfig=loadFeatureConfig;
function featureIndex(feature){return feature==='advanced_analysis'?[flowText('I. Core Chart — D1, planetary positions, houses, lords and aspects','I. அடிப்படை ஜாதகம் — D1, கிரக நிலைகள், பாவங்கள், அதிபதிகள், பார்வைகள்'),flowText('II. Divisional Evidence — D2, D7, D9, D10 and supporting Vargas','II. வர்க்க ஆதாரம் — D2, D7, D9, D10 மற்றும் துணை வர்க்கங்கள்'),flowText('III. Special Strengths — Pushkara, Vargottama, Graha Yuddha, Yogi and special Lagnas','III. சிறப்பு பலங்கள் — புஷ்கர, வர்கோத்தம, கிரக யுத்தம், யோகி, சிறப்பு லக்னங்கள்'),flowText('IV. Arudha & Strength — Arudha, Drishti, Argala, Ashtakavarga and Shadbala','IV. ஆரூடம் & பலம் — ஆரூடம், திருஷ்டி, அர்களா, அஷ்டகவர்க்கம், ஷட்பலம்'),flowText('V. Dasa — Vimshottari MD/AD/PD, Ashtottari, Narayana and Kalachakra','V. தசை — விம்சோத்தரி MD/AD/PD, அஷ்டோத்தரி, நாராயண, காலசக்கரம்'),flowText('VI. Tajaka — aspects, yogas, Harsha Bala and Patyayini Dasa','VI. தாஜக — பார்வைகள், யோகங்கள், ஹர்ஷ பலம், பத்யாயினி தசை'),flowText('VII. Transit — Janma Rasi, Sudarshana, Kota and Sarvatobhadra','VII. கோச்சாரம் — ஜன்ம ராசி, சுதர்சன, கோட்ட, சர்வதோபத்ர'),flowText('VIII. Panchang & Annual Timing — selected-date and yearly timing layers','VIII. பஞ்சாங்கம் & வருட காலம் — தேர்ந்தெடுத்த தேதி மற்றும் வருட கால அடுக்குகள்'),flowText('IX. Remedies & Numerology — remedial guidance and number analysis','IX. பரிகாரம் & எண் கணிதம் — பரிகார வழிகாட்டல் மற்றும் எண் ஆய்வு'),flowText('X. Predictions — career, marriage, children, finance, property, health, education and timing','X. பலன்கள் — தொழில், திருமணம், குழந்தைகள், பணம், சொத்து, உடல்நலம், கல்வி மற்றும் காலம்')]:[flowText('1. Nakshatra Porutham — Dina, Gana, Mahendra, Sthree Deergha, Yoni, Rasi, Rasi Lord, Vasya, Rajju and Vedha','1. நட்சத்திரப் பொருத்தம் — தினம், கணம், மகேந்திரம், ஸ்திரீ தீர்க்கம், யோனி, ராசி, ராசி அதிபதி, வசியம், ரஜ்ஜு, வேதை'),flowText('2. Nadi & Moon-sign Relationship — Nadi rule, exceptions and Rasi relationship','2. நாடி & சந்திர ராசி உறவு — நாடி விதி, விலக்குகள் மற்றும் ராசி உறவு'),flowText('3. Lagna & 7th House — Lagna, 7th house/lord and spouse indicators','3. லக்னம் & 7-ஆம் பாவம் — லக்னம், 7-ஆம் பாவம்/அதிபதி மற்றும் துணைவர் குறியீடுகள்'),flowText('4. Venus, Jupiter & Moon — relationship, family and emotional strength','4. சுக்கிரன், குரு & சந்திரன் — உறவு, குடும்பம் மற்றும் மன பலம்'),flowText('5. Kuja/Mars Dosha — houses, intensity, Samyam and Bhanga','5. செவ்வாய் தோஷம் — பாவங்கள், தீவிரம், சாம்யம் மற்றும் பங்கம்'),flowText('6. Rahu/Ketu & Naga/Sarpa — nodal axis, Naga/Sarpa rule and mitigation','6. ராகு/கேது & நாக/சர்ப்பம் — அச்சு நிலை, நாக/சர்ப்ப விதி மற்றும் விலக்கு'),flowText('7. Kala Sarpa — degree-based enclosure check and exceptions','7. கால சர்ப்பம் — பாகை அடிப்படை அடைப்பு ஆய்வு மற்றும் விலக்குகள்'),flowText('8. Mangalya, Putra, Sukra & Kalathra — separate residual dosha review','8. மாங்கல்ய, புத்திர, சுக்கிர & களத்திர — தனித்தனி மீதமுள்ள தோஷ ஆய்வு'),flowText('9. Papasamyam & Dosha Balance — partner balance and residual pressure','9. பாபசாம்யம் & தோஷ சமநிலை — இருவர் சமநிலை மற்றும் மீதமுள்ள பாதிப்பு'),flowText('10. D1, D7 & D9 — natal, children and marriage supporting evidence','10. D1, D7 & D9 — பிறப்பு, குழந்தை மற்றும் திருமண துணை ஆதாரம்'),flowText('11. Dasha & Gochara — Dasha Sandhi, Dasha–Dosha sync and transit support','11. தசை & கோச்சாரம் — தசா சந்தி, தசா–தோஷ ஒத்திசைவு மற்றும் கோச்சார ஆதாரம்'),flowText('12. Numerology & Final Verdict — supporting number analysis, Match / Consultation / No Match evidence','12. எண் கணிதம் & இறுதி தீர்ப்பு — துணை எண் ஆய்வு, பொருத்தம் / ஆலோசனை / பொருத்தமில்லை ஆதாரம்')];}
window.__smvFeatureIndex=featureIndex;
function lockedIndex(feature,host,cfg){if(!host)return;const isMatch=feature==='marriage_matching',price=Math.max(0,Number(cfg?.price||0)),items=featureIndex(feature);host.innerHTML=`<section class="smv-horoscope-pay-gate"><h3>${isMatch?(ta()?'முழு திருமணப் பொருத்த அறிக்கை':'Full Marriage Matching Report'):(ta()?'முழு ஜாதக மேம்பட்ட அறிக்கை':'Full Horoscope Advanced Report')}</h3><p>${ta()?'இந்த முழு அறிக்கை கட்டண முறையில் பூட்டப்பட்டுள்ளது. கீழே உள்ள அனைத்து முக்கிய உள்ளடக்கத் தலைப்புகளையும் பார்க்கலாம்; அவற்றின் விரிவான பலன்கள் திறக்கப்படாது.':'This full report is locked in paid mode. All major content and sub-content headings are shown below; detailed results remain locked.'}</p><p><b>₹${price.toFixed(2)}</b></p><ol>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p>${ta()?'Admin விலை ₹0 ஆக மாற்றினால் முழு அறிக்கை திறக்கும்.':'The full report opens when Admin changes the price to ₹0.'}</p></section>`;host.classList.remove('hidden');}
window.__smvRenderFeatureLock=(feature,host,cfg)=>lockedIndex(feature,host,cfg);
window.__smvRequireHoroscopeFeatureAccess=async(feature,host)=>{const all=await loadFeatureConfig(),cfg=all?.[feature]||FALLBACK_CONFIG[feature];if(!cfg?.enabled){if(host){host.innerHTML='';host.classList.add('hidden');}return false;}if(Number(cfg.price||0)<=0)return true;lockedIndex(feature,host,cfg);return false;};
window.__smvHoroscopeLoggedIn=()=>!!state.user;
window.__smvEnsureHoroscopeAuthReady=async()=>{await initLocalAuth();if(state.auth?.currentUser&&!state.user)await refreshLocalUser(state.auth.currentUser,false);return !!state.user;};
window.addEventListener('DOMContentLoaded',bindAuthUI);
window.addEventListener('smv-language',()=>renderAuthStatus());

// V61 — SMV Horoscope paid-feature gate. Core horoscope calculations remain offline-capable.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).replace(/\/$/,''),token:'',user:null,config:null,locks:new Map(),paid:new Set(),auth:null,authReady:null,accessCache:new Map(),accessPending:new Map(),epoch:0,contexts:new Map()};
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
 const status=host.querySelector('[data-auth-status]');if(status)status.textContent=message||(state.user?(ta()?'Customer Login செயலில் உள்ளது: ':'Customer logged in: ')+(state.user.email||''):(ta()?'கட்டண சேவைகளுக்கு இங்கே Login / Register செய்யவும்.':'Login or register here for paid horoscope services.'));
 host.classList.toggle('is-logged-in',!!state.user);
}
function showAuthForm(mode='login'){const host=document.getElementById('smvHoroscopeAuth');if(!host)return;host.dataset.mode=mode;host.querySelector('[data-auth-form]')?.removeAttribute('hidden');host.querySelector('[data-name-row]')?.toggleAttribute('hidden',mode==='login');host.querySelector('[data-phone-row]')?.toggleAttribute('hidden',mode==='login');const submit=host.querySelector('[data-auth-submit]');if(submit)submit.textContent=mode==='login'?(ta()?'LOGIN':'LOGIN'):(ta()?'REGISTER':'REGISTER');host.scrollIntoView({behavior:'smooth',block:'center'});}
async function loginLocal(){const host=document.getElementById('smvHoroscopeAuth'),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!email||!password)throw Error(ta()?'Email மற்றும் Password தேவை.':'Email and password are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.signInWithEmailAndPassword(auth,email,password);await refreshLocalUser(c.user,true);host.querySelector('[data-auth-form]')?.setAttribute('hidden','');}
async function registerLocal(){const host=document.getElementById('smvHoroscopeAuth'),name=host.querySelector('[data-name]')?.value.trim(),phone=host.querySelector('[data-phone]')?.value.trim(),email=host.querySelector('[data-email]')?.value.trim(),password=host.querySelector('[data-password]')?.value||'';if(!name||!phone||!email||password.length<6)throw Error(ta()?'பெயர், செல்லுபடியாகும் மொபைல், Email மற்றும் குறைந்தது 6 எழுத்து Password தேவை.':'Name, valid mobile, email and a password of at least 6 characters are required.');const {auth,authMod}=await initLocalAuth();const c=await authMod.createUserWithEmailAndPassword(auth,email,password);try{const token=await c.user.getIdToken();const r=await fetch(state.backend+'/register-customer-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({name,phone,language:ta()?'ta':'en'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Customer profile registration failed.');await authMod.sendEmailVerification(c.user);await authMod.signOut(auth);state.token='';state.user=null;renderAuthStatus(ta()?'Verification email அனுப்பப்பட்டது. Verify செய்த பிறகு Login செய்யவும்.':'Verification email sent. Verify it, then login here.');}catch(e){try{await c.user.delete()}catch(_){}throw e}}
async function logoutLocal(){try{sessionStorage.removeItem('smv-offline-owner')}catch{}const {auth,authMod}=await initLocalAuth();await authMod.signOut(auth);state.token='';state.user=null;state.paid.clear();state.accessCache.clear();state.accessPending.clear();state.epoch++;for(const id of ['englishHoroscopeResult','tamilHoroscopeResult']){const el=document.getElementById(id);if(el){el.replaceChildren();el.classList.add('hidden');}}renderAuthStatus();window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:false}}));}
function bindAuthUI(){const host=document.getElementById('smvHoroscopeAuth');if(!host||host.dataset.bound==='1')return;host.dataset.bound='1';host.querySelector('[data-login]')?.addEventListener('click',()=>showAuthForm('login'));host.querySelector('[data-register]')?.addEventListener('click',()=>showAuthForm('register'));host.querySelector('[data-logout]')?.addEventListener('click',()=>logoutLocal().catch(e=>renderAuthStatus(e.message)));host.querySelector('[data-auth-submit]')?.addEventListener('click',async()=>{const b=host.querySelector('[data-auth-submit]');b.disabled=true;try{host.dataset.mode==='register'?await registerLocal():await loginLocal()}catch(e){renderAuthStatus(e.message||String(e))}finally{b.disabled=false}});initLocalAuth().then(()=>renderAuthStatus()).catch(e=>{if(!navigator.onLine){try{state.user=JSON.parse(sessionStorage.getItem('smv-offline-owner')||'null');if(state.user)window.dispatchEvent(new CustomEvent('smv:horoscope-local-auth',{detail:{loggedIn:true,offline:true}}));}catch{}}renderAuthStatus(e.message||String(e));});}
async function authHeaders(){if(state.auth?.currentUser&&state.user?.uid===state.auth.currentUser.uid)state.token=await state.auth.currentUser.getIdToken();return {'Content-Type':'application/json',...(state.token?{Authorization:'Bearer '+state.token}:{})};}
async function api(path,opt={}){const r=await fetch(state.backend+path,{...opt,cache:'no-store',headers:{...await authHeaders(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||('Request failed: '+r.status));return j}
function reportContext(feature){const value=state.contexts.get(feature);if(!value)throw Error(ta()?'முதலில் பிறந்த விவரங்களை உள்ளிடவும்.':'Enter the birth details first.');return value;}
function reportCacheKey(feature){return window.SMVReportIdentity.canonical(feature,reportContext(feature));}
window.__smvSetReportContext=(feature,value)=>{window.SMVReportIdentity.canonical(feature,value);state.contexts.set(feature,JSON.parse(JSON.stringify(value)));};
window.__smvGetReportContext=reportContext;
window.__smvHoroscopeApi=api;
function markPaid(feature,key=reportCacheKey(feature)){state.paid.add(key);state.accessCache.set(key,{enabled:true,unlocked:true,free:false});window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature,key}}));}
async function config(){if(state.config)return state.config;await initLocalAuth().catch(()=>{});try{state.config=(await api('/horoscope-feature/config')).features||{};}catch(e){console.warn('Paid feature config unavailable; offline horoscope remains enabled.',e);state.config={advanced_analysis:{enabled:false,price:0,serviceUnavailable:true},marriage_matching:{enabled:false,price:0,serviceUnavailable:true}};}return state.config}
function fragmentLock(el){if(!el||state.locks.has(el))return;const f=document.createDocumentFragment();while(el.firstChild)f.appendChild(el.firstChild);state.locks.set(el,f)}
function fragmentUnlock(el){const f=state.locks.get(el);if(!f)return;el.replaceChildren(f);state.locks.delete(el)}
function money(n){return '₹'+Number(n||0).toFixed(2)}
async function ensureCheckout(){if(typeof window.Razorpay==='function')return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(Error('Razorpay checkout could not load.'));document.head.appendChild(s)})}
async function buy(feature,button,onUnlocked){
 if(!state.token){showAuthForm('login');return;}
 const birthIdentity=reportContext(feature),key=reportCacheKey(feature);
 const inputs=[...document.querySelectorAll(feature==='marriage_matching'?'#smvMarriageMatching input':'#english-horoscope input,#english-horoscope select')].filter(e=>!e.disabled);inputs.forEach(e=>e.disabled=true);
 const old=button.textContent,epoch=state.epoch,reset=()=>{inputs.forEach(e=>e.disabled=false);button.disabled=false;button.textContent=old;},fail=e=>{console.error(e);alert(e.message||String(e));reset();};
 button.disabled=true;button.textContent=ta()?'கட்டணம் தயாராகிறது…':'Preparing payment…';
 const unlock=async paid=>{if(epoch!==state.epoch)throw Error('Account changed. Log in to the paying account to restore access.');if(paid)markPaid(feature,key);if(key!==reportCacheKey(feature))throw Error('Birth details changed during payment. Reopen the paid birth details.');await onUnlocked();};
 try{
  const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature,birthIdentity})});
  if(o.free||o.alreadyPaid||o.unlocked){await unlock(!o.free);reset();return;}
  await ensureCheckout();if(epoch!==state.epoch)throw Error('Account changed before checkout. Please try again.');
  const rz=new Razorpay({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Advanced Horoscope Analysis':'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature},retry:{enabled:false},handler:async r=>{
   try{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature,birthIdentity,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification is pending. Log in again to restore the paid access; do not pay again.');await unlock(true);reset();}catch(e){fail(e);}
  },modal:{ondismiss:reset}});rz.on('payment.failed',r=>fail(Error(r?.error?.description||'Payment failed.')));rz.open();
 }catch(e){fail(e);}
}
function payCard(feature,price,onUnlocked,singleLayer=false){const box=document.createElement('div');box.className=(singleLayer?'smv-horoscope-pay-gate smv-horoscope-pay-gate-single':'card smv-horoscope-pay-gate');box.dataset.feature=feature;const title=feature==='advanced_analysis'?(ta()?'மேம்பட்ட ஜாதக ஆய்வு':'Advanced Horoscope Analysis'):(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching');const note=feature==='advanced_analysis'?(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு இந்த அம்சங்களின் முழுமையான கணக்கீடுகள் மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete calculations and results for these features will be shown after successful payment.'):(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு முழுமையான திருமணப் பொருத்த கணக்கீடு மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete Marriage Matching calculations and results will be shown after successful payment.');box.innerHTML=`<h3>${esc(title)}</h3><p class="small"><b>${money(price)}</b></p><button class="btn" type="button">${ta()?money(price)+' செலுத்தி திறக்க':'Pay '+money(price)+' & Unlock'}</button><p class="small">${esc(note)}</p>`;const b=box.querySelector('button');b.onclick=()=>buy(feature,b,async()=>{await onUnlocked();box.remove()});return box}
async function access(feature,cfg){
 if(!cfg.enabled)return {enabled:false,unlocked:false};
 if(Number(cfg.price||0)<=0)return {enabled:true,unlocked:true,free:true};
 if(!state.token)await initLocalAuth().catch(()=>{});
 if(!state.token)return {enabled:true,unlocked:false,price:cfg.price};
 const key=reportCacheKey(feature),birthIdentity=reportContext(feature);
 if(state.accessCache.has(key))return state.accessCache.get(key);
 if(state.accessPending.has(key))return state.accessPending.get(key);
 const epoch=state.epoch;
 const promise=(async()=>{const out=await api('/horoscope-feature/access?feature='+encodeURIComponent(feature)+'&birthIdentity='+encodeURIComponent(JSON.stringify(birthIdentity)));if(epoch!==state.epoch)return {enabled:true,unlocked:false,price:cfg.price};state.accessCache.set(key,out);if(out.unlocked&&!out.free)markPaid(feature,key);return out;})();
 state.accessPending.set(key,promise);try{return await promise;}finally{if(state.accessPending.get(key)===promise)state.accessPending.delete(key);}
}
async function gateAdvanced(root){
 const cfg=(await config()).advanced_analysis||{enabled:true,price:0};
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
 // Birth fields must remain available before payment so each order can bind to a pair.
 const sec=document.getElementById('smvMarriageMatching');if(sec){fragmentUnlock(sec);sec.hidden=false;}
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
 ['IX','தெய்வங்கள்',['ஜாதக ஆதார தெய்வ வழிகாட்டல்']],
 ['X','ஒருங்கிணைந்த பலன்கள்',['20 வாழ்க்கைப் பகுதிகளின் ஒருங்கிணைந்த பலன்கள்','1. விரிவான தசா–புக்தி பலன்கள் — அடுத்த 15 ஆண்டுகள்','2. விரிவான கோச்சார பலன்கள் — அடுத்த 15 ஆண்டுகள்']]
 ]:[
 ['I','CHART ANALYSIS',['Bhava Special Features','Special Lagnas','Arudha Padas A1–A12','Graha / Rasi Drishti','Ashtakavarga / strengths / yogas']],
 ['II','DASA ANALYSIS',['Ashtottari','Narayana Dasa','Lagna Kendradi','Sudasa / Drig Dasa','Kalachakra Dasa']],
 ['III','TAJAKA ANALYSIS',['Tajaka aspects','Tajaka yogas','Harsha Bala','Pratyayini Dasa']],
 ['IV','TRANSIT ANALYSIS',['Sudarshana Chakra','Kota Chakra','Sarvatobhadra Chakra','Janma Rasi Transit']],
 ['V','REMEDIAL MEASURES',['Chart-based remedial guidance']],
 ['VI','NUMEROLOGY',['Birth number','Life-path number','Name number']],
 ['VII','DAILY LIFE MANTRAS',['Chart-based daily mantras']],
 ['VIII','ADHIDEVATAS',['Planet/chart-based Adhidevata review']],
 ['IX','DEITIES',['Chart-based deity guidance']],
 ['X','INTEGRATED PREDICTIONS',['20 life-domain integrated predictions','1. Detailed Dasha–Bhukti Results — Next 15 Years','2. Detailed Transit Results — Next 15 Years']]
 ];
 return `<div class="smv-paid-heading-preview smv-paid-i-x-preview"><h3>${esc(ta()?'மேம்பட்ட பகுப்பாய்வு — உள்ளடக்கம்':'Advanced Analysis — Contents')}</h3>${rows.map(([r,t,subs])=>`<div class="smv-preview-part"><b>${r}. ${esc(t)}</b><ul>${subs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
}
async function requireFeature(feature,mount,onFeatureUnlocked){
 const cfg=(await config())[feature]||{enabled:true,price:0};
 if(!cfg.enabled){if(mount)mount.replaceChildren();return false;}
 const requestedKey=reportCacheKey(feature),a=await access(feature,cfg);if(requestedKey!==reportCacheKey(feature))return false;
 if(a.unlocked)return true;
 if(a.legacyNeedsLink){if(mount){mount.replaceChildren();const note=document.createElement('p');note.textContent=ta()?'முந்தைய கட்டணத்திற்கு அசல் பிறந்த விவரங்களை நிர்வாகி இணைக்க வேண்டும். மீண்டும் கட்டணம் செலுத்த வேண்டாம்.':a.error;mount.append(note);}return false;}
 if(!mount)return false;
 mount.innerHTML=feature==='advanced_analysis'?advancedPreviewHtml():'';
 const card=payCard(feature,cfg.price,async()=>{
   mount.innerHTML='';
   if(typeof onFeatureUnlocked==='function') await onFeatureUnlocked();
   window.dispatchEvent(new CustomEvent('smv:horoscope-feature-unlocked',{detail:{feature,handled:typeof onFeatureUnlocked==='function'}}));
 });
 mount.appendChild(card);
 // IMPORTANT: do not keep the main Horoscope generation Promise pending while the
 // user is deciding whether to pay. Core Horoscope is complete at this point.
 return false;
}
async function downloadPaidPdf(feature,source,title){
 if(!state.paid.has(reportCacheKey(feature)))throw Error('Verified paid access is required for PDF download.');
 if(source?.__smvPrepareReport)await source.__smvPrepareReport();
 const clone=source?.cloneNode(true);if(!clone)throw Error('Generate the report before downloading.');clone.querySelectorAll('button,script,style,.smv-horoscope-pay-gate').forEach(e=>e.remove());
 clone.querySelectorAll('p,div,section,tr,h1,h2,h3,h4,h5,li,summary').forEach(e=>e.appendChild(document.createTextNode('\n')));const text=String(clone.textContent||'').replace(/\n{3,}/g,'\n\n').trim();if(!text)throw Error('The report is empty.');
 const r=await fetch(state.backend+'/horoscope-feature/pdf',{method:'POST',cache:'no-store',headers:await authHeaders(),body:JSON.stringify({feature,birthIdentity:reportContext(feature),language:source?.dataset.resultLanguage||(ta()?'ta':'en'),title,text})});
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'PDF download failed.');}
 const blob=await r.blob();if(!blob.size||!String(r.headers.get('content-type')).includes('application/pdf'))throw Error('The server did not return a complete PDF.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=feature==='marriage_matching'?'SMV-Marriage-Matching.pdf':'SMV-Horoscope.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true;
}
window.__smvDownloadPaidFeaturePdf=downloadPaidPdf;
window.__smvIsPaidHoroscopeFeature=feature=>{try{return state.paid.has(reportCacheKey(feature));}catch{return false;}};
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{bindAuthUI();config().then(()=>gateMarriage()).catch(()=>{});});
window.addEventListener('smv:horoscope-local-auth',()=>{gateMarriage().catch(e=>renderAuthStatus(e.message));});
window.__smvHoroscopePaidState=state;

window.addEventListener('smv:marriage-mounted',()=>gateMarriage().catch(e=>renderAuthStatus(e.message)));

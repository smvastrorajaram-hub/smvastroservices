// V61 — SMV Horoscope paid-feature gate. Core horoscope calculations remain offline-capable.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).replace(/\/$/,''),token:'',user:null,config:null,locks:new Map(),paid:new Set(),auth:null,authReady:null};
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
 try{const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature})});if(o.free||o.alreadyPaid||o.unlocked){if(!o.free){state.paid.add(feature);window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));}await onUnlocked();return}await ensureCheckout();const rz=new Razorpay({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Advanced Horoscope Analysis':'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature},retry:{enabled:false},handler:async r=>{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification failed.');state.paid.add(feature);window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));await onUnlocked();},modal:{ondismiss:()=>{button.disabled=false;button.textContent=old}}});rz.on('payment.failed',r=>{alert(r?.error?.description||'Payment failed.');button.disabled=false;button.textContent=old});rz.open()}catch(e){console.error(e);alert(e.message||String(e));button.disabled=false;button.textContent=old}}
function payCard(feature,price,onUnlocked,singleLayer=false){const box=document.createElement('div');box.className=(singleLayer?'smv-horoscope-pay-gate smv-horoscope-pay-gate-single':'card smv-horoscope-pay-gate');box.dataset.feature=feature;const title=feature==='advanced_analysis'?(ta()?'மேம்பட்ட ஜாதக ஆய்வு':'Advanced Horoscope Analysis'):(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching');const note=feature==='advanced_analysis'?(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு இந்த அம்சங்களின் முழுமையான கணக்கீடுகள் மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete calculations and results for these features will be shown after successful payment.'):(ta()?'கட்டணம் வெற்றிகரமாக செலுத்திய பிறகு முழுமையான திருமணப் பொருத்த கணக்கீடு மற்றும் பலன்கள் காண்பிக்கப்படும்.':'Complete Marriage Matching calculations and results will be shown after successful payment.');box.innerHTML=`<h3>${esc(title)}</h3><p class="small"><b>${money(price)}</b></p><button class="btn" type="button">${ta()?money(price)+' செலுத்தி திறக்க':'Pay '+money(price)+' & Unlock'}</button><p class="small">${esc(note)}</p>`;const b=box.querySelector('button');b.onclick=()=>buy(feature,b,async()=>{await onUnlocked();box.remove()});return box}
async function access(feature,cfg){if(!cfg.enabled)return {enabled:false,unlocked:false};if(Number(cfg.price||0)<=0)return {enabled:true,unlocked:true,free:true};if(!state.token)await initLocalAuth().catch(()=>{});if(!state.token)return {enabled:true,unlocked:false,price:cfg.price};try{const out=await api('/horoscope-feature/access?feature='+encodeURIComponent(feature));if(out.unlocked&&!out.free){state.paid.add(feature);window.dispatchEvent(new CustomEvent('smv:horoscope-paid-access',{detail:{feature}}));}return out}catch(_){return {enabled:true,unlocked:false,price:cfg.price}}}
async function gateAdvanced(root){
 const cfg=(await config()).advanced_analysis||{enabled:true,price:0};
 const parts=[...root.querySelectorAll('.smv-advanced-part')].filter(x=>!x.classList.contains('detailed-dasha-predictions')&&!x.classList.contains('detailed-transit-predictions')).slice(0,10);
 if(!parts.length)return;
 if(!cfg.enabled){parts.forEach(p=>p.hidden=true);return}
 const a=await access('advanced_analysis',cfg);if(a.unlocked)return;
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
 const sec=document.getElementById('smvMarriageMatching');if(!sec)return;
 const cfg=(await config()).marriage_matching||{enabled:true,price:0};
 if(!cfg.enabled){sec.hidden=true;sec.replaceChildren();return}
 const a=await access('marriage_matching',cfg);if(a.unlocked)return;
 fragmentLock(sec);
 const preview=document.createElement('div');preview.className='smv-marriage-preview';preview.innerHTML=`<h2>${esc(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching')}</h2><ul>${(ta()?['தமிழ் தசப் பொருத்தம்','லக்னம் & 7-ஆம் பாவ ஆய்வு','செவ்வாய் / குஜ தோஷ சாம்யம்','தோஷம் & தோஷ விலக்கு','பாபசாம்யம்','விம்சோத்தரி தசா சந்தி','கோச்சார திருமண கால ஆய்வு','எண் கணித துணை ஆய்வு']:['Tamil Dasa Porutham','Lagna & 7th-house review','Mars / Kuja Dosha Samyam','Dosha & cancellation review','Papasamyam','Vimshottari Dasha Sandhi','Marriage transit timing review','Numerology support']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 sec.append(preview);
 const card=payCard('marriage_matching',cfg.price,async()=>{fragmentUnlock(sec);sec.hidden=false},true);sec.append(card)
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
 const a=await access(feature,cfg);
 if(a.unlocked)return true;
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
 if(!state.paid.has(feature))return false;
 const text=String(source?.innerText||source?.textContent||'').trim();if(!text)return false;
 const r=await fetch(state.backend+'/horoscope-feature/pdf',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.token},body:JSON.stringify({feature,language:ta()?'ta':'en',title,text})});
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'PDF download failed.')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=feature==='marriage_matching'?'SMV-Marriage-Matching.pdf':'SMV-Horoscope.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
}
window.__smvDownloadPaidFeaturePdf=downloadPaidPdf;
window.__smvIsPaidHoroscopeFeature=feature=>state.paid.has(feature);
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{bindAuthUI();config().then(()=>gateMarriage()).catch(()=>{});});
window.__smvHoroscopePaidState=state;

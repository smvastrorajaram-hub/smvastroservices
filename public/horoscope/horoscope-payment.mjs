// V61 — SMV Horoscope paid-feature gate. Core horoscope calculations remain offline-capable.
const DEFAULT_BACKEND='https://smvastroservices.onrender.com';
const state={backend:String(window.SMV_BACKEND_URL||DEFAULT_BACKEND).replace(/\/$/,''),token:'',user:null,config:null,locks:new Map()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ta=()=>document.documentElement.lang==='ta'||document.body.classList.contains('tamil-mode');
async function bridge(){
 if(!window.opener||window.opener.closed)return;
 const requestId='h_'+Date.now()+'_'+Math.random().toString(36).slice(2);
 const result=await new Promise(resolve=>{const timer=setTimeout(()=>{window.removeEventListener('message',on);resolve(null)},1800);function on(e){if(e.origin!==location.origin||e.data?.type!=='SMV_HOROSCOPE_AUTH_RESPONSE'||e.data?.requestId!==requestId)return;clearTimeout(timer);window.removeEventListener('message',on);resolve(e.data)}window.addEventListener('message',on);try{window.opener.postMessage({type:'SMV_HOROSCOPE_AUTH_REQUEST',requestId},location.origin)}catch(_){clearTimeout(timer);resolve(null)}});
 if(result){state.backend=String(result.backend||state.backend||'').replace(/\/$/,'');state.token=result.token||'';state.user=result.user||null;}
}
async function api(path,opt={}){const r=await fetch(state.backend+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json',...(opt.headers||{}),...(state.token?{Authorization:'Bearer '+state.token}:{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||('Request failed: '+r.status));return j}
async function config(){if(state.config)return state.config;await bridge();try{state.config=(await api('/horoscope-feature/config')).features||{};}catch(e){console.warn('Paid feature config unavailable; offline horoscope remains enabled.',e);state.config={advanced_analysis:{enabled:false,price:0,serviceUnavailable:true},marriage_matching:{enabled:false,price:0,serviceUnavailable:true}};}return state.config}
function fragmentLock(el){if(!el||state.locks.has(el))return;const f=document.createDocumentFragment();while(el.firstChild)f.appendChild(el.firstChild);state.locks.set(el,f)}
function fragmentUnlock(el){const f=state.locks.get(el);if(!f)return;el.replaceChildren(f);state.locks.delete(el)}
function money(n){return '₹'+Number(n||0).toFixed(2)}
async function ensureCheckout(){if(typeof window.Razorpay==='function')return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(Error('Razorpay checkout could not load.'));document.head.appendChild(s)})}
async function buy(feature,button,onUnlocked){
 if(!state.token){await bridge();if(!state.token){alert(ta()?'கட்டணம் செலுத்த SMV ASTRO Customer Login மூலம் Horoscope திறக்கவும்.':'Open Horoscope from your logged-in SMV ASTRO Customer account to pay.');return}}
 const old=button.textContent;button.disabled=true;button.textContent=ta()?'கட்டணம் தயாராகிறது…':'Preparing payment…';
 try{const o=await api('/horoscope-feature/create-order',{method:'POST',body:JSON.stringify({feature})});if(o.free||o.alreadyPaid||o.unlocked){await onUnlocked();return}await ensureCheckout();const rz=new Razorpay({key:o.keyId,amount:o.amount,currency:o.currency||'INR',name:'SMV ASTRO SERVICES',description:feature==='advanced_analysis'?'Advanced Horoscope Analysis':'Marriage Matching',order_id:o.orderId,prefill:{email:state.user?.email||''},notes:{feature},handler:async r=>{button.textContent=ta()?'சரிபார்க்கப்படுகிறது…':'Verifying…';const v=await api('/horoscope-feature/verify-payment',{method:'POST',body:JSON.stringify({feature,razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature})});if(!v.verified)throw Error('Payment verification failed.');await onUnlocked();},modal:{ondismiss:()=>{button.disabled=false;button.textContent=old}}});rz.on('payment.failed',r=>{alert(r?.error?.description||'Payment failed.');button.disabled=false;button.textContent=old});rz.open()}catch(e){console.error(e);alert(e.message||String(e));button.disabled=false;button.textContent=old}}
function payCard(feature,price,onUnlocked){const box=document.createElement('div');box.className='card smv-horoscope-pay-gate';box.dataset.feature=feature;const title=feature==='advanced_analysis'?(ta()?'மேம்பட்ட ஜாதக ஆய்வு':'Advanced Horoscope Analysis'):(ta()?'முழு ஜாதக திருமணப் பொருத்தம்':'Full Horoscope Marriage Matching');box.innerHTML=`<h3>${esc(title)}</h3><p class="small">${ta()?'Admin நிர்ணயித்த கட்டணம்: ':'Admin-set price: '}<b>${money(price)}</b></p><button class="btn" type="button">${ta()?money(price)+' செலுத்தி திறக்க':'Pay '+money(price)+' & Unlock'}</button>`;const b=box.querySelector('button');b.onclick=()=>buy(feature,b,async()=>{await onUnlocked();box.remove()});return box}
async function access(feature,cfg){if(!cfg.enabled)return {enabled:false,unlocked:false};if(Number(cfg.price||0)<=0)return {enabled:true,unlocked:true,free:true};if(!state.token)await bridge();if(!state.token)return {enabled:true,unlocked:false,price:cfg.price};try{return await api('/horoscope-feature/access?feature='+encodeURIComponent(feature))}catch(_){return {enabled:true,unlocked:false,price:cfg.price}}}
async function gateAdvanced(root){const cfg=(await config()).advanced_analysis||{enabled:true,price:0};const parts=[...root.querySelectorAll('.smv-advanced-part')].filter(x=>!x.classList.contains('detailed-dasha-predictions')&&!x.classList.contains('detailed-transit-predictions')).slice(0,10);if(!parts.length)return;if(!cfg.enabled){parts.forEach(p=>p.hidden=true);return}const a=await access('advanced_analysis',cfg);if(a.unlocked)return;const contents=parts.map(p=>p.querySelector('.smv-advanced-part-content')).filter(Boolean);contents.forEach(fragmentLock);const preview=parts.map((p,i)=>`${i+1}. ${(p.querySelector('.smv-advanced-part-title')||p.querySelector('h3,h4')||{}).textContent||''}`.trim()).filter(Boolean);const card=payCard('advanced_analysis',cfg.price,async()=>{contents.forEach(fragmentUnlock);parts.forEach(p=>p.hidden=false)});if(preview.length)card.insertAdjacentHTML('beforeend',`<p class="small">${esc(ta()?'கட்டணம் செய்தால் கிடைக்கும் பகுதிகள்: ':'Included after payment: ')}${preview.map(esc).join(' · ')}</p>`);parts[0].before(card)}
async function gateMarriage(){const sec=document.getElementById('smvMarriageMatching');if(!sec)return;const cfg=(await config()).marriage_matching||{enabled:true,price:0};if(!cfg.enabled){sec.hidden=true;return}const a=await access('marriage_matching',cfg);if(a.unlocked)return;fragmentLock(sec);const card=payCard('marriage_matching',cfg.price,async()=>{fragmentUnlock(sec);sec.hidden=false});sec.append(card)}
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
 return await new Promise(resolve=>{
   mount.innerHTML='';
   const card=payCard(feature,cfg.price,async()=>{mount.innerHTML='';resolve(true)});
   card.insertAdjacentHTML('beforeend',`<p class="small">${esc(ta()?'கட்டணம் வெற்றிகரமாக சரிபார்க்கப்பட்ட பிறகே இந்த கணக்கீடு தொடங்கும்.':'This calculation starts only after payment is verified.')}</p>`);
   mount.appendChild(card);
 });
}
window.__smvRequireHoroscopeFeatureAccess=requireFeature;
window.__smvGetHoroscopeFeatureConfig=config;
window.addEventListener('smv:horoscope-full-ready',ev=>{setTimeout(()=>{const root=document.getElementById(ev.detail?.rootId);if(root)gateAdvanced(root).catch(console.warn);gateMarriage().catch(console.warn)},0)});
// Marriage matching exists before a horoscope is generated too.
window.addEventListener('DOMContentLoaded',()=>{config().then(()=>gateMarriage()).catch(()=>{})});

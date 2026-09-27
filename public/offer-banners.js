/* Shared public presentation cache. Payment eligibility remains server-authoritative. */
(function(){
 'use strict';
 const themes=['generic','welcome','pongal','diwali','navaratri','dasara','ayudha_pooja','shivaratri','tamil_new_year','vinayagar_chaturthi','karthigai_deepam','thaipusam','new_year','onam','christmas','eid'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let cache=null,expires=0,flight=null,timer=null;
 function theme(o){
  if(themes.includes(o.bannerTheme))return o.bannerTheme;
  const text=[o.kind,o.name,o.bannerText].join(' ').toLowerCase();
  const patterns=[['welcome',/welcome|first.*₹?1/],['pongal',/pongal/],['diwali',/diwali|deepavali/],['navaratri',/navara/],['dasara',/dasara|dussehra|vijayadashami/],['ayudha_pooja',/ayudha|ayutha/],['shivaratri',/shivaratri|sivarathri|maha shiva/],['tamil_new_year',/tamil new year|puthandu/],['vinayagar_chaturthi',/vinayag|ganesh/],['karthigai_deepam',/karthigai|deepam/],['thaipusam',/thaipusam|thaipoosam/],['onam',/onam/],['christmas',/christmas/],['eid',/eid|ramzan/],['new_year',/new year/]];
  return patterns.find(([,re])=>re.test(text))?.[0]||'generic';
 }
 const active=o=>(!o.startAt||Date.parse(o.startAt)<=Date.now())&&(!o.endAt||Date.parse(o.endAt)>Date.now());
 async function getOffers(force=false){
  if(!force&&cache&&Date.now()<expires)return cache.filter(active);
  if(flight)return flight;
  flight=(async()=>{
   const base=String(window.SMV_BACKEND_URL||document.documentElement.dataset.smvBackend||'https://smv-astro-1fco.onrender.com').replace(/\/$/,'');
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const r=await fetch(base+'/offers/public-banners',{signal:controller.signal,headers:{Accept:'application/json'}});
    const d=await r.json();if(!r.ok)throw Error(d.error||'Offers unavailable');
    cache=Array.isArray(d.offers)?d.offers:[];expires=Date.now()+60000;return cache.filter(active);
   }finally{clearTimeout(timeout);}
  })().finally(()=>{flight=null;});return flight;
 }
 function date(v){if(!v||!Number.isFinite(Date.parse(v)))return '';return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v));}
 function badge(o){if(o.discountType==='fixed_price')return '₹'+Number(o.offerPrice)+' SPECIAL';if(o.discountType==='percentage')return Number(o.discountValue)+'% OFF';if(o.discountType==='flat')return '₹'+Number(o.discountValue)+' OFF';return 'SPECIAL OFFER';}
 function markup(o){
  const t=theme(o),start=date(o.startAt),end=date(o.endAt),period=[start,end].filter(Boolean).join(' – ');
  return `<div class="smv-home-offer-banner smv-offer-theme-${t}" role="button" tabindex="0" aria-label="${esc(o.bannerText||o.name)}. Ask a Question" data-offer-id="${esc(o.id)}"${o.endAt?` data-offer-expiry="${esc(o.endAt)}"`:''}><span class="smv-offer-art" aria-hidden="true"><img src="assets/offers/${t}.svg" alt=""></span><span class="smv-offer-copy"><span class="smv-offer-kicker"><span class="smv-offer-badge">${esc(badge(o))}</span><span class="smv-offer-name">${esc(o.name)}</span></span><strong class="smv-offer-title">${esc(o.bannerText||o.name||'Special Offer')}</strong><span class="smv-offer-meta">${period?`<span class="smv-offer-period">${esc(period)} IST</span>`:''}${!o.automatic&&o.promoCode?`<span class="smv-offer-code">Promo: ${esc(o.promoCode)}</span>`:''}${end?`<span class="smv-offer-countdown" data-offer-end="${esc(o.endAt)}"></span>`:''}</span></span><span class="smv-offer-cta"><span>ASK NOW</span> →</span></div>`;
 }
 function tick(){
  document.querySelectorAll('[data-offer-expiry]').forEach(el=>{if(Date.parse(el.dataset.offerExpiry)<=Date.now())el.remove();});
  document.querySelectorAll('[data-offer-end]').forEach(el=>{const mins=Math.max(0,Math.ceil((Date.parse(el.dataset.offerEnd)-Date.now())/60000));el.textContent=Math.floor(mins/1440)+'d '+Math.floor(mins%1440/60)+'h '+mins%60+'m left';});
 }
 function render(host,offers,surface,open){
  // Respect Admin visibility settings. Same renderer, artwork, dates and shadow on both surfaces.
  const modes=surface==='customer_dashboard'?['customer_dashboard','home_dashboard']:['home_banner','home_dashboard'];
  host.innerHTML=offers.filter(o=>active(o)&&modes.includes(o.displayMode)).map(markup).join('');host.classList.toggle('hidden',!host.children.length);
  host.querySelectorAll('[data-offer-id]').forEach(el=>{el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
  tick();if(!timer)timer=setInterval(tick,60000); // DOM countdown only; zero network reads.
 }
 async function home(force=false){const host=document.getElementById('smvHomeOfferBanners');if(!host)return;try{render(host,await getOffers(force),'home_banner',()=>window.__smvOpenQuestionService?.());}catch(e){console.warn('Offer banner unavailable:',e.message);}}
 window.SMVOfferBanners={getOffers,render,markup,theme,themes};
 window.addEventListener('smv:offers-changed',async()=>{expires=0;await home(true);document.querySelectorAll('.smv-customer-offer-banners').forEach(host=>render(host,cache||[],'customer_dashboard',()=>window.__smvOpenQuestionService?.()));});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>home(),{once:true});else home();
})();

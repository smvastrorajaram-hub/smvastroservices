/* SMV shared online/offline place search for question forms.
   Online: existing Render GeoNames world-wide search proxy.
   Offline/failure: bundled India place-search database.
   This module performs no Firestore reads. */
const SMV_QUESTION_BACKEND = ["staging.smvastroservices.in"].includes(location.hostname)
  ? "https://api-staging.smvastroservices.in" : "https://api.smvastroservices.in";
let offlineSearchPromise=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function offlineSearch(q,limit){
  if(!offlineSearchPromise) offlineSearchPromise=import('./horoscope/offline/places/place-search.mjs').then(m=>m.searchPlaces);
  const fn=await offlineSearchPromise;
  return fn(q,limit);
}
async function onlineSearch(q,limit,signal){
  const u=new URL('/api/locations/search',SMV_QUESTION_BACKEND);
  u.searchParams.set('q',q);
  u.searchParams.set('limit',String(Math.max(1,Math.min(70,Number(limit)||50))));
  u.searchParams.set('lang',/^ta(?:-|$)/i.test(document.documentElement.lang||'')?'ta':'en');
  const r=await fetch(u.toString(),{headers:{Accept:'application/json'},signal});
  if(!r.ok)throw new Error('Worldwide location search unavailable');
  const body=await r.json();
  if(body?.ok!==true||!Array.isArray(body.rows))throw new Error('GeoNames location search unavailable');
  return body.rows.filter(x=>x.place&&Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));
}
async function search(q,limit=50,signal){
  q=String(q||'').trim();if(q.length<2)return[];
  if(navigator.onLine){
    try{const rows=await onlineSearch(q,limit,signal);if(rows.length)return rows;}catch(e){if(e?.name==='AbortError')throw e;}
  }
  return offlineSearch(q,limit);
}
export function bindQuestionPlaceSearch(inputOrId,{latId='',lonId='',onSelect=null}={}){
  const input=typeof inputOrId==='string'?document.getElementById(inputOrId):inputOrId;
  if(!input||input.dataset.smvQuestionPlaceBound==='1')return;
  input.dataset.smvQuestionPlaceBound='1';input.autocomplete='off';
  const parent=input.parentElement;parent.style.position='relative';
  const list=document.createElement('div');list.className='smv-question-place-list';list.setAttribute('role','listbox');
  Object.assign(list.style,{display:'none',position:'absolute',left:'0',right:'0',top:'100%',zIndex:'9999',background:'#fff',color:'#111',WebkitTextFillColor:'#111',colorScheme:'light',border:'1px solid #d7dde7',borderRadius:'8px',boxShadow:'0 8px 20px rgba(0,0,0,.12)',maxHeight:'min(40dvh,280px)',overflowY:'auto',overflowX:'hidden',overscrollBehavior:'contain'});
  parent.appendChild(list);
  let timer=0,ctl=null;
  const close=()=>{list.style.display='none';list.innerHTML='';};
  const choose=x=>{
    input.value=x.place;input.dataset.latitude=String(x.latitude);input.dataset.longitude=String(x.longitude);
    input.dataset.timezone=x.timezone||'';input.dataset.timezoneSource=x.timezoneSource||(x.timezone?'offline-india':'unverified');input.dataset.locationSelected='1';
    if(latId&&document.getElementById(latId))document.getElementById(latId).value=String(x.latitude);
    if(lonId&&document.getElementById(lonId))document.getElementById(lonId).value=String(x.longitude);
    close();if(typeof onSelect==='function')onSelect(x);
    if(!x.timezone&&Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude))){
      const chosen=input.value;
      const url=new URL('/api/locations/timezone',SMV_QUESTION_BACKEND);
      url.searchParams.set('lat',String(x.latitude));url.searchParams.set('lng',String(x.longitude));
      fetch(url.toString(),{headers:{Accept:'application/json'}})
       .then(r=>r.ok?r.json():null).then(data=>{
        if(input.value!==chosen||!data?.ok||!data.timezoneId)return;
        try{new Intl.DateTimeFormat('en',{timeZone:data.timezoneId});}catch{return;}
        input.dataset.timezone=data.timezoneId;input.dataset.timezoneSource='geonames-timezoneJSON';
        input.dispatchEvent(new Event('change',{bubbles:true}));
        if(typeof onSelect==='function')onSelect({...x,timezone:data.timezoneId,timezoneSource:'geonames-timezoneJSON'});
       }).catch(()=>{});
    }
  };
  const render=rows=>{
    list.innerHTML='';
    for(const x of rows){const b=document.createElement('button');b.type='button';b.textContent=x.place;b.setAttribute('role','option');Object.assign(b.style,{display:'block',width:'100%',boxSizing:'border-box',textAlign:'left',padding:'10px 12px',border:'0',borderBottom:'1px solid #e5e7eb',background:'#fff',color:'#111',WebkitTextFillColor:'#111',colorScheme:'light',font:'inherit',lineHeight:'1.4',cursor:'pointer',opacity:'1'});b.addEventListener('mouseenter',()=>{b.style.background='#f3f4f6';});b.addEventListener('mouseleave',()=>{b.style.background='#fff';});b.addEventListener('focus',()=>{b.style.background='#f3f4f6';});b.addEventListener('blur',()=>{b.style.background='#fff';});b.addEventListener('click',()=>choose(x));list.appendChild(b);}
    list.style.display=rows.length?'block':'none';
  };
  input.addEventListener('input',()=>{
    input.dataset.locationSelected='0';delete input.dataset.latitude;delete input.dataset.longitude;delete input.dataset.timezone;delete input.dataset.timezoneSource;
    clearTimeout(timer);ctl?.abort();const q=input.value.trim();if(q.length<2){close();return;}
    timer=setTimeout(async()=>{ctl=new AbortController();try{render(await search(q,50,ctl.signal));}catch(e){if(e?.name!=='AbortError')close();}},350);
  });
  document.addEventListener('click',e=>{if(!parent.contains(e.target))close();});
}
export function questionPlaceData(inputOrId){
 const el=typeof inputOrId==='string'?document.getElementById(inputOrId):inputOrId;
 return {place:String(el?.value||'').trim(),latitude:Number(el?.dataset.latitude),longitude:Number(el?.dataset.longitude),timezone:el?.dataset.timezone||'',selected:el?.dataset.locationSelected==='1'};
}

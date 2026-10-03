/* SMV shared online/offline place search for question forms.
   Online: OpenStreetMap Nominatim geocode search.
   Offline/failure: bundled India place-search database.
   This module performs no Firestore reads. */
let offlineSearchPromise=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function offlineSearch(q,limit){
  if(!offlineSearchPromise) offlineSearchPromise=import('./horoscope/offline/places/place-search.mjs').then(m=>m.searchPlaces);
  const fn=await offlineSearchPromise;
  return fn(q,limit);
}
async function onlineSearch(q,limit,signal){
  const u=new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q',q);u.searchParams.set('format','jsonv2');u.searchParams.set('addressdetails','1');
  u.searchParams.set('limit',String(limit));u.searchParams.set('countrycodes','in');
  const r=await fetch(u,{headers:{'Accept':'application/json','Accept-Language':document.documentElement.lang==='ta'?'ta,en':'en,ta'},signal,cache:'no-store'});
  if(!r.ok)throw new Error('Online geocode unavailable');
  const rows=await r.json();
  return rows.map(x=>({place:x.display_name||'',name:x.name||'',admin2:x.address?.state_district||x.address?.county||'',admin1:x.address?.state||'',country:x.address?.country||'India',latitude:Number(x.lat),longitude:Number(x.lon),timezone:'Asia/Kolkata'})).filter(x=>x.place&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
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
  Object.assign(list.style,{display:'none',position:'absolute',left:'0',right:'0',top:'100%',zIndex:'9999',background:'#fff',border:'1px solid #d7dde7',borderRadius:'8px',boxShadow:'0 8px 20px rgba(0,0,0,.12)',maxHeight:'230px',overflowY:'auto'});
  parent.appendChild(list);
  let timer=0,ctl=null;
  const close=()=>{list.style.display='none';list.innerHTML='';};
  const choose=x=>{
    input.value=x.place;input.dataset.latitude=String(x.latitude);input.dataset.longitude=String(x.longitude);
    input.dataset.timezone=x.timezone||'Asia/Kolkata';input.dataset.locationSelected='1';
    if(latId&&document.getElementById(latId))document.getElementById(latId).value=String(x.latitude);
    if(lonId&&document.getElementById(lonId))document.getElementById(lonId).value=String(x.longitude);
    close();if(typeof onSelect==='function')onSelect(x);
  };
  const render=rows=>{
    list.innerHTML='';
    for(const x of rows){const b=document.createElement('button');b.type='button';b.textContent=x.place;b.setAttribute('role','option');Object.assign(b.style,{display:'block',width:'100%',textAlign:'left',padding:'9px 10px',border:'0',borderBottom:'1px solid #eee',background:'#fff',color:'#111'});b.addEventListener('click',()=>choose(x));list.appendChild(b);}
    list.style.display=rows.length?'block':'none';
  };
  input.addEventListener('input',()=>{
    input.dataset.locationSelected='0';delete input.dataset.latitude;delete input.dataset.longitude;
    clearTimeout(timer);ctl?.abort();const q=input.value.trim();if(q.length<2){close();return;}
    timer=setTimeout(async()=>{ctl=new AbortController();try{render(await search(q,50,ctl.signal));}catch(e){if(e?.name!=='AbortError')close();}},350);
  });
  document.addEventListener('click',e=>{if(!parent.contains(e.target))close();});
}
export function questionPlaceData(inputOrId){
 const el=typeof inputOrId==='string'?document.getElementById(inputOrId):inputOrId;
 return {place:String(el?.value||'').trim(),latitude:Number(el?.dataset.latitude),longitude:Number(el?.dataset.longitude),timezone:el?.dataset.timezone||'Asia/Kolkata',selected:el?.dataset.locationSelected==='1'};
}

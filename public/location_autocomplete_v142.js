(function(){
  'use strict';
  const MIN_CHARS=3;
  const DEBOUNCE_MS=1200;
  const MAX_RETRIES=2;
  const BACKEND=(window.SMV_BACKEND_URL||'https://smv-astro-1fco.onrender.com').replace(/\/$/,'');
  function setupLocation(prefix, language){
    const place=document.getElementById(prefix+'BirthPlace');
    const lat=document.getElementById(prefix+'Lat');
    const lon=document.getElementById(prefix+'Lon');
    if(!place||!lat||!lon||place.dataset.smvLocationBound==='1') return;
    place.dataset.smvLocationBound='1';
    const parent=place.parentElement;
    parent.classList.add('smv-location-wrap');
    const list=document.createElement('div');
    list.className='smv-location-suggestions';
    list.setAttribute('role','listbox');
    parent.appendChild(list);
    const status=document.createElement('div');
    status.className='smv-location-status';
    parent.appendChild(status);
    let timer=null, controller=null, lastQuery='', requestSeq=0, retryTimer=null;
    const ta=language==='ta';
    const msg={
      searching:ta?'இடத்தைத் தேடுகிறது…':'Searching locations…',
      choose:ta?'பட்டியலில் சரியான இடத்தைத் தேர்ந்தெடுக்கவும்.':'Select your exact place from the list.',
      more:ta?'இன்னும் சில எழுத்துகளை உள்ளிடவும்.':'Type a few more letters to search.',
      none:ta?'இந்த பெயருக்கு பொருத்தமான இடம் கிடைக்கவில்லை.':'No matching location found for this name.',
      retry:ta?'தேடல் சேவை பிஸியாக உள்ளது. மீண்டும் முயற்சிக்கிறது…':'Location service is busy. Retrying…',
      error:ta?'இடத்தைத் தேட முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.':'Unable to search this place right now. Please try again.'
    };
    function setStatus(text,cls){status.textContent=text||'';status.className='smv-location-status'+(cls?' '+cls:'');}
    function hide(){list.classList.remove('show');}
    function clear(){list.innerHTML='';hide();}
    function choose(item){
      place.value=item.place||'';
      lat.value=Number(item.latitude).toFixed(6);
      lon.value=Number(item.longitude).toFixed(6);
      place.dataset.locationSelected='1';
      place.dataset.latitude=String(item.latitude);
      place.dataset.longitude=String(item.longitude);
      lastQuery=place.value.trim();
      clear();setStatus('','');
    }
    function render(items,query){
      list.innerHTML='';
      if(!items.length){
        // Do not erase the user's suggestions merely because a longer partial query
        // returned nothing. This avoids the old 3-letter -> 4-letter failure UX.
        setStatus(query.length>=5?msg.none:msg.more,'err');
        return;
      }
      items.forEach(item=>{
        const b=document.createElement('button');
        b.type='button';b.className='smv-location-suggestion';b.setAttribute('role','option');
        b.textContent=item.place||'';
        b.addEventListener('click',()=>choose(item));
        list.appendChild(b);
      });
      list.classList.add('show');
      setStatus(msg.choose,'');
    }
    async function search(query,retry){
      const q=String(query||'').trim().replace(/\s+/g,' ');
      if(q.length<MIN_CHARS){clear();setStatus(q.length?msg.more:'','');return;}
      if(q===lastQuery && !retry)return;
      lastQuery=q;
      const seq=++requestSeq;
      if(controller)controller.abort();
      controller=new AbortController();
      setStatus(msg.searching,'');
      try{
        const r=await fetch(BACKEND+'/api/geocode?q='+encodeURIComponent(q),{
          signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'
        });
        const data=await r.json().catch(()=>({}));
        if(seq!==requestSeq)return;
        if(r.status===429 && retry<MAX_RETRIES){
          setStatus(msg.retry,'');
          retryTimer=setTimeout(()=>search(q,retry+1),1250);
          return;
        }
        if(!r.ok)throw new Error(data.error||msg.error);
        render(Array.isArray(data.results)?data.results:[],q);
      }catch(e){
        if(e.name==='AbortError')return;
        if(retry<MAX_RETRIES){
          retryTimer=setTimeout(()=>search(q,retry+1),1250);
          return;
        }
        setStatus(msg.error,'err');
      }
    }
    place.addEventListener('input',()=>{
      place.dataset.locationSelected='0';
      place.dataset.latitude='';place.dataset.longitude='';
      lat.value='';lon.value='';
      if(controller)controller.abort();
      clearTimeout(timer);clearTimeout(retryTimer);
      lastQuery='';
      const q=place.value.trim();
      if(q.length<MIN_CHARS){clear();setStatus(q?msg.more:'','');return;}
      // Keep current suggestions visible while the next, longer query is searched.
      setStatus(msg.searching,'');
      timer=setTimeout(()=>search(q,0),DEBOUNCE_MS);
    });
    place.addEventListener('focus',()=>{
      if(list.children.length && place.value.trim().length>=MIN_CHARS)list.classList.add('show');
    });
    place.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
    document.addEventListener('click',e=>{if(!parent.contains(e.target))hide();});
  }
  window.SMVLocationV24={setupLocation};
  setupLocation('tamil','ta');
  setupLocation('english','en');
})();

/* V221 shared Horoscope / Marriage Matching / SMV Calendar location search.
   Online first: OpenStreetMap Nominatim. Offline/network fallback: bundled India place shards.
   No Firebase reads, polling or MutationObserver. */
(()=>{
  'use strict';
  if(window.__smvSearchPlacesOnlineOffline)return;
  const scriptBase=new URL('.',document.currentScript?.src||new URL('./',location.href));
  const offlineUrl=new URL('offline/places/place-search.mjs',scriptBase).href;
  const singleZone={in:'Asia/Kolkata',lk:'Asia/Colombo',np:'Asia/Kathmandu',bd:'Asia/Dhaka',sg:'Asia/Singapore',jp:'Asia/Tokyo',kr:'Asia/Seoul',th:'Asia/Bangkok',vn:'Asia/Ho_Chi_Minh',de:'Europe/Berlin',fr:'Europe/Paris',gb:'Europe/London',ie:'Europe/Dublin',it:'Europe/Rome',nl:'Europe/Amsterdam',be:'Europe/Brussels',ch:'Europe/Zurich',ae:'Asia/Dubai'};
  let nominatimNext=0; let nominatimQueue=Promise.resolve();
  async function requestOnline(url,signal){
    // Public Nominatim usage: sequential requests, at most one per second.
    const turn=nominatimQueue.catch(()=>{}).then(async()=>{
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      const sleep=Math.max(0,nominatimNext-Date.now());
      if(sleep)await new Promise(resolve=>setTimeout(resolve,sleep));
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      nominatimNext=Date.now()+1100;
      return fetch(url,{headers:{Accept:'application/json','Accept-Language':document.documentElement.lang==='ta'?'ta,en':'en,ta'},signal,cache:'default'});
    });
    nominatimQueue=turn.catch(()=>{});
    return turn;
  }
  let offlineModulePromise=null;
  const offline=()=>offlineModulePromise||(offlineModulePromise=import(offlineUrl));
  window.__smvSearchPlacesOnlineOffline=async function(q,limit=50,signal){
    q=String(q||'').trim();if(q.length<2)return[];
    const max=Math.max(1,Math.min(70,Number(limit)||70));
    if(navigator.onLine){
      try{
        const u=new URL('https://nominatim.openstreetmap.org/search');
        u.searchParams.set('q',q);u.searchParams.set('format','jsonv2');u.searchParams.set('addressdetails','1');u.searchParams.set('limit',String(Math.min(40,max)));u.searchParams.set('layer','address');
        const r=await requestOnline(u,signal);
        if(r.ok){
          const rows=await r.json();
          const out=rows.map(x=>({place:x.display_name||'',name:x.name||'',admin2:x.address?.state_district||x.address?.county||'',admin1:x.address?.state||'',country:x.address?.country||'India',latitude:Number(x.lat),longitude:Number(x.lon),timezone:singleZone[String(x.address?.country_code||'').toLowerCase()]||'',countryCode:String(x.address?.country_code||'').toUpperCase()})).filter(x=>x.place&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
          if(out.length){
            let combined=out;
            if(max>out.length){try{const mod=await offline();const local=await mod.searchPlaces(q,max);const seen=new Set(out.map(x=>String(x.place).toLowerCase()));combined=[...out,...local.filter(x=>{const key=String(x.place||'').toLowerCase();if(seen.has(key))return false;seen.add(key);return true;})].slice(0,max);}catch(_e){/* keep worldwide results without India offline data */}}
            return combined;
          }
        }
      }catch(e){if(e?.name==='AbortError')throw e;}
    }
    const mod=await offline();
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    return mod.searchPlaces(q,max);
  };
})();

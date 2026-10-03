/* V171 shared Horoscope/Matching online + offline location search.
   Online first: OpenStreetMap Nominatim geocode.
   Offline/network failure: existing bundled SMVOffline.searchPlaces.
   Maximum requested results: 50. */
window.__smvSearchPlacesOnlineOffline=window.__smvSearchPlacesOnlineOffline||async function(q,limit=50,signal){
  q=String(q||'').trim();if(q.length<2)return[];
  const max=Math.max(1,Math.min(50,Number(limit)||50));
  if(navigator.onLine){
    try{
      const u=new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('q',q);u.searchParams.set('format','jsonv2');u.searchParams.set('addressdetails','1');
      u.searchParams.set('limit',String(max));u.searchParams.set('countrycodes','in');
      const r=await fetch(u,{headers:{'Accept':'application/json','Accept-Language':document.documentElement.lang==='ta'?'ta,en':'en,ta'},signal,cache:'no-store'});
      if(r.ok){
        const rows=await r.json();
        const out=rows.map(x=>({place:x.display_name||'',name:x.name||'',admin2:x.address?.state_district||x.address?.county||'',admin1:x.address?.state||'',country:x.address?.country||'India',latitude:Number(x.lat),longitude:Number(x.lon),timezone:'Asia/Kolkata'})).filter(x=>x.place&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
        if(out.length)return out;
      }
    }catch(e){if(e?.name==='AbortError')throw e;}
  }
  const mod=await import('./offline/places/place-search.mjs');
  return mod.searchPlaces(q,max);
};

/* SMV ASTRO shared online GeoNames search + offline India fallback.
 * Real IANA timezoneId is resolved by GeoNames timezoneJSON only when a user
 * selects a result; never infer birth offset from today's dstOffset.
 * No public Nominatim type-ahead (its usage policy prohibits autocomplete).
 */
(()=>{
 'use strict';
 if(window.__smvSearchPlacesOnlineOffline)return;
 const scriptBase=new URL('.',document.currentScript?.src||new URL('./',location.href));
 const offlineUrl=new URL('offline/places/place-search.mjs',scriptBase).href;
 const defaultBackend='https://smvastroservices.onrender.com';
 const backend=String(window.SMV_LOCATION_BACKEND||defaultBackend).replace(/\/+$/,'');
 let offlinePromise=null;
 const offline=()=>offlinePromise||(offlinePromise=import(offlineUrl));
 const cache=new Map(),flight=new Map();
 async function api(path,params,signal){
  const url=new URL(backend+path);
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
  const response=await fetch(url.toString(),{signal,headers:{Accept:'application/json'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true)throw new Error(String(body?.error||'GeoNames service unavailable'));
  return body;
 }
 function validCoord(lat,lon){
  return lat!==null&&lat!==undefined&&lon!==null&&lon!==undefined&&String(lat).trim()!==''&&String(lon).trim()!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180;
 }
 function validZone(zone){
  try{new Intl.DateTimeFormat('en-US',{timeZone:zone});return true}catch{return false}
 }
 window.__smvSearchPlacesOnlineOffline=async function(q,limit=70,signal){
  q=String(q||'').trim();if(q.length<2)return [];
  const max=Math.max(1,Math.min(70,Number(limit)||70));
  const lang=document.documentElement.lang==='ta'?'ta':'en';
  let online=[];
  if(navigator.onLine!==false){
   try{
    const data=await api('/api/locations/search',{q,limit:max,lang},signal);
    online=(data.rows||[]).filter(x=>validCoord(x.latitude,x.longitude)).slice(0,max);
   }catch(e){if(e?.name==='AbortError')throw e;}
  }
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  // Offline India is retained unchanged. If the GeoNames backend has not been
  // configured, non-India searches return no results rather than fake cities.
  if(online.length>=max)return online;
  try{
   const module=await offline();
   const local=await module.searchPlaces(q,max,signal);
   const used=new Set(online.map(x=>String(x.place).toLocaleLowerCase()));
   return [...online,...local.filter(x=>{
    const key=String(x.place||'').toLocaleLowerCase();
    if(used.has(key))return false;used.add(key);return true;
   })].slice(0,max);
  }catch(e){return online}
 };
 window.__smvResolvePlaceTimezone=async function(place,signal){
  if(!place||!validCoord(place.latitude,place.longitude))throw new Error('Valid location coordinates required');
  // Offline India records already contain GeoNames-derived IANA timezone data.
  if(place.timezone&&place.timezoneSource!=='geonames-pending'){
   if(!validZone(place.timezone))throw new Error('Invalid IANA timezone for this location');
   return {...place,timezoneSource:place.timezoneSource||'offline-india'};
  }
  const lat=Number(place.latitude),lng=Number(place.longitude),key=lat.toFixed(6)+'|'+lng.toFixed(6);
  if(cache.has(key))return {...place,...cache.get(key)};
  if(!flight.has(key)){
   const work=api('/api/locations/timezone',{lat,lng},signal).then(body=>{
    const zone=String(body.timezoneId||'').trim();
    if(!validZone(zone))throw new Error('GeoNames returned an invalid IANA timezoneId');
    const value={timezone:zone,timezoneSource:'geonames-timezoneJSON'};
    if(cache.size>250)cache.delete(cache.keys().next().value);
    cache.set(key,value);
    return value;
   });
   flight.set(key,work);
   work.finally(()=>flight.delete(key)).catch(()=>{});
  }
  return {...place,...await flight.get(key)};
 };
})();

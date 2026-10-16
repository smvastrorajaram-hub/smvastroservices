'use strict';
/* SMV ASTRO GeoNames proxy.
 * Set GEONAMES_USERNAME in the backend environment. Never expose it to the
 * browser, logs, repository or returned URLs. GeoNames 'demo' is not for apps.
 * Search: GeoNames searchJSON (up to 70 populated places).
 * Selected place only: GeoNames timezoneJSON -> authoritative timezoneId.
 * Historical DST is calculated separately by the browser IANA tz database.
 */
function registerGeoNamesRoutes(app, { username=process.env.GEONAMES_USERNAME, fetchImpl=globalThis.fetch, now=Date.now }={}) {
 const user=String(username||'').trim();
 const configured=!!user && user.toLowerCase()!=='demo';
 const cache=new Map(), requests=new Map(), maxCache=400;
 const validCoords=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180;
 function store(key,value,ttl) {
  if(cache.size>=maxCache)cache.delete(cache.keys().next().value);
  cache.set(key,{until:now()+ttl,value});
  return value;
 }
 async function geonames(endpoint,params,key,ttl) {
  const cached=cache.get(key);
  if(cached?.until>now())return cached.value;
  if(requests.has(key))return requests.get(key);
  const task=(async()=>{
   const url=new URL('https://secure.geonames.org/'+endpoint);
   for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
   url.searchParams.set('username',user);
   const response=await fetchImpl(url.toString(),{signal:AbortSignal.timeout(8500),headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('GeoNames HTTP '+response.status);
   const data=await response.json();
   if(data?.status)throw new Error('GeoNames upstream rejected request');
   return store(key,data,ttl);
  })();
  requests.set(key,task);
  try{return await task}finally{requests.delete(key)}
 }
 const unavailable=res=>res.status(503).json({ok:false,error:'GeoNames backend is not configured: set GEONAMES_USERNAME in Render.',configured:false});
 const failure=(res,e)=>res.status(502).json({ok:false,error:'GeoNames location provider temporarily unavailable.',code:'GEONAMES_UPSTREAM'});
 app.get('/api/locations/status',(req,res)=>res.set('Cache-Control','no-store').json({ok:true,configured,provider:'GeoNames',timezone:'timezoneJSON'}));
 app.get('/api/locations/search',async(req,res)=>{
  if(!configured)return unavailable(res);
  const q=String(req.query.q||'').trim(),limit=Math.max(1,Math.min(70,Math.trunc(Number(req.query.limit)||70)));
  const lang=req.query.lang==='ta'?'ta':'en';
  if(q.length<2||q.length>100||/[\u0000-\u001f]/.test(q))return res.status(400).json({ok:false,error:'Search requires 2–100 characters.'});
  try{
   const json=await geonames('searchJSON',{name:q,name_startsWith:q,featureClass:'P',maxRows:limit,orderby:'population',style:'FULL',lang},'s|'+lang+'|'+q.toLocaleLowerCase()+'|'+limit,1000*60*60*4);
   const places=Array.isArray(json?.geonames)?json.geonames:[];
   const rows=places.map(p=>{
    const latitude=Number(p.lat),longitude=Number(p.lng);
    if(!validCoords(latitude,longitude))return null;
    const name=String(p.name||p.toponymName||'').slice(0,180);
    const admin1=String(p.adminName1||'').slice(0,140);
    const country=String(p.countryName||'').slice(0,140);
    return {place:[name,admin1,country].filter(Boolean).join(', '),name,admin1,country,latitude,longitude,
     countryCode:String(p.countryCode||'').slice(0,2),geonameId:Number(p.geonameId)||null,timezone:'',timezoneSource:'geonames-pending'};
   }).filter(Boolean).slice(0,limit);
   res.set('Cache-Control','public, max-age=120').json({ok:true,provider:'GeoNames',rows});
  }catch(e){failure(res,e)}
 });
 app.get('/api/locations/timezone',async(req,res)=>{
  if(!configured)return unavailable(res);
  const lat=Number(req.query.lat),lng=Number(req.query.lng);
  if(req.query.lat==null||req.query.lng==null||String(req.query.lat).trim()===''||String(req.query.lng).trim()===''||!validCoords(lat,lng))
   return res.status(400).json({ok:false,error:'Valid latitude/longitude required.'});
  try{
   const key='tz|'+lat.toFixed(6)+'|'+lng.toFixed(6);
   const data=await geonames('timezoneJSON',{lat,lng},key,1000*60*60*24*14);
   const zone=String(data?.timezoneId||'').trim();
   if(!zone||zone.length>100||!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone))
    return res.status(502).json({ok:false,error:'GeoNames did not return a valid timezoneId.'});
   // Current rawOffset/dstOffset are NOT historical: do not return either as
   // the user's birth offset. The browser computes that from this timezoneId.
   return res.set('Cache-Control','public, max-age=3600').json({ok:true,timezoneId:zone,timezone:zone,timezoneSource:'geonames-timezoneJSON',countryCode:String(data.countryCode||'').slice(0,2)});
  }catch(e){failure(res,e)}
 });
}
module.exports={registerGeoNamesRoutes};

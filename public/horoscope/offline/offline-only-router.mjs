/* V47: horoscope APIs resolve locally; geocode reuses the existing bundled Places database unchanged. */
import {calculateVedicChart} from './server-v107-wrapper.browser.mjs';
import {calculateSwiss} from './swiss_vedic.browser.mjs';
import {panchang,transit} from './transit_panchang.browser.mjs';
import { full } from './offline-engine.mjs';
import { searchPlaces } from './places/place-search.mjs';
const nativeFetch=globalThis.fetch?.bind(globalThis);
const jr=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const body=async init=>{try{return JSON.parse(String(init?.body||'{}'))}catch{return {}}};
async function local(path,u,init){
 if(path.endsWith('/api/geocode')){
   const q=String(u.searchParams.get('q')||'').trim();
   if(q.length<2)return jr({ok:true,offline:true,results:[]});
   const rows=await searchPlaces(q,12);
   return jr({ok:true,offline:true,results:rows});
 }
 const b=await body(init);
 if(b.timezone&&b.date&&b.time&&!Number.isFinite(Number(b.utcOffsetMinutes))) b.utcOffsetMinutes=330;
 if(path.endsWith('/api/horoscope/full'))return jr(await full(b));
 if(path.endsWith('/api/horoscope/calculate'))return jr(await calculateVedicChart(b));
 if(path.endsWith('/api/horoscope/advanced')){const r=await full(b);return jr({ok:true,advanced:r.advanced,chart:r.chart})}
 if(path.endsWith('/api/horoscope/dasa')){const r=await full(b.chart?{...b,...(b.chart.birth||{})}:b);return jr({ok:true,phase4:r.phase4})}
 if(path.endsWith('/api/horoscope/transit')){await calculateSwiss(b);return jr({ok:true,transit:transit(b)})}
 if(path.endsWith('/api/horoscope/panchang')){await calculateSwiss(b);return jr({ok:true,panchang:panchang(b)})}
 if(path.endsWith('/api/horoscope/ai-future'))return jr({error:'AI Future is not part of the 100% offline build.'},503);
 return null;
}
globalThis.fetch=async function(input,init={}){const raw=typeof input==='string'?input:input?.url||'',u=new URL(raw,location.href);const r=await local(u.pathname,u,init).catch(e=>jr({ok:false,error:e?.message||String(e)},400));if(r)return r;if(u.origin===location.origin&&(!init.method||String(init.method).toUpperCase()==='GET'))return nativeFetch(input,init);return nativeFetch(input,init);};
globalThis.__SMV_OFFLINE_ONLY_READY__=true;

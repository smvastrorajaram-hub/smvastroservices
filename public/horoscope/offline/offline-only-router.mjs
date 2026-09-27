/* V47: horoscope APIs resolve locally; geocode reuses the existing bundled Places database unchanged. */
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
 if(path.endsWith('/api/horoscope/calculate')){const r=await full(b);return jr(r.chart||r)}
 if(path.endsWith('/api/horoscope/advanced')){const r=await full(b);return jr({ok:true,advanced:r.advanced,chart:r.chart})}
 if(path.endsWith('/api/horoscope/dasa')){const r=await full(b.chart?{...b,...(b.chart.birth||{})}:b);return jr({ok:true,phase4:r.phase4})}
 if(path.endsWith('/api/horoscope/transit')){const r=await full({...b,dailyDate:b.date,dailyTime:b.time});return jr({ok:true,transit:r.transit})}
 if(path.endsWith('/api/horoscope/panchang')){const r=await full({...b,dailyDate:b.date,dailyTime:b.time});return jr({ok:true,panchang:r.dailyPanchang||r.birthPanchang})}
 if(path.endsWith('/api/horoscope/ai-future'))return jr({error:'AI Future is not part of the 100% offline build.'},503);
 return null;
}
globalThis.fetch=async function(input,init={}){const raw=typeof input==='string'?input:input?.url||'',u=new URL(raw,location.href);const r=await local(u.pathname,u,init).catch(e=>jr({ok:false,error:e?.message||String(e)},400));if(r)return r;if(u.origin===location.origin&&(!init.method||String(init.method).toUpperCase()==='GET'))return nativeFetch(input,init);throw new TypeError('100% offline-only mode: network access blocked.');};
globalThis.__SMV_OFFLINE_ONLY_READY__=true;

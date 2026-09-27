import { full as offlineFull } from './offline-engine.mjs';
const PLANET_KEYS=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
const num=(x)=>Number(x);
const delta=(a,b)=>Math.abs(num(a)-num(b));
function byName(a=[]){return Object.fromEntries(a.map(x=>[x.name,x]));}
export function compareCore(online,offline,tolerance=1e-7){
 const A=online?.chart||online, B=offline?.chart||offline, rows=[];
 const push=(field,a,b,tol=tolerance)=>rows.push({field,online:a,offline:b,delta:(Number.isFinite(num(a))&&Number.isFinite(num(b)))?delta(a,b):null,pass:(Number.isFinite(num(a))&&Number.isFinite(num(b)))?delta(a,b)<=tol:String(a)===String(b)});
 push('ayanamsa',A?.ayanamsa,B?.ayanamsa);
 push('lagna.longitude',A?.lagna?.longitude,B?.lagna?.longitude);
 push('lagna.rasi',A?.lagna?.rasi,B?.lagna?.rasi,0);
 push('lagna.nakshatra',A?.lagna?.nakshatra,B?.lagna?.nakshatra,0);
 const ap=byName(A?.planets),bp=byName(B?.planets);
 for(const p of PLANET_KEYS){push(`planet.${p}.longitude`,ap[p]?.longitude,bp[p]?.longitude);push(`planet.${p}.rasi`,ap[p]?.rasi,bp[p]?.rasi,0);push(`planet.${p}.nakshatra`,ap[p]?.nakshatra,bp[p]?.nakshatra,0);push(`planet.${p}.pada`,ap[p]?.pada,bp[p]?.pada,0);}
 for(let i=0;i<12;i++)push(`bhava.${i+1}.longitude`,A?.bhavas?.[i]?.longitude,B?.bhavas?.[i]?.longitude);
 return {pass:rows.every(r=>r.pass),tolerance,rows,failed:rows.filter(r=>!r.pass)};
}
export async function runParity({backendUrl,payload,tolerance=1e-7}){
 const r=await fetch(backendUrl.replace(/\/$/,'')+'/api/horoscope/full',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const online=await r.json(); if(!r.ok||online?.ok===false)throw new Error(online?.error||'Online reference failed');
 const offline=await offlineFull(payload);
 return {online,offline,comparison:compareCore(online,offline,tolerance)};
}
globalThis.SMVParity={runParity,compareCore};

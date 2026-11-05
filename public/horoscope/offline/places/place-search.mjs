import {formatOfflineIndiaPlace,offlinePlaceLanguage} from './place-display.mjs';
let manifest=null,manifestFlight=null;
const cache=new Map();
const shardFlights=new Map();
const resultCache=new Map();
// Phase 3: preserve exact search semantics while narrowing successive prefix queries
// to the previous candidate set. This avoids rescanning multi-MB first-letter shards
// on every keystroke without changing the first search or returned ranking.
const prefixCandidates=new Map();
const aliasCache=new WeakMap();
function aliases(row){let a=aliasCache.get(row);if(!a){a=(row[8]||[]).map(norm).filter(Boolean);aliasCache.set(row,a);}return a;}
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
async function cachedPlaceJson(url,label){
 try{const r=await fetch(url);if(r.ok)return await r.json();throw new Error(label+' HTTP '+r.status);}
 catch(error){if(typeof caches!=='undefined'){try{const hit=await caches.match(url.href);if(hit?.ok)return await hit.json();}catch(_){}}throw error;}
}
async function mf(){if(manifest)return manifest;if(manifestFlight)return manifestFlight;manifestFlight=(async()=>manifest=await cachedPlaceJson(new URL('./india-manifest.json',import.meta.url),'Offline India manifest'))();try{return await manifestFlight;}finally{manifestFlight=null;}}
function keyFor(n){const c=n[0]||'';if(c>='a'&&c<='z')return c;if(/[\u0B80-\u0BFF]/u.test(c))return'ta';return'other';}
async function shard(k){if(cache.has(k))return cache.get(k);if(shardFlights.has(k))return shardFlights.get(k);const flight=(async()=>{const m=await mf(),x=m.shards[k];if(!x)return[];const url=new URL('./india/'+x.file,import.meta.url);url.searchParams.set('v',String(m.version||1));const rows=await cachedPlaceJson(url,'Offline India shard '+x.file);cache.set(k,rows);return rows;})();shardFlights.set(k,flight);try{return await flight;}finally{shardFlights.delete(k);}}
export async function searchPlaces(q,limit=12){
 const n=norm(q);if(n.length<2)return[];
 const max=Math.max(1,Math.min(70,Number(limit)||12));
 const language=offlinePlaceLanguage();
 const cacheKey=n+'|'+max+'|'+language;
 if(resultCache.has(cacheKey))return resultCache.get(cacheKey);
 const shardKey=keyFor(n), rows=await shard(shardKey), out=[];
 const prev=prefixCandidates.get(shardKey);
 const source=prev&&n.startsWith(prev.q)&&n.length>prev.q.length?prev.rows:rows;
 const matched=[];
 for(const x of source){
   let best=99;
   for(const a of aliases(x)){
     if(a===n){best=0;break}
     if(a.startsWith(n))best=Math.min(best,1);
     else if(a.includes(' '+n))best=Math.min(best,2);
     else if(a.includes(n))best=Math.min(best,3);
   }
   if(best<99){out.push({x,score:best});matched.push(x);}
 }
 prefixCandidates.set(shardKey,{q:n,rows:matched});
 out.sort((a,b)=>a.score-b.score||b.x[7]-a.x[7]||String(a.x[1]).localeCompare(String(b.x[1])));
 const result=out.slice(0,max).map(({x})=>{
   const display=formatOfflineIndiaPlace(x,language);
   return {...display,latitude:x[4],longitude:x[5],timezone:x[6]||'Asia/Kolkata',population:x[7],geonameId:x[0]};
 });
 resultCache.set(cacheKey,result);
 if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
 return result;
}

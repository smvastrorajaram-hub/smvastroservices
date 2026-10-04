let manifest=null,manifestFlight=null;
const cache=new Map();
const shardFlights=new Map();
const resultCache=new Map();
// Phase 3: preserve exact search semantics while narrowing successive prefix queries
// to the previous candidate set. This avoids rescanning multi-MB first-letter shards
// on every keystroke without changing the first search or returned ranking.
const prefixCandidates=new Map();
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
async function mf(){if(manifest)return manifest;if(manifestFlight)return manifestFlight;manifestFlight=(async()=>{const r=await fetch(new URL('./india-manifest.json',import.meta.url));if(!r.ok)throw new Error('Offline India place database unavailable');return manifest=await r.json();})();try{return await manifestFlight;}finally{manifestFlight=null;}}
function keyFor(n){const c=n[0]||'';if(c>='a'&&c<='z')return c;if(/[\u0B80-\u0BFF]/u.test(c))return'ta';return'other';}
async function shard(k){if(cache.has(k))return cache.get(k);if(shardFlights.has(k))return shardFlights.get(k);const flight=(async()=>{const m=await mf(),x=m.shards[k];if(!x)return[];const r=await fetch(new URL('./india/'+x.file,import.meta.url));if(!r.ok)throw new Error('Offline India place shard unavailable');const rows=await r.json();cache.set(k,rows);return rows;})();shardFlights.set(k,flight);try{return await flight;}finally{shardFlights.delete(k);}}
export async function searchPlaces(q,limit=12){
 const n=norm(q);if(n.length<2)return[];
 const max=Math.max(1,Math.min(50,Number(limit)||12));
 const cacheKey=n+'|'+max;
 if(resultCache.has(cacheKey))return resultCache.get(cacheKey);
 const shardKey=keyFor(n), rows=await shard(shardKey), out=[];
 const prev=prefixCandidates.get(shardKey);
 const source=prev&&n.startsWith(prev.q)&&n.length>prev.q.length?prev.rows:rows;
 const matched=[];
 for(const x of source){
   let best=99;
   for(const raw of x[8]||[]){
     const a=norm(raw);
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
   const district=x[3]||'', state=x[2]||'';
   const place=[x[1],district,state,'India'].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', ');
   return {place,name:x[1],admin2:district,admin1:state,country:'India',latitude:x[4],longitude:x[5],timezone:x[6]||'Asia/Kolkata',population:x[7],geonameId:x[0]};
 });
 resultCache.set(cacheKey,result);
 if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
 return result;
}

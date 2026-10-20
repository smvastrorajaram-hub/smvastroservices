import {formatOfflineIndiaPlace} from './place-display.mjs';

const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const keyFor=n=>{const c=n[0]||'';if(c>='a'&&c<='z')return c;if(/[\u0B80-\u0BFF]/u.test(c))return'ta';return'other';};
const compare=(a,b)=>a.score-b.score||Number(b.x[7]||0)-Number(a.x[7]||0)||String(a.x[1]).localeCompare(String(b.x[1]));
const insertTop=(list,item,max)=>{
 let lo=0,hi=list.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(compare(list[mid],item)<=0)lo=mid+1;else hi=mid;}
 if(lo>=max)return;
 list.splice(lo,0,item);
 if(list.length>max)list.pop();
};

export function createPlaceSearchEngine({fetchImpl=fetch}={}){
 let manifest=null,manifestFlight=null;
 const shards=new Map(),shardFlights=new Map(),resultCache=new Map(),prefixCandidates=new Map(),aliasCache=new WeakMap();
 const aliases=row=>{let a=aliasCache.get(row);if(!a){a=(row[8]||[]).map(norm).filter(Boolean);aliasCache.set(row,a);}return a;};
 async function getManifest(){
  if(manifest)return manifest;
  if(manifestFlight)return manifestFlight;
  manifestFlight=(async()=>{
   const r=await fetchImpl(new URL('./india-manifest.json',import.meta.url));
   if(!r.ok)throw new Error('Offline India place database unavailable');
   return manifest=await r.json();
  })();
  try{return await manifestFlight;}finally{manifestFlight=null;}
 }
 async function getShard(key){
  if(shards.has(key))return shards.get(key);
  if(shardFlights.has(key))return shardFlights.get(key);
  const flight=(async()=>{
   const m=await getManifest(),info=m.shards[key];
   if(!info)return [];
   const r=await fetchImpl(new URL('./india/'+info.file,import.meta.url));
   if(!r.ok)throw new Error('Offline India place shard unavailable');
   const rows=await r.json();
   shards.set(key,rows);
   return rows;
  })();
  shardFlights.set(key,flight);
  try{return await flight;}finally{shardFlights.delete(key);}
 }
 async function searchPlaces(query,limit=12,language='en',isCancelled=()=>false){
  const n=norm(query);if(n.length<2)return [];
  const max=Math.max(1,Math.min(70,Number(limit)||12));
  const cacheKey=n+'|'+max+'|'+language;
  if(resultCache.has(cacheKey))return resultCache.get(cacheKey);
  const shardKey=keyFor(n),rows=await getShard(shardKey),top=[],matched=[];
  const prev=prefixCandidates.get(shardKey);
  const source=prev&&n.startsWith(prev.q)&&n.length>prev.q.length?prev.rows:rows;
  let count=0;
  for(const x of source){
   if(isCancelled())throw new DOMException('Aborted','AbortError');
   let best=99;
   for(const a of aliases(x)){
    if(a===n){best=0;break;}
    if(a.startsWith(n))best=Math.min(best,1);
    else if(a.includes(' '+n))best=Math.min(best,2);
    else if(a.includes(n))best=Math.min(best,3);
   }
   if(best<99){matched.push(x);insertTop(top,{x,score:best},max);}
   if(++count%1200===0){
    await new Promise(resolve=>setTimeout(resolve,0));
    if(isCancelled())throw new DOMException('Aborted','AbortError');
   }
  }
  prefixCandidates.set(shardKey,{q:n,rows:matched});
  const result=top.map(({x})=>{
   const display=formatOfflineIndiaPlace(x,language);
   return {...display,latitude:x[4],longitude:x[5],timezone:x[6]||'Asia/Kolkata',population:x[7],geonameId:x[0]};
  });
  resultCache.set(cacheKey,result);
  if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
  return result;
 }
 return {searchPlaces};
}

if(typeof self!=='undefined'&&typeof self.addEventListener==='function'&&typeof document==='undefined'){
 const cancelled=new Set();
 const engine=createPlaceSearchEngine();
 self.addEventListener('message',async({data})=>{
  if(data?.kind==='cancel'){cancelled.add(data.id);return;}
  if(data?.kind!=='search'||data.id==null)return;
  const id=data.id;
  try{
   const result=await engine.searchPlaces(data.query,data.limit,data.language,()=>cancelled.has(id));
   if(!cancelled.has(id))self.postMessage({id,result});
  }catch(error){
   if(!cancelled.has(id))self.postMessage({id,error:String(error?.message||error),name:error?.name||'Error'});
  }finally{cancelled.delete(id);}
 });
}

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

export function createPlaceSearchEngine({fetchImpl=fetch,cacheStorage=globalThis.caches}={}){
 const PLACE_CACHE='smv-horoscope-offline';
 let manifest=null,manifestFlight=null;
 async function readJson(url,errorMessage){
  let cache=null;
  try{if(cacheStorage?.open)cache=await cacheStorage.open(PLACE_CACHE);}catch(_){}
  try{
   const response=await fetchImpl(url,{cache:'no-store'});
   if(!response.ok)throw new Error(errorMessage);
   if(cache)try{await cache.put(url,response.clone());}catch(_){}
   return await response.json();
  }catch(error){
   try{
    const saved=await cacheStorage?.match?.(url,{ignoreSearch:true})||await cache?.match?.(url,{ignoreSearch:true});
    if(saved)return await saved.json();
   }catch(_){}
   throw error;
  }
 }
 const MAX_SHARD_CACHE=2;
 const shards=new Map(),shardFlights=new Map(),resultCache=new Map(),prefixCandidates=new Map(),aliasCache=new WeakMap();
 const aliases=row=>{let a=aliasCache.get(row);if(!a){a=(row[8]||[]).map(norm).filter(Boolean);aliasCache.set(row,a);}return a;};
 function rememberShard(key,groups){
  if(shards.has(key))shards.delete(key);
  shards.set(key,groups);
  while(shards.size>MAX_SHARD_CACHE){
   const oldest=shards.keys().next().value;
   shards.delete(oldest);
   prefixCandidates.delete(oldest);
  }
 }
 async function getManifest(){
  if(manifest)return manifest;
  if(manifestFlight)return manifestFlight;
  manifestFlight=readJson(new URL('./india-manifest.json',import.meta.url),'Offline India place database unavailable')
   .then(value=>(manifest=value));
  try{return await manifestFlight;}finally{manifestFlight=null;}
 }
 async function getShard(key){
  if(shards.has(key)){const hit=shards.get(key);shards.delete(key);shards.set(key,hit);return hit;}
  if(shardFlights.has(key))return shardFlights.get(key);
  const flight=(async()=>{
   const m=await getManifest(),info=m.shards[key];
   if(!info)return [];
   const loadPart=async part=>
    readJson(new URL('./india/'+part.file,import.meta.url),'Offline India place shard unavailable: '+part.file);
   const groups=Array.isArray(info.parts)?await Promise.all(info.parts.map(loadPart)):[await loadPart(info)];
   rememberShard(key,groups);
   return groups;
  })();
  shardFlights.set(key,flight);
  try{return await flight;}finally{shardFlights.delete(key);}
 }
 async function searchPlaces(query,limit=12,language='en',isCancelled=()=>false){
  const n=norm(query);if(n.length<2)return [];
  const max=Math.max(1,Math.min(70,Number(limit)||12));
  const cacheKey=n+'|'+max+'|'+language;
  if(resultCache.has(cacheKey))return resultCache.get(cacheKey);
  const shardKey=keyFor(n),groups=await getShard(shardKey),top=[],matched=[];
  const prev=prefixCandidates.get(shardKey);
  const sourceGroups=prev&&n.startsWith(prev.q)&&n.length>prev.q.length?[prev.rows]:groups;
  let count=0;
  for(const group of sourceGroups){
   for(const x of group){
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
  }
  if(shards.has(shardKey))prefixCandidates.set(shardKey,{q:n,rows:matched});
  else prefixCandidates.delete(shardKey);
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

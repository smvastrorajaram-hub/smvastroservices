import {formatOfflineIndiaPlace,offlinePlaceLanguage} from './place-display.mjs';
import {normalizePlaceQuery,placeShardKeyFor,rankPlaceRows} from './place-search-core.mjs';

let manifest=null,manifestFlight=null;
const shardCache=new Map(),shardFlights=new Map(),resultCache=new Map();
const prefixCandidates=new Map();
let searchWorker=null,workerDisabled=false,nextWorkerId=0;
const workerPending=new Map();

function ensureWorker(){
 if(workerDisabled||typeof Worker!=='function')return null;
 if(searchWorker)return searchWorker;
 try{
  const candidate=new Worker(new URL('./place-search.worker.mjs',import.meta.url),{type:'module',name:'smv-india-place-search'});
  candidate.onmessage=event=>{
   const message=event.data||{},pending=workerPending.get(message.id);
   if(!pending)return;
   workerPending.delete(message.id);
   if(message.error)pending.reject(new Error(message.error));
   else pending.resolve(Array.isArray(message.rows)?message.rows:[]);
  };
  candidate.onerror=event=>{
   const error=new Error(event?.message||'Place-search Worker failed');
   for(const pending of workerPending.values())pending.reject(error);
   workerPending.clear();
   candidate.terminate();
   if(searchWorker===candidate)searchWorker=null;
   workerDisabled=true;
  };
  searchWorker=candidate;
  return candidate;
 }catch(error){
  workerDisabled=true;
  return null;
 }
}
function searchInWorker(query,limit,language){
 const worker=ensureWorker();
 if(!worker)return Promise.reject(new Error('Place-search Worker is unavailable'));
 const id=++nextWorkerId;
 return new Promise((resolve,reject)=>{
  workerPending.set(id,{resolve,reject});
  try{worker.postMessage({id,query,limit,language});}
  catch(error){workerPending.delete(id);reject(error);}
 });
}
async function getManifest(){
 if(manifest)return manifest;
 if(manifestFlight)return manifestFlight;
 manifestFlight=(async()=>{
  const response=await fetch(new URL('./india-manifest.json',import.meta.url));
  if(!response.ok)throw new Error('Offline India place database unavailable');
  return manifest=await response.json();
 })();
 try{return await manifestFlight;}finally{manifestFlight=null;}
}
async function getShard(key){
 if(shardCache.has(key))return shardCache.get(key);
 if(shardFlights.has(key))return shardFlights.get(key);
 const flight=(async()=>{
  const data=await getManifest(),entry=data.shards?.[key];
  if(!entry)return[];
  const response=await fetch(new URL('./india/'+entry.file,import.meta.url));
  if(!response.ok)throw new Error('Offline India place shard unavailable');
  const rows=await response.json();shardCache.set(key,rows);return rows;
 })();
 shardFlights.set(key,flight);
 try{return await flight;}finally{shardFlights.delete(key);}
}
function displayRows(rows,language){
 return rows.map(row=>{
  const place=formatOfflineIndiaPlace(row,language);
  return {...place,latitude:row[4],longitude:row[5],timezone:row[6]||'Asia/Kolkata',population:row[7],geonameId:row[0]};
 });
}
export async function searchPlaces(query,limit=12){
 const normalized=normalizePlaceQuery(query);
 if(normalized.length<2)return[];
 const max=Math.max(1,Math.min(70,Number(limit)||12));
 const language=offlinePlaceLanguage();
 const cacheKey=normalized+'|'+max+'|'+language;
 if(resultCache.has(cacheKey))return resultCache.get(cacheKey);

 // The primary path moves JSON parsing and full-shard scanning into a Worker.
 // A strict fallback preserves functionality in browsers without module Workers.
 const activeWorker=ensureWorker();
 if(activeWorker){
  try{
   const rows=await searchInWorker(normalized,max,language);
   const result=displayRows(rows,language);
   resultCache.set(cacheKey,result);
   if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
   return result;
  }catch(error){
   if(!workerDisabled){
    // A worker-side fetch/data error should surface via the same fallback path;
    // do not conceal a failed local database by issuing network retries.
    console.warn('Worker place search failed; using the local fallback.',error);
   }
  }
 }
 const key=placeShardKeyFor(normalized),rows=await getShard(key);
 const previous=prefixCandidates.get(key);
 const source=previous&&normalized.startsWith(previous.query)&&normalized.length>previous.query.length?previous.rows:rows;
 const ranked=rankPlaceRows(source,normalized);
 prefixCandidates.set(key,{query:normalized,rows:ranked.candidates});
 const result=displayRows(ranked.ranked.slice(0,max).map(item=>item.row),language);
 resultCache.set(cacheKey,result);
 if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
 return result;
}

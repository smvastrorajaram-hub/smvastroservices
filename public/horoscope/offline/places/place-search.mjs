import {formatOfflineIndiaPlace,offlinePlaceLanguage} from './place-display.mjs';

let manifest=null,manifestFlight=null;
const cache=new Map(),shardFlights=new Map(),resultCache=new Map(),prefixCandidates=new Map(),aliasCache=new WeakMap();
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const aliases=row=>{let a=aliasCache.get(row);if(!a){a=(row[8]||[]).map(norm).filter(Boolean);aliasCache.set(row,a);}return a;};
const keyFor=n=>{const c=n[0]||'';if(c>='a'&&c<='z')return c;if(/[\u0B80-\u0BFF]/u.test(c))return'ta';return'other';};
const compare=(a,b)=>a.score-b.score||Number(b.x[7]||0)-Number(a.x[7]||0)||String(a.x[1]).localeCompare(String(b.x[1]));
const insertTop=(list,item,max)=>{
 let lo=0,hi=list.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(compare(list[mid],item)<=0)lo=mid+1;else hi=mid;}
 if(lo>=max)return;
 list.splice(lo,0,item);
 if(list.length>max)list.pop();
};
const aborted=()=>new DOMException('Aborted','AbortError');
function yieldMainThread(){
 if(typeof scheduler!=='undefined'&&typeof scheduler.yield==='function')return scheduler.yield();
 return new Promise(resolve=>{
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>resolve(),{timeout:40});
  else setTimeout(resolve,0);
 });
}
async function mf(){
 if(manifest)return manifest;
 if(manifestFlight)return manifestFlight;
 manifestFlight=(async()=>{
  const r=await fetch(new URL('./india-manifest.json',import.meta.url));
  if(!r.ok)throw new Error('Offline India place database unavailable');
  return manifest=await r.json();
 })();
 try{return await manifestFlight;}finally{manifestFlight=null;}
}
async function shard(k){
 if(cache.has(k))return cache.get(k);
 if(shardFlights.has(k))return shardFlights.get(k);
 const flight=(async()=>{
  const m=await mf(),x=m.shards[k];if(!x)return[];
  const r=await fetch(new URL('./india/'+x.file,import.meta.url));
  if(!r.ok)throw new Error('Offline India place shard unavailable');
  const rows=await r.json();cache.set(k,rows);return rows;
 })();
 shardFlights.set(k,flight);
 try{return await flight;}finally{shardFlights.delete(k);}
}
async function searchPlacesMain(query,max,language,signal){
 const n=norm(query);if(n.length<2)return[];
 const cacheKey=n+'|'+max+'|'+language;
 if(resultCache.has(cacheKey))return resultCache.get(cacheKey);
 const shardKey=keyFor(n),rows=await shard(shardKey),top=[],matched=[];
 const prev=prefixCandidates.get(shardKey);
 const source=prev&&n.startsWith(prev.q)&&n.length>prev.q.length?prev.rows:rows;
 let count=0;
 for(const x of source){
  if(signal?.aborted)throw aborted();
  let best=99;
  for(const a of aliases(x)){
   if(a===n){best=0;break}
   if(a.startsWith(n))best=Math.min(best,1);
   else if(a.includes(' '+n))best=Math.min(best,2);
   else if(a.includes(n))best=Math.min(best,3);
  }
  if(best<99){matched.push(x);insertTop(top,{x,score:best},max);}
  if(++count%1200===0){await yieldMainThread();if(signal?.aborted)throw aborted();}
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

let searchWorker=null,workerFailed=false,nextRequestId=0;
const workerPending=new Map();
function settleWorkerError(error){
 workerFailed=true;
 for(const item of workerPending.values()){
  item.signal?.removeEventListener('abort',item.onAbort);
  item.reject(error);
 }
 workerPending.clear();
 try{searchWorker?.terminate()}catch{}
 searchWorker=null;
}
function ensureWorker(){
 if(workerFailed||typeof Worker!=='function')throw new Error('Place-search worker is unavailable');
 if(searchWorker)return searchWorker;
 const w=new Worker(new URL('./place-search-worker.mjs',import.meta.url),{type:'module',name:'smv-india-place-search'});
 w.onmessage=({data})=>{
  const item=workerPending.get(data?.id);if(!item)return;
  workerPending.delete(data.id);item.signal?.removeEventListener('abort',item.onAbort);
  if(data.error){const error=new Error(data.error);error.name=data.name||'Error';item.reject(error);}
  else item.resolve(data.result||[]);
 };
 w.onerror=event=>settleWorkerError(new Error(event?.message||'Place-search worker failed'));
 searchWorker=w;
 return w;
}
function searchInWorker(query,max,language,signal){
 if(signal?.aborted)return Promise.reject(aborted());
 let w;
 try{w=ensureWorker()}catch(error){return Promise.reject(error)}
 const id=++nextRequestId;
 return new Promise((resolve,reject)=>{
  const item={resolve,reject,signal,onAbort:null};
  item.onAbort=()=>{
   if(!workerPending.has(id))return;
   workerPending.delete(id);
   try{searchWorker?.postMessage({kind:'cancel',id})}catch{}
   reject(aborted());
  };
  workerPending.set(id,item);
  signal?.addEventListener('abort',item.onAbort,{once:true});
  try{w.postMessage({kind:'search',id,query,limit:max,language});}
  catch(error){workerPending.delete(id);signal?.removeEventListener('abort',item.onAbort);reject(error);}
 });
}

/**
 * Search uses a dedicated module worker where supported, so parsing and scanning
 * multi-megabyte GeoNames shards never blocks the UI thread. The fallback keeps
 * the same ranking and yields between small chunks on older embedded browsers.
 */
export async function searchPlaces(query,limit=12,signal){
 const q=String(query||''),n=norm(q);
 if(n.length<2)return[];
 const max=Math.max(1,Math.min(70,Number(limit)||12));
 const language=offlinePlaceLanguage();
 if(typeof Worker==='function'&&!workerFailed){
  try{return await searchInWorker(q,max,language,signal);}
  catch(error){if(error?.name==='AbortError')throw error;settleWorkerError(error);}
 }
 return searchPlacesMain(q,max,language,signal);
}

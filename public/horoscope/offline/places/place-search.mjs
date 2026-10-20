import {offlinePlaceLanguage} from './place-display.mjs';
import {createPlaceSearchEngine} from './place-search-worker.mjs';

let worker=null,workerDisabled=false,nextId=0;
const pending=new Map(),resultCache=new Map();
const fallback=createPlaceSearchEngine();
const normalize=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

function settle(id,message){
 const item=pending.get(id);if(!item)return;
 pending.delete(id);
 if(item.signal&&item.abort)item.signal.removeEventListener('abort',item.abort);
 if(message?.error){const error=new Error(message.error);error.name=message.name||'Error';item.reject(error);}
 else item.resolve(Array.isArray(message?.result)?message.result:[]);
}
function ensureWorker(){
 if(workerDisabled||typeof Worker!=='function')return null;
 if(worker)return worker;
 try{
  const candidate=new Worker(new URL('./place-search-worker.mjs',import.meta.url),{type:'module',name:'smv-india-place-search'});
  candidate.onmessage=event=>settle(event.data?.id,event.data||{});
  candidate.onerror=event=>{
   const error=new Error(event?.message||'Place-search Worker failed');
   for(const [id,item] of pending){pending.delete(id);if(item.signal&&item.abort)item.signal.removeEventListener('abort',item.abort);item.reject(error);}
   candidate.terminate();if(worker===candidate)worker=null;workerDisabled=true;
  };
  worker=candidate;
  return candidate;
 }catch(_error){workerDisabled=true;return null;}
}
function workerSearch(query,limit,language,signal){
 const active=ensureWorker();
 if(!active)return Promise.reject(new Error('Place-search Worker is unavailable'));
 const id=++nextId;
 return new Promise((resolve,reject)=>{
  const item={resolve,reject,signal,abort:null};
  if(signal){
   item.abort=()=>{
    if(!pending.has(id))return;
    pending.delete(id);
    try{active.postMessage({kind:'cancel',id});}catch(_){}
    reject(new DOMException('Aborted','AbortError'));
   };
   if(signal.aborted){item.abort();return;}
   signal.addEventListener('abort',item.abort,{once:true});
  }
  pending.set(id,item);
  try{active.postMessage({kind:'search',id,query,limit,language});}
  catch(error){pending.delete(id);if(signal&&item.abort)signal.removeEventListener('abort',item.abort);reject(error);}
 });
}
export async function searchPlaces(query,limit=12,signal){
 const normalized=normalize(query);
 if(normalized.length<2)return[];
 const max=Math.max(1,Math.min(70,Number(limit)||12));
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const language=offlinePlaceLanguage();
 const cacheKey=normalized+'|'+max+'|'+language;
 if(resultCache.has(cacheKey))return resultCache.get(cacheKey);

 // Main path executes JSON parsing and scanning in place-search-worker.mjs.
 // In browsers without module Workers, use the same ranked, split-shard engine.
 const active=ensureWorker();
 let result;
 if(active){
  try{result=await workerSearch(normalized,max,language,signal);}
  catch(error){if(!workerDisabled)throw error;}
 }
 if(!result)result=await fallback.searchPlaces(normalized,max,language,()=>signal?.aborted===true);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 resultCache.set(cacheKey,result);
 if(resultCache.size>80)resultCache.delete(resultCache.keys().next().value);
 return result;
}

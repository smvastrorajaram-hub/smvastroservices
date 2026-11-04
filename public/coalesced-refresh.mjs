/**
 * Coalesces same-key reads into one in-flight operation.
 * A forced refresh arriving during that operation schedules one follow-up pass,
 * regardless of how many invalidations arrive before the first pass completes.
 */
export function createCoalescedRefresh(){
 const active=new Map();
 return function refresh(key,execute,{force=false}={}){
  const normalizedKey=String(key??'');
  if(typeof execute!=='function')throw new TypeError('A refresh operation is required.');
  const existing=active.get(normalizedKey);
  if(existing){
   if(force)existing.queued=true;
   return existing.promise;
  }
  const state={key:normalizedKey,queued:false,promise:null};
  const run=async()=>{
   let result;
   do{
    state.queued=false;
    result=await execute();
   }while(state.queued&&active.get(normalizedKey)===state);
   return result;
  };
  state.promise=run().finally(()=>{if(active.get(normalizedKey)===state)active.delete(normalizedKey);});
  active.set(normalizedKey,state);
  return state.promise;
 };
}

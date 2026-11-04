/**
 * Coalesces same-key reads into one in-flight operation.
 * A forced refresh arriving during that operation schedules one follow-up pass,
 * regardless of how many invalidations arrive before the first pass completes.
 */
export function createCoalescedRefresh(){
 let active=null;
 return function refresh(key,execute,{force=false}={}){
  const normalizedKey=String(key??'');
  if(typeof execute!=='function')throw new TypeError('A refresh operation is required.');
  if(active&&active.key===normalizedKey){
   if(force)active.queued=true;
   return active.promise;
  }
  const state={key:normalizedKey,queued:false,promise:null};
  const run=async()=>{
   let result;
   do{
    state.queued=false;
    result=await execute();
   }while(state.queued&&active===state);
   return result;
  };
  state.promise=run().finally(()=>{if(active===state)active=null;});
  active=state;
  return state.promise;
 };
}

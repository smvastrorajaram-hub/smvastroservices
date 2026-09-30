/* Phase 3B local-only Swiss Ephemeris provider boundary.
   Vendor files MUST be stored under ./vendor/. No CDN/network fallback exists. */
export const C={SUN:0,MOON:1,MERCURY:2,VENUS:3,MARS:4,JUPITER:5,SATURN:6,MEAN_NODE:10};
export let ephemerisMode='LOCAL-WASM';
let instance=null;
let factoryPromise=null;

async function loadFactory(){
  if(typeof globalThis.__SMV_CREATE_SWEPH_WASM__==='function') return globalThis.__SMV_CREATE_SWEPH_WASM__;
  if(factoryPromise)return factoryPromise;
  factoryPromise=(async()=>{
    const base=new URL('./vendor/smv-swisseph-local.mjs',import.meta.url);
    try{
      // A same-origin fetch gives a clearer HTTP failure and seeds the V99 SW cache.
      // cache:'reload' bypasses a stale browser HTTP cache while the SW can still
      // return its last known-good local runtime when the network is temporarily down.
      const probe=await fetch(base.href,{cache:'reload'});
      if(!probe.ok)throw new Error('HTTP '+probe.status+' for '+base.pathname);
      const mod=await import(base.href);
      const f=mod.createSMVSwissEph||mod.default;
      if(typeof f!=='function')throw new Error('Swiss module loaded without factory export.');
      return f;
    }catch(e){
      factoryPromise=null; // failed attempts are never sticky; reopen/retry is real.
      const reason=String(e?.message||e||'unknown module-load error');
      throw new Error('Local Swiss Ephemeris WASM runtime could not load: '+reason);
    }
  })();
  return factoryPromise;
}
export async function getSwe(){
  if(instance)return instance;
  const factory=await loadFactory();
  if(typeof factory!=='function')throw new Error('Invalid local Swiss Ephemeris factory.');
  instance=await factory();
  const required=['utcToJd','setSiderealLahiri','siderealSpeedFlags','calc','ayanamsa','houses'];
  for(const k of required)if(typeof instance?.[k]!=='function')throw new Error('Local WASM provider missing '+k);
  ephemerisMode=instance.ephemerisMode||'LOCAL-SWIEPH-WASM';
  return instance;
}

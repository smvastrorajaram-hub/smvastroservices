/* Phase 3B local-only Swiss Ephemeris provider boundary.
   Vendor files MUST be stored under ./vendor/. No CDN/network fallback exists. */
export const C={SUN:0,MOON:1,MERCURY:2,VENUS:3,MARS:4,JUPITER:5,SATURN:6,MEAN_NODE:10};
export let ephemerisMode='LOCAL-WASM';
let instance=null;
let instancePromise=null;
let factoryPromise=null;

async function loadFactory(){
  if(typeof globalThis.__SMV_CREATE_SWEPH_WASM__==='function') return globalThis.__SMV_CREATE_SWEPH_WASM__;
  if(factoryPromise)return factoryPromise;
  factoryPromise=(async()=>{
    const base=new URL('./vendor/smv-swisseph-local.mjs',import.meta.url);
    try{
      // Keep the stable module URL so V99's Service Worker can return the last
      // known-good cached Swiss runtime. Do not cache-bust this import: query
      // variants can bypass the exact cached module and recreate intermittent
      // "Failed to fetch" behaviour when the network is unstable.
      const probe=await fetch(base.href,{cache:'reload'});
      if(!probe.ok)throw new Error('HTTP '+probe.status+' for '+base.pathname);
      const mod=await import(base.href);
      const f=mod.createSMVSwissEph||mod.default;
      if(typeof f!=='function')throw new Error('Swiss module loaded without factory export.');
      return f;
    }catch(e){
      // Never keep a rejected module/factory promise. A later reopen/retry can
      // make a clean attempt after network/cache recovery.
      factoryPromise=null;
      const reason=String(e?.message||e||'unknown module-load error');
      throw new Error('Local Swiss Ephemeris WASM runtime could not load: '+reason);
    }
  })();
  return factoryPromise;
}

export async function getSwe(){
  if(instance)return instance;
  // Deduplicate simultaneous Dasha/Transit requests while still clearing a
  // failed initialization so a later attempt is genuinely recoverable.
  if(instancePromise)return instancePromise;
  instancePromise=(async()=>{
    const factory=await loadFactory();
    if(typeof factory!=='function')throw new Error('Invalid local Swiss Ephemeris factory.');
    const candidate=await factory();
    const required=['utcToJd','setSiderealLahiri','siderealSpeedFlags','calc','ayanamsa','houses'];
    for(const k of required)if(typeof candidate?.[k]!=='function')throw new Error('Local WASM provider missing '+k);
    instance=candidate;
    ephemerisMode=instance.ephemerisMode||'LOCAL-SWIEPH-WASM';
    return instance;
  })();
  try{return await instancePromise;}
  catch(e){
    instance=null;
    // If initialization itself failed, also release the factory promise so a
    // subsequent retry can re-import after the underlying runtime recovers.
    factoryPromise=null;
    throw e;
  }finally{
    instancePromise=null;
  }
}

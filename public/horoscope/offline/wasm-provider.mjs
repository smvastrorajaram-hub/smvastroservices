/* Phase 3B local-only Swiss Ephemeris provider boundary.
   Vendor files MUST be stored under ./vendor/. No CDN/network fallback exists. */
export const C={SUN:0,MOON:1,MERCURY:2,VENUS:3,MARS:4,JUPITER:5,SATURN:6,MEAN_NODE:10};
export let ephemerisMode='LOCAL-WASM';
let instance=null;

async function loadFactory(){
  if(typeof globalThis.__SMV_CREATE_SWEPH_WASM__==='function') return globalThis.__SMV_CREATE_SWEPH_WASM__;
  try{
    const mod=await import('./vendor/smv-swisseph-local.mjs?v=82');
    return mod.createSMVSwissEph || mod.default;
  }catch(e){
    const reason=String(e?.message||e||'unknown module-load error');
    throw new Error('Local Swiss Ephemeris WASM runtime could not load: '+reason);
  }
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

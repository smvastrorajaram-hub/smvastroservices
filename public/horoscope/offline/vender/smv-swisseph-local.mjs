import Swisseph from './wasm/swisseph.js';
const SWIEPH=2, SPEED=256, SIDEREAL=65536, LAHIRI=1, GREG=1;
export async function createSMVSwissEph(){
  const M=await Swisseph({locateFile:(path)=>{const u=new URL('./wasm/'+path, import.meta.url);return (typeof process!=='undefined'&&process.versions?.node)?decodeURIComponent(u.pathname):u.href;}});
  M.ccall('swe_set_ephe_path','void',['string'],['/sweph']);
  const malloc=M._malloc, free=M._free;
  const utcToJd=(y,mo,d,h,mi,s)=>{const p=malloc(16);M.ccall('swe_utc_to_jd','void',['number','number','number','number','number','number','number','pointer'],[y,mo,d,h,mi,s,GREG,p]);const et=M.HEAPF64[p>>3],ut=M.HEAPF64[(p>>3)+1];free(p);return{et,ut}};
  const calc=(jd,body,flags)=>{const p=malloc(48),e=malloc(256);const ret=M.ccall('swe_calc','number',['number','number','number','pointer','pointer'],[jd,body,flags,p,e]);const a=M.HEAPF64.slice(p>>3,(p>>3)+6);const msg=M.UTF8ToString(e);free(p);free(e);if(ret<0)throw new Error(msg||'Swiss Ephemeris calculation failed');if((ret&SWIEPH)!==SWIEPH)throw new Error('Swiss Ephemeris data not used; Moshier/JPL fallback rejected. retFlag='+ret);return{longitude:a[0],latitude:a[1],distance:a[2],speed:a[3],retFlag:ret,ephemeris:'swiss'}};
  const houses=(jd,lat,lon,hs='S')=>{const cp=malloc(13*8),ap=malloc(10*8);M.ccall('swe_houses_ex','number',['number','number','number','number','number','pointer','pointer'],[jd,SIDEREAL,lat,lon,hs.charCodeAt(0),cp,ap]);const c=Array.from(M.HEAPF64.slice(cp>>3,(cp>>3)+13)),a=Array.from(M.HEAPF64.slice(ap>>3,(ap>>3)+10));free(cp);free(ap);return{cusps:c.slice(1,13),ascendant:a[0],mc:a[1],ascmc:a}};
  return {
    ephemerisMode:'SWISS', version:'Swiss Ephemeris WASM 2.10.03',
    utcToJd,
    setSiderealLahiri(){M.ccall('swe_set_sid_mode','void',['number','number','number'],[LAHIRI,0,0])},
    siderealSpeedFlags(){return SWIEPH|SPEED|SIDEREAL},
    calc,
    ayanamsa(jd){return M.ccall('swe_get_ayanamsa_ut','number',['number'],[jd])},
    houses,
    close(){M.ccall('swe_close','void',[],[])}
  };
}
export default createSMVSwissEph;

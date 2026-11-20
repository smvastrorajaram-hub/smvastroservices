import assert from 'node:assert/strict';
import swe from 'sweph';

// Deterministic audit of actual Swiss Ephemeris Sripati cusps.
// Ten thousand global samples + ten thousand India-region samples.
// This measures Bhava Madhya -> Sphuta Rasi occupancy; it does not mock
// calculation data or change astronomical algorithms.
const {constants:C}=swe;
assert.equal(typeof swe.houses_ex2,'function');
assert.equal(typeof swe.utc_to_jd,'function');
if(typeof swe.set_sid_mode==='function'&&C.SE_SIDM_LAHIRI!==undefined){
  swe.set_sid_mode(C.SE_SIDM_LAHIRI,0,0);
}
const norm360=value=>((value%360)+360)%360;
const start=Date.UTC(1800,0,1),end=Date.UTC(2400,0,1);
const dayCount=Math.floor((end-start)/86400000);
function makeRandom(seed){
  let state=seed>>>0;
  return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function extractCusps(hres){
  const raw=hres?.data?.houses??hres?.data?.cusps??[];
  let source=[];
  if(Array.isArray(raw))source=raw;
  else if(raw&&typeof raw==='object'){
    if(Array.isArray(raw.houses))source=raw.houses;
    else if(Array.isArray(raw.cusps))source=raw.cusps;
    else source=Array.from({length:13},(_,i)=>raw[i]??raw[String(i)]);
  }
  const oneBased=source.length>=13;
  const cusps=Array.from({length:12},(_,i)=>norm360(Number(source[oneBased?i+1:i])));
  assert.ok(cusps.every(Number.isFinite),'All twelve Sripati cusps must be finite.');
  return cusps;
}
function auditRegion(region,seed){
  const random=makeRandom(seed);
  const report={
    region:region.name,samples:10000,validHouseRows:0,
    northHouseOrderFailures:0,missingOrDuplicatedHouseIds:0,
    southEastCollisionSamples:0,southEastEmptySignSamples:0,
    multiHouseSignCells:0,emptySignCells:0,maxBhavasInOneSignCell:0,
    examples:[]
  };
  for(let sample=0;sample<report.samples;sample++){
    const date=new Date(start+Math.floor(random()*dayCount)*86400000);
    const minute=Math.floor(random()*1440),hour=Math.floor(minute/60),min=minute%60;
    const lat=Number((region.latMin+random()*(region.latMax-region.latMin)).toFixed(6));
    const lon=Number((region.lonMin+random()*(region.lonMax-region.lonMin)).toFixed(6));
    const utc=swe.utc_to_jd(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),hour,min,0,C.SE_GREG_CAL);
    assert.ok(utc&&!utc.error&&Array.isArray(utc.data),'UTC/JD failed at '+region.name+' sample '+sample+': '+String(utc?.error||'no data'));
    const hres=swe.houses_ex2(Number(utc.data[1]),C.SEFLG_SIDEREAL,lat,lon,'S');
    assert.ok(hres&&!hres.error&&!(hres.flag!==undefined&&Number(hres.flag)<0),'Sripati failed at '+region.name+' sample '+sample+': '+String(hres?.error||hres?.flag||'no result'));
    const cusps=extractCusps(hres);
    const houses=Array.from({length:12},(_,i)=>{
      const madhya=norm360(cusps[i]+norm360(cusps[(i+1)%12]-cusps[i])/2);
      return {house:i+1,madhya,sign:Math.floor(madhya/30)};
    });
    const northSlots=houses.map(row=>row.house);
    if(northSlots.length!==12||northSlots.some((house,index)=>house!==index+1))report.northHouseOrderFailures++;
    if(new Set(northSlots).size!==12||northSlots.some(house=>house<1||house>12))report.missingOrDuplicatedHouseIds++;
    const bySign=Array.from({length:12},()=>[]);
    houses.forEach(row=>bySign[row.sign].push(row.house));
    const flattened=bySign.flat().sort((a,b)=>a-b);
    assert.deepEqual(flattened,[1,2,3,4,5,6,7,8,9,10,11,12],'South/East sign grouping must not lose or duplicate any Bhava number.');
    const multi=bySign.map((list,sign)=>({sign:sign+1,houses:list})).filter(row=>row.houses.length>1);
    const empty=bySign.map((list,sign)=>({sign:sign+1})).filter((row,index)=>bySign[index].length===0);
    report.validHouseRows++;
    report.multiHouseSignCells+=multi.length;
    report.emptySignCells+=empty.length;
    report.maxBhavasInOneSignCell=Math.max(report.maxBhavasInOneSignCell,...bySign.map(list=>list.length));
    if(multi.length)report.southEastCollisionSamples++;
    if(empty.length)report.southEastEmptySignSamples++;
    if(multi.length&&report.examples.length<6){
      report.examples.push({
        sample,date:date.toISOString().slice(0,10),
        time:hour.toString().padStart(2,'0')+':'+min.toString().padStart(2,'0'),
        latitude:lat,longitude:lon,collisions:multi,emptySigns:empty.map(row=>row.sign)
      });
    }
  }
  assert.equal(report.validHouseRows,10000,region.name+': exactly 10,000 charts must be calculated.');
  assert.equal(report.northHouseOrderFailures,0,region.name+': North fixed Bhava positions must retain I–XII.');
  assert.equal(report.missingOrDuplicatedHouseIds,0,region.name+': no Bhava house ID may be lost or duplicated.');
  return report;
}
const reports=[
  auditRegion({name:'Worldwide (latitude -55..55, longitude -180..180)',latMin:-55,latMax:55,lonMin:-180,lonMax:180},0x5a17c0de),
  auditRegion({name:'India (latitude 6..38, longitude 68..98)',latMin:6,latMax:38,lonMin:68,lonMax:98},0x1a2b3c4d)
];
console.log('20,000 RANDOM BIRTH-CHART BHAVA NUMBERING AUDIT');
console.log(JSON.stringify({samplesPerRegion:10000,houseSystem:'Sripati',ayanamsa:'Lahiri',dateRange:'1800-01-01 through 2399-12-31',reports},null,2));
console.log('20,000-sample Sripati Bhava house-order audit: PASS');

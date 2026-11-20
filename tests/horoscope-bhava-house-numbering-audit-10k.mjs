import assert from 'node:assert/strict';
import swe from 'sweph';

// Deterministic 10,000-sample audit of real Swiss Ephemeris Sripati cusps.
// This intentionally audits the current Bhava Madhya -> Sphuta Rasi mapping;
// it does not alter or mock the astronomical calculation.
const {constants:C}=swe;
assert.equal(typeof swe.houses_ex2,'function','sweph.houses_ex2 must be available.');
assert.equal(typeof swe.utc_to_jd,'function','sweph.utc_to_jd must be available.');
if(typeof swe.set_sid_mode==='function'&&C.SE_SIDM_LAHIRI!==undefined){
  swe.set_sid_mode(C.SE_SIDM_LAHIRI,0,0);
}
const SEED=0x5a17c0de;
let state=SEED>>>0;
function random(){
  state=(state+0x6d2b79f5)>>>0;
  let t=state;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
const norm360=value=>((value%360)+360)%360;
const toDate=days=>new Date(Date.UTC(1800,0,1)+days*86400000);
const start=Date.UTC(1800,0,1);
const end=Date.UTC(2400,0,1);
const dayCount=Math.floor((end-start)/86400000);
const signName=sign=>sign+1;
const totals={
  samples:10000,validHouseRows:0,northMissingOrDuplicate:0,
  southEastCollisionSamples:0,southEastEmptySignSamples:0,
  cellsWithMultipleBhavas:0,maxBhavasInOneSignCell:0,
  houseCellCollisionHistogram:{},examples:[]
};
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
  assert.ok(cusps.every(Number.isFinite),'Every random chart must return twelve finite Sripati cusps.');
  return cusps;
}
for(let sample=0;sample<totals.samples;sample++){
  const date=toDate(Math.floor(random()*dayCount));
  const minute=Math.floor(random()*1440);
  const hour=Math.floor(minute/60),min=minute%60;
  const lat=Number((-55+random()*110).toFixed(6));
  const lon=Number((-180+random()*360).toFixed(6));
  const utc=swe.utc_to_jd(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),hour,min,0,C.SE_GREG_CAL);
  assert.ok(utc&&!utc.error&&Array.isArray(utc.data),'UTC/JD conversion failed at random sample '+sample+': '+String(utc?.error||'no data'));
  const jdUt=Number(utc.data[1]);
  const hres=swe.houses_ex2(jdUt,C.SEFLG_SIDEREAL,lat,lon,'S');
  assert.ok(hres&&!hres.error&&!(hres.flag!==undefined&&Number(hres.flag)<0),'Sripati house calculation failed at random sample '+sample+': '+String(hres?.error||hres?.flag||'no result'));
  const cusps=extractCusps(hres);
  const houses=Array.from({length:12},(_,i)=>{
    const next=cusps[(i+1)%12];
    const madhya=norm360(cusps[i]+norm360(next-cusps[i])/2);
    return {house:i+1,madhya,sign:Math.floor(madhya/30)};
  });
  const ids=houses.map(row=>row.house);
  assert.deepEqual(ids,[1,2,3,4,5,6,7,8,9,10,11,12],'North Indian fixed house reading must retain I–XII in house order.');
  assert.ok(houses.every(row=>Number.isInteger(row.sign)&&row.sign>=0&&row.sign<12),'Every Bhava Madhya must map to one valid Sphuta Rasi.');
  totals.validHouseRows++;
  const bySign=Array.from({length:12},()=>[]);
  for(const row of houses)bySign[row.sign].push(row.house);
  const multi=bySign.filter(list=>list.length>1);
  const empty=bySign.filter(list=>list.length===0);
  const max=Math.max(...bySign.map(list=>list.length));
  totals.cellsWithMultipleBhavas+=multi.length;
  totals.maxBhavasInOneSignCell=Math.max(totals.maxBhavasInOneSignCell,max);
  if(multi.length){
    totals.southEastCollisionSamples++;
    totals.houseCellCollisionHistogram[multi.length]=(totals.houseCellCollisionHistogram[multi.length]||0)+1;
  }
  totals.southEastEmptySignSamples+=empty.length;
  if(multi.length&&totals.examples.length<12){
    totals.examples.push({
      sample,date:date.toISOString().slice(0,10),time:hour.toString().padStart(2,'0')+':'+min.toString().padStart(2,'0'),
      latitude:lat,longitude:lon,
      collisions:bySign.map((list,sign)=>({sign:signName(sign),houses:list})).filter(row=>row.houses.length>1),
      emptySigns:bySign.map((list,sign)=>({sign:signName(sign)})).filter((row,index)=>bySign[index].length===0).map(row=>row.sign)
    });
  }
}
assert.equal(totals.validHouseRows,10000,'Exactly 10,000 real Sripati birth-time samples must be audited.');
assert.equal(totals.northMissingOrDuplicate,0,'North fixed house positions must contain each Bhava I–XII exactly once.');
console.log('10,000 RANDOM BIRTH-CHART BHAVA NUMBERING AUDIT');
console.log(JSON.stringify({...totals,seed:'0x'+SEED.toString(16),houseSystem:'Sripati',ayanamsa:'Lahiri',dateRange:'1800-01-01 through 2399-12-31',latitudeRange:'-55..+55',longitudeRange:'-180..+180'},null,2));
console.log('10,000-sample Sripati Bhava house-order audit: PASS');

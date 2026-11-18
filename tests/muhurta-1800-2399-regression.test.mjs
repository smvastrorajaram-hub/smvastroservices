import assert from 'node:assert/strict';
import test from 'node:test';
import {getSwe} from '../public/horoscope/offline/wasm-provider.mjs';
import {
  TAMIL_ACTIVITIES,PAN_INDIAN_ACTIVITIES,
  evaluateTamilMuhurta,evaluatePanIndianMuhurta
} from '../public/horoscope/muhurta/index.mjs';

const DAY_MS=86400000;
const START=Date.UTC(1800,0,1);
const END=Date.UTC(2400,0,1);
const EXPECTED_DAYS=(END-START)/DAY_MS;
const norm360=value=>((value%360)+360)%360;

test('full 1800–2399 daily Swiss Ephemeris coverage and both engine interfaces', {timeout:600000}, async()=>{
  assert.equal(EXPECTED_DAYS,219145,'Gregorian 1800–2399 inclusive day count');
  const swe=await getSwe();
  swe.setSiderealLahiri();
  const flags=swe.siderealSpeedFlags();
  const planetBodies=[0,1,2,3,4,5,6,10];
  const houseOccupants=Array.from({length:12},()=>[]);
  let scanned=0;
  for(let timestamp=START;timestamp<END;timestamp+=DAY_MS){
    const date=new Date(timestamp);
    const y=date.getUTCFullYear(),m=date.getUTCMonth()+1,d=date.getUTCDate();
    // Perambalur local noon (UTC+05:30); geocentric positions are independent
    // of observer, while using a fixed local civil-day instant keeps date mapping explicit.
    const jd=swe.utcToJd(y,m,d,6,30,0);
    const planetaryPositions=new Map();
    for(const body of planetBodies){
      const position=swe.calc(jd.et,body,flags);
      assert.ok(Number.isFinite(position.longitude)&&position.longitude>=0&&position.longitude<360,
        'invalid Swiss longitude body '+body+' on '+date.toISOString().slice(0,10));
      assert.equal(position.ephemeris,'swiss');
      planetaryPositions.set(body,position.longitude);
    }
    const sun=planetaryPositions.get(0),moon=planetaryPositions.get(1);
    const elongation=norm360(moon-sun);
    const combined=norm360(moon+sun);
    const tithiNumber=Math.floor(elongation/12)+1;
    const karanaNumber=Math.floor(elongation/6)+1;
    const nakshatraNumber=Math.floor(moon/(360/27))+1;
    const yogaNumber=Math.floor(combined/(360/27))+1;
    assert.ok(tithiNumber>=1&&tithiNumber<=30);
    assert.ok(karanaNumber>=1&&karanaNumber<=60);
    assert.ok(nakshatraNumber>=1&&nakshatraNumber<=27);
    assert.ok(yogaNumber>=1&&yogaNumber<=27);
    const ascendant=swe.houses(jd.ut,11.2342,78.8808,'S').ascendant;
    assert.ok(Number.isFinite(ascendant)&&ascendant>=0&&ascendant<360,
      'invalid sidereal ascendant on '+date.toISOString().slice(0,10));
    const weekdayIndex=date.getUTCDay();
    const facts={
      schema:'smv.muhurta.astronomy-facts.v1',
      sourceEngine:'existing-smv-swiss-ephemeris-thirukanitha',
      date:date.toISOString().slice(0,10),
      time:'12:00',latitude:11.2342,longitude:78.8808,
      timezone:'Asia/Kolkata',utcOffsetMinutes:330,
      weekdayIndex,tithiNumber,nakshatraNumber,
      tithiName:'',nakshatraName:'',paksha:'',
      yogaNumber:null,karanaNumber:null,
      lagnaSignIndex:null,houseOccupants,
      planets:[],panchangaBoundaries:{}
    };
    for(const item of TAMIL_ACTIVITIES){
      const result=evaluateTamilMuhurta(item.id,facts);
      assert.ok(['ELIGIBLE','CONDITIONAL','REJECTED','NOT_VERIFIED'].includes(result.status), 'invalid Tamil status '+item.id+' '+facts.date);
    }
    for(const item of PAN_INDIAN_ACTIVITIES){
      const result=evaluatePanIndianMuhurta(item.id,facts);
      assert.ok(['ELIGIBLE','CONDITIONAL','REJECTED','NOT_VERIFIED'].includes(result.status), 'invalid Pan-Indian status '+item.id+' '+facts.date);
    }
    scanned++;
  }
  swe.close();
  assert.equal(scanned,219145);
});

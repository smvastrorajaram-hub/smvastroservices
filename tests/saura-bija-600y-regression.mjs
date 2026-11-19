import assert from 'node:assert/strict';
import {
  sauraBijaCorrectedMeanDailyMotion as rate,
  sauraBijaCorrectedMeanOrbitalLongitude as mean,
  sauraBijaCorrectedFivePlanetInputs as inputs,
  sauraBijaCorrectedTrueLongitudeResearch as trueResearch,
  SAURA_BIJA_CORRECTED_METADATA as metadata
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import { sauraMeanDailyMotion as originalRate } from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';

const N = { Sun:4320000, Mercury:17937044, Venus:7022364, Mars:2296832, Jupiter:364212, Saturn:146580 };
const bodies = ['Mars','Mercury','Jupiter','Venus','Saturn'];
const inner = new Set(['Mercury','Venus']);
const D = 1577917828, E = 588465.5, U = 75 + 46/60;
const jd = (y,m,d,h=0) => Date.UTC(y,m-1,d,h)/86400000+2440587.5;
const norm = x => ((x%360)+360)%360;
const near = (x,y,t,label) => assert.ok(Number.isFinite(x)&&Math.abs(((x-y+540)%360)-180)<=t,label);
assert.deepEqual([...metadata.supportedCivilYears],[1800,2399]);
assert.deepEqual({...metadata.revolutionsPerMahayuga},N);

for (const [body,n] of Object.entries(N)) {
  near(rate(body), n*360/D, 1e-12, body+' printed corrected rate');
  const at=jd(1860,1,1), days=at-E+U/360;
  near(mean(at,body),norm(((days*n/D)%1)*360),1e-10,body+' independent 1860 mean reconstruction');
  if (body==='Sun'||body==='Mars') near(rate(body),originalRate(body),1e-12,body+' unchanged Bija');
  else assert.notEqual(rate(body),originalRate(body),body+' corrected rate');
}

let samples=0, first=null, last=null;
for(let year=1800;year<=2399;year++) for(const month of [1,4,7,10]) {
  const at=jd(year,month,1,12), sun=mean(at,'Sun'), row={year,month,grahas:{}};
  for(const body of bodies) {
    const a=inputs(at,body), own=mean(at,body), q=trueResearch(at,body);
    near(a.meanLongitude,inner.has(body)?sun:own,1e-10,body+' mean selector');
    near(a.sheeghrocca,inner.has(body)?own:sun,1e-10,body+' sighrocca selector');
    assert.equal(a.frame,'traditional-Saura-nirayana');
    assert.ok(Number.isFinite(q.trueLongitude)&&q.trueLongitude>=0&&q.trueLongitude<360);
    assert.equal(q.bījaTrueLongitudeResearchOnly,true);
    assert.equal(q.productionEligible,false);
    row.grahas[body]={mean:a.meanLongitude,sheeghrocca:a.sheeghrocca,mandocca:q.mandocca,trueLongitude:q.trueLongitude};
    samples++;
  }
  if(!first) first=row;
  last=row;
}
assert.equal(samples,12000);
assert.equal(first.year,1800);
assert.equal(last.year,2399);
for(const body of Object.keys(N)) near(mean(jd(2026,3,23),body),norm(mean(jd(2026,3,22),body)+rate(body)),1e-9,body+' one-day continuity');
assert.throws(()=>mean(jd(1799,12,31),'Mars'),RangeError);
assert.throws(()=>mean(jd(2400,1,1),'Mars'),RangeError);
assert.throws(()=>inputs(jd(2026,3,22),'Sun'),RangeError);
assert.throws(()=>mean(jd(2026,3,22),'Rahu'),RangeError);
console.log(JSON.stringify({pass:true,interval:'1800-01-01..2399-12-31',fivePlanetRows:samples,checkpoints:2400,first,last,productionChanged:false}));

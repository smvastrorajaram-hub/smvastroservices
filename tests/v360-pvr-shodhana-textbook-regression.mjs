// V360 source-to-book independent Shodhana oracle.
// P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach,
// book pp 157–160, PDF pp 169–172, §12.7.1–12.7.3,
// Examples 40, 41, 42 (a–e), 43.
// Existing Santhanam BPHS II 67–69 tests run separately.
// Important: manuscript disagreements and undefined equal/occupied case
// are never silently treated as certified textbook rules.
import assert from 'node:assert/strict';
import {trikonaShodhana,ekadhipatyaShodhana,pindaSadhana,classicalShodhana} from '../public/horoscope/offline/classical-shodhana.browser.mjs';
let n=0;
function same(a,b,label){assert.deepEqual(a,b,label);n++;}
function ok(v,label){assert.ok(v,label);n++;}
const originalMercury=[7,4,7,4,4,3,4,4,4,3,6,4];
const mercurySoAV=[3,1,3,0,0,0,0,0,0,0,2,0];
// PVR Example 40, including first fiery trines [7,4,4] -> [3,0,0]
// and watery [4,4,4] -> [0,0,0].
const reduced=trikonaShodhana(originalMercury);
same(reduced.values,mercurySoAV,'PVR Example 40 full 12-sign Mercury Trikona table');
same([reduced.values[0],reduced.values[4],reduced.values[8]],[3,0,0],'PVR fire trine example');
same([reduced.values[3],reduced.values[7],reduced.values[11]],[0,0,0],'PVR water trine example');
same(originalMercury,[7,4,7,4,4,3,4,4,4,3,6,4],'Input raw Mercury BAV not mutated');
// Venus owns Taurus / Libra (indices 1 and 6).
function pair(a,b,occupied){
 const v=Array(12).fill(0);v[1]=a;v[6]=b;
 const o=ekadhipatyaShodhana(v,occupied);
 return {values:[o.values[1],o.values[6]],trace:o.trace.find(t=>t.signs[0]===1)};
}
same(pair(4,2,[1,6]).values,[4,2],'PVR Example42(a) both occupied -> unchanged');
same(pair(4,2,[1]).values,[4,0],'PVR Example42(b) lower empty becomes zero');
same(pair(4,2,[6]).values,[2,2],'PVR Example42(c) larger empty becomes inhabited count');
same(pair(4,2,[]).values,[2,2],'PVR Example42(d) both empty unequal -> both lower');
same(pair(2,2,[]).values,[0,0],'PVR Example42(e) both empty equal -> both zero');
same(pair(2,5,[1]).values,[2,2],'PVR 3(b) discriminating regression: 5 replaced with 2, NOT 5-2=3');
same(pair(5,2,[6]).values,[2,2],'PVR 3(b) symmetric direction from occupied Libra to empty Taurus');
same(pair(4,0,[1]).values,[4,0],'PVR Ekadhipatya rule 1 (zero) no reduction');
// Exhaustively check all 5 co-owned pairs and nonzero counts, both
// empty / both occupied / one occupied for unequal values, to verify
// symmetric handling without borrowing source code tables.
const ownedPairs=[[0,7],[1,6],[2,5],[8,11],[9,10]];
for(const [a,b] of ownedPairs){
 for(let x=1;x<=8;x++)for(let y=1;y<=8;y++){
  const v=Array(12).fill(0);v[a]=x;v[b]=y;
  for(const state of ['both','none','first','second']){
   // PVR does not expressly handle one-occupied equal counts;
   // do not invent book oracle for x === y in these two states.
   if(x===y&&(state==='first'||state==='second'))continue;
   const occupied=state==='both'?[a,b]:state==='first'?[a]:state==='second'?[b]:[];
   const actual=ekadhipatyaShodhana(v,occupied).values;
   let expected;
   if(state==='both')expected=[x,y];
   else if(state==='none')expected=(x===y?[0,0]:[Math.min(x,y),Math.min(x,y)]);
   else if(state==='first')expected=[x,y>x?x:0];
   else expected=[x>y?y:0,y];
   same([actual[a],actual[b]],expected,'PVR §12.7.2 pair '+a+','+b+' counts '+x+','+y+' state='+state);
  }
 }
}
// Mercury Example 41: every co-owned pair has a zero in SoAV
// so Ekaadhipatya does NOT change the SoAV row.
const occupiedMercury=[0,2,3,4,7];
same(ekadhipatyaShodhana(mercurySoAV,occupiedMercury).values,mercurySoAV,'PVR Example 41 Mercury SoAV unchanged');
// PVR Example43: book gives Sun,Mars,Mercury in Gemini, Venus Aries;
// other grahas in zero-rekha signs. Nodes not counted in Graha Pinda.
const grahaSigns={
 'சூரியன்':2,'சந்திரன்':3,'செவ்வாய்':2,'புதன்':2,
 'குரு':7,'சுக்கிரன்':0,'சனி':4
};
const p=pindaSadhana(mercurySoAV,grahaSigns);
same([p.rasiPinda,p.grahaPinda,p.yogaPinda],[77,75,152],
  'PVR Example 43 exact Rasi 77 + Graha 75 = Sodhya 152');
const full=classicalShodhana(originalMercury,occupiedMercury,grahaSigns);
same(full.trikona.values,mercurySoAV,'PVR full chain Trikona');
same(full.ekadhipatya.values,mercurySoAV,'PVR full chain Ekadhipatya');
same(full.pinda.yogaPinda,152,'PVR full chain Sodhya Pinda');
ok(full.certified===false,'Book numerical tests do not certify horoscope predictive correctness');
// PVR §12.8 book pp. 161–162: Parasara vs Varahamihira differ
// on THREE explicit Moon/Venus BAV reference cells. Confirm the
// BAV feeding Shodhana uses the Parasara school selected by this book.
const {full:computeNatal}=await import('../public/horoscope/offline/offline-engine.mjs');
const baseDates=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const sourceRefs=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','லக்கினம்'];
const modulo=x=>(x%12+12)%12;
for(const [date,time] of baseDates){
 const data=await computeNatal({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V360 Parasara school'});
 assert.ok(data.ok&&data.advanced?.ashtakavarga?.bhinna);n++;
 const positions=Object.fromEntries(data.chart.planets.map(p=>[p.name,Math.floor(modulo(p.longitude/30))]));
 const moon=data.advanced.ashtakavarga.bhinna.find(p=>p.planet==='சந்திரன்');
 const venus=data.advanced.ashtakavarga.bhinna.find(p=>p.planet==='சுக்கிரன்');
 function rekha(row,ref,house) {
   const sign=modulo(positions[ref]+house-1);
   return row.prastara[sign][sourceRefs.indexOf(ref)];
 }
 same(rekha(moon,'சந்திரன்',9),1,'PVR §12.8 Parasara Moon BAV from Moon 9th');
 same(rekha(moon,'செவ்வாய்',9),0,'PVR §12.8 Parasara Moon BAV from Mars 9th');
 same(rekha(moon,'குரு',2),1,'PVR §12.8 Parasara Moon BAV from Jupiter 2nd');
 same(rekha(moon,'குரு',12),0,'PVR §12.8 Parasara Moon BAV from Jupiter 12th');
 same(rekha(venus,'செவ்வாய்',4),1,'PVR §12.8 Parasara Venus BAV from Mars 4th');
 same(rekha(venus,'செவ்வாய்',5),0,'PVR §12.8 Parasara Venus BAV from Mars 5th');
}

console.log(JSON.stringify({pass:true,assertions:n,book:'P.V.R. Narasimha Rao Vedic Astrology: An Integrated Approach §12.7 pp157-160',workedExamples:[40,41,'42a','42b','42c','42d','42e',43],exactSodhyaPinda:152,testedPairs:5,independentPropertyCases:true,notCertified:['BPHS disputed diagram','one-occupied equal-value unspecified','full predictive interpretation']}));

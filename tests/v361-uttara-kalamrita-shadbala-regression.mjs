// SMV ASTRO V361: independent Uttara Kalamrita II pp. 41–45 numerical
// examples and evidence-gated Graha Yuddha, without changing BPHS base Balas.
import assert from 'node:assert/strict';
import {uttaraKalamritaGrahaYuddha as war,uttaraKalamritaRectifiedTotal as total} from '../public/horoscope/offline/uttara-kalamrita-shadbala.browser.mjs';
import {drigAspectorBenefic,drikBalaClassical} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
let checks=0;
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const yes=(v,label)=>{assert.ok(v,label);checks++};
const near=(a,b,label)=>{assert.ok(Math.abs(a-b)<1e-8,label+' actual='+a+' expected='+b);checks++};
// Uttara Kalamrita p.45 printed seven-graha summary. This is an
// independent book example, not numbers produced by this algorithm.
const previous=[3.83825,5.564,5.3799,7.658,5.1384,4.47685,4.97275];
const natural=[1,.857,.286,.428,.571,.714,.143];
const drig=[.2236,-.333,-.105,-.0256,.066,-.0123,.25];
const published=[5.06185,6.088,5.5609,8.0604,5.7754,5.17855,5.36575];
for(let i=0;i<7;i++)near(total(previous[i],natural[i],drig[i]),published[i],'UK II p45 total '+i);
near(total(5,.5,-.25,1),6.25,'UK northern planetary victory +1 Rupa');
near(total(5,.5,-.25,-1),4.25,'UK southern planetary defeat -1 Rupa');
assert.throws(()=>total(NaN,1,1),TypeError);checks++;
const p=(name,longitude,eclipticLatitude,bhava=4)=>({name,longitude,eclipticLatitude,bhava});
// UK II.16½–17½: unlike the old 1°-proximity approximation,
 // Graha Yuddha requires SAME degree and whole minute.
const base=[p('செவ்வாய்',100+1/3600,1.1),
            p('புதன்',100+55/3600,-.2),p('குரு',201,1)];
const input=JSON.stringify(base);
const a=war(base);
same([a.virupaByPlanet['செவ்வாய்'],a.virupaByPlanet['புதன்']],[60,-60],
 'same degree+minute northern latitude wins');
same(a.encounters.length,1,'one unambiguous war');
same(a.unresolved.length,0,'no unresolved wars');
same(JSON.stringify(base),input,'war does not mutate birth planets');
same(war([p('செவ்வாய்',100+4/3600,-2),p('புதன்',100+49/3600,1)])
 .virupaByPlanet['புதன்'],60,'same minute symmetric northern winner');
same(war([p('செவ்வாய்',359.7,1),p('புதன்',.3,0)])
 .encounters.length,0,'360 degree crossing is NOT identical degree+minute');
same(war([p('செவ்வாய்',100.001,1),p('புதன்',100.5,-1)])
 .encounters.length,0,'within one degree but different minutes means no war');
same(war([p('செவ்வாய்',100.01,1,3),p('புதன்',100.011,-1,4)])
 .encounters.length,0,'same minute but different bhavas means no war');
const missing=war([p('செவ்வாய்',100+1/3600,null),
                   p('புதன்',100+30/3600,0)]);
same(missing.encounters.length,0,'missing Swiss ecliptic latitude never guesses');
yes(missing.unresolved.some(x=>x.reason==='missing-ecliptic-latitude'),
 'missing latitude explicitly marked unresolved');
same(war([p('செவ்வாய்',100+1/3600,0),p('புதன்',100+30/3600,0)])
 .encounters.length,0,'same-minute north latitude tie no guessed winner');
const overlap=war([p('செவ்வாய்',100+1/3600,2),
 p('புதன்',100+20/3600,1),p('குரு',100+45/3600,0)]);
same(overlap.encounters.length,0,'same-minute three-way war cannot double count');
yes(overlap.unresolved.length>0,'same-minute overlap expressly unresolved');
same(war([p('சூரியன்',100,2),p('சந்திரன்',100.5,1),p('ராகு',100.7,0)])
 .encounters.length,0,'Sun Moon nodes not war contestants');
assert.throws(()=>war([p('செவ்வாய்',100,1),p('செவ்வாய்',100.5,0)]),RangeError);checks++;
const sun=p('சூரியன்',0,0),moon=p('சந்திரன்',90,0),mer=p('புதன்',210,0);
same(drigAspectorBenefic('சந்திரன்',[sun,moon,mer]),true,'waxing Moon benefic Drig');
same(drigAspectorBenefic('சந்திரன்',[sun,{...moon,longitude:270},mer]),false,'waning Moon malefic Drig');
same(drigAspectorBenefic('குரு',[sun,moon]),true,'Jupiter benefic Drig');
same(drigAspectorBenefic('சுக்கிரன்',[sun,moon]),true,'Venus benefic Drig');
same(drigAspectorBenefic('சனி',[sun,moon]),false,'Saturn malefic Drig');
same(drigAspectorBenefic('புதன்',[sun,moon,mer]),true,'isolated Mercury benefic');
same(drigAspectorBenefic('புதன்',[sun,moon,mer,p('ராகு',211,0)]),false,'Mercury with Rahu malefic');
same(drigAspectorBenefic('புதன்',[sun,moon,mer,p('சனி',211,0)]),false,'Mercury with Saturn malefic');
same(drigAspectorBenefic('புதன்',[sun,moon,p('புதன்',20,0)]),false,'Mercury conjoined Sun malefic');
const db=drikBalaClassical('செவ்வாய்',[sun,moon,mer,p('செவ்வாய்',180,0)]);
yes(Number.isFinite(db),'numerical Drig finite');
const {full}=await import('../public/horoscope/offline/offline-engine.mjs');
for(const [date,time] of [['1994-06-15','13:03'],['1992-07-31','22:05'],['1974-01-11','16:04']]){
  const data=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V361 UK evidence'});
  yes(data.ok,'full natal computational engine '+date);
  for(const planet of data.chart.planets.filter(p=>['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(p.name))){
    yes(Number.isFinite(planet.eclipticLatitude),date+' '+planet.name+' Swiss ecliptic latitude supplied');
    yes(Number.isFinite(planet.strength3.totalVirupa),date+' '+planet.name+' Shadbala finite');
    yes(Number.isFinite(planet.strength3.components.kala.yuddha),date+' '+planet.name+' Yuddha virupa number');
    same(planet.strength3.classicalCertified,false,'full Shadbala not falsely certified');
  }
}
console.log(JSON.stringify({pass:true,checks,book:'Uttara Kalamrita P S Sastri Chapter II pp 41-45',bookTableSevenPlanetNumericalChecks:7,grahaYuddha:'evidence-gated one-Rupa p45 convention',drig:'waxing Moon and Mercury conjunction sign-based',fullShadbalaCertified:false,issues:['book p41 disc formula vs p45 +/-1 Rupa unresolved','Cheshta mean/Sheeghra and precise sunrise unverified']}));

import assert from 'node:assert/strict';
import {computeClassicalFiveNatalCheshta as calculate}
  from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
const births=Object.freeze([
 {date:'1971-05-04',time:'05:05',utcOffsetMinutes:330},
 {date:'1974-01-11',time:'16:04',utcOffsetMinutes:330},
 {date:'1992-07-31',time:'22:05',utcOffsetMinutes:330},
 {date:'1994-06-15',time:'13:03',utcOffsetMinutes:330},
 {date:'2015-09-06',time:'09:30',utcOffsetMinutes:330}
]);
let assertions=0;

const check=(v,label)=>{assert.ok(v,label);assertions++};
let planetCount=0;
const summary=[];
for(const birth of births){
  const r=calculate(birth);
  check(r.planets.length===5,birth.date+' all five grahas');
  check(r.calculationAvailable&&!r.productionIntegrationAllowed,
    birth.date+' distinguish running numerical engine from complete certification');
  check(!r.natalHistoricalNumericalCertified&&!r.shadbalaNumericallyCertified,
    birth.date+' no false complete certificate');
  const names=new Set(r.planets.map(x=>x.planet));
  check(names.size===5,birth.date+' unique planets');
  for(const p of r.planets){
    planetCount++;
    check([p.meanLongitude,p.trueLongitude,p.sheeghrocha,p.mandocca,
      p.cheshtaKendra,p.cheshtaVirupa].every(Number.isFinite),p.planet+' finite six inputs');
    check(p.cheshtaVirupa>=0&&p.cheshtaVirupa<=60,
      p.planet+' strict 0–60 Virupa');
    check(!p.certified&&p.model==='unmodified Surya Siddhanta',
      p.planet+' coherent classical model provenance');
    check(p.trueModelStages&&Number.isFinite(p.trueModelStages.fullMandaDegrees),
      p.planet+' four-stage internal evidence available');
  }
  const again=calculate(birth);
  check(JSON.stringify(r.planets)===JSON.stringify(again.planets),
    birth.date+' deterministic date-to-five-graha engine');
  const nextMinute=new Date((r.jdUt-2440587.5)*86400000+60000);
  const altered={date:birth.date,time:birth.time==='23:59'?'23:58':birth.time.slice(0,2)+':'+String((Number(birth.time.slice(3))+1)%60).padStart(2,'0'),
    utcOffsetMinutes:birth.utcOffsetMinutes};
  if(Number(birth.time.slice(3))!==59){
    const after=calculate(altered);
    check(after.planets.every((p,i)=>Math.abs(((p.trueLongitude-r.planets[i].trueLongitude+540)%360)-180)<0.15),
      birth.date+' minute resolution continuous');
  }
  summary.push({birth:birth.date+' '+birth.time,
    five: Object.fromEntries(r.planets.map(p=>[p.planet,Number(p.cheshtaVirupa.toFixed(4))])),
    eligible:false});
}
assert.equal(planetCount,25);assertions++;
for(const b of [
 {date:'2026-02-30',time:'12:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'24:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:60',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:841},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:NaN},
 {date:'0001-01-01',time:'12:00',utcOffsetMinutes:330}
]){assert.throws(()=>calculate(b),RangeError);assertions++;}

/*
 * Sūrya Siddhānta Ch I vv41-42 explicitly give apogee revolutions in a
 * KALPA, not in one MAHĀYUGA. Since a kalpa has 1000 mahayugas,
 * the correct secular rate is (204 / 1000) Mars, (368 / 1000) Mercury,
 * (900 / 1000) Jupiter, (535 / 1000) Venus, (39 / 1000) Saturn
 * revolutions per 1,577,917,828 civil days. This catches the 1000x
 * unit mistake without modifying any candidate historical ephemeris.
 * Sources: 1861 Sastri SS I 40-42; 2024 scholarly Cidambi et al.
 * The 1861 English Venus "635" is inconsistent with the Sanskrit
 * 535 (and modern critical tables), so use the Sanskrit numeral.
 */
import {sauraMandoccaResearch} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
const mandoccaKalpaRev=Object.freeze({
 Mars:204,Mercury:368,Jupiter:900,Venus:535,Saturn:39
});
const paperApsis2024=Object.freeze({
 Mars:130.0471,Mercury:220.4772,Jupiter:171.3844,
 Venus:79.8785,Saturn:236.6267
});
const paperAnchorJD=2460409.5;
const mahayugaCivilDays=1577917828;
const kalpaMahayugaCount=1000;
const norm360=x=>((x%360)+360)%360;
const mandoccaSigned=(x,y)=>(((x-y)%360)+540)%360-180;
const kalpaApsisUnitsEvidence=[];
function independentHistoricalMandocca(jdUt,planet){
 const sourceRev=mandoccaKalpaRev[planet]/kalpaMahayugaCount;
 const elapsedDays=jdUt-paperAnchorJD;
 return norm360(paperApsis2024[planet] +
   elapsedDays*sourceRev*360/mahayugaCivilDays);
}
for(const birth of births){
 const [y,m,d]=birth.date.split('-').map(Number);
 const [hh,mi]=birth.time.split(':').map(Number);
 const jdUt=(Date.UTC(y,m-1,d,hh,mi)-birth.utcOffsetMinutes*60000)/86400000+2440587.5;
 const row={birth:birth.date+' '+birth.time,apsides:{}};
 for(const planet of Object.keys(mandoccaKalpaRev)){
  const fromText=independentHistoricalMandocca(jdUt,planet);
  const fromEngine=sauraMandoccaResearch(jdUt,planet);
  const error=Math.abs(mandoccaSigned(fromEngine.mandocca,fromText));
  check(error<1e-9,
    birth.date+' '+planet+' book Kalpa -> 1000 Mahayuga apsis unit consistency');
  check(fromEngine.historicalNumericalCertified===false,
    birth.date+' '+planet+' book secular rate does not prove historical anchor/Bija');
  const drift=Math.abs(mandoccaSigned(fromText,paperApsis2024[planet]));
  check(drift<.0041,
    birth.date+' '+planet+' secular apsis drift since 2024 strictly <0.0041 degrees');
  row.apsides[planet]={
    fromIndependentKalpaUnit:+fromText.toFixed(9),
    fromResearchEngine:+fromEngine.mandocca.toFixed(9),
    deltaDegrees:+error.toFixed(12),
    changeFromPrinted2024AnchorDegrees:+drift.toFixed(9)
  };
 }
 kalpaApsisUnitsEvidence.push(row);
}
check(kalpaApsisUnitsEvidence.length===5 &&
      kalpaApsisUnitsEvidence.every(x=>Object.keys(x.apsides).length===5),
      'all 25 five-natal Kalpa to Mahayuga conversions evaluated');

console.log(JSON.stringify({pass:true,assertions,planetCount,engineReadyForResearch:true,
   historicalTrueLongitudeCertified:false,natalCheshtaCertified:false,
   completeSevenGrahaShadbalaCertified:false,
   kalpaApsisUnitsEvidence,birthResults:summary}));

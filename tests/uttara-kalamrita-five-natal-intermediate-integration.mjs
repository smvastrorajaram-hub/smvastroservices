/**
 * UK Khanda I Section II ONLY: seven grahas x five real Perambalur births.
 * Compare the independently assembled research output with what is
 * actually attached to the live chart; preserve the existing BPHS engine.
 * Historically validated Cheshta inputs are not available. No Ayurdaya.
 */
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {uttaraKalamritaSixBala} from '../public/horoscope/offline/uttara-kalamrita-six-bala.browser.mjs';
const names=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const dates=[
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],['2015-09-06','09:30']
];
let count=0,valid=0,meaningfulDifferences=0;const snapshots=[];
const ok=(condition,message)=>{assert.ok(condition,message);count++};
for(const [date,time] of dates){
 const calc=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,
  referenceDate:'2026-10-17',name:'UK-only sixfold intermediate regression'});
 ok(calc.ok,date+' natal engine calculation succeeded');
 const chart=calc.chart,seven=chart.planets.filter(x=>names.includes(x.name));
 ok(seven.length===7,date+' all seven classic grahas');
 const output={birth:date+' '+time,UK:{}};
 for(const p of seven){
  const u=p.strengthUttaraKalamrita,prior=p.strength3;
  ok(u&&u.classicalCertified===false,date+' '+p.name+' correct fail-closed UK certification');
  ok(u?.sthana?.saptavargajaPartsVirupa?.length===7,
   date+' '+p.name+' seven independent UK varga parts');
  const s=u.sthana;
  const sthanaIndependent=s.uccha+s.saptavargaja+s.ojayugma+s.kendradi+s.drekkana;
  ok(Math.abs(sthanaIndependent-s.totalVirupa)<1e-8,
    date+' '+p.name+' UK five Sthana subsections reconcile');
  ok(Math.abs(s.saptavargajaPartsVirupa.reduce((a,b)=>a+b,0)-s.saptavargaja)<1e-8,
    date+' '+p.name+' book full Rasi + six HALF Varga reconciliation');
  ok(u?.drig?.entries?.length===6,date+' '+p.name+' UK full Drig six aspect positions');
  ok(Math.abs(u.drig.entries.reduce((a,b)=>a+b.signedVirupa,0)-u.drig.virupa)<1e-8,
    date+' '+p.name+' UK Drig signed algebraic sum');
  ok(u.cheshta.virupa===null&&u.totalVirupa===null,
    date+' '+p.name+' no invented historical Cheshta/complete Shadbala');
  ok(u.kala.parts.ayana===null&&u.kala.totalVirupa===null,
    date+' '+p.name+' UK-only Ayana numerical interpretation remains unverified');
  ok(u.missing.includes('Kala: ayana'),
    date+' '+p.name+' no BPHS Ayana arithmetic silently mixed into UK basis');
  ok(u.naisargikaVirupa>=0&&u.naisargikaVirupa<=60,
    date+' '+p.name+' UK natural Virupa in range');
  ok(u.source.includes('Uttara Kalamrita')&&Number.isFinite(prior?.totalVirupa),
    date+' '+p.name+' UK separate from pre-existing live BPHS result');
  ok(!Object.hasOwn(u,'ayurdaya')&&!Object.hasOwn(u,'lifespan'),
    date+' '+p.name+' no Ayurdaya calculation present');
  if(Math.abs(u.sthana.totalVirupa-prior.components.sthana.total)>0.001)
    meaningfulDifferences++;
  valid++;output.UK[p.name]={
    sthana:+u.sthana.totalVirupa.toFixed(6),
    dig:u.dig?.virupa??null,kala:u.kala.totalVirupa,
    cheshta:u.cheshta.virupa,naisargika:u.naisargikaVirupa,
    drig:+u.drig.virupa.toFixed(6),wholeTotal:u.totalVirupa,
    bookFormulaCertificate:false
  };
 }
 snapshots.push(output);
}
ok(valid===35,'seven planets times five real Perambalur birth charts');
ok(meaningfulDifferences>=20,
 'UK source-specific Sthana differs materially from pre-existing BPHS rules');
console.log(JSON.stringify({
 pass:true,assertions:count,ukNatalPlanetComputations:valid,
 ukVsOldPositionalDifferences:meaningfulDifferences,
 source:'Uttara Kalamrita Khanda I Section II only, 1939 V Subrahmanya Sastri',
 bookTextIntermediatesPresent:true,independentHistoricalAstronomicalInputsCertified:false,
 completeUkShadbalaCertification:false,ayurdayaImplemented:false,
 result:snapshots
}));

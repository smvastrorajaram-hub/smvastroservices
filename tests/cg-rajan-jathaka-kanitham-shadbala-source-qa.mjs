/**
 * C.G. Rajan Jathaka Kanitham Part I printed Shadbala oracle.
 * The test intentionally FAILS certification where printed values and the
 * formula reconstructed from adjacent pages do not agree.
 */
import assert from 'node:assert/strict';
import {
  CG_RAJAN_PRINTED_P50,
  cgRajanSthanaBala,
  cgRajanAyanaBala,
  cgRajanNaisargikaBala,
  cgRajanPakshaBala,
  cgRajanKalaBala,
  cgRajanDigBala,
  cgRajanDrigBalaFromAspectMatrix,
  cgRajanShadbalaForPlanet
} from '../public/horoscope/offline/cg-rajan-jathaka-kanitham-shadbala.browser.mjs';

let checks=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const ok=(v,label)=>{assert.ok(v,label);checks++};
const no=(v,label)=>{assert.ok(!v,label);checks++};
const sample=[
 {name:'சூரியன்',longitude:167+2/60},
 {name:'சந்திரன்',longitude:118+10/60},
 {name:'செவ்வாய்',longitude:206+30/60},
 {name:'புதன்',longitude:191+52/60},
 {name:'குரு',longitude:28+17/60},
 {name:'சுக்கிரன்',longitude:204+32/60},
 {name:'சனி',longitude:230+27/60}
];
const asc=184+48/60;
const sthana=sample.map(p=>cgRajanSthanaBala({
 planet:p.name,longitude:p.longitude,ascendantLongitude:asc,planets:sample
}));
eq(sthana.map(x=>x.uccha),[13,53,49,85,63,15,83],'printed Uchcha Bala');
eq(sthana.map(x=>x.saptavargaja),[164,251,147,138,207,158,170],
 'source-rule Saptavargaja: Mars D12 mismatch remains visible');
eq(sthana.map(x=>x.total),[227,479,321,373,420,323,303],
 'source-rule Sthana total: Mars is 12 below the printed table');
eq(CG_RAJAN_PRINTED_P50.sthana[2]-sthana[2].total,12,
 'Mars Sthana discrepancy exactly equals the D12 component discrepancy');

const decl={
 'சூரியன்':3+32/60,'சந்திரன்':13+4/60,'செவ்வாய்':-(17+50/60),
 'புதன்':-(15+54/60),'குரு':16+32/60,'சுக்கிரன்':-(17+42/60),
 'சனி':-(20+55/60)
};
eq(sample.map(p=>cgRajanAyanaBala({planet:p.name,declination:decl[p.name]}).virupa),
 [42,23,12,83,85,12,94],'printed Ayana Bala using rounded Kranti');
eq(sample.map(p=>cgRajanNaisargikaBala(p.name)),
 [100,86,29,43,57,71,14],'printed Naisargika Bala');
eq(sample.map(p=>cgRajanPakshaBala({
 planet:p.name,sunLongitude:sample[0].longitude,moonLongitude:sample[1].longitude,planets:sample
}).virupa),[73,27,73,27,27,27,73],'printed Paksha component');

const kala=sample.map(p=>cgRajanKalaBala({
 planet:p.name,apparentSolarHour:7.2,weekdayLord:'சனி',monthLord:'சனி',
 yearLord:'சனி',horaLord:'குரு',tribhagaLord:'புதன்',
 sunLongitude:sample[0].longitude,moonLongitude:sample[1].longitude,planets:sample
}));
eq(kala.map(x=>x.natonnatha),[60,40,40,100,60,60,40],'Nathonnatha components');
eq(kala.map(x=>x.tribhaga),[0,0,0,100,100,0,0],'Tribhaga components');
eq(kala.map(x=>x.dina),[0,0,0,0,0,0,75],'Dina Bala components');
eq(kala.map(x=>x.masa),[0,0,0,0,0,0,50],'Masa Bala components');
eq(kala.map(x=>x.varusha),[0,0,0,0,0,0,25],'Varusha Bala components');
eq(kala.map(x=>x.hora),[0,0,0,0,100,0,0],'Hora Bala components');
eq(kala.map(x=>x.paksha),[73,27,73,27,27,27,73],'Kala Paksha subcomponents');
eq(kala.map(x=>x.total),[133,67,113,227,287,87,263],'printed Kala Bala');

const dig=sample.map(p=>cgRajanDigBala({
 planet:p.name,longitude:p.longitude,ascendantLongitude:asc,midheavenLongitude:95
}).virupa);
eq(dig,[60,13,38,96,13,61,25],'formula-derived Dig Bala (two printed one-point mismatches retained)');
eq(dig.map((x,i)=>x-CG_RAJAN_PRINTED_P50.dig[i]),[0,0,0,0,0,1,-1],
 'Dig source-oracle mismatch is explicit, not silently rounded away');

const matrix=[
 [0,0,7,0,66,7,30],      // Sun aspector
 [16,0,72,48,25,68,57],  // Moon
 [0,23,0,0,100,0,0],     // Mars
 [0,12,0,0,87,0,7],      // Mercury
 [36,75,93,47,0,87,82],  // Jupiter
 [0,22,0,0,97,0,0],      // Venus
 [10,63,0,0,27,0,0]      // Saturn
];
const drig=cgRajanDrigBalaFromAspectMatrix(matrix);
eq(sample.map(p=>drig.byPlanet[p.name].virupa),[11,6,40,24,4,37,29],
 'printed p.30 aspect matrix: net benefic/malefic aspect divided by four');

const sum=sample.map((p,i)=>sthana[i].total+kala[i].total+
 cgRajanAyanaBala({planet:p.name,declination:decl[p.name]}).virupa+
 cgRajanNaisargikaBala(p.name)+dig[i]+CG_RAJAN_PRINTED_P50.cheshta[i]);
eq(sum,[604,695,568,909,947,613,757],
 'source-formula subtotal with unresolved D12 and Dig rounding retained');
eq(sum.map((x,i)=>x-CG_RAJAN_PRINTED_P50.subtotalBeforeDrig[i]),
 [0,0,-12,0,0,1,-1],
 'component-level subtotal differences are explicit and stable');
const final=sample.map((p,i)=>CG_RAJAN_PRINTED_P50.sthana[i]+CG_RAJAN_PRINTED_P50.kala[i]+
 CG_RAJAN_PRINTED_P50.ayana[i]+CG_RAJAN_PRINTED_P50.naisargika[i]+
 CG_RAJAN_PRINTED_P50.dig[i]+CG_RAJAN_PRINTED_P50.cheshta[i]+CG_RAJAN_PRINTED_P50.drig[i]+
 CG_RAJAN_PRINTED_P50.yuddha[i]);
eq(final,CG_RAJAN_PRINTED_P50.final,'corrected final total includes the separate Yuddha row');
eq(final[2],630,'corrected Mars final total is 630');
eq(final[2],CG_RAJAN_PRINTED_P50.afterDrig[2]+CG_RAJAN_PRINTED_P50.yuddha[2],
 'Mars 620 after Drig + Yuddha 10 = corrected 630');

const partial=cgRajanShadbalaForPlanet({
 planet:'சூரியன்',planets:sample,ascendantLongitude:asc,midheavenLongitude:95,declination:decl['சூரியன்'],
 apparentSolarHour:7.2,weekdayLord:'சனி',monthLord:'சனி',yearLord:'சனி',
 horaLord:'குரு',tribhagaLord:'புதன்'
});
eq(partial.total,null,'no final total without reconciled Drig/Cheshta inputs');
eq(partial.classicalCertified,false,'never issue full certification');
eq(partial.deathAgeOrDate,null,'Shadbala never includes death-age output');
ok(partial.blockers.some(x=>x.includes('Mars Dvadasamsa')),'D12 blocker is surfaced');
ok(partial.blockers.some(x=>x.includes('Yuddha')),'Yuddha contradiction is surfaced');

console.log(JSON.stringify({
 pass:true,checks,
 source:'C.G. Rajan Jathaka Kanitham Part I printed pp. 30-50',
 verified:{
  uchcha:true,calendarComponentArithmetic:true,ayanaPrintedOracle:true,
  naisargika:true,paksha:true,drigAggregation:true
 },
 mismatches:{
  saptavargajaMarsD12:{calculated:147,printed:159,delta:-12},
  digBala:{venus:{calculated:61,printed:60},saturn:{calculated:25,printed:26}},
  drigAngleGeneration:'BPHS candidate does not reproduce all printed p.30 planet-pair values',
  fivePlanetCheshta:'source formula still unreconciled',
  marsYuddha:'printed final omitted Yuddha +10; corrected Mars total is 630'
 },
 fullSevenGrahaCertificate:false
}));

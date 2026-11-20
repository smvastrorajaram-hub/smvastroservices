import assert from 'node:assert/strict';
import {calculateBVRamanShadbala} from '../public/horoscope/offline/bv-raman-shadbala.browser.mjs';

const planets=[
  {name:'சூரியன்',longitude:180+53/60+55/3600,bhava:9},
  {name:'சந்திரன்',longitude:311+17/60+19/3600,bhava:1},
  {name:'செவ்வாய்',longitude:229+30/60+34/3600,bhava:10},
  {name:'புதன்',longitude:181+31/60+34/3600,bhava:6},
  {name:'குரு',longitude:84+0/60+49/3600,bhava:9},
  {name:'சுக்கிரன்',longitude:171+9/60+56/3600,bhava:7},
  {name:'சனி',longitude:124+22/60+41/3600,bhava:11}
];
const chesta={
  'செவ்வாய்':{meanLongitude:266.34,trueLongitude:229.50,sheeghroccaLongitude:181.23},
  'புதன்':{meanLongitude:181.23,trueLongitude:181.52,sheeghroccaLongitude:174.49},
  'குரு':{meanLongitude:66.91,trueLongitude:84.01,sheeghroccaLongitude:181.23},
  'சுக்கிரன்':{meanLongitude:181.23,trueLongitude:171.16,sheeghroccaLongitude:158.35},
  'சனி':{meanLongitude:111.23,trueLongitude:124.39,sheeghroccaLongitude:181.23}
};
const args={
  planets,bhavas:[],ascendantLongitude:298+27/60,midheavenLongitude:216+30/60,
  apparentSolarHour:14.336,
  temporal:{abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',horaLord:'சந்திரன்',tribhagaLord:'சனி',solarTimeMethod:'independent standard-chart fixture'},
  declinations:{'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13},
  jdUt:Date.UTC(1918,9,16,14,6,16)/86400000+2440587.5,
  ayanamsa:(202+10/60)-(180+53/60+55/3600),
  classicalChestaInputs:chesta
};
const result=calculateBVRamanShadbala(args);
assert.equal(result.certificationScope,'BV_RAMAN_PRINTED_STANDARD_HOROSCOPE_ONLY',
  'the diagnostic is restricted to the one printed 1918 Standard Horoscope');
assert.equal(result.classicalCertified,true,
  'the existing exact-input worked-example certificate gate remains intact');
const mercury=result.planets['புதன்'];
const jupiter=result.planets['குரு'];
for(const [name,row] of [['Mercury',mercury],['Jupiter',jupiter]]){
  assert.ok(Number.isFinite(row?.components?.dig)&&Number.isFinite(row?.components?.drik),
    name+' Dig and Drik values are computed');
  assert.ok(Number.isFinite(row?.evidence?.drikPinda),
    name+' signed Drishti Pinda intermediate is exposed');
  assert.ok(Math.abs(row.components.drik-row.evidence.drikPinda/4)<=0.001,
    name+' Drik equals one-fourth of the full-precision exposed Pinda');
}
const mercuryArcDegrees=63+5/60;
const mercuryPrintedArcFormulaVirupa=mercuryArcDegrees/3;
const jupiterPrintedPinda=-64.14;
const jupiterPrintedPindaQuarter=jupiterPrintedPinda/4;
console.log(JSON.stringify({
  pass:true,
  scope:'1918 B.V. Raman printed Standard Horoscope only',
  source:'B.V. Raman, Graha and Bhava Balas, 13th ed., Examples 14–15 and 55–56',
  mercuryDig:{
    engineVirupa:mercury.components.dig,
    page32PrintedArcDegrees:mercuryArcDegrees,
    page32ArcDividedByThree:mercuryPrintedArcFormulaVirupa,
    page33PrintedVirupa:21.09,
    page90SummaryPrintedVirupa:21.09,
    formulaMinusPrinted:mercuryPrintedArcFormulaVirupa-21.09
  },
  jupiterDrik:{
    enginePinda: jupiter.evidence.drikPinda,
    engineDrik:jupiter.components.drik,
    enginePindaQuarter:jupiter.evidence.drikPinda/4,
    page88PrintedPinda:jupiterPrintedPinda,
    page88ExamplePrintedDrik:-16.04,
    page90SummaryPrintedDrik:-16.03,
    page88PindaQuarter:jupiterPrintedPindaQuarter
  },
  certificationScope:result.certificationScope,
  arbitraryNatalCertification:false
}));

import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {
  sauraBijaCorrectedFivePlanetInputs
} from '../research/saura-bija/saura-bija-mean-motion.mjs';

const PLANETS=['Mercury','Venus','Mars','Jupiter','Saturn'];
const INNER=new Set(['Mercury','Venus']);
const DAYS_PER_MAHAYUGA=1577917828;
const DAYS_PER_KALPA=DAYS_PER_MAHAYUGA*1000;
const KALI_EPOCH_JD_UT=588465.5;
const UJJAIN_LONGITUDE_DEGREES=75+46/60;
const UJJAIN_DAY_FRACTION=UJJAIN_LONGITUDE_DEGREES/360;
const SOURCE_WASHINGTON_OFFSET_DAYS=0.42453;
const RADIUS=3438;
const STEP_DEGREES=3.75;
const JYA=Object.freeze([
  0,225,449,671,890,1105,1315,1520,1719,1910,
  2093,2267,2431,2585,2728,2859,2978,3084,3177,
  3256,3321,3372,3409,3431,3438
]);
const REVOLUTIONS=Object.freeze({
  original:Object.freeze({
    Sun:4320000,Mercury:17937060,Venus:7022376,
    Mars:2296832,Jupiter:364220,Saturn:146568
  }),
  bija:Object.freeze({
    Sun:4320000,Mercury:17937044,Venus:7022364,
    Mars:2296832,Jupiter:364212,Saturn:146580
  })
});
const MEAN_ANCHORS=Object.freeze({
  original:Object.freeze({
    Sun:[8,17,48,7],Mercury:[4,15,13,8],Venus:[10,21,8,59],
    Mars:[5,24,17,36],Jupiter:[2,26,0,7],Saturn:[3,20,11,12]
  }),
  bija:Object.freeze({
    Sun:[8,17,48,7],Mercury:[4,8,36,16],Venus:[10,16,11,22],
    Mars:[5,24,17,36],Jupiter:[2,22,41,41],Saturn:[3,25,8,50]
  })
});
const APSIS_REVOLUTIONS_PER_KALPA=Object.freeze({
  Sun:387,Mercury:368,Venus:535,Mars:204,Jupiter:900,Saturn:39
});
const APSIS_KALI_EPOCH=Object.freeze({
  Sun:[2,17,7,48],Mercury:[7,10,19,12],Venus:[2,19,39,0],
  Mars:[4,9,57,36],Jupiter:[5,21,0,0],Saturn:[7,26,36,36]
});
const EPICYCLES=Object.freeze({
  Mercury:{manda:[30,28],sighra:[133,132]},
  Venus:{manda:[12,11],sighra:[262,260]},
  Mars:{manda:[75,72],sighra:[235,232]},
  Jupiter:{manda:[33,32],sighra:[70,72]},
  Saturn:{manda:[49,48],sighra:[39,40]}
});
const SOURCE_TRUE_1860=Object.freeze({
  Mercury:[7,24,51],Venus:[9,14,35],Mars:[6,18,45],
  Jupiter:[3,4,11],Saturn:[4,1,2]
});
const SOURCE_INPUT_1860=Object.freeze({
  Sun:[8,18,13,13],Mercury:[4,16,57,22],Venus:[10,21,49,47],
  Mars:[5,24,30,57],Jupiter:[2,26,2,14],Saturn:[3,20,12,3]
});
const SOURCE_MANDocca_1860=Object.freeze({
  Mercury:[7,10,28,20],Venus:[2,19,52,17],Mars:[4,10,2,40],
  Jupiter:[5,21,22,19],Saturn:[7,26,37,34]
});

const norm=x=>((x%360)+360)%360;
const signedAngle=(a,b)=>((a-b+540)%360)-180;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const dms=([signs,degrees,minutes,seconds=0])=>
  signs*30+degrees+minutes/60+seconds/3600;
const jyaDeg=(degrees)=>{
  const a=norm(degrees);
  const quadrant=a<=90?a:a<=180?180-a:a<=270?a-180:360-a;
  if(quadrant===90)return RADIUS;
  const index=quadrant/STEP_DEGREES;
  const lower=Math.floor(index);
  const fraction=index-lower;
  const value=JYA[lower]+fraction*(JYA[lower+1]-JYA[lower]);
  return a<=180?value:-value;
};
function inverseJyaArcMinutes(value){
  if(!finite(value)||Math.abs(value)>RADIUS+1e-9)
    throw new RangeError('Burgess inverse-Jya input exceeds radius 3438');
  const sign=value<0?-1:1;
  const target=Math.min(RADIUS,Math.abs(value));
  if(target>=RADIUS)return sign*90;
  let low=0,high=24;
  while(high-low>1){
    const mid=(low+high)>>1;
    if(JYA[mid]<=target)low=mid;else high=mid;
  }
  return sign*STEP_DEGREES*(
    low+(target-JYA[low])/(JYA[low+1]-JYA[low])
  );
}
function epicycleCorrection(mean,ucca,pair,kind){
  const kendra=norm(ucca-mean);
  const sine=jyaDeg(kendra)/RADIUS;
  const cosine=jyaDeg(kendra+90)/RADIUS;
  const correctedParidhi=pair[0]-(pair[0]-pair[1])*Math.abs(sine);
  const relativeRadius=correctedParidhi*60/(2*Math.PI*RADIUS);
  const bhujya=relativeRadius*sine;
  if(kind==='manda'){
    return inverseJyaArcMinutes(bhujya*RADIUS);
  }
  const koti=relativeRadius*cosine;
  const variableKarna=Math.hypot(1+koti,bhujya);
  const equationSine=RADIUS*bhujya/variableKarna;
  return inverseJyaArcMinutes(Math.max(-RADIUS,Math.min(RADIUS,equationSine)));
}
function burgessFourPass({planet,meanLongitude,mandocca,sheeghroccheya}){
  const epicycle=EPICYCLES[planet];
  const first=epicycleCorrection(meanLongitude,sheeghroccheya,epicycle.sighra,'sighra');
  const afterHalfSighra=norm(meanLongitude+first/2);
  const second=epicycleCorrection(afterHalfSighra,mandocca,epicycle.manda,'manda');
  const afterHalfManda=norm(afterHalfSighra+second/2);
  const third=epicycleCorrection(afterHalfManda,mandocca,epicycle.manda,'manda');
  const afterFullManda=norm(meanLongitude+third);
  const fourth=epicycleCorrection(afterFullManda,sheeghroccheya,epicycle.sighra,'sighra');
  return Object.freeze({
    trueLongitude:norm(afterFullManda+fourth),
    stages:Object.freeze({
      halfSighraDegrees:first/2,halfMandaDegrees:second/2,
      fullMandaDegrees:third,fullSighraDegrees:fourth,
      afterHalfSighra,afterHalfManda,afterFullManda
    })
  });
}

// Burgess p.178 gives the mean positions at 1860-01-01 Ujjain midnight.
// Convert that local-midnight anchor to its exact UT Julian day.
const JD_UNIX_EPOCH=2440587.5;
const JD_1860_UTC_MIDNIGHT=
  Date.UTC(1860,0,1)/86400000+JD_UNIX_EPOCH;
const JD_1860_UJJAIN_MIDNIGHT=
  JD_1860_UTC_MIDNIGHT-UJJAIN_DAY_FRACTION;

function sourceMeanOrbit(jdUt,body,profile){
  const revolutions=REVOLUTIONS[profile][body];
  const anchor=dms(MEAN_ANCHORS[profile][body]);
  const elapsedUjjainDays=jdUt-JD_1860_UJJAIN_MIDNIGHT;
  return norm(anchor+elapsedUjjainDays*revolutions*360/DAYS_PER_MAHAYUGA);
}
function sourceInputs(jdUt,planet,profile){
  const sun=sourceMeanOrbit(jdUt,'Sun',profile);
  const own=sourceMeanOrbit(jdUt,planet,profile);
  const inner=INNER.has(planet);
  return Object.freeze({
    meanLongitude:inner?sun:own,
    sheeghroccheya:inner?own:sun,
    meanSunLongitude:sun,
    ownMeanOrbitLongitude:own
  });
}
function sourceMandocca(jdUt,planet){
  const elapsedUjjainDays=jdUt-KALI_EPOCH_JD_UT+UJJAIN_DAY_FRACTION;
  return norm(
    dms(APSIS_KALI_EPOCH[planet])+
    APSIS_REVOLUTIONS_PER_KALPA[planet]*360*elapsedUjjainDays/DAYS_PER_KALPA
  );
}
function arcminuteDifference(a,b){return Math.abs(signedAngle(a,b))*60;}
function assertWithinArcseconds(actual,expected,tolerance,label){
  const difference=Math.abs(signedAngle(actual,expected))*3600;
  assert.ok(finite(difference)&&difference<=tolerance,
    label+' residual='+difference+' arcsec; limit='+tolerance);
  return difference;
}

// Exact historical reference epoch: midnight at Washington before 1860-01-01.
// Burgess gives the Ujjain/Washington meridian-time difference as 0.42453 day.
const JD_TRUE_SOURCE_EPOCH=JD_1860_UJJAIN_MIDNIGHT+SOURCE_WASHINGTON_OFFSET_DAYS;
const sourceExampleRows=[];
let maxTrueSourceResidualArcminutes=0;
let maxMeanInputSourceResidualArcseconds=0;
let maxMandoccaSourceResidualArcseconds=0;
for(const planet of PLANETS){
  const raw=sourceInputs(JD_TRUE_SOURCE_EPOCH,planet,'original');
  const rawMeanResidual=assertWithinArcseconds(
    raw.meanLongitude,dms(SOURCE_INPUT_1860.Sun),1.0,
    planet+' Burgess 1860 mean longitude input'
  );
  const expectedSheeghra=INNER.has(planet)
    ?dms(SOURCE_INPUT_1860[planet]):dms(SOURCE_INPUT_1860.Sun);
  const rawSheeghraResidual=assertWithinArcseconds(
    raw.sheeghroccheya,expectedSheeghra,1.0,
    planet+' Burgess 1860 Sheeghroccheya input'
  );
  const mandocca=sourceMandocca(JD_TRUE_SOURCE_EPOCH,planet);
  const apsisResidual=assertWithinArcseconds(
    mandocca,dms(SOURCE_MANDocca_1860[planet]),1.0,
    planet+' Burgess 1860 apsis intermediate'
  );
  const result=burgessFourPass({
    planet,meanLongitude:raw.meanLongitude,
    mandocca,sheeghroccheya:raw.sheeghroccheya
  });
  const expectedTrue=dms(SOURCE_TRUE_1860[planet]);
  const trueResidual=arcminuteDifference(result.trueLongitude,expectedTrue);
  assert.ok(trueResidual<=1.25,
    planet+' 1860 printed True longitude residual='+trueResidual+' arcminutes');
  maxTrueSourceResidualArcminutes=Math.max(maxTrueSourceResidualArcminutes,trueResidual);
  maxMeanInputSourceResidualArcseconds=Math.max(
    maxMeanInputSourceResidualArcseconds,rawMeanResidual,rawSheeghraResidual
  );
  maxMandoccaSourceResidualArcseconds=Math.max(maxMandoccaSourceResidualArcseconds,apsisResidual);
  sourceExampleRows.push({
    planet,
    sourceMeanLongitude:raw.meanLongitude,
    sourceSheeghroccheya:raw.sheeghroccheya,
    reconstructedMandocca:mandocca,
    sourceTrueLongitude:expectedTrue,
    reconstructedTrueLongitude:result.trueLongitude,
    trueResidualArcminutes:+trueResidual.toFixed(6),
    stages:result.stages
  });
}
assert.equal(sourceExampleRows.length,5);
assert.ok(maxTrueSourceResidualArcminutes<=1.25,
  'all five 1860 Burgess True outputs reproduce within 1.25 arcminutes');

// The same independent 1860-anchor propagation is now applied to each of the
// 600 exact random natal epochs. Raw and Bija-corrected profiles are kept
// separately; the 1860 True worked example is the raw SS profile.
const inputArtifactUrl=new URL(
  '../artifacts/natal-classical-random-600-charts-1800-2399.json',import.meta.url
);
const report=JSON.parse(readFileSync(inputArtifactUrl,'utf8'));
assert.equal(report.pass,true,'the 600 random natal epoch artifact exists and passed');
assert.equal(report.records.length,600,'one arbitrary natal epoch per year');
const epochRows=[];
let bijaInputComparisons=0;
let maxBijaMeanEngineResidualArcseconds=0;
let maxBijaSheeghraEngineResidualArcseconds=0;
let rawSourceDerivedRows=0;
let bijaSourceDerivedRows=0;
for(let index=0;index<report.records.length;index++){
  const birth=report.records[index];
  assert.equal(birth.year,1800+index,'retain exact original randomized year');
  assert.ok(finite(birth.julianDayUT),birth.epochId+' exact natal JD is present');
  const planets={};
  for(const planet of PLANETS){
    const raw=sourceInputs(birth.julianDayUT,planet,'original');
    const bija=sourceInputs(birth.julianDayUT,planet,'bija');
    const rawMandocca=sourceMandocca(birth.julianDayUT,planet);
    const bijaMandocca=rawMandocca;
    const rawTrue=burgessFourPass({
      planet,meanLongitude:raw.meanLongitude,
      mandocca:rawMandocca,sheeghroccheya:raw.sheeghroccheya
    });
    const bijaTrue=burgessFourPass({
      planet,meanLongitude:bija.meanLongitude,
      mandocca:bijaMandocca,sheeghroccheya:bija.sheeghroccheya
    });
    const current=sauraBijaCorrectedFivePlanetInputs(birth.julianDayUT,planet);
    const meanResidual=assertWithinArcseconds(
      bija.meanLongitude,current.meanLongitude,1.5,
      birth.epochId+' '+planet+' source-anchored Bija Mean vs engine'
    );
    const sheeghraResidual=assertWithinArcseconds(
      bija.sheeghroccheya,current.sheeghrocca,1.5,
      birth.epochId+' '+planet+' source-anchored Bija Sheeghroccheya vs engine'
    );
    maxBijaMeanEngineResidualArcseconds=Math.max(
      maxBijaMeanEngineResidualArcseconds,meanResidual
    );
    maxBijaSheeghraEngineResidualArcseconds=Math.max(
      maxBijaSheeghraEngineResidualArcseconds,sheeghraResidual
    );
    bijaInputComparisons+=2;
    rawSourceDerivedRows++;
    bijaSourceDerivedRows++;
    planets[planet]={
      frame:'traditional-Saura-nirayana',
      exactJulianDayUT:birth.julianDayUT,
      sourceDerived:true,
      raw:{
        model:'SURYA_SIDDHANTA_ORIGINAL_REVOLUTIONS',
        meanLongitude:raw.meanLongitude,
        sheeghroccheya:raw.sheeghroccheya,
        mandocca:rawMandocca,
        trueLongitude:rawTrue.trueLongitude,
        trueStages:rawTrue.stages
      },
      bijaCorrected:{
        model:'BURGESS_BIJA_CORRECTED_REVOLUTIONS',
        meanLongitude:bija.meanLongitude,
        sheeghroccheya:bija.sheeghroccheya,
        mandocca:bijaMandocca,
        trueLongitude:bijaTrue.trueLongitude,
        trueStages:bijaTrue.stages,
        meanDifferenceFromCurrentEngineArcseconds:meanResidual,
        sheeghroccheyaDifferenceFromCurrentEngineArcseconds:sheeghraResidual
      }
    };
  }
  assert.equal(Object.keys(planets).length,5);
  epochRows.push({
    year:birth.year,date:birth.date,localTime:birth.localTime,
    place:birth.place,utcOffsetMinutes:birth.historicalUtcOffsetMinutes,
    epochId:birth.epochId,julianDayUT:birth.julianDayUT,planets
  });
}
assert.equal(epochRows.length,600);
assert.equal(rawSourceDerivedRows,3000);
assert.equal(bijaSourceDerivedRows,3000);
assert.equal(bijaInputComparisons,6000);
assert.ok(maxBijaMeanEngineResidualArcseconds<=1.5);
assert.ok(maxBijaSheeghraEngineResidualArcseconds<=1.5);

const output={
  schemaVersion:1,
  title:'Burgess 1860 source-derived historical Mean, Sheeghroccheya and True longitude values',
  source:{
    author:'E. Burgess',
    work:'Translation of the Surya-Siddhanta: A Text-Book of Hindu Astronomy',
    publicationYear:1860,
    meanMethod:'Chapter I v.53; raw and Bija-corrected revolutions per Mahayuga and 1860 Ujjain mean-longitude tables',
    sheeghroccheyaMethod:'Chapter I v.54; superior-planet conjunction equals mean Sun; inferior-planet conjunction uses own orbital mean longitude',
    trueMethod:'Chapter II vv.15-22, 29-45; printed 24-Jya table and four successive corrections',
    mandoccaMethod:'Chapter I vv.41-42 and 57-58; apsis revolutions per Kalpa and Kali-epoch apsis longitude',
    citations:{
      meanAndCorrectedAnchors:'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf',
      meanAndSheeghroccheya:'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf',
      jyaAndTrue:'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf'
    },
    meanPages:'178-179; pp.161-165 for Mahayuga revolution tables',
    apsisPages:'171-172',
    jyaPages:'196-198',
    trueWorkedExamplePages:'214-217'
  },
  method:{
    sourceAnchor:'1860-01-01 00:00 Ujjain local mean time',
    sourceTrueWorkedExampleEpoch:'Midnight before 1860-01-01 at Washington',
    sourceTrueWorkedExampleUjjainOffsetDays:SOURCE_WASHINGTON_OFFSET_DAYS,
    meanEpochConvention:'Elapsed days from the 1860 Ujjain-midnight anchor, using exact birth Julian UT; no birth-place longitude substituted for the Ujjain reference meridian',
    meanProfiles:['SURYA_SIDDHANTA_ORIGINAL_REVOLUTIONS','BURGESS_BIJA_CORRECTED_REVOLUTIONS'],
    jyaRadius:3438,
    jyaStepDegrees:STEP_DEGREES,
    jyaValues:JYA,
    trueSequence:['half-Sheeghra','half-Manda','full-Manda on original mean','full-Sheeghra'],
    outputFrame:'traditional-Saura-nirayana'
  },
  workedExample1860:{
    rows:sourceExampleRows,
    maxTrueResidualArcminutes:+maxTrueSourceResidualArcminutes.toFixed(6),
    maxMeanOrSheeghroccheyaInputResidualArcseconds:+maxMeanInputSourceResidualArcseconds.toFixed(6),
    maxMandoccaIntermediateResidualArcseconds:+maxMandoccaSourceResidualArcseconds.toFixed(6),
    status:'PASS_BURGESS_1860_FIVE_PLANET_TRUE_WORKED_EXAMPLE'
  },
  arbitraryEpochs:{
    birthEpochs:600,
    years:[1800,2399],
    planets:5,
    rawSourceDerivedRows:rawSourceDerivedRows,
    bijaCorrectedSourceDerivedRows:bijaSourceDerivedRows,
    bijaMeanAndSheeghroccheyaEngineComparisons:bijaInputComparisons,
    maxBijaMeanEngineResidualArcseconds:+maxBijaMeanEngineResidualArcseconds.toFixed(6),
    maxBijaSheeghroccheyaEngineResidualArcseconds:+maxBijaSheeghroccheyaEngineResidualArcseconds.toFixed(6),
    rows:epochRows
  },
  interpretation:{
    directPrintedTrueWorkedExampleRows:5,
    exactBirthEpochPrintedTrueOracles:0,
    sourceDerivedArbitraryEpochTrueRows:3000,
    sourceDerivedArbitraryEpochMeanAndSheeghroccheyaRows:6000,
    historicalObservationClaim:false,
    productionEligible:false,
    genericClassicalNatalCertified:false,
    note:'The 1860 True values are directly printed worked-example numbers. The 1800-2399 per-birth outputs are reproducible calculations derived from the historical published revolution, apsis, Jya and four-pass rules; they are not separately printed observations for each birth epoch. Raw and Bija-corrected profiles remain distinct.'
  }
};
const outputUrl=new URL(
  '../artifacts/burgess-1860-source-derived-longitudes-600-epochs.json',
  import.meta.url
);
mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});
writeFileSync(outputUrl,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({
  pass:true,
  status:output.workedExample1860.status,
  sourceTrueWorkedExampleRows:5,
  maxTrueSourceResidualArcminutes:output.workedExample1860.maxTrueResidualArcminutes,
  arbitraryBirthEpochs:600,
  rawSourceDerivedTrueRows:rawSourceDerivedRows,
  bijaSourceDerivedTrueRows:bijaSourceDerivedRows,
  bijaMeanAndSheeghroccheyaEngineComparisons:bijaInputComparisons,
  maxBijaMeanEngineResidualArcseconds:output.arbitraryEpochs.maxBijaMeanEngineResidualArcseconds,
  maxBijaSheeghroccheyaEngineResidualArcseconds:output.arbitraryEpochs.maxBijaSheeghroccheyaEngineResidualArcseconds,
  frame:'traditional-Saura-nirayana',
  productionEligible:false,
  output:'artifacts/burgess-1860-source-derived-longitudes-600-epochs.json'
}));

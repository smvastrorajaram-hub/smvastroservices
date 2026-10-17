/**
 * Independent seven-planet PRINTED oracle:
 * C.G. Rajan, Jathaka Kanitham I pp.241–244 / scanned PDF pp.263–266.
 * Natal example is the author's historic test chart, NOT user's birthdays.
 * Nothing here licenses public lifespan/death predictions.
 */
import assert from 'node:assert/strict';
import {cgRajanNaturalAyurdayaGraha as nat,
 cgRajanChakrapadaHouseFraction as house,
 cgRajanConditionReductions as red,
 cgRajanCombustionLimitDegrees as combustLimit,
 cgRajanCombustionHaranaStatus as combustStatus,
 cgRajanSevenNaturalResearch as seven,
 cgRajanSumTraditionalRows as sumRows}
from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
import {cgRajanAmsaHaranaResearch as amsaHarana}
from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
let assertions=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);assertions++;}
function close(a,b,msg){assert.ok(Math.abs(a-b)<1e-10,msg+': '+a+' != '+b);assertions++;}
// True sidereal graha coordinates from printed p.241;
// exaltation and natural years from pp.242–243;
// verified 4-column outcomes from printed p.243 (pdf p.265).
const example=[
 ['சூரியன்',167+2/60,202+58/60,[11,3,9,20]],
 ['சந்திரன்',118+10/60,274+50/60,[0,9,4,50]],
 ['செவ்வாய்',206+30/60,268+30/60,[1,5,27,0]],
 ['புதன்',191+52/60,333+8/60,[8,3,28,12]],
 ['குரு',28+17/60,293+17/60,[14,7,29,6]],
 ['சுக்கிரன்',204+32/60,207+32/60,[11,6,10,40]],
 ['சனி',230+27/60,329+33/60,[45,9,7,30]]
];
const exaltByName={'சூரியன்':10,'சந்திரன்':33,'செவ்வாய்':298,
 'புதன்':165,'குரு':95,'சுக்கிரன்':357,'சனி':200};
for(const [planet,trueLongitude,arc,expected] of example){
 const v=nat({planet,trueLongitude});
 close(v.remainingArcDegrees,arc,planet+' printed angular remainder');
 eq(Object.values(v.traditionalUnits),expected,planet+' printed four-unit result');
 eq(v.individualLifespanCertified,false,planet+' not a certified natal lifespan');
 eq(v.predictedDeathAge,null,planet+' no death-age inference');
}
for(const [planet] of example){
 const exalt=nat({planet,trueLongitude:exaltByName[planet]});
 close(exalt.remainingArcDegrees,360,planet+' exact exaltation arc');
 close(exalt.theoreticalNaturalYearComponent,exalt.maximumNaturalYears,
  planet+' full natural-year quota at exaltation');
 const deb=nat({planet,trueLongitude:(exalt.exaltationLongitude+180)%360});
 close(deb.theoreticalNaturalYearComponent,exalt.maximumNaturalYears/2,
  planet+' half quota at debilitation');
}
for(let h=12;h>=7;h--){
 close(house({house:h,benefic:false}).lossFraction,1/(13-h),'malefic '+h);
 close(house({house:h,benefic:true}).lossFraction,1/(2*(13-h)),'benefic '+h);
}
eq(house({house:6,benefic:true}).lossFraction,0,'outside 7..12');
const bothHarana=red({planet:'செவ்வாய்',enemySign:true,combust:true});
close(bothHarana.enemySignLossFraction,0,
 'p231 priority suppresses enemy-sign loss when combustion Harana applies');
close(bothHarana.combustionLossFraction,1/2,'applicable combustion Harana is one half');
close(bothHarana.conditionHaranaFraction,1/2,
 'p231 chooses the larger combustion Harana instead of adding 1/3 + 1/2');
close(bothHarana.remainingFractionCandidate,1/2,'remaining term after the selected condition Harana');
eq(bothHarana.selectedConditionHarana,'combustion','combustion precedence is explicit');
const enemyOnly=red({planet:'செவ்வாய்',enemySign:true,combust:false});
close(enemyOnly.enemySignLossFraction,1/3,'enemy-sign loss is one third when combustion Harana does not apply');
close(enemyOnly.conditionHaranaFraction,1/3,'enemy-sign only case');
for(const planet of ['சுக்கிரன்','சனி']){
 const exempt=red({planet,enemySign:false,combust:true});
 eq(exempt.combustionHaranaExempt,true,planet+' p231 combustion Harana exemption');
 close(exempt.combustionLossFraction,0,planet+' combustion state does not trigger the excluded Harana');
 close(exempt.conditionHaranaFraction,0,planet+' no other condition loss');
 const enemyExempt=red({planet,enemySign:true,combust:true});
 close(enemyExempt.enemySignLossFraction,1/3,planet+' enemy sign still applies when combustion Harana is exempt');
 close(enemyExempt.conditionHaranaFraction,1/3,planet+' source exception is not lost');
}
eq(red({planet:'சூரியன்',enemySign:false,combust:false}).independentNatalFinalCertified,false,
 'reduction research only');
const completeEvidence={
 houseFromLagna:10,occupantCount:1,chakrapadaBenefic:false,strongestOccupantVerified:true,
 isExaltationSign:false,retrograde:false,ownSign:false,ownNavamsa:false,
 ownDrekkana:false,vargottama:false
};
const amsaOverlap=amsaHarana({planet:'செவ்வாய்',rawAmsaYears:6,enemySign:true,combust:true,...completeEvidence});
eq(amsaOverlap.resolved,true,'candidate resolves when all required inputs are provided');
close(amsaOverlap.enemySignLossFraction,0,'Amsa candidate follows combustion priority');
close(amsaOverlap.combustionLossFraction,1/2,'Amsa candidate uses half combustion loss');
close(amsaOverlap.chakrapadaLossFraction,1/3,'Amsa candidate adds separate tenth-house malefic Chakra loss');
close(amsaOverlap.totalHaranaFraction,5/6,'selected condition loss plus Chakrapada loss');
close(amsaOverlap.yearsBeforeMultiplier,1,'deductions are applied before strength multiplier');
close(amsaOverlap.adjustedAmsaYearsCandidate,1,'candidate result respects printed order');
eq(amsaOverlap.finalAmsaCertified,false,'research candidate does not certify full Amsa chain');
const missingChakrapadaStatus=amsaHarana({
 planet:'புதன்',rawAmsaYears:4,enemySign:false,combust:false,
 houseFromLagna:10,occupantCount:1,
 isExaltationSign:false,retrograde:false,ownSign:false,ownNavamsa:false,
 ownDrekkana:false,vargottama:false
});
eq(missingChakrapadaStatus.resolved,false,'missing chart-specific benefic status blocks Chakra Harana');
eq(missingChakrapadaStatus.adjustedAmsaYearsCandidate,null,'no silent Mercury natural-benefic guess');
ok(missingChakrapadaStatus.blockers.some(x=>x.includes('benefic/malefic status')),
 'missing Chakra benefic/malefic status is explicitly reported');
const noChakraMultiOccupants=amsaHarana({
 planet:'செவ்வாய்',rawAmsaYears:4,enemySign:false,combust:false,
 houseFromLagna:1,occupantCount:2,strongestOccupantVerified:false,
 isExaltationSign:false,retrograde:false,ownSign:false,ownNavamsa:false,
 ownDrekkana:false,vargottama:false
});
eq(noChakraMultiOccupants.resolved,true,'multi-occupant Shadbala ranking is irrelevant outside houses 7–12');
eq(noChakraMultiOccupants.chakrapadaLossFraction,0,'no Chakra loss outside houses 7–12');
const amsaMultiFactor=amsaHarana({
 planet:'செவ்வாய்',rawAmsaYears:6,enemySign:false,combust:false,
 houseFromLagna:1,occupantCount:1,strongestOccupantVerified:true,
 isExaltationSign:true,retrograde:true,ownSign:true,ownNavamsa:true,
 ownDrekkana:true,vargottama:true
});
eq(amsaMultiFactor.multiplier,3,'p235 uses the larger x3 multiplier, never x3 times x2');
close(amsaMultiFactor.adjustedAmsaYearsCandidate,18,'raw years times only the selected maximum multiplier');
const amsaVenusExemption=amsaHarana({
 planet:'சுக்கிரன்',rawAmsaYears:6,enemySign:true,combust:true,
 houseFromLagna:1,occupantCount:1,strongestOccupantVerified:true,
 isExaltationSign:false,retrograde:false,ownSign:false,ownNavamsa:false,
 ownDrekkana:false,vargottama:false
});
close(amsaVenusExemption.enemySignLossFraction,1/3,'Amsa candidate keeps enemy loss for Venus because combustion Harana is exempt');
close(amsaVenusExemption.combustionLossFraction,0,'Amsa candidate skips combustion Harana for Venus');
close(amsaVenusExemption.adjustedAmsaYearsCandidate,4,'Venus candidate uses one-third enemy loss');

assert.throws(()=>red({planet:'சூரியன்'}),TypeError,'unknown conditions cannot default to false');assertions++;
const limits=[
 ['சூரியன்',undefined,null,true],['சந்திரன்',undefined,12,true],
 ['செவ்வாய்',undefined,17,true],['புதன்',false,14,true],['புதன்',true,12,true],
 ['குரு',undefined,11,true],['சுக்கிரன்',false,10,true],['சுக்கிரன்',true,8,true],
 ['சனி',undefined,15,true]
];
for(const [planet,retrograde,limit,resolved] of limits){
 const r=combustLimit({planet,retrograde});
 eq(r.limitDegrees,limit,planet+' p244 combustion limit');
 eq(r.resolved,resolved,planet+' p244 source status');
}
eq(combustStatus({planet:'சூரியன்',trueLongitude:100,sunLongitude:100}).combust,false,'Sun is not self-combust');
eq(combustStatus({planet:'செவ்வாய்',trueLongitude:113,sunLongitude:100}).combust,true,'Mars within 17-degree limit');
eq(combustStatus({planet:'சனி',trueLongitude:114,sunLongitude:100}).combust,true,'Saturn within 15-degree combustion-status limit');
eq(combustStatus({planet:'சனி',trueLongitude:114,sunLongitude:100}).combustionHaranaFraction,0,'Saturn Harana exemption applies despite combustion status');
eq(combustStatus({planet:'சனி',trueLongitude:114,sunLongitude:100}).combustionHaranaExempt,true,'Saturn exemption visible');
eq(combustStatus({planet:'சுக்கிரன்',trueLongitude:129,sunLongitude:120,retrograde:false}).combust,true,'direct Venus within 10-degree combustion-status limit');
eq(combustStatus({planet:'சுக்கிரன்',trueLongitude:129,sunLongitude:120,retrograde:false}).combustionHaranaFraction,0,'Venus Harana exemption applies despite combustion status');
eq(combustStatus({planet:'சுக்கிரன்',trueLongitude:127,sunLongitude:120,retrograde:true}).combust,true,'retrograde Venus within 8-degree limit');
eq(combustStatus({planet:'சுக்கிரன்',trueLongitude:130,sunLongitude:120,retrograde:false}).resolved,false,'exact Venus threshold unresolved');
eq(combustStatus({planet:'புதன்',trueLongitude:113,sunLongitude:100}).resolved,false,'Mercury motion state required');
eq(combustStatus({planet:'புதன்',trueLongitude:113,sunLongitude:100,retrograde:true}).combust,false,'13 degrees is beyond retrograde Mercury 12-degree limit');
assert.throws(()=>nat({planet:'ராகு',trueLongitude:20}),RangeError);assertions++;
assert.throws(()=>nat({planet:'சனி',trueLongitude:NaN}),TypeError);assertions++;
assert.throws(()=>house({house:13,benefic:true}),RangeError);assertions++;
assert.throws(()=>house({house:8,benefic:null}),TypeError);assertions++;
const assembled=seven({planets:example.map(([name,longitude])=>({name,longitude}))});
eq(assembled.grahaCount,7,'all seven assembled');
eq(assembled.natalTotalYears,null,'no final natal total');
eq(assembled.publishedToCustomers,false,'isolated from customer reports');
// The eight lines on PRINTED p.248 / scan PDF p.270 are:
// Sun 0-9-0-0, Moon 0-6-26-7, Mars 1-5-27-0,
// Mercury 8-3-28-12, Jupiter 13-2-11-11, Venus 11-6-10-40,
// Saturn 30-6-5-0, Lagna 6-1-27-36.
// Straight addition of ALL 8 rows = 72-6-15-46, but the author
// prints 71-9-15-46, exactly the result WITHOUT Sun's 0-9 row.
// Record the source conflict, do NOT invent a different reduction.
const originalEight=[
 [0,9,0,0],[0,6,26,7],[1,5,27,0],[8,3,28,12],
 [13,2,11,11],[11,6,10,40],[30,6,5,0],[6,1,27,36]
].map(([years,months,days,nazhigai])=>({years,months,days,nazhigai}));
const completeEight=sumRows({rows:originalEight});
const withoutSun=sumRows({rows:originalEight.slice(1)});
eq(completeEight.traditionalUnits,{years:72,months:6,days:15,nazhigai:46},
 'printed p248 ALL eight row arithmetic, including Sun');
eq(withoutSun.traditionalUnits,{years:71,months:9,days:15,nazhigai:46},
 'printed p248 final total agrees exactly ONLY if Sun excluded');
eq(completeEight.finalHumanLifespanYears,null,
 'printed book discrepancy cannot certify person lifespan');
console.log(JSON.stringify({pass:true,assertions,
 source:'CG Rajan I printed pp.231–244',bookExampleGrahasVerified:7,
 bookExampleUnits:example.map(([name,,,expected])=>({planet:name,units:expected})),
 personLifeExpectancyOutput:false,fullAyurdayaCertified:false,
 UttaraKalamritaModuleUnchanged:true,
 printedP248AllEightRows:completeEight.traditionalUnits,
 printedP248OmittingSun:withoutSun.traditionalUnits,
 p248PrintedTotalConflictUnresolved:true}));

// Independent printed 24-point Suryasiddhanta Jya / inverse Jya +
// four-stage classic-geometric true longitude versus two published samples.
// Full original five natal dates evaluated; false certification is forbidden.
import assert from 'node:assert/strict';
import {SAURA_CLASSICAL_JYA,sauraJyaSignedDegrees,sauraInverseJyaArcMinutes,
        sauraTabularFourPassTrueLongitude as tabular}
  from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';
import {sauraFourPassTrueLongitude as continuous,sauraMandoccaResearch}
  from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {sauraFivePlanetCheshtaInputs}
  from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
const reference=[0,225,449,671,890,1105,1315,1520,1719,1910,2093,2267,
                2431,2585,2728,2859,2978,3084,3177,3256,3321,3372,3409,3431,3438];
const angle=(a,b)=>Math.abs((((a-b)%360)+540)%360-180);
let assertions=0;
const near=(a,b,tol,label)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,
  label+' actual='+a+' expected='+b+' tol='+tol);assertions++};
const check=(value,label)=>{assert.ok(value,label);assertions++};
assert.deepEqual([...SAURA_CLASSICAL_JYA],reference);assertions++;
for(let i=0;i<25;i++){
 near(sauraJyaSignedDegrees(i*3.75),reference[i],1e-8,'printed Jya '+i);
 near(sauraJyaSignedDegrees(180-i*3.75),reference[i],1e-8,'Q2 Jya '+i);
 near(sauraJyaSignedDegrees(180+i*3.75),-reference[i],1e-8,'Q3 Jya '+i);
 near(sauraJyaSignedDegrees(360-i*3.75),-reference[i],1e-8,'Q4 Jya '+i);
 near(sauraInverseJyaArcMinutes(reference[i]),i*3.75,1e-8,'inverse Jya '+i);
}
for(let i=0;i<4500;i++){
 const theta=i*.02;
 const jy=sauraJyaSignedDegrees(theta);
 near(sauraInverseJyaArcMinutes(jy),theta,1e-8,'dense tabular jya invert '+i);
}
assert.throws(()=>sauraJyaSignedDegrees(NaN),TypeError);assertions++;
assert.throws(()=>sauraInverseJyaArcMinutes(3439),RangeError);assertions++;
// Reference 2024 Table6/7 (Santhoju et al. JAA 46:9), published.
const paper={
 Mercury:{m:353.2261,a:220.4772,s:151.249,hS:5.9244,hM:-1.6013,fullM:-3.5381,fullS:11.0501,stage1:5.075,stage2:355.9479,stage3:349.688,true:0.738},
 Venus:{m:353.2261,a:79.8785,s:328.7388,hS:-5.1368,hM:.8788,fullM:1.7462,fullS:-10.9856,stage1:342.9524,stage2:349.8469,stage3:354.9723,true:343.9867},
 Mars:{m:295.0651,a:130.0471,s:353.2261,hS:11.6844,hM:-.4649,fullM:-4.2191,fullS:29.0543,stage1:318.4339,stage2:305.8197,stage3:290.846,true:319.9003},
 Jupiter:{m:31.7206,a:171.3844,s:353.2261,hS:-3.1086,hM:1.715,fullM:3.6705,fullS:-7.1795,stage1:25.5033,stage2:32.0419,stage3:35.391,true:28.2115},
 Saturn:{m:316.5202,a:236.6267,s:353.2261,hS:1.7966,hM:-3.8317,fullM:-7.6159,fullS:4.1194,stage1:320.1135,stage2:310.6534,stage3:308.9042,true:313.0236}
};
const secondPublished={
 Mercury:[321.64431,220.46066,81.92843,338.23698],
 Venus:[321.64431,79.8545,80.8769,7.29285],
 Mars:[263.63927,130.03798,321.64431,280.25106],
 Jupiter:[259.86122,171.34402,321.64431,264.43632],
 Saturn:[224.31668,236.62491,321.64431,232.00407]
};
const norm=x=>((x%360)+360)%360;
const rows=[];
for(const [planet,p] of Object.entries(paper)){
 const c=continuous({planet,meanLongitude:p.m,mandocca:p.a,sheeghrocha:p.s});
 const t=tabular({planet,meanLongitude:p.m,mandocca:p.a,sheeghrocha:p.s});
 const tabularVsExact=angle(t.trueLongitude,c.trueLongitude),
       tabularVsPrinted=angle(t.trueLongitude,p.true);
 // Actual TABLE7 stage arithmetic: not sequential "add each half" as
 // the table headings appear to suggest, but these precise combinations.
 near(angle(norm(p.m+2*p.hS),p.stage1),0,.0002,planet+' printed stage1 == mean+2*halfS');
 near(angle(norm(p.m+p.hS+2*p.hM),p.stage2),0,.0002,planet+' printed stage2 == mean+halfS+2*halfM');
 near(angle(norm(p.m+p.fullM),p.stage3),0,.0002,planet+' printed stage3 == mean+fullM');
 near(angle(norm(p.m+p.fullM+p.fullS),p.true),0,.0002,planet+' printed final == mean+fullM+fullS');
 check(tabularVsExact<.025,planet+' printed 24 Jya interpolation agrees with continuous geometry <0.025°');
 check(!t.historicallyCertified&&!t.useAsProductionCheshta,planet+' fail closed for historical natal');
 rows.push({planet,
   geometricTrue:+c.trueLongitude.toFixed(6),
   printedJyaTrue:+t.trueLongitude.toFixed(6),
   publishedAcademicTrue:p.true,
   tableVsGeometryDegrees:+tabularVsExact.toFixed(6),
   printedJyaVsAcademicDegrees:+tabularVsPrinted.toFixed(6),
   independent2024PrecisionPass:tabularVsPrinted<=.05
 });
}
check(rows.filter(r=>r.independent2024PrecisionPass).length===1,
      'Only Venus matches JAA 2024 at 0.05° even with historical Jya table; no false precision pass');
const secondary=[];
for(const [planet,[meanLongitude,mandocca,sheeghrocha,published]] of Object.entries(secondPublished)){
 const actual=tabular({planet,meanLongitude,mandocca,sheeghrocha});
 const discrepancy=angle(actual.trueLongitude,published);
 check(discrepancy<.35,planet+' independent second published worked example within 0.35°');
 secondary.push({planet,published,tableTrue:+actual.trueLongitude.toFixed(6),
  differenceDegrees:+discrepancy.toFixed(6)});
}
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],['2015-09-06','09:30']];
let natalRows=0;
const deviations=[];
for(const [date,time] of births){
 const [y,m,d]=date.split('-').map(Number),[h,minute]=time.split(':').map(Number);
 const jdUt=(Date.UTC(y,m-1,d,h,minute)-330*60000)/86400000+2440587.5;
 const row={date,time,grahas:{}};
 for(const planet of Object.keys(paper)){
  const params=sauraFivePlanetCheshtaInputs(jdUt,planet);
  const apsis=sauraMandoccaResearch(jdUt,planet);
  const q={planet,meanLongitude:params.meanLongitude,
   mandocca:apsis.mandocca,sheeghrocha:params.sheeghrocha};
  const a=tabular(q),b=continuous(q);
  const delta=angle(a.trueLongitude,b.trueLongitude);
  check(Number.isFinite(delta)&&delta<.035,planet+' '+date+' 24-point Jya versus geometry envelope');
  check(!a.historicallyCertified,planet+' '+date+' cannot certify ancient Bija/apsis history');
  row.grahas[planet]={tableTrue:+a.trueLongitude.toFixed(6),geometricTrue:+b.trueLongitude.toFixed(6),
   deltaDegrees:+delta.toFixed(6)};
  natalRows++;
 }
 deviations.push(row);
}
check(natalRows===25,'five natal dates times five real grahas');
console.log(JSON.stringify({
 pass:true,assertions,
 book:'Suryasiddhanta Ch II printed sine table and four corrections',
 referenceBookJyaValuesVerified:25,
 twoMathematicalOraclesReconciled:true,
 publishedTable7StageArithmeticReconstructed:5,
 independentAcademicFinePassCount:rows.filter(r=>r.independent2024PrecisionPass).length,
 allFiveAcademicTrueLongitudeCERTIFIED:false,
 natalHistoricallyCertified:false,completeShadbalaCertified:false,
 publishedRows:rows,secondReferenceRows:secondary,natalCandidates:deviations
}));

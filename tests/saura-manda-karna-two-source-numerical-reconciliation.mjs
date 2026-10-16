/**
 * Source-level reconciliation gate: competing Manda-karna interpretations
 * applied without fitting a planet-specific coefficient.
 *
 * Academic Santhoju et al. (2025) Tables 6/7/9:
 * DOI https://doi.org/10.1007/s12036-024-10018-8
 * Caitanya published worked example:
 * https://rkanetech.com/true-position
 * Both are outside SMV ASTRO. Even PASS here is not a certificate of
 * independent historical ephemeris or sixfold Shadbala.
 */
import assert from 'node:assert/strict';
import {sauraTabularFourPassTrueLongitude as tabular}
  from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';
import {sauraFourPassTrueLongitude as geometric,sauraMandoccaResearch}
  from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {sauraFivePlanetCheshtaInputs}
  from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {computeClassicalFiveNatalCheshta as natalEngine}
  from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as cheshta}
  from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
const dist=(x,y)=>Math.abs((((x-y)%360)+540)%360-180);
const near=(actual,expected,tol,label)=>{assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tol,
  label+' actual='+actual+' expected='+expected+' tol='+tol);count++};
const ensure=(condition,label)=>{assert.ok(condition,label);count++};
let count=0;
const tamil={Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',Jupiter:'குரு',Saturn:'சனி'};
const site={
 Mercury:[321.64431,220.46066,81.92843,338.23698],
 Venus:[321.64431,79.8545,80.8769,7.29285],
 Mars:[263.63927,130.03798,321.64431,280.25106],
 Jupiter:[259.86122,171.34402,321.64431,264.43632],
 Saturn:[224.31668,236.62491,321.64431,232.00407]
};
const academic2024April09={
 Mercury:[353.2261,220.4772,151.249,.738],
 Venus:[353.2261,79.8785,328.7388,343.9867],
 Mars:[295.0651,130.0471,353.2261,319.9003],
 Jupiter:[31.7206,171.3844,353.2261,28.2115],
 Saturn:[316.5202,236.6267,353.2261,313.0236]
};
const academic2024April13={
 Mercury:[357.8763,220.4772,170.5581,357.1935],
 Venus:[357.8763,79.8785,336.2979,349.8551],
 Mars:[297.5377,130.0471,357.8763,323.7391],
 Jupiter:[32.1126,171.3844,357.8763,29.2968],
 Saturn:[316.678,236.6267,357.8763,313.526]
};
const parameters=([meanLongitude,mandocca,sheeghrocha],planet)=>({planet,meanLongitude,mandocca,sheeghrocha});
function compare(rows,label){
 const out={};let normalPrecisionCount=0,alternatePrecisionCount=0,universalPrecisionCount=0;
 for(const [planet,v] of Object.entries(rows)){
  const p=parameters(v,planet);
  const plus=tabular(p);
  const minus=tabular({...p,mandaKarṇaConvention:'alternate-minus'});
  const universal=tabular({...p,mandaKarṇaConvention:'absolute-koti-minus'});
  const checkPlus=geometric(p);
  const checkMinus=geometric({...p,mandaKarṇaConvention:'alternate-minus'});
  const checkUniversal=geometric({...p,mandaKarṇaConvention:'absolute-koti-minus'});
  const ep=dist(plus.trueLongitude,v[3]),em=dist(minus.trueLongitude,v[3]),
        eu=dist(universal.trueLongitude,v[3]);
  ensure(plus.mandaKarṇaConvention==='common-plus'&&!plus.historicallyCertified,
    label+' '+planet+' published orbital input unmodified');
  ensure(minus.mandaKarṇaConvention==='alternate-minus'&&!minus.historicallyCertified,
    label+' '+planet+' research alternative isolated');
  ensure(dist(plus.trueLongitude,checkPlus.trueLongitude)<.035,
    label+' '+planet+' tabular and geometric SAME plus method');
  ensure(dist(minus.trueLongitude,checkMinus.trueLongitude)<.035,
    label+' '+planet+' tabular and geometric SAME minus method');
  ensure(dist(universal.trueLongitude,checkUniversal.trueLongitude)<.035,
    label+' '+planet+' tabular and geometric SAME universal absolute-koti method');
  if(ep<=.0001)normalPrecisionCount++;
  if(em<=.0001)alternatePrecisionCount++;
  if(eu<=.0001)universalPrecisionCount++;
  out[planet]={
    externalPublished:v[3],commonPlus:+plus.trueLongitude.toFixed(6),
    alternateMinus:+minus.trueLongitude.toFixed(6),
    universalAbsMinus:+universal.trueLongitude.toFixed(6),
    commonErrorDeg:+ep.toFixed(6),alternateErrorDeg:+em.toFixed(6),
    universalErrorDeg:+eu.toFixed(6),
    diffBetweenConventionsDeg:+dist(plus.trueLongitude,minus.trueLongitude).toFixed(6),
    halfMandaPlus:+plus.stages.halfMandaDegrees.toFixed(6),
    halfMandaMinus:+minus.stages.halfMandaDegrees.toFixed(6),
    fullMandaPlus:+plus.stages.fullMandaDegrees.toFixed(6),
    fullMandaMinus:+minus.stages.fullMandaDegrees.toFixed(6),
    halfMandaUniversal:+universal.stages.halfMandaDegrees.toFixed(6),
    fullMandaUniversal:+universal.stages.fullMandaDegrees.toFixed(6)
  };
 }
 return {label,normalPrecisionCount,alternatePrecisionCount,universalPrecisionCount,rows:out};
}
const siteProof=compare(site,'Caitanya');
ensure(siteProof.normalPrecisionCount===4,'normal convention four of five externally exact; do not regress');
ensure(siteProof.alternatePrecisionCount===1,'alternate convention only Saturn externally exact');
ensure(siteProof.universalPrecisionCount===5,'ONE universal absolute-koti formula reproduces all five published planets');
const satPlus=siteProof.rows.Saturn;
near(satPlus.commonErrorDeg,.290446,.000003,'published Saturn old mismatch');
near(satPlus.alternateErrorDeg,0,.00001,'Saturn alternate final matches published');
near(satPlus.halfMandaMinus,.71105,.00002,'Saturn published half-Manda');
near(satPlus.fullMandaMinus,1.31310,.00002,'Saturn published full-Manda');
near(satPlus.halfMandaUniversal,.71105,.00002,'Saturn universal half Manda');
near(satPlus.fullMandaUniversal,1.31310,.00002,'Saturn universal full Manda');
ensure(siteProof.rows.Mars.alternateErrorDeg>1.60&&
  siteProof.rows.Mercury.alternateErrorDeg>.24,
  'cannot adopt alternate minus for all planets');
const p9=compare(academic2024April09,'JAA Apr09');
const p13=compare(academic2024April13,'JAA Apr13');
for(const [name,p] of [['Apr09',p9],['Apr13',p13]]){
 ensure(p.rows.Mars.commonErrorDeg>3 && p.rows.Mars.alternateErrorDeg>3 && p.rows.Mars.universalErrorDeg>3,
  name+' printed Mars cannot be recovered by only Manda denominator sign');
 ensure(p.normalPrecisionCount<5&&p.alternatePrecisionCount<5,
  name+' no full five-graha academic precision certificate');
}
ensure(p9.rows.Jupiter.alternateErrorDeg<.005,'JAA Apr09 Jupiter alternate output close to published');
ensure(p9.rows.Mercury.alternateErrorDeg<.03,'JAA Apr09 Mercury alternate output close to published');
ensure(p13.rows.Saturn.alternateErrorDeg<.06,'JAA Apr13 Saturn alternate output close');
assert.throws(()=>tabular({...parameters(site.Saturn,'Saturn'),mandaKarṇaConvention:'adaptive-fit'}),RangeError);count++;
// Historical 25 birth planets: audit both parameter-consistent conventions;
// neither one has an independent classical historical ephemeris oracle.
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']];
const natal=[];let natalCount=0;
for(const [date,time] of births){
 const [y,m,d]=date.split('-').map(Number),[h,minute]=time.split(':').map(Number);
 const jdUt=(Date.UTC(y,m-1,d,h,minute)-330*60000)/86400000+2440587.5;
 const meanSun=sauraFivePlanetCheshtaInputs(jdUt,'Mars').meanSunLongitude;
 const grahas={},liveResearch=natalEngine({date,time,utcOffsetMinutes:330});
 for(const planet of Object.keys(site)){
  const params=sauraFivePlanetCheshtaInputs(jdUt,planet),
        mandocca=sauraMandoccaResearch(jdUt,planet).mandocca,
        args={planet,meanLongitude:params.meanLongitude,
          mandocca,sheeghrocha:params.sheeghrocha};
  const plus=tabular(args),minus=tabular({...args,mandaKarṇaConvention:'alternate-minus'}),
        universal=tabular({...args,mandaKarṇaConvention:'absolute-koti-minus'});
  const fromDOB=liveResearch.planets.find(p=>p.planet===planet);
  ensure(fromDOB?.mandaKarṇaConvention==='absolute-koti-minus'&&
    dist(fromDOB.tabularClassicalTrueLongitude,universal.trueLongitude)<1e-9 &&
    dist(fromDOB.trueLongitude,universal.trueLongitude)<.035,
    date+' '+planet+' real birth-to-Cheshta uses SAME universal book model');
  const bp=cheshta(tamil[planet],meanSun,params.ownMeanOrbitLongitude,plus.trueLongitude),
        bm=cheshta(tamil[planet],meanSun,params.ownMeanOrbitLongitude,minus.trueLongitude),
        bu=cheshta(tamil[planet],meanSun,params.ownMeanOrbitLongitude,universal.trueLongitude);
  ensure(bp.virupa>=0&&bp.virupa<=60&&bm.virupa>=0&&bm.virupa<=60&&bu.virupa>=0&&bu.virupa<=60,
      date+' '+planet+' both BPHS Virupa finite and bounded');
  ensure(!bp.natalCertified&&!bm.natalCertified&&!bu.natalCertified,date+' '+planet+' historical certification blocked');
  grahas[planet]={
   commonTrue:+plus.trueLongitude.toFixed(6),
   alternateTrue:+minus.trueLongitude.toFixed(6),
   universalTrue:+universal.trueLongitude.toFixed(6),
   longitudeDeltaDegrees:+dist(plus.trueLongitude,minus.trueLongitude).toFixed(6),
   commonCheshtaVirupa:+bp.virupa.toFixed(6),
   alternateCheshtaVirupa:+bm.virupa.toFixed(6),
   universalCheshtaVirupa:+bu.virupa.toFixed(6),
   numericallyCertified:false
  };
  natalCount++;
 }
 natal.push({date,time,grahas});
}
ensure(natalCount===25,'five natal years x five classical research planets');
/*
 * Mars source reconciliation — research only.
 * JAA (2025) 46:9, Table 6/7 p.16 (April 9) and Table 9 p.19
 * (April 13); 10.1007/s12036-024-10018-8.
 * Table 6 actually prints a signed half-Sighra correction on Apr09.
 * Apr13 only prints the stage LONGITUDE: the comparable half correction
 * must be INFERRED from the first stage under the publication's own
 * mean + twice-half-correction pattern; it is not separately printed.
 *
 * A negative result is valuable: these regression assertions prevent an
 * unsubstantiated historical certification, not falsely grant one.
 */
const signedAngularDifference=(actual,published)=>(((actual-published)%360)+540)%360-180;
const marsPaperRows=Object.freeze([
 {label:'2024-04-09',mean:295.0651,mandocca:130.0471,sheeghrocha:353.2261,
  // Table 6 directly printed corrections and Table 7 printed positions
  printedCorrections:[11.6844,-0.4649,-4.2191,29.0543],
  printedStageLongitudes:[318.4339,305.8197,290.8460,319.9003],
  firstHalfSource:'direct Table 6'},
 {label:'2024-04-13',mean:297.5377,mandocca:130.0471,sheeghrocha:357.8763,
  printedCorrections:null,
  printedStageLongitudes:[321.6845,309.4884,293.9943,323.7391],
  firstHalfSource:'inferred from Table 9; not independently printed'}
]);
/*
 * 2025 JAA printed-source equations, evaluated WITHOUT any production
 * implementation, Jya table, interpolation or fixed historical ephemeris.
 *
 * Eq (10): k = sighrocca - mean
 * Eq (11): P = 235 - (235 - 232) * |sin(k)| for Mars Sighra
 * Eq (14-19): R=360/(2pi), r=P/(2pi),
 *             B=r sin(k), K=r cos(k), D=hypot(R+K,B),
 *             half = asin(B/D)/2.
 * Dimensionless R=1 is exactly equivalent (r/R=P/360).
 *
 * The source's 13-Apr first half is INFERRED by its Table 7-style
 * 'mean + twice printed half' convention; Table 9 does NOT publish a
 * separate half correction. Only 9-Apr Table 6 directly prints it.
 */
const marsPublishedEquationEvidence=[];
const toRadians=Math.PI/180, toDegrees=180/Math.PI;
function independentPaperHalfSighra(mean,sheeghrocha,paridhiOverride){
 const k=((sheeghrocha-mean)%360+360)%360;
 const sine=Math.sin(k*toRadians),cosine=Math.cos(k*toRadians);
 const paridhi=paridhiOverride??235-3*Math.abs(sine);
 const radiusRatio=paridhi/360; // (P/2pi) / (360/2pi)
 const bhuj=radiusRatio*sine,koti=radiusRatio*cosine;
 const karna=Math.hypot(1+koti,bhuj); // k=~58/60 degrees: plus per SS II.40
 const fullCorrection=Math.asin(bhuj/karna)*toDegrees;
 return {k,paridhi,bhuj,koti,karna,
   halfCorrection:fullCorrection/2,fullCorrection};
}
for(const r of marsPaperRows){
 const paperHalf=r.printedCorrections?.[0] ??
   signedAngularDifference(r.printedStageLongitudes[0],r.mean)/2;
 const eq=independentPaperHalfSighra(r.mean,r.sheeghrocha);
 const maximum=independentPaperHalfSighra(r.mean,r.sheeghrocha,235).halfCorrection;
 const minimum=independentPaperHalfSighra(r.mean,r.sheeghrocha,232).halfCorrection;
 // Invert the printed correction geometrically. From
 // tan(2h) = (q*sin(k))/(1+q*cos(k)), q=P/360.
 // P = 360*tan(2h)/(sin(k)-tan(2h)*cos(k)).
 const tan=Math.tan(2*paperHalf*toRadians);
 const requiredParidhi=360*tan/(Math.sin(eq.k*toRadians)-tan*Math.cos(eq.k*toRadians));
 const jya=tabular({planet:'Mars',meanLongitude:r.mean,
    mandocca:r.mandocca,sheeghrocha:r.sheeghrocha}).stages.halfSighraDegrees;
 const continuous=geometric({planet:'Mars',meanLongitude:r.mean,
    mandocca:r.mandocca,sheeghrocha:r.sheeghrocha}).stages.halfSighraDegrees;
 near(eq.halfCorrection,continuous,1e-10,
   r.label+' independently computed Eqs 10,11,14-19 agree with production continuous geometry');
 ensure(Math.abs(eq.halfCorrection-jya)<.012,
   r.label+' 24 printed Jya table has expected interpolation error not 0.55 degrees');
 ensure(eq.paridhi>=232&&eq.paridhi<=235&&minimum<eq.halfCorrection&&eq.halfCorrection<maximum,
   r.label+' Eq 11 paridhi falls within fixed published 232-235 bounds');
 ensure(paperHalf>maximum+.45,
   r.label+' published half-Sighra EXCEEDS MAX possible under its own paridhi + equations');
 ensure(requiredParidhi>249&&requiredParidhi>235+14,
   r.label+' inverse published half correction requires out-of-range Sighra paridhi');
 // Every printed 4-decimal longitude has at most +/- 0.00005 rounding.
 // Analyze all four corner cases of that input interval.
 const cornerValues=[];
 for(const dm of [-.00005,.00005])
  for(const ds of [-.00005,.00005])
   cornerValues.push(independentPaperHalfSighra(r.mean+dm,r.sheeghrocha+ds).halfCorrection);
 const roundedMin=Math.min(...cornerValues),roundedMax=Math.max(...cornerValues);
 ensure(paperHalf-roundedMax>.45,
   r.label+' longitude table rounding cannot bridge first-correction disagreement');
 ensure(roundedMax-roundedMin<.0001,
   r.label+' 4-decimal input rounding changes half-correction by less than 0.0001 degree');
 marsPublishedEquationEvidence.push({
   date:r.label,paperHalfSource:r.firstHalfSource,
   sighraKendraDeg:+eq.k.toFixed(6),
   sphutaSighraParidhiDeg:+eq.paridhi.toFixed(9),
   dimensionlessBhuj:+eq.bhuj.toFixed(9),
   dimensionlessKoti:+eq.koti.toFixed(9),
   dimensionlessKarna:+eq.karna.toFixed(9),
   independentEquationHalfDeg:+eq.halfCorrection.toFixed(9),
   tabular24JyaHalfDeg:+jya.toFixed(9),
   publishedOrInferredHalfDeg:+paperHalf.toFixed(6),
   maxHalfUsingPublishedParidhi235Deg:+maximum.toFixed(9),
   requiredParidhiForPaperHalfDeg:+requiredParidhi.toFixed(9),
   excessAbovePublishedMaximumParidhiDeg:+(requiredParidhi-235).toFixed(9),
   inputRoundingHalfMinDeg:+roundedMin.toFixed(9),
   inputRoundingHalfMaxDeg:+roundedMax.toFixed(9),
   publishedHalfReproducedFromStatedEquations:false,
   attributionToSpecificPublicationCodingErrorProven:false,
   productionEngineChanged:false
 });
}
ensure(marsPublishedEquationEvidence.length===2,
 'two dates explicitly invert the academic four-pass Sighra step against source equations');
const marsFourStageEvidence=[];
for(const row of marsPaperRows){
 const inputs={planet:'Mars',meanLongitude:row.mean,mandocca:row.mandocca,
   sheeghrocha:row.sheeghrocha,mandaKarṇaConvention:'absolute-koti-minus'};
 const fromJya=tabular(inputs),fromTrig=geometric(inputs);
 const js=fromJya.stages,gs=fromTrig.stages;
 const stageNames=['halfSighra','halfManda','fullManda','fullSighra'];
 const calculatedCorrections=[js.halfSighraDegrees,js.halfMandaDegrees,
   js.fullMandaDegrees,js.fullSighraDegrees];
 const trigCorrections=[gs.halfSighraDegrees,gs.halfMandaDegrees,
   gs.fullMandaDegrees,gs.fullSighraDegrees];
 const calculatedLongitudes=[js.afterHalfSighra,js.afterHalfManda,
   js.afterFullManda,fromJya.trueLongitude];
 const paperHalfS=row.printedCorrections
   ?row.printedCorrections[0]
   :signedAngularDifference(row.printedStageLongitudes[0],row.mean)/2;
 const correctionError=calculatedCorrections[0]-paperHalfS;
 // Check two genuinely different numeric methods (printed Jya versus trig)
 // before comparing one chosen historical model against external paper.
 for(let i=0;i<4;i++)ensure(Math.abs(calculatedCorrections[i]-trigCorrections[i])<.025,
   row.label+' '+stageNames[i]+' Jya versus continuous geometry independent numeric route');
 ensure(correctionError<-.5&&correctionError>-.6,
   row.label+' first mismatch is already the initial half-Sighra correction');
 ensure(dist(calculatedLongitudes[0],row.printedStageLongitudes[0])>12,
   row.label+' published first-stage LONGITUDE not model first half-step');
 ensure(dist(fromJya.trueLongitude,row.printedStageLongitudes[3])>3,
   row.label+' no false Mars true-longitude paper agreement');
 ensure(!fromJya.historicallyCertified&&!fromTrig.historicallyCertified,
   row.label+' four-stage diagnostic cannot certify a historical orbit');
 if(row.printedCorrections){
   const [hs,hm,fm,fs]=row.printedCorrections;
   // Directly check the published Table 6 and Table 7 algebra.
   near(dist(row.printedStageLongitudes[0],row.mean+2*hs),0,.00011,
     'Apr09 Table 7 stage one is mean PLUS TWICE Table 6 half-Sighra');
   near(dist(row.printedStageLongitudes[1],row.mean+hs+2*hm),0,.00011,
     'Apr09 Table 7 stage two is mean + printed half S + TWO half M');
   near(dist(row.printedStageLongitudes[2],row.mean+fm),0,.00011,
     'Apr09 Table 7 full Manda reconstructs mean plus full Manda');
   near(dist(row.printedStageLongitudes[3],row.mean+fm+fs),0,.00011,
     'Apr09 Table 7 final reconstructs from its own printed values');
   ensure(dist(row.printedStageLongitudes[0],row.mean+hs)>11.6,
     'Apr09 published half-Sighra first-stage label NOT the half-corrected mean');
 }
 const traces=stageNames.map((stage,i)=>({
   stage, publishedStageLongitude:row.printedStageLongitudes[i],
   tabularStageLongitude:+calculatedLongitudes[i].toFixed(6),
   signedStageErrorDeg:+signedAngularDifference(calculatedLongitudes[i],
     row.printedStageLongitudes[i]).toFixed(6),
   tabularCorrectionDegrees:+calculatedCorrections[i].toFixed(6),
   geometricCorrectionDegrees:+trigCorrections[i].toFixed(6),
   publishedCorrectionDegrees:row.printedCorrections?.[i]??null,
   correctionErrorDegrees:row.printedCorrections
     ?+(calculatedCorrections[i]-row.printedCorrections[i]).toFixed(6):null
 }));
 marsFourStageEvidence.push({
   date:row.label,firstHalfSource:row.firstHalfSource,
   paperHalfSighraComparable:+paperHalfS.toFixed(6),
   engineHalfSighra:+calculatedCorrections[0].toFixed(6),
   initialCorrectionDifferenceDegrees:+correctionError.toFixed(6),
   firstDivergence:'Half-Sighra (stage 1)',
   stages:traces,
   publishedPaperTrueLongitude:row.printedStageLongitudes[3],
   engineTrueLongitude:+fromJya.trueLongitude.toFixed(6),
   fullTraditionalCertificate:false
 });
}
ensure(marsFourStageEvidence.length===2,
  'both exact 2024 academic dates have all four separately enumerated stages');
console.log(JSON.stringify({
  pass:true,assertions:count,
  sourceMathForensicPASS:true,
  marsFourStageEvidence,
  marsPublishedEquationEvidence,
  siteFourCommonOneAlternateConfirmed:true,
  oneUniversalAbsoluteKotiMatchesFivePublishedGrahas:true,
  mandakarnaConventionConflictNotSilentlyFitted:true,
  academic2024MarsAcrossTwoDatesUNRESOLVED:true,
  historicalTrueCertified:false,natalCheshtaCertified:false,
  sevenGrahaShadbalaCertified:false,
  siteProof,academic2024April09:p9,academic2024April13:p13,natal
}));

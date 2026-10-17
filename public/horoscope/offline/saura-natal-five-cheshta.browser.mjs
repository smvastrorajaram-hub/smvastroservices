/**
 * SMV ASTRO classical five-graha natal Cheshta calculator.
 *
 * One public API resolves birth clock -> UT Julian day -> traditional
 * Saura mean/Sighrocca -> moving Mandocca research model -> classical
 * four-step geocentric true -> BPHS I Ch 27 vv24–25 Virupas.
 *
 * IMPORTANT: This is a RUNNING CLASSICAL MODEL, not a certified modern
 * observational ephemeris. Historic Bija calibration and mandocca epoch
 * remain unproven. Intentionally not connected to production strength3.
 */
import {sauraMeanOrbitalLongitude,sauraFivePlanetCheshtaInputs}
  from './saura-classical-mean-motion.browser.mjs';
import {sauraFourPassTrueLongitude,sauraMandoccaResearch}
  from './saura-classical-true-longitude.browser.mjs';
import {sauraTabularFourPassTrueLongitude}
  from './saura-classical-tabular-jya.browser.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans}
  from './bphs-swiss-solar-cheshta.browser.mjs';

const BODIES=Object.freeze([
  ['செவ்வாய்','Mars'],['புதன்','Mercury'],['குரு','Jupiter'],
  ['சுக்கிரன்','Venus'],['சனி','Saturn']
]);
const YEAR_MIN=1600,YEAR_MAX=2200;
function birthToJulianUT({date,time,utcOffsetMinutes}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||
     !/^\d{2}:\d{2}$/.test(String(time))||
     !Number.isInteger(utcOffsetMinutes)||Math.abs(utcOffsetMinutes)>14*60)
    throw new RangeError('Valid civil birth YYYY-MM-DD HH:MM and signed UTC offset minutes required');
  const [year,month,day]=date.split('-').map(Number);
  const [hours,minutes]=time.split(':').map(Number);
  const at=Date.UTC(year,month-1,day,hours,minutes);
  if(year<YEAR_MIN||year>YEAR_MAX||hours>23||minutes>59||
     !Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==date||
     new Date(at).getUTCHours()!==hours||new Date(at).getUTCMinutes()!==minutes)
    throw new RangeError('Civil date/time out of defined Gregorian research range');
  return (at-utcOffsetMinutes*60000)/86400000+2440587.5;
}
/**
 * The returned 25-degree natal calculations are deliberately available
 * without needing a chart/UI; certificate flags are provenance facts, NOT
 * declarations of scientific accuracy.
 */
export function computeClassicalFiveNatalCheshta(birth){
  const jdUt=birthToJulianUT(birth);
  const meanSun=sauraMeanOrbitalLongitude(jdUt,'Sun');
  const planets=BODIES.map(([tamil,planet])=>{
    const args=sauraFivePlanetCheshtaInputs(jdUt,planet);
    const mandoccaModel=sauraMandoccaResearch(jdUt,planet);
    // Apply one systematic, five-planet arithmetic convention; remains
    // research-only until the independent 2024 Mars and historical gates pass.
    const mandaKarṇaConvention='absolute-koti-minus';
    const trueModel=sauraFourPassTrueLongitude({
      planet,
      meanLongitude:args.meanLongitude,
      mandocca:mandoccaModel.mandocca,
      sheeghrocha:args.sheeghrocha,mandaKarṇaConvention
    });
    // Independent classical 24-Jya book lookup cross-check.
    // This is NOT a second historical astronomical ephemeris: both
    // paths share ancient mean / Mandocca parameters. It only tests the
    // precision effect of tabulated Jya vs continuous trigonometry.
    const tabular=sauraTabularFourPassTrueLongitude({
      planet,meanLongitude:args.meanLongitude,
      mandocca:mandoccaModel.mandocca,sheeghrocha:args.sheeghrocha,
      mandaKarṇaConvention
    });
    const delta=Math.abs(((tabular.trueLongitude-trueModel.trueLongitude+540)%360)-180);
    const strength=bphsFivePlanetCheshtaFromClassicalMeans(
      tamil,meanSun,args.ownMeanOrbitLongitude,trueModel.trueLongitude
    );
    if(Math.abs(strength.meanLongitude-args.meanLongitude)>1e-9||
       Math.abs(strength.sheeghrocha-args.sheeghrocha)>1e-9||
       !Number.isFinite(strength.virupa)||strength.virupa<0||strength.virupa>60)
      throw new Error('BPHS input mismatch or Cheshta out of classical 0–60 Virupa range: '+planet);
    return Object.freeze({
      planet,tamil,meanLongitude:args.meanLongitude,mandaKarṇaConvention,
      sheeghrocha:args.sheeghrocha,mandocca:mandoccaModel.mandocca,
      trueLongitude:trueModel.trueLongitude,
      // Two self-consistent calculations; not independently observed truth.
      tabularClassicalTrueLongitude:tabular.trueLongitude,
      continuousVs24JyaErrorDegrees:delta,
      mathematicalCrossCheckPass:delta<=0.05,
      cheshtaKendra:strength.cheshtaKendraDegrees,
      cheshtaVirupa:strength.virupa,
      trueModelStages:trueModel.stages,
      model:'unmodified Surya Siddhanta',certified:false
    });
  });
  return Object.freeze({
    birth:Object.freeze({date:birth.date,time:birth.time,utcOffsetMinutes:birth.utcOffsetMinutes}),
    jdUt,meanSunLongitude:meanSun,planets:Object.freeze(planets),
    calculationAvailable:true,natalHistoricalNumericalCertified:false,
    shadbalaNumericallyCertified:false,productionIntegrationAllowed:false,
    missingEvidence:Object.freeze([
      'historical Bija corrections for all five natal epochs',
      'independent historical classical true-longitude numerical oracles',
      'independently certified seven-planet complete six-component Shadbala'
    ])
  });
}

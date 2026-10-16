/**
 * V365 — Saura-paksha (extant Surya Siddhanta) pure traditional mean motions.
 *
 * This is an INDEPENDENT astronomical upstream input to BPHS Ch 27 / Uttara
 * Kalamrita Ch II Cheshta selection, NOT a BPHS passage defining revolutions.
 *
 * Epoch: Kali beginning, Julian day 588465.5; civil days/mahayuga 1577917828.
 * Mean-place arguments use the Ujjain meridian 75°46' E (Lanka/Ujjain
 * reference); days at a UTC Julian instant are converted to local mean time.
 * The 2026-03-22 05:30 IST independent India Meteorological Department
 * Rashtriya Panchang table is the external numeric benchmark.
 *
 * Note: The classical mean reference frame is NOT the Swiss Lahiri or modern
 * heliocentric/osculating system.  No live Cheshta Bala substitution is made.
 * Reference: Surya Siddhanta I vv29–34, 53; Cidambi/Montelle/Plofker (2024)
 * table 1 Saura-paksha; IMD Rashtriya Panchang 2026–27 Bija corrections.
 *
 * No code or tables copied from AGPL PyJHora.
 */
const YUGA_CIVIL_DAYS=1577917828;
const KALI_EPOCH_JD_UT=588465.5;
const UJJAIN_MERIDIAN_DEGREES=75+46/60;
const REVOLUTIONS=Object.freeze({
  Sun:4320000, Mars:2296832, Mercury:17937060,
  Jupiter:364220, Venus:7022376, Saturn:146568
});
const FIVE=Object.freeze(['Mars','Mercury','Jupiter','Venus','Saturn']);
const INNER=new Set(['Mercury','Venus']);
const TAMIL=Object.freeze({
  'செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter',
  'சுக்கிரன்':'Venus','சனி':'Saturn'
});
const has=Object.prototype.hasOwnProperty;
const norm360=x=>((x%360)+360)%360;
function knownBody(body) {
  const key=TAMIL[body]||body;
  if(!has.call(REVOLUTIONS,key))
    throw new RangeError('Classical Saura mean motion supports only Sun, Mars, Mercury, Jupiter, Venus, Saturn');
  return key;
}
function validJulian(jdUt){
  // Limiting to well-resolved positive Julian dates prevents loss of
  // precision in enormous (unrepresentable) epoch separations.
  if(!Number.isFinite(jdUt)||jdUt<0||jdUt>5000000)
    throw new RangeError('Finite UTC Julian day in supported civil-date range required');
}
/** Traditional angular mean daily velocity, degrees per civil day. */
export function sauraMeanDailyMotion(body){
  return REVOLUTIONS[knownBody(body)]*360/YUGA_CIVIL_DAYS;
}
/** Distinct mean-longitude orbit, including Mercury/Venus SIGHROCCA orbits. */
export function sauraMeanOrbitalLongitude(jdUt,body){
  validJulian(jdUt);
  const key=knownBody(body);
  const days=jdUt-KALI_EPOCH_JD_UT+UJJAIN_MERIDIAN_DEGREES/360;
  const turns=days*REVOLUTIONS[key]/YUGA_CIVIL_DAYS;
  return norm360((turns%1)*360);
}
/**
 * BPHS Ch27 (five non-luminary planets) + UK Ch II mean/Sheeghrocha selector:
 *   Mars/Jupiter/Saturn: planet own mean, Sun mean as Sheeghrocha.
 *   Mercury/Venus: Sun mean, own Sighrocca orbit as Sheeghrocha.
 * No true geocentric planet longitude is generated or injected here.
 */
export function sauraFivePlanetCheshtaInputs(jdUt,planet){
  validJulian(jdUt);
  const key=knownBody(planet);
  if(!FIVE.includes(key)) throw new RangeError('Only five planets eligible');
  const meanSun=sauraMeanOrbitalLongitude(jdUt,'Sun');
  const ownMeanOrbit=sauraMeanOrbitalLongitude(jdUt,key);
  return Object.freeze({
    planet:key, jdUt,
    meanSunLongitude:meanSun,
    meanLongitude:INNER.has(key)?meanSun:ownMeanOrbit,
    sheeghrocha:INNER.has(key)?ownMeanOrbit:meanSun,
    ownMeanOrbitLongitude:ownMeanOrbit,
    isInnerPlanet:INNER.has(key),
    model:'Saura-paksha extant Surya Siddhanta; Ujjain mean-meridian',
    frame:'traditional-Saura-nirayana',
    trueLongitudeAvailable:false,
    liveCheshtaEligible:false,
    fullShadbalaNumericallyCertified:false
  });
}
export const SAURA_MEAN_MOTION_METADATA=Object.freeze({
  epochJdUt:KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga:YUGA_CIVIL_DAYS,
  referenceMeridianDegrees:UJJAIN_MERIDIAN_DEGREES,
  orbitalRevolutions:REVOLUTIONS,
  source:'Extant Surya Siddhanta, Saura-paksha mean-motion astronomical constants',
  independentReference:'India Meteorological Department Rashtriya Panchang 2026-27, 2026-03-22 05:30 IST uncorrected Mean Surya Siddhanta Longitude',
  bphsInputSelection:'BPHS I Ch27 24–25; Uttara Kalamrita Ch II 42–43',
  modernSwissOrbitalElementsEquivalent:false,
  liveCheshtaEligible:false
});

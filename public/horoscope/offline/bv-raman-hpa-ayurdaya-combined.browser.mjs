/**
 * B.V. Raman, Hindu Predictive Astrology (20th ed.), Chapters XIV + XXVI.
 *
 * Chapter XIV contributes qualitative, rule-based longevity evidence only.
 * Chapter XXVI contributes the Ashtakavarga arithmetic track: reduced BAV,
 * Rasi/Graha Pinda, per-graha Harana and lunar-to-solar conversion.
 *
 * These tracks are cross-checked, never averaged or allowed to override one
 * another. Primary scan pages for XIV (printed pp. 63–72) and XXVI (pp. 199–203)
 * were visually inspected. Full-precision formula results remain separate from
 * inconsistent printed totals. No final lifespan or death timing is emitted.
 */
import {
  BV_RAMAN_AYURDAYA_PLANETS,
  bvRamanAshtakavargaShodhana
} from './bv-raman-ashtakavarga-ayurdaya.browser.mjs';

export const BV_RAMAN_HPA_CHAPTER_XIV_SOURCE = Object.freeze({
  book: 'B. V. Raman, Hindu Predictive Astrology, 20th edition (1992)',
  chapter: 'XIV — Ayurdaya or Longevity',
  printedPages: '63–72',
  checkedPrintedPages: '63–72; scan images visually inspected',
  evidenceGrade: 'PRIMARY_PAGE_IMAGES_VISUALLY_CHECKED_PARTIAL',
  coverage: 'Selected combinations and antidotes only; page images checked, but this is not the complete chapter rule list'
});

export const BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE = Object.freeze({
  book: 'B. V. Raman, Hindu Predictive Astrology, 20th edition (1992)',
  chapter: 'XXVI — The Ashtakavarga System',
  printedPages: '199–203',
  checkedPrintedPages: '199–203; scan images visually inspected',
  evidenceGrade: 'PRIMARY_PAGE_IMAGES_VISUALLY_CHECKED',
  lunarToSolarRatio: Object.freeze([334, 365]),
  publishedExample: Object.freeze({
    printedNetLunarYears: 48.98,
    printedSolarYears: 44.87,
    solarYearsFromPrintedNet: 48.98 * 334 / 365,
    formulaNetLunarYearsFromPindas: 49,
    formulaSolarYearsFromPindas: 49 * 334 / 365,
    formulaSolarYearsRounded: 44.84,
    status: 'PRIMARY_SCAN_CONFIRMED_PRINTED_ARITHMETIC_MISMATCH'
  })
});

const PLANET_ALIASES = Object.freeze({
  Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury',
  Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu',
  'சூரியன்': 'Sun', 'சந்திரன்': 'Moon', 'செவ்வாய்': 'Mars', 'புதன்': 'Mercury',
  'குரு': 'Jupiter', 'சுக்கிரன்': 'Venus', 'சனி': 'Saturn',
  'ராகு': 'Rahu', 'கேது': 'Ketu', 'லக்னம்': 'Lagna', Lagna: 'Lagna'
});
const NATURAL_MALEFICS = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);
const SIGN_LORDS = Object.freeze([
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
]);
const SIGN_KIND = Object.freeze([
  'movable', 'fixed', 'common', 'movable', 'fixed', 'common',
  'movable', 'fixed', 'common', 'movable', 'fixed', 'common'
]);
const MRITYUBHAGA_DEGREE = Object.freeze([26, 12, 13, 25, 24, 11, 26, 14, 13, 25, 5, 12]);
const DEBILITATION_SIGN = Object.freeze({
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11,
  Jupiter: 9, Venus: 5, Saturn: 0
});
const EXALTATION_SIGN = Object.freeze({
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5,
  Jupiter: 3, Venus: 11, Saturn: 6
});
const GRAHA_ASPECTS = Object.freeze({
  Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10]
});
/**
 * Primary source: B. V. Raman, Hindu Predictive Astrology, Ch. XXVI,
 * printed p. 202, rules 52-58. The page identifies the reduction category
 * and fraction; it does not prove which specific cause applied to each
 * planet in the worked example. Those chart facts remain explicit inputs.
 */
export const BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES = Object.freeze([
  Object.freeze({ key: 'conjunctionInSign', fraction: 1 / 2, label: 'More than one planet in a sign', sourcePrintedPage: 202, sourceRuleNumber: 52 }),
  Object.freeze({ key: 'debilitated', fraction: 1 / 2, label: 'Planet debilitated', sourcePrintedPage: 202, sourceRuleNumber: 53 }),
  Object.freeze({ key: 'combust', fraction: 1 / 2, label: 'Planet combust', sourcePrintedPage: 202, sourceRuleNumber: 54 }),
  Object.freeze({ key: 'temporaryEnemySign', fraction: 1 / 3, label: 'Planet in temporary-enemy sign', sourcePrintedPage: 202, sourceRuleNumber: 55 }),
  Object.freeze({ key: 'aboveHorizon', fraction: 1 / 2, label: 'Planet above the horizon (houses 7–12)', sourcePrintedPage: 202, sourceRuleNumber: 56 }),
  Object.freeze({ key: 'defeatedInPlanetaryWar', fraction: 1 / 3, label: 'Planet defeated in planetary war', sourcePrintedPage: 202, sourceRuleNumber: 57 }),
  Object.freeze({ key: 'eclipsed', fraction: 1 / 3, label: 'Sun or Moon eclipsed', sourcePrintedPage: 202, sourceRuleNumber: 58 })
]);

const finite = value => typeof value === 'number' && Number.isFinite(value);
const norm360 = value => ((value % 360) + 360) % 360;
const tri = value => typeof value === 'boolean' ? value : null;
const triAll = (...values) => values.some(value => value === false)
  ? false : values.every(value => value === true) ? true : null;
const triAny = (...values) => values.some(value => value === true)
  ? true : values.every(value => value === false) ? false : null;
const keyName = value => PLANET_ALIASES[String(value ?? '')] || String(value ?? '');
const houseValid = value => Number.isInteger(value) && value >= 1 && value <= 12;
const signValid = value => Number.isInteger(value) && value >= 0 && value <= 11;
const inList = (value, list) => houseValid(value) ? list.includes(value) : null;
function mapByEnglishName(input) {
  const result = {};
  for (const [key, value] of Object.entries(input || {})) result[keyName(key)] = value;
  return result;
}

function normalizeChart(chart) {
  const rawPlanets = Array.isArray(chart?.planets) ? chart.planets : [];
  const lagnaLongitude = chart?.lagna?.longitude ?? chart?.ascendantLongitude ??
    chart?.lagnaLongitude ?? chart?.lagna?.nirayanaLongitude;
  const lagnaSign = finite(lagnaLongitude) ? Math.floor(norm360(lagnaLongitude) / 30) : null;
  const planets = new Map();
  for (const raw of rawPlanets) {
    const name = keyName(raw?.name ?? raw?.planet);
    if (!['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].includes(name)) continue;
    const longitude = finite(raw?.longitude) ? norm360(raw.longitude) : null;
    const sign = longitude === null ? null : Math.floor(longitude / 30);
    let house = Number(raw?.bhava ?? raw?.house);
    if (!houseValid(house) && signValid(sign) && signValid(lagnaSign)) house = (sign - lagnaSign + 12) % 12 + 1;
    if (!houseValid(house)) house = null;
    planets.set(name, { name, longitude, sign, house, degreeInSign: longitude === null ? null : longitude % 30 });
  }
  return { planets, lagnaLongitude: finite(lagnaLongitude) ? norm360(lagnaLongitude) : null, lagnaSign };
}
function aspectOffsets(planet) { return GRAHA_ASPECTS[planet] || [7]; }
function isAspecting(source, targetHouse) {
  if (!source || !houseValid(source.house) || !houseValid(targetHouse)) return null;
  const distance = (targetHouse - source.house + 12) % 12 + 1;
  return aspectOffsets(source.name).includes(distance);
}
function houseOf(map, name) {
  const value = map.planets.get(name)?.house;
  return houseValid(value) ? value : null;
}
function signOf(map, name) {
  const value = map.planets.get(name)?.sign;
  return signValid(value) ? value : null;
}
function houseLord(map, house) {
  if (!signValid(map.lagnaSign) || !houseValid(house)) return null;
  return SIGN_LORDS[(map.lagnaSign + house - 1) % 12];
}
function isKendra(house) { return inList(house, [1, 4, 7, 10]); }
function planetNature(map, evidence, name) {
  const explicit = evidence?.planetNature?.[name];
  if (explicit === 'benefic' || explicit === 'malefic') return explicit;
  if (['Jupiter', 'Venus'].includes(name)) return 'benefic';
  if (NATURAL_MALEFICS.has(name)) return 'malefic';
  if (name === 'Moon') {
    const moon = map.planets.get('Moon')?.longitude, sun = map.planets.get('Sun')?.longitude;
    if (!finite(moon) || !finite(sun)) return null;
    return norm360(moon - sun) < 180 ? 'benefic' : 'malefic';
  }
  if (name === 'Mercury') {
    const mercury = map.planets.get('Mercury');
    if (!mercury || mercury.sign === null) return null;
    const afflicted = [...NATURAL_MALEFICS].some(malefic => map.planets.get(malefic)?.sign === mercury.sign);
    return afflicted ? 'malefic' : 'benefic';
  }
  return null;
}
function aspectState(map, evidence, targetName) {
  const target = map.planets.get(targetName);
  if (!target || !houseValid(target.house)) return { any: null, benefic: null, malefic: null };
  let any = false, benefic = false, malefic = false, unknownNature = false;
  for (const [name, source] of map.planets.entries()) {
    if (name === targetName || !houseValid(source.house)) continue;
    if (isAspecting(source, target.house) !== true) continue;
    any = true;
    const nature = planetNature(map, evidence, name);
    if (nature === 'benefic') benefic = true;
    else if (nature === 'malefic') malefic = true;
    else unknownNature = true;
  }
  const coreComplete = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    .every(name => map.planets.has(name) && houseValid(map.planets.get(name).house));
  return {
    any: any ? true : (coreComplete ? false : null),
    benefic: benefic ? true : (unknownNature || !coreComplete ? null : false),
    malefic: malefic ? true : (unknownNature || !coreComplete ? null : false)
  };
}
function conjunctionState(map, planetName, className = 'malefic', evidence = {}) {
  const subject = map.planets.get(planetName);
  if (!subject || !houseValid(subject.house)) return null;
  let unknown = false;
  for (const [name, candidate] of map.planets.entries()) {
    if (name === planetName || !houseValid(candidate.house) || candidate.house !== subject.house) continue;
    const nature = planetNature(map, evidence, name);
    if (className === 'malefic' && nature === 'malefic') return true;
    if (className === 'benefic' && nature === 'benefic') return true;
    if (!nature) unknown = true;
  }
  return unknown || !map.planets.has('Rahu') || !map.planets.has('Ketu') ? null : false;
}
function maleficInHouse(map, house) {
  if (!houseValid(house)) return null;
  for (const name of ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']) {
    if (map.planets.get(name)?.house === house) return true;
  }
  const visible = ['Sun', 'Mars', 'Saturn'].every(name => map.planets.has(name) &&
    houseValid(map.planets.get(name).house));
  const nodes = ['Rahu', 'Ketu'].every(name => map.planets.has(name) &&
    houseValid(map.planets.get(name).house));
  return visible && nodes ? false : null;
}
function maleficInAnyKendra(map) {
  return triAny(...[1, 4, 7, 10].map(house => maleficInHouse(map, house)));
}

// Return true when a known benefic occupies a Kendra, false only when all
// seven classical grahas are present and their nature/house evidence proves
// no benefic occupies houses 1, 4, 7 or 10. Partial charts stay UNKNOWN.
function beneficInAnyKendra(map, evidence) {
  let unknownNatureInKendra = false;
  for (const [name, planet] of map.planets.entries()) {
    if (!isKendra(planet.house)) continue;
    const nature = planetNature(map, evidence, name);
    if (nature === 'benefic') return true;
    if (nature === null) unknownNatureInKendra = true;
  }
  const coreComplete = [
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'
  ].every(name => map.planets.has(name) && houseValid(map.planets.get(name).house));
  return unknownNatureInKendra || !coreComplete ? null : false;
}
function isMoonMrityubhaga(map) {
  const moon = map.planets.get('Moon');
  if (!moon || moon.sign === null || moon.degreeInSign === null) return null;
  return Math.floor(moon.degreeInSign) === MRITYUBHAGA_DEGREE[moon.sign];
}
function isExalted(name, sign) { return signValid(sign) && EXALTATION_SIGN[name] === sign; }
function namedSet(value) {
  if (Array.isArray(value)) return new Set(value.map(keyName));
  if (value && typeof value === 'object') return new Set(Object.entries(value)
    .filter(([, enabled]) => enabled === true).map(([name]) => keyName(name)));
  return new Set();
}
function strengthFlag(evidence, name, type) {
  const data = type === 'strong' ? evidence?.strongPlanets : evidence?.weakPlanets;
  if (Array.isArray(data)) return data.map(keyName).includes(name);
  if (data && typeof data === 'object') {
    const alias = Object.keys(PLANET_ALIASES).find(key => PLANET_ALIASES[key] === name);
    return tri(data[name] ?? data[alias]);
  }
  if (type === 'strong' && name === 'LagnaLord') return tri(evidence?.strongLagnaLord);
  if (type === 'weak' && name === 'LagnaLord') return tri(evidence?.weakLagnaLord);
  return null;
}
function makeRule(id, category, title, matched) {
  const value = tri(matched);
  return Object.freeze({ id, category, title,
    status: value === true ? 'MATCHED' : value === false ? 'NOT_MATCHED' : 'UNKNOWN' });
}

/**
 * Full rule inventory from the visually checked Chapter XIV scan.
 * The implementation below evaluates only a subset; missing evaluators are
 * returned as UNKNOWN rather than omitted or silently treated as false.
 */
const CHAPTER_XIV_RULE_GROUPS = Object.freeze([
  {
    prefix: 'XIV-BAL-', category: 'Balarishta',
    pageFor: n => n <= 9 ? 64 : n <= 24 ? 65 : 66,
    descriptions: [
      'Malefics in the final Navamsa of a sign.',
      'Moon in a Kendra with malefics.',
      'Moon in houses 7, 8 or 12 with malefics and without benefic aspect.',
      'Birth near sunrise/sunset with Moon rising and malefics in malefic-sign Navamsas.',
      'Malefics in houses 2, 6, 8 and 12.',
      'Weak Moon in Ascendant or 8th with malefics in Kendras.',
      'Moon in Ascendant, Mars in 8th, Sun in 9th and Saturn in 12th.',
      'Weak Moon in Ascendant; houses 5, 8 and 12 aspected by evil planets.',
      'Moon in 8th, Mars in 7th, Rahu in 9th and Jupiter in 3rd.',
      'Birth Dasa lord in conjunction with many evil planets.',
      'Sun rising with malefics in Kendras/Trikonas and Venus in house 6 or 12.',
      'Ascendant lord or 5th/9th lords in the stated enemy-house and 8th/9th combinations.',
      'Ketu in 4th with or aspected by malefics.',
      'Rahu in 7th aspected by Sun and Moon.',
      'Birth Dasa/Antardasa relationship involving 8th lord and Ascendant lord.',
      'Ascendant lord, Navamsa-Lagna lord and Moon-sign lord conjunct Sun.',
      'Ascendant and 8th from Moon-sign aspected by malefics.',
      'Moon in 8th, Mars in 7th and Saturn in Ascendant.',
      'Moon aspected by Saturn in its third Drishti.',
      'Moon in 6th or 8th without planetary aspects.',
      'Moon in Ascendant with malefics and without benefic aspect.',
      'Moon and Rahu in Ascendant with Mars in 8th.',
      'Sun in Ascendant with Saturn, and Rahu/Mars in 8th.',
      'Malefics in houses 5, 8, 9; Sun or Moon in Ascendant without benefic protection.',
      'Saturn 12th, Sun 9th, Moon Ascendant and Mars 8th, without Jupiter aspect; printed cancellation noted.',
      'Saturn and Mars in Ascendant, 8th or 7th without good-planet aspect.',
      'Moon at listed Mrityubhaga degree in a Kendra or 8th.',
      'Ascendant lord or Moon-sign lord weak and badly placed.',
      'Moon in 6th/8th receiving both malefic and benefic aspects.',
      'Moon in 6th/8th receiving benefic aspect alone.'
    ]
  },
  {
    prefix: 'XIV-ANT-', category: 'Antidote',
    pageFor: n => n <= 2 ? 66 : 67,
    descriptions: [
      'Powerful Jupiter in Ascendant removes Balarishta.',
      'Powerful Lagna lord with benefic aspects.',
      'Moon in 8th occupies Drekkana of Mercury, Jupiter or Venus.',
      'Full Moon in benefic sign with good aspects.',
      'Strong Mercury, Venus or Jupiter.',
      'Moon in 6th occupies Drekkana of Jupiter, Venus or Mercury.',
      'Full Moon between two benefics.',
      'Protection for a child born during the night of Full-Moon days under the stated Moon condition.',
      'Full Moon aspects Lagna while Jupiter is in a Kendra.',
      'Malefics in benefic Shadvargas aspected by benefics in auspicious Navamsas.'
    ]
  },
  {
    prefix: 'XIV-ALP-', category: 'Alpayu',
    pageFor: n => n <= 6 ? 69 : 70,
    descriptions: [
      'Saturn in 8th, Mars in 5th and Ketu in Ascendant.',
      'Malefics in houses 6, 8 and 12.',
      'Saturn in Ascendant; Sun, Moon and Mars in 7th.',
      '8th lord in Ascendant with Ketu.',
      'Malefics in Ascendant with Moon conjunct evil planets.',
      '8th lord in Ascendant with powerless Lagna lord.',
      'Scorpio Lagna with Sun and Jupiter there, and 8th lord in a Kendra.',
      'Rahu in 7th, Moon in 8th and Jupiter in Ascendant.',
      'Saturn in Ascendant owned by malefics, with benefics in houses 3, 6, 9 and 12.',
      'Lagna and 8th lords join in 8th with malefics and without benefic aspect.',
      'Evil planets in houses 1, 2 and 8 with benefics outside Kendras.',
      'Birth lord weak and 8th lord in a Kendra.',
      'Lagna and 8th lords in the stated quadrants/8th-house combination with no planets in Kendras.',
      'Strong malefics in Kendras without benefic aspects.',
      'Lagna and Moon both in common signs.'
    ]
  },
  {
    prefix: 'XIV-MAD-', category: 'Madhyayu',
    pageFor: n => n <= 4 ? 70 : 71,
    descriptions: [
      '3rd or 6th lord in a Kendra.',
      'At least two of the 8th, 11th, Lagna and 10th lords powerful.',
      'Mercury, Jupiter and Venus in houses 2, 3 and 11 from Lagna.',
      'All planets in the middle four houses from Lagna.',
      'Sun in enemy sign in Ascendant, between malefics, powerless and without benefic aspect.',
      'Birth lord in 6th or 8th with malefics and no benefic aspect.',
      'Saturn at birth, Moon in 8th/12th and other planets in 11th.',
      'Scorpio Lagna with Jupiter in Lagna and Mars/Rahu in 8th.',
      '8th lord in 7th with afflicted Moon.',
      'Jupiter in 8th with Aries Lagna and evil planets in Kendras.',
      'Saturn at birth, Moon in 4th, Mars 7th, Rahu 10th and Jupiter/Venus/Mercury unfavourably placed.',
      'Mars and Mercury in Kendras, Venus in Ascendant and exalted planets in 3rd/11th.',
      'Benefics in Kendras without aspecting birth; birth lord aspected by evil planets.',
      'Mars in 5th, Sun in 7th and Saturn debilitated.',
      'Benefics in Kendras/Trikonas with powerful Saturn.'
    ]
  },
  {
    prefix: 'XIV-PUR-', category: 'Purnayu',
    pageFor: n => n <= 2 ? 71 : 72,
    descriptions: [
      'Lagna aspected by its lord, 8th house by its lord and Jupiter in a Kendra.',
      'First six houses occupied by benefics and last six by malefics.',
      'Jupiter in a Kendra from birth lord, with no malefics in Kendras.',
      'Cancer Lagna with Jupiter there and one or more exalted planets.',
      'Birth lord and Sun in 10th, Saturn in Ascendant and Jupiter in 4th.',
      'Jupiter in Lagna, Venus in 4th and Saturn/Moon in 10th.'
    ]
  }
]);

export const BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY = Object.freeze(
  CHAPTER_XIV_RULE_GROUPS.flatMap(group => group.descriptions.map((description, index) => {
    const number = index + 1;
    return Object.freeze({
      id: group.prefix + String(number).padStart(2, '0'),
      category: group.category,
      sourceRuleNumber: number,
      sourcePrintedPage: group.pageFor(number),
      sourceDescription: description
    });
  }))
);

/**
 * Selected Chapter XIV rule evidence. It does not implement every combination
 * in the chapter and it does not select a life-span category.
 */
export function bvRamanChapterXIVLongevityRules({ chart, evidence = {} } = {}) {
  const map = normalizeChart(chart), e = evidence || {};
  const isStrong = name => strengthFlag(e, name, 'strong');
  const isWeak = name => strengthFlag(e, name, 'weak');
  const moon = map.planets.get('Moon');
  const moonHouse = houseOf(map, 'Moon');
  const moonAspect = aspectState(map, e, 'Moon');
  // Printed p. 64 says "Moon in a Kendra with malefics"; evaluate same-house co-occupancy separately from aspects.
  const moonWithMalefics = conjunctionState(map, 'Moon', 'malefic', e);
  const maleficKendra = maleficInAnyKendra(map);
  const beneficKendra = beneficInAnyKendra(map, e);
  const maleficsInAll = houses => triAll(...houses.map(house => maleficInHouse(map, house)));
  const lagnaLord = houseLord(map, 1), eighthLord = houseLord(map, 8);
  const thirdLord = houseLord(map, 3), sixthLord = houseLord(map, 6);
  const tenthLord = houseLord(map, 10), eleventhLord = houseLord(map, 11);
  const lagnaLordHouse = lagnaLord ? houseOf(map, lagnaLord) : null;
  const eighthLordHouse = eighthLord ? houseOf(map, eighthLord) : null;
  const thirdLordHouse = thirdLord ? houseOf(map, thirdLord) : null;
  const sixthLordHouse = sixthLord ? houseOf(map, sixthLord) : null;
  const jupiterHouse = houseOf(map, 'Jupiter');
  const exaltedPlanetInHouse = house => {
    let found = false;
    for (const [name, planet] of map.planets.entries()) {
      if (planet.house === house && isExalted(name, planet.sign)) found = true;
    }
    if (found) return true;
    const classicalChartComplete = [
      'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'
    ].every(name => {
      const planet = map.planets.get(name);
      return planet && houseValid(planet.house) && signValid(planet.sign);
    });
    return classicalChartComplete ? false : null;
  };
  const rules = [];
  const noBeneficMoonAspect = moonAspect.benefic === false ? true :
    moonAspect.benefic === true ? false : null;
  const noMoonAspect = moonAspect.any === false ? true : moonAspect.any === true ? false : null;
  const noMaleficMoonAspect = moonAspect.malefic === false ? true : moonAspect.malefic === true ? false : null;

  const maleficsLastNavamsa = (() => {
    let found = false;
    for (const name of ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']) {
      const p = map.planets.get(name);
      if (p?.degreeInSign !== null && p?.degreeInSign >= 26 + 40 / 60) found = true;
    }
    if (found) return true;
    return ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].every(name => {
      const p = map.planets.get(name);
      return p && finite(p.longitude);
    }) ? false : null;
  })();
  rules.push(makeRule('XIV-BAL-01', 'Balarishta', 'Malefic in the final Navamsa', maleficsLastNavamsa));
  rules.push(makeRule('XIV-BAL-02', 'Balarishta',
    'Moon in a Kendra with malefics (same-house co-occupancy)',
    triAll(isKendra(moonHouse), moonWithMalefics)));
  rules.push(makeRule('XIV-BAL-03', 'Balarishta',
    'Moon in house 7, 8 or 12 with malefics and no benefic aspect (same-house co-occupancy)',
    triAll(inList(moonHouse, [7, 8, 12]), moonWithMalefics, noBeneficMoonAspect)));
  rules.push(makeRule('XIV-BAL-05', 'Balarishta', 'Malefics occupy each of houses 2, 6, 8 and 12',
    maleficsInAll([2, 6, 8, 12])));
  rules.push(makeRule('XIV-BAL-06', 'Balarishta',
    'Weak Moon in house 1 or 8, with malefics in Kendras',
    triAll(isWeak('Moon'), inList(moonHouse, [1, 8]), maleficKendra)));
  rules.push(makeRule('XIV-BAL-07', 'Balarishta', 'Moon in Ascendant, Mars in 8th, Sun in 9th and Saturn in 12th',
    triAll(moonHouse === null ? null : moonHouse === 1,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 8,
      houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 9,
      houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 12)));
  rules.push(makeRule('XIV-BAL-08', 'Balarishta', 'Weak Moon in Ascendant with malefic aspects to houses 5, 8 and 12',
    triAll(isWeak('Moon'), moonHouse === null ? null : moonHouse === 1,
      tri(e.maleficsAspectingHouses5_8_12))));
  rules.push(makeRule('XIV-BAL-09', 'Balarishta',
    'Moon 8, Mars 7, Rahu 9 and Jupiter 3',
    triAll(moonHouse === null ? null : moonHouse === 8,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 7,
      houseOf(map, 'Rahu') === null ? null : houseOf(map, 'Rahu') === 9,
      houseOf(map, 'Jupiter') === null ? null : houseOf(map, 'Jupiter') === 3)));
  rules.push(makeRule('XIV-BAL-13', 'Balarishta', 'Ketu in house 4 with or aspected by malefics',
    triAll(houseOf(map, 'Ketu') === null ? null : houseOf(map, 'Ketu') === 4,
      triAny(conjunctionState(map, 'Ketu', 'malefic', e),
        aspectState(map, e, 'Ketu').malefic))));
  const rahuHouseForBal14 = houseOf(map, 'Rahu');
  rules.push(makeRule('XIV-BAL-14', 'Balarishta', 'Rahu in 7th aspected by both Sun and Moon',
    triAll(rahuHouseForBal14 === null ? null : rahuHouseForBal14 === 7,
      isAspecting(map.planets.get('Sun'), rahuHouseForBal14),
      isAspecting(map.planets.get('Moon'), rahuHouseForBal14))));
  rules.push(makeRule('XIV-BAL-18', 'Balarishta', 'Moon in 8th, Mars in 7th and Saturn in Ascendant',
    triAll(moonHouse === null ? null : moonHouse === 8,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 7,
      houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 1)));
  const saturn = map.planets.get('Saturn');
  const saturnThirdMoon = saturn && moon && houseValid(saturn.house) && houseValid(moon.house)
    ? ((moon.house - saturn.house + 12) % 12 + 1) === 3 : null;
  rules.push(makeRule('XIV-BAL-19', 'Balarishta', 'Saturn casts its third aspect on the Moon', saturnThirdMoon));
  rules.push(makeRule('XIV-BAL-20', 'Balarishta', 'Moon in house 6 or 8 without planetary aspects',
    triAll(inList(moonHouse, [6, 8]), noMoonAspect)));
  rules.push(makeRule('XIV-BAL-21', 'Balarishta', 'Moon in Ascendant with malefics and without benefic aspect',
    triAll(moonHouse === null ? null : moonHouse === 1, moonWithMalefics, noBeneficMoonAspect)));
  rules.push(makeRule('XIV-BAL-22', 'Balarishta', 'Moon in Ascendant, Rahu and Mars in 8th',
    triAll(moonHouse === null ? null : moonHouse === 1,
      houseOf(map, 'Rahu') === null ? null : houseOf(map, 'Rahu') === 8,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 8)));
  rules.push(makeRule('XIV-BAL-23', 'Balarishta', 'Sun and Saturn in Ascendant; Rahu and Mars in 8th',
    triAll(houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 1,
      houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 1,
      houseOf(map, 'Rahu') === null ? null : houseOf(map, 'Rahu') === 8,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 8)));
  const noBeneficProtection = name => {
    const conjunction = conjunctionState(map, name, 'benefic', e);
    const aspect = aspectState(map, e, name).benefic;
    return triAll(conjunction === null ? null : !conjunction,
      aspect === null ? null : !aspect);
  };
  rules.push(makeRule('XIV-BAL-24', 'Balarishta',
    'Malefics in houses 5, 8 and 9; Sun or Moon in Ascendant without benefic protection',
    triAll(maleficsInAll([5, 8, 9]), triAny(
      triAll(houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 1,
        noBeneficProtection('Sun')),
      triAll(moonHouse === null ? null : moonHouse === 1,
        noBeneficProtection('Moon'))))));
  rules.push(makeRule('XIV-BAL-27', 'Balarishta', 'Moon at a Mrityubhaga degree in a Kendra or house 8',
    triAll(isMoonMrityubhaga(map), inList(moonHouse, [1, 4, 7, 10, 8]))));
  rules.push(makeRule('XIV-BAL-29', 'Balarishta', 'Moon in 6th or 8th with both malefic and benefic aspects',
    triAll(inList(moonHouse, [6, 8]), moonAspect.malefic, moonAspect.benefic)));
  rules.push(makeRule('XIV-BAL-30', 'Balarishta', 'Moon in 6th or 8th with benefic aspect alone',
    triAll(inList(moonHouse, [6, 8]), noMaleficMoonAspect, moonAspect.benefic)));

  // Antidotes are a separate evidence list; a matched affliction is never auto-final.
  rules.push(makeRule('XIV-ANT-01', 'Antidote', 'Strong Jupiter in the Ascendant',
    triAll(jupiterHouse === null ? null : jupiterHouse === 1, isStrong('Jupiter'))));
  const lagnaLordBeneficAspect = lagnaLord ? aspectState(map, e, lagnaLord).benefic : null;
  rules.push(makeRule('XIV-ANT-02', 'Antidote', 'Strong Lagna lord with benefic aspect',
    triAll(isStrong(lagnaLord || 'LagnaLord'), lagnaLordBeneficAspect)));
  rules.push(makeRule('XIV-ANT-03', 'Antidote', 'Moon in house 8 in a benefic Drekkana',
    triAll(moonHouse === null ? null : moonHouse === 8, tri(e.moonDrekkanaBenefic))));
  rules.push(makeRule('XIV-ANT-04', 'Antidote', 'Full Moon in a benefic sign with favourable aspects',
    tri(e.fullMoonInBeneficSignAndWellAspected)));
  rules.push(makeRule('XIV-ANT-05', 'Antidote', 'Strong Mercury, Venus or Jupiter',
    triAny(isStrong('Mercury'), isStrong('Venus'), isStrong('Jupiter'))));
  rules.push(makeRule('XIV-ANT-06', 'Antidote', 'Moon in house 6 in a benefic Drekkana',
    triAll(moonHouse === null ? null : moonHouse === 6, tri(e.moonDrekkanaBenefic))));
  rules.push(makeRule('XIV-ANT-07', 'Antidote', 'Full Moon enclosed by benefics',
    tri(e.fullMoonBetweenBenefics)));
  rules.push(makeRule('XIV-ANT-08', 'Antidote', 'Moon in house 6 or 8 with birth on the night of a Full Moon',
    triAll(inList(moonHouse, [6, 8]), tri(e.bornOnNightOfFullMoon))));
  rules.push(makeRule('XIV-ANT-09', 'Antidote', 'Full Moon aspects Lagna and Jupiter is in a Kendra',
    triAll(tri(e.fullMoonAspectsLagna), isKendra(jupiterHouse))));
  rules.push(makeRule('XIV-ANT-10', 'Antidote', 'Benefic Shadvarga protection for malefics',
    tri(e.maleficsInBeneficShadvargasWithBeneficAspect)));

  // Alpayu: selected configurations from the source chapter only.
  rules.push(makeRule('XIV-ALP-01', 'Alpayu', 'Saturn 8, Mars 5 and Ketu 1',
    triAll(houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 8,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 5,
      houseOf(map, 'Ketu') === null ? null : houseOf(map, 'Ketu') === 1)));
  rules.push(makeRule('XIV-ALP-02', 'Alpayu', 'Malefic influence across houses 6, 8 and 12',
    triAll(...[6, 8, 12].map(house => maleficInHouse(map, house)))));
  rules.push(makeRule('XIV-ALP-03', 'Alpayu', 'Saturn 1; Sun, Moon and Mars 7',
    triAll(houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 1,
      houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 7,
      houseOf(map, 'Moon') === null ? null : houseOf(map, 'Moon') === 7,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 7)));
  const moonSign = signOf(map, 'Moon');
  const lagnaKind = signValid(map.lagnaSign) ? SIGN_KIND[map.lagnaSign] : null;
  const moonKind = signValid(moonSign) ? SIGN_KIND[moonSign] : null;
  rules.push(makeRule('XIV-ALP-15', 'Alpayu', 'Lagna and Moon are both in common signs',
    triAll(lagnaKind === null ? null : lagnaKind === 'common',
      moonKind === null ? null : moonKind === 'common')));
  const lagnaLordStrong = isStrong(lagnaLord || 'LagnaLord');
  const lagnaLordWeak = isWeak(lagnaLord || 'LagnaLord');
  rules.push(makeRule('XIV-ALP-04', 'Alpayu',
    '8th lord in Ascendant with Ketu',
    triAll(eighthLordHouse === null ? null : eighthLordHouse === 1,
      houseOf(map, 'Ketu') === null ? null : houseOf(map, 'Ketu') === 1)));
  rules.push(makeRule('XIV-ALP-05', 'Alpayu',
    'Malefics in Ascendant with Moon conjunct malefics',
    triAll(maleficInHouse(map, 1), conjunctionState(map, 'Moon', 'malefic', e))));
  rules.push(makeRule('XIV-ALP-06', 'Alpayu',
    '8th lord in Ascendant with powerless Lagna lord',
    triAll(eighthLordHouse === null ? null : eighthLordHouse === 1, lagnaLordWeak)));
  rules.push(makeRule('XIV-ALP-07', 'Alpayu',
    'Scorpio Lagna; Sun and Jupiter in Lagna; 8th lord in a Kendra',
    triAll(map.lagnaSign === null ? null : map.lagnaSign === 7,
      houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 1,
      jupiterHouse === null ? null : jupiterHouse === 1,
      isKendra(eighthLordHouse))));
  rules.push(makeRule('XIV-ALP-08', 'Alpayu',
    'Rahu in 7th, Moon in 8th, Jupiter in Ascendant',
    triAll(houseOf(map, 'Rahu') === null ? null : houseOf(map, 'Rahu') === 7,
      moonHouse === null ? null : moonHouse === 8,
      jupiterHouse === null ? null : jupiterHouse === 1)));
  rules.push(makeRule('XIV-ALP-11', 'Alpayu',
    'Malefics in houses 1, 2 and 8; benefics outside Kendras',
    triAll(maleficsInAll([1, 2, 8]),
      beneficKendra === null ? null : beneficKendra === false)));
  rules.push(makeRule('XIV-ALP-14', 'Alpayu',
    'Strong malefics in Kendras without benefic aspects',
    tri(e.strongMaleficsInKendrasWithoutBeneficAspects)));
  rules.push(makeRule('XIV-ALP-12', 'Alpayu', 'Weak Lagna lord with eighth lord in a Kendra',
    triAll(lagnaLordWeak, isKendra(eighthLordHouse))));

  // Printed pp. 70–71 list these as distinct combinations: never AND separate rules together.
  rules.push(makeRule('XIV-MAD-01', 'Madhyayu',
    'Third or sixth lord in a Kendra',
    triAny(isKendra(thirdLordHouse), isKendra(sixthLordHouse))));
  const relevantLords = [eighthLord, eleventhLord, lagnaLord, tenthLord];
  const strongCount = relevantLords.filter(name => name && isStrong(name) === true).length;
  const strengthUnknown = relevantLords.some(name => !name || isStrong(name) === null);
  const strengthTwo = strongCount >= 2 ? true : (strengthUnknown ? null : false);
  rules.push(makeRule('XIV-MAD-02', 'Madhyayu',
    'At least two of the 8th, 11th, Lagna and 10th lords are powerful',
    strengthTwo));
  rules.push(makeRule('XIV-MAD-03', 'Madhyayu',
    'Mercury, Jupiter and Venus in houses 2, 3 and 11 from Lagna',
    tri(e.mercuryJupiterVenusInSecondThirdEleventh)));
  rules.push(makeRule('XIV-MAD-04', 'Madhyayu',
    'All planets occupy the middle four houses from Lagna',
    tri(e.allPlanetsMiddleFourHouses)));
  rules.push(makeRule('XIV-MAD-08', 'Madhyayu',
    'Scorpio Lagna with Jupiter in Lagna and Mars/Rahu in 8th',
    triAll(map.lagnaSign === null ? null : map.lagnaSign === 7,
      jupiterHouse === null ? null : jupiterHouse === 1,
      houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 8,
      houseOf(map, 'Rahu') === null ? null : houseOf(map, 'Rahu') === 8)));
  rules.push(makeRule('XIV-MAD-10', 'Madhyayu',
    'Jupiter in 8th with Aries Lagna and malefics in Kendras',
    triAll(map.lagnaSign === null ? null : map.lagnaSign === 0,
      jupiterHouse === null ? null : jupiterHouse === 8, maleficKendra)));
  rules.push(makeRule('XIV-MAD-12', 'Madhyayu',
    'Mars and Mercury in Kendras, Venus in Ascendant and exalted planets in 3rd/11th',
    triAll(isKendra(houseOf(map, 'Mars')), isKendra(houseOf(map, 'Mercury')),
      houseOf(map, 'Venus') === null ? null : houseOf(map, 'Venus') === 1,
      exaltedPlanetInHouse(3), exaltedPlanetInHouse(11)));
  rules.push(makeRule('XIV-MAD-14', 'Madhyayu',
    'Mars in 5th, Sun in 7th and Saturn debilitated',
    triAll(houseOf(map, 'Mars') === null ? null : houseOf(map, 'Mars') === 5,
      houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 7,
      signOf(map, 'Saturn') === null ? null :
        signOf(map, 'Saturn') === DEBILITATION_SIGN.Saturn)));
  rules.push(makeRule('XIV-MAD-15', 'Madhyayu',
    'Benefics in Kendras/Trikonas with strong Saturn',
    triAll(tri(e.beneficsInKendrasAndTrikonas), isStrong('Saturn'))));

  // Purnayu: selected configurations; strength and special conditions remain explicit inputs.
  const lagnaAspect = lagnaLord ? isAspecting(map.planets.get(lagnaLord), 1) : null;
  const eighthAspect = eighthLord ? isAspecting(map.planets.get(eighthLord), 8) : null;
  rules.push(makeRule('XIV-PUR-01', 'Purnayu',
    'Lagna aspected by its lord, eighth by its lord, Jupiter in a Kendra',
    triAll(lagnaAspect, eighthAspect, isKendra(jupiterHouse))));
  rules.push(makeRule('XIV-PUR-02', 'Purnayu',
    'Benefics in first six houses and malefics in last six',
    tri(e.beneficsFirstSixMaleficsLastSix)));
  const relativeJupiterHouse = (() => {
    const lordHouse = lagnaLord ? houseOf(map, lagnaLord) : null;
    if (!houseValid(lordHouse) || !houseValid(jupiterHouse)) return null;
    return (jupiterHouse - lordHouse + 12) % 12 + 1;
  })();
  rules.push(makeRule('XIV-PUR-03', 'Purnayu',
    'Jupiter in a Kendra from Lagna lord with no malefics in Kendras',
    triAll(isKendra(relativeJupiterHouse), maleficKendra === null ? null : maleficKendra === false)));
  const anyKnownExalted = [...map.planets.entries()].some(([name, p]) => isExalted(name, p.sign));
  const fullSevenSignsKnown = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    .every(name => signValid(signOf(map, name)));
  const anyExalted = anyKnownExalted ? true : (fullSevenSignsKnown ? false : null);
  rules.push(makeRule('XIV-PUR-04', 'Purnayu', 'Cancer Lagna, Jupiter in Lagna and an exalted planet',
    triAll(map.lagnaSign === null ? null : map.lagnaSign === 3,
      jupiterHouse === null ? null : jupiterHouse === 1, anyExalted)));
  rules.push(makeRule('XIV-PUR-05', 'Purnayu', 'Lagna lord and Sun 10, Saturn 1, Jupiter 4',
    triAll(lagnaLordHouse === null ? null : lagnaLordHouse === 10,
      houseOf(map, 'Sun') === null ? null : houseOf(map, 'Sun') === 10,
      houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 1,
      jupiterHouse === null ? null : jupiterHouse === 4)));
  rules.push(makeRule('XIV-PUR-06', 'Purnayu', 'Jupiter 1, Venus 4, Saturn and Moon 10',
    triAll(jupiterHouse === null ? null : jupiterHouse === 1,
      houseOf(map, 'Venus') === null ? null : houseOf(map, 'Venus') === 4,
      houseOf(map, 'Saturn') === null ? null : houseOf(map, 'Saturn') === 10,
      moonHouse === null ? null : moonHouse === 10)));

  const implementedById = new Map(rules.map(rule => [rule.id, rule]));
  const completeRuleSet = BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY.map(sourceRule => {
    const observed = implementedById.get(sourceRule.id);
    if (observed) {
      return Object.freeze({
        ...observed,
        sourceRuleNumber: sourceRule.sourceRuleNumber,
        sourcePrintedPage: sourceRule.sourcePrintedPage,
        sourceDescription: sourceRule.sourceDescription,
        implemented: true
      });
    }
    return Object.freeze({
      id: sourceRule.id,
      category: sourceRule.category,
      title: sourceRule.sourceDescription,
      sourceRuleNumber: sourceRule.sourceRuleNumber,
      sourcePrintedPage: sourceRule.sourcePrintedPage,
      sourceDescription: sourceRule.sourceDescription,
      status: 'UNKNOWN',
      implemented: false,
      note: 'Source rule indexed; its evaluator has not yet been implemented.'
    });
  });
  const categories = ['Balarishta', 'Alpayu', 'Madhyayu', 'Purnayu'];
  const allCategories = [...categories, 'Antidote'];
  const categoryCandidates = categories.filter(category =>
    completeRuleSet.some(rule => rule.category === category && rule.status === 'MATCHED'));
  const matchedAntidotes = completeRuleSet.filter(rule => rule.category === 'Antidote' && rule.status === 'MATCHED')
    .map(rule => rule.id);
  const ruleCoverageCounts = Object.freeze(Object.fromEntries(allCategories.map(category => {
    const group = completeRuleSet.filter(rule => rule.category === category);
    return [category, Object.freeze({
      sourceRules: group.length,
      implemented: group.filter(rule => rule.implemented).length,
      notImplemented: group.filter(rule => !rule.implemented).length,
      matched: group.filter(rule => rule.status === 'MATCHED').length,
      unknown: group.filter(rule => rule.status === 'UNKNOWN').length
    })];
  })));
  return Object.freeze({
    source: BV_RAMAN_HPA_CHAPTER_XIV_SOURCE,
    status: 'RESEARCH_ONLY_PARTIAL_RULE_COVERAGE',
    ruleCoverage: 'all source-numbered rules are indexed; unevaluated rules are explicitly UNKNOWN',
    ruleCoverageCounts,
    unimplementedRuleIds: Object.freeze(completeRuleSet.filter(rule => !rule.implemented).map(rule => rule.id)),
    categoryCandidates: Object.freeze(categoryCandidates),
    matchedRuleIds: Object.freeze(completeRuleSet.filter(rule => rule.status === 'MATCHED').map(rule => rule.id)),
    unknownRuleIds: Object.freeze(completeRuleSet.filter(rule => rule.status === 'UNKNOWN').map(rule => rule.id)),
    matchedAntidotes: Object.freeze(matchedAntidotes),
    rules: Object.freeze(completeRuleSet),
    selectedCategory: null,
    finalLifespan: null,
    certified: false,
    customerDisplayAllowed: false,
    blockers: Object.freeze([
      'Only selected Chapter XIV rules are implemented; this is not the complete chapter.',
      'Strength, Drekkana and special full-Moon facts require source-checked inputs; provisional Shadbala alone is not treated as certified.',
      'Matched combinations and antidotes remain separate evidence. No category is selected automatically.',
      'Selected rules have been compared with scan images on printed pp. 63–72; the full Chapter XIV rule list and every cancellation remain outside this partial engine.'
    ])
  });
}

/**
 * Chapter XXVI: select the single largest Harana, never stack several losses.
 * Every rule input must be explicitly true or false; unknown facts block the
 * adjusted term rather than being silently treated as absent.
 */
export function bvRamanHpaChapterXXVIApplyHarana({ grossLunarYears, factors, planet } = {}) {
  if (!finite(grossLunarYears) || grossLunarYears < 0) {
    throw new RangeError('grossLunarYears must be finite and non-negative');
  }
  const haranaPlanet = keyName(planet);
  if (!BV_RAMAN_AYURDAYA_PLANETS.includes(haranaPlanet)) {
    throw new TypeError('planet must name one of the seven classical planets');
  }
  const resolvedFactors = factors && typeof factors === 'object' ? factors : {};
  const missing = BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES.filter(rule => typeof resolvedFactors[rule.key] !== 'boolean')
    .map(rule => rule.key);
  const invalidFactors = resolvedFactors.eclipsed === true && !['Sun', 'Moon'].includes(haranaPlanet)
    ? ['eclipsed'] : [];
  if (invalidFactors.length) return Object.freeze({
    resolved: false, grossLunarYears, appliedDeductionFraction: null, remainingFraction: null,
    unroundedNetLunarYears: null, roundedNetLunarYears: null, selectedRules: Object.freeze([]),
    missingFactors: Object.freeze(missing), invalidFactors: Object.freeze(invalidFactors),
    source: BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE, certified: false
  });
  if (missing.length) return Object.freeze({
    resolved: false, grossLunarYears, appliedDeductionFraction: null, remainingFraction: null,
    unroundedNetLunarYears: null, roundedNetLunarYears: null, selectedRules: Object.freeze([]),
    missingFactors: Object.freeze(missing), invalidFactors: Object.freeze([]),
    source: BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE, certified: false
  });
  const active = BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES.filter(rule => resolvedFactors[rule.key] === true);
  const largestDeduction = active.reduce((largest, rule) => Math.max(largest, rule.fraction), 0);
  const selectedRules = active.filter(rule => rule.fraction === largestDeduction).map(rule => rule.key);
  const remainingFraction = 1 - largestDeduction;
  const unroundedNetLunarYears = grossLunarYears * remainingFraction;
  const roundedNetLunarYears = Math.round((unroundedNetLunarYears + Number.EPSILON) * 100) / 100;
  return Object.freeze({
    resolved: true, grossLunarYears, appliedDeductionFraction: largestDeduction, remainingFraction,
    unroundedNetLunarYears, roundedNetLunarYears,
    selectedRules: Object.freeze(selectedRules),
    ignoredLesserRules: Object.freeze(active.filter(rule => rule.fraction < largestDeduction).map(rule => rule.key)),
    missingFactors: Object.freeze([]), invalidFactors: Object.freeze([]),
    source: BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE, certified: false
  });
}

function normalizeRows(rows) {
  let objectRows = rows;
  if (Array.isArray(rows)) {
    objectRows = {};
    for (const row of rows) objectRows[keyName(row?.planet ?? row?.name)] =
      row?.bindus ?? row?.values ?? row?.bhinna ?? row?.bindu;
  }
  if (!objectRows || typeof objectRows !== 'object') throw new TypeError('afterReductionRows is required');
  const normalized = {};
  for (const [rawName, rawRow] of Object.entries(objectRows)) {
    const name = keyName(rawName);
    if (!BV_RAMAN_AYURDAYA_PLANETS.includes(name)) continue;
    if (!Array.isArray(rawRow) || rawRow.length !== 12 ||
      rawRow.some(value => !Number.isSafeInteger(value) || value < 0 || value > 8)) {
      throw new TypeError(name + ' reduced BAV row must contain 12 integers from 0 to 8');
    }
    normalized[name] = [...rawRow];
  }
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    if (!normalized[planet]) throw new TypeError('Missing reduced BAV row: ' + planet);
  }
  return normalized;
}
function normalizePlanetSigns(signs) {
  const mapped = mapByEnglishName(signs);
  const result = {};
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    const sign = mapped[planet];
    if (!signValid(sign)) throw new TypeError('Missing/invalid sidereal sign index for ' + planet);
    result[planet] = sign;
  }
  return result;
}

export const BV_RAMAN_HPA_CHAPTER_XXVI_RASI_GUNAKARA = Object.freeze([
  7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12
]);
export const BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA = Object.freeze({
  Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5
});

/** Chapter XXVI per-graha arithmetic with explicit Rasi/Graha products. */
export function bvRamanHpaChapterXXVICompute({
  afterReductionRows, planetSigns, haranaByPlanet = {}
} = {}) {
  const rows = normalizeRows(afterReductionRows);
  const signs = normalizePlanetSigns(planetSigns);
  const rawHarana = mapByEnglishName(haranaByPlanet);
  const planets = {};
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    const row = rows[planet];
    const rasiProducts = row.map((bindu, sign) => bindu * BV_RAMAN_HPA_CHAPTER_XXVI_RASI_GUNAKARA[sign]);
    const rasiPinda = rasiProducts.reduce((sum, value) => sum + value, 0);
    const grahaProducts = BV_RAMAN_AYURDAYA_PLANETS.map(contributor => ({
      planet: contributor, sign: signs[contributor], bindus: row[signs[contributor]],
      multiplier: BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA[contributor],
      product: row[signs[contributor]] * BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA[contributor]
    }));
    const grahaPinda = grahaProducts.reduce((sum, value) => sum + value.product, 0);
    const sodyaPinda = rasiPinda + grahaPinda;
    const unwrappedGrossLunarYears = sodyaPinda * 7 / 27;
    const grossLunarYears = ((unwrappedGrossLunarYears % 27) + 27) % 27;
    const flags = rawHarana[planet];
    const harana = flags
      ? bvRamanHpaChapterXXVIApplyHarana({ grossLunarYears, factors: flags, planet })
      : bvRamanHpaChapterXXVIApplyHarana({ grossLunarYears, factors: {}, planet });
    planets[planet] = Object.freeze({
      planet, rasiProducts: Object.freeze(rasiProducts), rasiPinda,
      grahaProducts: Object.freeze(grahaProducts.map(Object.freeze)),
      grahaPinda, sodyaPinda, unwrappedGrossLunarYears, grossLunarYears, harana
    });
  }
  const allHaranaResolved = BV_RAMAN_AYURDAYA_PLANETS.every(planet => planets[planet].harana.resolved);
  // Keep every graha term at full precision. Rounding belongs to display only,
  // never to the summation or the 334/365 conversion.
  const netLunarYears = allHaranaResolved
    ? BV_RAMAN_AYURDAYA_PLANETS.reduce((sum, planet) =>
      sum + planets[planet].harana.unroundedNetLunarYears, 0)
    : null;
  const netLunarYearsRounded = finite(netLunarYears)
    ? Math.round((netLunarYears + Number.EPSILON) * 100) / 100
    : null;
  const solarYearsCandidate = finite(netLunarYears) ? netLunarYears * 334 / 365 : null;
  const solarYearsCandidateRounded = finite(solarYearsCandidate)
    ? Math.round((solarYearsCandidate + Number.EPSILON) * 100) / 100
    : null;
  return Object.freeze({
    source: BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE,
    method: 'Chapter XXVI — reduced BAV, Rasi/Graha/Sodhya Pinda, Harana, 334/365 conversion',
    planets: Object.freeze(planets),
    netLunarYears,
    netLunarYearsRounded,
    solarYearsCandidate,
    solarYearsCandidateRounded,
    numericBandCandidate: finite(solarYearsCandidate)
      ? solarYearsCandidate < 8 ? 'Balarishta'
        : solarYearsCandidate < 33 ? 'Alpayu'
          : solarYearsCandidate < 75 ? 'Madhyayu'
            : solarYearsCandidate <= 120 ? 'Purnayu' : 'OUTSIDE_0_TO_120'
      : null,
    haranaComplete: allHaranaResolved,
    finalLifespan: null,
    certified: false,
    customerDisplayAllowed: false,
    knownSourceArithmeticDiscrepancy: Object.freeze({
      printedNetLunarYears: 48.98,
      printedSolarYears: 44.87,
      solarYearsFromPrintedNet: 48.98 * 334 / 365,
      solarYearsFromPrintedNetRounded: Math.round((48.98 * 334 / 365 + Number.EPSILON) * 100) / 100,
      formulaNetLunarYearsFromPrintedPindasAndHalfRule: 49,
      formulaSolarYearsFromFullPrecisionNet: 49 * 334 / 365,
      formulaSolarYearsRounded: Math.round((49 * 334 / 365 + Number.EPSILON) * 100) / 100,
      status: 'PRIMARY_SCAN_CONFIRMED_PRINTED_ARITHMETIC_MISMATCH'
    }),
    blockers: Object.freeze([
      'Printed pp. 199–203 have been visually inspected. The printed net total 48.98 and final 44.87 do not match a full-precision Pinda/Harana calculation.',
      'The scanned Pinda pairs give 49.00 lunar years when the printed rule halves all terms except the Sun; converting 49.00 by 334/365 gives 44.84 solar years to two decimals.',
      'The full per-sign reduced-BAV input rows and the exact factor responsible for each half-deduction remain incompletely sourced; this stays research-only.',
      'Final lifespan remains null even when the per-graha Harana inputs are complete.'
    ])
  });
}

function inferPlanetSigns(chart) {
  const map = normalizeChart(chart);
  const signs = {};
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    const sign = signOf(map, planet);
    if (signValid(sign)) signs[planet] = sign;
  }
  return signs;
}
function chartOccupiedSigns(chart) {
  const map = normalizeChart(chart);
  return [...new Set([...map.planets.values()].filter(p => signValid(p.sign)).map(p => p.sign))];
}
function normalizeRawBavRows(rows) {
  if (Array.isArray(rows)) {
    const result = {};
    for (const row of rows) result[keyName(row?.planet ?? row?.name)] =
      row?.bindus ?? row?.values ?? row?.bhinna;
    return result;
  }
  return mapByEnglishName(rows);
}

/**
 * Full join: Chapter XIV evidence + Chapter XXVI reductions/Pinda/Harana.
 * Category and numeric tracks are cross-checked, never averaged. The function
 * is research-only and does not connect the result to customer reports.
 */
export function bvRamanIntegratedAyurdayaResearch({
  chart, evidence = {}, bavRows, occupiedSigns, planetSigns, haranaByPlanet = {}
} = {}) {
  const chapterXIV = bvRamanChapterXIVLongevityRules({ chart, evidence });
  const signs = planetSigns ? mapByEnglishName(planetSigns) : inferPlanetSigns(chart);
  const occupancy = Array.isArray(occupiedSigns) ? occupiedSigns : chartOccupiedSigns(chart);
  let shodhana = null, chapterXXVI = null;
  const blockers = [];
  try {
    const rows = normalizeRawBavRows(bavRows);
    shodhana = bvRamanAshtakavargaShodhana({ bavRows: rows, occupiedSigns: occupancy });
    chapterXXVI = bvRamanHpaChapterXXVICompute({
      afterReductionRows: shodhana.afterReductionRows, planetSigns: signs, haranaByPlanet
    });
  } catch (error) {
    blockers.push('Chapter XXVI calculation is blocked: ' + String(error?.message || error));
  }
  const numericBand = chapterXXVI?.numericBandCandidate ?? null;
  const categories = chapterXIV.categoryCandidates;
  let crossCheckStatus = 'NOT_COMPARABLE_FINAL_WITHHELD';
  if (numericBand && categories.length) {
    crossCheckStatus = categories.includes(numericBand)
      ? 'CANDIDATE_OVERLAP_NOT_VALIDATION'
      : 'CANDIDATE_DISAGREEMENT_REQUIRES_REVIEW';
  } else if (numericBand && !categories.length) {
    crossCheckStatus = 'NO_CHAPTER_XIV_RULE_MATCH_IN_PARTIAL_SUBSET';
  }
  return Object.freeze({
    sourceTracks: Object.freeze({
      chapterXIV: BV_RAMAN_HPA_CHAPTER_XIV_SOURCE,
      chapterXXVI: BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE
    }),
    chapterXIV, shodhana, chapterXXVI,
    crossCheck: Object.freeze({
      chapterXIVCategoryCandidates: categories,
      chapterXXVINumericBandCandidate: numericBand,
      status: crossCheckStatus,
      ruleAndNumberTracksKeptSeparate: true
    }),
    finalLifespan: null,
    finalAgeOrDateOfDeath: null,
    certified: false,
    researchOnly: true,
    customerDisplayAllowed: false,
    blockers: Object.freeze([
      ...blockers,
      'Chapter XIV rule coverage is partial; unmatched rules are not interpreted as absence of risk.',
      'Chapter XXVI page-level arithmetic and all Harana source facts are not fully certified.',
      'The chapters remain separate evidence tracks; no average or override is used.',
      'This research output is not integrated into customer Horoscope or Marriage Matching reports.'
    ])
  });
}

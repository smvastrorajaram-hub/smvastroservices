// SMV CALENDAR — activity-specific Muhurtham helpers.
// Source tradition: Suddha Thirukanitha Sarva Muhurtha Panchangam (marriage rules).
// Vastu timings: Thirukanitha Panchangam's 2026 Tamil Vastu table.
// Pushkara Navamsa: C. S. Patel, Navamsa in Astrology, Chapter IV, pp. 31–33.
//
// This module deliberately does NOT claim a complete marriage-muhurta verdict.
// The primary source's weekday exception and full Panchaka/Lagna-Dhruva table
// still need verification. Use these helpers only for the independent,
// fully specified sub-rules they return.

export const MUHURTHAM_ACTIVITY_SOURCES = Object.freeze({
  marriage: 'https://apsaraepublications.com/e-magz/jothidam/jothidam_sep_2015.pdf',
  vastu: 'https://thirukanithapanchangam.com/vastu-natkal-in-tamil/?t_year=2026',
  pushkara: 'https://storage.yandexcloud.net/j108/library/tpg6o28l/C.S._Patel_-_Navamsa_in_Astrology.pdf'
});

const MONTHS_TA = Object.freeze([
  'சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி',
  'ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'
]);
const MONTHS_EN = Object.freeze([
  'Chithirai','Vaikasi','Aani','Aadi','Avani','Purattasi',
  'Aippasi','Karthigai','Margazhi','Thai','Masi','Panguni'
]);

// The primary marriage article excludes Aadi, Purattasi, Margazhi and Masi.
// General ordinary auspicious work follows the user's Aadi/Margazhi restriction.
// Do not apply either list to Vastu: Vastu has its own narrow calendar.
const MARRIAGE_BLOCKED_MONTHS = Object.freeze([3, 5, 8, 10]);
const GENERAL_BLOCKED_MONTHS = Object.freeze([3, 8]);

// Tamil solar month index -> { Tamil date, sunrise offset in Nazhigai }.
// 1 Nazhigai = 24 minutes. This table is transcribed from the selected
// Thirukanitha Panchangam 2026 local-sunrise Vastu table; it is not a
// Gregorian-date lookup. Other Panchangam editions can differ.
export const VASTU_DAY_RULES = Object.freeze({
  0: Object.freeze({ day: 10, sunriseOffsetNazhigai: 5 }),  // Chithirai
  1: Object.freeze({ day: 21, sunriseOffsetNazhigai: 8 }),  // Vaikasi
  3: Object.freeze({ day: 11, sunriseOffsetNazhigai: 2 }),  // Aadi
  4: Object.freeze({ day: 6, sunriseOffsetNazhigai: 21 }),  // Avani
  6: Object.freeze({ day: 11, sunriseOffsetNazhigai: 2 }),  // Aippasi
  7: Object.freeze({ day: 8, sunriseOffsetNazhigai: 10 }),  // Karthigai
  9: Object.freeze({ day: 12, sunriseOffsetNazhigai: 8 }),  // Thai
  10: Object.freeze({ day: 22, sunriseOffsetNazhigai: 8 }), // Masi
  11: Object.freeze({ day: 22, sunriseOffsetNazhigai: 8 })  // Panguni (2026–27 annual edition)
});
export const VASTU_WAKE_MINUTES = 90;
export const VASTU_PUJA_MINUTES = 36;
export const NAZHIGAI_MINUTES = 24;

function validSolarDate(tamilSolar) {
  const monthIndex = Number(tamilSolar?.index);
  const day = Number(tamilSolar?.day);
  return Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex <= 11 &&
    Number.isInteger(day) && day >= 1 && day <= 32;
}

export function getMuhurthamMonthEligibility({ tamilSolar, activity = 'general' } = {}) {
  if (!validSolarDate(tamilSolar)) {
    return { available: false, eligible: null, activity, reason: 'Tamil solar month/day unavailable' };
  }
  const monthIndex = Number(tamilSolar.index);
  const monthTa = MONTHS_TA[monthIndex];
  const monthEn = MONTHS_EN[monthIndex];
  if (activity === 'marriage' || activity === 'mangalyam') {
    const blocked = MARRIAGE_BLOCKED_MONTHS.includes(monthIndex);
    return {
      available: true, eligible: !blocked, activity, monthIndex, monthTa, monthEn,
      reason: blocked ? 'Marriage month is excluded by the selected 2015 Thirukanitham rule' : 'Marriage month filter passed; other Muhurtham rules are not yet evaluated',
      source: MUHURTHAM_ACTIVITY_SOURCES.marriage
    };
  }
  if (activity === 'general') {
    const blocked = GENERAL_BLOCKED_MONTHS.includes(monthIndex);
    return {
      available: true, eligible: !blocked, activity, monthIndex, monthTa, monthEn,
      reason: blocked ? 'Ordinary auspicious work is generally avoided in Aadi and Margazhi' : 'General month filter passed; other Muhurtham rules are not yet evaluated',
      source: 'User-approved SMV CALENDAR month policy'
    };
  }
  if (activity === 'vastu') {
    const rule = VASTU_DAY_RULES[monthIndex];
    return {
      available: true,
      eligible: Boolean(rule && Number(tamilSolar.day) === rule.day),
      activity, monthIndex, monthTa, monthEn,
      vastuDay: rule?.day ?? null,
      reason: rule && Number(tamilSolar.day) === rule.day
        ? 'Matches the selected Vastu day rule'
        : 'Not one of the eight specified Vastu dates',
      source: MUHURTHAM_ACTIVITY_SOURCES.vastu
    };
  }
  return {
    available: false, eligible: null, activity, monthIndex, monthTa, monthEn,
    reason: 'No verified activity-specific month rule is configured'
  };
}

function parseClock(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function clockText(totalMinutes) {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return String(Math.floor(wrapped / 60)).padStart(2, '0') + ':' +
    String(wrapped % 60).padStart(2, '0');
}

export function getVastuMuhurtham({ tamilSolar, sunrise } = {}) {
  if (!validSolarDate(tamilSolar)) {
    return { available: false, isVastuDay: null, reason: 'Tamil solar date unavailable' };
  }
  const monthIndex = Number(tamilSolar.index);
  const day = Number(tamilSolar.day);
  const rule = VASTU_DAY_RULES[monthIndex];
  const monthTa = MONTHS_TA[monthIndex], monthEn = MONTHS_EN[monthIndex];
  if (!rule || day !== rule.day) {
    return {
      available: true, isVastuDay: false, monthIndex, day, monthTa, monthEn,
      expectedDay: rule?.day ?? null,
      reason: rule ? 'Vastu date does not match this Tamil solar day' : 'This Tamil month has no Vastu day in the selected table',
      source: MUHURTHAM_ACTIVITY_SOURCES.vastu
    };
  }
  const sunriseMinutes = parseClock(sunrise);
  if (sunriseMinutes === null) {
    return {
      available: false, isVastuDay: true, monthIndex, day, monthTa, monthEn,
      sunrise: null, reason: 'Local sunrise is unavailable; Vastu time cannot be calculated',
      source: MUHURTHAM_ACTIVITY_SOURCES.vastu
    };
  }
  const offsetMinutes = rule.sunriseOffsetNazhigai * NAZHIGAI_MINUTES;
  const wakeStart = sunriseMinutes + offsetMinutes;
  const wakeEnd = wakeStart + VASTU_WAKE_MINUTES;
  const pujaStart = wakeEnd - VASTU_PUJA_MINUTES;
  return {
    available: true, isVastuDay: true, monthIndex, day, monthTa, monthEn,
    sunrise: clockText(sunriseMinutes),
    sunriseOffsetNazhigai: rule.sunriseOffsetNazhigai,
    sunriseOffsetMinutes: offsetMinutes,
    wakeStart: clockText(wakeStart),
    wakeEnd: clockText(wakeEnd),
    wakeDurationMinutes: VASTU_WAKE_MINUTES,
    pujaStart: clockText(pujaStart),
    pujaEnd: clockText(wakeEnd),
    pujaDurationMinutes: VASTU_PUJA_MINUTES,
    source: MUHURTHAM_ACTIVITY_SOURCES.vastu
  };
}

// Sidereal sign index -> the two Pushkara Navamsa segments, as degrees
// measured from the start of that sign. Upper boundary is exclusive.
const PUSHKARA_INTERVALS = Object.freeze({
  0: [[20, 23 + 20 / 60], [26 + 40 / 60, 30]],
  4: [[20, 23 + 20 / 60], [26 + 40 / 60, 30]],
  8: [[20, 23 + 20 / 60], [26 + 40 / 60, 30]],
  1: [[6 + 40 / 60, 10], [13 + 20 / 60, 16 + 40 / 60]],
  5: [[6 + 40 / 60, 10], [13 + 20 / 60, 16 + 40 / 60]],
  9: [[6 + 40 / 60, 10], [13 + 20 / 60, 16 + 40 / 60]],
  2: [[16 + 40 / 60, 20], [23 + 20 / 60, 26 + 40 / 60]],
  6: [[16 + 40 / 60, 20], [23 + 20 / 60, 26 + 40 / 60]],
  10: [[16 + 40 / 60, 20], [23 + 20 / 60, 26 + 40 / 60]],
  3: [[0, 3 + 20 / 60], [6 + 40 / 60, 10]],
  7: [[0, 3 + 20 / 60], [6 + 40 / 60, 10]],
  11: [[0, 3 + 20 / 60], [6 + 40 / 60, 10]]
});

const SIGN_EN = Object.freeze([
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]);
const SIGN_TA = Object.freeze([
  'மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி',
  'துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'
]);

function navamsaSignIndex(signIndex, part) {
  const start = signIndex % 3 === 0 ? signIndex :
    signIndex % 3 === 1 ? (signIndex + 8) % 12 : (signIndex + 4) % 12;
  return (start + part) % 12;
}

function degreeText(value) {
  const totalSeconds = Math.round(value * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return String(degrees).padStart(2, '0') + '°' +
    String(minutes).padStart(2, '0') + '′' +
    String(seconds).padStart(2, '0') + '″';
}

export function getPushkaraNavamsa(siderealLongitude) {
  const value = Number(siderealLongitude);
  if (!Number.isFinite(value)) {
    return { available: false, isPushkaraNavamsa: null, reason: 'Sidereal Lagna longitude unavailable' };
  }
  const normalized = ((value % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  const degreeInSignArcseconds = Math.round(degreeInSign * 3600);
  const part = Math.min(8, Math.floor(degreeInSignArcseconds / 12000));
  const navamsaIndex = navamsaSignIndex(signIndex, part);
  const intervals = PUSHKARA_INTERVALS[signIndex];
  // Work in integer arc-seconds so an exact Navamsa boundary is stable
  // across IEEE-754 longitude fractions; lower edge inclusive, upper edge exclusive.
  const matchIndex = intervals.findIndex(([start, end]) =>
    degreeInSignArcseconds >= Math.round(start * 3600) &&
    degreeInSignArcseconds < Math.round(end * 3600)
  );
  const match = matchIndex >= 0 ? intervals[matchIndex] : null;
  const navamsaStart = part * (30 / 9);
  const navamsaEnd = navamsaStart + (30 / 9);
  return {
    available: true,
    isPushkaraNavamsa: Boolean(match),
    siderealLongitude: normalized,
    signIndex,
    signEn: SIGN_EN[signIndex],
    signTa: SIGN_TA[signIndex],
    degreeInSign,
    degreeText: degreeText(degreeInSign),
    navamsaPart: part + 1,
    navamsaSignIndex: navamsaIndex,
    navamsaSignEn: SIGN_EN[navamsaIndex],
    navamsaSignTa: SIGN_TA[navamsaIndex],
    pushkaraInterval: match ? { start: degreeText(match[0]), end: degreeText(match[1]), startDegrees: match[0], endDegrees: match[1] } : null,
    navamsaInterval: { start: degreeText(navamsaStart), end: degreeText(navamsaEnd) },
    source: MUHURTHAM_ACTIVITY_SOURCES.pushkara
  };
}


// Document 50 — source-specific marriage date list and five-factor Panchaka.
// Transcribed from Read-only/Document 50_1.jpg through Document 50_5.jpg.
// This is deliberately separate from the September 2015 Apsara rule table above:
// the two editions publish different Lagna-Dhruva cells and must not be blended.
export const DOCUMENT50_MARRIAGE_SOURCES = Object.freeze({
  rules: 'https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_1.jpg',
  parabhavaDates: 'https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_3.jpg',
  thaliPushkara: 'https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_4.jpg',
  pilavangaDates: 'https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_5.jpg'
});

const DOCUMENT50_PARABHAVA_DATES = Object.freeze([
  '2026-04-20','2026-04-23','2026-04-30',
  '2026-05-08','2026-05-13','2026-05-14','2026-05-18','2026-05-20','2026-05-25','2026-05-27','2026-05-28','2026-05-29',
  '2026-06-04','2026-06-07','2026-06-11','2026-06-17','2026-06-18','2026-06-24','2026-06-25',
  '2026-07-01','2026-07-02','2026-07-05','2026-07-12',
  '2026-08-23','2026-08-30','2026-08-31',
  '2026-09-07','2026-09-13','2026-09-19',
  '2026-11-01','2026-11-11','2026-11-13','2026-11-15','2026-11-16','2026-11-20','2026-11-22','2026-11-29',
  '2026-12-04','2026-12-06','2026-12-18',
  '2027-01-20','2027-01-28',
  '2027-02-08','2027-02-10','2027-02-11','2027-02-18','2027-02-25','2027-02-26',
  '2027-03-04','2027-03-11','2027-03-17','2027-03-18','2027-03-24','2027-03-25',
  '2027-04-04','2027-04-08','2027-04-11'
]);

const DOCUMENT50_PILAVANGA_DATES = Object.freeze([
  '2027-04-18','2027-04-23','2027-04-26',
  '2027-05-09','2027-05-12','2027-05-16','2027-05-17','2027-05-19','2027-05-26','2027-05-27',
  '2027-06-07','2027-06-10','2027-06-13','2027-06-17','2027-06-24','2027-06-25',
  '2027-07-09','2027-07-14','2027-07-16',
  '2027-08-22','2027-08-23','2027-08-27','2027-08-29',
  '2027-09-03','2027-09-05','2027-09-12','2027-09-13',
  '2027-10-20','2027-10-22','2027-10-27',
  '2027-11-08','2027-11-10','2027-11-11','2027-11-12','2027-11-18','2027-11-25',
  '2027-12-02','2027-12-05','2027-12-08','2027-12-09','2027-12-10'
]);

export const DOCUMENT50_MARRIAGE_DATE_SUMMARIES = Object.freeze({
  parabhava2026To2027: Object.freeze({
    year: 'Parabhava 2026–2027',
    start: '2026-04-20',
    end: '2027-04-11',
    count: DOCUMENT50_PARABHAVA_DATES.length
  }),
  pilavanga2027To2028: Object.freeze({
    year: 'Pilavanga 2027–2028',
    start: '2027-04-18',
    end: '2027-12-10',
    count: DOCUMENT50_PILAVANGA_DATES.length
  })
});

const DOCUMENT50_DATE_SETS = Object.freeze([
  Object.freeze({
    ...DOCUMENT50_MARRIAGE_DATE_SUMMARIES.parabhava2026To2027,
    dates: new Set(DOCUMENT50_PARABHAVA_DATES)
  }),
  Object.freeze({
    ...DOCUMENT50_MARRIAGE_DATE_SUMMARIES.pilavanga2027To2028,
    dates: new Set(DOCUMENT50_PILAVANGA_DATES)
  })
]);

function validDocument50CivilDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Looks up only the annual date rows actually printed in Document 50.
 * "Not listed" is not a complete Muhurtham rejection: time-specific
 * Panchanga/Lagna and family-specific Tara Bala rules are separate checks.
 * Dates outside the printed table ranges deliberately remain unavailable.
 */
export function classifyDocument50MarriageMuhurtham({ date } = {}) {
  if (!validDocument50CivilDate(date)) {
    return { available: false, listed: null, date: date ?? null, reason: 'Invalid civil date', source: DOCUMENT50_MARRIAGE_SOURCES.parabhavaDates };
  }
  const period = DOCUMENT50_DATE_SETS.find(item => date >= item.start && date <= item.end);
  if (!period) {
    return { available: false, listed: null, date, year: null, count: null, reason: 'Date is outside the scanned annual table coverage', source: DOCUMENT50_MARRIAGE_SOURCES.parabhavaDates };
  }
  const listed = period.dates.has(date);
  return {
    available: true,
    listed,
    date,
    year: period.year,
    count: period.count,
    reason: listed ? 'Date is printed in the Document 50 marriage Muhurtham table' : 'Date is not listed in the scanned Document 50 annual table; this is not a complete time-specific rejection',
    source: period.year.startsWith('Parabhava') ? DOCUMENT50_MARRIAGE_SOURCES.parabhavaDates : DOCUMENT50_MARRIAGE_SOURCES.pilavangaDates
  };
}

// Document 50's p.1 / p.5 Panchaka paragraph gives only these five
// Lagna-Dhruva values. The seven unstated signs are intentionally absent;
// they must never be silently treated as Dhruva 0 or imported from another book.
export const DOCUMENT50_LAGNA_DHRUVA = Object.freeze({
  0: 5,  // Mesha
  1: 7,  // Rishabha
  9: 2,  // Makara
  10: 4, // Kumbha
  11: 6  // Meena
});

const DOCUMENT50_PANCHAKA_NAMES = Object.freeze({
  1: Object.freeze({ en: 'Mrityu Panchakam', ta: 'மிருத்யு பஞ்சகம்' }),
  2: Object.freeze({ en: 'Agni Panchakam', ta: 'அக்னி பஞ்சகம்' }),
  4: Object.freeze({ en: 'Raja Panchakam', ta: 'ராஜ பஞ்சகம்' }),
  6: Object.freeze({ en: 'Chora Panchakam', ta: 'சோர பஞ்சகம்' }),
  8: Object.freeze({ en: 'Roga Panchakam', ta: 'ரோக பஞ்சகம்' })
});

/**
 * Document 50 five-factor Panchaka screening.
 * Counts are 1-based: Sunday=1, Pratipada=1 within each Paksha,
 * Ashwini=1, Mesha=1. Only source-stated Dhruva values are computable.
 * Remainders 3/5/7 are stated as Uttamam; 1/2/4/6/8 as Dosham.
 * The scan does not specify remainder 0, so it remains unclassified.
 * This calculation does not apply the separately printed day/night or
 * ceremony exceptions, which require clearer source verification.
 */
export function getDocument50Panchaka({
  weekdayIndex,
  tithiNumber,
  nakshatraNumber,
  lagnaSignIndex
} = {}) {
  const weekday = Number(weekdayIndex);
  const tithi = Number(tithiNumber);
  const nakshatra = Number(nakshatraNumber);
  const lagna = Number(lagnaSignIndex);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      !Number.isInteger(tithi) || tithi < 1 || tithi > 30 ||
      !Number.isInteger(nakshatra) || nakshatra < 1 || nakshatra > 27 ||
      !Number.isInteger(lagna) || lagna < 0 || lagna > 11) {
    return { available: false, eligible: null, reason: 'Panchanga weekday, Tithi, Nakshatra or Lagna is unavailable or invalid', source: DOCUMENT50_MARRIAGE_SOURCES.rules };
  }
  const dhruva = DOCUMENT50_LAGNA_DHRUVA[lagna];
  if (!Number.isInteger(dhruva)) {
    return {
      available: false,
      eligible: null,
      weekdayCount: weekday + 1,
      tithiCount: ((tithi - 1) % 15) + 1,
      nakshatraCount: nakshatra,
      lagnaCount: lagna + 1,
      lagnaSignIndex: lagna,
      dhruva: null,
      reason: 'Document 50 does not state a Lagna-Dhruva value for this sign',
      source: DOCUMENT50_MARRIAGE_SOURCES.rules
    };
  }
  const components = {
    weekdayCount: weekday + 1,
    tithiCount: ((tithi - 1) % 15) + 1,
    nakshatraCount: nakshatra,
    lagnaCount: lagna + 1,
    dhruva
  };
  const total = Object.values(components).reduce((sum, value) => sum + value, 0);
  const remainder = total % 9;
  const name = DOCUMENT50_PANCHAKA_NAMES[remainder] || null;
  const eligible = [3, 5, 7].includes(remainder) ? true :
    [1, 2, 4, 6, 8].includes(remainder) ? false : null;
  return {
    available: true,
    eligible,
    ...components,
    lagnaSignIndex: lagna,
    total,
    remainder,
    category: name?.en || (eligible === true ? 'Uttamam' : eligible === false ? 'Panchaka Dosham' : 'Not stated by Document 50'),
    categoryTa: name?.ta || (eligible === true ? 'உத்தமம்' : eligible === false ? 'பஞ்சக தோஷம்' : 'ஆவணத்தில் குறிப்பிடப்படவில்லை'),
    reason: eligible === true ? 'Remainder 3, 5 or 7 is Uttamam in Document 50' :
      eligible === false ? 'Remainder 1, 2, 4, 6 or 8 is Panchaka Dosham in Document 50' :
      'Document 50 does not classify remainder 0',
    source: DOCUMENT50_MARRIAGE_SOURCES.rules
  };
}


const DOCUMENT50_FORBIDDEN_TITHI_NUMBERS = Object.freeze([4, 6, 8, 9, 12, 14]);

function document50PeriodContains(timeValue, periodValue) {
  const time = parseClock(timeValue);
  const match = String(periodValue ?? '').match(/(\d{1,2}:\d{2})\\s*[-–]\\s*(\d{1,2}:\d{2})/);
  if (time === null || !match) return null;
  const start = parseClock(match[1]), end = parseClock(match[2]);
  if (start === null || end === null) return null;
  return end >= start ? time >= start && time < end : time >= start || time < end;
}

/**
 * Applies only the independently readable Document 50 date/time exclusions.
 * Sunday is returned as a caution, not a hard rejection, because the scanned
 * paragraph says it is scripturally avoided but accepted in practice.
 * Nakshatra relationship, Marana/Utpata/Prabalarishta Yoga, and personal
 * bride/groom-star rules are intentionally not guessed here.
 */
export function getDocument50TimeRestrictions({
  weekdayIndex,
  tithiNumber,
  time,
  rahuKalam,
  yamagandam,
  kariDay,
  thaniyaDay
} = {}) {
  const weekday = Number(weekdayIndex), tithi = Number(tithiNumber);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      !Number.isInteger(tithi) || tithi < 1 || tithi > 30) {
    return { available: false, blocked: null, reasons: [], warnings: ['Weekday or Tithi is unavailable'], source: DOCUMENT50_MARRIAGE_SOURCES.rules };
  }
  const tithiCount = ((tithi - 1) % 15) + 1;
  const reasons = [], warnings = [];
  if (DOCUMENT50_FORBIDDEN_TITHI_NUMBERS.includes(tithiCount)) {
    reasons.push('Document 50 excludes this Tithi (' + tithiCount + ' within its Paksha)');
  }
  if (weekday === 2) reasons.push('Tuesday is excluded by Document 50');
  if (weekday === 6) reasons.push('Saturday is excluded by Document 50');
  if (weekday === 0) warnings.push('Sunday is stated as scripturally avoided, but the same paragraph says it is accepted in practice');

  if (kariDay === true) reasons.push('Kari Naal is marked for this Tamil date');
  if (thaniyaDay === true) reasons.push('Thaniya Naal is marked for this Tamil date');

  const rahu = document50PeriodContains(time, rahuKalam);
  const yama = document50PeriodContains(time, yamagandam);
  if (rahu === true) reasons.push('Selected time falls within Rahu Kalam');
  if (yama === true) reasons.push('Selected time falls within Yamagandam');
  if (time && rahu === null) warnings.push('Rahu Kalam interval is unavailable or could not be parsed');
  if (time && yama === null) warnings.push('Yamagandam interval is unavailable or could not be parsed');
  if (kariDay === undefined || thaniyaDay === undefined) warnings.push('Kari Naal / Thaniya Naal classification is unavailable');

  return {
    available: true,
    blocked: reasons.length > 0,
    weekdayIndex: weekday,
    tithiNumber: tithi,
    tithiCount,
    time: time || null,
    reasons,
    warnings,
    source: DOCUMENT50_MARRIAGE_SOURCES.rules
  };
}

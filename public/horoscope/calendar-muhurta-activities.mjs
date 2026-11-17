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
  10: Object.freeze({ day: 22, sunriseOffsetNazhigai: 8 }) // Masi
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
  const part = Math.min(8, Math.floor(degreeInSign / (30 / 9)));
  const navamsaIndex = navamsaSignIndex(signIndex, part);
  const intervals = PUSHKARA_INTERVALS[signIndex];
  const matchIndex = intervals.findIndex(([start, end]) => degreeInSign >= start && degreeInSign < end);
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

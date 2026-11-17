// Shared, offline-safe Tamil day classifications for SMV CALENDAR.
// The solar-month index follows TAMIL_SOLAR_TA in transit_panchang.browser.mjs:
// 0 Chithirai ... 11 Panguni.
//
// Sri Thanigai Kari Naal source:
// https://www.prohithar.com/karinaal.html
// The published month/day table is the monthly Tyajyam date list. Its dosha
// period is only six ghatis (2 h 24 min) from the local sunrise, not all day.
//
// Sri Thanigai Thaniya Naal arithmetic source:
// https://www.prohithar.com/almanac/தனியநாள்%20கணிதம்%20விளக்கம்_daniyanal-calculation.pdf
// Verified against the Parabhava 2026-27 annual Panchangam:
// https://prohithar.com/panchangasadas/thanigai/parabhava-srithanigai-panchangam2026-2027.pdf
//
// Kari dates are the publisher's recurring Tamil solar-month date list.
// Thaniya dates are calculated from monthly Dhruva + weekday remainder,
// adding the Kollam-year remainder for Aippasi through Panguni.
export const KARI_DAY_DATES = Object.freeze([
  [6, 15], [7, 16, 17], [1, 6], [2, 10, 20],
  [2, 9, 28], [16, 29], [6, 20], [1, 10, 17],
  [6, 9, 11], [1, 2, 3, 11, 17], [15, 16, 17], [6, 15, 19]
].map(days => Object.freeze(days)));

// Sri Thanigai Dhruva dates (A = first half, B = second half).
export const THANIGAI_THANIYA_DHRUVA_DATES = Object.freeze([
  [3, 20], [9, 22], [8, 22], [7, 20], [7, 18], [9, 26],
  [3, 20], [8, 14], [8, 26], [3, 15], [15, 24], [18, 24]
].map(days => Object.freeze(days)));

// Sunday=0, Monday=6, Tuesday=5, Wednesday=4, Thursday=3, Friday=2, Saturday=1.
const THANIGAI_WEEKDAY_REMAINDERS = Object.freeze([0, 6, 5, 4, 3, 2, 1]);
const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function getThaniyaNaalDates(tamilSolar) {
  const monthIndex = Number(tamilSolar?.index);
  const monthStartDate = String(tamilSolar?.monthStartDate || '');
  const monthDays = Number(tamilSolar?.monthDays);
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(monthStartDate) ||
      !Number.isInteger(monthDays) || monthDays < 28 || monthDays > 33) {
    return { available: false, dates: [], weekdayRemainder: null, yearRemainder: null, kollamYear: null };
  }

  const monthStart = new Date(monthStartDate + 'T12:00:00Z');
  if (!Number.isFinite(monthStart.getTime())) {
    return { available: false, dates: [], weekdayRemainder: null, yearRemainder: null, kollamYear: null };
  }
  const weekdayRemainder = THANIGAI_WEEKDAY_REMAINDERS[monthStart.getUTCDay()];
  const civilYear = Number(monthStartDate.slice(0, 4));
  // Tamil solar year starts in Chithirai; Thai, Maasi and Panguni fall in
  // January-March and therefore belong to the previous Gregorian start year.
  const tamilYearStart = civilYear - (monthIndex >= 9 ? 1 : 0);
  const kollamYear = tamilYearStart - 824;
  const yearRemainder = monthIndex >= 6 ? positiveModulo(kollamYear - 2, 7) : 0;

  const [dhruvaA, dhruvaB] = THANIGAI_THANIYA_DHRUVA_DATES[monthIndex];
  let first = dhruvaA + weekdayRemainder + yearRemainder;
  let second = dhruvaB + weekdayRemainder + yearRemainder;

  // Sri Thanigai special rule: when the second date exceeds the month's
  // actual Tamil-date count, subtract seven from BOTH Dhruva results.
  while (second > monthDays) {
    first -= 7;
    second -= 7;
  }
  if (first < 1 || second < 1 || first > monthDays || second > monthDays) {
    return { available: false, dates: [], weekdayRemainder, yearRemainder, kollamYear };
  }
  return {
    available: true,
    dates: [first, second],
    weekdayRemainder,
    yearRemainder,
    kollamYear,
    monthDays
  };
}

export function getTamilCalendarDayFlags(tamilSolar) {
  const monthIndex = Number(tamilSolar?.index);
  const day = Number(tamilSolar?.day);
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11 ||
      !Number.isInteger(day) || day < 1 || day > 32) {
    return { available: false, kari: false, thaniya: false, thaniyaAvailable: false };
  }
  const thaniya = getThaniyaNaalDates(tamilSolar);
  return {
    available: true,
    kari: KARI_DAY_DATES[monthIndex].includes(day),
    thaniya: thaniya.available && thaniya.dates.includes(day),
    thaniyaAvailable: thaniya.available
  };
}

// TTD Tirukanitha Panchangam (Subhakritu 2022-23), Amirthadi Yogam matrix, p. 134.
// Rows are weekdays Sunday=0 through Saturday=6; each character is Nakshatra 1–27.
// A=Amirtha, S=Siddha, M=Marana, P=Prabalarishta.
export const TAMIL_DAY_YOGA_TABLE = Object.freeze([
  'SPSSSSSSSMSAASSMMMASAAMSSAA',
  'SSMAASASSMSSSPAMSSSSMASSMSS',
  'SSSASMSSSSSASSSMSSASPSSMMAS',
  'MSASSSSSSSAAMSSSSSMAASPSASM',
  'ASMMMMAASASMSSASSPSSSSSMSSS',
  'ASSMSSSMMMSSASSSSMAPSMSSSSA',
  'SSAASSSSMASMMMASSSSSSSSAMSP'
]);

const YOGA_BY_CODE = Object.freeze({
  S: Object.freeze({ key: 'siddha', en: 'Siddha Yogam', ta: 'சித்த யோகம்', resultEn: 'Accomplishment · auspicious', resultTa: 'காரிய சித்தி · சுபமானது', bad: false }),
  A: Object.freeze({ key: 'amirtha', en: 'Amirtha Yogam', ta: 'அமிர்த யோகம்', resultEn: 'Nectar · highly auspicious', resultTa: 'அமிர்தம் · மிகச் சிறந்த சுப யோகம்', bad: false }),
  M: Object.freeze({ key: 'marana', en: 'Marana Yogam', ta: 'மரண யோகம்', resultEn: 'Traditionally avoided for new auspicious beginnings', resultTa: 'சுப காரியத் தொடக்கத்திற்கு பாரம்பரியமாகத் தவிர்க்கப்படும்', bad: true }),
  P: Object.freeze({ key: 'prabalarishta', en: 'Prabalarishta Yogam', ta: 'பிரபலாரிஷ்ட யோகம்', resultEn: 'Traditionally considered strongly inauspicious', resultTa: 'பாரம்பரியமாக வலுவான அசுப யோகம்', bad: true })
});

const UNKNOWN_YOGA = Object.freeze({
  key: 'unknown',
  en: 'Unavailable',
  ta: 'கிடைக்கவில்லை',
  resultEn: 'Sunrise weekday / Nakshatra data unavailable',
  resultTa: 'சூரிய உதய கிழமை / நட்சத்திரத் தரவு கிடைக்கவில்லை',
  bad: false
});

// The table is indexed Sunday=0 through Saturday=6; Nakshatra numbers are 1–27.
// Never silently substitute Siddha for an unknown or missing lookup.
export function getTamilDayYoga(weekday, sunriseNakshatraNumber) {
  const day = Number(weekday);
  const star = Number(sunriseNakshatraNumber);
  if (!Number.isInteger(day) || day < 0 || day > 6 ||
      !Number.isInteger(star) || star < 1 || star > 27) {
    return UNKNOWN_YOGA;
  }
  const code = TAMIL_DAY_YOGA_TABLE[day]?.[star - 1];
  return YOGA_BY_CODE[code] || UNKNOWN_YOGA;
}


// Traditional Nakshatra-facing day groups (1-based Nakshatra numbering).
// These complete, mutually exclusive groups contain nine stars each.
const UPPER_FACING_NAKSHATRAS = new Set([4, 6, 8, 12, 21, 22, 23, 24, 26]);
const LOWER_FACING_NAKSHATRAS = new Set([2, 3, 9, 10, 11, 16, 19, 20, 25]);
const EQUAL_FACING_NAKSHATRAS = new Set([1, 5, 7, 13, 14, 15, 17, 18, 27]);

export function getNakshatraDirection(nakshatraNumber) {
  const number = Number(nakshatraNumber);
  if (!Number.isInteger(number) || number < 1 || number > 27) {
    return { available: false, key: 'unknown', symbol: '', en: 'Unavailable', ta: 'கிடைக்கவில்லை' };
  }
  if (UPPER_FACING_NAKSHATRAS.has(number)) {
    return { available: true, key: 'upper', symbol: '↑', en: 'Upper-facing day', ta: 'மேல் நோக்கு நாள்' };
  }
  if (LOWER_FACING_NAKSHATRAS.has(number)) {
    return { available: true, key: 'lower', symbol: '↓', en: 'Lower-facing day', ta: 'கீழ் நோக்கு நாள்' };
  }
  if (EQUAL_FACING_NAKSHATRAS.has(number)) {
    return { available: true, key: 'equal', symbol: '↔', en: 'Equal-facing day', ta: 'சம நோக்கு நாள்' };
  }
  return { available: false, key: 'unknown', symbol: '', en: 'Unavailable', ta: 'கிடைக்கவில்லை' };
}

// Nethiram and Jeevan are read relative to the Sun's Nakshatra.
// dayNakshatraNumber is the Moon's Nakshatra at the selected local sunrise.
export function getNethiramJeevan(sunNakshatraNumber, dayNakshatraNumber) {
  const sun = Number(sunNakshatraNumber);
  const day = Number(dayNakshatraNumber);
  if (!Number.isInteger(sun) || sun < 1 || sun > 27 ||
      !Number.isInteger(day) || day < 1 || day > 27) {
    return { available: false, nethiram: null, jeevan: null };
  }

  const distance = (day - sun + 27) % 27;
  const shortestDistance = Math.min(distance, 27 - distance);
  const nethiram = shortestDistance <= 3 ? 0 : shortestDistance <= 7 ? 1 : 2;

  const sameNakshatraLord = distance === 9 || distance === 18;
  const adjacentToSun = distance === 0 || distance === 1 || distance === 26;
  const halfJeevanBand = (distance >= 2 && distance <= 8) ||
    (distance >= 19 && distance <= 25);
  const jeevan = adjacentToSun || sameNakshatraLord ? 0 : halfJeevanBand ? 0.5 : 1;

  return { available: true, sunNakshatraNumber: sun, dayNakshatraNumber: day, distance, nethiram, jeevan };
}

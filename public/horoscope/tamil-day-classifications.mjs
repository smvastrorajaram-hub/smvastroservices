// Shared, offline-safe Tamil day classifications for SMV CALENDAR.
// The solar-month index follows TAMIL_SOLAR_TA in transit_panchang.browser.mjs:
// 0 Chithirai ... 11 Panguni.
//
// Kari Naal and Thaniya Naal are distinct fixed Tamil month/day lists.
// They are presentation flags only; they do not alter Panchang calculations.
export const KARI_DAY_DATES = Object.freeze([
  [6, 15], [7, 16, 17], [1, 6], [2, 10, 20],
  [2, 9, 28], [16, 29], [6, 20], [1, 10, 17],
  [6, 9, 11], [1, 2, 3, 11, 17], [15, 16, 17], [6, 15, 19]
].map(days => Object.freeze(days)));

export const THANIYA_DAY_DATES = Object.freeze([
  [10, 26], [4, 14], [9, 27], [10, 26],
  [2, 27], [16, 29], [6, 20], [1, 10, 11],
  [6, 9, 11], [1, 2, 3, 11, 17], [15, 16, 17], [6, 15, 19]
].map(days => Object.freeze(days)));

export function getTamilCalendarDayFlags(tamilSolar) {
  const monthIndex = Number(tamilSolar?.index);
  const day = Number(tamilSolar?.day);
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11 ||
      !Number.isInteger(day) || day < 1 || day > 32) {
    return { available: false, kari: false, thaniya: false };
  }
  return {
    available: true,
    kari: KARI_DAY_DATES[monthIndex].includes(day),
    thaniya: THANIYA_DAY_DATES[monthIndex].includes(day)
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

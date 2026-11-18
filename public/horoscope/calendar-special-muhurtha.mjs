// SMV CALENDAR — narrowly scoped special Muhurtha display rules.
// Only published Subha Muhurtham dates inside Parabhava / Plavanga are eligible.
export const SPECIAL_TAMIL_YEARS = Object.freeze([
  Object.freeze({ key: 'parabhava', nameTa: 'பராபவ', start: '2026-04-14', end: '2027-04-13' }),
  Object.freeze({ key: 'plavanga', nameTa: 'பிலவங்க', start: '2027-04-14', end: '2028-04-14' })
]);

export function getSpecialTamilYear(date) {
  const value = String(date || '');
  return SPECIAL_TAMIL_YEARS.find(year => value >= year.start && value <= year.end) || null;
}

export function shouldShowSpecialMuhurtha(date, classification) {
  return Boolean(
    getSpecialTamilYear(date) &&
    classification?.available === true &&
    classification?.isSubhaMuhurtham === true
  );
}

// Pushkara Navamsa arcs from C. S. Patel, Navamsa in Astrology, ch. 4.
const PUSHKARA_ARCS = Object.freeze([
  Object.freeze({ signs: [0, 4, 8], arcs: [[20, 23 + 1 / 3], [26 + 2 / 3, 30]] }),
  Object.freeze({ signs: [1, 5, 9], arcs: [[6 + 2 / 3, 10], [13 + 1 / 3, 16 + 2 / 3]] }),
  Object.freeze({ signs: [2, 6, 10], arcs: [[16 + 2 / 3, 20], [23 + 1 / 3, 26 + 2 / 3]] }),
  Object.freeze({ signs: [3, 7, 11], arcs: [[0, 3 + 1 / 3], [6 + 2 / 3, 10]] })
]);

export function getPushkaraArcIndex(longitude) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) return null;
  const normalized = ((value % 360) + 360) % 360;
  const sign = Math.floor(normalized / 30);
  const degree = normalized - sign * 30;
  const group = PUSHKARA_ARCS.find(entry => entry.signs.includes(sign));
  if (!group) return null;
  const arcIndex = group.arcs.findIndex(([start, end]) => degree >= start && degree < end);
  return arcIndex < 0 ? null : sign * 2 + arcIndex;
}

const PANCHAKA_NAMES = Object.freeze({
  mrityu: Object.freeze({ ta: 'மிருத்யு பஞ்சகம்', en: 'Mrityu Panchaka', cautionTa: 'திருமணம் / உபநயனம் தவிர்க்கவும்', cautionEn: 'Avoid marriage / Upanayanam' }),
  agni: Object.freeze({ ta: 'அக்னி பஞ்சகம்', en: 'Agni Panchaka', cautionTa: 'வீடு கட்டும் பணியைத் தவிர்க்கவும்', cautionEn: 'Avoid house construction' }),
  raja: Object.freeze({ ta: 'ராஜ பஞ்சகம்', en: 'Raja Panchaka', cautionTa: 'வீடு கட்டுதல் / தொழில் தொடக்கம் தவிர்க்கவும்', cautionEn: 'Avoid house construction / business undertakings' }),
  chora: Object.freeze({ ta: 'சோர பஞ்சகம்', en: 'Chora Panchaka', cautionTa: 'பயணத்தைத் தவிர்க்கவும்', cautionEn: 'Avoid travel' }),
  roga: Object.freeze({ ta: 'ரோக பஞ்சகம்', en: 'Roga Panchaka', cautionTa: 'திருமணம் / உபநயனம் தவிர்க்கவும்', cautionEn: 'Avoid marriage / Upanayanam' })
});

const PANCHAKA_ACTIVITIES = Object.freeze([
  Object.freeze({ key: 'marriage', labelTa: 'திருமணம் / உபநயனம்', labelEn: 'Marriage / Upanayanam', blockedBy: ['mrityu', 'roga'] }),
  Object.freeze({ key: 'house', labelTa: 'வீடு கட்டுதல்', labelEn: 'House construction', blockedBy: ['agni', 'raja'] }),
  Object.freeze({ key: 'business', labelTa: 'தொழில் தொடக்கம்', labelEn: 'Business start', blockedBy: ['raja'] }),
  Object.freeze({ key: 'travel', labelTa: 'பயணம்', labelEn: 'Travel', blockedBy: ['chora'] })
]);

export function getPanchakaActivityResults(result) {
  if (!result?.available) return [];
  return PANCHAKA_ACTIVITIES.map(activity => ({
    key: activity.key,
    labelTa: activity.labelTa,
    labelEn: activity.labelEn,
    suitableByPanchaka: result.isRahita === true || !activity.blockedBy.includes(result.key)
  }));
}

export function classifyPanchaka({ tithi, weekday, nakshatra, lagna } = {}) {
  const values = [tithi, weekday, nakshatra, lagna].map(Number);
  if (values.some(value => !Number.isInteger(value) || value < 1) ||
      values[0] > 30 || values[1] > 7 || values[2] > 27 || values[3] > 12) {
    return { available: false, key: 'unavailable', isRahita: null, labelTa: 'தகவல் கிடைக்கவில்லை', labelEn: 'Unavailable', cautionTa: '', cautionEn: '' };
  }
  const remainder = values.reduce((sum, value) => sum + value, 0) % 9;
  if ([0, 3, 5, 7].includes(remainder)) {
    return { available: true, key: 'rahita', isRahita: true, labelTa: 'உத்தமம்', labelEn: 'Excellent', cautionTa: '', cautionEn: '' };
  }
  const key = ({ 1: 'mrityu', 2: 'agni', 4: 'raja', 6: 'chora', 8: 'roga' })[remainder];
  const name = PANCHAKA_NAMES[key];
  return { available: true, key, isRahita: false, labelTa: name.ta, labelEn: name.en, cautionTa: name.cautionTa, cautionEn: name.cautionEn };
}

// Vastu day dates cross-checked against TamilDot and TamilCalendar365/Murugan Calendar.
// The published 36-minute clock windows are intentionally not hard-coded here,
// because local Panchangam lists can differ slightly for the same Vastu date.
const VASTU_DAYS = Object.freeze({
  2026: Object.freeze([
    ['2026-01-26', 'தை', 12], ['2026-03-06', 'மாசி', 22],
    ['2026-04-23', 'சித்திரை', 10], ['2026-06-04', 'வைகாசி', 21],
    ['2026-07-27', 'ஆடி', 11], ['2026-08-23', 'ஆவணி', 6],
    ['2026-10-28', 'ஐப்பசி', 11], ['2026-11-24', 'கார்த்திகை', 8]
  ]),
  2027: Object.freeze([
    ['2027-01-26', 'தை', 12], ['2027-03-06', 'மாசி', 22],
    ['2027-04-23', 'சித்திரை', 10], ['2027-06-04', 'வைகாசி', 21],
    ['2027-07-27', 'ஆடி', 11], ['2027-08-23', 'ஆவணி', 6],
    ['2027-10-28', 'ஐப்பசி', 11], ['2027-11-24', 'கார்த்திகை', 8]
  ])
});

export function getVastuDay(date) {
  const year = Number(String(date || '').slice(0, 4));
  const item = (VASTU_DAYS[year] || []).find(([day]) => day === date);
  return item ? { date: item[0], monthTa: item[1], tamilDay: item[2] } : null;
}

export function isMoudhyaScopeDate(date) {
  return Boolean(getSpecialTamilYear(date));
}

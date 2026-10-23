export const RASI_PALAN_PLANETS = Object.freeze([
  { key: 'Sun', ta: 'சூரியன்' },
  { key: 'Mars', ta: 'செவ்வாய்' },
  { key: 'Mercury', ta: 'புதன்' },
  { key: 'Jupiter', ta: 'குரு' },
  { key: 'Venus', ta: 'சுக்கிரன்' },
  { key: 'Saturn', ta: 'சனி' },
  { key: 'Rahu', ta: 'ராகு' },
  { key: 'Ketu', ta: 'கேது' }
]);

export const RASI_PALAN_MODES = Object.freeze(['automatic', 'manual', 'hybrid']);
export const RASI_PALAN_TITLES = Object.freeze({
  tamilNewYear: { en: 'Tamil New Year Rasi Palan', ta: 'தமிழ் வருடப் பிறப்பு ராசி பலன்கள்' },
  englishNewYear: { en: 'English New Year Rasi Palan', ta: 'ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்' }
});

export function normalizeLongitude(longitude) {
  const n = Number(longitude) % 360;
  return n < 0 ? n + 360 : n;
}

export function signIndex(longitude) {
  return Math.floor(normalizeLongitude(longitude) / 30);
}

export function houseFromRasi(planetSignIndex, targetRasiIndex) {
  return ((Number(planetSignIndex) - Number(targetRasiIndex) + 12) % 12) + 1;
}

export function mondayOf(dateString) {
  const d = new Date(String(dateString) + 'T12:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function periodReference(period, dateString) {
  const d = String(dateString);
  if (period === 'weekly') return { date: mondayOf(d), key: mondayOf(d) };
  if (period === 'monthly') return { date: d.slice(0, 7) + '-01', key: d.slice(0, 7) };
  return { date: d, key: d };
}

export function readingKey(type, periodKey, rasiIndex, planetKey, language) {
  return [type, periodKey, Number(rasiIndex), planetKey, language === 'ta' ? 'ta' : 'en'].join('|');
}

export function selectReading(mode, automaticText, publishedText, draftText) {
  const published = String(publishedText || '').trim();
  const draft = String(draftText || '').trim();
  const automatic = String(automaticText || '').trim();
  if (mode === 'automatic') return { text: automatic, source: 'automatic' };
  if (mode === 'manual') {
    const text = draft || published;
    return { text, source: draft ? 'draft' : published ? 'manual' : 'missing' };
  }
  return published
    ? { text: published, source: 'manual' }
    : { text: automatic, source: 'automatic-fallback' };
}

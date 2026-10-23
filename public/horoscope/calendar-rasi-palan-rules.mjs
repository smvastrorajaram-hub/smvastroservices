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

export function sundayOf(dateString) {
  const d = new Date(String(dateString) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export function lastCompletedWeek(dateString) {
  const anchor = new Date(String(dateString) + 'T12:00:00Z');
  const daysSinceLastSaturday = (anchor.getUTCDay() + 1) % 7 || 7;
  const end = new Date(anchor);
  end.setUTCDate(end.getUTCDate() - daysSinceLastSaturday);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function periodReference(period, dateString) {
  const d = String(dateString).slice(0, 10);
  if (period === 'weekly') {
    const range = lastCompletedWeek(d);
    return { date: range.start, key: range.start, start: range.start, end: range.end };
  }
  if (period === 'monthly') {
    const yearMonth = d.slice(0, 7);
    const monthEnd = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0, 12)).toISOString().slice(0, 10);
    return { date: yearMonth + '-01', key: yearMonth, start: yearMonth + '-01', end: monthEnd };
  }
  return { date: d, key: d, start: d, end: d };
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

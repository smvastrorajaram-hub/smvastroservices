import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RASI_PALAN_PLANETS,
  RASI_PALAN_TITLES,
  signIndex,
  houseFromRasi,
  mondayOf,
  periodReference,
  readingKey,
  selectReading
} from '../public/horoscope/calendar-rasi-palan-rules.mjs';

test('Daily/weekly/monthly and New Year rules include exactly eight transiting planets, never a Moon prediction', () => {
  assert.deepEqual(RASI_PALAN_PLANETS.map(p => p.key), ['Sun','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);
  assert.equal(RASI_PALAN_PLANETS.some(p => p.key === 'Moon'), false);
});

test('Sidereal longitudes normalize and house counting from the selected Rasi is 1-based', () => {
  assert.equal(signIndex(0), 0);
  assert.equal(signIndex(359.999), 11);
  assert.equal(signIndex(-1), 11);
  assert.equal(houseFromRasi(4, 4), 1);
  assert.equal(houseFromRasi(0, 11), 2);
  assert.equal(houseFromRasi(11, 0), 12);
});

test('Selected daily, weekly and monthly dates normalize to the intended period anchor', () => {
  assert.deepEqual(periodReference('daily', '2026-10-24'), {date:'2026-10-24',key:'2026-10-24'});
  assert.equal(mondayOf('2026-10-24'), '2026-10-19');
  assert.deepEqual(periodReference('weekly', '2026-10-24'), {date:'2026-10-19',key:'2026-10-19'});
  assert.deepEqual(periodReference('monthly', '2026-10-24'), {date:'2026-10-01',key:'2026-10'});
});

test('Published bilingual text is keyed separately, and Hybrid prefers published manual then automatic fallback', () => {
  const ta = readingKey('daily', '2026-10-24', 0, 'Sun', 'ta');
  const en = readingKey('daily', '2026-10-24', 0, 'Sun', 'en');
  assert.notEqual(ta, en);
  assert.deepEqual(selectReading('hybrid', 'auto', 'manual-ta', 'draft-ta'), {text:'manual-ta',source:'manual'});
  assert.deepEqual(selectReading('hybrid', 'auto', '', 'draft-ta'), {text:'auto',source:'automatic-fallback'});
  assert.deepEqual(selectReading('manual', 'auto', 'published', 'draft'), {text:'draft',source:'draft'});
  assert.deepEqual(selectReading('manual', 'auto', '', ''), {text:'',source:'missing'});
  assert.deepEqual(selectReading('automatic', 'auto', 'published', 'draft'), {text:'auto',source:'automatic'});
});

test('New Year labels are the exact requested names and avoid an annual-transit label', () => {
  assert.equal(RASI_PALAN_TITLES.tamilNewYear.ta, 'தமிழ் வருடப் பிறப்பு ராசி பலன்கள்');
  assert.equal(RASI_PALAN_TITLES.englishNewYear.ta, 'ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்');
  assert.match(RASI_PALAN_TITLES.tamilNewYear.en, /Tamil New Year Rasi Palan/);
  assert.match(RASI_PALAN_TITLES.englishNewYear.en, /English New Year Rasi Palan/);
  assert.doesNotMatch(RASI_PALAN_TITLES.tamilNewYear.en, /Annual Transit/i);
});

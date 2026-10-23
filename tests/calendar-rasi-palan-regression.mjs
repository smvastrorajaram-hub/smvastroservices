import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
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

const dailyCalendarSource = await readFile(new URL('../public/horoscope/daily-calendar.mjs', import.meta.url), 'utf8');
const publicRasiPalanSource = await readFile(new URL('../public/horoscope/calendar-rasi-palan.mjs', import.meta.url), 'utf8');
const calendarIndexSource = await readFile(new URL('../public/horoscope/calendar/index.html', import.meta.url), 'utf8');
const adminPageSource = await readFile(new URL('../public/horoscope/calendar/admin.html', import.meta.url), 'utf8');
const adminModuleSource = await readFile(new URL('../public/horoscope/calendar/calendar-admin.mjs', import.meta.url), 'utf8');

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

test('Calendar daily Rasi Palan has no separate Moon transit prediction and shows only eight transit planets', () => {
  assert.doesNotMatch(dailyCalendarSource, /L\('Moon transit'/);
  assert.match(dailyCalendarSource, /All eight transit planets/);
  assert.match(dailyCalendarSource, /ps\.filter\(x=>x\.name!=='Moon'\)\.map\(x=>/);
});

test('Public Calendar does not expose prediction mode, editor/export, or the removed calculation note', () => {
  assert.doesNotMatch(publicRasiPalanSource, /Prediction mode|பலன் முறை/);
  assert.doesNotMatch(publicRasiPalanSource, /Manual Entry editor|கையேடு பதிவு திருத்தி/);
  assert.doesNotMatch(publicRasiPalanSource, /Export manual JSON|exportManualJson/);
  assert.doesNotMatch(publicRasiPalanSource, /Automatic uses local Swiss Ephemeris/);
  assert.doesNotMatch(publicRasiPalanSource, /தானியங்கி முறையில் உள்ளூர் Swiss Ephemeris நிரயண கிரக நிலைகளும்/);
  assert.doesNotMatch(publicRasiPalanSource, /rp-mode-chip|rp-manual-editor/);
});

test('Manual authoring and mode selection are isolated to a Firebase-admin-protected Calendar page', () => {
  assert.match(calendarIndexSource, /calendar-rasi-palan\.mjs/);
  assert.doesNotMatch(calendarIndexSource, /calendar-admin\.mjs|calendar\/admin\.html/);
  assert.match(adminPageSource, /id="mode"/);
  assert.match(adminPageSource, /id="publish"/);
  assert.match(adminModuleSource, /signInWithEmailAndPassword/);
  assert.match(adminModuleSource, /getDocFromServer\(fsApi\.doc\(db, 'smv_settings', 'prediction_editor_access'\)\)/);
  assert.match(adminModuleSource, /'smv_content', 'calendar_rasi_palan_v1'/);
  assert.match(adminModuleSource, /tamilNewYear/);
  assert.match(adminModuleSource, /englishNewYear/);
  assert.match(adminModuleSource, /jupiterTransit/);
  assert.match(adminModuleSource, /saturnTransit/);
  assert.match(adminModuleSource, /rahuKetuTransit/);
  assert.doesNotMatch(adminModuleSource, /daily:|weekly:|monthly:/);
});

test('Public calendar takes published mode/data from Firestore online and uses bundled JSON offline', () => {
  assert.match(publicRasiPalanSource, /smv_content', 'calendar_rasi_palan_v1'/);
  assert.match(publicRasiPalanSource, /if \(navigator\.onLine\)/);
  assert.match(publicRasiPalanSource, /calendar-rasi-palan-manual\.json/);
  assert.match(publicRasiPalanSource, /publishedMode = '\''hybrid'\''/);
  assert.match(publicRasiPalanSource, /supportsPublishedManual/);
});

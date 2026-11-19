import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  TAMIL_GRAHA_PLANETS,
  TAMIL_GRAHA_TYPES,
  TAMIL_GRAHA_YEAR_DATA
} from '../public/horoscope/calendar-graha-periods-data.mjs';

const calendarSource = await readFile(new URL('../public/horoscope/daily-calendar.mjs', import.meta.url), 'utf8');
const calendarWorkerSource = await readFile(new URL('../public/horoscope/calendar/sw.js', import.meta.url), 'utf8');
const cacheWorkers = [
  '../public/sw.js',
  '../public/horoscope/sw.js',
  '../public/horoscope/calendar/sw.js'
];

test('annual dataset covers every Tamil year from 1800 through 2399', () => {
  assert.equal(TAMIL_GRAHA_YEAR_DATA.length, 600);
  assert.equal(TAMIL_GRAHA_YEAR_DATA[0][0], 1800);
  assert.equal(TAMIL_GRAHA_YEAR_DATA.at(-1)[0], 2399);
  assert.equal(TAMIL_GRAHA_YEAR_DATA.reduce((count, year) => count + year[5].length, 0), 10772);
  for (let i = 1; i < TAMIL_GRAHA_YEAR_DATA.length; i++) {
    assert.equal(TAMIL_GRAHA_YEAR_DATA[i][0], TAMIL_GRAHA_YEAR_DATA[i - 1][0] + 1);
  }
});

test('2026 Parabhaava year preserves all 16 exact annual event segments', () => {
  const year = TAMIL_GRAHA_YEAR_DATA.find(item => item[0] === 2026);
  assert.ok(year);
  assert.equal(year[1], 'பராபவ');
  assert.equal(year[2], 'Parabhaava');
  assert.equal(year[3], '2026-04-14 09:32:40');
  assert.equal(year[4], '2027-04-14 15:28:24');
  assert.equal(year[5].length, 16);
  assert.deepEqual(TAMIL_GRAHA_PLANETS, ['செவ்வாய்', 'புதன்', 'குரு', 'சுக்கிரன்', 'சனி']);
  assert.deepEqual(TAMIL_GRAHA_TYPES, ['வக்ரம்', 'அஸ்தமனம்']);
  const counts = {};
  for (const [planet, type] of year[5]) {
    const key = TAMIL_GRAHA_PLANETS[planet] + ':' + TAMIL_GRAHA_TYPES[type];
    counts[key] = (counts[key] || 0) + 1;
  }
  assert.deepEqual(counts, {
    'செவ்வாய்:வக்ரம்': 1,
    'புதன்:வக்ரம்': 3,
    'புதன்:அஸ்தமனம்': 6,
    'குரு:வக்ரம்': 1,
    'குரு:அஸ்தமனம்': 1,
    'சுக்கிரன்:வக்ரம்': 1,
    'சுக்கிரன்:அஸ்தமனம்': 1,
    'சனி:வக்ரம்': 1,
    'சனி:அஸ்தமனம்': 1
  });
});

test('year-boundary continuations remain clipped and explicitly marked', () => {
  const year = TAMIL_GRAHA_YEAR_DATA.find(item => item[0] === 2026);
  const saturnCombustion = year[5].find(event => event[0] === 4 && event[1] === 1);
  assert.ok(saturnCombustion);
  assert.equal(saturnCombustion[3], year[4]);
  assert.equal(saturnCombustion[5], true);
  assert.equal(year[5].every(event => event[2] >= year[3] && event[3] <= year[4]), true);
});

test('Calendar table is inserted after transit with horizontal-only scrolling and intact text', async () => {
  assert.ok(calendarSource.includes("from './calendar-graha-periods-data.mjs'"));
  assert.ok(calendarSource.includes('transitCard.after(card)'));
  assert.ok(calendarSource.includes('renderAnnualGrahaPeriods();updateHora()'));
  assert.ok(calendarSource.includes('day>=start&&day<end'));
  assert.doesNotMatch(calendarSource, /அட்டவணையை முழுமையாகப் பார்க்க கிடைமட்டமாக நகர்த்தவும்|Scroll horizontally to view the full table/);
  assert.doesNotMatch(calendarSource, /ராகு–கேது|Rahu–Ketu|Not in supplied data|மூலத் தரவில் இல்லை/);
  assert.equal(TAMIL_GRAHA_PLANETS.length, 5);
  assert.ok(TAMIL_GRAHA_YEAR_DATA.every(year => year[5].every(event => Number.isInteger(event[0]) && event[0] >= 0 && event[0] < TAMIL_GRAHA_PLANETS.length)));
  assert.doesNotMatch(calendarSource, /calculateSwiss|tamilSolarDate\(/);
  assert.ok(calendarWorkerSource.includes("'../calendar-graha-periods-data.mjs'"));
  assert.ok(calendarWorkerSource.includes('calendar-graha-periods-data\\.mjs'));
  const css = await readFile(new URL('../public/horoscope/daily-calendar.css', import.meta.url), 'utf8');
  const scrollStart = css.indexOf('#smvDailyCalendar .cal-graha-period-scroll{');
  assert.notEqual(scrollStart, -1);
  const scrollRule = css.slice(scrollStart, css.indexOf('}', scrollStart));
  assert.ok(scrollRule.includes('overflow-x:auto!important'));
  assert.ok(scrollRule.includes('overflow-y:hidden!important'));
  assert.ok(scrollRule.includes('touch-action:pan-x!important'));
  assert.ok(!scrollRule.includes('overflow:auto'));
  const cellRule = css.slice(css.indexOf('#smvDailyCalendar .cal-graha-period-card th,#smvDailyCalendar .cal-graha-period-card td{'));
  assert.ok(cellRule.includes('white-space:nowrap'));
  assert.ok(cellRule.includes('word-break:keep-all'));
  assert.ok(cellRule.includes('overflow-wrap:normal'));
  assert.ok(cellRule.includes('hyphens:none'));
  assert.ok(css.includes('#smvDailyCalendar .cal-graha-period-card table{display:table!important;width:1060px!important;min-width:1060px!important;max-width:none!important'));
  assert.ok(css.includes('width:180px!important;min-width:180px!important;max-width:180px!important'));
  assert.ok(css.includes('width:440px!important;min-width:440px!important;max-width:440px!important'));
  assert.ok(css.includes('white-space:nowrap!important;word-break:keep-all!important;overflow-wrap:normal!important;hyphens:none!important'));
  assert.doesNotMatch(calendarSource, /ஆண்டு எல்லையைத் தாண்டும் நிகழ்வுகள்|Periods crossing a Tamil-year boundary|நேரங்கள் IST|Times are IST/);
  assert.ok(css.includes('#smvDailyCalendar .cal-graha-period-card thead th{background:#ededed'));
  assert.ok(!css.includes('#smvDailyCalendar .cal-graha-period-card thead th{position:sticky;top:0'));
  assert.ok(css.includes('#smvDailyCalendar .cal-graha-period-card tbody th{position:sticky;left:0'));
  assert.ok(calendarSource.includes('tabindex="0" role="region" aria-label="'));
});

test('the three application service workers use one synchronized cache release', async () => {
  const releases = [];
  for (const relative of cacheWorkers) {
    const source = await readFile(new URL(relative, import.meta.url), 'utf8');
    const match = source.match(/const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST \? '([^']+)' : '([^']+)'/);
    assert.ok(match, relative + ' must declare a scoped release');
    assert.equal(match[1], match[2]);
    releases.push(match[1]);
  }
  assert.equal(new Set(releases).size, 1);
  assert.equal(releases[0], '20261119-graha-period-table-v2');
});

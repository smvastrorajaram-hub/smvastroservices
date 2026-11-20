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

test('Calendar Graha periods render as one centered vertical list without tables, columns or scrolling', async () => {
  assert.ok(calendarSource.includes("from './calendar-graha-periods-data.mjs'"));
  assert.ok(calendarSource.includes('root.after(card)'));
  assert.ok(calendarSource.includes("host.querySelector('#calGrahaPeriodCard')?.remove()"));
  assert.ok(calendarSource.includes("card.className='cal-graha-period-card smv-css-island'"));
  assert.ok(calendarSource.includes('cal-graha-planet-name'));
  assert.ok(calendarSource.includes('cal-graha-period-start'));
  assert.ok(calendarSource.includes('cal-graha-period-end'));
  assert.ok(calendarSource.includes('renderAnnualGrahaPeriods();updateHora()'));
  assert.ok(calendarSource.includes('day>=start&&day<end'));
  const rendererStart = calendarSource.indexOf('function renderAnnualGrahaPeriods(){');
  const rendererEnd = calendarSource.indexOf('function renderDaily()', rendererStart);
  const renderer = calendarSource.slice(rendererStart, rendererEnd);
  assert.doesNotMatch(calendarSource, /<(?:table|thead|tbody|tr|th|td)\\b|cal-graha-period-table|cal-graha-period-scroll/);
  assert.doesNotMatch(calendarSource, /அட்டவணையை முழுமையாகப் பார்க்க கிடைமட்டமாக நகர்த்தவும்|Scroll horizontally to view the full table/);
  assert.doesNotMatch(calendarSource, /ஆண்டு எல்லையைத் தாண்டும் நிகழ்வுகள்|Periods crossing a Tamil-year boundary|நேரங்கள் IST|Times are IST/);
  assert.doesNotMatch(calendarSource, /ராகு–கேது|Rahu–Ketu|Not in supplied data|மூலத் தரவில் இல்லை/);
  assert.equal(TAMIL_GRAHA_PLANETS.length, 5);
  assert.ok(TAMIL_GRAHA_YEAR_DATA.every(year => year[5].every(event => Number.isInteger(event[0]) && event[0] >= 0 && event[0] < TAMIL_GRAHA_PLANETS.length)));
  assert.ok(!renderer.includes('calculateSwiss'));
  assert.ok(!renderer.includes('tamilSolarDate('));
  assert.ok(calendarWorkerSource.includes("'../calendar-graha-periods-data.mjs'"));
  assert.ok(calendarWorkerSource.includes('calendar-graha-periods-data.mjs'));
  const css = await readFile(new URL('../public/horoscope/daily-calendar.css', import.meta.url), 'utf8');
  const verticalCss = css.slice(css.indexOf('/* Annual Graha periods:'));
  assert.ok(verticalCss.includes('.cal-graha-period-planets'));
  assert.ok(verticalCss.includes('.cal-graha-planet{'));
  assert.ok(verticalCss.includes('.cal-graha-planet-name{'));
  assert.ok(verticalCss.includes('text-align:center'));
  assert.ok(verticalCss.includes('.cal-graha-period-type'));
  assert.ok(verticalCss.includes('.cal-graha-period-start'));
  assert.ok(verticalCss.includes('.cal-graha-period-end'));
  assert.ok(verticalCss.includes('display:block'));
  assert.ok(verticalCss.includes('width:100%'));
  assert.ok(!verticalCss.includes('!important'));
  assert.match(verticalCss, /\.cal-graha-period-event\{\s*display:flex;\s*flex-flow:row nowrap/);
  assert.match(verticalCss, /\.cal-graha-period-start,\s*#calGrahaPeriodCard \.cal-graha-period-end\{\s*display:inline/);
  assert.doesNotMatch(verticalCss, /overflow-x|overflow:auto|display:grid|grid-template-columns/i);
  assert.doesNotMatch(verticalCss, /color:\s*(?:red|#f00|#ff0000|rgb\(255,\s*0,\s*0\))/i);
  assert.doesNotMatch(verticalCss, /cal-graha-period-table|cal-graha-period-scroll/);
  assert.ok(calendarSource.includes('smv-css-island'));
  assert.ok(!css.includes('cal-graha-period-note'));
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
  assert.ok(releases[0], 'The synchronized cache release ID must not be empty.');
});

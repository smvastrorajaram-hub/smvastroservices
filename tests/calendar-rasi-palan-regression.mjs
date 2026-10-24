import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  RASI_PALAN_PLANETS,
  RASI_PALAN_TITLES,
  signIndex,
  houseFromRasi,
  mondayOf,
  sundayOf,
  
  readingKey,
  selectReading
} from '../public/horoscope/calendar-rasi-palan-rules.mjs';
import { currentWeek, periodReference } from '../public/horoscope/calendar/rasi-palan-periods.mjs';

const dailyCalendarSource = await readFile(new URL('../public/horoscope/daily-calendar.mjs', import.meta.url), 'utf8');
const periodsSource = await readFile(new URL('../public/horoscope/calendar/rasi-palan-periods.mjs', import.meta.url), 'utf8');
const publicRasiPalanSource = await readFile(new URL('../public/horoscope/calendar-rasi-palan.mjs', import.meta.url), 'utf8');
const calendarIndexSource = await readFile(new URL('../public/horoscope/calendar/index.html', import.meta.url), 'utf8');
const adminPageSource = await readFile(new URL('../public/horoscope/calendar/admin.html', import.meta.url), 'utf8');
const adminModuleSource = await readFile(new URL('../public/horoscope/calendar/calendar-admin.mjs', import.meta.url), 'utf8');
const calendarForecastAdminSource = await readFile(new URL('../public/horoscope/calendar-rasi-palan-admin.mjs', import.meta.url), 'utf8');
const horoscopeAdminWorkbenchSource = await readFile(new URL('../public/horoscope/prediction-admin-workbench.mjs', import.meta.url), 'utf8');
const horoscopeAdminSource = await readFile(new URL('../public/horoscope/prediction-admin.mjs', import.meta.url), 'utf8');
const calendarWorkerSource = await readFile(new URL('../public/horoscope/calendar/sw.js', import.meta.url), 'utf8');
const rasiPalanCss = await readFile(new URL('../public/horoscope/calendar-rasi-palan.css', import.meta.url), 'utf8');

test('The forecast registry keeps eight non-Moon planets separate from the dedicated Moon transit card', () => {
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

test('Daily is fixed to the supplied current date; weekly uses the current Sunday–Saturday and monthly uses the full current month', () => {
  assert.deepEqual(periodReference('daily', '2026-10-24'), {date:'2026-10-24',key:'2026-10-24',start:'2026-10-24',end:'2026-10-24'});
  assert.equal(mondayOf('2026-10-24'), '2026-10-19');
  assert.equal(sundayOf('2026-10-24'), '2026-10-18');
  assert.deepEqual(currentWeek('2026-10-24'), {start:'2026-10-18',end:'2026-10-24'});
  assert.deepEqual(periodReference('weekly', '2026-10-24'), {date:'2026-10-18',key:'2026-10-18',start:'2026-10-18',end:'2026-10-24'});
  assert.deepEqual(periodReference('weekly', '2026-10-25'), {date:'2026-10-25',key:'2026-10-25',start:'2026-10-25',end:'2026-10-31'});
  assert.deepEqual(periodReference('monthly', '2026-10-24'), {date:'2026-10-01',key:'2026-10',start:'2026-10-01',end:'2026-10-31'});
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

test('Moon transit appears first, the eight other planets remain separate, and old duplicate forecast blocks are removed', () => {
  assert.match(publicRasiPalanSource, /function renderMoonTransit/);
  assert.ok(publicRasiPalanSource.includes('renderMoonTransit(result, rasiIndex) + cards'));
  assert.match(publicRasiPalanSource, /const moonKey = entryFor\(result, rasiIndex, 'Moon'/);
  assert.match(publicRasiPalanSource, /const selected = modeText\(automatic, moonKey, result\.type\)/);
  assert.match(publicRasiPalanSource, /'daily', 'weekly', 'monthly', 'tamilNewYear', 'englishNewYear'/);
  assert.match(publicRasiPalanSource, /positions\.moonSign == null/);
  assert.match(dailyCalendarSource, /Birth Star, Tara Bala & Chandrashtama/);
  assert.match(dailyCalendarSource, /Tara Bala/);
  assert.match(dailyCalendarSource, /Chandrashtama/);
  assert.doesNotMatch(dailyCalendarSource, /Daily Rasi Palan/);
  assert.doesNotMatch(dailyCalendarSource, /All eight transit planets/);
});

test('Public Calendar supports a selected reference date and period keys for daily, weekly, and monthly readings', () => {
  assert.match(publicRasiPalanSource, /id="rpDate"/);
  assert.match(publicRasiPalanSource, /state\.date = value/);
  assert.doesNotMatch(publicRasiPalanSource, /id="rpYear"|#rpYear|Choose a date first/);
  assert.match(publicRasiPalanSource, /periodReference/);
  assert.match(periodsSource, /currentWeek/);
  assert.match(publicRasiPalanSource, /Day: |நாள்: /);
  assert.match(publicRasiPalanSource, /Week: |வாரம்: /);
  assert.match(publicRasiPalanSource, /Month: |மாதம்: /);
  assert.match(publicRasiPalanSource, /publishedTargetYear/);
  assert.match(calendarForecastAdminSource, /targetYear/);
  assert.match(calendarForecastAdminSource, /targetEventDate/);
});
test('Public Calendar does not expose prediction mode, editor/export, or the removed calculation note', () => {
  assert.doesNotMatch(publicRasiPalanSource, /Prediction mode|பலன் முறை/);
  assert.doesNotMatch(publicRasiPalanSource, /Manual Entry editor|கையேடு பதிவு திருத்தி/);
  assert.doesNotMatch(publicRasiPalanSource, /Export manual JSON|exportManualJson/);
  assert.doesNotMatch(publicRasiPalanSource, /Automatic uses local Swiss Ephemeris/);
  assert.doesNotMatch(publicRasiPalanSource, /தானியங்கி முறையில் உள்ளூர் Swiss Ephemeris நிரயண கிரக நிலைகளும்/);
  assert.doesNotMatch(dailyCalendarSource, /cal-engine-note|Calculation & prediction method|கணக்கீடு & பலன் முறை/);
  assert.doesNotMatch(publicRasiPalanSource, /rp-mode-chip|rp-manual-editor/);
});

test('Calendar manual predictions are managed inside the existing Horoscope Admin session', () => {
  assert.match(calendarIndexSource, /calendar-rasi-palan\.mjs/);
  assert.doesNotMatch(calendarIndexSource, /calendar-admin\.mjs/);
  assert.match(calendarIndexSource, /href="\.\/" aria-current="page">SMV CALENDAR/);
  assert.match(horoscopeAdminSource, /smvAdminRulesPanel|smvAdminRulesAccess/);
  assert.match(horoscopeAdminWorkbenchSource, /import \{ mountCalendarRasiPalanAdmin \} from '\.\/calendar-rasi-palan-admin\.mjs'/);
  assert.match(horoscopeAdminWorkbenchSource, /mountCalendarRasiPalanAdmin\(wb, auth\)/);
  assert.match(horoscopeAdminWorkbenchSource, /smv-prediction-admin-auth/);
  assert.match(horoscopeAdminSource, /smv_settings', 'prediction_editor_access/);
  assert.match(calendarForecastAdminSource, /smv_content', 'calendar_rasi_palan_v1/);
  for (const type of ['daily','weekly','monthly','tamilNewYear','englishNewYear','jupiterTransit','saturnTransit','rahuKetuTransit']) {
    assert.ok(calendarForecastAdminSource.includes(type), 'Calendar admin editor should support '+type);
  }
  assert.match(calendarForecastAdminSource, /\['Moon', \.\.\.RASI_PALAN_PLANETS\.map\(p => p\.key\)\]/);
  assert.doesNotMatch(calendarForecastAdminSource, /signInWithEmailAndPassword|Admin Password|id="loginForm"/, 'Calendar editor must reuse Horoscope Admin authentication instead of adding another login');
  assert.match(calendarForecastAdminSource, /getDocFromServer/);
  assert.match(calendarForecastAdminSource, /setDoc/);
});
test('Planetary ingress section computes only the latest past transit per planet group, never a future ingress list', () => {
  assert.match(publicRasiPalanSource, /async function findLastIngress\(body, asOfDate, cfg\)/);
  assert.match(publicRasiPalanSource, /Showing only the latest past ingress for each group/);
  assert.doesNotMatch(publicRasiPalanSource, /events\.filter\(e => e\.date >= start/);
});

test('Selecting the already-active public section does not rebuild the entire Calendar UI', () => {
  assert.match(publicRasiPalanSource, /const nextSection = button\.dataset\.section;\s+if \(state\.section === nextSection\) return;/);
})
 
test('Selected Rasi controls all forecast periods and is preserved across sections', () => {
   assert.ok(publicRasiPalanSource.includes('id="rpRasi"'));
   assert.ok(publicRasiPalanSource.includes('selectedRasiStorageKey'));
   assert.ok(publicRasiPalanSource.includes('state.rasiIndex = value'));
   assert.ok(publicRasiPalanSource.includes('data-rasi-index'));
   assert.ok(publicRasiPalanSource.includes('const rasi = rasiLabels[rasiIndex];'));
   assert.ok(publicRasiPalanSource.includes("calendarHost.insertAdjacentElement('afterend', root)"));
   assert.ok(publicRasiPalanSource.includes("document.getElementById('calRasi')"));
});

test('Calendar has no separate Admin entry; legacy Admin URL redirects to Horoscope Admin and remains safely cached', () => {
   assert.ok(calendarIndexSource.includes('<a class="is-current" href="./" aria-current="page">SMV CALENDAR</a>'));
   assert.ok(!calendarIndexSource.includes('href="./admin.html"'));
   assert.ok(adminPageSource.includes('<title>SMV HOROSCOPE · Admin</title>'));
   assert.ok(adminPageSource.includes('location.replace(target)'));
   assert.ok(adminPageSource.includes("location.origin+'/horoscope/?admin=1'"));
   assert.ok(adminPageSource.includes('https://horoscope.smvastroservices.in/?admin=1'));
   assert.doesNotMatch(adminPageSource, /id="loginForm"|id="adminPassword"|id="publish"/);
   assert.ok(calendarWorkerSource.includes("'./admin.html'"), 'Legacy route remains cached for old bookmarks');
   assert.ok(calendarWorkerSource.includes("const cacheKey=cacheURL('./'+relativePath);"), 'Offline route cache keys must be absolute URLs');
   assert.ok(calendarWorkerSource.includes("const cacheURL = path => new URL(path, self.registration.scope).href"), 'Precache must resolve relative assets against the service-worker scope');
   assert.ok(calendarWorkerSource.includes("requestedPath==='admin'||requestedPath==='admin/'?'admin.html'"), 'Legacy /admin route redirects through its cached HTML');
   assert.ok(calendarWorkerSource.includes("const CACHE='smv-calendar-forecast-assets-v4'"), 'Cache version updates existing PWA installs');
   assert.ok(!calendarWorkerSource.includes('calendar-admin.mjs'), 'The standalone Calendar Admin module is not downloaded or cached');
   assert.ok(calendarWorkerSource.includes('const REQUIRED_CORE = new Set(['));
   assert.ok(calendarWorkerSource.includes('await preserveCachedIndiaPlaces(target)'), 'Previously cached India place shards must survive cache migration');
   assert.ok(!calendarWorkerSource.includes('PLACE_SHARDS.map'), 'PWA must not download every India location shard during install');
   assert.ok(calendarWorkerSource.includes('cached lazily when the user searches'), 'Missing India shards continue to cache lazily');
   assert.ok(calendarWorkerSource.includes('c.match(cacheKey)'));
   assert.ok(calendarIndexSource.includes('20261024-admin-cache-v5'));
   assert.ok(calendarIndexSource.includes('20261024-admin-cache-v4'));
   assert.ok(calendarIndexSource.includes('20261024-moon-transit-admin-v1'));
   assert.ok(rasiPalanCss.includes('max-width:960px;margin:24px auto'));
   assert.ok(rasiPalanCss.includes('.rp-planets-grid{display:grid;grid-template-columns:1fr;gap:0}'));
   assert.ok(rasiPalanCss.includes('.rp-planet{min-width:0;padding:12px 0;border:0;border-bottom:1px solid #d9e5dc'));
});
test('Rasi Palan uses the lightweight local Swiss WASM transit path rather than the full natal-report engine', () => {
  assert.match(publicRasiPalanSource, /getSwe, C as SWE.*wasm-provider\.mjs/);
  assert.match(publicRasiPalanSource, /async function chartAtLocalTime\(date, time, cfg\)/);
  assert.match(publicRasiPalanSource, /swe\.siderealSpeedFlags\(\)/);
  assert.match(publicRasiPalanSource, /transitChartCache/);
  assert.doesNotMatch(publicRasiPalanSource, /calculateSwiss\(/);
});

test('Public forecast rendering does not block on the asynchronous Admin content read', () => {
  assert.doesNotMatch(publicRasiPalanSource, /await publishedManualReady/);
  assert.match(publicRasiPalanSource, /publishedManualReady = loadPublishedManual\(\)\.then\(\(\) => \{/);
  assert.match(publicRasiPalanSource, /else renderLastResult\(\)/);
});

test('Public calendar takes published mode/data from Firestore online and uses bundled JSON offline', () => {
  assert.match(publicRasiPalanSource, /smv_content', 'calendar_rasi_palan_v1'/);
  assert.match(publicRasiPalanSource, /if \(navigator\.onLine\)/);
  assert.match(publicRasiPalanSource, /calendar-rasi-palan-manual\.json/);
  assert.match(publicRasiPalanSource, /publishedMode = 'hybrid'/);
  assert.match(publicRasiPalanSource, /supportsPublishedManual/);
});

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
const horoscopeAuthSource = await readFile(new URL('../public/horoscope/horoscope-auth.mjs', import.meta.url), 'utf8');
const horoscopeAdminWorkbenchSource = await readFile(new URL('../public/horoscope/prediction-admin-workbench.mjs', import.meta.url), 'utf8');
const horoscopeAdminSource = await readFile(new URL('../public/horoscope/prediction-admin.mjs', import.meta.url), 'utf8');
const calendarWorkerSource = await readFile(new URL('../public/horoscope/calendar/sw.js', import.meta.url), 'utf8');
const calendarCalculationWorkerSource = await readFile(new URL('../public/horoscope/calendar-worker.mjs', import.meta.url), 'utf8');
const swissCalculationSource = await readFile(new URL('../public/horoscope/offline/swiss_vedic.browser.mjs', import.meta.url), 'utf8');
const transitPanchangSource = await readFile(new URL('../public/horoscope/offline/transit_panchang.browser.mjs', import.meta.url), 'utf8');
const rasiPalanCss = await readFile(new URL('../public/horoscope/calendar-rasi-palan.css', import.meta.url), 'utf8');
const horoscopeIndexSource = await readFile(new URL('../public/horoscope/index.html', import.meta.url), 'utf8');
const horoscopeLanguageSource = await readFile(new URL('../public/horoscope/horoscope-language.js', import.meta.url), 'utf8');
const publicHeadersSource = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');

test('The Horoscope Matching navigation label uses the requested concise Tamil wording', () => {
  assert.match(horoscopeLanguageSource, /'Matching':'பொருத்தம்'/);
  assert.doesNotMatch(horoscopeLanguageSource, /'Matching':'திருமணப் பொருத்தம்'/);
});

test('Horoscope Admin Rules and Calendar use the existing login without a separate header Admin button', () => {
  assert.equal(horoscopeIndexSource.includes('id="smvAdminRulesAccess"'), false, 'The fixed/header Admin button must be removed');
  assert.ok(horoscopeIndexSource.includes('id="smvAdminToolsEntry" hidden'), 'Admin tools stay hidden until the Horoscope login validates an Admin account');
  assert.ok(horoscopeIndexSource.includes('id="smvAdminOpenTools"'), 'Authenticated admins have a page-level entry to reopen the console');
  assert.match(horoscopeAuthSource, /getDocFromServer\(fsMod\.doc\(fs,'smv_settings','prediction_editor_access'\)\)/);
  assert.match(horoscopeAuthSource, /detail:\{loggedIn:true,uid:u\.uid,role,isAdmin\}/);
  assert.match(horoscopeAuthSource, /state\.user\?\.isAdmin===true/);
  assert.match(horoscopeAdminSource, /smv-horoscope-local/);
  assert.doesNotMatch(horoscopeAdminSource, /smv-prediction-admin-auth|smvAdminLoginForm|signInWithEmailAndPassword/);
  assert.match(horoscopeAdminSource, /window\.addEventListener\('smv:horoscope-local-auth'/);
  assert.match(horoscopeAdminWorkbenchSource, /smv-horoscope-local/);
  assert.doesNotMatch(horoscopeAdminWorkbenchSource, /smv-prediction-admin-auth|smvAdminRulesAccess|smvAdminLoginForm/);
  assert.ok(horoscopeAdminWorkbenchSource.includes("window.addEventListener('smv:admin-console-open'"), 'Workbench starts only after authenticated Admin console opens');
  assert.match(calendarForecastAdminSource, /smv-horoscope-local/);
  assert.doesNotMatch(calendarForecastAdminSource, /smv-prediction-admin-auth/);
});

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
  assert.deepEqual(currentWeek('2026-10-24'), {start:'2026-10-17',end:'2026-10-24'});
  assert.deepEqual(periodReference('weekly', '2026-10-24'), {date:'2026-10-17',key:'2026-10-17',start:'2026-10-17',end:'2026-10-24'});
  assert.deepEqual(periodReference('weekly', '2026-10-21'), {date:'2026-10-17',key:'2026-10-17',start:'2026-10-17',end:'2026-10-24'});
  assert.deepEqual(periodReference('weekly', '2026-10-25'), {date:'2026-10-25',key:'2026-10-25',start:'2026-10-25',end:'2026-11-01'});
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
  assert.match(dailyCalendarSource, /Transit Moon Rasi/);
  assert.match(dailyCalendarSource, /signs\[moonSign\]\[ta\(\)\?1:0\]/);
  assert.match(dailyCalendarSource, /Chandrashtama/);
  assert.doesNotMatch(dailyCalendarSource, /Daily Rasi Palan/);
  assert.doesNotMatch(dailyCalendarSource, /All eight transit planets/);
});

test('Public Rasi Palan uses the current local date automatically and calculates weekly windows', () => {
  assert.doesNotMatch(publicRasiPalanSource, /rpDate/);
  assert.match(publicRasiPalanSource, /state\.date = defaultDate\(\)/);
  assert.doesNotMatch(publicRasiPalanSource, /id="rpYear"|#rpYear|Choose a date first/);
  assert.match(publicRasiPalanSource, /periodReference/);
  assert.match(periodsSource, /currentWeek/);
  assert.match(publicRasiPalanSource, /Day: |நாள்: /);
  assert.match(publicRasiPalanSource, /Week: |வாரம்: /);
  assert.match(publicRasiPalanSource, /English calendar month: |ஆங்கில மாதம்: /);
  assert.match(publicRasiPalanSource, /Tamil solar month: |தமிழ் மாதம்: /);
  assert.match(publicRasiPalanSource, /runMonthlyForecasts\(\)/);
  assert.match(publicRasiPalanSource, /tamilSolarMonthRange\(today, cfg\)/);
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
  assert.ok(calendarIndexSource.includes('<a href="https://smvastroservices.in/" target="_blank" rel="noopener" data-en="Services" data-ta="சேவைகள்">Services</a>'));
  assert.ok(calendarIndexSource.includes('<a href="https://horoscope.smvastroservices.in/" target="_blank" rel="noopener" data-en="Horoscope" data-ta="ஜாதகம்">Horoscope</a>'));
  assert.ok(calendarIndexSource.includes('smv-calendar-header-language'));
  assert.ok(calendarIndexSource.includes('https://smvastroservices.pages.dev/horoscope/calendar-rasi-palan.mjs'));
  assert.ok(publicHeadersSource.includes('/horoscope/calendar-rasi-palan.mjs'));
  assert.ok(publicHeadersSource.includes('/horoscope/calendar-rasi-palan.css'));
  assert.ok(publicHeadersSource.includes('/horoscope/calendar-rasi-palan-admin.mjs'), 'Canonical Calendar Admin module needs an explicit cross-origin response rule');
  assert.ok(publicHeadersSource.includes('Access-Control-Allow-Origin: *'));
  assert.ok(publicHeadersSource.includes('Cross-Origin-Resource-Policy: cross-origin'));
  assert.doesNotMatch(calendarIndexSource, /class="is-current" href="\.\/" aria-current="page">SMV CALENDAR/);
  assert.match(horoscopeAdminSource, /smvAdminRulesPanel|smvAdminRulesAccess/);
  assert.ok(horoscopeAdminWorkbenchSource.includes('async function loadCalendarRasiPalanAdminModule()'), 'Calendar Admin must have a recoverable module loader');
  assert.ok(horoscopeAdminWorkbenchSource.includes("new URL('./calendar-rasi-palan-admin.mjs?v='"), 'Local module request must carry a cache-version marker');
  assert.ok(horoscopeAdminWorkbenchSource.includes("const canonical='https://smvastroservices.pages.dev/horoscope/calendar-rasi-palan-admin.mjs?v='"), 'Canonical Pages source is used if the Horoscope-host module cannot load');
  assert.ok(horoscopeAdminWorkbenchSource.includes('https://smvastroservices.pages.dev/horoscope/calendar-rasi-palan-admin.mjs?v='), 'Canonical Pages source is used if the Horoscope-host module cannot load');
  assert.ok(horoscopeAdminWorkbenchSource.includes('loadCalendarRasiPalanAdminModule().then'), 'Calendar editor loads through the recoverable loader');
  assert.match(horoscopeAdminWorkbenchSource, /mountCalendarRasiPalanAdmin\(wb, auth\)/);
  assert.match(horoscopeAdminWorkbenchSource, /smv-horoscope-local/);
  assert.match(horoscopeAdminSource, /smv_settings','prediction_editor_access/);
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
   assert.ok(calendarIndexSource.includes('<a href="https://smvastroservices.in/" target="_blank" rel="noopener" data-en="Services" data-ta="சேவைகள்">Services</a>'));
   assert.ok(calendarIndexSource.includes('<a href="https://horoscope.smvastroservices.in/" target="_blank" rel="noopener" data-en="Horoscope" data-ta="ஜாதகம்">Horoscope</a>'));
   assert.doesNotMatch(calendarIndexSource, /class="is-current" href="\.\/" aria-current="page">SMV CALENDAR/);
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
   assert.ok(calendarWorkerSource.includes("const CACHE='smv-calendar-forecast-assets-v7'"), 'Cache version updates existing PWA installs');
   assert.ok(!calendarWorkerSource.includes('calendar-admin.mjs'), 'The standalone Calendar Admin module is not downloaded or cached');
   assert.ok(calendarWorkerSource.includes('const REQUIRED_CORE = new Set(['));
   assert.ok(calendarWorkerSource.includes('await preserveCachedIndiaPlaces(target)'), 'Previously cached India place shards must survive cache migration');
   assert.ok(!calendarWorkerSource.includes('PLACE_SHARDS.map'), 'PWA must not download every India location shard during install');
   assert.ok(calendarWorkerSource.includes('cached lazily when the user searches'), 'Missing India shards continue to cache lazily');
   assert.ok(calendarWorkerSource.includes('c.match(cacheKey)'));
   assert.ok(calendarIndexSource.includes('20261024-admin-cache-v7'));
   assert.ok(calendarIndexSource.includes('20261024-sunmoon-regex-fix-v3'));
   assert.ok(calendarIndexSource.includes('20261024-sunmoon-regex-fix-v3'));
   assert.ok(calendarIndexSource.includes('smv-calendar-rasi-palan-loader'));
   assert.ok(calendarIndexSource.includes('20261025-cross-host-assets-header-ta-v1'));
   assert.ok(calendarIndexSource.includes('moduleText.includes(\'function renderControls\')'));
   assert.ok(calendarIndexSource.includes('moduleText.includes(\'runPeriodForecast\')'));
   assert.ok(calendarIndexSource.includes('The deployed forecast assets could not be loaded from this Calendar host.'));
   assert.ok(!calendarIndexSource.includes('href="https://horoscope.smvastroservices.in/" target="_blank" rel="noopener">SMV HOROSCOPE</a>'));
   assert.ok(rasiPalanCss.includes('width:100%;max-width:960px;margin:24px auto'));
   assert.ok(horoscopeIndexSource.includes('<a href="https://smvastroservices.in/" data-horoscope-nav>Services</a>'));
   for (const entry of ["'Services':'சேவைகள்'", "'Matching':'பொருத்தம்'", "'Calendar':'நாட்காட்டி'", "'Horoscope':'ஜாதகம்'", "'Login':'உள்நுழை'", "'Register':'பதிவு செய்க'", "'Logout':'வெளியேறு'", "'Admin Login':'நிர்வாக உள்நுழைவு'"]) assert.ok(horoscopeLanguageSource.includes(entry), 'Missing Tamil header label mapping: '+entry);
   assert.ok(!horoscopeIndexSource.includes('data-horoscope-nav>SERVICES</a>'));
   assert.ok(!horoscopeIndexSource.includes('<a href="#english-horoscope" data-horoscope-nav>'));
   assert.ok(!horoscopeAdminWorkbenchSource.includes('border:1px solid #dcc59e'));
   assert.ok(!horoscopeAdminWorkbenchSource.includes('border:1px solid #e5d8c2'));
   assert.ok(calendarForecastAdminSource.includes("root.className = 'wb-inline-section'"));
   assert.ok(calendarForecastAdminSource.includes('padding:0;border:0;border-radius:0;background:transparent'));
   assert.ok(!calendarForecastAdminSource.includes('SMV CALENDAR · ராசி பலன்கள்'));
   assert.ok(rasiPalanCss.includes('.rp-planets-grid{display:grid;grid-template-columns:1fr;gap:0}'));
   assert.ok(rasiPalanCss.includes('.rp-planet{min-width:0;padding:12px 0;border:0;border-bottom:1px solid #d9e5dc'));
});
test('The lightweight Sun/Moon path accepts ordinary Calendar date/time formats without double-escaped digit classes', () => {
  const start = swissCalculationSource.indexOf('export function calculateSunMoonSync');
  const end = swissCalculationSource.indexOf('export async function calculateSunMoon', start);
  assert.ok(start >= 0 && end > start, 'Lightweight calculation must remain available');
  const validation = swissCalculationSource.slice(start, end);
  const slash = String.fromCharCode(92);
  assert.ok(validation.includes('ts.match(/^(' + slash + 'd{1,2}):(' + slash + 'd{2})$/);'));
  assert.ok(validation.includes('if(!/^' + slash + 'd{4}-' + slash + 'd{2}-' + slash + 'd{2}$/.test(ds)||!m)'));
  assert.doesNotMatch(validation, /\\\\d/, 'Regexes must not match literal backslash-d sequences');
});

test('Panchang boundary searches use cached lightweight Sun/Moon calculations and share one full daily chart', () => {
  assert.match(swissCalculationSource, /export function calculateSunMoonSync/);
  assert.match(transitPanchangSource, /calculateSunMoonSync/);
  assert.match(transitPanchangSource, /const panchangLongitudeCache = new Map\(\)/);
  assert.match(transitPanchangSource, /preCalculatedChart=null/);
  assert.match(calendarCalculationWorkerSource, /calculateSunMoon/);
  assert.match(calendarCalculationWorkerSource, /const chart=await calculateSwiss\(input\);const p=panchang\(input,chart\),t=transit\(input,chart\)/);
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
  assert.match(publicRasiPalanSource, /selectReading\(supportsPublishedManual \? publishedMode : 'automatic'/);
  assert.match(publicRasiPalanSource, /Swiss Ephemeris · programmed rules/);
});

test('Weekly and monthly date ranges use valid digit classes for DD/MM/YYYY formatting', () => {
  const dateMatcher = String.raw`match(/^(\d{4})-(\d{2})-(\d{2})$/)`;
  assert.ok(publicRasiPalanSource.includes(dateMatcher), 'ISO dates must parse before formatting weekly/monthly period ranges');
  assert.doesNotMatch(publicRasiPalanSource, /match\(\/\^\(\\\\d\{4\}\)/, 'Date-range regex must not match literal backslash-d');
});

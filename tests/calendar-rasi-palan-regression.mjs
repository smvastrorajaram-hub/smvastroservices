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
import { calculateSwiss, calculateSunMoonSync } from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import { panchang, solarNoaa } from '../public/horoscope/offline/transit_panchang.browser.mjs';
import { calculateRasiManaForLocation, calculateSolarSignRasiMana, calculateRemainingRasiMana, meanObliquityAtJulianDay } from '../public/horoscope/offline/rasi-mana.browser.mjs';
import { TAMIL_DAY_YOGA_TABLE, getTamilDayYoga, getTamilCalendarDayFlags } from '../public/horoscope/tamil-day-classifications.mjs';

const dailyCalendarSource = await readFile(new URL('../public/horoscope/daily-calendar.mjs', import.meta.url), 'utf8');
const dailyCalendarCssSource = await readFile(new URL('../public/horoscope/daily-calendar.css', import.meta.url), 'utf8');
const calendarThemeCssSource = await readFile(new URL('../public/horoscope/calendar-theme.css', import.meta.url), 'utf8');
const tamilDayClassificationsSource = await readFile(new URL('../public/horoscope/tamil-day-classifications.mjs', import.meta.url), 'utf8');
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
const horoscopeResultSource = await readFile(new URL('../public/horoscope/horoscope.js', import.meta.url), 'utf8');
const rootTransitPanchangSource = await readFile(new URL('../transit_panchang.js', import.meta.url), 'utf8');
const rasiPalanCss = await readFile(new URL('../public/horoscope/calendar-rasi-palan.css', import.meta.url), 'utf8');
const horoscopeIndexSource = await readFile(new URL('../public/horoscope/index.html', import.meta.url), 'utf8');
const horoscopeLanguageSource = await readFile(new URL('../public/horoscope/horoscope-language.js', import.meta.url), 'utf8');
const publicHeadersSource = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');

test('Place-based Rasi Mana uses Oblique Ascension consistently for Indian and worldwide latitudes', () => {
  const places = [
    ['Perambalur', 11.2342], ['Chennai', 13.0827], ['Tiruchirappalli', 10.79],
    ['London', 51.5074], ['New York', 40.7128], ['Sydney', -33.8688],
    ['Tokyo', 35.6762], ['Quito', -0.1807]
  ];
  const results = places.map(([name, latitude]) => ({
    name,
    result: calculateRasiManaForLocation({
      latitude, ayanamsaDegrees: 24.25, obliquityDegrees: 23.436
    })
  }));
  for (const {name, result} of results) {
    assert.equal(result.available, true, name + ' must have all 12 rising signs');
    assert.equal(result.rows.length, 12, name + ' must calculate all 12 Rasi durations');
    assert.ok(Math.abs(result.rows.reduce((sum, row) => sum + row.durationDegrees, 0) - 360) < 1e-8,
      name + ' OA durations must cover exactly 360 degrees');
    assert.equal(result.rows.reduce((sum, row) => sum + row.totalVighati, 0), 3600,
      name + ' rounded Rasi Mana must total exactly 60 nazhigai');
    for (const row of result.rows) {
      assert.ok(row.durationSeconds > 0 && row.durationSeconds < 6 * 3600,
        name + ' Rasi duration must be a positive and plausible rising interval');
      assert.equal(row.nazhigai * 60 + row.vinazhigai, row.totalVighati,
        name + ' nazhigai/vinazhigai must agree with the allocated vighati');
    }
  }
  const perambalur = results[0].result.rows;
  const chennai = results[1].result.rows;
  assert.ok(perambalur.some((row, index) =>
    Math.abs(row.durationDegrees - chennai[index].durationDegrees) > 1e-5),
    'Changing latitude from Perambalur to Chennai must change Rasi Mana');
  for (const solarSignIndex of [6, 7]) {
    const balance = calculateSolarSignRasiMana({
      solarSignIndex,
      latitude: 11.2342,
      ayanamsaDegrees: 24.25,
      obliquityDegrees: 23.436
    });
    assert.equal(balance.available, true);
    assert.equal(balance.method, 'solar-sign-oblique-ascension');
    assert.equal(balance.signIndex, solarSignIndex);
    assert.equal(balance.selectedRasiMana.signIndex, solarSignIndex);
    assert.equal(balance.balanceNazhigai, balance.selectedRasiMana.nazhigai);
    assert.equal(balance.balanceVinazhigai, balance.selectedRasiMana.vinazhigai);
    assert.equal(balance.balanceSeconds, balance.selectedRasiMana.totalVighati * 24);
    assert.equal(balance.rasiMana.rows.reduce((sum, row) => sum + row.totalVighati, 0), 3600);
  }
});

test('Polar Rasi Mana explicitly reports signs that do not rise instead of fabricating durations', () => {
  const result = calculateRasiManaForLocation({
    latitude: 75, ayanamsaDegrees: 24.25, obliquityDegrees: 23.436
  });
  assert.equal(result.available, false);
  assert.ok(result.rows.some(row => !row.available),
    'Circumpolar signs must be marked unavailable');
  assert.ok(result.rows.some(row => row.reason === 'circumpolar-or-invalid-rising-arc'));
});

test('Mean obliquity is calculated from the selected UT Julian Day', () => {
  const value = meanObliquityAtJulianDay(2461360.0);
  assert.ok(value > 23.4 && value < 23.5);
});

test('Solar-sign Rasi Mana starts full at local sunrise and counts down by elapsed local time', () => {
  const atSunrise = calculateRemainingRasiMana({
    totalVighati: 329, sunrise: '06:00', selectedTime: '06:00'
  });
  assert.equal(atSunrise.balanceNazhigai, 5);
  assert.equal(atSunrise.balanceVinazhigai, 29);
  assert.equal(atSunrise.elapsedSeconds, 0);
  assert.equal(atSunrise.balanceSeconds, 329 * 24);

  const beforeSunrise = calculateRemainingRasiMana({
    totalVighati: 329, sunrise: '06:00', selectedTime: '05:30'
  });
  assert.equal(beforeSunrise.balanceSeconds, atSunrise.fullBalanceSeconds,
    'Before sunrise the new day has not consumed any of its Rasi Mana.');

  const oneHourLater = calculateRemainingRasiMana({
    totalVighati: 329, sunrise: '06:00', selectedTime: '07:00'
  });
  assert.equal(oneHourLater.elapsedSeconds, 3600);
  assert.equal(oneHourLater.remainingVighati, 179,
    'One elapsed hour must subtract exactly 150 vighati (one hour / 24 seconds).');
  assert.equal(oneHourLater.balanceNazhigai, 2);
  assert.equal(oneHourLater.balanceVinazhigai, 59);

  const exhausted = calculateRemainingRasiMana({
    totalVighati: 329, sunrise: '06:00', selectedTime: '08:30'
  });
  assert.equal(exhausted.remainingVighati, 0);
  assert.equal(exhausted.balanceNazhigai, 0);
  assert.equal(exhausted.balanceVinazhigai, 0,
    'An exhausted balance must clamp to zero, never become negative.');
});

test('Calendar Rasi Mana selects the complete OA duration for the local solar-ingress sign, independently of current Lagna', () => {
  assert.match(calendarCalculationWorkerSource, /calculateSolarSignRasiMana/);
  assert.match(calendarCalculationWorkerSource, /calculateLahiriContextAt/);
  assert.match(calendarCalculationWorkerSource, /rasiManaSignIndex:rasi\.signIndex/);
  assert.doesNotMatch(calendarCalculationWorkerSource, /calculateAscendantAt|calculateLagnaBalanceFromRasiMana|armcDegrees:/,
    'The solar-sign Rasi Mana path must not use the actual Ascendant or ARMC remainder.');
  assert.match(swissCalculationSource, /export async function calculateLahiriContextAt/);
  assert.doesNotMatch(swissCalculationSource, /export async function calculateAscendantAt/,
    'The old ascendant-only solar-ingress source must be removed.');
  assert.match(transitPanchangSource, /nextIngress<sunsetTs/,
    'An ingress after local sunset must move to the next sunrise interval.');
  assert.ok(calendarWorkerSource.includes('../offline/rasi-mana.browser.mjs'),
    'The calculation module must be included in the Calendar PWA cache');
  assert.match(calendarCalculationWorkerSource, /calculateRemainingRasiMana/);
  assert.match(calendarCalculationWorkerSource, /fullBalanceVighati:rasi\.totalVighati/);
  assert.match(dailyCalendarSource, /calculateRemainingRasiMana/);
  assert.match(calendarCalculationWorkerSource, /const selectedTime=sunrise/,
    'Each selected date must use its own local sunrise as the fixed Rasi Mana reference time.');
  assert.doesNotMatch(dailyCalendarSource, /const balanceTime=localNowAt/,
    'The current clock must not be used to count down the selected date\'s Rasi Mana.');
  assert.match(dailyCalendarSource, /workerCall\('solar-sign-rasi-mana',dayInput\)/,
    'The unchanged day input is sent; the Rasi Mana worker anchors its balance to sunrise.');
  assert.match(dailyCalendarSource, /balance\.selectedTime\|\|sunrise/,
    'The rendered balance must use the sunrise reference returned by the worker.');
  assert.match(dailyCalendarSource, /Balance fixed until next sunrise/);
  assert.match(dailyCalendarSource, /அடுத்த சூ\.உதயம் வரை இருப்பு மாறாது/);

  assert.match(dailyCalendarSource, /renderMuhurtaLagna\(\)\}/,
    'The current-day balance must refresh using the existing minute timer.');
});;


test('Date Details displays three separate results and uses only the concise negative Muhurtham value', () => {
  assert.match(dailyCalendarSource, /L\('No','இல்லை'\)/);
  assert.match(dailyCalendarSource, /ராசி மான லக்ன இருப்பு/);
  assert.match(dailyCalendarSource, /daily\.solarSignRasiMana/);
  assert.match(calendarThemeCssSource, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(calendarThemeCssSource, /grid-template-columns:1fr/);
});
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
   assert.ok(calendarWorkerSource.includes("const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261116-calendar-sunrise-constant-rasi-mana-pages-v1' : '20261116-calendar-sunrise-constant-rasi-mana-in-v1'"), 'Calendar bumps its host-specific release marker for public content updates');
   assert.ok(calendarWorkerSource.includes("const CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"), 'Cache version updates existing PWA installs without changing its independent namespace');
   assert.ok(calendarWorkerSource.includes("'../tamil-day-classifications.mjs'"), 'Tamil day flags and Amirthathi lookup remain available in the Calendar offline core');
   assert.ok(!calendarWorkerSource.includes('calendar-admin.mjs'), 'The standalone Calendar Admin module is not downloaded or cached');
   assert.ok(calendarWorkerSource.includes('const REQUIRED_CORE = new Set(['));
   assert.ok(calendarWorkerSource.includes('await preserveCachedIndiaPlaces(target)'), 'Previously cached India place shards must survive cache migration');
   assert.ok(calendarWorkerSource.includes('prefetchIndiaPlaceShards'), 'Calendar downloads the complete India offline location pack during first online install');
   assert.ok(calendarWorkerSource.includes("'../offline/places/india/'"), 'Calendar caches every India place shard from the shared static asset path');
   assert.ok(calendarWorkerSource.includes('c.match(cacheKey)'));
   assert.ok(calendarIndexSource.includes('20261024-admin-cache-v7'));
   assert.ok(calendarIndexSource.includes('20261116-calendar-sunrise-constant-rasi-mana-v1'));
   assert.ok(calendarIndexSource.includes('20261116-calendar-sunrise-constant-rasi-mana-v1'));
   assert.ok(calendarIndexSource.includes('smv-calendar-rasi-palan-loader'));
   assert.ok(calendarIndexSource.includes('20261025-cross-host-assets-header-ta-v1'));
   assert.ok(calendarIndexSource.includes('moduleText.includes(\'function renderControls\')'));
   assert.ok(calendarIndexSource.includes('moduleText.includes(\'runPeriodForecast\')'));
   assert.ok(calendarIndexSource.includes('The deployed forecast assets could not be loaded from this Calendar host.'));
   assert.ok(!calendarIndexSource.includes('href="https://horoscope.smvastroservices.in/" target="_blank" rel="noopener">SMV HOROSCOPE</a>'));
   assert.ok(rasiPalanCss.includes('width:100%;max-width:960px;margin:24px auto'));
   assert.ok(horoscopeIndexSource.includes('id="smvHoroscopeControls"'), 'Language/account controls remain available outside the removed site header');
   assert.ok(horoscopeIndexSource.includes('id="smvHoroscopeAuth"'), 'Existing Horoscope authentication remains available');
   assert.doesNotMatch(horoscopeIndexSource, /id="templeHeader"|class="header-navigation"/, 'The removed site header and navigation must not return');
   for (const entry of ["'Services':'சேவைகள்'", "'Matching':'பொருத்தம்'", "'Calendar':'நாட்காட்டி'", "'Horoscope':'ஜாதகம்'", "'Login':'உள்நுழை'", "'Register':'பதிவு'", "'Logout':'வெளியேறு'", "'Admin Login':'நிர்வாக உள்நுழைவு'"]) assert.ok(horoscopeLanguageSource.includes(entry), 'Missing Tamil header label mapping: '+entry);
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
  assert.ok(validation.includes('ts.match(/^(' + slash + 'd{1,2}):(' + slash + 'd{2})(?::(' + slash + 'd{2})(?:' + slash + '.(' + slash + 'd+))?)?$/);'));
  assert.ok(validation.includes('if(!/^' + slash + 'd{4}-' + slash + 'd{2}-' + slash + 'd{2}$/.test(ds)||!m)'));
  assert.doesNotMatch(validation, /\\\\d/, 'Regexes must not match literal backslash-d sequences');
});

test('Fast Sun longitude for Tamil ingress search matches the full Swiss Lahiri chart', async () => {
  const input = { date: '2026-11-16', time: '06:10', lat: 11.2342, lon: 78.8808, utcOffsetMinutes: 330 };
  const chart = await calculateSwiss(input);
  const fullSun = chart.planets.find(planet => planet.name === 'சூரியன்');
  const fast = calculateSunMoonSync(input);
  assert.ok(fullSun && Number.isFinite(Number(fullSun.longitude)));
  const difference = Math.abs(((fast.sunLongitude - Number(fullSun.longitude) + 540) % 360) - 180);
  assert.ok(difference < 1e-6, 'Lightweight and full chart Sun longitudes must be equivalent');
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


test('Missing Tamil solar dates render only an em dash in daily and birth Panchang', () => {
  assert.match(horoscopeResultSource, /const dailyTamilDate=\(\(\)=>[\s\S]*?return '—';\}\)\(\);/);
  assert.match(horoscopeResultSource, /else \{\s*text='—';\s*\}/);
  assert.doesNotMatch(horoscopeResultSource, /தமிழ் தேதி|Tamil date/);
});

test('Same-day solar ingress after sunset starts the Tamil month on the next sunrise', () => {
  const expected = /if\(nextDate===referenceDate\)\{\s*const nextIngressTime=localTimeStringFromTs\(nextIngressTs,offset\);\s*\/\/ An ingress at or after local sunset belongs to the next sunrise interval\.\s*if\(nextIngressTime < refSunset\)\{/;
  assert.match(transitPanchangSource, expected);
  assert.match(rootTransitPanchangSource, expected);
});

test('16 November 2026 is Aippasi 30 and 17 November begins Karthigai 1', async () => {
  const input = {
    time: '12:00',
    lat: 11.23,
    lon: 78.88,
    utcOffsetMinutes: 330,
    language: 'ta',
    houseSystem: 'S'
  };
  await calculateSwiss({ ...input, date: '2026-11-16' });
  const aippasiEnd = panchang({ ...input, date: '2026-11-16' }).tamilSolar;
  const karthigaiStart = panchang({ ...input, date: '2026-11-17' }).tamilSolar;
  assert.equal(aippasiEnd?.monthTa, 'ஐப்பசி');
  assert.equal(aippasiEnd?.day, 30);
  assert.equal(karthigaiStart?.monthTa, 'கார்த்திகை');
  assert.equal(karthigaiStart?.day, 1);
});

test('Calendar dual-date grid, direct navigation and Date Details are UI-only extensions', () => {
  assert.match(dailyCalendarSource, /min="1800-01-01" max="2399-12-31"/);
  assert.match(dailyCalendarSource, /class="cal-day-tamil"/);
  assert.match(dailyCalendarSource, /data-open-jump/);
  assert.match(dailyCalendarSource, /id="calJumpDate"/);
  assert.match(dailyCalendarSource, /id="calJumpMonth"/);
  assert.match(dailyCalendarSource, /id="calJumpYear"/);
  assert.match(dailyCalendarSource, /data-year="-1"/);
  assert.match(dailyCalendarSource, /data-year="1"/);
  assert.match(dailyCalendarSource, /touchstart/);
  assert.match(dailyCalendarSource, /touchend/);
  assert.match(dailyCalendarSource, /function renderDateDetails\(\)/);
  assert.match(dailyCalendarSource, /Brahma Muhurtham/);
  assert.match(dailyCalendarSource, /Abhijit Muhurtham/);
  assert.match(dailyCalendarSource, /Travel Shoolam/);
  assert.match(dailyCalendarSource, /getTamilDayYoga\(weekday,dayStar\)/);
  assert.match(dailyCalendarSource, /getTamilCalendarDayFlags\(solar\)/);
  assert.match(dailyCalendarSource, /class="cal-day-yoga-card/);
  assert.match(dailyCalendarSource, /class="cal-day-flags"/);
  assert.match(dailyCalendarSource, /Kari Naal/);
  assert.match(dailyCalendarSource, /Thaniya Naal/);
  assert.match(dailyCalendarSource, /Name Yoga/);
  assert.match(dailyCalendarSource, /cal-name-yoga-label/);
  assert.match(dailyCalendarSource, /nityaYogaResults/);
  assert.match(calendarCalculationWorkerSource, /attachTamilSolarDates/);
  assert.match(calendarCalculationWorkerSource, /dayStar:ev\.star,previousSunset/);
  assert.match(calendarWorkerSource, /tamil-day-classifications\.mjs/);
  assert.match(transitPanchangSource, /export \{transit,panchang,tamilSolarDate\}/);
  assert.match(dailyCalendarCssSource, /h3:not\(\.cal-date-details-title\)/);
  assert.match(calendarThemeCssSource, /h3\.cal-date-details-title::before/);
  assert.match(calendarThemeCssSource, /\.cal-jump-year-actions button/);
  assert.match(calendarThemeCssSource, /height:58px;min-height:58px/);
  assert.match(calendarThemeCssSource, /aria-current="date"\]\.cal-date-past/);
  assert.match(calendarThemeCssSource, /aria-current="date"\]\.cal-date-future/);
  assert.match(calendarThemeCssSource, /\.cal-day-yoga-card\.is-unknown/);
  assert.ok(calendarThemeCssSource.includes('font-weight:950!important'), 'Date Details title is bright and bold');
  assert.ok(calendarThemeCssSource.includes('.cal-month-jump') && calendarThemeCssSource.includes('grid-template-columns:minmax(0,1fr)'), 'Month/year/date selector panel is full-width and flat');
  assert.ok(calendarThemeCssSource.includes('background:transparent!important'), 'Panchang and sibling sections use a flat visual layer');
  assert.ok(dailyCalendarSource.includes('function ensureMonth(key)'), 'Month calculation has an independent request path');
  assert.ok(dailyCalendarSource.includes('const monthPromise=ensureMonth(key)'), 'Month results do not wait for daily details before starting');
  assert.ok(calendarCalculationWorkerSource.includes('const sampleCache=new Map()'), 'Astronomical samples are memoized across day/month requests');
  assert.ok(calendarCalculationWorkerSource.includes('Promise.all([sample(input,rise)'), 'Independent calendar samples are requested together');
  assert.ok(calendarCalculationWorkerSource.includes('Math.floor((entries.length-1)/2)'), 'Solar date probes use three evenly spaced samples');
  assert.ok(transitPanchangSource.includes('calculateSunMoonSync({...input,date,time,utcOffsetMinutes:offset})'), 'Ingress search uses the lightweight Swiss Sun/Moon path');
  assert.ok(transitPanchangSource.includes('for(let j=0;j<24;j++)'), 'Panchang and solar ingress searches use sub-second bisection precision');
  assert.doesNotMatch(transitPanchangSource, /for\(let j=0;j<(42|55);j\+\+\)/, 'Long redundant bisection loops are removed');
  assert.doesNotMatch(dailyCalendarSource, /solarNoaa\(/, 'Daily UI must reuse worker-provided sunrise and sunset rather than invent separate calculations');
});

test('Tamil Amirthathi yoga lookup covers all weekdays and 27 sunrise stars without a Siddha fallback', () => {
  assert.equal(TAMIL_DAY_YOGA_TABLE.length, 7);
  assert.ok(TAMIL_DAY_YOGA_TABLE.every(row => row.length === 27));
  assert.deepEqual(new Set(TAMIL_DAY_YOGA_TABLE.join('')), new Set(['S', 'A', 'M', 'P']));
  assert.equal(getTamilDayYoga(1, 22).key, 'amirtha', 'Monday + Thiruvonam must resolve to Amirtha');
  assert.equal(getTamilDayYoga(0, 10).key, 'marana');
  assert.equal(getTamilDayYoga(0, 2).key, 'prabalarishta');
  assert.equal(getTamilDayYoga(1, 0).key, 'unknown');
  assert.equal(getTamilDayYoga(7, 22).key, 'unknown');
  assert.match(dailyCalendarSource, /const dayStar=Number\(daily\.dayStar\)/);
  assert.doesNotMatch(dailyCalendarSource, /Number\(daily\.dayStar\)\|\|Number\(p\?\.nakshatra\?\.number\)/);
  assert.doesNotMatch(tamilDayClassificationsSource, /\|\|\s*YOGA_BY_CODE\.S/);
});

test('16 November 2026 sunrise weekday and Thiruvonam produce Amirtha, not the Siddha fallback', async () => {
  const input = { lat: 11.2342, lon: 78.8808, utcOffsetMinutes: 330, language: 'en', houseSystem: 'S' };
  const date = '2026-11-16';
  const sunrise = solarNoaa(date, input.lat, input.lon, input.utcOffsetMinutes, true);
  assert.ok(sunrise, 'Perambalur sunrise must be available for the known-date regression');
  const chart = await calculateSwiss({ ...input, date, time: sunrise });
  const p = panchang({ ...input, date, time: sunrise }, chart);
  assert.equal(p.nakshatra?.number, 22, 'Thiruvonam is the sunrise Nakshatra on this date');
  assert.equal(getTamilDayYoga(new Date(date + 'T12:00:00Z').getUTCDay(), p.nakshatra.number).key, 'amirtha');
});

test('Kari Naal and Thaniya Naal are separate fixed Tamil-month date flags', () => {
  const bothAippasi20 = getTamilCalendarDayFlags({ index: 6, day: 20 });
  assert.deepEqual(bothAippasi20, { available: true, kari: true, thaniya: true });
  const bothKarthigai1 = getTamilCalendarDayFlags({ index: 7, day: 1 });
  assert.deepEqual(bothKarthigai1, { available: true, kari: true, thaniya: true });
  const thaniyaOnlyChithirai10 = getTamilCalendarDayFlags({ index: 0, day: 10 });
  assert.deepEqual(thaniyaOnlyChithirai10, { available: true, kari: false, thaniya: true });
  assert.deepEqual(getTamilCalendarDayFlags(null), { available: false, kari: false, thaniya: false });
});

test('Monthly Tamil solar labels safely handle more than one boundary inside a Gregorian month', () => {
  assert.match(calendarCalculationWorkerSource, /const probeIndexes=\[\.\.\.new Set\(\[0,Math\.floor\(\(entries\.length-1\)\/2\),entries\.length-1\]/);
  assert.match(calendarCalculationWorkerSource, /while\(lo<hi\)/);
  assert.match(calendarCalculationWorkerSource, /boundaries\.push\(\{index:lo,state\}\)/);
  assert.match(calendarCalculationWorkerSource, /day:state\.offset\+dateDistance\(entries\[i\]\.date,firstDate\)/);
});

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
import { panchang, solarNoaa, nakshatraIntervalsForLocalDay, thyajyamIntervalsForLocalDay, calculateAhasNazhigai, calculateRatriNazhigai, calculateAhasRatriPramana, calculateDinantham, NAKSHATRA_THYAJYAM_START_GHATIS } from '../public/horoscope/offline/transit_panchang.browser.mjs';
import { calculateRasiManaForLocation, calculateSolarSignRasiMana, calculateRemainingRasiMana, calculateRemainingSolarSignRasiMana, meanObliquityAtJulianDay } from '../public/horoscope/offline/rasi-mana.browser.mjs';
import { TAMIL_DAY_YOGA_TABLE, getTamilDayYoga, getTamilCalendarDayFlags, getThaniyaNaalDates, getNakshatraDirection, getNethiramJeevan } from '../public/horoscope/tamil-day-classifications.mjs';

const dailyCalendarSource = await readFile(new URL('../public/horoscope/daily-calendar.mjs', import.meta.url), 'utf8');
const calendarDataSource = await readFile(new URL('../public/horoscope/calendar-data.mjs', import.meta.url), 'utf8');
const horoscopeRendererSource = await readFile(new URL('../public/horoscope/horoscope.js', import.meta.url), 'utf8');
const sharedHoroscopeCssSource = await readFile(new URL('../public/horoscope/horoscope.css', import.meta.url), 'utf8');
const astroServiceWorkerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const horoscopeServiceWorkerSource = await readFile(new URL('../public/horoscope/sw.js', import.meta.url), 'utf8');
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

test('Sunrise Rasi Mana uses only the untraversed sidereal solar arc', () => {
  const atMonthStart = calculateRemainingSolarSignRasiMana({
    solarLongitude:210, solarSignIndex:7, latitude:11.2342,
    ayanamsaDegrees:24.25, obliquityDegrees:23.436, fullBalanceVighati:329
  });
  assert.equal(atMonthStart.available,true);
  assert.equal(atMonthStart.degreeInSign,0);
  assert.equal(atMonthStart.remainingSignDegrees,30);
  assert.equal(atMonthStart.remainingVighati,329,
    'At 0° Scorpio, the remaining Rasi Mana equals the complete 30° value (5 na 29 vi).');

  const atMonthEnd = calculateRemainingSolarSignRasiMana({
    solarLongitude:239 + 59/60 + 59/3600, solarSignIndex:7, latitude:11.2342,
    ayanamsaDegrees:24.25, obliquityDegrees:23.436, fullBalanceVighati:329
  });
  assert.equal(atMonthEnd.available,true);
  assert.ok(atMonthEnd.remainingSignDegrees < 0.0003);
  assert.equal(atMonthEnd.remainingVighati,0,
    'At approximately 29°59\'59\", the remaining Rasi Mana rounds to zero, not 5 na 29 vi.');

  const on25November = calculateRemainingSolarSignRasiMana({
    solarLongitude:218.5, solarSignIndex:7, latitude:11.2342,
    ayanamsaDegrees:24.25, obliquityDegrees:23.436, fullBalanceVighati:329
  });
  assert.equal(on25November.degreeInSign,8.5);
  assert.ok(on25November.remainingVighati>0&&on25November.remainingVighati<329,
    'A progressed Sun on 25 November must show only the residual OA arc, smaller than the complete Scorpio value.');
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
  assert.match(calendarCalculationWorkerSource, /fullBalanceVighati:rasi\.totalVighati/);
  assert.match(calendarCalculationWorkerSource, /calculateRemainingSolarSignRasiMana/);
  assert.match(calendarCalculationWorkerSource, /time:sunrise/,
    'The worker must calculate the Sun position at the selected local sunrise.');
  assert.match(calendarCalculationWorkerSource, /sunriseSunLongitude,/);
  assert.match(calendarCalculationWorkerSource, /sunriseMonthBoundaryApplied:sunriseSunSignIndex!==base\.sunSignIndex/);
  assert.match(dailyCalendarSource, /Tamil-month start used: 0°/);
  assert.match(dailyCalendarSource, /தமிழ் மாதத் தொடக்கக் கணக்கு: 0°/);
  assert.match(calendarCalculationWorkerSource, /balanceNazhigai:remaining\.balanceNazhigai/);
  assert.doesNotMatch(calendarCalculationWorkerSource, /calculateRemainingRasiMana|balanceAtSunrise/,
    'Solar-sign remaining balance must not be derived by subtracting wall-clock time.');
  assert.match(dailyCalendarSource, /Full 30° Rasi Mana/);
  assert.match(dailyCalendarSource, /முழு 30° ராசி மானம்/);
  assert.match(dailyCalendarSource, /Sun at sunrise/);
  assert.match(dailyCalendarSource, /உதயத்தில் சூரியன்/);
  assert.match(dailyCalendarSource, /Fixed until next sunrise/);
  assert.match(dailyCalendarSource, /அடுத்த சூ\.உதயம் வரை மாறாது/);
  assert.doesNotMatch(dailyCalendarSource, /calculateRemainingRasiMana|balance counts down from sunrise/,
    'Daily UI must display the worker-computed sunrise remainder, without a live clock countdown.');

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
  assert.doesNotMatch(dailyCalendarSource, /Birth Star & Tara Bala|பிறந்த நட்சத்திரம் · தாராபலம்/);
  assert.match(dailyCalendarSource, /calChandrashtamaSection/);
  assert.match(dailyCalendarSource, /status\.textContent=hasChandrashtama\?L\('Chandrashtama: Yes','சந்திராஷ்டமம் : உண்டு'\):L\('Chandrashtama: No','சந்திராஷ்டமம் : இல்லை'\)/);
  assert.ok(dailyCalendarSource.includes("L('Chandrashtama:','சந்திராஷ்டமம் :')"));
  assert.ok(dailyCalendarSource.includes("status.dataset.result=hasChandrashtama?'present':'absent'"));
  assert.doesNotMatch(dailyCalendarSource, /No Chandrashtama period overlaps the selected date\/time|தேர்ந்தெடுத்த தேதியில் சந்திராஷ்டமக் காலப்பகுதி இல்லை/);
  assert.match(dailyCalendarSource, /selectedIsToday/);
  assert.ok(dailyCalendarSource.includes('const selectedDateWindow=availableWindows.find'));
  assert.ok(dailyCalendarSource.includes('const nearestUpcomingWindow=selectedDateWindow?null:availableWindows'));
  assert.ok(dailyCalendarSource.includes('nearestUpcomingWindow?[{...nearestUpcomingWindow,isUpcoming:true}]:[]'));
  assert.match(dailyCalendarSource, /const hasChandrashtama=hasSelectedDateChandrashtama/);
  assert.match(dailyCalendarSource, /return windowsHtml\\?/,
    'Upcoming window details remain visible even when selected-date status is Chandrashtama No.');
  assert.match(dailyCalendarSource, /data-period-type=/);
  assert.match(dailyCalendarSource, /is-upcoming/);
  assert.ok(dailyCalendarSource.includes('upcomingHeading=nearestUpcomingWindow&&windowsHtml'),
    'The next-Chandrashtama label appears only with the absent-date upcoming fallback.');
  assert.ok(dailyCalendarSource.includes("L('Next Chandrashtama','அடுத்த சந்திராஷ்டமம்')"));
  assert.doesNotMatch(dailyCalendarSource, /Next Chandrashtama for your|ராசிக்கான அடுத்த சந்திராஷ்டம நாள்/);
  assert.ok(dailyCalendarSource.includes("L('Rasi period','ராசி காலம்')"));
  assert.ok(dailyCalendarSource.includes("L('Birth star','ஜன்ம நட்சத்திரம்')"));
  assert.match(dailyCalendarSource, /return windowsHtml\?'<div class="cal-chandra-windows">'\+upcomingHeading\+windowsHtml/);
  assert.match(calendarThemeCssSource, /cal-chandra-upcoming-heading\{margin:0;color:#2c704d;font-size:13px;font-weight:750;line-height:1\.4\}/);
  assert.match(calendarThemeCssSource, /cal-chandrashtama-result\{margin:0;color:#28734d;font-size:16px;font-weight:800;line-height:1\.35\}/);
  assert.ok(dailyCalendarCssSource.includes('.cal-summary h4:not(.cal-chandrashtama-result),.cal-planets h4{font-size:14px!important;'), 'The compact summary-card heading rule must exclude the prominent Chandrashtama result.');
  assert.match(calendarThemeCssSource, /cal-chandrashtama-result\.is-present\{color:#b42318\}/);
  assert.match(calendarThemeCssSource, /cal-chandrashtama-result\.is-absent\{color:#28734d\}/);
  assert.match(calendarThemeCssSource, /cal-chandrashtama\{display:grid;gap:8px;min-width:0;margin:0;padding:0;border:0;border-radius:0;background:transparent/);
  assert.match(calendarThemeCssSource, /cal-chandrashtama>p\{[^}]*margin:0;padding:0;border:0/);
  assert.match(calendarThemeCssSource, /cal-chandra-janma-projection\{display:grid;gap:3px;margin:6px 0;padding:0;border:0/);
  assert.ok(dailyCalendarSource.includes('id="calChandrashtamaSection" class="cal-chandrashtama-section smv-css-island"'), "Chandrashtama is isolated from the shared legacy heading palette.");
  assert.ok(dailyCalendarSource.includes('id="calReadings" class="cal-tara-bala-section"'), 'Tara Bala is nested inside the Chandrashtama result section.');
  assert.ok(calendarThemeCssSource.includes('#calChandrashtamaSection > #calReadings.cal-tara-bala-section'), 'Tara Bala shares the Chandrashtama visual layer without a second card.');
  assert.ok(dailyCalendarSource.includes("L('Chandrashtama Rasi','சந்திராஷ்டம ராசி')"));
  assert.doesNotMatch(dailyCalendarSource, /Eighth Rasi|எட்டாம் ராசி/);
  assert.match(dailyCalendarSource, /L\('Moon Nakshatra \/ Pada','சந்திர நட்சத்திரம் \/ பாதம்'\)/);
  assert.match(calendarThemeCssSource, /cal-chandra-pada-row\.is-janma-pada-projection/);
  assert.doesNotMatch(dailyCalendarCssSource, /#smvDailyCalendar \.cal-chandrashtama-result\{|#smvDailyCalendar \.cal-chandra-upcoming-heading\{/);
  assert.match(dailyCalendarSource, /Tara Bala/);
  assert.match(dailyCalendarSource, /Transit Moon Rasi/);
  assert.match(dailyCalendarSource, /signs\[moonSign\]\[ta\(\)\?1:0\]/);
  const detailsShellStart = dailyCalendarSource.indexOf('function shell()');
  const detailsShell = dailyCalendarSource.slice(detailsShellStart, dailyCalendarSource.indexOf('function dateInMonth', detailsShellStart));
  const chandrashtamaSectionPosition = detailsShell.indexOf('<section id="calChandrashtamaSection"');
  const observancesPosition = detailsShell.indexOf('<section id="calEvents"');
  const dailyPanchangPosition = detailsShell.indexOf('<div id="calDaily"');
  const chandraRenderStart = dailyCalendarSource.indexOf("$('#calChandrashtamaSection').innerHTML=");
  const chandraRenderEnd = dailyCalendarSource.indexOf('loadChandrashtamaWindows();', chandraRenderStart);
  const chandraRender = dailyCalendarSource.slice(chandraRenderStart, chandraRenderEnd);
  const chandraPeriodsPosition = chandraRender.indexOf('id="calChandrashtamaPeriods"');
  const taraBalaPosition = chandraRender.indexOf('${taraBalaHtml}');
  assert.ok(dailyCalendarSource.includes('const taraBalaHtml=`<section id="calReadings" class="cal-tara-bala-section">'),
    'Tara Bala must be defined as a section within the single combined result layer.');
  assert.ok(chandrashtamaSectionPosition >= 0 && chandrashtamaSectionPosition < observancesPosition &&
    observancesPosition < dailyPanchangPosition,
    'The combined Chandrashtama/Tara Bala layer and observances must sit above the daily Panchang.');
  assert.ok(chandraPeriodsPosition >= 0 && taraBalaPosition > chandraPeriodsPosition,
    'Tara Bala must render inside the Chandrashtama section, after its Chandrashtama details.');
  assert.match(dailyCalendarSource, /Chandrashtama/);
  assert.doesNotMatch(dailyCalendarSource, /Daily Rasi Palan/);
  assert.doesNotMatch(dailyCalendarSource, /All eight transit planets/);
});

test('Calendar distinguishes Gazette government holidays from observances and does not add Sundays', () => {
  assert.ok(dailyCalendarSource.includes("L('Government holiday','அரசு விடுமுறை')"),
    'Official Tamil Nadu holidays must be explicitly identified as Government Holidays.');
  assert.ok(dailyCalendarSource.includes("kind:'government'") && dailyCalendarSource.includes('cal-government-holiday'),
    'Government holiday tags must use their own visual marker.');
  assert.ok(calendarDataSource.includes("G.O.(1D) No.547") && calendarDataSource.includes("'11-09':[['Additional local holiday after Deepavali','தீபாவளிக்கு அடுத்த நாள்']]"),
    'The 9 November 2026 state government local holiday must be backed by G.O.(1D) No.547.');
  assert.ok(dailyCalendarSource.includes("const officialHolidays=holidays(selected)"),
    'Only the existing Gazette-backed holiday list may receive the Government Holiday label.');
  assert.ok(dailyCalendarSource.includes('class="cal-holiday-source"'),
    'The Holiday source link remains visible.');
  assert.doesNotMatch(dailyCalendarSource, /getUTCDay\(\)===0\)names\.push\(\['Sunday','ஞாயிறு'\]\)/,
    'Do not add Sunday as a separate holiday.');
  assert.doesNotMatch(dailyCalendarSource, /Vrats use local sunrise|விரதங்கள் உள்ளூர் உதயம்|Official holidays for this year have not been loaded/,
    'Remove the explanatory note and the extra year warning.');
  assert.match(calendarThemeCssSource, /cal-government-holiday\{[^}]*font-weight:850/);
  assert.match(dailyCalendarSource, /i===0\?'cal-weekday-sunday':/,
    'Only the Sunday/Su first weekday heading receives the Sunday marker.');
  assert.match(dailyCalendarSource, /isSunday\?'cal-sunday':/,
    'Calendar dates in the Sunday column receive the Sunday marker.');
  assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar .cal-month-grid>b.cal-weekday-sunday{color:#b42318!important'),
    'The Sunday weekday abbreviation is red.');
  assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar .cal-month-grid button.cal-sunday>strong{color:#b42318!important'),
    'Only the Gregorian date number in Sunday cells is red.');
  assert.ok(!calendarThemeCssSource.includes('#smvDailyCalendar .cal-month-grid button.cal-sunday{color:'),
    'The entire Sunday date cell must not be recoloured.');
  assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar .cal-date-details-head::after{'),
    'Calendar heading must suppress the inherited right-side Om ornament on its header.');
  assert.equal((horoscopeRendererSource.match(/class="cal-centered-heading"/g)||[]).length,4,
    'Transit/Panchang, Daily Hora, Transit Chart and Transit Planetary Positions use the dedicated centered-heading class.');
  assert.match(dailyCalendarCssSource, /h3:not\(\.cal-date-details-title\):not\(\.cal-section-title\):not\(\.cal-centered-heading\)/,
    'Generic left-aligned flex decoration must not target Calendar centered headings.');
  assert.ok(horoscopeRendererSource.includes("calendarPresentation?'transit-card':'card transit-card'"), 'Only Calendar removes the Transit Chart card layer; Horoscope retains it.');
  assert.ok(horoscopeRendererSource.includes("const fullPlanetTamil={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};"), 'Calendar Transit Planetary Positions maps full Tamil graha names instead of short glyph labels.');
  assert.ok(horoscopeRendererSource.includes("const combustionMarker=calendarPresentation&&isCombust?(ta?'(அ)':'(C)'):'';"), 'Combustion marker is appended to the graha name in the active language.');
  assert.ok(horoscopeRendererSource.includes('<div class="south-chart-center">${calendarPresentation?(ta?\'கோச்சாரம்\':\'Transit\'):\'Transit Chart\'}</div>'), 'Only the label inside the Calendar transit chart is shortened to கோச்சாரம் / Transit.');
  assert.ok(horoscopeRendererSource.includes('<h3 class="cal-centered-heading">🪐 ${ta?\'Transit Chart\':\'Transit Chart\'}</h3>'), 'The outer Transit Chart heading keeps its pre-existing wording.');
  assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar #calDaily .transit-chart .planet-short,#smvDailyCalendar #calDaily .transit-chart .south-chart-center{color:#15564e!important;-webkit-text-fill-color:#15564e!important}'), 'Only short planet names and the chart centre label receive the Calendar theme green.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .transit-chart .south-rasi-cell{'), 'Transit cell sizing is defined in the primary V211 source rules.');
  assert.ok(dailyCalendarCssSource.includes('justify-content:center!important;gap:2px!important;text-align:center!important;'), 'Transit Rasi cell content is horizontally and vertically centred.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .transit-chart .transit-cell-planets{'), 'The planet stack is vertically centred within its own Rasi cell.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .transit-chart .planet-line{\n  display:flex!important;'), 'Each planet row is centred without a dotted separator.');
  assert.ok(horoscopeRendererSource.includes('const transitPlanetCount=bySign[si].length;const compactPlanetCell=transitPlanetCount>3;'), 'Only planet short-name count controls compact sizing; Lagna, markers and degrees are excluded.');
  assert.ok(horoscopeRendererSource.includes('data-transit-planet-count="${transitPlanetCount}"'), 'The exact planet count is attached to each Rasi cell for its own font-size rule.');
  assert.ok(horoscopeRendererSource.includes("south-rasi-cell${compactPlanetCell?' south-rasi-cell-compact':''}"), 'The Rasi cell carries its own compact class so house numbers follow that cell\\'s planet size.');
  assert.ok(horoscopeRendererSource.includes("(houseNo??'')"), 'An unavailable house number renders blank rather than a dash.');
  assert.ok(horoscopeRendererSource.includes('${ps}</div></div>`);});'), 'Empty transit cells do not render a dash placeholder.');
  assert.ok(dailyCalendarCssSource.includes('--transit-cell-label-size:21px;'), 'Desktop ordinary planet names, degrees, markers, Lagna and house numbers use a clearly increased 21px size.');
  assert.ok(dailyCalendarCssSource.includes('south-rasi-cell[data-transit-planet-count="4"]{--transit-cell-label-size:19px}'), 'A four-planet Rasi alone uses the first desktop compact size.');
  assert.ok(dailyCalendarCssSource.includes('south-rasi-cell[data-transit-planet-count="9"]{--transit-cell-label-size:12.5px}'), 'Nine-planet Rasi cells progressively compact only that cell.');
  assert.ok(dailyCalendarCssSource.includes('--transit-cell-label-size:18px;padding:4px 2px!important'), 'Mobile ordinary cells use an increased 18px size.');
  assert.ok(dailyCalendarCssSource.includes('--transit-cell-label-size:16px}'), 'Narrow mobile ordinary cells remain readable at 16px.');
  assert.ok(dailyCalendarCssSource.includes('.planet-glyph .rasi-status-marker,'), 'C/R and Tamil அ/வ markers inherit their planet name size.');
  assert.ok(dailyCalendarCssSource.includes('font-size:1em!important;line-height:inherit!important;'), 'Planet name, marker and degree text use an identical font size.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .transit-chart .dynamic-rasi-number,'), 'House numbers inherit the exact same per-cell font size as planet labels.');
  assert.ok(horoscopeRendererSource.includes("transit-cell-planets${compactPlanetCell?' transit-cell-planets-compact':''}"), 'Planet sizing is scoped to the individual Rasi cell.');
  assert.equal(/transit-chart-dense(?:-4plus)?\s+\.planet-glyph/.test(dailyCalendarCssSource), false, 'Chart-wide dense rules must not shrink ordinary Rasi cells.');
  assert.equal(dailyCalendarCssSource.includes('Transit chart typography v3'), false, 'No appended typography-v3 override patch may remain.');
  assert.equal(dailyCalendarCssSource.includes('Final Calendar Transit sizing'), false, 'No duplicate end-of-file transit sizing patch may remain.');
  assert.equal(calendarThemeCssSource.includes('#smvDailyCalendar #calDaily .transit-card>.cal-centered-heading{color:#15564e'), false, 'The outer Transit Chart heading must not receive a new green override.');
  assert.ok(horoscopeRendererSource.includes("<th>${ta?'கிரகங்கள்':'Planets'}</th>"), 'The positions table labels the first column as Planets / கிரகங்கள்.');
  assert.ok(horoscopeRendererSource.includes("calendarPresentation?'':`<td>${esc2(r.status||'—')}</td>`"), 'Status is omitted from Calendar but retained for non-Calendar Horoscope output.');
  assert.ok(horoscopeRendererSource.includes("calendarPresentation?'hora-card':'card hora-card'"), 'Only Calendar removes the Daily Hora outer card; Horoscope retains its original card.');
  assert.ok(horoscopeRendererSource.includes("calendarPresentation?'transit-card':'card transit-card'"), 'Calendar Transit Chart has no outer card, while Horoscope retains its card.');
  assert.ok(horoscopeRendererSource.includes('<section class="transit-table-card">'), 'Transit Planetary Positions keeps its heading wrapper without an outer card.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .transit-card{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;outline:0!important}'), 'The Transit Chart remains without an outer card.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar #calDaily .hora-card,#smvDailyCalendar #calDaily .transit-table-card{padding:0!important;margin:12px 0!important;border:0!important;background:transparent!important;border-radius:0!important;box-shadow:none!important;outline:0!important}'), 'Daily Hora and Transit Planetary Positions sections must have no outer layer while retaining their headings.');
  assert.ok(dailyCalendarCssSource.includes('#calDaily .hora-table-wrap{border:1px solid #dce8df!important;border-radius:5px!important;overflow:hidden!important}'), 'Only the Day and Night Hora table wrappers receive the thin green outer border.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar .transit-table-card .adv-scroll{border:1px solid #dce8df!important;border-radius:5px!important}'), 'Only the Transit Planetary Positions table wrapper receives the thin green outer border.');
  assert.ok(dailyCalendarCssSource.includes('data-transit-planet-count="4"]{--transit-cell-label-size:16px}'), 'Four-planet cells compact locally to 16px on regular mobile screens.');
  assert.ok(dailyCalendarCssSource.includes('data-transit-planet-count="4"]{--transit-cell-label-size:14.5px}'), 'Four-planet cells compact locally to 14.5px on narrow mobile screens.');
   assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar #calDaily .cal-centered-heading{'),
    'The Calendar-specific centered-heading class must be centered within the Calendar scope.');
  assert.match(calendarThemeCssSource, /#smvDailyCalendar #calDaily \.cal-centered-heading,\s*#smvDailyCalendar \.cal-date-details-head h3\.cal-date-details-title\{\s*font-size:19px!important;\s*line-height:1\.35!important;\s*\}/, 'Calendar primary headings use the compact desktop size.');
   assert.match(calendarThemeCssSource, /@media\(max-width:680px\)\{\s*#smvDailyCalendar #calDaily \.cal-centered-heading,\s*#smvDailyCalendar \.cal-date-details-head h3\.cal-date-details-title\{\s*font-size:17px!important;/, 'Calendar primary headings use the compact mobile size.');
   assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar #calDaily .cal-centered-heading::after{'),
    'Centered Calendar headings must not display inherited trailing ornaments.');
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
   assert.ok(calendarWorkerSource.includes("const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261119-calendar-transit-typography-v3' : '20261119-calendar-transit-typography-v3'"), 'Calendar bumps its host-specific release marker for public content updates');
   assert.ok(calendarWorkerSource.includes("const CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"), 'Cache version updates existing PWA installs without changing its independent namespace');
   assert.ok(calendarWorkerSource.includes("'../tamil-day-classifications.mjs'"), 'Tamil day flags and Amirthathi lookup remain available in the Calendar offline core');
   assert.ok(!calendarWorkerSource.includes('calendar-admin.mjs'), 'The standalone Calendar Admin module is not downloaded or cached');
   assert.ok(calendarWorkerSource.includes('const REQUIRED_CORE = new Set(['));
   assert.ok(calendarWorkerSource.includes('await preserveCachedIndiaPlaces(target)'), 'Previously cached India place shards must survive cache migration');
   assert.ok(calendarWorkerSource.includes('prefetchIndiaPlaceShards'), 'Calendar downloads the complete India offline location pack during first online install');
   assert.ok(calendarWorkerSource.includes("'../offline/places/india/'"), 'Calendar caches every India place shard from the shared static asset path');
   assert.ok(calendarWorkerSource.includes('c.match(cacheKey)'));
   assert.ok(calendarIndexSource.includes('20261024-admin-cache-v7'));
   assert.ok(calendarIndexSource.includes('20261119-calendar-transit-typography-v3'));
   assert.ok(calendarIndexSource.includes('20261119-calendar-transit-typography-v3'));
   assert.ok(calendarIndexSource.includes('smv-calendar-rasi-palan-loader'));
   assert.ok(calendarIndexSource.includes('20261119-calendar-transit-typography-v3'));
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
  assert.match(dailyCalendarSource, /daily\.amirthadiYogaSegments/);
  assert.match(dailyCalendarSource, /getTamilCalendarDayFlags\(solar\)/);
  assert.match(dailyCalendarSource, /class="cal-day-yoga-card/);
  assert.match(dailyCalendarSource, /class="cal-day-flags"/);
  assert.match(dailyCalendarSource, /Kari Naal/);
  assert.match(dailyCalendarSource, /Thaniya Naal/);
  assert.match(dailyCalendarSource, /textContent=L\('Namah Yoga','நாம யோகம்'\)/);
  assert.match(dailyCalendarSource, /cal-name-yoga-label/);
  assert.doesNotMatch(dailyCalendarSource, /nityaYogaResults|cal-name-yoga-result|Impact and obstruction|Obstruction and complications|தாக்கமும் இடையூறும்|தடை மற்றும் சிக்கல்கள்/,
    'Namah Yoga must show its calculated name and timing without explanatory impact/obstruction notes.');
  assert.match(calendarCalculationWorkerSource, /attachTamilSolarDates/);
  assert.match(calendarCalculationWorkerSource, /dayStar:ev\.star,sunStar:ev\.sunStar,nextSunrise,ratriNazhigai,dinantham,amirthadiYogaAvailable:nakshatraTimeline\.available,amirthadiYogaSegments,thyajyamAvailable:thyajyam\.available,thyajyamIntervals:thyajyam\.intervals,ahasNazhigai,previousSunset/);
  assert.match(calendarWorkerSource, /tamil-day-classifications\.mjs/);
  assert.match(transitPanchangSource, /export \{transit,panchang,tamilSolarDate\}/);
  assert.match(dailyCalendarCssSource, /h3:not\(\.cal-date-details-title\)/);
  assert.match(calendarThemeCssSource, /h3\.cal-date-details-title::before/);
  assert.match(calendarThemeCssSource, /\.cal-jump-year-actions button/);
  assert.match(calendarThemeCssSource, /height:58px;min-height:58px/);
  assert.match(calendarThemeCssSource, /aria-current="date"\]\.cal-date-past/);
  assert.match(calendarThemeCssSource, /aria-current="date"\]\.cal-date-future/);
  assert.match(calendarThemeCssSource, /\.cal-amirthadi-yoga-card\.is-unknown/);
  assert.match(calendarThemeCssSource, /\.cal-date-details-title\{display:block;width:100%;margin:0;padding:0;border:0;border-radius:0;background:transparent;background-image:none;box-shadow:none;color:#15564e;font-size:22px;font-weight:850;line-height:1\.3;text-align:center\}/, 'Daily Panchang title is centered and has no filled box');
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

test('TTD Tirukanitha Amirthadi matrix covers 7 weekdays x 27 Nakshatras and the expected reference cells', () => {
  assert.equal(TAMIL_DAY_YOGA_TABLE.length, 7);
  assert.ok(TAMIL_DAY_YOGA_TABLE.every(row => row.length === 27));
  assert.deepEqual(TAMIL_DAY_YOGA_TABLE, [
    'SPSSSSSSSMSAASSMMMASAAMSSAA',
    'SSMAASASSMSSSPAMSSSSMASSMSS',
    'SSSASMSSSSSASSSMSSASPSSMMAS',
    'MSASSSSSSSAAMSSSSSMAASPSASM',
    'ASMMMMAASASMSSASSPSSSSSMSSS',
    'ASSMSSSMMMSSASSSSMAPSMSSSSA',
    'SSAASSSSMASMMMASSSSSSSSAMSP'
  ], 'The complete TTD 7×27 table must be transcribed in Sunday–Saturday row order');
  assert.deepEqual(new Set(TAMIL_DAY_YOGA_TABLE.join('')), new Set(['S', 'A', 'M', 'P']));
  assert.equal(getTamilDayYoga(0, 1).key, 'siddha', 'Sunday + Ashwini is Siddha');
  assert.equal(getTamilDayYoga(1, 2).key, 'siddha', 'Monday + Bharani is Siddha; weekday row and star column must not be transposed');
  assert.equal(getTamilDayYoga(0, 2).key, 'prabalarishta', 'Sunday + Bharani is Prabalarishta');
  assert.equal(getTamilDayYoga(0, 10).key, 'marana', 'Sunday + Magha is Marana');
  assert.equal(getTamilDayYoga(1, 22).key, 'amirtha', 'Monday + Thiruvonam is Amirtha');
  assert.equal(getTamilDayYoga(1, 0).key, 'unknown');
  assert.equal(getTamilDayYoga(7, 22).key, 'unknown');
  assert.match(tamilDayClassificationsSource, /prabalarishta[\s\S]*?bad: true/);
  assert.match(calendarThemeCssSource, /cal-amirthadi-yoga-card\{gap:2px;padding:8px 10px;border-top:2px solid #2c875c\}/);
  assert.match(calendarThemeCssSource, /cal-amirthadi-yoga-card\.is-inauspicious\{border-top-color:#b42318\}/);
  assert.match(dailyCalendarSource, /daily\.amirthadiYogaSegments/);
  assert.doesNotMatch(dailyCalendarSource, /getTamilDayYoga\\(weekday,dayStar\\)/);
});

test('Amirthadi timeline uses Panchang Nakshatra boundaries from local sunrise to following sunrise', () => {
  const input = { lat: 11.2342, lon: 78.8808, utcOffsetMinutes: 330, date: '2026-11-16', time: '12:00' };
  const timeline = nakshatraIntervalsForLocalDay(input);
  assert.equal(timeline.available, true);
  assert.ok(timeline.intervals.length >= 1 && timeline.intervals.length <= 3);
  assert.ok(timeline.intervals[0].start.endsWith(' '+timeline.sunrise));
  assert.ok(timeline.intervals.at(-1).end.endsWith(' '+timeline.nextSunrise));
  for (let i=0;i<timeline.intervals.length;i++) {
    const item=timeline.intervals[i];
    assert.ok(item.nakshatraNumber>=1&&item.nakshatraNumber<=27);
    assert.ok(item.endTimestamp>item.startTimestamp);
    assert.ok(item.fullEndTimestamp>item.fullStartTimestamp);
    if(i) {
      assert.ok(Math.abs((timeline.intervals[i-1].endTimestamp+1)-item.startTimestamp)<2,
        'Adjacent Nakshatra intervals must meet within the boundary search precision');
      assert.notEqual(timeline.intervals[i-1].nakshatraNumber,item.nakshatraNumber,
        'A new period must begin only when Nakshatra changes');
    }
  }
  assert.ok(dailyCalendarSource.includes('cal-yoga-segment-time'));
  assert.ok(calendarCalculationWorkerSource.includes('amirthadiYogaSegments'));
});

test('Ahas Pramana converts local sunrise-to-sunset duration to Nazhigai and Vinazhigai', () => {
  assert.deepEqual(calculateAhasNazhigai('06:00','18:00'), {
    available:true,sunrise:'06:00',sunset:'18:00',daylightMinutes:720,totalVighati:1800,nazhigai:30,vinazhigai:0
  });
  assert.equal(calculateAhasNazhigai('06:00','19:00').nazhigai,32);
  assert.equal(calculateAhasNazhigai('06:00','19:00').vinazhigai,30);
  assert.equal(calculateAhasNazhigai('06:00','17:00').nazhigai,27);
  assert.equal(calculateAhasNazhigai('06:00','17:00').vinazhigai,30);
  assert.equal(calculateAhasNazhigai('—','18:00').available,false);
});

test('Ahas and Ratri Pramana exactly partition sunrise-to-next-sunrise into 60 ghatis down to Tharparai', () => {
  const equal = calculateAhasRatriPramana('06:00','18:00','06:00',12*3600,12*3600);
  assert.equal(equal.available,true);
  assert.equal(equal.totalNazhigai,60);
  assert.equal(equal.totalVighati,3600);
  assert.equal(equal.totalTharparai,216000);
  assert.deepEqual([equal.ahasNazhigai.nazhigai,equal.ahasNazhigai.vinazhigai,equal.ahasNazhigai.tharparai],[30,0,0]);
  assert.deepEqual([equal.ratriNazhigai.nazhigai,equal.ratriNazhigai.vinazhigai,equal.ratriNazhigai.tharparai],[30,0,0]);

  const unequal = calculateAhasRatriPramana('06:00','19:00','06:00',13*3600,11*3600);
  assert.deepEqual([unequal.ahasNazhigai.nazhigai,unequal.ahasNazhigai.vinazhigai,unequal.ahasNazhigai.tharparai],[32,30,0]);
  assert.deepEqual([unequal.ratriNazhigai.nazhigai,unequal.ratriNazhigai.vinazhigai,unequal.ratriNazhigai.tharparai],[27,30,0]);

  const subsecond = calculateAhasRatriPramana('06:00','18:00','06:00',43200.4,43199.6);
  assert.deepEqual([subsecond.ahasNazhigai.nazhigai,subsecond.ahasNazhigai.vinazhigai,subsecond.ahasNazhigai.tharparai],[30,0,1]);
  assert.deepEqual([subsecond.ratriNazhigai.nazhigai,subsecond.ratriNazhigai.vinazhigai,subsecond.ratriNazhigai.tharparai],[29,59,59]);
  assert.equal(subsecond.ahasNazhigai.totalTharparai+subsecond.ratriNazhigai.totalTharparai,216000,
    'Day and night must add to exactly 60 Nazhigai even after rounding to Tharparai');
});

test('Calendar Date Details use the requested Ahas day/night labels and show Tharparai', () => {
  assert.ok(dailyCalendarSource.includes("L('Ahas : Day length','அகஸ் :- பகல் மானம்')"));
  assert.ok(dailyCalendarSource.includes("L('Ahas : Night length','அகஸ் :- இரவு மானம்')"));
  assert.ok(dailyCalendarSource.includes("L('Tharparai','தற்பரை')"));
  assert.ok(calendarCalculationWorkerSource.includes('calculateAhasRatriPramana(p.sunrise,p.sunset,nextSunrise,actualDaySeconds,actualNightSeconds)'));
});

test('Nakshatra Thyajyam uses the 27-star table, four ghatis, and carries Mula beyond the 60th ghati', async () => {
  assert.equal(NAKSHATRA_THYAJYAM_START_GHATIS.length,27);
  assert.deepEqual(NAKSHATRA_THYAJYAM_START_GHATIS.slice(0,5),[51,25,31,41,15]);
  assert.equal(NAKSHATRA_THYAJYAM_START_GHATIS[18],57,'Mula Thyajyam begins at its 57th ghati');
  const input={lat:11.2342,lon:78.8808,utcOffsetMinutes:330,date:'2026-11-16',time:'12:00'};
  const timeline=nakshatraIntervalsForLocalDay(input);
  const result=thyajyamIntervalsForLocalDay(input);
  assert.equal(result.available,true);
  assert.ok(result.intervals.length>=1);
  for(const item of result.intervals){
    assert.ok(item.nakshatraNumber>=1&&item.nakshatraNumber<=27);
    assert.equal(item.endGhati-item.startGhati,4);
    assert.ok(item.endTimestamp>item.startTimestamp);
  }
  assert.equal(timeline.available,true);
  const star22=timeline.intervals.find(item=>item.nakshatraNumber===22);
  const thyajyam22=result.intervals.find(item=>item.nakshatraNumber===22);
  if(star22&&thyajyam22){
    const duration=star22.fullEndTimestamp-star22.fullStartTimestamp;
    assert.ok(Math.abs(thyajyam22.startTimestamp-(star22.fullStartTimestamp+duration*11/60))<2);
    assert.ok(Math.abs(thyajyam22.endTimestamp-(star22.fullStartTimestamp+duration*15/60))<2);
  }
  assert.match(dailyCalendarSource,/thyajyamIntervals/);
  assert.match(dailyCalendarSource,/ahasNazhigai/);
  assert.match(transitPanchangSource,/monthDays,/);
  assert.match(dailyCalendarSource,/dayFlags\.thaniyaAvailable/);
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

test('Sri Thanigai 2026-27 Thaniya dates use Dhruva, weekday and Kollam-year remainders', () => {
  // Month starts and month lengths below are taken from the published
  // Parabhava 2026-27 Sri Thanigai Tirukanitha Panchangam.
  const officialMonths = [
    [0, '2026-04-14', 31, [8, 25]],
    [1, '2026-05-15', 31, [11, 24]],
    [2, '2026-06-15', 32, [14, 28]],
    [3, '2026-07-17', 32, [9, 22]],
    [4, '2026-08-18', 31, [12, 23]],
    [5, '2026-09-18', 30, [11, 28]],
    [6, '2026-10-18', 30, [6, 23]],
    [7, '2026-11-17', 29, [16, 22]],
    [8, '2026-12-16', 30, [8, 26]],
    [9, '2027-01-15', 29, [8, 20]],
    [10, '2027-02-13', 30, [19, 28]],
    [11, '2027-03-15', 30, [20, 26]]
  ];
  for (const [index, monthStartDate, monthDays, expected] of officialMonths) {
    const result = getThaniyaNaalDates({ index, monthStartDate, monthDays });
    assert.equal(result.available, true, 'Month '+index+' must have a computable Thaniya result');
    assert.deepEqual(result.dates, expected, 'Sri Thanigai Thaniya dates for month '+index);
  }
  const margazhi = getThaniyaNaalDates({ index: 8, monthStartDate: '2026-12-16', monthDays: 30 });
  assert.equal(margazhi.kollamYear, 1202);
  assert.equal(margazhi.yearRemainder, 3);
});

test('Sri Thanigai 2025-26 Margazhi example applies the special seven-day adjustment to both dates', () => {
  // The source PDF's worked example: Dhruva 8/26 + weekday remainder 5
  // + Kollam-year remainder 2 => 15/33; after the month-overflow rule => 8/26.
  const result = getThaniyaNaalDates({ index: 8, monthStartDate: '2025-12-16', monthDays: 30 });
  assert.equal(result.available, true);
  assert.equal(result.kollamYear, 1201);
  assert.equal(result.yearRemainder, 2);
  assert.deepEqual(result.dates, [8, 26]);
});

test('Sri Thanigai Kari Naal remains a separate monthly Tyajyam list with a six-ghati sunrise window', () => {
  const aippasiKariOnly = getTamilCalendarDayFlags({
    index: 6, day: 20, monthStartDate: '2026-10-18', monthDays: 30
  });
  assert.deepEqual(aippasiKariOnly, {
    available: true, kari: true, thaniya: false, thaniyaAvailable: true
  });
  const thaniyaOnlyChithirai = getTamilCalendarDayFlags({
    index: 0, day: 8, monthStartDate: '2026-04-14', monthDays: 31
  });
  assert.deepEqual(thaniyaOnlyChithirai, {
    available: true, kari: false, thaniya: true, thaniyaAvailable: true
  });
  const unavailable = getTamilCalendarDayFlags({ index: 0, day: 10 });
  assert.deepEqual(unavailable, {
    available: true, kari: false, thaniya: false, thaniyaAvailable: false
  });
  assert.deepEqual(getTamilCalendarDayFlags(null), {
    available: false, kari: false, thaniya: false, thaniyaAvailable: false
  });
});

test('Monthly Tamil solar labels safely handle more than one boundary inside a Gregorian month', () => {
  assert.match(calendarCalculationWorkerSource, /const probeIndexes=\[\.\.\.new Set\(\[0,Math\.floor\(\(entries\.length-1\)\/2\),entries\.length-1\]/);
  assert.match(calendarCalculationWorkerSource, /while\(lo<hi\)/);
  assert.match(calendarCalculationWorkerSource, /boundaries\.push\(\{index:lo,state\}\)/);
  assert.match(calendarCalculationWorkerSource, /day:state\.offset\+dateDistance\(entries\[i\]\.date,firstDate\)/);
});


test('Night Ahas and Dinantham use the sunset-to-next-sunrise interval', () => {
  const ratri = calculateRatriNazhigai('18:00', '06:00');
  assert.equal(ratri.available, true);
  assert.equal(ratri.nightMinutes, 720);
  assert.equal(ratri.nazhigai, 30);
  assert.equal(ratri.vinazhigai, 0);

  const dinantham = calculateDinantham('18:00', '06:00');
  assert.equal(dinantham.available, true);
  assert.equal(dinantham.time, '01:30');
  assert.equal(dinantham.thirdYamaFraction, 5 / 8);

  const shortNight = calculateRatriNazhigai('18:30', '06:15');
  assert.equal(shortNight.available, true);
  assert.equal(shortNight.nightMinutes, 705);
  assert.equal(shortNight.nazhigai, 29);
  assert.equal(shortNight.vinazhigai, 23);
  assert.equal(calculateRatriNazhigai('18:00', '18:00').available, false);
});

test('Nethiram and Jeevan are derived from the Sun and sunrise Nakshatras', () => {
  const sameStar = getNethiramJeevan(27, 27);
  assert.deepEqual(
    { available: sameStar.available, nethiram: sameStar.nethiram, jeevan: sameStar.jeevan },
    { available: true, nethiram: 0, jeevan: 0 }
  );
  assert.equal(getNethiramJeevan(27, 24).nethiram, 0);
  assert.equal(getNethiramJeevan(27, 20).nethiram, 1);
  assert.equal(getNethiramJeevan(27, 18).nethiram, 2);
  assert.equal(getNethiramJeevan(27, 18).jeevan, 0);
  assert.equal(getNethiramJeevan(27, 9).jeevan, 0);
  assert.equal(getNethiramJeevan(27, 2).jeevan, 0.5);
  assert.equal(getNethiramJeevan(27, 10).jeevan, 1);
  assert.equal(getNethiramJeevan(0, 10).available, false);
});

test('All 27 Nakshatras map exactly once to upward, downward or equal-facing days', () => {
  const counts = { upper: 0, lower: 0, equal: 0 };
  for (let nakshatra = 1; nakshatra <= 27; nakshatra++) {
    const direction = getNakshatraDirection(nakshatra);
    assert.equal(direction.available, true, 'Nakshatra '+nakshatra+' must have a direction');
    counts[direction.key]++;
  }
  assert.deepEqual(counts, { upper: 9, lower: 9, equal: 9 });
  assert.equal(getNakshatraDirection(4).symbol, '↑');
  assert.equal(getNakshatraDirection(2).symbol, '↓');
  assert.equal(getNakshatraDirection(1).symbol, '↔');
  assert.equal(getNakshatraDirection(28).available, false);
});

test('Calendar Date Details render sunrise Nethiram/Jeevan, direction, Dinantham and Ratri Pramana', () => {
  assert.ok(dailyCalendarSource.includes('getNethiramJeevan(sunStar,dayStar)'));
  assert.ok(dailyCalendarSource.includes('அகஸ் :- இரவு மானம்'));
  assert.ok(dailyCalendarSource.includes('தினாந்தம் (இரவு)'));
  assert.ok(dailyCalendarSource.includes('நேத்திரம்'));
  assert.ok(dailyCalendarSource.includes('ஜீவன்'));
  assert.ok(dailyCalendarSource.includes('நட்சத்திர நோக்கு நாள்'));
  assert.ok(calendarCalculationWorkerSource.includes('sunStar:r.sunStar'));
  assert.ok(calendarCalculationWorkerSource.includes('calculateAhasRatriPramana(p.sunrise,p.sunset,nextSunrise,actualDaySeconds,actualNightSeconds)'));
  assert.ok(calendarCalculationWorkerSource.includes("offsetMinutesAt(input.timezone,nextDate,'12:00')"));
});


test('Calendar Date Details uses one green hierarchy with paired Panchang values and balanced lower cards', () => {
  assert.match(calendarThemeCssSource, /\.cal-details-summary\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:10px/);
  assert.match(calendarThemeCssSource, /\.cal-details-summary>article\{[^}]*justify-content:center;[^}]*text-align:left/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-grid\{grid-column:1\/-1;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-item\{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:4px/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-item>small\{display:block;width:100%/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-item>strong\{display:block;width:100%/);
  assert.match(calendarThemeCssSource, /\.cal-day-flags-card\{grid-column:auto;display:flex;align-items:center;justify-content:center/);
  assert.match(calendarThemeCssSource, /\.cal-shoolam-card\{grid-column:1\/-1;display:flex;align-items:center;justify-content:center/);
  assert.match(calendarThemeCssSource, /\.cal-month-grid button\{align-items:center;justify-content:flex-start/);
  assert.match(calendarThemeCssSource, /\.cal-thyajyam-card \.cal-yoga-segment-time\{align-self:center/);
  assert.match(dailyCalendarSource, /class="cal-day-flags-card"[\s\S]*?Abhijit Muhurtham/);
  const shoolamMarkup = dailyCalendarSource.match(/cal-shoolam-card"><div class="cal-shoolam-main"[\s\S]*?<\/article>/)?.[0] || '';
  assert.ok(shoolamMarkup, 'Travel Shoolam must render in its own full-width row.');
  assert.doesNotMatch(shoolamMarkup, /cal-day-flag/, 'Kari and Thaniya flags must remain separate from Travel Shoolam.');
  assert.match(calendarThemeCssSource, /@media\(max-width:340px\)[\s\S]*?\.cal-details-summary,#smvDailyCalendar \.cal-panchang-detail-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  const sourceOwnedStyles = calendarThemeCssSource.slice(calendarThemeCssSource.indexOf('/* Daily Panchang + Chandrashtama — canonical green theme hierarchy. */')).split('/* Name-yoga result')[0];
  assert.doesNotMatch(sourceOwnedStyles, /!important/);
  assert.ok(dailyCalendarSource.includes('class="cal-date-details-head smv-css-island"'));
  assert.match(calendarThemeCssSource, /\.cal-date-details-head\{[^}]*background:transparent;[^}]*box-shadow:none/);
  assert.match(calendarThemeCssSource, /\.cal-date-details-title\{display:block;width:100%;[^}]*text-align:center/);
  assert.match(calendarThemeCssSource, /smv-calendar-event-range\{display:block;width:100%;font-size:11\.5px;font-weight:750;line-height:1\.35;white-space:nowrap/);
  assert.ok(calendarThemeCssSource.includes('smv-calendar-range-separator{padding:0;color:#708477;font-weight:400}'), 'The range separator is a normal-weight hyphen with no spaces.');
  assert.ok(horoscopeRendererSource.includes('class="smv-calendar-event-time"') && horoscopeRendererSource.includes('class="smv-calendar-event-date"'), 'Compact Panchang boundaries separate time and date for independent styling.');
  assert.ok(horoscopeRendererSource.includes('class="smv-calendar-range-separator">-</strong>'), 'The Panchang range uses a hyphen without surrounding spaces.');
  assert.ok(calendarThemeCssSource.includes('smv-calendar-event-time{color:#4b0082;font-weight:700}'), 'Tithi, Nakshatra, Namah Yoga and Karana times use dark purple in bold.');
  assert.ok(calendarThemeCssSource.includes('smv-calendar-event-date{color:#52645a;font-weight:400}'), 'Date values remain regular-weight neutral text.');
  assert.ok(calendarThemeCssSource.includes('nalla-neram-time{color:#00c853;font-weight:700}'), 'Nalla Neram time alone uses bright green in bold.');
});

test('Calendar date/time selection defaults to local sunrise and recalculates using the chosen time', () => {
  assert.ok(dailyCalendarSource.includes('class="cal-date-time-fields"'), 'Date and Time must share one grouped control with Time directly below Date.');
  assert.ok(dailyCalendarSource.includes("L('Time','நேரம்')"), 'The separate Time label must be localized.');
  assert.ok(dailyCalendarSource.includes("workerCall('sunrise',sunriseInput)"), 'The initial selected time must be resolved from local sunrise.');
  assert.ok(dailyCalendarSource.includes("input(requestedDate,true,selectedTime)"), 'Daily Panchang calculations must receive the selected date and time.');
  assert.ok(dailyCalendarSource.includes("$('#calTime').onchange"), 'Changing the time must recalculate the selected Panchang.');
  assert.ok(calendarCalculationWorkerSource.includes("if(kind==='sunrise'){result=solarNoaa(input.date,input.lat,input.lon,input.utcOffsetMinutes,true);}"), 'The worker must calculate sunrise from the selected date and location.');
  assert.ok(dailyCalendarCssSource.includes('#smvDailyCalendar .cal-date-time-fields{display:grid;grid-template-columns:minmax(0,1fr)'), 'The time control must remain directly below the date on desktop and mobile.');
});

test('SMV CALENDAR daily Panchang and Hora follow the green result hierarchy', () => {
  assert.match(horoscopeRendererSource, /const calendarPresentation = rootId === 'calDaily';/);
  assert.ok(horoscopeRendererSource.includes("const raw=String(v??'—').trim();const m=raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2})/);"), 'Daily Panchang event ranges accept ISO 8601 T separators as well as date-space-time values.');
  assert.match(horoscopeRendererSource, /smv-calendar-neutral-date-time/);
  assert.match(horoscopeRendererSource, /smv-calendar-normal-connector/);
  assert.match(horoscopeRendererSource, /smv-calendar-primary-result-row/);
  assert.match(horoscopeRendererSource, /i<=7/);
  assert.match(horoscopeRendererSource, /smv-calendar-bright-red-time/);
  assert.match(horoscopeRendererSource, /smv-calendar-degree-normal/);
  assert.ok(dailyCalendarSource.includes("['Asc','லக்']"),
    'Only the Calendar transit-position table shortens Ascendant to லக்.');
  assert.ok(publicRasiPalanSource.includes('ராசி பலன்கள் & கிரக கோச்சார பலன்கள்'),
    'Calendar Rasi Palan heading uses the requested Tamil wording.');
  assert.ok(calendarIndexSource.includes('ராசி பலன்கள் & கிரக கோச்சார பலன்கள்'),
    'Calendar module fallback uses the same requested Tamil heading.');
  assert.match(rasiPalanCss, /#calRasiPalan \.rp-heading h2\{font-size:19px!important;line-height:1\.35!important;margin:5px 0\}/, 'Rasi Palan heading uses the compact desktop size.');
   assert.match(rasiPalanCss, /@media\(max-width:680px\)\{\s*#calRasiPalan \.rp-heading h2\{font-size:17px!important\}/, 'Rasi Palan heading uses the compact mobile size.');
   assert.ok(rasiPalanCss.includes('#calRasiPalan .rp-heading h2{color:#15564e!important'),
    'Rasi Palan heading must use the established green theme colour.');
  assert.ok(calendarIndexSource.includes("const version='20261118-calendar-green-heading-v4'"),
    'The dynamically loaded Rasi Palan CSS must use the new version marker.');
  assert.match(dailyCalendarSource, /hora-time smv-calendar-neutral-time/);
  assert.match(calendarThemeCssSource, /cal-name-yoga-label\{color:#426957;font-size:11px;font-weight:700\}/);
  assert.match(calendarThemeCssSource, /cal-panchang-detail-item\.is-primary>strong\{color:#15564e;font-size:14px;font-weight:700\}/);
  assert.match(calendarThemeCssSource, /smv-calendar-bright-red-time\{color:#b42318;font-weight:800\}/);
  assert.match(calendarThemeCssSource, /smv-calendar-normal-connector\{margin:0 3px;color:#708477;font-weight:400\}/);
  assert.match(sharedHoroscopeCssSource, /event-date:not\(\.smv-calendar-neutral-date-time\)/);
  assert.match(sharedHoroscopeCssSource, /event-time:not\(\.smv-calendar-neutral-date-time\)/);
  assert.match(sharedHoroscopeCssSource, /hora-time:not\(\.smv-calendar-neutral-time\)/);
  assert.match(sharedHoroscopeCssSource, /transit-table-degree:not\(\.smv-calendar-degree-normal\)/);
  assert.match(calendarIndexSource, /daily-calendar\.mjs\?v=20261119-calendar-transit-typography-v3/);
  assert.match(calendarIndexSource, /calendar-theme\.css\?v=20261119-calendar-transit-typography-v3/);
  const releases = [astroServiceWorkerSource, horoscopeServiceWorkerSource, calendarWorkerSource]
    .map(source => source.match(/const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST \? '([^']+)' : '([^']+)';/));
  assert.ok(releases.every(Boolean), 'All three service workers must define the synchronized release marker.');
  assert.equal(new Set(releases.map(match => match[1])).size, 1);
  assert.equal(new Set(releases.map(match => match[2])).size, 1);
  assert.equal(releases[0][1], '20261119-calendar-transit-typography-v3');
  assert.equal(releases[0][2], '20261119-calendar-transit-typography-v3');
});


test('Amirthadi Yoga results each occupy a natural left/right card beside the Tamil date', () => {
  assert.match(dailyCalendarSource, /const yogaCardsHtml=yogaSegments\.length\?yogaSegments\.map/);
  assert.ok(dailyCalendarSource.includes("class=\"cal-day-yoga-cards\" data-yoga-count=\"'+yogaSegments.length+'\">'+yogaCardsHtml+'</div>'"), 'The Yoga count container renders only real Yoga cards.');
  assert.match(dailyCalendarSource, /segment===yogaSegments\[0\]\?yogaReferenceHtml/);
  assert.match(calendarThemeCssSource, /\.cal-details-summary>\.cal-day-yoga-cards\{display:contents\}/);
  assert.match(calendarThemeCssSource, /\.cal-amirthadi-yoga-card/);
  assert.doesNotMatch(dailyCalendarSource, /cal-empty-yoga-card|cal-empty-yoga-slot/);
  assert.match(dailyCalendarSource, /class="cal-day-yoga-card cal-thyajyam-card is-inauspicious"/);
});

test('Amirthadi Yoga and Thyajyam keep a compact visual rhythm without verbose notes', () => {
  assert.match(calendarThemeCssSource, /cal-amirthadi-yoga-card\{gap:2px;padding:8px 10px;border-top/);
  assert.match(calendarThemeCssSource, /cal-yoga-segment\{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:2px/);
  assert.match(calendarThemeCssSource, /cal-yoga-reference\{display:block;align-self:flex-start;margin:0/);
  assert.match(calendarThemeCssSource, /cal-thyajyam-card\{gap:2px;padding:8px 10px;border-top/);
  assert.match(calendarThemeCssSource, /cal-thyajyam-card \.cal-yoga-segments\{display:grid;gap:2px/);
  assert.match(dailyCalendarSource, /L\('Nakshatra Thyajyam','நட்சத்திர தியாஜ்யம்'\)/);
  assert.doesNotMatch(dailyCalendarSource, /Based on the star’s 60-ghati division|நட்சத்திரத்தின் 60 நாழிகைப் பிரிவில்/);
  assert.match(calendarThemeCssSource, /cal-chandrashtama-result\{margin:0;color:#28734d;font-size:16px;font-weight:800/);
  assert.ok(calendarThemeCssSource.includes('#smvDailyCalendar .cal-chandrashtama{'), 'The main Chandrashtama layer has a flat, borderless presentation rule.');
  assert.equal(dailyCalendarCssSource.split('.cal-summary article:not(.cal-chandrashtama):not(.cal-chandra-window),.cal-planets article').length - 1,3, 'Chandrashtama is excluded from every generic summary-card border/padding rule.');
});

test('Calendar Daily Panchang values are integrated before Nakshatra Thyajyam without a date-only card', () => {
  assert.match(dailyCalendarSource, /L\('Daily Panchang','தினசரி பஞ்சாங்கம்'\)/);
  assert.match(dailyCalendarSource, /id="calPanchangSource" hidden aria-hidden="true"/);
  assert.match(dailyCalendarSource, /cal-panchang-detail-grid/);
  assert.ok(dailyCalendarSource.includes('cal-panchang-detail-item smv-css-island'), 'Integrated Panchang cards must be isolated from the shared Horoscope small-label override.');
  assert.match(dailyCalendarSource, /row\.cells\?\.\[0\]\?\.textContent\?\.trim\(\)!==L\('Date','தேதி'\)/);
  assert.match(horoscopeRendererSource, /const calendarPanchangSlot=calendarPresentation\?document\.getElementById\('calPanchangSource'\):null/);
  assert.match(horoscopeRendererSource, /if\(calendarPanchangSlot\)calendarPanchangSlot\.innerHTML=dailyTable/);
  assert.match(horoscopeRendererSource, /let h=calendarPanchangSlot\?'':/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-grid/);
  assert.match(calendarThemeCssSource, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-item>small/);
  assert.match(calendarThemeCssSource, /\.cal-panchang-detail-item>strong/);
});

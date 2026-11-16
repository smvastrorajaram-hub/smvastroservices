// Focused Chromium smoke test against the exact public source checked out for this commit.
// It exercises SMV CALENDAR's Rasi Palan and daily calculation path and saves visual evidence.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { periodReference } from '../public/horoscope/calendar/rasi-palan-periods.mjs';

const previewUrl = process.env.SMV_CALENDAR_PREVIEW_URL ||
  'http://127.0.0.1:4173/horoscope/calendar/';
const outputDir = new URL('../calendar-rasi-palan-smoke-output/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true
});
const runtimeErrors = [];
try {
  const page = await browser.newPage();
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const messageText = message.text();
    // Chromium reports this external Google frame as a console error even though
    // the site's frame-ancestors policy is report-only and does not block the page.
    // Ignore only this exact report-only notice; real CSP blocks and app errors fail.
    const knownReportOnlyGoogleFrameNotice =
      messageText.includes("Framing 'https://www.google.com/' violates the following report-only Content Security Policy directive:") &&
      messageText.includes("frame-ancestors 'self'");
    if (knownReportOnlyGoogleFrameNotice) return;
    const location = message.location?.() || {};
    runtimeErrors.push('console: ' + messageText + (location.url ? ' [source=' + location.url + ']' : ''));
  });
  // Test the deployed current source, not an installed/stale PWA service-worker shell.
  await page.setBypassServiceWorker(true);
  // Keep the deployed source test independent from the Calendar PWA's one-time
  // service-worker controllerchange reload. That reload is covered separately;
  // this smoke test must inspect the current network-delivered DOM without races.
  await page.evaluateOnNewDocument(() => {
    const smokeServiceWorker = {
      controller: null,
      addEventListener() {},
      register: () => Promise.reject(new Error('Service worker is disabled in the Calendar browser smoke test'))
    };
    try {
      Object.defineProperty(Navigator.prototype, 'serviceWorker', {
        configurable: true,
        get: () => smokeServiceWorker
      });
    } catch (_) {}
  });
  await page.setCacheEnabled(false);
  page.setDefaultTimeout(90000);
  page.on('response', response => { if (response.status() >= 400) runtimeErrors.push('http ' + response.status() + ': ' + response.url()); });
  page.on('pageerror', error => runtimeErrors.push(error.message));
  let ready = false;
  let lastError = null;
  for (let attempt = 1; attempt <= 8 && !ready; attempt++) {
    try {
      await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('#smvDailyCalendar', { timeout: 20000 });
      await page.waitForSelector('#calRasiPalan .rp-tabs button[data-section="period"]', { timeout: 45000 });
      await page.waitForFunction(() => {
        const nav = [...document.querySelectorAll('.calendar-product-nav a')].map(a => a.textContent.trim());
        return Boolean(document.querySelector('#calRasiPalan #rpRasi')) &&
          JSON.stringify(nav) === JSON.stringify(['Services', 'Horoscope']);
      }, { timeout: 45000 });
      ready = true;
    } catch (error) {
      lastError = error;
      if (attempt < 8) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  assert.ok(ready, 'Calendar source did not become ready: ' + (lastError?.message || 'unknown error'));

  const calendarHeader = await page.evaluate(() => {
    const header = document.querySelector('.calendar-topbar');
    const logo = document.querySelector('.calendar-brand-header img');
    const title = document.querySelector('.calendar-brand-title');
    const controls = [...document.querySelectorAll('.calendar-header-actions .calendar-product-nav a, .calendar-header-actions .calendar-language-switch button')];
    return {
      background: header ? getComputedStyle(header).backgroundColor : '',
      title: title?.textContent?.trim() || '',
      logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
      logoSrc: logo?.getAttribute('src') || '',
      controls: controls.map(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    };
  });
  assert.equal(calendarHeader.background, 'rgb(15, 81, 76)', 'Calendar header must use the established site green.');
  assert.equal(calendarHeader.title, 'SMV CALENDAR', 'Calendar header must show the product name.');
  assert.equal(calendarHeader.logoLoaded, true, 'Calendar header must load its dedicated product logo.');
  assert.match(calendarHeader.logoSrc, /smv-calendar-website\.webp/);
  assert.equal(calendarHeader.controls.length, 4, 'Calendar header must show two product links and two language controls.');
  assert.ok(Math.max(...calendarHeader.controls.map(x => x.width)) - Math.min(...calendarHeader.controls.map(x => x.width)) < 1, 'All four Calendar header controls must have equal width.');
  assert.ok(calendarHeader.controls.every(x => Math.abs(x.height - 42) < 1), 'All four Calendar header controls must have the same 42px height.');

  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    return status && (/Unable to calculate|கணக்கிட முடியவில்லை/.test(status) || (!/Calculating Panchang|பஞ்சாங்கம், ஹோரை/.test(status) && !/Loading monthly calendar|மாத நாட்காட்டி தயாராகிறது/.test(document.querySelector('#calMonth')?.textContent||'')));
  }, { timeout: 90000 });
  const calendarCalculationStatus = await page.$eval('#calStatus', el => el.textContent || '');
  await page.waitForSelector('#calMuhurtaLagna .cal-muhurta-lagna-grid .cal-muhurta-lagna-item', { timeout: 30000 });
  const muhurtaLagnaUi = await page.$eval('#calMuhurtaLagna', el => ({
    labels: [...el.querySelectorAll('.cal-muhurta-lagna-item > small')].map(node => node.textContent.trim()),
    verdict: el.querySelector('.cal-subha-verdict')?.textContent.trim() || '',
    balanceLine: el.querySelector('.cal-rasi-balance-line')?.textContent.trim() || ''
  }));
  assert.equal(muhurtaLagnaUi.labels.length, 2, 'Date Details must show the Subha Muhurtham and Lagna items side by side.');
  assert.ok(/Subha Muhurtham|சுபமுகூர்த்தம்/.test(muhurtaLagnaUi.labels[0]), 'Left item must identify the Subha Muhurtham day.');
  assert.ok(/Lagna|லக்னம்/.test(muhurtaLagnaUi.labels[1]), 'Right item must identify the current or selected-time Lagna.');
  assert.ok(muhurtaLagnaUi.verdict.length > 0, 'The Panchanga day assessment must render a result.');
  assert.ok(muhurtaLagnaUi.balanceLine.length > 0, 'The solar-ingress Lagna-balance line must render a status.');

  await page.waitForFunction(() => {
    const line = document.querySelector('#calMuhurtaLagna .cal-rasi-balance-line')?.textContent || '';
    return line && !/being calculated|கணக்கிடப்படுகிறது/i.test(line);
  }, { timeout: 90000 });
  const completedLagnaBalance = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-line', el => el.textContent.trim());
  assert.ok(!/unavailable|கணக்கிட முடியவில்லை/i.test(completedLagnaBalance), 'Solar-ingress Lagna balance must calculate successfully: ' + completedLagnaBalance);
  assert.ok(/Lagna balance|லக்ன இருப்பு/.test(completedLagnaBalance), 'The completed result must contain the Lagna balance value.');

  // Numerical ingress-Lagna regression: calculate a fixed Perambalur fixture in
  // the real Calendar worker, then independently re-evaluate the ascendant on
  // both sides of the reported sign-boundary time using the local Swiss WASM.
  const ingressLagnaFixture = await page.evaluate(async fixture => {
    const worker = new Worker('/horoscope/calendar-worker.mjs', { type: 'module' });
    const requestId = 'calendar-ingress-lagna-numerical-regression';
    let calculated;
    try {
      calculated = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Ingress Lagna worker timed out.')), 120000);
        worker.addEventListener('message', event => {
          if (event.data?.id !== requestId) return;
          clearTimeout(timeout);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.result);
        });
        worker.postMessage({ id: requestId, kind: 'lagna-balance', input: fixture });
      });
    } finally {
      worker.terminate();
    }

    if (!calculated) throw new Error('Ingress Lagna worker returned no numerical result.');
    const swiss = await import('/horoscope/offline/swiss_vedic.browser.mjs');
    const ingressTimestamp = Date.parse(calculated.ingressDate + 'T' + calculated.ingressTime + 'Z') -
      Number(fixture.utcOffsetMinutes) * 60000;
    const localDateTimeAt = timestamp => {
      const local = new Date(timestamp + Number(fixture.utcOffsetMinutes) * 60000);
      const pad = value => String(value).padStart(2, '0');
      return {
        date: local.getUTCFullYear() + '-' + pad(local.getUTCMonth() + 1) + '-' + pad(local.getUTCDate()),
        time: pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes()) + ':' + pad(local.getUTCSeconds())
      };
    };
    const ascendantAt = timestamp => swiss.calculateAscendantAt({
      ...fixture,
      ...localDateTimeAt(timestamp)
    });
    const start = await ascendantAt(ingressTimestamp);
    const oneSecondLater = await ascendantAt(ingressTimestamp + 1000);
    const swissOneSecondStep = (oneSecondLater.julianDayUt - start.julianDayUt) * 86400;
    let low = ingressTimestamp;
    let high = null;
    for (let minute = 5; minute <= 360; minute += 5) {
      const candidateTime = ingressTimestamp + minute * 60000;
      const candidate = await ascendantAt(candidateTime);
      if (candidate.signIndex !== start.signIndex) {
        low = candidateTime - 5 * 60000;
        high = candidateTime;
        break;
      }
    }
    if (high === null) throw new Error('Independent Swiss ascendant scan did not reach the next Rasi boundary.');
    for (let iteration = 0; iteration < 18; iteration++) {
      const middle = (low + high) / 2;
      const candidate = await ascendantAt(middle);
      if (candidate.signIndex === start.signIndex) low = middle;
      else high = middle;
    }
    const independentBoundarySeconds = (high - ingressTimestamp) / 1000;
    const boundary = await ascendantAt(high);
    const predicted = await ascendantAt(ingressTimestamp + Number(calculated.balanceSeconds) * 1000);
    const before = await ascendantAt(ingressTimestamp + Math.max(0, Number(calculated.balanceSeconds) - 90) * 1000);
    const after = await ascendantAt(ingressTimestamp + (Number(calculated.balanceSeconds) + 90) * 1000);
    return {
      ...calculated,
      independentCheck: {
        startSignIndex: start.signIndex,
        startLongitude: start.longitude,
        startArmcDegrees: start.armcDegrees,
        startJulianDayUt: start.julianDayUt,
        boundarySignIndex: boundary.signIndex,
        boundaryLongitude: boundary.longitude,
        boundaryArmcDegrees: boundary.armcDegrees,
        boundaryJulianDayUt: boundary.julianDayUt,
        predictedSignIndex: predicted.signIndex,
        predictedLongitude: predicted.longitude,
        predictedArmcDegrees: predicted.armcDegrees,
        predictedJulianDayUt: predicted.julianDayUt,
        beforeBoundarySignIndex: before.signIndex,
        afterBoundarySignIndex: after.signIndex,
        independentBoundarySeconds,
        swissOneSecondStepSeconds:swissOneSecondStep,
        startLocal: localDateTimeAt(ingressTimestamp),
        boundaryLocal: localDateTimeAt(ingressTimestamp + independentBoundarySeconds * 1000),
        predictedLocal: localDateTimeAt(ingressTimestamp + Number(calculated.balanceSeconds) * 1000),
        startSwissInput: {date:start.inputLocalDate,time:start.inputLocalTime,offset:start.utcOffsetMinutesUsed},
        boundarySwissInput: {date:boundary.inputLocalDate,time:boundary.inputLocalTime,offset:boundary.utcOffsetMinutesUsed},
        predictedSwissInput: {date:predicted.inputLocalDate,time:predicted.inputLocalTime,offset:predicted.utcOffsetMinutesUsed}
      }
    };
  }, {
    date: '2026-11-17',
    time: '12:00',
    lat: 11.23,
    lon: 78.88,
    utcOffsetMinutes: 330,
    houseSystem: 'S'
  });

  assert.equal(ingressLagnaFixture.ingressDate, '2026-11-16', 'The selected 17 Nov 2026 sunrise must use the preceding Scorpio ingress.');
  assert.equal(ingressLagnaFixture.sunSignIndex, 7, 'The defining Sun ingress must be into Scorpio.');
  assert.match(ingressLagnaFixture.ingressTime, /^\d{2}:\d{2}:\d{2}$/, 'Ingress time must retain seconds.');
  assert.match(ingressLagnaFixture.sunrise, /^\d{2}:\d{2}$/, 'The selected town sunrise must be returned.');
  assert.equal(ingressLagnaFixture.method, 'oblique-ascension', 'Calendar must use the shared Oblique Ascension Rasi Mana method.');
  assert.equal(ingressLagnaFixture.rasiManaAvailable, true, 'Perambalur must return the complete 12-sign Rasi Mana table.');
  assert.equal(ingressLagnaFixture.rasiMana.length, 12, 'All 12 Rasi Mana rows must be returned.');
  assert.equal(ingressLagnaFixture.rasiMana.reduce((sum, row) => sum + row.totalVighati, 0), 3600,
    'The full Rasi Mana table must total 60 nazhigai.');
  assert.ok(Math.abs(ingressLagnaFixture.independentCheck.swissOneSecondStepSeconds - 1) < 0.1,
    'Swiss UTC conversion must preserve a one-second step, not add seconds as whole minutes: ' +
    ingressLagnaFixture.independentCheck.swissOneSecondStepSeconds);
  console.log('CALENDAR_OA_BOUNDARY_DIAGNOSTIC ' + JSON.stringify({
    reportedBalanceSeconds: ingressLagnaFixture.balanceSeconds,
    independentBoundarySeconds: ingressLagnaFixture.independentCheck.independentBoundarySeconds,
    differenceSeconds: ingressLagnaFixture.balanceSeconds - ingressLagnaFixture.independentCheck.independentBoundarySeconds,
    startSignIndex: ingressLagnaFixture.independentCheck.startSignIndex,
    startLongitude: ingressLagnaFixture.independentCheck.startLongitude,
    startArmcDegrees: ingressLagnaFixture.independentCheck.startArmcDegrees,
    startJulianDayUt: ingressLagnaFixture.independentCheck.startJulianDayUt,
    boundarySignIndex: ingressLagnaFixture.independentCheck.boundarySignIndex,
    boundaryJulianDayUt: ingressLagnaFixture.independentCheck.boundaryJulianDayUt,
    predictedSignIndex: ingressLagnaFixture.independentCheck.predictedSignIndex,
    predictedLongitude: ingressLagnaFixture.independentCheck.predictedLongitude,
    predictedArmcDegrees: ingressLagnaFixture.independentCheck.predictedArmcDegrees,
    predictedJulianDayUt: ingressLagnaFixture.independentCheck.predictedJulianDayUt,
    boundaryLongitude: ingressLagnaFixture.independentCheck.boundaryLongitude,
    boundaryArmcDegrees: ingressLagnaFixture.independentCheck.boundaryArmcDegrees,
    beforeBoundarySignIndex: ingressLagnaFixture.independentCheck.beforeBoundarySignIndex,
    afterBoundarySignIndex: ingressLagnaFixture.independentCheck.afterBoundarySignIndex,
    lagnaSignIndex: ingressLagnaFixture.lagnaSignIndex,
    ayanamsaDegrees: ingressLagnaFixture.ayanamsaDegrees,
    obliquityDegrees: ingressLagnaFixture.obliquityDegrees,
    lagnaLongitude: ingressLagnaFixture.lagnaLongitude,
    armcDegrees: ingressLagnaFixture.armcDegrees,
    currentObliqueAscension: ingressLagnaFixture.currentObliqueAscension,
    startLocal: ingressLagnaFixture.independentCheck.startLocal,
    swissOneSecondStepSeconds: ingressLagnaFixture.independentCheck.swissOneSecondStepSeconds,
    boundaryLocal: ingressLagnaFixture.independentCheck.boundaryLocal,
    predictedLocal: ingressLagnaFixture.independentCheck.predictedLocal,
    startSwissInput: ingressLagnaFixture.independentCheck.startSwissInput,
    boundarySwissInput: ingressLagnaFixture.independentCheck.boundarySwissInput,
    predictedSwissInput: ingressLagnaFixture.independentCheck.predictedSwissInput
  }));
  assert.ok(Math.abs(ingressLagnaFixture.balanceSeconds -
    ingressLagnaFixture.independentCheck.independentBoundarySeconds) <= 60,
    'OA balance must match independent Swiss boundary within 60 seconds: ' +
    JSON.stringify({reported:ingressLagnaFixture.balanceSeconds,independent:ingressLagnaFixture.independentCheck.independentBoundarySeconds}));
  assert.ok(Number.isInteger(ingressLagnaFixture.balanceSeconds) &&
    ingressLagnaFixture.balanceSeconds >= 1800 && ingressLagnaFixture.balanceSeconds <= 18000,
    'Ingress Lagna balance must be a plausible positive numerical duration: ' + JSON.stringify(ingressLagnaFixture));
  const expectedTotalVighati = Math.round(ingressLagnaFixture.balanceSeconds / 24);
  assert.equal(ingressLagnaFixture.balanceNazhigai, Math.floor(expectedTotalVighati / 60),
    'Nazhigai must be derived from the reported balance seconds.');
  assert.equal(ingressLagnaFixture.balanceVinazhigai, expectedTotalVighati % 60,
    'Vinazhigai must be derived from the reported balance seconds.');
  assert.equal(ingressLagnaFixture.independentCheck.startSignIndex, ingressLagnaFixture.lagnaSignIndex,
    'The independently calculated ascendant at exact solar ingress must match the returned ingress Lagna.');
  assert.equal(ingressLagnaFixture.independentCheck.beforeBoundarySignIndex, ingressLagnaFixture.lagnaSignIndex,
    'The ascendant immediately before the reported balance must remain in the ingress Lagna.');
  assert.ok(Math.abs(ingressLagnaFixture.balanceSeconds -
    ingressLagnaFixture.independentCheck.independentBoundarySeconds) <= 60,
    'Oblique Ascension balance must match an independent Swiss ascendant boundary within one minute.');
  assert.equal(ingressLagnaFixture.independentCheck.afterBoundarySignIndex,
    (ingressLagnaFixture.lagnaSignIndex + 1) % 12,
    'The independently calculated ascendant after the reported balance must have entered the next Rasi.');
  console.log('CALENDAR_INGRESS_LAGNA_NUMERICAL_REGRESSION ' + JSON.stringify(ingressLagnaFixture));



  assert.ok(!/Unable to calculate|கணக்கிட முடியவில்லை/.test(calendarCalculationStatus), 'Daily Calendar must calculate successfully after the Sun/Moon validation fix: ' + calendarCalculationStatus);

  const publicUi = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    modeControl: Boolean(document.querySelector('#rpMode')),
    dateControl: Boolean(document.querySelector('#rpDate')),
    yearControl: Boolean(document.querySelector('#rpYear')),
    editor: Boolean(document.querySelector('.rp-manual-editor')),
    exportControl: Boolean(document.querySelector('#rpExport')),
    givenNote: document.body.innerText.includes('தானியங்கி முறையில் உள்ளூர் Swiss Ephemeris நிரயண கிரக நிலைகளும்'),
    tabs: [...document.querySelectorAll('#calRasiPalan [data-section]')].map(x => x.textContent.trim()),
    navLabels: [...document.querySelectorAll('.calendar-product-nav a')].map(x => x.textContent.trim()),
    hasRasiPicker: Boolean(document.querySelector('#calRasiPalan #rpRasi')),
    separateAdminLink: Boolean(document.querySelector('.calendar-product-nav a[href=\"./admin.html\"]'))
  }));
  assert.equal(publicUi.modeControl, false, 'Public Calendar must not show the prediction mode selector');
  assert.equal(publicUi.dateControl, false, 'Public Calendar must not show a customer reference-date selector');
  assert.equal(publicUi.yearControl, false, 'Customers must not be able to change the Rasi Palan year');
  assert.equal(publicUi.editor, false, 'Public Calendar must not show the manual editor');
  assert.equal(publicUi.exportControl, false, 'Public Calendar must not show manual JSON export');
  assert.equal(publicUi.givenNote, false, 'The specified calculation note must be removed');
  assert.equal(publicUi.tabs.length, 4, 'All four Rasi Palan sections should be present');
  assert.deepEqual(publicUi.navLabels, ['Services', 'Horoscope'], 'Calendar navigation should contain only Services and Horoscope');


  const calendarDate = await page.$eval('#calDate', el => el.value);

  // Confirm the published Tamil annual list controls the two requested 2026
  // examples; no live Panchanga score may override the published date table.
  async function checkMuhurthamDate(date, expectedPattern) {
    await page.$eval('#calDate', (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, date);
    await page.waitForFunction(({ date: value, pattern }) => {
      const status = document.querySelector('#calStatus')?.textContent || '';
      const verdict = document.querySelector('#calMuhurtaLagna .cal-subha-verdict')?.textContent || '';
      return status.includes(value) && new RegExp(pattern).test(verdict);
    }, { timeout: 90000 }, { date, pattern: expectedPattern.source });
    const verdict = await page.$eval('#calMuhurtaLagna .cal-subha-verdict', el => el.textContent.trim());
    assert.match(verdict, expectedPattern, 'Published Muhurtham list classification for ' + date);
  }
  await checkMuhurthamDate('2026-11-11', /Valarpirai Subha Muhurtham day|வளர்பிறை சுபமுகூர்த்த நாள்/);
  await checkMuhurthamDate('2026-11-13', /Valarpirai Subha Muhurtham day|வளர்பிறை சுபமுகூர்த்த நாள்/);
  await checkMuhurthamDate('2026-11-12', /No Subha Muhurtham day|சுபமுகூர்த்த நாள் இல்லை/);
  await checkMuhurthamDate(calendarDate, /Subha Muhurtham day|சுபமுகூர்த்த நாள்/);
  assert.equal(publicUi.separateAdminLink, false, 'Calendar should not link to a separate Admin page');
  assert.equal(publicUi.hasRasiPicker, true, 'Public Rasi Palan must include the selected-Rasi dropdown');

  // Calendar Admin is intentionally not a separate Calendar route. The legacy admin.html redirect is covered by source regressions.
  await page.waitForSelector('#calRasiPalan #rpRasi', { timeout: 45000 });
  await page.waitForSelector('#calRasiPalan .rp-tabs button[data-section="period"]', { timeout: 45000 });
  assert.ok(await page.evaluate(() => {
    const daily = document.querySelector('#smvDailyCalendar');
    const forecasts = document.querySelector('#calRasiPalan');
    return Boolean(daily && forecasts && (daily.compareDocumentPosition(forecasts) & Node.DOCUMENT_POSITION_FOLLOWING));
  }), 'Rasi Palan and transit section must appear after the complete Daily Calendar');

  // The Period tab is already selected by default; change only the period.
  await page.select('#calRasiPalan #rpRasi', '5');
  await page.select('#calRasiPalan #rpPeriod', 'daily');
  assert.equal(await page.$('#calRasiPalan #rpDate'), null, 'Public forecast must not expose a reference-date picker');
  assert.equal(await page.$('#calRasiPalan #rpYear'), null, 'No separate public year selector should be exposed');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForSelector('#calRasiPalan .rp-results-title h3', { timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll('#calRasiPalan .rp-rasi-card').length === 1, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#calRasiPalan .rp-planet').length === 8, { timeout: 30000 });
  const dailyState = await page.$eval('#calRasiPalan', el => ({
    readings: [...el.querySelectorAll('.rp-planet h5')].map(n => n.textContent.trim()),
    moonHeading: el.querySelector('.rp-moon-transit h4')?.textContent.trim() || '',
    outputOrder: [...el.querySelectorAll('.rp-moon-transit, .rp-rasi-card')].map(node => node.classList.contains('rp-moon-transit') ? 'moon' : 'rasi'),
    context: el.querySelector('.rp-results-title p')?.textContent || ''
  }));
  assert.equal(dailyState.readings.length, 8, 'Daily output should show the eight non-Moon planets for the selected Rasi');
  assert.ok(/Moon|சந்திரன்/i.test(dailyState.moonHeading), 'Moon transit should have its own separate heading');
  assert.deepEqual(dailyState.outputOrder, ['moon', 'rasi'], 'Moon transit must appear before the eight other planets');
  assert.ok(!dailyState.readings.some(x => /Moon|சந்திரன்/i.test(x)), 'Moon must not be duplicated in the eight-planet list');
  assert.ok(/Day:|நாள்:/.test(dailyState.context), 'Daily reading should display its weekday and current local date');
  const expectedDailyLabel = await page.evaluate(date => {
    const [y,m,d]=date.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  }, calendarDate);
  assert.ok(dailyState.context.includes(expectedDailyLabel), 'Daily reading must automatically use the current Calendar local date ('+expectedDailyLabel+').');
  try {
    await page.waitForFunction(() => /Transit Moon Rasi|கோச்சார சந்திர ராசி/.test(document.querySelector('#calReadings')?.textContent || ''), { timeout: 60000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      status: document.querySelector('#calStatus')?.textContent || '(no #calStatus)',
      readings: document.querySelector('#calReadings')?.textContent?.slice(0, 1200) || '(no #calReadings or empty)',
      dailyCalendar: document.querySelector('#smvDailyCalendar')?.innerText?.slice(0, 1200) || '(no daily calendar)'
    }));
    throw new Error('Tara Bala transit Moon Rasi did not render. Diagnostic=' + JSON.stringify(diagnostic) + '; browserErrors=' + runtimeErrors.join(' | ') + '; original=' + error.message);
  }
  const birthStarState = await page.$eval('#calReadings', el => el.textContent || '');
  assert.ok(/Transit Moon Rasi|கோச்சார சந்திர ராசி/.test(birthStarState), 'Existing Tara Bala card must display the transit Moon Rasi');
  assert.ok(/Chandrashtama Rasi|சந்திராஷ்டம ராசி/.test(birthStarState), 'Existing Chandrashtama card must display its Rasi');

  await page.select('#calRasiPalan #rpPeriod', 'weekly');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForFunction(() => {
    const h = document.querySelector('#calRasiPalan .rp-results-title h3');
    const p = document.querySelector('#calRasiPalan .rp-results-title p');
    return h && /Weekly|வாரம்/.test(h.textContent) && p && /Week:|வாரம்:/.test(p.textContent);
  }, { timeout: 90000 });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-rasi-card').length), 1, 'Weekly output should be limited to the selected Rasi');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-planet').length), 8, 'Weekly output should show eight planets for the selected Rasi');
  assert.equal(await page.$eval('#calRasiPalan .rp-moon-transit', el => el.dataset.transitPlanet), 'Moon', 'Weekly output should include a separate Moon transit prediction');
  assert.equal(await page.$eval('#calRasiPalan .rp-rasi-card', el => el.dataset.rasiIndex), '5', 'Selected Rasi must remain fixed when changing period');
  const weeklyContext = await page.$eval('#calRasiPalan .rp-results-title p', el => el.textContent || '');
  const weeklyRef = periodReference('weekly', calendarDate);
  const formatWeekDate = date => {
    const [y,m,d]=date.split('-').map(Number);
    return String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0')+'/'+y;
  };
  assert.ok(weeklyContext.includes(formatWeekDate(weeklyRef.start)) && weeklyContext.includes(formatWeekDate(weeklyRef.end)), 'Weekly output must use its automatic current weekly window.');
  // Capture the mobile layout before additional forecast sections.
  // This keeps screenshot rasterization independent of the heavier result DOM.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$eval('#calRasiPalan', el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: new URL('calendar-rasi-palan-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.screenshot({
    path: new URL('calendar-rasi-palan-desktop.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });

  await page.select('#calRasiPalan #rpPeriod', 'monthly');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForFunction(() => {
    const titles = [...document.querySelectorAll('#calRasiPalan .rp-results-title h3')].map(h => h.textContent);
    const contexts = [...document.querySelectorAll('#calRasiPalan .rp-results-title p')].map(p => p.textContent);
    return titles.some(h => /English Month|ஆங்கில மாத/.test(h)) &&
      titles.some(h => /Tamil Month|தமிழ் மாத/.test(h)) &&
      contexts.some(p => /English calendar month:|ஆங்கில மாதம்:/.test(p)) &&
      contexts.some(p => /Tamil solar month:|தமிழ் மாதம்:/.test(p));
  }, { timeout: 120000 });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-rasi-card').length), 2, 'Monthly output must show both Tamil solar-month and English calendar-month forecasts for the selected Rasi');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-planet').length), 16, 'Both monthly outputs should each show eight non-Moon planets');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-moon-transit').length), 2, 'Each monthly forecast should include its own separate Moon transit prediction');

  // Validate the requested Tamil New Year label for the selected Rasi.
  await page.click('#calTamil');
  await page.waitForFunction(() => document.documentElement.lang === 'ta', { timeout: 15000 });
  await page.waitForFunction(() => JSON.stringify([...document.querySelectorAll('.calendar-product-nav a')].map(a=>a.textContent.trim())) === JSON.stringify(['சேவைகள்','ஜாதகம்']), { timeout: 15000 });
  await page.click('#calRasiPalan [data-section="tamilNewYear"]');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForFunction(() => {
    const h = document.querySelector('#calRasiPalan .rp-results-title h3');
    return h && h.textContent.includes('தமிழ் வருடப் பிறப்பு ராசி பலன்கள்');
  }, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('#calRasiPalan .rp-rasi-card').length === 1, { timeout: 30000 });
  assert.equal(await page.$eval('#calRasiPalan .rp-moon-transit', el => el.dataset.transitPlanet), 'Moon', 'Tamil New Year output should include the separate Moon transit card');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.$eval('#calRasiPalan', el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: new URL('calendar-rasi-palan-desktop-tamil-new-year.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });

  // Check the distinct English New Year label, without exposing edit controls.
  const englishButton = await page.$('#calEnglish');
  if (englishButton) {
    await englishButton.click();
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 15000 });
    await page.waitForFunction(() => JSON.stringify([...document.querySelectorAll('.calendar-product-nav a')].map(a=>a.textContent.trim())) === JSON.stringify(['Services','Horoscope']), { timeout: 15000 });
  }
  await page.click('#calRasiPalan [data-section="englishNewYear"]');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForFunction(() => {
    const h = document.querySelector('#calRasiPalan .rp-results-title h3');
    return h && (h.textContent.includes('ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்') || h.textContent.includes('English New Year Rasi Palan'));
  }, { timeout: 120000 });
  assert.equal(runtimeErrors.length, 0, 'Calendar browser runtime errors: ' + runtimeErrors.join(' | '));
  
  // Verify the dedicated Horoscope product logo/title and equal-sized header controls while keeping legacy chrome absent.
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(new URL('/horoscope/', previewUrl).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#smvHoroscopeControls #languageTamil', { timeout: 20000 });
  await page.waitForSelector('.smv-horoscope-brand-header .smv-horoscope-brand-title', { timeout: 20000 });
  const horoscopeBrand = await page.evaluate(() => {
    const logo = document.querySelector('.smv-horoscope-brand-header img');
    const title = document.querySelector('.smv-horoscope-brand-title');
    const style = title ? getComputedStyle(title) : null;
    return {
      text: title?.textContent?.trim() || '',
      logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
      logoSrc: logo?.getAttribute('src') || '',
      color: style?.color || '',
      fontFamily: style?.fontFamily || '',
      controls: [...document.querySelectorAll('#languageTamil,#languageEnglish,#smvHoroscopeAuth [data-login],#smvHoroscopeAuth [data-register],#smvHoroscopeAuth [data-logout]')].map(el => {
        const rect = el.getBoundingClientRect();
        return { label: el.textContent.trim(), width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 };
      })
    };
  });
  assert.equal(horoscopeBrand.text, 'SMV HOROSCOPE', 'Horoscope header must show the red SMV HOROSCOPE product title.');
  assert.equal(horoscopeBrand.logoLoaded, true, 'Horoscope header must load its dedicated product logo.');
  assert.match(horoscopeBrand.logoSrc, /smv-horoscope-header-logo\.png/);
  const visibleHoroscopeControls = horoscopeBrand.controls.filter(x => x.visible);
  assert.equal(visibleHoroscopeControls.length, 4, 'Signed-out Horoscope header must show two language and two account actions; Logout remains hidden.');
  assert.ok(Math.max(...visibleHoroscopeControls.map(x => x.width)) - Math.min(...visibleHoroscopeControls.map(x => x.width)) < 1, 'All visible signed-out Horoscope header controls must have equal width: ' + JSON.stringify(visibleHoroscopeControls));
  assert.ok(visibleHoroscopeControls.every(x => Math.abs(x.height - 40) < 1), 'All visible signed-out Horoscope header controls must have the same 40px height.');
  assert.equal(horoscopeBrand.color, 'rgb(255, 0, 0)', "Horoscope brand title must use the main site red.");
  assert.match(horoscopeBrand.fontFamily, /Georgia/i, "Horoscope brand title must use the main site serif brand font.");
  await page.waitForFunction(() =>
    Boolean(document.querySelector('#smvHoroscopeAuth [data-login]')) &&
    !document.querySelector('#templeHeader') &&
    !document.querySelector('.temple-hero') &&
    !document.querySelector('#siteFooter'), { timeout: 20000 });
  await page.click('#languageTamil');
  await page.waitForFunction(() =>
    document.documentElement.lang === 'ta' &&
    document.querySelector('#smvHoroscopeAuth [data-login]')?.textContent.trim() === 'உள்நுழை' &&
    document.querySelector('#smvHoroscopeAuth [data-register]')?.textContent.trim() === 'பதிவு',
    { timeout: 20000 });
  const tamilRegisterFit = await page.$eval('#smvHoroscopeAuth [data-register]', el => {
    const rect = el.getBoundingClientRect();
    return {
      label: el.textContent.trim(),
      width: rect.width,
      height: rect.height,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    };
  });
  const englishRegisterControl = visibleHoroscopeControls.find(control => control.label === 'Register');
  assert.equal(tamilRegisterFit.label, 'பதிவு', 'Tamil Register button must use the concise label.');
  assert.ok(englishRegisterControl, 'The original English Register button dimensions must be available for comparison.');
  assert.ok(Math.abs(tamilRegisterFit.width - englishRegisterControl.width) < 1, 'Tamil translation must not change the Register button width.');
  assert.ok(Math.abs(tamilRegisterFit.height - englishRegisterControl.height) < 1, 'Tamil translation must not change the Register button height.');
  assert.ok(tamilRegisterFit.scrollWidth <= tamilRegisterFit.clientWidth + 1, 'Tamil Register label must fit inside the unchanged button box.');
  await page.waitForSelector('#smvAdminOpenTools', { timeout: 20000 });
  const unauthenticatedAdminState = await page.evaluate(() => ({
    fixedHeaderAdminButton: Boolean(document.querySelector('#smvAdminRulesAccess')),
    adminEntryVisible: !document.querySelector('#smvAdminToolsEntry')?.hidden,
    normalLoginPresent: Boolean(document.querySelector('#smvHoroscopeAuth [data-login]')),
    adminPanelVisible: !document.querySelector('#smvAdminRulesPanel')?.hidden
  }));
  assert.deepEqual(unauthenticatedAdminState, {
    fixedHeaderAdminButton: false,
    adminEntryVisible: false,
    normalLoginPresent: true,
    adminPanelVisible: false
  }, 'Admin Rules and Calendar must remain hidden until the normal Horoscope login confirms Admin authorization');
  await page.click('#languageEnglish');
  await page.waitForFunction(() =>
    document.documentElement.lang === 'en' &&
    document.querySelector('#smvHoroscopeAuth [data-login]')?.textContent.trim() === 'Login' &&
    document.querySelector('#smvHoroscopeAuth [data-register]')?.textContent.trim() === 'Register',
    { timeout: 20000 });

  console.log(JSON.stringify({
    pass: true,
    previewUrl,
    sections: publicUi.tabs,
    dailyRasiCount: 1,
    selectedRasiIndex: 5,
    dailyPlanetCards: 8,
    moonTransitCards: 1,
    moonSeparateFirst: true,
    publicEditorHidden: true,
    mobileScreenshot: 'calendar-rasi-palan-mobile.png (viewport capture)',
    desktopScreenshot: 'calendar-rasi-palan-desktop-tamil-new-year.png (viewport capture)'
  }));
} finally {
  await browser.close();
}

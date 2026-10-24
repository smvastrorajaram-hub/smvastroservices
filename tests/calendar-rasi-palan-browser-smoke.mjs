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
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push('console: ' + message.text()); });
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

  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    return status && (/Unable to calculate|கணக்கிட முடியவில்லை/.test(status) || (!/Calculating Panchang|பஞ்சாங்கம், ஹோரை/.test(status) && !/Loading monthly calendar|மாத நாட்காட்டி தயாராகிறது/.test(document.querySelector('#calMonth')?.textContent||'')));
  }, { timeout: 90000 });
  const calendarCalculationStatus = await page.$eval('#calStatus', el => el.textContent || '');
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
  const calendarDate = await page.$eval('#calDate', el => el.value);
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

  // Verify the SMV HOROSCOPE header in Tamil at mobile and desktop widths.
  await page.setCacheEnabled(false);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(new URL('/horoscope/', previewUrl).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#templeHeader .header-navigation a', { timeout: 20000 });
    await page.click('#languageTamil');
    await page.waitForFunction(() =>
      JSON.stringify([...document.querySelectorAll('#templeHeader .header-navigation a')].map(a => a.textContent.trim())) ===
      JSON.stringify(['சேவைகள்', 'திருமணப் பொருத்தம்', 'நாட்காட்டி']), { timeout: 20000 });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
      const metrics = await page.$eval('#templeHeader .header-navigation a', anchors => anchors.map(anchor => {
        const box = anchor.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(anchor);
        const textRects = [...range.getClientRects()].map(rect => ({
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom
        }));
        const style = getComputedStyle(anchor);
        return {
          label: anchor.textContent.trim(),
          width: box.width,
          height: box.height,
          clientWidth: anchor.clientWidth,
          scrollWidth: anchor.scrollWidth,
          whiteSpace: style.whiteSpace,
          textFits: textRects.length > 0 && textRects.every(rect =>
            rect.left >= box.left - 1 && rect.right <= box.right + 1 &&
            rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1)
        };
      }));
      assert.equal(metrics.length, 3, 'Horoscope header must contain exactly three navigation buttons');
      assert.ok(metrics.every(item => item.whiteSpace === 'normal'), 'Tamil header labels must be allowed to wrap');
      assert.ok(metrics.every(item => item.textFits && item.scrollWidth <= item.clientWidth + 1),
        'Tamil header text must stay completely inside its button: ' + JSON.stringify(metrics));
      assert.ok(Math.max(...metrics.map(item => item.width)) - Math.min(...metrics.map(item => item.width)) < 1,
        'All three Horoscope header buttons must have equal width: ' + JSON.stringify(metrics));
      assert.ok(Math.max(...metrics.map(item => item.height)) - Math.min(...metrics.map(item => item.height)) < 1,
        'All three Horoscope header buttons must have equal height: ' + JSON.stringify(metrics));
    }
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

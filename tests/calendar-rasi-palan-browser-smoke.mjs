// Focused Chromium smoke test against the active Cloudflare branch preview.
// It exercises only SMV CALENDAR's new Rasi Palan area and saves visual evidence.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const previewUrl = process.env.SMV_CALENDAR_PREVIEW_URL ||
  'https://fix-calendar-admin-navigatio.smvastroservices.pages.dev/horoscope/calendar/';
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
          JSON.stringify(nav) === JSON.stringify(['SMV ASTRO', 'SMV HOROSCOPE', 'Admin']);
      }, { timeout: 45000 });
      ready = true;
    } catch (error) {
      lastError = error;
      if (attempt < 8) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  assert.ok(ready, 'Calendar branch preview did not become ready: ' + (lastError?.message || 'unknown error'));

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
    hasRasiPicker: Boolean(document.querySelector('#calRasiPalan #rpRasi'))
  }));
  assert.equal(publicUi.modeControl, false, 'Public Calendar must not show the prediction mode selector');
  assert.equal(publicUi.dateControl, false, 'Customers must not be able to change the Rasi Palan date');
  assert.equal(publicUi.yearControl, false, 'Customers must not be able to change the Rasi Palan year');
  assert.equal(publicUi.editor, false, 'Public Calendar must not show the manual editor');
  assert.equal(publicUi.exportControl, false, 'Public Calendar must not show manual JSON export');
  assert.equal(publicUi.givenNote, false, 'The specified calculation note must be removed');
  assert.equal(publicUi.tabs.length, 4, 'All four Rasi Palan sections should be present');
  assert.deepEqual(publicUi.navLabels, ['SMV ASTRO', 'SMV HOROSCOPE', 'Admin'], 'Header should preserve ASTRO/HOROSCOPE and replace Calendar nav label with Admin');
  assert.equal(publicUi.hasRasiPicker, true, 'Public Rasi Palan must include the selected-Rasi dropdown');

  // Capture the actual link target and final URL so a routing failure is actionable.
  const adminHref = await page.$eval('.calendar-product-nav a[aria-current="page"]', a => a.href);
  await page.click('.calendar-product-nav a[aria-current="page"]');
  await page.waitForFunction(() => location.pathname.endsWith('/admin.html') || location.pathname.endsWith('/admin'), { timeout: 10000 }).catch(async error => {
    const observed = await page.evaluate(() => ({
      href: location.href,
      pathname: location.pathname,
      nav: [...document.querySelectorAll('.calendar-product-nav a')].map(a => ({ text: a.textContent.trim(), href: a.href }))
    })).catch(() => ({ href: 'document unavailable during navigation' }));
    throw new Error('Admin link did not open the login page. target=' + adminHref + '; afterClick=' + JSON.stringify(observed) + '; cause=' + error.message);
  });
  await page.waitForSelector('#loginForm #adminEmail');
  const adminUi = await page.evaluate(() => ({
    nav: [...document.querySelectorAll('.admin-product-nav a')].map(x => x.textContent.trim()),
    title: document.querySelector('header h1')?.textContent || '',
    loginVisible: Boolean(document.querySelector('#loginForm #adminEmail')) && !document.querySelector('#loginForm').hidden
  }));
  assert.deepEqual(adminUi.nav, ['SMV ASTRO', 'SMV HOROSCOPE', 'Admin'], 'Admin page should retain the two product links and show Admin in the third position');
  assert.ok(adminUi.loginVisible, 'Admin page should display the Firebase login form');
  assert.ok(adminUi.title.includes('Admin'), 'Admin page header must identify the Admin screen');
  await page.waitForFunction(() => document.querySelector('#loginForm')?.dataset.adminModuleReady === 'true', { timeout: 10000 })
    .catch(async error => {
      const state = await page.evaluate(() => ({
        href: location.href,
        moduleScripts: [...document.scripts].map(script => script.src).filter(src => src.includes('calendar-admin.mjs'))
      })).catch(() => ({ href: 'document unavailable' }));
      throw new Error('Calendar Admin module did not initialize. state=' + JSON.stringify(state) +
        '; runtimeErrors=' + JSON.stringify(runtimeErrors) + '; cause=' + error.message);
    });

  // Never send Firebase auth requests from a temporary branch-preview origin.
  // Deliberately fake credentials prove the redirect happens before authentication.
  await page.$eval('#loginForm #adminEmail', el => { el.value = 'preview-probe@example.com'; });
  await page.$eval('#loginForm #adminPassword', el => { el.value = 'not-a-real-password'; });
  const formValidity = await page.$eval('#loginForm', form => form.checkValidity());
  assert.equal(formValidity, true, 'Preview redirect check must submit a validly shaped form without real credentials');
  await page.$eval('#loginForm', form => form.requestSubmit());
  try {
    await page.waitForFunction(() =>
      location.hostname === 'smvastroservices.pages.dev' &&
      (location.pathname.endsWith('/horoscope/calendar/admin.html') || location.pathname.endsWith('/horoscope/calendar/admin')),
    { timeout: 30000 });
  } catch (error) {
    const observed = await page.evaluate(() => ({
      href: location.href,
      hostname: location.hostname,
      formStatus: document.querySelector('#status')?.textContent || '',
      moduleScripts: [...document.scripts].map(script => script.src).filter(src => src.includes('calendar-admin.mjs'))
    })).catch(() => ({ href: 'document unavailable' }));
    throw new Error('Temporary Admin preview did not redirect to permanent Pages. state=' + JSON.stringify(observed) +
      '; runtimeErrors=' + JSON.stringify(runtimeErrors) + '; cause=' + error.message);
  }
  assert.equal(await page.$eval('#loginForm #adminEmail', el => el.value), '', 'Branch-preview credentials must not be carried to the stable Pages login');
  await page.waitForFunction(
    () => document.querySelector('#loginForm')?.dataset.adminModuleReady === 'true',
    { timeout: 15000 }
  );

  // Probe the LIVE permanent Pages Firebase Auth endpoint with fake credentials
  // only. This detects the exact API-key error after redirects without ever
  // using the owner's Admin credentials or creating an account.
  const authProbeStartErrors = runtimeErrors.length;
  await page.$eval('#loginForm #adminEmail', el => { el.value = 'calendar-auth-probe@example.invalid'; });
  await page.$eval('#loginForm #adminPassword', el => { el.value = 'not-a-real-password-991'; });
  await page.$eval('#loginForm', form => form.requestSubmit());
  await page.waitForFunction(() => {
    const button = document.querySelector('#loginButton');
    const message = document.querySelector('#status')?.textContent?.trim() || '';
    return button && !button.disabled && message.length > 0 &&
      !message.includes('Admin உரிமை சரிபார்க்கப்படுகிறது');
  }, { timeout: 30000 }).catch(async error => {
    const state = await page.evaluate(() => ({
      hostname: location.hostname,
      status: document.querySelector('#status')?.textContent || '',
      buttonDisabled: Boolean(document.querySelector('#loginButton')?.disabled)
    }));
    throw new Error('Live Pages Firebase Auth probe did not complete. state=' + JSON.stringify(state) + '; cause=' + error.message);
  });
  const authProbe = await page.evaluate(() => ({
    hostname: location.hostname,
    status: document.querySelector('#status')?.textContent || '',
    buttonDisabled: Boolean(document.querySelector('#loginButton')?.disabled)
  }));
  runtimeErrors.splice(authProbeStartErrors); // expected auth failure console output is diagnosed separately below
  assert.doesNotMatch(
    authProbe.status,
    /auth\/api-key-not-valid|auth\/invalid-api-key|Firebase Authentication இந்த API key-ஐ நிராகரித்தது|Firebase API key/,
    'Live smvastroservices.pages.dev still rejects the Firebase API key: ' + JSON.stringify(authProbe)
  );
  assert.match(
    authProbe.status,
    /invalid-credential|invalid-login-credentials|wrong-password|தவறாக|Firebase Authentication-ல் இல்லை|Admin அனுமதி இல்லை|unauthorized-domain|too-many-requests|network-request-failed/i,
    'The live probe should reach a post-API-key authentication result; actual status: ' + JSON.stringify(authProbe)
  );

  await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
  assert.equal(await page.$('#calRasiPalan #rpDate'), null, 'There must be no customer date picker');
  assert.equal(await page.$('#calRasiPalan #rpYear'), null, 'There must be no customer year control');
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
  assert.ok(/Day:|நாள்:/.test(dailyState.context), 'Daily reading should display its fixed weekday and date');
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
    const h = document.querySelector('#calRasiPalan .rp-results-title h3');
    const p = document.querySelector('#calRasiPalan .rp-results-title p');
    return h && /Monthly|மாத/.test(h.textContent) && p && /Month:|மாதம்:/.test(p.textContent);
  }, { timeout: 90000 });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-rasi-card').length), 1, 'Monthly output should keep the selected Rasi');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#calRasiPalan .rp-planet').length), 8, 'Monthly output should show eight planets for the selected Rasi');
  assert.equal(await page.$eval('#calRasiPalan .rp-moon-transit', el => el.dataset.transitPlanet), 'Moon', 'Monthly output should include a separate Moon transit prediction');

  // Validate the requested Tamil New Year label for the selected Rasi.
  await page.click('#calTamil');
  await page.waitForFunction(() => document.documentElement.lang === 'ta', { timeout: 15000 });
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
  }
  // Language selection changes the document lang first; the Calendar forecast
  // MutationObserver then replaces its controls. Wait for the rebuilt English
  // control itself, not only the earlier lang attribute, before clicking it.
  await page.waitForFunction(() => {
    const button = document.querySelector('#calRasiPalan [data-section="englishNewYear"]');
    return document.documentElement.lang === 'en' &&
      button && button.isConnected &&
      button.textContent.includes('English New Year Rasi Palan') &&
      button.getClientRects().length > 0;
  }, { timeout: 15000 });
  await page.$eval('#calRasiPalan [data-section="englishNewYear"]', el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.click('#calRasiPalan [data-section="englishNewYear"]');
  await page.click('#calRasiPalan #rpRun');
  await page.waitForFunction(() => {
    const h = document.querySelector('#calRasiPalan .rp-results-title h3');
    return h && (h.textContent.includes('ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்') || h.textContent.includes('English New Year Rasi Palan'));
  }, { timeout: 120000 });
  assert.equal(runtimeErrors.length, 0, 'Calendar browser runtime errors: ' + runtimeErrors.join(' | '));
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

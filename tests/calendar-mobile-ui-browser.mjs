// Browser smoke for the real public/horoscope/calendar source page.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const previewUrl = process.env.SMV_CALENDAR_PREVIEW_URL ||
  'http://127.0.0.1:4173/horoscope/calendar/';
const outputDir = new URL('../calendar-mobile-ui-smoke-output/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true
});
const pageErrors = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    const workerStub = {
      controller: null,
      addEventListener() {},
      register: () => Promise.reject(new Error('Service worker disabled in Calendar source smoke'))
    };
    try { Object.defineProperty(Navigator.prototype, 'serviceWorker', { configurable: true, get: () => workerStub }); } catch (_) {}
  });
  await page.setCacheEnabled(false);
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => pageErrors.push(error.message));

  const url = new URL(previewUrl);
  url.searchParams.set('source-ui-smoke', '1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.smv-calendar-hero', { timeout: 45000 });
  await page.waitForSelector('#smvCalendarMobileNav', { timeout: 45000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('.smv-calendar-hero-image');
    const rows = document.querySelectorAll('#calDaily .panchang-data-table tbody tr');
    const cards = document.querySelectorAll('#smvCalendarQuickSummary .smv-calendar-summary-card');
    return Boolean(image?.complete && image.naturalWidth > 0 && rows.length >= 10 && cards.length >= 5);
  }, { timeout: 90000 });

  const mobile = await page.evaluate(() => {
    const nav = document.getElementById('smvCalendarMobileNav');
    const summary = document.getElementById('smvCalendarQuickSummary');
    const hero = document.querySelector('.smv-calendar-hero');
    const image = document.querySelector('.smv-calendar-hero-image');
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      sourcePath: location.pathname,
      brand: document.querySelector('.smv-calendar-brand strong')?.textContent || '',
      heroHeight: Math.round(hero?.getBoundingClientRect().height || 0),
      heroImageWidth: image?.naturalWidth || 0,
      dateText: document.querySelector('.smv-calendar-date-value')?.textContent || '',
      summaryVisible: Boolean(summary && !summary.hidden),
      summaryCards: summary?.querySelectorAll('.smv-calendar-summary-card').length || 0,
      bottomNavPosition: nav ? getComputedStyle(nav).position : '',
      bottomNavDisplay: nav ? getComputedStyle(nav).display : '',
      panchangRows: document.querySelectorAll('#calDaily .panchang-data-table tbody tr').length,
      rasiPalanMounted: Boolean(document.querySelector('#calRasiPalan .rp-tabs'))
    };
  });
  assert.equal(mobile.brand, 'SMV CALENDAR');
  assert.ok(mobile.heroHeight >= 160, 'Devotional hero should be visible');
  assert.ok(mobile.heroImageWidth > 0, 'Existing Ganesha artwork should resolve from the true source path');
  assert.ok(mobile.dateText.length > 0, 'Selected date should be visible');
  assert.equal(mobile.summaryVisible, true);
  assert.ok(mobile.summaryCards >= 5, 'Existing Panchang output should populate summary cards');
  assert.equal(mobile.bottomNavPosition, 'fixed');
  assert.equal(mobile.bottomNavDisplay, 'grid');
  assert.ok(mobile.panchangRows >= 10, 'Existing daily Panchang table should remain rendered');
  assert.equal(mobile.rasiPalanMounted, true, 'Existing Rasi Palan should remain mounted');
  assert.ok(mobile.documentWidth <= mobile.viewport + 2,
    'Mobile horizontal overflow: ' + mobile.documentWidth + 'px for ' + mobile.viewport + 'px viewport');
  assert.equal(pageErrors.length, 0, 'Unexpected browser page errors: ' + pageErrors.join(' | '));
  await page.screenshot({ path: new URL('mobile-en.png', outputDir).pathname, fullPage: true });

  // The language control must switch the existing page without forcing recalculation.
  const beforeLanguageSwitch = await page.$eval('#calDate', input => input.value);
  await page.click('#calTamil');
  await page.waitForFunction(() => document.documentElement.lang.toLowerCase().startsWith('ta'), { timeout: 15000 });
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('#smvCalendarQuickSummary .smv-calendar-summary-card');
    return cards.length >= 5 && document.querySelector('.smv-calendar-brand-tagline')?.textContent.includes('பஞ்சாங்கம்');
  }, { timeout: 30000 });
  const afterLanguageSwitch = await page.$eval('#calDate', input => input.value);
  assert.equal(afterLanguageSwitch, beforeLanguageSwitch, 'Tamil/English switch must not change the selected date or trigger a new date selection');
  await page.screenshot({ path: new URL('mobile-ta.png', outputDir).pathname, fullPage: true });

  await page.setViewport({ width: 1280, height: 900 });
  await page.waitForTimeout(250);
  const desktop = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bottomNavDisplay: getComputedStyle(document.getElementById('smvCalendarMobileNav')).display,
    heroWidth: Math.round(document.querySelector('.smv-calendar-hero').getBoundingClientRect().width)
  }));
  assert.equal(desktop.bottomNavDisplay, 'none', 'Bottom navigation should hide on desktop');
  assert.ok(desktop.documentWidth <= desktop.viewport + 2,
    'Desktop horizontal overflow: ' + desktop.documentWidth + 'px for ' + desktop.viewport + 'px viewport');
  await page.screenshot({ path: new URL('desktop-ta.png', outputDir).pathname, fullPage: true });

  console.log(JSON.stringify({ mobile, desktop, pageErrors }, null, 2));
  console.log('Calendar source mobile/desktop UI smoke: PASS');
} finally {
  await browser.close();
}

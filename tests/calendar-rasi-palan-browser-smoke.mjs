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
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
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
  await page.waitForFunction(() => document.querySelector('#calChandrashtamaResult')?.dataset.resolved === 'true', { timeout: 180000 });
  const chandrashtamaSmoke = await page.$eval('#calChandrashtamaSection', section => {
    const root = section.querySelector('#calChandrashtamaPeriods');
    const status = section.querySelector('#calChandrashtamaResult');
    return ({
    statusText: status?.textContent?.trim() || '',
    result: status?.dataset.result || '',
    statusColor: status ? getComputedStyle(status).color : '',
    statusFillColor: status ? getComputedStyle(status).webkitTextFillColor : '',
    headingAlignment: getComputedStyle(section.querySelector(':scope > h3')).textAlign,
    headingDisplay: getComputedStyle(section.querySelector(':scope > h3')).display,
    headingAfterDisplay: getComputedStyle(section.querySelector(':scope > h3'), '::after').display,
    windows: [...(root?.querySelectorAll('.cal-chandra-window') || [])].map(window => ({
      rasi: window.querySelector('.cal-chandra-rasi-period strong')?.textContent || '',
      rasiPeriod: window.querySelector('.cal-chandra-rasi-period span')?.textContent || '',
      star: window.querySelector('.cal-chandra-star-period strong')?.textContent || '',
      starPeriod: window.querySelector('.cal-chandra-star-period span')?.textContent || '',
      active: window.classList.contains('is-active'),
      selectedDateMatch: window.classList.contains('is-selected-date'),
      startDate: window.dataset.startDate || '',
      endDate: window.dataset.endDate || '',
      padaRows: [...window.querySelectorAll('.cal-chandra-pada-row')].map(row => ({
        birthPada: Number(row.dataset.birthPada),
        targetStar: Number(row.dataset.targetStar),
        targetPada: Number(row.dataset.targetPada),
        text: row.textContent.trim()
      }))
    })),
    body: root?.textContent || ''
  })});
  assert.ok(/Chandrashtama: (Yes|No)|சந்திராஷ்டமம் : (- உண்டு|இல்லை)/.test(chandrashtamaSmoke.statusText),
    'The Chandrashtama subheading must directly show the Yes/No result.');
  assert.equal(chandrashtamaSmoke.headingAlignment, 'center',
    'The main Chandrashtama heading must be centered on desktop.');
  assert.equal(chandrashtamaSmoke.headingDisplay, 'block',
    'The main Chandrashtama heading must use a full-width block so the label itself is centered.');
  assert.equal(chandrashtamaSmoke.headingAfterDisplay, 'none',
    'The old trailing flex rule must not push the Chandrashtama heading back to the left.');
  assert.ok(chandrashtamaSmoke.windows.length <= 1,
    'Calendar must never list multiple past or upcoming Chandrashtama Rasi windows.');
  assert.ok(chandrashtamaSmoke.windows.every(window => window.active && !window.selectedDateMatch),
    'For today, only the Chandrashtama window active at the current local instant may be displayed.');
  if (chandrashtamaSmoke.windows.length === 0) {
    assert.equal(chandrashtamaSmoke.result, 'absent',
      'No matching window must produce the direct Chandrashtama: No result.');
    assert.equal(chandrashtamaSmoke.statusColor, 'rgb(17, 17, 17)',
      'Chandrashtama: No must remain normal black text.');
    assert.equal(chandrashtamaSmoke.statusFillColor, 'rgb(17, 17, 17)',
      'Chandrashtama: No must not inherit the old green WebKit text fill.');
    assert.equal(chandrashtamaSmoke.body, '',
      'When no Chandrashtama applies, show no additional notification or empty-period message.');
  } else {
    assert.equal(chandrashtamaSmoke.result, 'present',
      'A matching active window must produce the direct Chandrashtama: Yes result.');
    assert.equal(chandrashtamaSmoke.statusColor, 'rgb(192, 0, 0)',
      'Chandrashtama: Yes must be red.');
    assert.equal(chandrashtamaSmoke.statusFillColor, 'rgb(192, 0, 0)',
      'Chandrashtama: Yes must override the old green WebKit text fill.');
  }
  assert.ok(chandrashtamaSmoke.windows.every(window => window.rasi === 'Scorpio' && window.star === 'Ashwini'),
    'Only the selected Mesha Janma Rasi and its compatible Ashwini birth star should be displayed.');
  assert.ok(chandrashtamaSmoke.windows.every(window => window.padaRows.length === 4),
    'Only the selected birth Nakshatra’s four Pada projections should be shown, not all nine Rasi Padas.');
  assert.ok(chandrashtamaSmoke.windows.every(window =>
    window.rasiPeriod.includes(' – ') && window.starPeriod.includes(' – ') &&
    window.padaRows.every(row => row.text.includes(' – '))),
  'Rasi, full birth-star and selected birth-Pada intervals must each have start and end times.');

  const chandrashtamaOriginalDate = await page.$eval('#calDate', el => el.value);
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-10');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const root = document.querySelector('#calChandrashtamaPeriods');
    const windows = [...(root?.querySelectorAll('.cal-chandra-window') || [])];
    const result = document.querySelector('#calChandrashtamaResult');
    return status.includes('2026-11-10') && result?.dataset.resolved === 'true' &&
      result.dataset.result === 'present' && windows.length === 1 &&
      windows[0].classList.contains('is-selected-date') &&
      (windows[0].querySelector('.cal-chandra-rasi-period span')?.textContent || '').includes('10/11/2026');
  }, { timeout: 120000 });
  const pastDateStatus = await page.$eval('#calChandrashtamaResult', el => ({
    text: el.textContent.trim(), result: el.dataset.result,
    color: getComputedStyle(el).color,
    fillColor: getComputedStyle(el).webkitTextFillColor
  }));
  assert.equal(pastDateStatus.result, 'present', 'A selected historical Chandrashtama date must show Yes.');
  assert.equal(pastDateStatus.color, 'rgb(192, 0, 0)', 'Historical Chandrashtama Yes must be red.');
  assert.equal(pastDateStatus.fillColor, 'rgb(192, 0, 0)', 'Historical Chandrashtama Yes must also render red in WebKit.');
  const independentChandrashtamaCheck = await page.$eval('#calChandrashtamaPeriods', root => {
    const windows = [...root.querySelectorAll('.cal-chandra-window')];
    const item = windows.length === 1 && windows[0].classList.contains('is-selected-date') ? windows[0] : null;
    const heading = item?.querySelector('.cal-chandra-rasi-period span')?.textContent || '';
    const match = heading.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s*[–-]\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    const starPeriod = item?.querySelector('.cal-chandra-star-period span')?.textContent || '';
    return {
      heading,
      starPeriod,
      bounds: match ? match.slice(1) : null,
      padas: [...(item?.querySelectorAll('.cal-chandra-pada-row') || [])].map(row => ({
        birthPada: Number(row.dataset.birthPada),
        targetStar: Number(row.dataset.targetStar),
        targetPada: Number(row.dataset.targetPada)
      }))
    };
  });
  assert.ok(independentChandrashtamaCheck.bounds, 'The sole Chandrashtama period overlapping the selected past date must be rendered with second precision.');
  const oneLayer = await page.$eval('#calChandrashtamaSection', section => {
    const main = section.querySelector('.cal-chandrashtama');
    const interval = section.querySelector('.cal-chandra-window');
    return {
      mainBorder: getComputedStyle(main).borderTopWidth,
      intervalBorder: interval ? getComputedStyle(interval).borderTopWidth : 'missing',
      intervalBackground: interval ? getComputedStyle(interval).backgroundColor : 'missing',
      intervalPadding: interval ? getComputedStyle(interval).paddingTop : 'missing',
      detailLayers: [...section.querySelectorAll('.cal-chandra-rasi-period,.cal-chandra-star-period,.cal-chandra-pada-row')].map(node => ({
        border: getComputedStyle(node).borderTopWidth,
        background: getComputedStyle(node).backgroundColor,
        padding: getComputedStyle(node).paddingTop
      }))
    };
  });
  assert.notEqual(oneLayer.mainBorder, '0px', 'The outer Chandrashtama article must remain the single main box.');
  assert.equal(oneLayer.intervalBorder, '0px', 'The nested interval must not draw a second box border.');
  assert.equal(oneLayer.intervalBackground, 'rgba(0, 0, 0, 0)', 'The nested interval must be transparent inside the main box.');
  assert.equal(oneLayer.intervalPadding, '0px', 'The nested interval must not create a second padded layer.');
  assert.ok(oneLayer.detailLayers.length >= 3, 'Rasi, Nakshatra and Pada detail rows must remain inside the main layer.');
  assert.ok(oneLayer.detailLayers.every(layer => layer.border === '0px' && layer.background === 'rgba(0, 0, 0, 0)' && layer.padding === '0px'),
    'Rasi, Nakshatra and Pada details must not render additional nested box layers.');
  const [startDate, startHour, startMinute, startSecond, endDate, endHour, endMinute, endSecond] = independentChandrashtamaCheck.bounds;
  const localDateTimeMinutes = (date, hour, minute, second) => {
    const [day, month, year] = date.split('/').map(Number);
    return Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second)) / 60000;
  };
  const startDiff = Math.abs(localDateTimeMinutes(startDate, startHour, startMinute, startSecond) - Date.UTC(2026, 10, 10, 2, 48) / 60000);
  const endDiff = Math.abs(localDateTimeMinutes(endDate, endHour, endMinute, endSecond) - Date.UTC(2026, 10, 12, 14, 18) / 60000);
  assert.ok(startDiff <= 15, 'Nov 2026 Mesha-to-Vrichigam Chandrashtama entry must match the independent Lahiri reference within 15 minutes.');
  assert.ok(endDiff <= 15, 'Nov 2026 Vrichigam egress must match the independent Lahiri reference within 15 minutes.');
  assert.match(independentChandrashtamaCheck.starPeriod, /10\/11\/2026 02:48:28.*11\/11\/2026 05:/,
    'The complete Ashwini star projection must span the four corresponding transit Padas.');
  assert.deepEqual(independentChandrashtamaCheck.padas, [
    { birthPada: 1, targetStar: 15, targetPada: 4 },
    { birthPada: 2, targetStar: 16, targetPada: 1 },
    { birthPada: 3, targetStar: 16, targetPada: 2 },
    { birthPada: 4, targetStar: 16, targetPada: 3 }
  ], 'Mesha + Ashwini must show only Ashwini 1–4 and their Vishakha 4 / Anuradha 1–3 projected intervals.');

  // A future selected date must show only the transit overlapping that date.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-12-08');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const windows = [...document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window')];
    const result = document.querySelector('#calChandrashtamaResult');
    return status.includes('2026-12-08') && result?.dataset.resolved === 'true' &&
      result.dataset.result === 'present' && windows.length === 1 &&
      windows[0].classList.contains('is-selected-date') &&
      windows[0].dataset.startDate <= '2026-12-08' && windows[0].dataset.endDate >= '2026-12-08';
  }, { timeout: 120000 });
  const futureDateWindow = await page.$eval('#calChandrashtamaPeriods .cal-chandra-window', el => ({
    startDate: el.dataset.startDate, endDate: el.dataset.endDate,
    selectedDateMatch: el.classList.contains('is-selected-date')
  }));
  assert.ok(futureDateWindow.startDate <= '2026-12-08' && futureDateWindow.endDate >= '2026-12-08' && futureDateWindow.selectedDateMatch,
    'A future selected day must show the single Chandrashtama interval that overlaps that day.');
  const futureDateStatus = await page.$eval('#calChandrashtamaResult', el => ({
    result: el.dataset.result, color: getComputedStyle(el).color,
    fillColor: getComputedStyle(el).webkitTextFillColor
  }));
  assert.equal(futureDateStatus.result, 'present', 'A future date in Chandrashtama must show Yes.');
  assert.equal(futureDateStatus.color, 'rgb(192, 0, 0)', 'Future Chandrashtama Yes must be red.');
  assert.equal(futureDateStatus.fillColor, 'rgb(192, 0, 0)', 'Future Chandrashtama Yes must also render red in WebKit.');

  // A selected date outside a transit must not list a later upcoming transit from the 30-day scan.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-19');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const root = document.querySelector('#calChandrashtamaPeriods');
    const result = document.querySelector('#calChandrashtamaResult');
    return status.includes('2026-11-19') && result?.dataset.resolved === 'true' &&
      result.dataset.result === 'absent' && root &&
      !root.querySelector('.cal-chandra-window') && (root.textContent || '') === '';
  }, { timeout: 120000 });

  // Return to the historical transit date for the exact Pada projection checks.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-10');
  await page.waitForFunction(() => document.querySelector('#calChandrashtamaPeriods .cal-chandra-window.is-selected-date'), { timeout: 120000 });
  assert.equal(chandrashtamaSmoke.windows.length <= 1, true);
  assert.equal(independentChandrashtamaCheck.padas.length, 4);
  await page.select('#calStarPada', '1');
  try {
    await page.waitForFunction(() => document.querySelector('#calStarPada')?.value === '1' &&
      document.querySelector('#calChandrashtamaPeriods .cal-chandra-window:first-child')?.querySelectorAll('.cal-chandra-pada-row').length === 1,
      { timeout: 20000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      rasi: document.querySelector('#calRasi')?.value,
      star: document.querySelector('#calStar')?.value,
      pada: document.querySelector('#calStarPada')?.value,
      padaOptions: [...(document.querySelectorAll('#calStarPada option'))].map(option => option.value),
      rows: [...(document.querySelector('#calChandrashtamaPeriods .cal-chandra-window:first-child')?.querySelectorAll('.cal-chandra-pada-row') || [])].map(row => ({
        birthPada: row.dataset.birthPada, targetStar: row.dataset.targetStar, targetPada: row.dataset.targetPada
      })),
      cardText: document.querySelector('#calChandrashtamaPeriods')?.textContent || '',
      savedSettings: localStorage.getItem('smv-calendar-settings')
    }));
    throw new Error('Selected Ashwini Pada 1 did not filter to one row: '+JSON.stringify(diagnostic)+'; '+error.message);
  }
  const ashwiniPada1 = await page.$eval('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row', row => ({
    birthPada: Number(row.dataset.birthPada),
    targetStar: Number(row.dataset.targetStar),
    targetPada: Number(row.dataset.targetPada),
    time: row.querySelector('span')?.textContent || ''
  }));
  assert.deepEqual([ashwiniPada1.birthPada, ashwiniPada1.targetStar, ashwiniPada1.targetPada], [1,15,4]);
  assert.match(ashwiniPada1.time, /10\/11\/2026 02:48:28 – 10\/11\/2026 09:19:30/);

  // Bharani: full 13°20' period and its four separate Pada intervals.
  await page.select('#calStar', '1');
  await page.waitForFunction(() => document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row').length === 4);
  const bharaniRows = await page.$$eval('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row', rows =>
    rows.map(row => [Number(row.dataset.birthPada),Number(row.dataset.targetStar),Number(row.dataset.targetPada)]));
  assert.deepEqual(bharaniRows, [[1,16,4],[2,17,1],[3,17,2],[4,17,3]]);

  // Krittika in Mesha has only Pada 1 in that Rasi; its Pada selector must not offer 2–4.
  await page.select('#calStar','2');
  const krittikaOptions = await page.$$eval('#calStarPada option', options => options.map(option => option.value));
  assert.deepEqual(krittikaOptions,['0','1']);

  // Simha star options must be only Magha, Pooram and Uttara Phalguni.
  await page.select('#calRasi','4');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-20');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const window = document.querySelector('#calChandrashtamaPeriods .cal-chandra-window.is-selected-date');
    return status.includes('2026-11-20') &&
      window?.querySelector('.cal-chandra-rasi-period strong')?.textContent === 'Pisces';
  }, { timeout: 120000 });
  const simhaStarOptions = await page.$$eval('#calStar option', options => options.map(option => option.value));
  assert.deepEqual(simhaStarOptions,['9','10','11']);
  await page.select('#calStar','10');
  // Star selection starts an asynchronous Swiss Ephemeris-backed render. Wait
  // for Pooram's actual mapped Pada rows instead of reading the previous card.
  await page.waitForFunction(() => {
    if (document.querySelector('#calStar')?.value !== '10') return false;
    const rows = [...document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row')];
    return rows.length === 4 && rows.every((row, index) =>
      Number(row.dataset.birthPada) === index + 1 &&
      Number(row.dataset.targetStar) === (index === 0 ? 25 : 26) &&
      Number(row.dataset.targetPada) === (index === 0 ? 4 : index)
    );
  }, { timeout: 120000 });
  const pooramRows = await page.evaluate(() =>
    [...document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row')].map(row =>
      [Number(row.dataset.birthPada),Number(row.dataset.targetStar),Number(row.dataset.targetPada)]));
  assert.deepEqual(pooramRows, [[1,25,4],[2,26,1],[3,26,2],[4,26,3]]);
  await page.select('#calStarPada','3');
  await page.waitForFunction(() => {
    const row = document.querySelector('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row');
    return document.querySelector('#calStarPada')?.value === '3' &&
      document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row').length === 1 &&
      Number(row?.dataset.birthPada) === 3 &&
      Number(row?.dataset.targetStar) === 26 &&
      Number(row?.dataset.targetPada) === 2;
  }, { timeout: 30000 });
  const pooram3 = await page.$eval('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row', row => ({
    birthPada:Number(row.dataset.birthPada),
    targetStar:Number(row.dataset.targetStar),
    targetPada:Number(row.dataset.targetPada),
    text:row.textContent.trim()
  }));
  assert.deepEqual([pooram3.birthPada,pooram3.targetStar,pooram3.targetPada],[3,26,2]);
  assert.match(pooram3.text,/Purva Phalguni.*Revati.*Pada 2/);

  // Return to the Mesha transit date before restoring the requested Ashwini 1 preview.
  await page.select('#calRasi','0');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-10');
  await page.waitForFunction(() => document.querySelector('#calChandrashtamaPeriods .cal-chandra-window.is-selected-date'), { timeout: 120000 });
  await page.select('#calStar','0');
  await page.select('#calStarPada','1');
  await page.waitForFunction(() => {
    const row = document.querySelector('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row');
    return document.querySelector('#calStar')?.value === '0' &&
      document.querySelector('#calStarPada')?.value === '1' &&
      document.querySelectorAll('#calChandrashtamaPeriods .cal-chandra-window:first-child .cal-chandra-pada-row').length === 1 &&
      Number(row?.dataset.birthPada) === 1 &&
      Number(row?.dataset.targetStar) === 15 &&
      Number(row?.dataset.targetPada) === 4;
  }, { timeout: 30000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('#calChandrashtamaResult');
    return status?.dataset.resolved === 'true' && status.dataset.result === 'present' &&
      getComputedStyle(status).color === 'rgb(192, 0, 0)' &&
      getComputedStyle(status).webkitTextFillColor === 'rgb(192, 0, 0)';
  }, { timeout: 120000 });
  const chandrashtamaCard = await page.$('#calChandrashtamaSection');
  assert.ok(chandrashtamaCard, 'The Chandrashtama Rasi card must be rendered for the preview.');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const desktopHeadingAlignment = await page.$eval('#calChandrashtamaSection > h3', el => ({
    textAlign: getComputedStyle(el).textAlign,
    display: getComputedStyle(el).display,
    afterDisplay: getComputedStyle(el, '::after').display
  }));
  assert.deepEqual(desktopHeadingAlignment, { textAlign:'center', display:'block', afterDisplay:'none' },
    'The main Chandrashtama heading must be visibly centered on desktop.');
  await chandrashtamaCard.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await chandrashtamaCard.screenshot({
    path: new URL('calendar-chandrashtama-exact-padas-desktop.png', outputDir).pathname
  });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const mobileHeadingAlignment = await page.$eval('#calChandrashtamaSection > h3', el => ({
    textAlign: getComputedStyle(el).textAlign,
    display: getComputedStyle(el).display,
    afterDisplay: getComputedStyle(el, '::after').display
  }));
  assert.deepEqual(mobileHeadingAlignment, { textAlign:'center', display:'block', afterDisplay:'none' },
    'The main Chandrashtama heading must be visibly centered on mobile.');
  await chandrashtamaCard.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await chandrashtamaCard.screenshot({
    path: new URL('calendar-chandrashtama-exact-padas-mobile.png', outputDir).pathname
  });
  console.log('EXACT_CHANDRASHTAMA_SELECTED_STAR_CHECK ' + JSON.stringify({
    fullRasi: independentChandrashtamaCheck,
    ashwiniPada1,
    bharaniRows,
    krittikaOptions,
    simhaStarOptions,
    pooramRows,
    pooram3
  }));
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, chandrashtamaOriginalDate);
  await page.waitForFunction(date => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const root = document.querySelector('#calChandrashtamaPeriods');
    const body = root?.textContent || '';
    return status.includes(date) && root &&
      document.querySelector('#calChandrashtamaResult')?.dataset.resolved === 'true';
  }, { timeout: 120000 }, chandrashtamaOriginalDate);

  const resultPlacement = await page.$eval('#calMuhurtaLagna', el => {
    const dateDetails = document.querySelector('#calDateDetails');
    const summary = document.querySelector('#calDateDetailsExtra');
    const flagsCard = summary?.querySelector('.cal-day-flags-card');
    const flags = flagsCard?.querySelectorAll('.cal-day-flag') || [];
    const shoolam = summary?.querySelector('.cal-shoolam-card');
    return {
      insideDateDetails: Boolean(dateDetails && el.parentElement === dateDetails),
      dayFlagsSeparated: Boolean(flagsCard && flags.length === 2),
      shoolamSeparate: Boolean(shoolam && !shoolam.querySelector('.cal-day-flag')),
      immediatelyBeforePanchang: document.querySelector('#calChandrashtamaSection')?.nextElementSibling?.id === 'calDaily',
      lagnaBeforeChandrashtama: el.nextElementSibling?.id === 'calChandrashtamaSection',
      chandrashtamaSectionInsideDateDetails: Boolean(document.querySelector('#calChandrashtamaSection')?.parentElement === dateDetails)
    };
  });
  assert.equal(resultPlacement.insideDateDetails, true, 'The three result sections must remain inside Date Details.');
  assert.equal(resultPlacement.dayFlagsSeparated, true, 'Kari/Thaniya flags must use their own card.');
  assert.equal(resultPlacement.shoolamSeparate, true, 'Travel Shoolam must be separate from the day flags.');
  assert.equal(resultPlacement.lagnaBeforeChandrashtama, true, 'Chandrashtama must appear immediately below the Rasi-Mana Lagna balance section.');
  assert.equal(resultPlacement.chandrashtamaSectionInsideDateDetails, true, 'Chandrashtama must remain inside Date Details.');
  assert.equal(resultPlacement.immediatelyBeforePanchang, true, 'Chandrashtama must appear immediately above the daily Panchang.');

  // Verify the requested Date Details layout and the month-number alignment at
  // a narrow phone viewport matching the submitted mobile screenshot.
  const detailsOriginalDate = await page.$eval('#calDate', el => el.value);
  const detailsOriginalLanguage = await page.evaluate(() => document.documentElement.lang || 'en');
  const detailsOriginalViewport = page.viewport();
  if (detailsOriginalLanguage !== 'ta') {
    await page.click('#calTamil');
    await page.waitForFunction(() => document.documentElement.lang === 'ta', { timeout: 15000 });
  }
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-17');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const cards = document.querySelectorAll('#calDateDetailsExtra .cal-details-summary > article');
    return status.includes('2026-11-17') && cards.length >= 2;
  }, { timeout: 90000 });
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 1 });

  const requestedLayout = await page.evaluate(() => {
    const grid = document.querySelector('#calDateDetailsExtra .cal-details-summary');
    const flags = grid?.querySelector('.cal-day-flags-card');
    const abhijit = [...(grid?.querySelectorAll('.cal-muhurta-card') || [])]
      .find(card => /Abhijit Muhurtham|அபிஜித் முகூர்த்தம்/.test(card.textContent || ''));
    const shoolam = grid?.querySelector('.cal-shoolam-card');
    const shoolamMain = shoolam?.querySelector('.cal-shoolam-main');
    const thyajyam = grid?.querySelector('.cal-day-yoga-card.is-inauspicious');
    const thyajyamSegment = thyajyam?.querySelector('.cal-yoga-segment.is-inauspicious');
    const thyajyamTime = thyajyamSegment?.querySelector('.cal-yoga-segment-time');
    if (!grid || !flags || !abhijit || !shoolam || !shoolamMain || !thyajyam || !thyajyamSegment || !thyajyamTime) return { available: false };
    const flagsRect = flags.getBoundingClientRect();
    const abhijitRect = abhijit.getBoundingClientRect();
    const shoolamRect = shoolam.getBoundingClientRect();
    const mainRect = shoolamMain.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const thyajyamSegmentRect = thyajyamSegment.getBoundingClientRect();
    const thyajyamTimeRect = thyajyamTime.getBoundingClientRect();
    return {
      available: true,
      width: window.innerWidth,
      flagsLeftOfAbhijit: flagsRect.left < abhijitRect.left,
      flagsAndAbhijitShareRow: Math.abs(flagsRect.top - abhijitRect.top) < 1,
      shoolamFullWidth: Math.abs(shoolamRect.width - gridRect.width) < 1,
      shoolamContentCentered: Math.abs((mainRect.left + mainRect.width / 2) - (shoolamRect.left + shoolamRect.width / 2)) < 1,
      thyajyamBorderLeftWidth: getComputedStyle(thyajyam).borderLeftWidth,
      thyajyamSegmentBorderLeftWidth: getComputedStyle(thyajyamSegment).borderLeftWidth,
      thyajyamTimeAlignSelf: getComputedStyle(thyajyamTime).alignSelf,
      thyajyamTimeCentered: Math.abs((thyajyamTimeRect.left + thyajyamTimeRect.width / 2) - (thyajyamSegmentRect.left + thyajyamSegmentRect.width / 2)) < 1,
      cardJustifyContent: getComputedStyle(grid.querySelector('article')).justifyContent
    };
  });
  assert.equal(requestedLayout.available, true, 'Requested Date Details cards must render.');
  assert.equal(requestedLayout.flagsLeftOfAbhijit, true, 'Kari/Thaniya must be on the left of Abhijit Muhurtham.');
  assert.equal(requestedLayout.flagsAndAbhijitShareRow, true, 'Kari/Thaniya and Abhijit must share one row.');
  assert.equal(requestedLayout.shoolamFullWidth, true, 'Travel Shoolam must occupy its own full-width row.');
  assert.equal(requestedLayout.shoolamContentCentered, true, 'Travel Shoolam content must be centered.');
  assert.equal(requestedLayout.thyajyamBorderLeftWidth, '0px', 'The long red left line on the Nakshatra Thyajyam card must be removed.');
  assert.equal(requestedLayout.thyajyamSegmentBorderLeftWidth, '0px', 'The inner red Thyajyam interval stripe must also be removed.');
  assert.equal(requestedLayout.thyajyamTimeAlignSelf, 'center', 'The Nakshatra Thyajyam time must be centered on narrow mobile screens.');
  assert.equal(requestedLayout.thyajyamTimeCentered, true, 'The Nakshatra Thyajyam time result must be geometrically centered within its interval row.');
  assert.equal(requestedLayout.cardJustifyContent, 'center', 'PR #524 vertical card alignment must be reverted.');

  const monthNumberAlignment = await page.evaluate(() => {
    const grid = document.querySelector('#calMonth .cal-month-grid');
    const special = grid?.querySelector('button.cal-special');
    const ordinary = grid?.querySelector('button[data-date]:not(.cal-special)');
    if (!grid || !special || !ordinary) return { available: false };
    const specialCell = special.getBoundingClientRect();
    const ordinaryCell = ordinary.getBoundingClientRect();
    const specialNumber = special.querySelector('strong')?.getBoundingClientRect();
    const ordinaryNumber = ordinary.querySelector('strong')?.getBoundingClientRect();
    return {
      available: Boolean(specialNumber && ordinaryNumber),
      specialDate: special.dataset.date,
      ordinaryDate: ordinary.dataset.date,
      numberOffsetDifference: Math.abs((specialNumber.top - specialCell.top) - (ordinaryNumber.top - ordinaryCell.top)),
      justifyContent: getComputedStyle(special).justifyContent
    };
  });
  assert.equal(monthNumberAlignment.available, true, 'The selected month must contain both festival and regular date boxes.');
  assert.ok(monthNumberAlignment.numberOffsetDifference < 1,
    'English date numbers must begin at the same vertical offset in festival and regular boxes: ' + JSON.stringify(monthNumberAlignment));
  assert.equal(monthNumberAlignment.justifyContent, 'flex-start', 'Calendar day-cell contents must be top-aligned consistently.');

  await page.$eval('#calMonth', el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: new URL('calendar-month-holiday-date-alignment-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  await page.$eval('#calDateDetails', el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: new URL('calendar-date-details-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  await page.$eval('.cal-day-flags-card', el => el.scrollIntoView({ block: 'center' }));
  await page.screenshot({
    path: new URL('calendar-date-details-flags-shoolam-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  // Verify PR #529 daily Panchang/Hora/transit typography on the real mobile DOM.
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#calDaily .panchang-data-table tbody tr');
    const hora = document.querySelectorAll('#calDaily .hora-time.smv-calendar-neutral-time');
    return rows.length >= 8 && hora.length >= 20 &&
      document.querySelector('#calDaily .cal-name-yoga-label') &&
      document.querySelector('#calDaily .panchang-time-result.smv-calendar-bright-red-time') &&
      document.querySelector('#calDaily .transit-position-table .transit-table-degree.smv-calendar-degree-normal');
  }, { timeout: 90000 });
  const tamilYogaLabel = await page.$eval('#calDaily .cal-name-yoga-label', el => el.textContent.trim());
  assert.equal(tamilYogaLabel, 'நாம யோகம்', 'Tamil Calendar must display the complete localized label “நாம யோகம்”.');
  await page.click('#calEnglish');
  await page.waitForFunction(() => document.documentElement.lang === 'en' &&
    document.querySelector('#calDaily .cal-name-yoga-label')?.textContent.trim() === 'Namah Yoga', { timeout: 15000 });
  await page.click('#calTamil');
  await page.waitForFunction(() => document.documentElement.lang === 'ta' &&
    document.querySelector('#calDaily .cal-name-yoga-label')?.textContent.trim() === 'நாம யோகம்', { timeout: 15000 });
  const dailyTypography = await page.evaluate(() => {
    const table = document.querySelector('#calDaily .panchang-data-table');
    const rows = [...(table?.tBodies?.[0]?.rows || [])];
    const yoga = table?.querySelector('.cal-name-yoga-label');
    const eventDate = table?.querySelector('.event-date.smv-calendar-neutral-date-time');
    const eventTime = table?.querySelector('.event-time.smv-calendar-neutral-date-time');
    const connector = table?.querySelector('.event-to.smv-calendar-normal-connector');
    const redTimes = [...(table?.querySelectorAll('.panchang-time-result.smv-calendar-bright-red-time') || [])];
    const normalHora = [...document.querySelectorAll('#calDaily .hora-time.smv-calendar-neutral-time:not(.smv-hora-current-green):not(.smv-hora-bright-green):not(.smv-hora-current-red):not(.smv-hora-bright-red)')];
    const degree = document.querySelector('#calDaily .transit-position-table .transit-table-degree.smv-calendar-degree-normal');
    const style = element => element ? getComputedStyle(element) : null;
    return {
      primaryResultWeights: rows.slice(0, 8).map(row => style(row.cells[1])?.fontWeight || ''),
      yogaLabel: yoga?.textContent?.trim() || '',
      yogaLabelColor: style(yoga)?.color || '',
      yogaLabelWeight: style(yoga)?.fontWeight || '',
      yogaLabelFontSize: style(yoga)?.fontSize || '',
      varaLabelFontSize: style(rows[3]?.cells?.[0])?.fontSize || '',
      tithiLabelFontSize: style(rows[4]?.cells?.[0])?.fontSize || '',
      eventDateColor: style(eventDate)?.color || '',
      eventTimeColor: style(eventTime)?.color || '',
      connectorColor: style(connector)?.color || '',
      connectorWeight: style(connector)?.fontWeight || '',
      redTimeColors: redTimes.map(element => style(element)?.color || ''),
      normalHoraCount: normalHora.length,
      normalHoraColor: style(normalHora[0])?.color || '',
      normalHoraWeight: style(normalHora[0])?.fontWeight || '',
      degreeColor: style(degree)?.color || '',
      degreeWeight: style(degree)?.fontWeight || ''
    };
  });
  assert.equal(dailyTypography.primaryResultWeights.length, 8, 'Date through Karana must all be present in the Panchang results.');
  assert.ok(dailyTypography.primaryResultWeights.every(weight => weight === '700'), 'Date through Karana results must be bold.');
  assert.equal(dailyTypography.yogaLabel, 'நாம யோகம்', 'The Tamil Calendar yoga row must display the complete label நாம யோகம்.');
  assert.equal(dailyTypography.yogaLabelColor, 'rgb(0, 0, 0)', 'Namah Yoga must be black.');
  assert.equal(dailyTypography.yogaLabelWeight, '700', 'Namah Yoga must be bold.');
  assert.equal(dailyTypography.yogaLabelFontSize, dailyTypography.varaLabelFontSize, 'Namah Yoga must use the same font size as the Vara label.');
  assert.equal(dailyTypography.yogaLabelFontSize, dailyTypography.tithiLabelFontSize, 'Namah Yoga must use the same font size as the Tithi label.');
  assert.equal(dailyTypography.eventDateColor, 'rgb(0, 0, 0)', 'Panchang event dates must be black.');
  assert.equal(dailyTypography.eventTimeColor, 'rgb(0, 0, 0)', 'Panchang event times must be black.');
  assert.equal(dailyTypography.connectorColor, 'rgb(0, 0, 0)', 'The “முதல்” connector must be black.');
  assert.equal(dailyTypography.connectorWeight, '400', 'The “முதல்” connector must use normal weight.');
  assert.equal(dailyTypography.redTimeColors.length, 2, 'Rahu Kalam and Yamagandam must both be present.');
  assert.ok(dailyTypography.redTimeColors.every(color => color === 'rgb(255, 0, 0)'), 'Rahu Kalam and Yamagandam must be bright red.');
  assert.equal(await page.$$eval('#calDaily .hora-time.smv-calendar-neutral-time', nodes => nodes.length), 24, 'All 24 day/night Hora time cells must carry the Calendar typography marker.');
  assert.ok(dailyTypography.normalHoraCount >= 12, 'At least twelve ordinary Hora cells must remain in the normal black presentation while preserving weekday/current special colors.')
  assert.equal(dailyTypography.normalHoraColor, 'rgb(0, 0, 0)', 'Normal Hora time values must be black.');
  assert.equal(dailyTypography.normalHoraWeight, '400', 'Normal Hora time values must not be bold.');
  assert.equal(dailyTypography.degreeColor, 'rgb(0, 0, 0)', 'Transit Degree values must be black.');
  assert.equal(dailyTypography.degreeWeight, '400', 'Transit Degree values must use normal weight.');
  process.stdout.write('SMV_CALENDAR_DAILY_TYPOGRAPHY ' + JSON.stringify(dailyTypography) + '\\n');

  await page.$eval('#calDaily .panchang-data-table', el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: new URL('calendar-daily-panchang-typography-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  await page.$eval('#calDaily .hora-vertical-block', el => el.scrollIntoView({ block: 'center' }));
  await page.screenshot({
    path: new URL('calendar-daily-hora-typography-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  await page.$eval('#calDaily .transit-position-table', el => el.scrollIntoView({ block: 'center' }));
  await page.screenshot({
    path: new URL('calendar-transit-degree-typography-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });

  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, detailsOriginalDate);
  await page.waitForFunction(date => (document.querySelector('#calStatus')?.textContent || '').includes(date),
    { timeout: 90000 }, detailsOriginalDate);
  if (detailsOriginalLanguage !== 'ta') {
    await page.click('#calEnglish');
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 15000 });
  }
  if (detailsOriginalViewport) {
    await page.setViewport({
      width: detailsOriginalViewport.width,
      height: detailsOriginalViewport.height,
      deviceScaleFactor: detailsOriginalViewport.deviceScaleFactor || 1
    });
  }
  const muhurtaLagnaUi = await page.$eval('#calMuhurtaLagna', el => ({
    labels: [...el.querySelectorAll('.cal-muhurta-lagna-item > small')].map(node => node.textContent.trim()),
    verdict: el.querySelector('.cal-subha-verdict')?.textContent.trim() || '',
    balanceLine: el.querySelector('.cal-rasi-balance-line')?.textContent.trim() || '',
    phaseLabel: el.querySelector('.cal-subha-verdict')?.nextElementSibling?.textContent.trim() || ''
  }));
  assert.equal(muhurtaLagnaUi.labels.length, 3, 'Date Details must show Subha Muhurtham, current Lagna, and Rasi Mana Lagna balance separately.');
  assert.ok(/Subha Muhurtham|சுபமுகூர்த்தம்/.test(muhurtaLagnaUi.labels[0]), 'Left item must identify the Subha Muhurtham day.');
  assert.ok(/Lagna|லக்னம்/.test(muhurtaLagnaUi.labels[1]), 'Middle item must identify the current or selected-time Lagna.');
  assert.ok(/Rasi Mana|ராசி மான/.test(muhurtaLagnaUi.labels[2]), 'Third item must identify the solar-sign Rasi Mana balance.');
  assert.ok(muhurtaLagnaUi.verdict.length > 0, 'The Panchanga day assessment must render a result.');
  assert.ok(muhurtaLagnaUi.balanceLine.length > 0, 'The solar-ingress Lagna-balance line must render a status.');

  await page.waitForFunction(() => {
    const line = document.querySelector('#calMuhurtaLagna .cal-rasi-balance-line')?.textContent || '';
    return line && !/being calculated|கணக்கிடப்படுகிறது/i.test(line);
  }, { timeout: 90000 });
  const completedLagnaBalance = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-line', el => el.textContent.trim());
  assert.ok(!/unavailable|கணக்கிட முடியவில்லை/i.test(completedLagnaBalance), 'Solar-ingress Lagna balance must calculate successfully: ' + completedLagnaBalance);
  assert.ok(/Lagna balance|லக்ன இருப்பு/.test(completedLagnaBalance), 'The completed result must contain the Lagna balance value.');
  const currentBalanceMeta = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-meta', el => el.textContent.trim());
  assert.match(currentBalanceMeta, /Sun at sunrise|உதயத்தில் சூரியன்/,
    'The current date must show the Sun longitude used at local sunrise.');
  assert.match(currentBalanceMeta, /Fixed until next sunrise|அடுத்த சூ\.உதயம் வரை மாறாது/,
    'The selected sunrise remainder must remain constant until the following sunrise.');
  assert.match(currentBalanceMeta, /Full 30° Rasi Mana|முழு 30° ராசி மானம்/,
    'The full month-start value must be shown separately from the remaining balance.');

  // Every selected date is a sunrise snapshot; wall-clock minutes do not decrement it.
  const originalCalendarDate = await page.$eval('#calDate', el => el.value);
  const originalBalanceText = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-line', el => el.textContent.trim());
  const selectedTestDate = '2027-02-10';
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selectedTestDate);
  await page.waitForFunction(({date,oldBalance}) => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const line = document.querySelector('#calMuhurtaLagna .cal-rasi-balance-line')?.textContent || '';
    return status.includes(date) && line && line !== oldBalance &&
      !/being calculated|கணக்கிடப்படுகிறது/i.test(line);
  }, { timeout: 90000 }, {date:selectedTestDate,oldBalance:originalBalanceText});
  const selectedDateBalance = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-line', el => el.textContent.trim());
  const selectedDateBalanceMeta = await page.$eval('#calMuhurtaLagna .cal-rasi-balance-meta', el => el.textContent.trim());
  const selectedDateSunriseMatch = selectedDateBalanceMeta.match(/(?:Sunrise|சூ\.உதயம்):\s*(\d{2}):(\d{2})/);
  assert.ok(selectedDateSunriseMatch, 'The selected-date balance must disclose that date\'s local sunrise: ' + selectedDateBalanceMeta);
  assert.match(selectedDateBalanceMeta, /Sun at sunrise|உதயத்தில் சூரியன்/,
    'The selected date must calculate its Sun longitude at the local sunrise.');
  assert.match(selectedDateBalanceMeta, /Remaining sign arc|மீத ராசிப் பாகை/,
    'The selected date must calculate only the untraversed portion of the sign.');
  assert.match(selectedDateBalanceMeta, /Full 30° Rasi Mana|முழு 30° ராசி மானம்/,
    'The full solar-month value must be kept separate from the remaining sunrise balance.');
  const selectedDateLagnaTime = await page.$eval('#calMuhurtaLagna .cal-muhurta-lagna-item:nth-child(2) span', el => el.textContent.trim());
  assert.match(selectedDateLagnaTime, /12:00/,
    'The separate selected-time Lagna must remain at the unchanged noon Panchang time.');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, originalCalendarDate);
  await page.waitForFunction(({date,oldBalance}) => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const line = document.querySelector('#calMuhurtaLagna .cal-rasi-balance-line')?.textContent || '';
    return status.includes(date) && line && line !== oldBalance &&
      !/being calculated|கணக்கிடப்படுகிறது/i.test(line);
  }, { timeout: 90000 }, {date:originalCalendarDate,oldBalance:selectedDateBalance});


  // Numerical regression: the ingress Sun sign, not the actual local Ascendant,
  // selects the complete place-based OA Rasi Mana for each sunrise interval.
  const solarSignRasiManaCheck = await page.evaluate(async fixtures => {
    const worker = new Worker('/horoscope/calendar-worker.mjs', { type: 'module' });
    try {
      const request = (id, input) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Solar-sign Rasi Mana worker timed out.')), 120000);
        const handler = event => {
          if (event.data?.id !== id) return;
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.result);
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ id, kind: 'solar-sign-rasi-mana', input });
      });
      const results = [];
      for (let index = 0; index < fixtures.length; index++) {
        const result = await request('calendar-solar-sign-rasi-mana-' + index, fixtures[index]);
        if (!result) throw new Error('Solar-sign Rasi Mana worker returned no result for ' + fixtures[index].date);
        results.push(result);
      }
      // Reuse the ingress cache while requesting sunrise, midday and evening
      // times on one date. The solar sign and full OA duration stay fixed, but
      // the remaining balance must subtract elapsed time since local sunrise.
      const reference = results[2];
      const atSunrise = await request('calendar-rasi-mana-at-sunrise', {
        ...fixtures[2], time: reference.sunrise
      });
      const atMidday = await request('calendar-rasi-mana-at-midday', {
        ...fixtures[2], time: '12:00'
      });
      const atEvening = await request('calendar-rasi-mana-at-evening', {
        ...fixtures[2], time: '21:10'
      });
      return { results, sunriseRemainders: { atSunrise, atMidday, atEvening } };
    } finally {
      worker.terminate();
    }
  }, [
    { date:'2026-11-15', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2026-11-16', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2026-11-17', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2026-12-15', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2026-12-16', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2027-01-14', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2027-01-15', time:'12:00', lat:11.23, lon:78.88, utcOffsetMinutes:330 },
    { date:'2026-11-25', time:'12:00', lat:11.2342, lon:78.8808, utcOffsetMinutes:330 }
  ]);
  const solarSignRasiManaFixtures = solarSignRasiManaCheck.results;
  const { atSunrise, atMidday, atEvening } = solarSignRasiManaCheck.sunriseRemainders;
  const [
    libraOn15, libraAt16Sunrise, scorpioAt17Sunrise,
    scorpioAtKarthigaiEnd, sagittariusAtMargazhiStart,
    sagittariusAtMargazhiEnd, capricornAtThaiStart, scorpioAt25November
  ] = solarSignRasiManaFixtures;
  console.log('CALENDAR_SOLAR_SIGN_RASI_MANA_BOUNDARY_FIXTURE ' + JSON.stringify(
    solarSignRasiManaFixtures.map(result => ({
      date:result.sunrise,
      sunSignIndex:result.sunSignIndex,
      rasiManaSignIndex:result.rasiManaSignIndex,
      ingressDate:result.ingressDate,
      ingressTime:result.ingressTime
    }))
  ));
  assert.equal(libraOn15.sunSignIndex, 6, '15 Nov sunrise interval must use the Sun in Libra.');
  assert.equal(libraOn15.rasiManaSignIndex, 6, 'Libra must select Libra Rasi Mana.');
  assert.equal(libraAt16Sunrise.sunSignIndex, 6, '16 Nov sunrise still has the Sun in Libra because Scorpio ingress is after local sunset.');
  assert.equal(libraAt16Sunrise.rasiManaSignIndex, 6, 'The 16 Nov sunrise interval must retain Libra Rasi Mana.');
  assert.notEqual(libraAt16Sunrise.ingressDate, '2026-11-16', 'The after-sunset 16 Nov ingress must not be assigned to the 16 Nov sunrise interval.');
  assert.equal(scorpioAt17Sunrise.sunSignIndex, 7, '17 Nov sunrise interval must use the Sun in Scorpio after its 16 Nov local-evening ingress.');
  assert.equal(scorpioAt17Sunrise.rasiManaSignIndex, 7, 'Scorpio must select Scorpio Rasi Mana from the next sunrise.');
  assert.equal(scorpioAt17Sunrise.ingressDate, '2026-11-16', 'The 17 Nov interval must use the Scorpio ingress that occurred on 16 Nov.');
  assert.equal(scorpioAtKarthigaiEnd.sunSignIndex, 7, 'Scorpio remains the selected solar sign through Karthigai.');
  assert.equal(scorpioAtKarthigaiEnd.fullBalanceVighati, scorpioAt17Sunrise.fullBalanceVighati,
    'Scorpio full Rasi Mana must remain constant through Karthigai.');
  assert.equal(sagittariusAtMargazhiStart.sunSignIndex, 8, 'The daytime Dhanu ingress starts Margazhi on 16 Dec 2026.');
  assert.equal(sagittariusAtMargazhiStart.sunriseSunSignIndex, 7,
    'On 16 Dec the physical sunrise Sun is still in Scorpio before the daytime Dhanu ingress.');
  assert.equal(sagittariusAtMargazhiStart.sunriseMonthBoundaryApplied, true,
    'The existing date-level Tamil rule treats the daytime ingress date as Margazhi 1 at 0° for its sunrise snapshot.');
  assert.equal(sagittariusAtMargazhiStart.sunDegreeInSign, 0,
    'Margazhi 1 starts its selected Rasi Mana progression at 0°.');
  assert.equal(sagittariusAtMargazhiEnd.sunSignIndex, 8, 'Sagittarius remains selected through the end of Margazhi.');
  assert.equal(sagittariusAtMargazhiEnd.fullBalanceVighati, sagittariusAtMargazhiStart.fullBalanceVighati,
    'Sagittarius full Rasi Mana must remain constant through Margazhi.');
  assert.equal(capricornAtThaiStart.sunSignIndex, 9, 'The after-sunset Makara ingress starts the next sunrise interval on 15 Jan 2027.');
  assert.equal(capricornAtThaiStart.ingressDate, '2027-01-14', 'The 15 Jan interval must use the Makara ingress from the previous evening.');

  assert.equal(scorpioAt25November.sunSignIndex, 7,
    '25 Nov 2026 sunrise belongs to Scorpio after the evening ingress on 16 Nov.');
  assert.equal(scorpioAt25November.sunrise, '06:15');
  assert.ok(Math.abs(scorpioAt25November.sunriseSunLongitude-218.51611163)<0.000001,
    '25 Nov Perambalur sunrise sidereal Sun longitude must match the Swiss Lahiri result.');
  assert.equal(scorpioAt25November.fullBalanceVighati,329,
    'The complete Scorpio 30° OA balance at month start is 329 vighati (5 na 29 vi).');
  assert.equal(scorpioAt25November.remainingVighati,236,
    '25 Nov 2026 sunrise must leave 236 vighati after the Sun progresses to 8°30′58″ Scorpio.');
  assert.equal(scorpioAt25November.balanceNazhigai,3);
  assert.equal(scorpioAt25November.balanceVinazhigai,56);
  assert.ok(scorpioAt25November.sunDegreeInSign > 8 && scorpioAt25November.sunDegreeInSign < 9,
    'The 25 Nov Perambalur sunrise must use the progressed Scorpio longitude, not 0°.');
  assert.ok(scorpioAt25November.remainingSignDegrees > 21 && scorpioAt25November.remainingSignDegrees < 22,
    'The remainder must cover only the degrees from the 25 Nov sunrise Sun position to 30° Scorpio.');
  assert.ok(scorpioAt25November.remainingVighati > 0 &&
    scorpioAt25November.remainingVighati < scorpioAt25November.fullBalanceVighati,
    '25 Nov balance must be less than the full Scorpio month-start value (5 na 29 vi).');
  console.log('SMV_CALENDAR_2026_11_25_RASI_MANA ' + JSON.stringify({
    sunrise:scorpioAt25November.sunrise,
    sunLongitudeAtSunrise:scorpioAt25November.sunriseSunLongitude,
    sunDegreeInSign:scorpioAt25November.sunDegreeInSign,
    remainingSignDegrees:scorpioAt25November.remainingSignDegrees,
    fullRasiManaVighati:scorpioAt25November.fullBalanceVighati,
    remainingOADegrees:scorpioAt25November.remainingOADegrees,
    remainingVighati:scorpioAt25November.remainingVighati,
    balanceNazhigai:scorpioAt25November.balanceNazhigai,
    balanceVinazhigai:scorpioAt25November.balanceVinazhigai
  }));

  assert.equal(atSunrise.sunSignIndex, 7);
  for (const [label, result] of [['sunrise', atSunrise], ['midday', atMidday], ['evening', atEvening]]) {
    assert.equal(result.sunSignIndex, atSunrise.sunSignIndex, label + ' must retain the selected date solar sign.');
    assert.equal(result.sunrise, atSunrise.sunrise, label + ' must use the same selected-date sunrise.');
    assert.equal(result.selectedTime, result.sunrise, label + ' must use the sunrise as the calculation instant.');
    assert.equal(result.sunriseSunLongitude, atSunrise.sunriseSunLongitude,
      label + ' must use the same sunrise longitude, regardless of the request clock.');
    assert.equal(result.remainingVighati, atSunrise.remainingVighati,
      label + ' must show the same sunrise remainder throughout the sunrise interval.');
    assert.equal(result.fullBalanceVighati, atSunrise.fullBalanceVighati,
      label + ' must preserve the same full solar-month OA value.');
  }

  // Verify the actual public Date Details text for the requested date/value.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-25');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const line = document.querySelector('#calMuhurtaLagna .cal-rasi-balance-line')?.textContent || '';
    return status.includes('2026-11-25') && /3 na 56 vi|3 நா 56 வி/.test(line);
  }, { timeout: 90000 });
  const nov25Rendered = await page.$eval('#calMuhurtaLagna', el => ({
    balance:el.querySelector('.cal-rasi-balance-line')?.textContent.trim()||'',
    meta:el.querySelector('.cal-rasi-balance-meta')?.textContent.trim()||''
  }));
  assert.match(nov25Rendered.balance, /3 na 56 vi|3 நா 56 வி/,
    'The public Calendar UI must render 25 Nov 2026 as 3 nazhigai 56 vinazhigai, not 5 na 29 vi.');
  assert.match(nov25Rendered.meta, /8°30′58″/,
    'The public Calendar UI must expose the progressed Sun degree at the selected sunrise.');
  assert.match(nov25Rendered.meta, /5 na 29 vi|5 நா 29 வி/,
    'The public Calendar UI must show the complete Scorpio month-start value separately.');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, originalCalendarDate);
  await page.waitForFunction(date =>
    (document.querySelector('#calStatus')?.textContent || '').includes(date),
    { timeout: 90000 }, originalCalendarDate);


  for (const result of solarSignRasiManaFixtures) {
    assert.match(result.ingressTime, /^\d{2}:\d{2}:\d{2}$/, 'Solar ingress time must retain seconds.');
    assert.match(result.sunrise, /^\d{2}:\d{2}$/, 'The selected town sunrise must be returned.');
    assert.equal(result.method, 'solar-sign-oblique-ascension');
    assert.equal(result.rasiManaAvailable, true);
    assert.equal(result.rasiMana.length, 12);
    assert.equal(result.rasiMana.reduce((sum, row) => sum + row.totalVighati, 0), 3600,
      'All 12 sign measures must total exactly 60 nazhigai.');
    const selected = result.rasiMana[result.sunSignIndex];
    assert.equal(selected.signIndex, result.sunSignIndex);
    assert.equal(result.selectedRasiMana.signIndex, result.sunSignIndex);
    assert.equal(result.fullBalanceVighati, selected.totalVighati);
    assert.equal(result.fullBalanceSeconds, selected.totalVighati * 24);
    assert.ok(result.balanceSeconds >= 0 && result.balanceSeconds <= result.fullBalanceSeconds,
      'Remaining Rasi Mana must stay between zero and the complete OA duration.');
  }
  console.log('CALENDAR_SOLAR_SIGN_RASI_MANA_REGRESSION ' + JSON.stringify(
    solarSignRasiManaFixtures.map(result => ({
      ingressDate:result.ingressDate,
      ingressTime:result.ingressTime,
      sunSignIndex:result.sunSignIndex,
      rasiManaSignIndex:result.rasiManaSignIndex,
      balanceNazhigai:result.balanceNazhigai,
      balanceVinazhigai:result.balanceVinazhigai
    }))
  ));

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
  await checkMuhurthamDate('2026-11-12', /^No$|^இல்லை$/);
  const negativeMuhurtham = await page.$eval('#calMuhurtaLagna', el => ({
    verdict: el.querySelector('.cal-subha-verdict')?.textContent.trim() || '',
    phase: el.querySelector('.cal-subha-verdict')?.nextElementSibling?.textContent.trim() || ''
  }));
  assert.ok(['No','இல்லை'].includes(negativeMuhurtham.verdict), 'A non-Muhurtham date must show only No / இல்லை.');
  assert.equal(negativeMuhurtham.phase, '', 'A non-Muhurtham date must not append a paksha label.');
  await checkMuhurthamDate(calendarDate, /Subha Muhurtham day|சுபமுகூர்த்த நாள்|^No$|^இல்லை$/);
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
  const chandrashtamaState = await page.$eval('#calChandrashtamaSection', el => el.textContent || '');
  assert.ok(/Chandrashtama: Yes|சந்திராஷ்டமம் : - உண்டு/.test(chandrashtamaState) || /Chandrashtama: No|சந்திராஷ்டமம் : இல்லை/.test(chandrashtamaState),
    'The separate Chandrashtama section must show only the direct Yes/No result.');
  assert.ok(/Your Janma Rasi|உங்கள் ஜன்ம ராசி/.test(chandrashtamaState), 'The separate Chandrashtama section must display the selected Janma Rasi');
  assert.ok(/Eighth Rasi · Chandrashtama Rasi|எட்டாம் ராசி · சந்திராஷ்டம ராசி/.test(chandrashtamaState), 'The separate Chandrashtama section must display its corresponding eighth Rasi');

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

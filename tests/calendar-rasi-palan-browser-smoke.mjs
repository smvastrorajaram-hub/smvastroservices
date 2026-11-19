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
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=typeof input==='string'?input:String(input?.url||'');
      if(url==='https://smv-astro-apk-release-api.astroservices.workers.dev/public/android-apps/calendar'){
        return Promise.resolve(new Response(JSON.stringify({success:true,available:false}),{
          status:200,
          headers:{'Content-Type':'application/json'}
        }));
      }
      return originalFetch(input,init);
    };
  });
  await page.setCacheEnabled(false);
  page.setDefaultTimeout(90000);
  // Mock only the nonessential APK release lookup through evaluateOnNewDocument above.
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

  // Verify the annual Graha section is a single vertical sequence on mobile and desktop.
  const initialCalendarLanguage = await page.evaluate(() => document.documentElement.lang || 'en');
  if (initialCalendarLanguage !== 'ta') {
    await page.click('#calTamil');
    await page.waitForFunction(() => document.documentElement.lang === 'ta', { timeout: 20000 });
  }
  await page.waitForSelector('#calGrahaPeriodCard .cal-graha-planet', { timeout: 90000 });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const grahaMobileLayout = await page.evaluate(() => {
    const card = document.querySelector('#calGrahaPeriodCard');
    if (!card) return { found: false };
    const planets = [...card.querySelectorAll('.cal-graha-planet')];
    const headingInfo = planets.map(planet => {
      const heading = planet.querySelector('.cal-graha-planet-name');
      const rect = heading?.getBoundingClientRect();
      return {
        name: heading?.textContent.trim() || '',
        centered: Boolean(rect && Math.abs((rect.left + rect.right) / 2 - window.innerWidth / 2) < 3),
        categoryCount: planet.querySelectorAll('.cal-graha-period-type').length,
        categories: [...planet.querySelectorAll('.cal-graha-period-type h5')].map(el => el.textContent.trim()),
        categoriesBelowHeading: [...planet.querySelectorAll('.cal-graha-period-type')].every(type => type.getBoundingClientRect().top > (rect?.bottom || 0)),
        categoryDisplays: [...planet.querySelectorAll('.cal-graha-period-type')].map(type => getComputedStyle(type).display),
        starts: [...planet.querySelectorAll('.cal-graha-period-start')].map(el => el.textContent.trim()),
        ends: [...planet.querySelectorAll('.cal-graha-period-end')].map(el => el.textContent.trim()),
        datePairsOnOneLine: [...planet.querySelectorAll('.cal-graha-period-event')].every(row => {
          const start = row.querySelector('.cal-graha-period-start')?.getBoundingClientRect();
          const end = row.querySelector('.cal-graha-period-end')?.getBoundingClientRect();
          const rowRect = row.getBoundingClientRect();
          return Boolean(start && end) &&
            getComputedStyle(row).display === 'flex' &&
            getComputedStyle(row).flexWrap === 'nowrap' &&
            Math.abs(start.top - end.top) <= 1 &&
            start.left >= rowRect.left - 1 &&
            end.right <= rowRect.right + 1 &&
            row.scrollWidth <= row.clientWidth + 1;
        })
      };
    });
    return {
      found: true,
      width: card.getBoundingClientRect().width,
      scrollWidth: card.scrollWidth,
      clientWidth: card.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      tableCount: card.querySelectorAll('table').length,
      columnLayouts: [...card.querySelectorAll('.cal-graha-period-planets,.cal-graha-planet,.cal-graha-planet-periods,.cal-graha-period-type')].filter(el => ['grid','flex','inline-grid','inline-flex'].includes(getComputedStyle(el).display)).length,
      titleColor: getComputedStyle(card.querySelector('h3')).color,
      horizontalScrollElements: [...card.querySelectorAll('*')].filter(el => {
        const style = getComputedStyle(el);
        return ['auto','scroll'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
      }).length,
      headingInfo,
      footnoteText: card.querySelector('.cal-graha-period-note')?.textContent || ''
    };
  });
  assert.equal(grahaMobileLayout.found, true, 'Annual Graha periods must render on mobile.');
  assert.equal(grahaMobileLayout.tableCount, 0, 'Graha periods must not use a table.');
  assert.equal(grahaMobileLayout.columnLayouts, 0, 'Graha periods must not use columns or flex rows.');
  assert.notEqual(grahaMobileLayout.titleColor, 'rgb(255, 0, 0)', 'Graha heading must retain the existing Calendar colour instead of global Horoscope red.');
  assert.equal(grahaMobileLayout.horizontalScrollElements, 0, 'Graha periods must not introduce horizontal scrolling.');
  assert.ok(grahaMobileLayout.pageScrollWidth <= grahaMobileLayout.viewportWidth + 1, 'Mobile page must not overflow horizontally: ' + JSON.stringify(grahaMobileLayout));
  assert.equal(grahaMobileLayout.headingInfo.length, 5, 'Exactly five planets must be shown.');
  assert.deepEqual(grahaMobileLayout.headingInfo.map(item => item.name), ['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'], 'The five planets must appear in their intended order.');
  assert.ok(grahaMobileLayout.headingInfo.every(item => item.centered && item.categoryCount === 2 && item.categories.join('|') === 'வக்ரம்|அஸ்தமனம்' && item.categoriesBelowHeading && item.categoryDisplays.every(display => display === 'block') && item.datePairsOnOneLine), 'Each planet must be centered with Vakram and Asthamanam stacked below and full dates visible: ' + JSON.stringify(grahaMobileLayout.headingInfo));
  assert.equal(grahaMobileLayout.footnoteText, '', 'The annual-boundary / IST explanatory paragraph must remain absent.');
  assert.ok(grahaMobileLayout.headingInfo.every(item => item.starts.length === item.ends.length), 'Every period start must have a corresponding end date.');
  await page.$eval('#calGrahaPeriodCard', el => el.scrollIntoView({ block: 'center' }));
  await page.screenshot({
    path: new URL('calendar-graha-period-list-mobile.png', outputDir).pathname,
    fullPage: false,
    captureBeyondViewport: false
  });
  if (initialCalendarLanguage !== 'ta') {
    await page.click('#calEnglish');
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 20000 });
  }
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const grahaDesktopLayout = await page.evaluate(() => {
    const card = document.querySelector('#calGrahaPeriodCard');
    const mainHeading = card?.querySelector(':scope > h3');
    const headingRect = mainHeading?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    const dateLines = [...(card?.querySelectorAll('.cal-graha-period-start,.cal-graha-period-end') || [])];
    const heroHeader = document.querySelector('#smvDailyCalendar .cal-header');
    const heroContent = heroHeader?.querySelector(':scope > div');
    const heroHeaderRect = heroHeader?.getBoundingClientRect();
    const heroContentRect = heroContent?.getBoundingClientRect();
    const heroTextLines = [...(heroContent?.querySelectorAll(':scope > p,:scope > h2,:scope > span') || [])];
    return {
      found: Boolean(card),
      cardWidth: card?.getBoundingClientRect().width || 0,
      viewportWidth: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      planetCount: card?.querySelectorAll('.cal-graha-planet').length || 0,
      tableCount: card?.querySelectorAll('table').length || 0,
      heroHeaderFound: Boolean(heroHeader),
      heroContentCenterDelta: heroHeaderRect && heroContentRect
        ? Math.abs((heroContentRect.left + heroContentRect.right) / 2 - (heroHeaderRect.left + heroHeaderRect.right) / 2)
        : Infinity,
      heroTextAlignments: heroTextLines.map(line => getComputedStyle(line).textAlign),
      mainHeadingTextAlign: mainHeading ? getComputedStyle(mainHeading).textAlign : '',
      mainHeadingCenterDelta: headingRect && cardRect
        ? Math.abs((headingRect.left + headingRect.right) / 2 - (cardRect.left + cardRect.right) / 2)
        : Infinity,
      mainHeadingDisplay: mainHeading ? getComputedStyle(mainHeading).display : '',
      mainHeadingAfterDisplay: mainHeading ? getComputedStyle(mainHeading, '::after').display : '',
      categoryTextAlignments: [...(card?.querySelectorAll('.cal-graha-period-type h5') || [])].map(label => getComputedStyle(label).textAlign),
      dateTextAlignments: dateLines.map(line => getComputedStyle(line).textAlign),
      datePairsOnOneLine: [...(card?.querySelectorAll('.cal-graha-period-event') || [])].every(row => {
        const start = row.querySelector('.cal-graha-period-start')?.getBoundingClientRect();
        const end = row.querySelector('.cal-graha-period-end')?.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        return Boolean(start && end) &&
          getComputedStyle(row).display === 'flex' &&
          getComputedStyle(row).flexWrap === 'nowrap' &&
          Math.abs(start.top - end.top) <= 1 &&
          start.left >= rowRect.left - 1 &&
          end.right <= rowRect.right + 1 &&
          row.scrollWidth <= row.clientWidth + 1;
      })
    };
  });
  assert.equal(grahaDesktopLayout.found, true, 'Annual Graha periods must remain visible on desktop.');
  assert.equal(grahaDesktopLayout.planetCount, 5, 'Desktop must show the same five-planet sequence.');
  assert.equal(grahaDesktopLayout.tableCount, 0, 'Desktop must not render a table.');
  assert.equal(grahaDesktopLayout.heroHeaderFound, true, 'Calendar hero header must be visible on desktop.');
  assert.ok(grahaDesktopLayout.heroContentCenterDelta <= 2, 'SMV CALENDAR title, subtitle and tagline block must be centered within the hero on desktop: ' + JSON.stringify(grahaDesktopLayout));
  assert.ok(grahaDesktopLayout.heroTextAlignments.length === 3 && grahaDesktopLayout.heroTextAlignments.every(value => value === 'center'), 'All three Calendar hero text lines must be centered on desktop: ' + JSON.stringify(grahaDesktopLayout));
  assert.equal(grahaDesktopLayout.mainHeadingTextAlign, 'center', 'The main Graha heading must be centered on desktop.');
  assert.equal(grahaDesktopLayout.mainHeadingDisplay, 'block', 'The main Graha heading must not use the generic flex-and-divider heading layout on desktop.');
  assert.equal(grahaDesktopLayout.mainHeadingAfterDisplay, 'none', 'The generic heading divider must not shift the Graha heading away from center on desktop.');
  assert.ok(grahaDesktopLayout.categoryTextAlignments.length >= 2 && grahaDesktopLayout.categoryTextAlignments.every(value => value === 'center'), 'Vakram and Asthamanam labels must be centered on desktop: ' + JSON.stringify(grahaDesktopLayout));
  assert.ok(grahaDesktopLayout.mainHeadingCenterDelta <= 2, 'The main Graha heading must be centered within its section on desktop: ' + JSON.stringify(grahaDesktopLayout));
  assert.ok(grahaDesktopLayout.dateTextAlignments.length > 0 && grahaDesktopLayout.dateTextAlignments.every(value => value === 'center'), 'Start and end date-times must be centered on desktop: ' + JSON.stringify(grahaDesktopLayout));
  assert.ok(grahaDesktopLayout.datePairsOnOneLine, 'Each Start and End date-time pair must share one centered line on desktop without clipping: ' + JSON.stringify(grahaDesktopLayout));
  assert.ok(grahaDesktopLayout.pageScrollWidth <= grahaDesktopLayout.viewportWidth + 1, 'Desktop page must not overflow horizontally: ' + JSON.stringify(grahaDesktopLayout));

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

  // Switching language rebuilds the Calendar shell and clears #calStatus.
  // Readiness must therefore be based on the calculated UI, not the status text.
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const calculationFailed = /Unable to calculate|கணக்கிட முடியவில்லை/.test(status);
    const sunriseRendered = [...(document.querySelectorAll('#calDateDetailsExtra .cal-muhurta-card') || [])]
      .some(card => /Sunrise:|சூரிய உதயம்/.test(card.querySelector('span')?.textContent || ''));
    const timeEnabled = Boolean(document.querySelector('#calTime') && !document.querySelector('#calTime').disabled);
    const monthRendered = Boolean(document.querySelector('#calMonth .cal-month-grid button'));
    const dailyRendered = Boolean(document.querySelector('#calGrahaPeriodCard .cal-graha-planet'));
    const stillCalculating = /Calculating Panchang|பஞ்சாங்கம், ஹோரை/.test(status) ||
      /Loading monthly calendar|மாத நாட்காட்டி தயாராகிறது/.test(document.querySelector('#calMonth')?.textContent || '');
    return calculationFailed || (!stillCalculating && sunriseRendered && timeEnabled && monthRendered && dailyRendered);
  }, { timeout: 90000 });
  const calendarCalculationStatus = await page.$eval('#calStatus', el => el.textContent || '');
  const dateTimeControlLayout = await page.$eval('.cal-date-time-fields', wrapper => {
    const date=wrapper.querySelector('#calDate');
    const time=wrapper.querySelector('#calTime');
    const dateRect=date?.getBoundingClientRect();
    const timeRect=time?.getBoundingClientRect();
    return {
      hasDate:Boolean(date),
      hasTime:Boolean(time),
      timeBelowDate:Boolean(dateRect&&timeRect&&timeRect.top>=dateRect.bottom-1),
      timeEnabled:Boolean(time&&!time.disabled),
      selectedTime:time?.value||''
    };
  });
  assert.equal(dateTimeControlLayout.hasDate,true,'The Calendar must retain its date selector.');
  assert.equal(dateTimeControlLayout.hasTime,true,'A time selector must appear directly below the date selector.');
  assert.equal(dateTimeControlLayout.timeBelowDate,true,'The Time control must be physically below Date.');
  assert.equal(dateTimeControlLayout.timeEnabled,true,'The time selector becomes available after sunrise is resolved.');
  const displayedSunrise = await page.$eval('#calDateDetailsExtra', root => {
    const card=[...root.querySelectorAll('.cal-muhurta-card')].find(item=>/Sunrise:|சூரிய உதயம்/.test(item.querySelector('span')?.textContent||''));
    return card?.querySelector('span')?.textContent?.match(/\d{2}:\d{2}/)?.[0]||'';
  });
  assert.match(displayedSunrise,/^\d{2}:\d{2}$/,'The selected date must display its calculated local sunrise.');
  assert.equal(dateTimeControlLayout.selectedTime,displayedSunrise,"The initial Time value must be fixed to that date and location's sunrise.");
  const chosenPanchangTime='10:27';
  await page.$eval('#calTime',(element,value)=>{
    element.value=value;
    element.dispatchEvent(new Event('change',{bubbles:true}));
  },chosenPanchangTime);
  await page.waitForFunction(time=>{
    const status=document.querySelector('#calStatus')?.textContent||'';
    const lagna=[...document.querySelectorAll('#calMuhurtaLagna .cal-muhurta-lagna-item')][1]?.querySelector('span')?.textContent||'';
    return status.includes(' · '+time+' · UTC ')&&lagna.includes(time);
  },{timeout:120000},chosenPanchangTime);
  assert.equal(await page.$eval('#calTime',element=>element.value),chosenPanchangTime,
    'Selecting a new time must keep that time in the input and recalculate the daily Panchang.');


  await page.waitForSelector('#calMonth .cal-month-grid button.cal-sunday > strong', { timeout: 30000 });
  const sundayCalendarStyle = await page.$eval('#calMonth .cal-month-grid', grid => {
    const heading=grid.querySelector('b.cal-weekday-sunday');
    const sunday=grid.querySelector('button.cal-sunday');
    const ordinary=grid.querySelector('button:not(.cal-sunday) > strong');
    return {
      heading:heading?.textContent?.trim()||'',
      headingColor:heading?getComputedStyle(heading).color:'',
      dateColor:sunday?.querySelector('strong')?getComputedStyle(sunday.querySelector('strong')).color:'',
      tamilDateColor:sunday?.querySelector('.cal-day-tamil')?getComputedStyle(sunday.querySelector('.cal-day-tamil')).color:'',
      ordinaryDateColor:ordinary?getComputedStyle(ordinary).color:''
    };
  });
  assert.ok(['ஞா','Su'].includes(sundayCalendarStyle.heading),
    'The first Calendar weekday heading must be Sunday in the active language.');
  assert.equal(sundayCalendarStyle.headingColor,'rgb(180, 35, 24)',
    'Only the Sunday weekday abbreviation must be red.');
  assert.equal(sundayCalendarStyle.dateColor,'rgb(180, 35, 24)',
    'The Gregorian date number in Sunday cells must be red.');
  assert.notEqual(sundayCalendarStyle.tamilDateColor,'rgb(180, 35, 24)',
    'The Tamil date beneath the Gregorian number must retain its normal colour.');
  assert.notEqual(sundayCalendarStyle.ordinaryDateColor,'rgb(180, 35, 24)',
    'Dates in all non-Sunday columns must retain their normal colour.');
  await page.waitForSelector('#calMuhurtaLagna .cal-muhurta-lagna-grid .cal-muhurta-lagna-item', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#calChandrashtamaResult')?.dataset.resolved === 'true', { timeout: 180000 });
  await page.waitForFunction(() =>
    Boolean(document.querySelector('#calReadings .cal-summary>article') && document.querySelector('#calEvents > h3')) &&
    document.querySelectorAll('#calDateDetailsExtra .cal-panchang-detail-grid .cal-panchang-detail-item').length === 14,
    { timeout: 30000 });
  const integratedPanchang = await page.$eval('#calDateDetails', root => {
    const title = root.querySelector('.cal-date-details-title')?.textContent?.trim() || '';
    const source = root.querySelector('#calPanchangSource');
    const summary = root.querySelector('#calDateDetailsExtra .cal-details-summary');
    const grid = summary?.querySelector('.cal-panchang-detail-grid');
    const items = [...(grid?.querySelectorAll('.cal-panchang-detail-item') || [])];
    const first = items[0], second = items[1];
    const firstRect = first?.getBoundingClientRect();
    const secondRect = second?.getBoundingClientRect();
    const firstLabel = first?.querySelector('small')?.getBoundingClientRect();
    const firstValue = first?.querySelector('strong')?.getBoundingClientRect();
    const allLabelsAboveResults = items.length===14 && items.every(item=>{
      const label=item.querySelector(':scope > small')?.getBoundingClientRect();
      const result=item.querySelector(':scope > strong')?.getBoundingClientRect();
      return Boolean(label&&result&&label.bottom<=result.top+2&&Math.abs(label.left-result.left)<4);
    });
    const headingHeader=root.querySelector('.cal-date-details-head');
    const headingElement=root.querySelector('.cal-date-details-title');
    const headingStyle=headingElement?getComputedStyle(headingElement):null;
    const headingHeaderStyle=headingHeader?getComputedStyle(headingHeader):null;
    const headingBeforeStyle=headingElement?getComputedStyle(headingElement,'::before'):null;
    const headingAfterStyle=headingElement?getComputedStyle(headingElement,'::after'):null;
    const firstEvent=grid?.querySelector('.smv-calendar-event-range');
    const firstEventRangeText=firstEvent?.textContent.replace(/\s+/g,' ').trim()||'';
    const thyajyam = summary?.querySelector('.cal-thyajyam-card');
    return {
      title,
      sourceHidden: source?.hidden === true,
      sourceRowCount: source?.querySelectorAll('.panchang-data-table tbody tr').length || 0,
      itemCount: items.length,
      visibleDateRow: items.some(item => /^(Date|தேதி)$/.test(item.querySelector('small')?.textContent?.trim() || '')),
      tamilDateTile: Boolean(summary?.querySelector('.cal-tamil-date-card')),
      standalonePanchangCard: Boolean(root.querySelector('#calDaily .panchang-card')),
      dailyHoraKept: Boolean(root.querySelector('#calDaily .hora-card')),
      gridBeforeThyajyam: Boolean(grid && thyajyam && (grid.compareDocumentPosition(thyajyam) & Node.DOCUMENT_POSITION_FOLLOWING)),
      firstTwoShareRow: Boolean(firstRect && secondRect && Math.abs(firstRect.top - secondRect.top) < 1 && firstRect.left < secondRect.left),
      labelsAboveResults: allLabelsAboveResults,
      headingCentered: headingStyle?.textAlign==='center',
      headingBeforeHidden: !headingBeforeStyle||headingBeforeStyle.content==='none'||headingBeforeStyle.display==='none',
      headingAfterHidden: !headingAfterStyle||headingAfterStyle.content==='none'||headingAfterStyle.display==='none',
      headingHeaderBackground: headingHeaderStyle?.backgroundColor||'',
      headingTitleBackground: headingStyle?.backgroundColor||'',
      firstEventRangeText,
      firstEventNoYear: Boolean(firstEvent&&!/\b\d{4}\b/.test(firstEvent.textContent||''))
    };
  });
  assert.ok(['Daily Panchang', 'தினசரி பஞ்சாங்கம்'].includes(integratedPanchang.title),
    'The Date Details heading must be renamed to Daily Panchang in both languages.');
  assert.equal(integratedPanchang.sourceHidden, true, 'The old Panchang table is retained only as a hidden data source.');
  assert.equal(integratedPanchang.sourceRowCount, 15, 'The source contains the original date and fourteen Panchang results.');
  assert.equal(integratedPanchang.itemCount, 14, 'All fourteen non-date Panchang results must appear in the new detail grid.');
  assert.equal(integratedPanchang.visibleDateRow, false, 'There must not be a separate date-only Panchang item.');
  assert.equal(integratedPanchang.tamilDateTile, true, 'The Tamil date remains in the existing date tile.');
  assert.equal(integratedPanchang.standalonePanchangCard, false, 'The separate Daily Panchang table card must be removed.');
  assert.equal(integratedPanchang.dailyHoraKept, true, 'Daily Hora remains in its existing area.');
  assert.equal(integratedPanchang.gridBeforeThyajyam, true, 'All Panchang results must appear above Nakshatra Thyajyam.');
  assert.equal(integratedPanchang.firstTwoShareRow, true, 'Panchang result cards must be arranged left and right.');
  assert.equal(integratedPanchang.labelsAboveResults, true, 'All fourteen Panchang cards must show the label above the result.');
  assert.equal(integratedPanchang.headingCentered, true, 'Daily Panchang title must be centered.');
  assert.equal(integratedPanchang.headingBeforeHidden, true, 'Daily Panchang title must not show a leading decorative symbol.');
  assert.equal(integratedPanchang.headingAfterHidden, true, 'Daily Panchang title must not show trailing decorative symbols.');
  assert.equal(integratedPanchang.headingHeaderBackground, 'rgba(0, 0, 0, 0)', 'Daily Panchang heading must have no red background.');
  assert.equal(integratedPanchang.headingTitleBackground, 'rgba(0, 0, 0, 0)', 'Daily Panchang title must remain transparent.');
  assert.match(integratedPanchang.firstEventRangeText, /^\d{2}:\d{2}\(\d{2}\/\d{2}\)-\d{2}:\d{2}\(\d{2}\/\d{2}\)$/, 'Panchang time ranges must stay on one line with no spaces around the hyphen.');
  const centeredCalendarHeadings = await page.evaluate(() => {
    const inspect = selector => {
      const element=document.querySelector(selector);
      if(!element)return null;
      const style=getComputedStyle(element);
      const after=getComputedStyle(element,'::after');
      return {text:element.textContent.trim(),alignment:style.textAlign,display:style.display,fontSize:style.fontSize,className:element.className,afterContent:after.content,afterDisplay:after.display};
    };
    const dailyHora=inspect('#calDaily .hora-card>h3');
    const transitChart=inspect('#calDaily .transit-card>h3');
    const transitPositions=inspect('#calDaily .transit-table-card>h3');
    const panchangHeader=document.querySelector('.cal-date-details-head');
    const headerAfter=panchangHeader?getComputedStyle(panchangHeader,'::after'):null;
    const panchangTitle=document.querySelector('#calDateDetails .cal-date-details-title');
     const rasiHeading=document.querySelector('#calRasiPalan .rp-heading h2');
    const lagnaCell=document.querySelector('#calDaily .transit-position-table tbody tr:first-child td:first-child');
    return {
      language:document.documentElement.lang||'en',
      dailyHora,transitChart,transitPositions,
      panchangHeaderAfter:headerAfter?{content:headerAfter.content,display:headerAfter.display}:null,
       panchangHeading:panchangTitle?{fontSize:getComputedStyle(panchangTitle).fontSize}:null,
      rasiHeading:rasiHeading?{text:rasiHeading.textContent.trim(),fontSize:getComputedStyle(rasiHeading).fontSize,color:getComputedStyle(rasiHeading).color,fill:getComputedStyle(rasiHeading).webkitTextFillColor}:null,
      lagnaLabel:lagnaCell?.textContent.trim()||''
    };
  });
  for(const [name,heading] of Object.entries({
    'Daily Hora':centeredCalendarHeadings.dailyHora,
    'Transit Chart':centeredCalendarHeadings.transitChart,
    'Transit Planetary Positions':centeredCalendarHeadings.transitPositions
  })){
    assert.ok(heading, name+' heading must render.');
    assert.equal(heading.alignment,'center',name+' heading must be centered.');
    assert.equal(heading.display,'block',name+' heading must use a full-width block.');
     assert.equal(heading.fontSize,'19px',name+' heading must use the compact desktop font size.');
    assert.ok(heading.afterContent==='none'||heading.afterDisplay==='none',name+' heading must not retain the trailing flex ornament.');
  }
  assert.equal(centeredCalendarHeadings.panchangHeading?.fontSize,'19px', 'Daily Panchang heading must use the compact desktop font size.');
   assert.ok(centeredCalendarHeadings.panchangHeaderAfter &&
    (centeredCalendarHeadings.panchangHeaderAfter.content==='none'||centeredCalendarHeadings.panchangHeaderAfter.display==='none'),
    'Daily Panchang header must not display the inherited right-side Om-like ornament.');
  assert.equal(centeredCalendarHeadings.rasiHeading?.text,
    centeredCalendarHeadings.language==='ta' ? 'ராசி பலன்கள் & கிரக கோச்சார பலன்கள்' : 'Rasi Palan & Planetary Transits',
    'Rasi and planetary transit heading must use the corrected wording in the active language.');
  assert.equal(centeredCalendarHeadings.rasiHeading?.fontSize,'19px', 'Rasi Palan heading must use the compact desktop font size.');
   assert.equal(centeredCalendarHeadings.rasiHeading?.color,'rgb(21, 86, 78)',
    'Rasi and planetary transit heading must use the green Calendar theme.');
  assert.equal(centeredCalendarHeadings.rasiHeading?.fill,'rgb(21, 86, 78)',
    'Rasi and planetary transit heading WebKit text fill must also use the green theme.');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
   const mobileHeadingSizes = await page.evaluate(() => {
     const selectors={dailyPanchang:'#calDateDetails .cal-date-details-title',dailyHora:'#calDaily .hora-card>h3',transitChart:'#calDaily .transit-card>h3',transitPositions:'#calDaily .transit-table-card>h3',rasiPalan:'#calRasiPalan .rp-heading h2'};
     return Object.fromEntries(Object.entries(selectors).map(([name,selector])=>[name,document.querySelector(selector)?getComputedStyle(document.querySelector(selector)).fontSize:null]));
   });
   assert.deepEqual(mobileHeadingSizes,{dailyPanchang:'17px',dailyHora:'17px',transitChart:'17px',transitPositions:'17px',rasiPalan:'17px'},'All Calendar section headings must use the same compact mobile font size.');
   await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
   assert.equal(centeredCalendarHeadings.lagnaLabel,
    centeredCalendarHeadings.language==='ta' ? 'லக்னம்' : 'Ascendant',
    'The transit positions table must display the full Lagna / Ascendant name.');

  assert.match(integratedPanchang.firstEventRangeText, /^\d{2}:\d{2}\(\d{2}\/\d{2}\)-\d{2}:\d{2}\(\d{2}\/\d{2}\)$/, 'Panchang event timing must use the compact single-line HH:MM(DD/MM)-HH:MM(DD/MM) format.');
  assert.equal(integratedPanchang.firstEventNoYear, true, 'Panchang event ranges must omit the four-digit Gregorian year.');

  const yogaFlow = await page.$eval('#calDateDetailsExtra .cal-details-summary', summary => {
    const wrapper = summary.querySelector('.cal-day-yoga-cards');
    const actualYogaCards = [...(wrapper?.querySelectorAll(':scope > .cal-amirthadi-yoga-card') || [])];
    const dateCard = summary.querySelector('.cal-tamil-date-card');
    const rect = element => {
      const r = element?.getBoundingClientRect();
      return r ? { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width } : null;
    };
    const probe = yogaCount => {
      const clone = summary.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;width:'+summary.getBoundingClientRect().width+'px;margin:0;';
      const yogaWrapper = clone.querySelector('.cal-day-yoga-cards');
      const template = yogaWrapper?.querySelector('.cal-amirthadi-yoga-card');
      if (!yogaWrapper || !template) return { available:false };
      yogaWrapper.replaceChildren(...Array.from({length:yogaCount}, () => template.cloneNode(true)));
      yogaWrapper.dataset.yogaCount = String(yogaCount);
      summary.parentElement.append(clone);
      const date = clone.querySelector('.cal-tamil-date-card');
      const cards = [...yogaWrapper.querySelectorAll(':scope > .cal-amirthadi-yoga-card')];
      const panchang = clone.querySelector('.cal-panchang-detail-grid');
      const thyajyam = clone.querySelector('.cal-thyajyam-card');
      const dayLength = [...clone.querySelectorAll('.cal-muhurta-card')]
        .find(card => /Ahas : Day length|அகஸ் :- பகல் மானம்/.test(card.textContent || ''));
      const dateRect = rect(date), yogaRects = cards.map(rect);
      const panchangRect = rect(panchang), thyajyamRect = rect(thyajyam), dayLengthRect = rect(dayLength);
      const result = {
        available:true,
        yogaCount:cards.length,
        dateAndFirstYogaShareRow:Boolean(dateRect && yogaRects[0] && Math.abs(dateRect.top-yogaRects[0].top)<1 && dateRect.left<yogaRects[0].left),
        secondAndThirdYogaShareRow:Boolean(yogaRects[1] && yogaRects[2] && Math.abs(yogaRects[1].top-yogaRects[2].top)<1 && yogaRects[1].left<yogaRects[2].left),
        panchangBelowYoga:Boolean(panchangRect && yogaRects.length && panchangRect.top>=Math.max(dateRect.bottom,yogaRects[yogaRects.length-1].bottom)-1),
        panchangFullWidth:Boolean(panchangRect && Math.abs(panchangRect.width-clone.getBoundingClientRect().width)<2),
        lowerCardsShareRow:Boolean(thyajyamRect && dayLengthRect && Math.abs(thyajyamRect.top-dayLengthRect.top)<1 && thyajyamRect.left<dayLengthRect.left),
        emptyYogaCards:clone.querySelectorAll('.cal-empty-yoga-card,.cal-empty-yoga-slot').length
      };
      clone.remove();
      return result;
    };
    const firstYogaCard = actualYogaCards[0];
    const firstYogaSegment = firstYogaCard?.querySelector('.cal-yoga-segment');
    const firstYogaTime = firstYogaSegment?.querySelector('.cal-yoga-segment-time');
    const yogaReference = firstYogaCard?.querySelector('.cal-yoga-reference');
    const thyajyamCard = summary.querySelector('.cal-thyajyam-card');
    const thyajyamTitle = thyajyamCard?.querySelector(':scope > small');
    const thyajyamSegments = thyajyamCard?.querySelector('.cal-yoga-segments');
    const thyajyamSegment = thyajyamSegments?.querySelector('.cal-yoga-segment');
    const style = element => element ? getComputedStyle(element) : null;
    const firstYogaRect = rect(firstYogaCard);
    const dateRect = rect(dateCard);
    const yogaTimeRect = rect(firstYogaTime);
    const referenceRect = rect(yogaReference);
    const thyajyamTitleRect = rect(thyajyamTitle);
    const thyajyamPeriodRect = rect(thyajyamSegment);
    return {
      declaredYogaCount:Number(wrapper?.dataset.yogaCount ?? -1),
      actualYogaCardCount:actualYogaCards.length,
      wrapperDisplay:wrapper ? getComputedStyle(wrapper).display : '',
      dateAndFirstYogaShareRow:Boolean(dateRect && firstYogaRect && Math.abs(dateRect.top-firstYogaRect.top)<1 && dateRect.left<firstYogaRect.left),
      yogaCardGap:parseFloat(style(firstYogaCard)?.rowGap || '0'),
      yogaCardPaddingTop:parseFloat(style(firstYogaCard)?.paddingTop || '0'),
      yogaSegmentGap:parseFloat(style(firstYogaSegment)?.rowGap || '0'),
      yogaSegmentPaddingTop:parseFloat(style(firstYogaSegment)?.paddingTop || '0'),
      yogaReferenceMarginTop:parseFloat(style(yogaReference)?.marginTop || '0'),
      yogaTimeToReferenceGap:yogaTimeRect&&referenceRect?referenceRect.top-yogaTimeRect.bottom:null,
      thyajyamCardGap:parseFloat(style(thyajyamCard)?.rowGap || '0'),
      thyajyamCardPaddingTop:parseFloat(style(thyajyamCard)?.paddingTop || '0'),
      thyajyamSegmentsGap:parseFloat(style(thyajyamSegments)?.rowGap || '0'),
      thyajyamSegmentsMarginTop:parseFloat(style(thyajyamSegments)?.marginTop || '0'),
      thyajyamTitleToPeriodGap:thyajyamTitleRect&&thyajyamPeriodRect?thyajyamPeriodRect.top-thyajyamTitleRect.bottom:null,
      thyajyamHasVerboseNote:thyajyamCard ? thyajyamCard.querySelectorAll(':scope > small').length > 1 : true,
      threeYogaLayout:probe(3),
      oneYogaLayout:probe(1)
    };
  });
  assert.ok(yogaFlow.declaredYogaCount >= 0, 'The calculated Amirthadi Yoga count must be exposed for layout validation.');
  assert.equal(yogaFlow.actualYogaCardCount, Math.max(1,yogaFlow.declaredYogaCount),
    'Each available Yoga must become one card; only one unavailable-result card appears when none is available.');
  assert.equal(yogaFlow.wrapperDisplay, 'contents', 'The Yoga wrapper must not consume an extra grid cell.');
  assert.equal(yogaFlow.dateAndFirstYogaShareRow, true, 'Tamil date stays on the left and the first Yoga occupies its right side.');
  assert.equal(yogaFlow.threeYogaLayout.available, true, 'Three-Yoga layout probe must render.');
  assert.equal(yogaFlow.threeYogaLayout.dateAndFirstYogaShareRow, true, 'With three Yogas, the first row must be Tamil date | Yoga 1.');
  assert.equal(yogaFlow.threeYogaLayout.secondAndThirdYogaShareRow, true, 'With three Yogas, Yoga 2 and Yoga 3 must fill the next left/right row.');
  assert.equal(yogaFlow.threeYogaLayout.panchangBelowYoga, true, 'Daily Panchang details must follow all Yoga cards.');
  assert.equal(yogaFlow.threeYogaLayout.panchangFullWidth, true, 'The Panchang detail grid must keep its full-width layout.');
  assert.equal(yogaFlow.oneYogaLayout.available, true, 'Single-Yoga layout probe must render.');
  assert.equal(yogaFlow.oneYogaLayout.yogaCount, 1, 'Single-Yoga layout must render only one Yoga card.');
  assert.equal(yogaFlow.oneYogaLayout.dateAndFirstYogaShareRow, true, 'With one Yoga, Tamil date and that Yoga must share the top row.');
  assert.equal(yogaFlow.oneYogaLayout.panchangBelowYoga, true, 'With one Yoga, the next Panchang content must flow immediately below.');
  assert.equal(yogaFlow.oneYogaLayout.panchangFullWidth, true, 'With one Yoga, Panchang details must fill the next row rather than leave an empty Yoga cell.');
  assert.equal(yogaFlow.oneYogaLayout.lowerCardsShareRow, true, 'Thyajyam and the next lower card must fill left/right positions without an empty Yoga placeholder.');
  assert.equal(yogaFlow.oneYogaLayout.emptyYogaCards, 0, 'No empty Yoga card or reserved empty Yoga slot may be created.');
  assert.ok(yogaFlow.yogaCardGap <= 2, 'Yoga heading and result card must use a compact gap.');
  if (yogaFlow.yogaCardPaddingTop > 8) {
    console.log('CALENDAR_YOGA_LAYOUT_DIAGNOSTIC='+JSON.stringify({
      paddingTop:yogaFlow.yogaCardPaddingTop,
      wrapperDisplay:yogaFlow.wrapperDisplay,
      cardGap:yogaFlow.yogaCardGap,
      selectorMatches:await page.$eval('#calDateDetailsExtra .cal-details-summary .cal-amirthadi-yoga-card', card => ({
        id:card.closest('#calDateDetailsExtra')?.id||'',
        parent:card.parentElement?.className||'',
        summary:card.parentElement?.parentElement?.className||'',
        exactSelector:card.matches('#calDateDetailsExtra .cal-details-summary>.cal-day-yoga-cards>.cal-amirthadi-yoga-card'),
        stylesheets:[...document.styleSheets].map(sheet=>sheet.href).filter(Boolean)
      }))
    }));
  }
  assert.ok(yogaFlow.yogaCardPaddingTop <= 8,
    'Yoga card top padding must remain compact. Actual computed layout: '+JSON.stringify({paddingTop:yogaFlow.yogaCardPaddingTop,cardGap:yogaFlow.yogaCardGap}));
  assert.ok(yogaFlow.yogaSegmentGap <= 2, 'Yoga result name, description and timing must remain close together.');
  assert.ok(yogaFlow.yogaSegmentPaddingTop <= 2, 'Yoga result segment must not add excess top padding.');
  assert.ok(yogaFlow.yogaReferenceMarginTop <= 2, 'Sunrise reference must sit close below the Yoga time.');
  assert.ok(yogaFlow.yogaTimeToReferenceGap <= 8, 'Yoga time and sunrise reference gap must be compact. Actual metrics: '+JSON.stringify({gap:yogaFlow.yogaTimeToReferenceGap,segmentGap:yogaFlow.yogaSegmentGap,referenceMarginTop:yogaFlow.yogaReferenceMarginTop,cardGap:yogaFlow.yogaCardGap,cardPaddingTop:yogaFlow.yogaCardPaddingTop}));
  assert.ok(yogaFlow.thyajyamCardGap <= 2, 'Thyajyam card gap must be compact. Actual metrics: '+JSON.stringify({gap:yogaFlow.thyajyamCardGap,padding:yogaFlow.thyajyamCardPaddingTop,segmentsGap:yogaFlow.thyajyamSegmentsGap,segmentsMarginTop:yogaFlow.thyajyamSegmentsMarginTop,titleToPeriodGap:yogaFlow.thyajyamTitleToPeriodGap}));
  assert.ok(yogaFlow.thyajyamCardPaddingTop <= 8, 'Thyajyam card top padding must remain compact.');
  assert.ok(yogaFlow.thyajyamSegmentsGap <= 2, 'Thyajyam interval rows must remain close together.');
  assert.ok(yogaFlow.thyajyamSegmentsMarginTop <= 2, 'Thyajyam heading must sit close to its period details.');
  assert.ok(yogaFlow.thyajyamTitleToPeriodGap <= 8, 'Thyajyam title and first result must not have excess space.');
  assert.equal(yogaFlow.thyajyamHasVerboseNote, false, 'Thyajyam must not reserve space for a redundant explanatory note.');
  const dailyDetailsOrder = await page.$eval('#calDateDetails', root =>
    [...root.children].map(child => child.id).filter(id =>
      ['calChandrashtamaSection', 'calEvents', 'calDaily'].includes(id)));
  assert.deepEqual(dailyDetailsOrder,
    ['calChandrashtamaSection', 'calEvents', 'calDaily'],
    'Chandrashtama and Tara Bala share one result section before observances and daily Panchang.');
  const taraBalaContinuity = await page.$eval('#calReadings', section => {
    const card=section.querySelector('.cal-summary>article');
    return {
      sameSection:section.parentElement?.id==='calChandrashtamaSection',
      headingRemoved:!section.querySelector('h3'),
      sectionSeparator:getComputedStyle(section).borderTopWidth,
      cardBorder:getComputedStyle(card).borderTopWidth,
      cardBackground:getComputedStyle(card).backgroundColor
    };
  });
  assert.equal(taraBalaContinuity.sameSection,true,'Tara Bala must be nested directly in the Chandrashtama result layer.');
  assert.equal(taraBalaContinuity.headingRemoved,true,'The separate Birth Star and Tara Bala heading must not be rendered.');
  assert.equal(taraBalaContinuity.sectionSeparator,'1px','Tara Bala may use a subtle divider but not a separate outer card.');
  assert.equal(taraBalaContinuity.cardBorder,'0px','Tara Bala must not introduce a second bordered card.');
  assert.equal(taraBalaContinuity.cardBackground,'rgba(0, 0, 0, 0)','Tara Bala must remain on the same transparent layer.');
  const holidayOriginalDate = await page.$eval('#calDate', el => el.value);
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-08');
  await page.waitForFunction(() =>
    document.querySelector('#calDate')?.value === '2026-11-08' &&
    Boolean(document.querySelector('#calEvents .cal-government-holiday')),
    { timeout: 120000 });
  const officialHolidaySmoke = await page.$eval('#calEvents', section => ({
    governmentTags:[...section.querySelectorAll('.cal-government-holiday')].map(el=>el.textContent.trim()),
    allTags:[...section.querySelectorAll('.cal-tags span')].map(el=>el.textContent.trim()),
    sourceText:section.querySelector('.cal-holiday-source a')?.textContent.trim()||'',
    noteText:section.querySelector('.cal-note')?.textContent.trim()||'',
    sourceHref:section.querySelector('.cal-holiday-source a')?.getAttribute('href')||''
  }));
  assert.ok(officialHolidaySmoke.governmentTags.some(text=>/Deepavali.*Government holiday/i.test(text)||/தீபாவளி.*அரசு விடுமுறை/.test(text)),
    'The 8 November 2026 Deepavali date must be explicitly marked as a Government Holiday.');
  assert.equal(officialHolidaySmoke.allTags.some(text=>/^(Sunday|ஞாயிறு)$/.test(text)),false,
    'Sunday must not be added as a separate holiday tag.');
  assert.equal(officialHolidaySmoke.sourceText.match(/^(Holiday source|விடுமுறை ஆதாரம்)$/)?.[0],officialHolidaySmoke.sourceText,
    'Keep only the original Holiday source link text.');
  assert.equal(officialHolidaySmoke.noteText,'','Remove the explanatory vrats / holiday note entirely.');
  assert.match(officialHolidaySmoke.sourceHref,/stationeryprinting\.tn\.gov\.in\/extraordinary\/2025\/721_Ex_II_1_2025\.pdf/,
    'Keep the existing Tamil Nadu Gazette holiday source URL unchanged.');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-09');
  await page.waitForFunction(() =>
    document.querySelector('#calDate')?.value === '2026-11-09' &&
    [...document.querySelectorAll('#calEvents .cal-government-holiday')].some(el=>
      /Additional local holiday after Deepavali|தீபாவளிக்கு அடுத்த நாள்/.test(el.textContent||'')),
    { timeout: 120000 });
  const additionalLocalHoliday = await page.$eval('#calEvents .cal-government-holiday', el => el.textContent.trim());
  assert.ok(/Additional local holiday after Deepavali.*Government local holiday/i.test(additionalLocalHoliday) ||
    /தீபாவளிக்கு அடுத்த நாள்.*அரசு உள்ளூர் விடுமுறை/.test(additionalLocalHoliday),
    'The 9 November 2026 all-state local holiday under G.O.(1D) No.547 must be shown distinctly.');
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, holidayOriginalDate);
  await page.waitForFunction(date =>
    document.querySelector('#calDate')?.value===date &&
    document.querySelector('#calChandrashtamaResult')?.dataset.resolved==='true',
    { timeout: 120000 }, holidayOriginalDate);

  const chandrashtamaSmoke = await page.$eval('#calChandrashtamaSection', section => {
    const root = section.querySelector('#calChandrashtamaPeriods');
    const status = section.querySelector('#calChandrashtamaResult');
    return ({
    statusText: status?.textContent?.trim() || '',
    result: status?.dataset.result || '',
    statusColor: status ? getComputedStyle(status).color : '',
    statusFillColor: status ? getComputedStyle(status).webkitTextFillColor : '',
    referenceColor: getComputedStyle(section.querySelector('.cal-chandrashtama > p')).color,
    referenceFillColor: getComputedStyle(section.querySelector('.cal-chandrashtama > p')).webkitTextFillColor,
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
      isUpcoming: window.classList.contains('is-upcoming'),
      periodType: window.dataset.periodType || '',
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
  const todayWindow = chandrashtamaSmoke.windows[0] || null;
  if (todayWindow?.active) {
    assert.equal(todayWindow.selectedDateMatch, false,
      'For today, an active Chandrashtama interval is the selected-date result, not a future fallback.');
    assert.equal(todayWindow.periodType, 'selected',
      'An active Chandrashtama interval must be marked as the selected period.');
    assert.equal(chandrashtamaSmoke.result, 'present',
      'A Chandrashtama window active now must produce the direct Chandrashtama: Yes result.');
    assert.equal(chandrashtamaSmoke.statusColor, 'rgb(180, 35, 24)',
      'Chandrashtama: Yes must use the green-theme red accent.');
    assert.equal(chandrashtamaSmoke.statusFillColor, 'rgb(180, 35, 24)',
      'Chandrashtama: Yes WebKit text fill must match the red accent.');
  } else {
    assert.equal(chandrashtamaSmoke.result, 'absent',
      'When no Chandrashtama is active now, preserve the direct Chandrashtama: No result.');
    assert.equal(chandrashtamaSmoke.statusColor, 'rgb(40, 115, 77)',
      'Chandrashtama: No must use the green-theme success color.');
    assert.equal(chandrashtamaSmoke.statusFillColor, 'rgb(40, 115, 77)',
      'Chandrashtama: No WebKit text fill must match the green success color.');
    if (todayWindow) {
      assert.equal(todayWindow.isUpcoming, true,
        'When today has no active Chandrashtama, only the nearest upcoming interval may be shown.');
      assert.equal(todayWindow.periodType, 'upcoming',
        'A future interval shown while today is clear must be marked upcoming.');
      assert.equal(todayWindow.active, false,
        'A future interval must not be styled as active.');
    } else {
      assert.equal(chandrashtamaSmoke.body, '',
        'When no Chandrashtama exists in the calculation horizon, show no extra notification or empty-period message.');
    }
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
  assert.equal(pastDateStatus.color, 'rgb(180, 35, 24)', 'Historical Chandrashtama Yes must be red.');
  assert.equal(pastDateStatus.fillColor, 'rgb(180, 35, 24)', 'Historical Chandrashtama Yes must also render red in WebKit.');
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
      mainBackground: getComputedStyle(main).backgroundColor,
      mainPadding: getComputedStyle(main).paddingTop,
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
  assert.equal(oneLayer.mainBorder, '0px', 'Chandrashtama must have no outer box border.');
  assert.equal(oneLayer.mainBackground, 'rgba(0, 0, 0, 0)', 'Chandrashtama must have no filled layer.');
  assert.equal(oneLayer.mainPadding, '0px', 'Chandrashtama must not reserve card padding.');
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
    fillColor: getComputedStyle(el).webkitTextFillColor,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
    color: getComputedStyle(el).color,
    referenceFontSize: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontSize,
    referenceFontWeight: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontWeight,
    referenceColor: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).color,
    referenceFillColor: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).webkitTextFillColor
  }));
  assert.equal(futureDateStatus.result, 'present', 'A future date in Chandrashtama must show Yes.');
  assert.equal(futureDateStatus.fontSize, '16px', 'Chandrashtama Yes must be the prominent result tier.');
  assert.equal(futureDateStatus.fontWeight, '800', 'Chandrashtama Yes must use the prominent result weight.');
  assert.equal(futureDateStatus.color, 'rgb(180, 35, 24)', 'Future Chandrashtama Yes must use the green-theme red accent.');
  assert.equal(futureDateStatus.fillColor, 'rgb(180, 35, 24)', 'Future Chandrashtama Yes must also render with the same WebKit color.');
  assert.equal(await page.$eval('#calChandrashtamaPeriods', root => Boolean(root.querySelector('.cal-chandra-upcoming-heading'))), false,
    'Do not show the next-Chandrashtama heading when a future selected date is already within Chandrashtama.');

  // When the selected date has no Chandrashtama, keep the status as No and show
  // only the nearest later transit for the selected Janma Rasi / Nakshatra / Pada.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-19');
  await page.waitForFunction(() => {
    const status = document.querySelector('#calStatus')?.textContent || '';
    const root = document.querySelector('#calChandrashtamaPeriods');
    const result = document.querySelector('#calChandrashtamaResult');
    const windows = [...(root?.querySelectorAll('.cal-chandra-window') || [])];
    return status.includes('2026-11-19') && result?.dataset.resolved === 'true' &&
      result.dataset.result === 'absent' && windows.length === 1 &&
      windows[0].classList.contains('is-upcoming') &&
      windows[0].dataset.periodType === 'upcoming' &&
      windows[0].dataset.startDate > '2026-11-19';
  }, { timeout: 120000 });
  const upcomingHeading = await page.$eval('#calChandrashtamaPeriods .cal-chandra-upcoming-heading', el => ({
    text: el.textContent.trim(),
    language: document.documentElement.lang,
    janmaRasi: document.querySelector('#calRasi')?.selectedOptions[0]?.textContent?.trim() || '',
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
    color: getComputedStyle(el).color,
    referenceFontSize: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontSize,
    referenceFontWeight: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontWeight,
    referenceColor: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).color
  }));
  const expectedUpcomingHeading = upcomingHeading.language === 'ta' ? 'அடுத்த சந்திராஷ்டமம்' : 'Next Chandrashtama';
  assert.equal(upcomingHeading.text, expectedUpcomingHeading, 'The upcoming heading must use concise wording without repeating the selected Rasi.');
  assert.equal(upcomingHeading.fontSize, '13px', 'The upcoming heading must use the supporting-label size.');
  assert.equal(upcomingHeading.fontWeight, '750', 'The upcoming heading must be emphasized above ordinary supporting text.');
  assert.equal(upcomingHeading.color, 'rgb(44, 112, 77)', 'The upcoming heading must use the green theme accent.');
  const rasiLabel = await page.$eval('#calChandrashtamaSection .cal-chandrashtama > p:nth-of-type(2)', el => el.textContent.trim());
  assert.match(rasiLabel, /சந்திராஷ்டம ராசி|Chandrashtama Rasi/);
  assert.doesNotMatch(rasiLabel, /எட்டாம் ராசி|Eighth Rasi/);
  const upcomingWindow = await page.$eval('#calChandrashtamaPeriods .cal-chandra-window', el => ({
    startDate: el.dataset.startDate,
    endDate: el.dataset.endDate,
    periodType: el.dataset.periodType,
    padaRows: [...el.querySelectorAll('.cal-chandra-pada-row')].map(row => Number(row.dataset.birthPada))
  }));
  assert.equal(upcomingWindow.periodType, 'upcoming');
  assert.ok(upcomingWindow.startDate > '2026-11-19', 'The future transit must begin after the date with no Chandrashtama.');
  assert.equal(upcomingWindow.padaRows.length, 4, 'All valid birth Padas are shown when the Pada selector is All Padas.');
  const noPeriodStatus = await page.$eval('#calChandrashtamaResult', el => ({
    result: el.dataset.result,
    color: getComputedStyle(el).color,
    fillColor: getComputedStyle(el).webkitTextFillColor,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
    referenceFontSize: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontSize,
    referenceFontWeight: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).fontWeight,
    referenceColor: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).color,
    referenceFillColor: getComputedStyle(el.closest('.cal-chandrashtama')?.querySelector(':scope > p')).webkitTextFillColor
  }));
  assert.equal(noPeriodStatus.result, 'absent', 'An upcoming period must not change the selected-date Chandrashtama status.');
  assert.equal(noPeriodStatus.fontSize, '16px', 'Chandrashtama No must occupy the same prominent result tier as Yes.');
  assert.equal(noPeriodStatus.fontWeight, '800', 'Chandrashtama No must use the prominent result weight.');
  assert.equal(noPeriodStatus.color, 'rgb(40, 115, 77)', 'Chandrashtama No must use the affirmative green status color.');
  assert.equal(noPeriodStatus.fillColor, 'rgb(40, 115, 77)', 'Chandrashtama No WebKit text fill must match its green status color.');

  // Return to the historical transit date for the exact Pada projection checks.
  await page.$eval('#calDate', (el, date) => {
    el.value = date;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-11-10');
  await page.waitForFunction(() => document.querySelector('#calChandrashtamaPeriods .cal-chandra-window.is-selected-date'), { timeout: 120000 });
  const historicalSelectedWindow = await page.$eval('#calChandrashtamaPeriods', root => ({
    count: root.querySelectorAll('.cal-chandra-window').length,
    periodType: root.querySelector('.cal-chandra-window')?.dataset.periodType || ''
  }));
  assert.equal(historicalSelectedWindow.count, 1,
    'When the selected date already has Chandrashtama, do not append a future transit.');
  assert.equal(historicalSelectedWindow.periodType, 'selected');
  assert.equal(await page.$eval('#calChandrashtamaPeriods', root => Boolean(root.querySelector('.cal-chandra-upcoming-heading'))), false,
    'Do not show the next-Chandrashtama heading when the selected date already has Chandrashtama.');
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
      getComputedStyle(status).color === 'rgb(180, 35, 24)' &&
      getComputedStyle(status).webkitTextFillColor === 'rgb(180, 35, 24)';
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
      dailyContentAfterObservances: document.querySelector('#calEvents')?.nextElementSibling?.id === 'calDaily',
      lagnaBeforeChandrashtama: el.nextElementSibling?.id === 'calChandrashtamaSection',
      chandrashtamaSectionInsideDateDetails: Boolean(document.querySelector('#calChandrashtamaSection')?.parentElement === dateDetails)
    };
  });
  assert.equal(resultPlacement.insideDateDetails, true, 'The three result sections must remain inside Date Details.');
  assert.equal(resultPlacement.dayFlagsSeparated, true, 'Kari/Thaniya flags must use their own card.');
  assert.equal(resultPlacement.shoolamSeparate, true, 'Travel Shoolam must be separate from the day flags.');
  assert.equal(resultPlacement.lagnaBeforeChandrashtama, true, 'Chandrashtama must appear immediately below the Rasi-Mana Lagna balance section.');
  assert.equal(resultPlacement.chandrashtamaSectionInsideDateDetails, true, 'Chandrashtama must remain inside Date Details.');
  assert.equal(resultPlacement.dailyContentAfterObservances, true, 'Daily Hora and transit content must remain below Tara Bala and observances.');

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
    const thyajyam = grid?.querySelector('.cal-thyajyam-card');
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
      thyajyamBorderLeftColor: getComputedStyle(thyajyam).borderLeftColor,
      thyajyamBorderTopWidth: getComputedStyle(thyajyam).borderTopWidth,
      thyajyamBorderTopColor: getComputedStyle(thyajyam).borderTopColor,
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
  assert.notEqual(requestedLayout.thyajyamBorderLeftColor, 'rgb(182, 91, 80)', 'The old red left stripe on the Nakshatra Thyajyam card must be removed; the neutral card outline may remain.');
  assert.equal(requestedLayout.thyajyamBorderTopWidth, '2px', 'The intentional red top accent on the Nakshatra Thyajyam card must remain.');
  assert.equal(requestedLayout.thyajyamBorderTopColor, 'rgb(182, 91, 80)', 'The intentional red top accent must retain its theme color.');
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
  // Verify the integrated Daily Panchang/Hora/transit typography on the real mobile DOM.
  await page.waitForFunction(() => {
    const items = document.querySelectorAll('#calDateDetailsExtra .cal-panchang-detail-grid .cal-panchang-detail-item');
    const hora = document.querySelectorAll('#calDaily .hora-time.smv-calendar-neutral-time');
    return items.length === 14 && hora.length >= 20 &&
      document.querySelector('#calDateDetailsExtra .cal-panchang-detail-grid .cal-name-yoga-label') &&
      document.querySelector('#calDateDetailsExtra .cal-panchang-detail-grid .panchang-time-result.smv-calendar-bright-red-time') &&
      document.querySelector('#calDaily .transit-position-table .transit-table-degree.smv-calendar-degree-normal');
  }, { timeout: 90000 });
  const tamilYogaLabel = await page.$eval('#calDateDetailsExtra .cal-panchang-detail-grid .cal-name-yoga-label', el => el.textContent.trim());
  assert.equal(tamilYogaLabel, 'நாம யோகம்', 'Tamil Calendar must display the complete localized label “நாம யோகம்”.');
  await page.click('#calEnglish');
  await page.waitForFunction(() => document.documentElement.lang === 'en' &&
    document.querySelector('#calDateDetailsExtra .cal-panchang-detail-grid .cal-name-yoga-label')?.textContent.trim() === 'Namah Yoga', { timeout: 15000 });
  await page.click('#calTamil');
  await page.waitForFunction(() => document.documentElement.lang === 'ta' &&
    document.querySelector('#calDateDetailsExtra .cal-panchang-detail-grid .cal-name-yoga-label')?.textContent.trim() === 'நாம யோகம்', { timeout: 15000 });
  const dailyTypography = await page.evaluate(() => {
    const grid = document.querySelector('#calDateDetailsExtra .cal-panchang-detail-grid');
    const items = [...(grid?.querySelectorAll('.cal-panchang-detail-item') || [])];
    const primaryResults = items.filter(item => item.classList.contains('is-primary')).map(item => item.querySelector('strong'));
    const yoga = grid?.querySelector('.cal-name-yoga-label');
    const redTimes = [...(grid?.querySelectorAll('.panchang-time-result.smv-calendar-bright-red-time') || [])];
    const labelFor = pattern => items.find(item => pattern.test(item.querySelector('small')?.textContent?.trim() || ''))?.querySelector('small');
    const panchangRangeFor = pattern => {
      const item=items.find(item=>pattern.test(item.querySelector('small')?.textContent?.trim()||''));
      return item?.querySelector('.smv-calendar-event-range')?.textContent.replace(/\s+/g,' ').trim()||'';
    };
    const namahYogaItem=items.find(item=>/^(?:Namah Yoga|நாம யோகம்)$/i.test(item.querySelector('small')?.textContent?.trim()||''));
    const namahYogaValue=namahYogaItem?.querySelector('strong')?.textContent.replace(/\s+/g,' ').trim()||'';
    const varaLabel = labelFor(/^(?:Vara|வாரம்)$/);
    const tithiLabel = labelFor(/^(?:Tithi|திதி)$/);
    const normalHora = [...document.querySelectorAll('#calDaily .hora-time.smv-calendar-neutral-time:not(.smv-hora-current-green):not(.smv-hora-bright-green):not(.smv-hora-current-red):not(.smv-hora-bright-red)')];
    const degree = document.querySelector('#calDaily .transit-position-table .transit-table-degree.smv-calendar-degree-normal');
    const eventRange = grid?.querySelector('.smv-calendar-event-range');
    const eventTime = eventRange?.querySelector('.smv-calendar-event-time');
    const eventDate = eventRange?.querySelector('.smv-calendar-event-date');
    const eventSeparator = eventRange?.querySelector('.smv-calendar-range-separator');
    const nallaNeramItem=items.find(item=>/^(?:Nalla Neram|நல்ல நேரம்)$/i.test(item.querySelector('small')?.textContent?.trim()||''));
    const nallaNeramTime=nallaNeramItem?.querySelector('.nalla-neram-time');
    const style = element => element ? getComputedStyle(element) : null;
    return {
      panchangItemCount: items.length,
      primaryResultWeights: primaryResults.map(element => style(element)?.fontWeight || ''),
      yogaLabel: yoga?.textContent?.trim() || '',
      yogaLabelColor: style(yoga)?.color || '',
      yogaLabelWeight: style(yoga)?.fontWeight || '',
      yogaLabelFontSize: style(yoga)?.fontSize || '',
      varaLabelFontSize: style(varaLabel)?.fontSize || '',
      tithiLabelFontSize: style(tithiLabel)?.fontSize || '',
      panchangRanges: {
        tithi:panchangRangeFor(/^(?:Tithi|திதி)$/),
        nakshatra:panchangRangeFor(/^(?:Nakshatra|நட்சத்திரம்)$/),
        namahYoga:panchangRangeFor(/^(?:Namah Yoga|நாம யோகம்)$/),
        karana:panchangRangeFor(/^(?:Karana|கரணம்)$/)
      },
      panchangRangeWhiteSpace:style(eventRange)?.whiteSpace||'',
      panchangRangeRectCount:eventRange?.getClientRects().length||0,
      panchangRangeSeparator:eventSeparator?.textContent||'',
      panchangRangeTimeColor:style(eventTime)?.color||'',
      panchangRangeTimeWeight:style(eventTime)?.fontWeight||'',
      panchangRangeDateColor:style(eventDate)?.color||'',
      panchangRangeDateWeight:style(eventDate)?.fontWeight||'',
      panchangRangeSeparatorWeight:style(eventSeparator)?.fontWeight||'',
      nallaNeramTimeColor:style(nallaNeramTime)?.color||'',
      nallaNeramTimeWeight:style(nallaNeramTime)?.fontWeight||'',
      namahYogaValue,
      redTimeColors: redTimes.map(element => style(element)?.color || ''),
      normalHoraCount: normalHora.length,
      normalHoraColor: style(normalHora[0])?.color || '',
      normalHoraWeight: style(normalHora[0])?.fontWeight || '',
      degreeColor: style(degree)?.color || '',
      degreeWeight: style(degree)?.fontWeight || ''
    };
  });
  assert.equal(dailyTypography.panchangItemCount, 14, 'All fourteen non-date Panchang values must be present.');
  assert.equal(dailyTypography.primaryResultWeights.length, 7, 'Sun Sign through Karana must all be present in the main Panchang results.');
  assert.ok(dailyTypography.primaryResultWeights.every(weight => weight === '700'), 'Sun Sign through Karana results must be bold.');
  assert.equal(dailyTypography.yogaLabel, 'நாம யோகம்', 'The Tamil Calendar yoga label must display the complete wording நாம யோகம்.');
  assert.equal(dailyTypography.yogaLabelColor, 'rgb(66, 105, 87)', 'Namah Yoga must use the green theme label color.');
  assert.equal(dailyTypography.yogaLabelWeight, '700', 'Namah Yoga must be bold.');
  assert.equal(dailyTypography.yogaLabelFontSize, dailyTypography.varaLabelFontSize, 'Namah Yoga must use the same font size as the Vara label.');
  assert.equal(dailyTypography.yogaLabelFontSize, dailyTypography.tithiLabelFontSize, 'Namah Yoga must use the same font size as the Tithi label.');
  for (const [kind, range] of Object.entries(dailyTypography.panchangRanges)) {
    assert.match(range, /^\d{2}:\d{2}\(\d{2}\/\d{2}\)-\d{2}:\d{2}\(\d{2}\/\d{2}\)$/, kind+' must use HH:MM(DD/MM)-HH:MM(DD/MM) format without spaces.');
  }
  assert.equal(dailyTypography.panchangRangeWhiteSpace, 'nowrap', 'Each Panchang time range must remain on one line.');
  assert.equal(dailyTypography.panchangRangeRectCount, 1, 'Each Panchang time range must occupy a single line box.');
  assert.equal(dailyTypography.panchangRangeSeparator, '-', 'The two time boundaries must be joined by a hyphen without spaces.');
  assert.equal(dailyTypography.panchangRangeTimeColor, 'rgb(75, 0, 130)', 'Tithi, Nakshatra, Namah Yoga and Karana time values must use dark purple.');
  assert.equal(dailyTypography.panchangRangeTimeWeight, '700', 'Panchang time values must be bold.');
  assert.equal(dailyTypography.panchangRangeDateColor, 'rgb(82, 100, 90)', 'The date text remains neutral rather than green.');
  assert.equal(dailyTypography.panchangRangeDateWeight, '400', 'The date text is not bold.');
  assert.equal(dailyTypography.panchangRangeSeparatorWeight, '400', 'The hyphen is not bold.');
  assert.equal(dailyTypography.nallaNeramTimeColor, 'rgb(0, 200, 83)', 'Only Nalla Neram time values must use bright green.');
  assert.equal(dailyTypography.nallaNeramTimeWeight, '700', 'Nalla Neram time values must be bold.');
  assert.doesNotMatch(dailyTypography.namahYogaValue, /impact|obstruction|தாக்கம்|இடையூறு|தடை/i, 'Namah Yoga must not display explanatory impact/obstruction wording.');
  assert.equal(dailyTypography.redTimeColors.length, 2, 'Rahu Kalam and Yamagandam must both be present.');
  assert.ok(dailyTypography.redTimeColors.every(color => color === 'rgb(180, 35, 24)'), 'Rahu Kalam and Yamagandam must use the restrained red accent.');
  assert.equal(await page.$$eval('#calDaily .hora-time.smv-calendar-neutral-time', nodes => nodes.length), 24, 'All 24 day/night Hora time cells must carry the Calendar typography marker.');
  assert.ok(dailyTypography.normalHoraCount >= 12, 'At least twelve ordinary Hora cells must remain in the normal black presentation while preserving weekday/current special colors.');
  assert.equal(dailyTypography.normalHoraColor, 'rgb(0, 0, 0)', 'Normal Hora time values must be black.');
  assert.equal(dailyTypography.normalHoraWeight, '400', 'Normal Hora time values must not be bold.');
  assert.equal(dailyTypography.degreeColor, 'rgb(0, 0, 0)', 'Transit Degree values must be black.');
  assert.equal(dailyTypography.degreeWeight, '400', 'Transit Degree values must use normal weight.');
  process.stdout.write('SMV_CALENDAR_DAILY_TYPOGRAPHY ' + JSON.stringify(dailyTypography) + '\\n');

  await page.$eval('#calDateDetailsExtra .cal-panchang-detail-grid', el => el.scrollIntoView({ block: 'start' }));
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
  const selectedDateTimeValue = await page.$eval('#calTime', el => el.value);
  assert.equal(selectedDateTimeValue, selectedDateSunriseMatch[1]+':'+selectedDateSunriseMatch[2],
    'The Time control must default to the selected date\'s calculated local sunrise.');
  const selectedDateLagnaTime = await page.$eval('#calMuhurtaLagna .cal-muhurta-lagna-item:nth-child(2) span', el => el.textContent.trim());
  assert.ok(selectedDateLagnaTime.includes(selectedDateTimeValue),
    'The separate selected-time Lagna must use the selected sunrise/default time, not the old fixed noon time.');
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

  // Regression: Calendar transit chart must retain all nine grahas around 12 August 2026.
  // Tamil uses வ / அ markers; English retains R / C. The chart and status table must agree.
  const transitOriginalLanguage = await page.evaluate(() => document.documentElement.lang || 'en');
  async function ensureTransitLanguage(language) {
    const current = await page.evaluate(() => document.documentElement.lang || 'en');
    if (current === language) return;
    await page.click(language === 'ta' ? '#calTamil' : '#calEnglish');
    await page.waitForFunction(value => document.documentElement.lang === value, { timeout: 20000 }, language);
  }
  async function inspectTransitDate(date, language) {
    await page.$eval('#calDate', (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, date);
    await page.waitForFunction(value => {
      const status = document.querySelector('#calStatus')?.textContent || '';
      const shell = document.querySelector('#smvDailyCalendar');
      const rows = document.querySelectorAll('#calDaily .transit-position-table tbody tr').length;
      return status.includes(value) && shell && !shell.hasAttribute('aria-busy') && rows >= 10;
    }, { timeout: 90000 }, date);
    return page.evaluate(language => {
      const chart = document.querySelector('#calDaily .transit-chart');
      const cells = [...(chart?.querySelectorAll('.south-rasi-cell') || [])];
      const planetElements = [...(chart?.querySelectorAll('.planet-short') || [])];
      const rows = [...(document.querySelectorAll('#calDaily .transit-position-table tbody tr') || [])].map(row => ({
        name: row.querySelector('td:first-child')?.textContent.trim() || '',
        cells: row.querySelectorAll('td').length
      }));
      const headers = [...(document.querySelectorAll('#calDaily .transit-position-table thead th') || [])].map(cell => cell.textContent.trim());
      const maxStack = Math.max(0, ...cells.map(cell => cell.querySelectorAll('.planet-line').length));
      const normalPlanetGlyphs = [...(chart?.querySelectorAll('.transit-cell-planets:not(.transit-cell-planets-compact) .planet-glyph') || [])];
      const compactPlanetGlyphs = [...(chart?.querySelectorAll('.transit-cell-planets.transit-cell-planets-compact .planet-glyph') || [])];
      const emptyCellPlaceholderCount = chart?.querySelectorAll('.transit-cell-planets .small').length || 0;
      const houseNumberFontMismatches = cells.reduce((mismatches, cell) => {
        const number = cell.querySelector('.dynamic-rasi-number');
        if (!number || !number.textContent.trim()) return mismatches;
        const cellGlyph = cell.querySelector('.planet-glyph') || (cell.classList.contains('south-rasi-cell-compact') ? compactPlanetGlyphs[0] : normalPlanetGlyphs[0]);
        if (!cellGlyph) return mismatches;
        return mismatches + (Math.abs(Number.parseFloat(getComputedStyle(number).fontSize)-Number.parseFloat(getComputedStyle(cellGlyph).fontSize))>.1 ? 1 : 0);
      },0);
      const ordinaryPlanetCells = cells.filter(cell => {
        const count = Number(cell.dataset.transitPlanetCount || 0);
        return count > 0 && count <= 3;
      });
      const planetCountClassMismatches = cells.filter(cell => {
        const count = Number(cell.dataset.transitPlanetCount || 0);
        return cell.classList.contains('south-rasi-cell-compact') !== (count > 3);
      }).length;
      const ordinaryCellGroupsCentered = ordinaryPlanetCells.every(cell => {
        const cellRect = cell.getBoundingClientRect();
        const children = [...cell.children].filter(child => ['dynamic-rasi-number','lagna','transit-cell-planets'].some(cls => child.classList.contains(cls)));
        if (!children.length) return false;
        const top = Math.min(...children.map(child => child.getBoundingClientRect().top));
        const bottom = Math.max(...children.map(child => child.getBoundingClientRect().bottom));
        return Math.abs((top + bottom) / 2 - (cellRect.top + cellRect.bottom) / 2) <= 2;
      });
      const markerFontSizeMismatches = [...(chart?.querySelectorAll('.planet-glyph') || [])].reduce((count, glyph) => {
        const size = Number.parseFloat(getComputedStyle(glyph).fontSize);
        return count + [...glyph.querySelectorAll('.rasi-status-marker,.transit-degree')].filter(child => Math.abs(Number.parseFloat(getComputedStyle(child).fontSize)-size)>.1).length;
      },0);
      const clippedStacks = cells.filter(cell => {
        const lines = [...cell.querySelectorAll('.transit-cell-planets .planet-line')];
        if (!lines.length) return false;
        const cellRect = cell.getBoundingClientRect();
        return lines.some(line => {
          const rect = line.getBoundingClientRect();
          return rect.height <= 0 || rect.top < cellRect.top - 1 || rect.bottom > cellRect.bottom + 1;
        });
      }).length;
      const planetText = planetElements.map(el => el.textContent.trim());
      const markerText = planetText.concat(rows.map(row => row.name)).join(' | ');
      const horaSection = document.querySelector('#calDaily .hora-card');
      const horaHeading = horaSection?.querySelector(':scope > h3');
      const horaTables = [...(horaSection?.querySelectorAll('.hora-table-wrap') || [])];
      const positionsSection = document.querySelector('#calDaily .transit-table-card');
      const positionsHeading = positionsSection?.querySelector(':scope > h3');
      const positionsTableWrap = positionsSection?.querySelector('.adv-scroll');
      const horaGridCell = horaTables[0]?.querySelector('tbody td');
      const positionsGridCell = positionsSection?.querySelector('tbody td');
      const combustionInChart = chart?.querySelectorAll('.planet-short .status-c').length || 0;
      const combustionInNames = rows.filter(row => row.name.includes(language === 'ta' ? '(அ)' : '(C)')).length;
      const retrogradeInChart = chart?.querySelectorAll('.planet-short .status-r').length || 0;
      const retrogradeInNames = rows.filter(row => row.name.includes(language === 'ta' ? '(வ)' : '(R)')).length;
      const separatorLines = [...(chart?.querySelectorAll('.planet-line') || [])].filter(line => {
        const style = getComputedStyle(line);
        return style.borderBottomStyle !== 'none' || style.borderBottomWidth !== '0px';
      }).length;
      const chartCenter = chart?.querySelector('.south-chart-center');
      const chartHeading = document.querySelector('#calDaily .transit-card>h3');
      return {
        chartCenterText: chartCenter?.textContent.trim() || '',
        chartCenterColor: chartCenter ? getComputedStyle(chartCenter).color : '',
        planetShortColor: planetElements[0] ? getComputedStyle(planetElements[0]).color : '',
        chartHeadingText: chartHeading?.textContent.trim() || '',
        chartPlanetCount: planetElements.length,
        visiblePlanetCount: planetElements.filter(el => {
          const cell = el.closest('.south-rasi-cell');
          const line = el.closest('.planet-line');
          const rect = el.getBoundingClientRect();
          const cellRect = cell?.getBoundingClientRect();
          const style = getComputedStyle(el);
          return Boolean(cellRect && line && rect.width > 0 && rect.height > 0 &&
            style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.top >= cellRect.top - 1 && rect.bottom <= cellRect.bottom + 1 &&
            rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1);
        }).length,
        chartHasJupiter: (() => {
          const index = planetText.findIndex(value => value.startsWith(language === 'ta' ? 'கு' : 'Ju'));
          if (index < 0) return false;
          const el = planetElements[index];
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const chartRect = chart.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' &&
            style.display !== 'none' && rect.top >= chartRect.top - 1 &&
            rect.bottom <= chartRect.bottom + 1;
        })(),
        tableHasJupiter: rows.some(row => row.name.startsWith(language === 'ta' ? 'குரு' : 'Jupiter')),
        tableHasFullJupiterName: rows.some(row => row.name.startsWith(language === 'ta' ? 'குரு' : 'Jupiter')),
        tablePlanetRows: rows.length - 1,
        tableHeaders: headers,
        tableCellCounts: rows.map(row => row.cells),
        squareChart: Boolean(chart && Math.abs(chart.getBoundingClientRect().width-chart.getBoundingClientRect().height)<=2),
        chartWidth: chart?.getBoundingClientRect().width || 0,
        horaHeadingText: horaHeading?.textContent.trim() || '',
        horaHasCardLayer: Boolean(horaSection?.classList.contains('card')),
        horaCardBorderWidth: horaSection ? getComputedStyle(horaSection).borderTopWidth : '0px',
        horaTableBorderWidths: horaTables.map(wrap => getComputedStyle(wrap).borderTopWidth),
        horaTableBorderColor: horaTables[0] ? getComputedStyle(horaTables[0]).borderTopColor : '',
        horaGridLineWidth: horaGridCell ? getComputedStyle(horaGridCell).borderRightWidth : '0px',
        horaGridLineColor: horaGridCell ? getComputedStyle(horaGridCell).borderRightColor : '',
        transitHasCardLayer: Boolean(document.querySelector('#calDaily .transit-card')?.classList.contains('card')),
        positionsHeadingText: positionsHeading?.textContent.trim() || '',
        positionsHasLayer: Boolean(positionsSection?.classList.contains('card')),
        positionsCardBorderWidth: positionsSection ? getComputedStyle(positionsSection).borderTopWidth : '0px',
        positionsTableBorderWidth: positionsTableWrap ? getComputedStyle(positionsTableWrap).borderTopWidth : '0px',
        positionsTableBorderColor: positionsTableWrap ? getComputedStyle(positionsTableWrap).borderTopColor : '',
        positionsGridLineWidth: positionsGridCell ? getComputedStyle(positionsGridCell).borderRightWidth : '0px',
        positionsGridLineColor: positionsGridCell ? getComputedStyle(positionsGridCell).borderRightColor : '',
        denseClass: Boolean(chart?.classList.contains('transit-chart-dense') || chart?.classList.contains('transit-chart-dense-4plus')),
        maxStack,
        normalPlanetCellCount: chart?.querySelectorAll('.transit-cell-planets:not(.transit-cell-planets-compact)').length || 0,
        compactPlanetCellCount: chart?.querySelectorAll('.transit-cell-planets.transit-cell-planets-compact').length || 0,
        normalPlanetFontSize: normalPlanetGlyphs[0] ? Number.parseFloat(getComputedStyle(normalPlanetGlyphs[0]).fontSize) : 0,
        compactPlanetFontSize: compactPlanetGlyphs[0] ? Number.parseFloat(getComputedStyle(compactPlanetGlyphs[0]).fontSize) : 0,
        ordinaryPlanetCellsCentered: ordinaryCellGroupsCentered,
        ordinaryPlanetCellCount: ordinaryPlanetCells.length,
        planetCountClassMismatches,
        markerFontSizeMismatches,
        emptyCellPlaceholderCount,
        houseNumberFontMismatches,
        clippedStacks,
        separatorLines,
        combustionInChart,
        combustionInNames,
        retrogradeInChart,
        retrogradeInNames,
        hasWrongLatinMarkersInTamil: language === 'ta' && (markerText.includes('(R)') || markerText.includes('(C)')),
        hasWrongTamilMarkersInEnglish: language === 'en' && (markerText.includes('(வ)') || markerText.includes('(அ)'))
      };
    }, language);
  }
  for (const language of ['ta', 'en']) {
    await ensureTransitLanguage(language);
    for (const date of ['2026-08-11', '2026-08-12', '2026-08-13']) {
      const transitState = await inspectTransitDate(date, language);
      assert.equal(transitState.chartPlanetCount, 9, language + ' ' + date + ': all nine grahas must be present in the Transit Chart: ' + JSON.stringify(transitState));
      assert.equal(transitState.visiblePlanetCount, 9, language + ' ' + date + ': all nine grahas must be visibly inside their Rasi cells, not only present in the DOM: ' + JSON.stringify(transitState));
      assert.equal(transitState.chartHasJupiter, true, language + ' ' + date + ': Jupiter must be visible in the Transit Chart: ' + JSON.stringify(transitState));
      assert.equal(transitState.chartCenterText, language === 'ta' ? 'கோச்சாரம்' : 'Transit', language + ' ' + date + ': only the chart center label must use the concise transit wording.');
      assert.equal(transitState.chartCenterColor, 'rgb(21, 86, 78)', language + ' ' + date + ': the chart center label must use Calendar theme green.');
      assert.equal(transitState.planetShortColor, 'rgb(21, 86, 78)', language + ' ' + date + ': short planet names inside the chart must use Calendar theme green.');
      assert.ok(transitState.chartHeadingText.endsWith('Transit Chart'), language + ' ' + date + ': the outer Transit Chart heading must remain unchanged.');
      assert.equal(transitState.tableHasJupiter, true, language + ' ' + date + ': Jupiter must be present in Transit Planetary Positions: ' + JSON.stringify(transitState));
      assert.equal(transitState.tableHasFullJupiterName, true, language + ' ' + date + ': Jupiter must use its full graha name: ' + JSON.stringify(transitState));
      assert.equal(transitState.tablePlanetRows, 9, language + ' ' + date + ': all nine grahas must be present in the positions table.');
      assert.deepEqual(transitState.tableHeaders, language === 'ta' ? ['கிரகங்கள்','ராசி','பாகை','நட்சத்திரம்','பாதம்'] : ['Planets','Rasi','Degree','Nakshatra','Pada'], language + ' ' + date + ': the positions table must have five columns and no Status.');
      assert.ok(transitState.tableCellCounts.every(count => count === 5), language + ' ' + date + ': every table row must have exactly five cells.');
      assert.equal(transitState.squareChart, true, language + ' ' + date + ': transit chart must retain its square proportions: ' + JSON.stringify(transitState));
      assert.ok(transitState.horaHeadingText.includes(language === 'ta' ? 'தினசரி ஹோரா' : 'Daily Hora'), language + ' ' + date + ': Daily Hora heading must remain visible without a box.');
      assert.equal(transitState.horaHasCardLayer, false, language + ' ' + date + ': Daily Hora outer wrapper must not be a card.');
      assert.equal(transitState.horaCardBorderWidth, '0px', language + ' ' + date + ': Daily Hora section wrapper must not have an outer border.');
      assert.equal(transitState.horaTableBorderWidths.length, 2, language + ' ' + date + ': Day and Night Hora must remain separate tables.');
      assert.ok(transitState.horaTableBorderWidths.every(width => width === '1px'), language + ' ' + date + ': only each Hora table must have a thin outer border.');
      assert.equal(transitState.horaTableBorderColor, 'rgb(220, 232, 223)', language + ' ' + date + ': Hora table outline must use the light theme green.');
      assert.equal(transitState.horaGridLineWidth, '1px', language + ' ' + date + ': Hora row/column lines must stay thin.');
      assert.equal(transitState.horaGridLineColor, 'rgb(228, 235, 231)', language + ' ' + date + ': Hora row/column lines must use the pale theme green.');
      assert.ok(transitState.positionsHeadingText.includes(language === 'ta' ? 'கோச்சார கிரக நிலைகள்' : 'Transit Planetary Positions'), language + ' ' + date + ': Transit positions heading must remain visible without a box.');
      assert.equal(transitState.positionsHasLayer, false, language + ' ' + date + ': Transit positions section wrapper must not be a card.');
      assert.equal(transitState.positionsCardBorderWidth, '0px', language + ' ' + date + ': Transit positions heading section must not have an outer border.');
      assert.equal(transitState.positionsTableBorderWidth, '1px', language + ' ' + date + ': only the positions table must have a thin outer border.');
      assert.equal(transitState.positionsTableBorderColor, 'rgb(220, 232, 223)', language + ' ' + date + ': positions table outline must use the light theme green.');
      assert.equal(transitState.positionsGridLineWidth, '1px', language + ' ' + date + ': positions table row/column lines must stay thin.');
      assert.equal(transitState.positionsGridLineColor, 'rgb(228, 235, 231)', language + ' ' + date + ': positions table row/column lines must use the pale theme green.');
      assert.equal(transitState.transitHasCardLayer, false, language + ' ' + date + ': Transit Chart itself must remain without an outer card.');
      assert.equal(transitState.clippedStacks, 0, language + ' ' + date + ': crowded Rasi cells must not clip planet rows: ' + JSON.stringify(transitState));
      assert.equal(transitState.separatorLines, 0, language + ' ' + date + ': no dotted line may appear below individual planet rows.');
      assert.equal(transitState.denseClass, transitState.maxStack >= 3, language + ' ' + date + ': dense chart sizing must be enabled exactly when a Rasi contains three or more planets.');
      assert.equal(transitState.combustionInNames, transitState.combustionInChart, language + ' ' + date + ': C / அ graha-name markers must match chart combustion markers.');
      assert.equal(transitState.retrogradeInNames, transitState.retrogradeInChart, language + ' ' + date + ': R / வ graha-name markers must match chart retrograde markers.');
      assert.equal(transitState.hasWrongLatinMarkersInTamil, false, language + ' ' + date + ': Tamil UI must not show (R) or (C).');
      assert.equal(transitState.hasWrongTamilMarkersInEnglish, false, language + ' ' + date + ': English UI must retain Latin markers.');
    }
  }
  // Recheck the dense August 12 transit on narrow phones. The four-graha
  // Rasi stack must fit inside its existing cell; chart dimensions stay square.
  for (const language of ['ta', 'en']) {
    await ensureTransitLanguage(language);
    for (const width of [390, 360, 320]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      const mobileState = await inspectTransitDate('2026-08-12', language);
      assert.equal(mobileState.chartPlanetCount, 9, language + ' ' + width + 'px: all nine planets must remain in the chart.');
      assert.equal(mobileState.visiblePlanetCount, 9, language + ' ' + width + 'px: every graha must remain fully visible inside its cell.');
      assert.ok(mobileState.maxStack >= 4, language + ' ' + width + 'px: the dense regression date must contain at least four grahas in one Rasi.');
      assert.ok(mobileState.normalPlanetCellCount > 0, language + ' ' + width + 'px: ordinary Rasi cells must keep their normal font sizing.');
      assert.ok(mobileState.compactPlanetCellCount > 0, language + ' ' + width + 'px: only the crowded Rasi cell must receive compact sizing.');
      assert.ok(mobileState.normalPlanetFontSize > mobileState.compactPlanetFontSize, language + ' ' + width + 'px: crowded-cell font size must be smaller than ordinary cells.');
      assert.ok(mobileState.normalPlanetFontSize >= 16, language + ' ' + width + 'px: one-to-three planet names, markers and degrees must remain readable at 16px or larger.');
      assert.equal(mobileState.planetCountClassMismatches, 0, language + ' ' + width + 'px: only cells with more than three planet names may be compacted.');
      assert.ok(mobileState.ordinaryPlanetCellCount > 0, language + ' ' + width + 'px: one-to-three item cells must be present for centring checks.');
      assert.equal(mobileState.ordinaryPlanetCellsCentered, true, language + ' ' + width + 'px: one-to-three item cells must be centred inside their boxes.');
      assert.equal(mobileState.markerFontSizeMismatches, 0, language + ' ' + width + 'px: (அ)/(வ)/(C)/(R) and degree must match the planet font size.');
      assert.equal(mobileState.emptyCellPlaceholderCount, 0, language + ' ' + width + 'px: empty Rasi cells must not show a dash.');
      assert.equal(mobileState.houseNumberFontMismatches, 0, language + ' ' + width + 'px: house numbers 2–12 must match the corresponding planet font size.');
      assert.equal(mobileState.clippedStacks, 0, language + ' ' + width + 'px: no planet line may be clipped by its Rasi cell.');
      assert.equal(mobileState.squareChart, true, language + ' ' + width + 'px: preserve the existing square chart dimensions.');
    }
  }
  for (const language of ['ta', 'en']) {
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await ensureTransitLanguage(language);
    const desktopState = await inspectTransitDate('2026-08-12', language);
    assert.ok(desktopState.normalPlanetFontSize > desktopState.compactPlanetFontSize, language + ' desktop: crowded cells alone must use smaller labels.');
    assert.ok(desktopState.normalPlanetFontSize >= 21, language + ' desktop: one-to-three planet names, markers and degrees must use the increased 21px size.');
    assert.equal(desktopState.planetCountClassMismatches, 0, language + ' desktop: only cells with more than three planet names may be compacted.');
    assert.equal(desktopState.ordinaryPlanetCellsCentered, true, language + ' desktop: one-to-three item cells must be centred.');
    assert.equal(desktopState.markerFontSizeMismatches, 0, language + ' desktop: markers and degrees must match the planet font size.');
    assert.equal(desktopState.emptyCellPlaceholderCount, 0, language + ' desktop: empty Rasi cells must not show a dash.');
    assert.equal(desktopState.houseNumberFontMismatches, 0, language + ' desktop: house numbers 2–12 must match the corresponding planet font size.');
  }
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await ensureTransitLanguage(transitOriginalLanguage);
  await page.$eval('#calDate', (el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, calendarDate);
  await page.waitForFunction(value => (document.querySelector('#calStatus')?.textContent || '').includes(value) &&
    !document.querySelector('#smvDailyCalendar')?.hasAttribute('aria-busy'), { timeout: 90000 }, calendarDate);
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
  const chandrashtamaState = await page.$eval('#calChandrashtamaSection', section => {
    const rasiSelect=document.querySelector('#calRasi');
    const options=[...(rasiSelect?.options||[])].map(option=>({index:Number(option.value),label:option.textContent.trim()}));
    const janmaRasiIndex=Number(rasiSelect?.value);
    const eighthRasiIndex=(janmaRasiIndex+7)%12;
    return {
      text:section.textContent||'',
      janmaRasi:options.find(option=>option.index===janmaRasiIndex)?.label||'',
      eighthRasi:options.find(option=>option.index===eighthRasiIndex)?.label||''
    };
  });
  assert.ok(/Chandrashtama: Yes|சந்திராஷ்டமம் : - உண்டு/.test(chandrashtamaState.text) || /Chandrashtama: No|சந்திராஷ்டமம் : இல்லை/.test(chandrashtamaState.text),
    'The separate Chandrashtama section must show only the direct Yes/No result.');
  assert.ok(/Your Janma Rasi|ஜன்ம ராசி/.test(chandrashtamaState.text) && chandrashtamaState.text.includes(chandrashtamaState.janmaRasi),
    'The separate Chandrashtama section must display the selected Janma Rasi.');
  assert.ok(/Chandrashtama Rasi|சந்திராஷ்டம ராசி/.test(chandrashtamaState.text) && chandrashtamaState.eighthRasi &&
    chandrashtamaState.text.includes(chandrashtamaState.eighthRasi),
    'The separate Chandrashtama section must display the correct eighth Rasi calculated from the selected Janma Rasi.');

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

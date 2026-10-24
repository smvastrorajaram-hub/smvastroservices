import { getSwe, C as SWE } from './offline/wasm-provider.mjs';
import { solarNoaa } from './offline/transit_panchang.browser.mjs';
import { offsetMinutesAt } from './offline/places/timezone.mjs';
import { signs, transitReading } from './calendar-data.mjs';
import { RASI_PALAN_PLANETS, RASI_PALAN_TITLES, signIndex, houseFromRasi, readingKey, selectReading } from './calendar-rasi-palan-rules.mjs';
import { periodReference } from './calendar/rasi-palan-periods.mjs?v=20261024-current-week-v2';

const calendarHost = document.getElementById('smvDailyCalendar');
if (calendarHost && calendarHost.parentElement && !document.getElementById('calRasiPalan')) {
  const root = document.createElement('section');
  root.id = 'calRasiPalan';
  root.className = 'cal-rasi-palan';
  root.setAttribute('aria-label', 'Daily, weekly, monthly and New Year Rasi Palan');
  // The forecasts belong after the complete Daily Calendar, never above it.
  calendarHost.insertAdjacentElement('afterend', root);

  const $ = selector => root.querySelector(selector);
  const enNames = Object.fromEntries(RASI_PALAN_PLANETS.map(p => [p.key, p.key]));
  const taNames = Object.fromEntries(RASI_PALAN_PLANETS.map(p => [p.key, p.ta]));
  const rasiLabels = signs;
  const annualLabels = {
    tamilNewYear: ['Tamil New Year Rasi Palan', 'தமிழ் வருடப் பிறப்பு ராசி பலன்கள்'],
    englishNewYear: ['English New Year Rasi Palan', 'ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்']
  };
  const defaultDate = () => {
    const cfg = getLocation();
    const offset = Number.isFinite(Number(cfg.offset)) ? Number(cfg.offset) : 330;
    return new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
  };
  const selectedRasiStorageKey = 'smv-calendar-rasi-palan-selected-rasi-v1';
  function readSelectedRasi() {
    try {
      const stored = localStorage.getItem(selectedRasiStorageKey);
      const value = stored === null ? NaN : Number(stored);
      if (Number.isInteger(value) && value >= 0 && value < signs.length) return value;
    } catch (_) {}
    try {
      const settings = JSON.parse(localStorage.getItem('smv-calendar-settings') || '{}');
      const value = Number(settings.rasi);
      if (Number.isInteger(value) && value >= 0 && value < signs.length) return value;
    } catch (_) {}
    return 0;
  }
  let state = {
    section: 'period',
    period: 'daily',
    date: defaultDate(),
    year: Number(defaultDate().slice(0, 4)),
    rasiIndex: readSelectedRasi(),
    lastResult: null
  };
  let publishedEntries = {};
  let publishedLoadError = false;
  let publishedMode = 'hybrid';
  let publishedTargetYear = Number(defaultDate().slice(0, 4));
  let publishedTargetType = '';
  let publishedTargetEventDate = '';
  let publishedManualReady = Promise.resolve();
  const ingressCache = new Map();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const isTamil = () => document.documentElement.lang === 'ta' || document.documentElement.lang.startsWith('ta-');
  const L = (en, ta) => isTamil() ? ta : en;
  const planetLabel = key => (isTamil() ? taNames[key] : enNames[key]) || key;
  const rasiLabel = i => rasiLabels[i] ? rasiLabels[i][isTamil() ? 1 : 0] : String(i);
  const fmtDate = date => {
    if (!date) return '—';
    const parts = String(date).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return String(date);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).toLocaleDateString(isTamil() ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };
  const weekdayName = date => {
    const parts = String(date).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return '';
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).toLocaleDateString(isTamil() ? 'ta-IN' : 'en-IN', { weekday: 'long', timeZone: 'UTC' });
  };
  function getLocation() {
    try {
      const v = JSON.parse(localStorage.getItem('smv-calendar-settings') || '{}');
      return { lat: Number(v.lat ?? 11.2342), lon: Number(v.lon ?? 78.8808), offset: Number(v.offset ?? 330), timezone: String(v.timezone || ''), place: String(v.place || 'Perambalur') };
    } catch (_) {
      return { lat: 11.2342, lon: 78.8808, offset: 330, timezone: '', place: 'Perambalur' };
    }
  }
  function offsetAt(cfg, date) {
    if (cfg.timezone) {
      try { return offsetMinutesAt(cfg.timezone, date, '12:00'); } catch (_) {}
    }
    return Number.isFinite(Number(cfg.offset)) ? Number(cfg.offset) : 330;
  }
  const transitChartCache = new Map();
  const transitBodies = [
    ['Sun', SWE.SUN],
    ['Moon', SWE.MOON],
    ['Mars', SWE.MARS],
    ['Mercury', SWE.MERCURY],
    ['Jupiter', SWE.JUPITER],
    ['Venus', SWE.VENUS],
    ['Saturn', SWE.SATURN],
    ['Rahu', SWE.MEAN_NODE]
  ];
  async function chartAtLocalTime(date, time, cfg) {
    const timeMatch = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !timeMatch) {
      throw new Error('Transit date/time must use YYYY-MM-DD and HH:MM.');
    }
    const offset = offsetAt(cfg, date);
    const key = [date, time, cfg.lat, cfg.lon, offset].join('|');
    if (transitChartCache.has(key)) return transitChartCache.get(key);
    const pending = (async () => {
      const hour = Number(timeMatch[1]), minute = Number(timeMatch[2]);
      const localTotal = hour * 60 + minute;
      if (hour > 23 || minute > 59) throw new Error('Transit time must be within 00:00–23:59.');
      const utcTotal = localTotal - offset;
      const dayShift = Math.floor(utcTotal / 1440);
      const normalized = ((utcTotal % 1440) + 1440) % 1440;
      const utcDate = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
      utcDate.setUTCDate(utcDate.getUTCDate() + dayShift);
      const swe = await getSwe();
      swe.setSiderealLahiri();
      const jd = swe.utcToJd(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth() + 1,
        utcDate.getUTCDate(),
        Math.floor(normalized / 60),
        normalized % 60,
        0
      );
      if (!jd || !Number.isFinite(Number(jd.et))) {
        throw new Error('Swiss Ephemeris could not calculate the local transit Julian date.');
      }
      const flags = swe.siderealSpeedFlags();
      const planets = transitBodies.map(([name, body]) => {
        const result = swe.calc(jd.et, body, flags);
        const longitude = Number(result && result.longitude);
        if (!Number.isFinite(longitude)) throw new Error('Swiss Ephemeris returned an invalid transit longitude for ' + name + '.');
        return { name, longitude: ((longitude % 360) + 360) % 360, speed: Number(result.speed) || 0 };
      });
      const rahu = planets.find(p => p.name === 'Rahu');
      if (rahu) planets.push({ name: 'Ketu', longitude: (rahu.longitude + 180) % 360, speed: -(Number(rahu.speed) || 0) });
      return { ok: true, planets, birth: { date, time, utcOffsetMinutes: offset } };
    })();
    transitChartCache.set(key, pending);
    try {
      const chart = await pending;
      if (transitChartCache.size > 512) {
        const oldest = transitChartCache.keys().next().value;
        if (oldest !== key) transitChartCache.delete(oldest);
      }
      return chart;
    } catch (error) {
      transitChartCache.delete(key);
      throw error;
    }
  }
  async function sunriseFor(date, cfg) {
    const offset = offsetAt(cfg, date);
    const rise = solarNoaa(date, cfg.lat, cfg.lon, offset, true);
    if (rise && /^\d{1,2}:\d{2}/.test(String(rise))) return { time: String(rise).slice(0, 5), fallback: false };
    return { time: '12:00', fallback: true };
  }
  async function chartAtSunrise(date, cfg) {
    const rise = await sunriseFor(date, cfg);
    return { chart: await chartAtLocalTime(date, rise.time, cfg), sunrise: rise.time, fallback: rise.fallback };
  }
  function normalizePlanetName(name) {
    const n = String(name || '').toLowerCase().replace(/\s+/g, '');
    if (n.includes('சூரிய') || n === 'sun') return 'Sun';
    if (n.includes('செவ்வாய்') || n === 'mars') return 'Mars';
    if (n.includes('புதன்') || n === 'mercury') return 'Mercury';
    if (n.includes('குரு') || n.includes('வியாழ') || n === 'jupiter') return 'Jupiter';
    if (n.includes('சுக்கிர') || n === 'venus') return 'Venus';
    if (n.includes('சனி') || n === 'saturn') return 'Saturn';
    if (n.includes('ராகு') || n === 'rahu' || n === 'northnode') return 'Rahu';
    if (n.includes('கேது') || n === 'ketu' || n === 'southnode') return 'Ketu';
    if (n.includes('சந்திர') || n === 'moon') return 'Moon';
    return null;
  }
  function positionsFromChart(chart) {
    const found = {};
    (Array.isArray(chart && chart.planets) ? chart.planets : []).forEach(p => {
      const key = normalizePlanetName(p.name);
      const longitude = Number(p.longitude);
      if (key && Number.isFinite(longitude)) found[key] = ((longitude % 360) + 360) % 360;
    });
    if (Number.isFinite(found.Rahu) && !Number.isFinite(found.Ketu)) found.Ketu = (found.Rahu + 180) % 360;
    if (Number.isFinite(found.Ketu) && !Number.isFinite(found.Rahu)) found.Rahu = (found.Ketu + 180) % 360;
    return {
      moonSign: Number.isFinite(found.Moon) ? signIndex(found.Moon) : null,
      planets: RASI_PALAN_PLANETS.map(p => ({ key: p.key, longitude: found[p.key], sign: Number.isFinite(found[p.key]) ? signIndex(found[p.key]) : null }))
    };
  }
  async function tamilNewYearSunrise(year, cfg) {
    const dates = [];
    for (let day = 8; day <= 20; day++) dates.push(String(year) + '-04-' + String(day).padStart(2, '0'));
    let firstAries = null;
    for (const date of dates) {
      const res = await chartAtSunrise(date, cfg);
      const pos = positionsFromChart(res.chart);
      const sun = (res.chart.planets || []).find(p => normalizePlanetName(p.name) === 'Sun');
      if (sun && signIndex(sun.longitude) === 0 && !firstAries) firstAries = { date, sunrise: res.sunrise, chart: res.chart, fallback: res.fallback };
      if (sun && signIndex(sun.longitude) === 0) {
        const previousDate = new Date(Date.parse(date + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
        const previous = await chartAtSunrise(previousDate, cfg);
        const priorSun = (previous.chart.planets || []).find(p => normalizePlanetName(p.name) === 'Sun');
        if (!priorSun || signIndex(priorSun.longitude) !== 0) return { date, sunrise: res.sunrise, chart: res.chart, fallback: res.fallback, moonSign: pos.moonSign };
      }
    }
    if (firstAries) {
      const p = positionsFromChart(firstAries.chart);
      return { ...firstAries, moonSign: p.moonSign };
    }
    throw new Error(L('Could not identify the local Tamil solar New Year sunrise from Swiss Ephemeris.', 'Swiss Ephemeris கணக்கீட்டில் உள்ளூர் தமிழ் வருடப் பிறப்பு சூரிய உதயத்தை அடையாளம் காண முடியவில்லை.'));
  }
  async function runPeriodForecast() {
    const cfg = getLocation();
    const anchorDate = /^\\d{4}-\\d{2}-\\d{2}$/.test(String(state.date || '')) ? state.date : defaultDate();
    const dateRef = periodReference(state.period, anchorDate);
    const calc = await chartAtSunrise(dateRef.date, cfg);
    const positions = positionsFromChart(calc.chart);
    if (positions.planets.some(p => p.sign == null)) throw new Error(L('Swiss Ephemeris did not return all eight required transit planets.', 'Swiss Ephemeris எட்டு கோச்சார கிரகங்களின் நிலைகளையும் வழங்கவில்லை.'));
    if (positions.moonSign == null) throw new Error(L('The transit Moon sign could not be calculated.', 'கோச்சார சந்திர ராசியைக் கணக்கிட முடியவில்லை.'));
    return {
      type: state.period,
      periodKey: dateRef.key,
      referenceDate: dateRef.date,
      periodStart: dateRef.start || dateRef.date,
      periodEnd: dateRef.end || dateRef.date,
      sunrise: calc.sunrise,
      fallbackSunrise: calc.fallback,
      positions,
      kind: 'rasi'
    };
  }
  async function runNewYearForecast(which) {
    const cfg = getLocation();
    const year = publishedTargetYear || Number(defaultDate().slice(0, 4));
    let result;
    if (which === 'tamilNewYear') result = await tamilNewYearSunrise(year, cfg);
    else {
      const date = String(year) + '-01-01';
      const calc = await chartAtSunrise(date, cfg);
      const p = positionsFromChart(calc.chart);
      result = { date, sunrise: calc.sunrise, chart: calc.chart, fallback: calc.fallback, moonSign: p.moonSign };
    }
    const positions = positionsFromChart(result.chart);
    if (positions.planets.some(p => p.sign == null)) throw new Error(L('Swiss Ephemeris did not return all eight required transit planets.', 'Swiss Ephemeris எட்டு கோச்சார கிரகங்களின் நிலைகளையும் வழங்கவில்லை.'));
    if (positions.moonSign == null) throw new Error(L('The Moon sign could not be determined for the New Year sunrise.', 'வருடப் பிறப்பு சூரிய உதயத்தில் சந்திர ராசியைக் கணக்கிட முடியவில்லை.'));
    return { type: which, periodKey: String(year), referenceDate: result.date, sunrise: result.sunrise, fallbackSunrise: result.fallback, positions, moonSign: positions.moonSign, kind: 'rasi' };
  }
  const dateSerial = s => Date.parse(String(s).slice(0, 10) + 'T12:00:00Z');
  const serialDate = ms => new Date(ms).toISOString().slice(0, 10);
  const serialTime = ms => {
    const d = new Date(ms);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  };
  async function findLastIngress(body, asOfDate, cfg) {
    const lookbackDays = body === 'Saturn' ? 1600 : body === 'Jupiter' ? 950 : 900;
    const stepMs = 10 * 86400000;
    const asOfMs = dateSerial(asOfDate);
    const asOfChart = await chartAtLocalTime(asOfDate, '12:00', cfg);
    let newerMs = asOfMs;
    let newerSign = positionsFromChart(asOfChart).planets.find(p => p.key === body)?.sign;
    if (newerSign == null) return null;
    const earliestMs = Math.max(dateSerial('1800-01-01'), asOfMs - lookbackDays * 86400000);
    for (let olderMs = asOfMs - stepMs; olderMs >= earliestMs; olderMs -= stepMs) {
      const olderChart = await chartAtLocalTime(serialDate(olderMs), '12:00', cfg);
      const olderSign = positionsFromChart(olderChart).planets.find(p => p.key === body)?.sign;
      if (olderSign == null) continue;
      if (olderSign !== newerSign) {
        let lo = olderMs, hi = newerMs;
        for (let iter = 0; iter < 18 && hi - lo > 60000; iter++) {
          const mid = Math.floor((lo + hi) / 2);
          const midChart = await chartAtLocalTime(serialDate(mid), serialTime(mid), cfg);
          const midSign = positionsFromChart(midChart).planets.find(p => p.key === body)?.sign;
          if (midSign === olderSign) lo = mid;
          else hi = mid;
        }
        const eventDate = serialDate(hi);
        const eventTime = serialTime(hi);
        const eventChart = await chartAtLocalTime(eventDate, eventTime, cfg);
        const eventPositions = positionsFromChart(eventChart);
        const newSign = eventPositions.planets.find(p => p.key === body)?.sign;
        if (newSign == null) return null;
        return { id: body + '|' + eventDate + '|' + olderSign + '|' + newSign, body, date: eventDate, time: eventTime, previousSign: olderSign, newSign, positions: eventPositions };
      }
      newerMs = olderMs;
      newerSign = olderSign;
    }
    return null;
  }
  async function runIngressForecast() {
    const cfg = getLocation();
    const today = defaultDate();
    // The Admin can pin an earlier reference date; future transit dates are never shown.
    const asOfDate = publishedTargetEventDate && publishedTargetEventDate <= today ? publishedTargetEventDate : today;
    const [jupiter, saturn, rahu] = await Promise.all([
      findLastIngress('Jupiter', asOfDate, cfg),
      findLastIngress('Saturn', asOfDate, cfg),
      findLastIngress('Rahu', asOfDate, cfg)
    ]);
    return {
      type: 'ingress',
      year: publishedTargetYear,
      asOfDate,
      byBody: { Jupiter: jupiter ? [jupiter] : [], Saturn: saturn ? [saturn] : [], Rahu: rahu ? [rahu] : [] },
      kind: 'ingress'
    };
  }
  function entryFor(result, rasiIndex, planetKey, language) {
    return readingKey(result.type, result.periodKey, rasiIndex, planetKey, language);
  }
  function autoText(planetKey, planetSign, rasiIndex, tamil) {
    const house = houseFromRasi(planetSign, rasiIndex);
    return transitReading(planetKey, house, tamil);
  }
  function sourceLabel(source) {
    if (source === 'manual') return L('Published manual', 'நிர்வாகி வெளியிட்ட கையேடு');
    if (source === 'automatic-fallback') return L('Automatic fallback', 'தானியங்கி மாற்று பலன்');
    if (source === 'automatic') return L('Swiss Ephemeris · programmed rules', 'Swiss Ephemeris · நிரலாக்கப்பட்ட விதிகள்');
    return L('Manual reading not published', 'கையேடு பலன் இன்னும் வெளியிடப்படவில்லை');
  }
  function modeText(auto, key, type) {
    const supportsPublishedManual = ['daily', 'weekly', 'monthly', 'tamilNewYear', 'englishNewYear', 'jupiterTransit', 'saturnTransit', 'rahuKetuTransit'].includes(type);
    return selectReading(supportsPublishedManual ? publishedMode : 'automatic', auto, publishedEntries[key], '');
  }
  function renderPlanetCard(result, rasiIndex, body) {
    const key = body.key;
    const bodySign = body.sign;
    const house = houseFromRasi(bodySign, rasiIndex);
    const entryKey = entryFor(result, rasiIndex, key, isTamil() ? 'ta' : 'en');
    const auto = autoText(key, bodySign, rasiIndex, isTamil());
    const selectedReading = modeText(auto, entryKey, result.type);
    const signText = bodySign == null ? L('Position unavailable', 'கிரக நிலை கிடைக்கவில்லை') : rasiLabel(bodySign);
    const reading = selectedReading.text || L('No manual text for this sign, planet and language.', 'இந்த ராசி, கிரகம், மொழிக்கான கையேடு பலன் இல்லை.');
    return '<article class="rp-planet"><h5>' + esc(planetLabel(key)) + '</h5><p class="rp-position">' +
      esc(L('House ', 'பாவம் ') + house + ' · ' + signText) + '</p><p class="rp-reading">' + esc(reading) +
      '</p><small class="rp-source">' + esc(sourceLabel(selectedReading.source)) + '</small></article>';
  }
  function renderMoonTransit(result, rasiIndex) {
    const moonSign = Number.isInteger(result.positions && result.positions.moonSign)
      ? result.positions.moonSign : result.moonSign;
    if (!Number.isInteger(moonSign) || moonSign < 0 || moonSign >= rasiLabels.length) {
      throw new Error(L('The transit Moon sign could not be calculated.', 'கோச்சார சந்திர ராசியைக் கணக்கிட முடியவில்லை.'));
    }
    const house = houseFromRasi(moonSign, rasiIndex);
    const moonKey = entryFor(result, rasiIndex, 'Moon', isTamil() ? 'ta' : 'en');
    const automatic = autoText('Moon', moonSign, rasiIndex, isTamil());
    const selected = modeText(automatic, moonKey, result.type);
    const reading = selected.text || L('No manual text for this Moon-sign and language; please publish a reading or use Automatic / Hybrid mode.', 'இந்தச் சந்திர ராசி மற்றும் மொழிக்கான கையேடு பலன் இல்லை; பலனை வெளியிடவும் அல்லது Automatic / Hybrid முறையைத் தேர்ந்தெடுக்கவும்.');
    return '<section class="rp-moon-transit" data-transit-planet="Moon"><h4>' +
      esc(L('Moon Transit Prediction', 'சந்திரன் கோச்சார பலன்')) + '</h4><p class="rp-position">' +
      esc(L('House ', 'பாவம் ') + house + ' · ' + rasiLabel(moonSign)) +
      '</p><p class="rp-reading">' + esc(reading) + '</p><small class="rp-source">' + esc(sourceLabel(selected.source)) + '</small></section>';
  }
  function renderRasiGrid(result) {
    const language = isTamil() ? 'ta' : 'en';
    const rasiIndex = Number.isInteger(state.rasiIndex) && state.rasiIndex >= 0 && state.rasiIndex < rasiLabels.length ? state.rasiIndex : 0;
    const rasi = rasiLabels[rasiIndex];
    const bodyCards = result.positions.planets.map(p => renderPlanetCard(result, rasiIndex, p)).join('');
    const cards = '<article class="rp-rasi-card" data-rasi-index="' + rasiIndex + '"><h4>' + esc(rasi[isTamil() ? 1 : 0]) + '</h4><div class="rp-planets-grid">' + bodyCards + '</div></article>';
    const title = result.type === 'tamilNewYear' ? RASI_PALAN_TITLES.tamilNewYear[language]
      : result.type === 'englishNewYear' ? RASI_PALAN_TITLES.englishNewYear[language]
      : result.type === 'daily' ? L('Daily Rasi Palan', 'தினசரி ராசி பலன்கள்')
      : result.type === 'weekly' ? L('Weekly Rasi Palan', 'வாரம் பலன்கள்')
      : result.type === 'monthly' ? L('Monthly Rasi Palan', 'மாத ராசி பலன்கள்')
      : L('Rasi Palan', 'ராசி பலன்கள்');
    let context;
    if (result.type === 'daily') context = L('Day: ', 'நாள்: ') + weekdayName(result.referenceDate) + ' · ' + fmtDate(result.referenceDate);
    else if (result.type === 'weekly') context = L('Week: ', 'வாரம்: ') + fmtDate(result.periodStart) + ' – ' + fmtDate(result.periodEnd);
    else if (result.type === 'monthly') context = L('Month: ', 'மாதம்: ') + fmtDate(result.periodStart) + ' – ' + fmtDate(result.periodEnd);
    else context = L('Reference: ', 'கணக்கீட்டு அடிப்படை: ') + fmtDate(result.referenceDate) +
      (result.type === 'tamilNewYear' ? ' · ' + L('Chithirai 1', 'சித்திரை 1') : result.type === 'englishNewYear' ? ' · ' + L('January 1', 'ஜனவரி 1') : '');
    context += ' · ' + L('Count the other eight planetary houses from your selected Moon Rasi.', 'மற்ற எட்டு கிரகங்களின் பாவங்களைத் தேர்ந்தெடுத்த உங்கள் சந்திர ராசியிலிருந்து எண்ணவும்.') + ' · ' + L('local sunrise', 'உள்ளூர் சூரிய உதயம்') + ' ' + result.sunrise + ' · ' + getLocation().place;
    if (result.fallbackSunrise) context += ' · ' + L('Sunrise unavailable; local noon used as fallback.', 'சூரிய உதயம் கிடைக்காததால் உள்ளூர் நண்பகல் மாற்றாகப் பயன்படுத்தப்பட்டது.');
    if (result.moonSign != null) context += ' · ' + L('Moon sign at sunrise: ', 'சூரிய உதயச் சந்திர ராசி: ') + rasiLabel(result.moonSign);
    return '<div class="rp-results-title"><div><h3>' + esc(title) + '</h3><p>' + esc(context) + '</p></div></div>' +
      renderMoonTransit(result, rasiIndex) + cards;
  }
  function ingressType(body) {
    return body === 'Jupiter' ? 'jupiterTransit' : body === 'Saturn' ? 'saturnTransit' : 'rahuKetuTransit';
  }
  function renderIngressEvent(event, groupBody, asOfDate) {
    const positions = event.positions;
    const bodies = groupBody === 'Rahu' ? ['Rahu', 'Ketu'] : [groupBody];
    const res = { type: ingressType(groupBody), periodKey: event.date, positions };
    const oldSigns = groupBody === 'Rahu'
      ? L('Rahu ', 'ராகு ') + rasiLabel(event.previousSign) + ' / ' + L('Ketu ', 'கேது ') + rasiLabel((event.previousSign + 6) % 12)
      : rasiLabel(event.previousSign);
    const newSigns = groupBody === 'Rahu'
      ? L('Rahu ', 'ராகு ') + rasiLabel(event.newSign) + ' / ' + L('Ketu ', 'கேது ') + rasiLabel((event.newSign + 6) % 12)
      : rasiLabel(event.newSign);
    const eventMeta = L('Last ingress: ', 'கடைசியாக நடந்த பெயர்ச்சி: ') + fmtDate(event.date) + ' · ' + esc(event.time) +
      ' · ' + L('From ', 'முந்தைய ராசி ') + oldSigns + ' ' + L('to ', '→ புதிய ராசி ') + newSigns +
      ' · ' + L('As of ', 'கணக்கீட்டு நாள் ') + fmtDate(asOfDate);
    const rasiIndex = Number.isInteger(state.rasiIndex) && state.rasiIndex >= 0 && state.rasiIndex < rasiLabels.length ? state.rasiIndex : 0;
    const rasi = rasiLabels[rasiIndex];
    const items = bodies.map(body => {
      const p = positions.planets.find(x => x.key === body);
      if (!p || p.sign == null) return '';
      return renderPlanetCard(res, rasiIndex, p);
    }).join('');
    const cards = '<article class="rp-rasi-card" data-rasi-index="' + rasiIndex + '"><h4>' + esc(rasi[isTamil() ? 1 : 0]) + '</h4><div class="rp-planets-grid">' + items + '</div></article>';
    return '<section class="rp-ingress-event"><div class="rp-event-heading"><h4>' + esc(planetLabel(groupBody === 'Rahu' ? 'Rahu' : groupBody)) + '</h4><p>' + esc(eventMeta) + '</p></div><div class="rp-rasi-grid">' + cards + '</div></section>';
  }
  function renderIngress(result) {
    const config = [
      { key: 'Jupiter', ta: 'குரு', en: 'Jupiter' },
      { key: 'Saturn', ta: 'சனி', en: 'Saturn' },
      { key: 'Rahu', ta: 'ராகு–கேது', en: 'Rahu–Ketu' }
    ];
    return '<div class="rp-results-title"><div><h3>' + esc(L('Jupiter, Saturn and Rahu–Ketu Transit Predictions', 'குரு, சனி, ராகு–கேது பெயர்ச்சி பலன்கள்')) + '</h3><p>' +
      esc(L('Showing only the latest past ingress for each group; future transits are not displayed. ', 'ஒவ்வொரு பிரிவிலும் கடைசியாக நடந்த பெயர்ச்சி மட்டும் காட்டப்படும்; எதிர்கால பெயர்ச்சிகள் காட்டப்படாது. ') + L('As of ', 'கணக்கீட்டு நாள்: ') + fmtDate(result.asOfDate)) +
      '</p></div></div>' +
      config.map(group => {
        const events = result.byBody[group.key] || [];
        if (!events.length) return '<section class="rp-ingress-group"><h4>' + esc(isTamil() ? group.ta : group.en) + '</h4><p>' +
          esc(L('No earlier ingress could be calculated in the supported range.', 'கணக்கீட்டு வரம்பில் முந்தைய பெயர்ச்சியைக் கணக்கிட முடியவில்லை.')) + '</p></section>';
        return '<section class="rp-ingress-group"><h4>' + esc(isTamil() ? group.ta : group.en) + '</h4>' +
          events.map(e => renderIngressEvent(e, group.key, result.asOfDate)).join('') + '</section>';
      }).join('');
  }
  function setStatus(message, error) {
    const el = $('#rpStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', !!error);
  }
  function renderControls() {
    root.innerHTML = '<div class="rp-heading"><div><p class="rp-eyebrow">SMV CALENDAR</p><h2>' + esc(L('Rasi Palan & Planetary Transits', 'ராசி பலன்கள் & கிரக கோச்சாரம்')) + '</h2><p>' +
      esc(L('Daily, weekly, monthly, Tamil New Year, English New Year and dedicated ingress predictions.', 'தினசரி, வார, மாத, தமிழ் வருடப் பிறப்பு, ஆங்கில வருடப் பிறப்பு மற்றும் தனிப்பட்ட பெயர்ச்சி பலன்கள்.')) + '</p></div></div>' +
      '<div class="rp-tabs" role="tablist" aria-label="Rasi Palan type">' +
      '<button type="button" data-section="period" class="' + (state.section === 'period' ? 'is-active' : '') + '">' + esc(L('Daily / Weekly / Monthly', 'தினசரி / வார / மாத')) + '</button>' +
      '<button type="button" data-section="tamilNewYear" class="' + (state.section === 'tamilNewYear' ? 'is-active' : '') + '">' + esc(annualLabels.tamilNewYear[isTamil() ? 1 : 0]) + '</button>' +
      '<button type="button" data-section="englishNewYear" class="' + (state.section === 'englishNewYear' ? 'is-active' : '') + '">' + esc(annualLabels.englishNewYear[isTamil() ? 1 : 0]) + '</button>' +
      '<button type="button" data-section="ingress" class="' + (state.section === 'ingress' ? 'is-active' : '') + '">' + esc(L('Jupiter / Saturn / Rahu–Ketu', 'குரு / சனி / ராகு–கேது')) + '</button></div>' +
      '<div class="rp-toolbar">' +
      '<label class="rp-date-control">' + esc(L('Reference date', 'குறிப்பிட்ட தேதி')) + '<input id="rpDate" type="date" min="1800-01-01" max="2399-12-31"></label>' +
      '<label class="rp-rasi-control">' + esc(L('Your Moon Rasi', 'உங்கள் சந்திர ராசி')) + '<select id="rpRasi">' + rasiLabels.map((rasi, index) => '<option value="' + index + '">' + esc(rasi[isTamil() ? 1 : 0]) + '</option>').join('') + '</select></label>' +
      '<label class="rp-period-control">' + esc(L('Period', 'கால அளவு')) + '<select id="rpPeriod"><option value="daily">' + esc(L('Daily', 'தினசரி')) + '</option><option value="weekly">' + esc(L('Weekly', 'வாரம்')) + '</option><option value="monthly">' + esc(L('Monthly', 'மாதம்')) + '</option></select></label>' +
      '<button type="button" id="rpRun" class="rp-primary">' + esc(L('Show predictions', 'பலன்களைக் காண்பி')) + '</button></div>' +
      '<p id="rpStatus" class="rp-status" role="status"></p>' +
      '<div id="rpResults" aria-live="polite"></div>';
    $('#rpPeriod').value = state.period;
    $('#rpDate').value = state.date || defaultDate();
    $('#rpRasi').value = String(state.rasiIndex);
    const periodControl = $('.rp-period-control');
    periodControl.hidden = state.section !== 'period';
    $('.rp-date-control').hidden = state.section !== 'period';
    root.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => {
      const nextSection = button.dataset.section;
      if (state.section === nextSection) return;
      state.section = nextSection;
      renderControls();
      if (state.lastResult) renderLastResult();
    }));
    $('#rpPeriod').addEventListener('change', () => { state.period = $('#rpPeriod').value; });
    $('#rpDate').addEventListener('change', () => {
      const value = $('#rpDate').value;
      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) state.date = value;
    });
    $('#rpRasi').addEventListener('change', () => {
      const value = Number($('#rpRasi').value);
      if (!Number.isInteger(value) || value < 0 || value >= rasiLabels.length) return;
      state.rasiIndex = value;
      try { localStorage.setItem(selectedRasiStorageKey, String(value)); } catch (_) {}
      const calendarRasi = document.getElementById('calRasi');
      if (calendarRasi && calendarRasi.value !== String(value)) {
        calendarRasi.value = String(value);
        calendarRasi.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (state.lastResult) {
        renderLastResult();
      }
    });
    $('#rpRun').addEventListener('click', run);
  }
  function renderLastResult() {
    const target = $('#rpResults');
    if (!target || !state.lastResult) return;
    const result = state.lastResult;
    if (result.kind === 'rasi') target.innerHTML = renderRasiGrid(result);
    else target.innerHTML = renderIngress(result);
  }
  async function run() {
    state.date = /^\\d{4}-\\d{2}-\\d{2}$/.test(String(state.date || '')) ? state.date : defaultDate();
    state.year = publishedTargetYear || Number(defaultDate().slice(0, 4));
    setStatus(L('Calculating with the local Swiss Ephemeris engine…', 'உள்ளூர் Swiss Ephemeris மூலம் கணக்கிடப்படுகிறது…'), false);
    $('#rpRun').disabled = true;
    try {
      if (state.section === 'period') state.lastResult = await runPeriodForecast();
      else if (state.section === 'tamilNewYear' || state.section === 'englishNewYear') state.lastResult = await runNewYearForecast(state.section);
      else state.lastResult = await runIngressForecast();
      renderLastResult();
      const resultNote = state.lastResult.fallbackSunrise
        ? L('Sunrise unavailable; noon fallback was used.', 'சூரிய உதயம் கிடைக்காததால் நண்பகல் மாற்றாகப் பயன்படுத்தப்பட்டது.')
        : L('Calculation completed.', 'கணக்கீடு முடிந்தது.');
      setStatus(resultNote, false);
    } catch (error) {
      console.error('SMV Calendar Rasi Palan calculation failed', error);
      setStatus(L('Calculation could not be completed: ', 'கணக்கீடு முடிக்கப்படவில்லை: ') + String(error && error.message || error), true);
    } finally {
      if ($('#rpRun')) $('#rpRun').disabled = false;
    }
  }
  async function loadPublishedManual() {
    const accept = data => {
      publishedEntries = data && data.entries && typeof data.entries === 'object' ? data.entries : {};
      publishedMode = ['automatic', 'manual', 'hybrid'].includes(data && data.mode) ? data.mode : 'hybrid';
      const candidateYear = Number(data && data.targetYear);
      publishedTargetYear = Number.isInteger(candidateYear) && candidateYear >= 1800 && candidateYear <= 2399
        ? candidateYear : Number(defaultDate().slice(0, 4));
      publishedTargetType = String(data && data.targetType || '');
      const candidateDate = String(data && data.targetEventDate || '');
      publishedTargetEventDate = /^\d{4}-\d{2}-\d{2}$/.test(candidateDate) ? candidateDate : '';
    };
    if (navigator.onLine) {
      try {
        const CONFIG = {
          apiKey: 'AIzaSyCKXyfZ9sjGmej7ygxHpZHNcNysMXHuvSs',
          authDomain: location.hostname.toLowerCase() === 'calendar.smvastroservices.in'
            ? 'auth.smvastroservices.in'
            : 'smv-astro.firebaseapp.com',
          projectId: 'smv-astro',
          storageBucket: 'smv-astro.firebasestorage.app',
          messagingSenderId: '299081899217',
          appId: '1:299081899217:web:8d558df08e86037ea539f0'
        };
        const [appM, fsM] = await Promise.all([
          import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
        ]);
        const app = appM.getApps().find(x => x.name === 'smv-calendar-public-content') ||
          appM.initializeApp(CONFIG, 'smv-calendar-public-content');
        const db = fsM.getFirestore(app);
        const snap = await fsM.getDocFromServer(fsM.doc(db, 'smv_content', 'calendar_rasi_palan_v1'));
        if (snap.exists() && snap.data().published === true) {
          accept(snap.data());
          publishedLoadError = false;
          return;
        }
      } catch (error) {
        console.warn('SMV Calendar online Admin readings are unavailable; trying the bundled published copy.', error);
      }
    }
    try {
      const url = new URL('./calendar-rasi-palan-manual.json', import.meta.url);
      url.searchParams.set('v', '2');
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      accept(await response.json());
      publishedLoadError = false;
    } catch (error) {
      publishedLoadError = true;
      publishedEntries = {};
      publishedMode = 'hybrid';
      console.warn('SMV Calendar published manual readings are unavailable.', error);
    }
  }
  const languageObserver = new MutationObserver(() => {
    renderControls();
    if (state.lastResult) renderLastResult();
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  renderControls();
  // Keep the Calendar's existing Rasi selector and the forecast selector in sync.
  document.addEventListener('change', event => {
    if (event.target?.id !== 'calRasi') return;
    const value = Number(event.target.value);
    if (!Number.isInteger(value) || value < 0 || value >= rasiLabels.length) return;
    state.rasiIndex = value;
    try { localStorage.setItem(selectedRasiStorageKey, String(value)); } catch (_) {}
    const control = $('#rpRasi');
    if (control && control.value !== String(value)) control.value = String(value);
    if (state.lastResult) renderLastResult();
  });
  publishedManualReady = loadPublishedManual().then(() => {
    if (publishedLoadError) console.warn('Calendar remains usable with automatic predictions only.');
    if (!state.lastResult) return;
    const result = state.lastResult;
    const today = defaultDate();
    const adminAsOfDate = publishedTargetEventDate && publishedTargetEventDate <= today
      ? publishedTargetEventDate : today;
    const annualResult = result.type === 'tamilNewYear' || result.type === 'englishNewYear';
    const selectedType = result.type === 'ingress' ? 'ingress' : result.type;
    const targetChanged = (annualResult && result.periodKey !== String(publishedTargetYear)) ||
      (result.type === 'ingress' && (result.year !== publishedTargetYear || result.asOfDate !== adminAsOfDate));
    if (targetChanged && state.section === selectedType) run();
    else renderLastResult();
  });
}

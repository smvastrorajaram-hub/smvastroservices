import { calculateSwiss } from './offline/swiss_vedic.browser.mjs';
import { solarNoaa } from './offline/transit_panchang.browser.mjs';
import { offsetMinutesAt } from './offline/places/timezone.mjs';
import { signs, transitReading } from './calendar-data.mjs';
import { RASI_PALAN_PLANETS, RASI_PALAN_TITLES, signIndex, houseFromRasi, periodReference, readingKey, selectReading } from './calendar-rasi-palan-rules.mjs';

const calendarHost = document.getElementById('smvDailyCalendar');
if (calendarHost && calendarHost.parentElement && !document.getElementById('calRasiPalan')) {
  const root = document.createElement('section');
  root.id = 'calRasiPalan';
  root.className = 'cal-rasi-palan';
  root.setAttribute('aria-label', 'Daily, weekly, monthly and New Year Rasi Palan');
  calendarHost.parentElement.insertBefore(root, calendarHost);

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
  let state = {
    section: 'period',
    period: 'daily',
    date: defaultDate(),
    year: Number(defaultDate().slice(0, 4)),
    mode: 'automatic',
    lastResult: null
  };
  let publishedEntries = {};
  let publishedLoadError = false;
  let localDrafts = loadDrafts();
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
  function loadDrafts() {
    try {
      const data = JSON.parse(localStorage.getItem('smv-calendar-rasi-palan-drafts-v1') || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (_) { return {}; }
  }
  function saveDrafts() {
    try { localStorage.setItem('smv-calendar-rasi-palan-drafts-v1', JSON.stringify(localDrafts)); return true; }
    catch (_) { return false; }
  }
  function dateInput(date, time, cfg) {
    return {
      date: date,
      time: time,
      lat: cfg.lat,
      lon: cfg.lon,
      utcOffsetMinutes: offsetAt(cfg, date),
      language: 'en'
    };
  }
  async function chartAtLocalTime(date, time, cfg) {
    return calculateSwiss(dateInput(date, time, cfg));
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
    const dateRef = periodReference(state.period, state.date);
    const periodKey = dateRef.key;
    const calc = await chartAtSunrise(dateRef.date, cfg);
    const positions = positionsFromChart(calc.chart);
    if (positions.planets.some(p => p.sign == null)) throw new Error(L('Swiss Ephemeris did not return all eight required transit planets.', 'Swiss Ephemeris எட்டு கோச்சார கிரகங்களின் நிலைகளையும் வழங்கவில்லை.'));
    return { type: state.period, periodKey, referenceDate: dateRef.date, sunrise: calc.sunrise, fallbackSunrise: calc.fallback, positions, kind: 'rasi' };
  }
  async function runNewYearForecast(which) {
    const cfg = getLocation();
    const year = Number(state.year);
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
  async function findIngresses(year, cfg) {
    const cacheKey = [year, cfg.lat, cfg.lon, cfg.offset, cfg.timezone].join('|');
    if (ingressCache.has(cacheKey)) return ingressCache.get(cacheKey);
    const start = year <= 1800 ? '1800-01-01' : String(year - 1) + '-12-01';
    const end = year >= 2399 ? '2399-12-31' : String(year + 1) + '-02-01';
    const startMs = dateSerial(start);
    const endMs = dateSerial(end);
    const stepMs = 5 * 86400000;
    const result = [];
    for (const body of ['Jupiter', 'Saturn', 'Rahu']) {
      let previousMs = startMs;
      let previousChart = await chartAtLocalTime(serialDate(previousMs), '12:00', cfg);
      let previousPositions = positionsFromChart(previousChart);
      let previousSign = previousPositions.planets.find(p => p.key === body).sign;
      for (let sampleMs = startMs + stepMs; sampleMs <= endMs + stepMs; sampleMs += stepMs) {
        const boundedMs = Math.min(sampleMs, endMs);
        const sampleDate = serialDate(boundedMs);
        const sampleChart = await chartAtLocalTime(sampleDate, '12:00', cfg);
        const samplePositions = positionsFromChart(sampleChart);
        const sampleSign = samplePositions.planets.find(p => p.key === body).sign;
        if (sampleSign != null && previousSign != null && sampleSign !== previousSign) {
          let lo = previousMs, hi = boundedMs;
          for (let iter = 0; iter < 18 && hi - lo > 60000; iter++) {
            const mid = Math.floor((lo + hi) / 2);
            const midChart = await chartAtLocalTime(serialDate(mid), serialTime(mid), cfg);
            const midPositions = positionsFromChart(midChart);
            const midSign = midPositions.planets.find(p => p.key === body).sign;
            if (midSign === previousSign) lo = mid; else hi = mid;
          }
          const eventDate = serialDate(hi);
          const eventTime = serialTime(hi);
          const eventChart = await chartAtLocalTime(eventDate, eventTime, cfg);
          const eventPositions = positionsFromChart(eventChart);
          const newSign = eventPositions.planets.find(p => p.key === body).sign;
          const dedupe = body + '|' + eventDate + '|' + previousSign + '|' + newSign;
          if (newSign != null && !result.some(x => x.id === dedupe)) {
            result.push({ id: dedupe, body, date: eventDate, time: eventTime, previousSign, newSign, chart: eventChart, positions: eventPositions });
          }
          previousSign = sampleSign;
        } else if (sampleSign != null) {
          previousSign = sampleSign;
        }
        previousMs = boundedMs;
        previousChart = sampleChart;
        previousPositions = samplePositions;
        if (boundedMs === endMs) break;
      }
    }
    result.sort((a, b) => a.date.localeCompare(b.date) || a.body.localeCompare(b.body));
    for (let i = 0; i < result.length; i++) {
      const next = result.slice(i + 1).find(x => x.body === result[i].body);
      result[i].ends = next ? next.date : end;
    }
    ingressCache.set(cacheKey, result);
    return result;
  }
  async function runIngressForecast() {
    const cfg = getLocation();
    const year = Number(state.year);
    const events = await findIngresses(year, cfg);
    const start = String(year) + '-01-01';
    const end = String(year) + '-12-31';
    const byBody = {};
    for (const body of ['Jupiter', 'Saturn', 'Rahu']) {
      const rows = events.filter(e => e.body === body);
      const previous = rows.filter(e => e.date < start).slice(-1)[0];
      const within = rows.filter(e => e.date >= start && e.date <= end);
      byBody[body] = [...(previous ? [previous] : []), ...within].map(e => {
        const next = rows.find(n => n.date > e.date);
        return { ...e, ends: next ? next.date : e.ends || end };
      });
    }
    return { type: 'ingress', year, byBody, kind: 'ingress' };
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
    if (source === 'draft') return L('Local draft', 'இந்தச் சாதனத்தின் வரைவு');
    if (source === 'automatic-fallback') return L('Automatic fallback', 'தானியங்கி மாற்று பலன்');
    if (source === 'automatic') return L('Swiss Ephemeris · programmed rules', 'Swiss Ephemeris · நிரலாக்கப்பட்ட விதிகள்');
    return L('Manual reading not published', 'கையேடு பலன் இன்னும் வெளியிடப்படவில்லை');
  }
  function modeText(auto, key) {
    return selectReading(state.mode, auto, publishedEntries[key], localDrafts[key]);
  }
  function renderPlanetCard(result, rasiIndex, body) {
    const key = body.key;
    const bodySign = body.sign;
    const house = houseFromRasi(bodySign, rasiIndex);
    const entryKey = entryFor(result, rasiIndex, key, isTamil() ? 'ta' : 'en');
    const auto = autoText(key, bodySign, rasiIndex, isTamil());
    const selectedReading = modeText(auto, entryKey);
    const signText = bodySign == null ? L('Position unavailable', 'கிரக நிலை கிடைக்கவில்லை') : rasiLabel(bodySign);
    const reading = selectedReading.text || L('No manual text for this sign, planet and language.', 'இந்த ராசி, கிரகம், மொழிக்கான கையேடு பலன் இல்லை.');
    return '<article class="rp-planet"><h5>' + esc(planetLabel(key)) + '</h5><p class="rp-position">' +
      esc(L('House ', 'பாவம் ') + house + ' · ' + signText) + '</p><p class="rp-reading">' + esc(reading) +
      '</p><small class="rp-source">' + esc(sourceLabel(selectedReading.source)) + '</small></article>';
  }
  function renderRasiGrid(result) {
    const language = isTamil() ? 'ta' : 'en';
    const cards = rasiLabels.map((rasi, rasiIndex) => {
      const bodyCards = result.positions.planets.map(p => renderPlanetCard(result, rasiIndex, p)).join('');
      return '<article class="rp-rasi-card"><h4>' + esc(rasi[isTamil() ? 1 : 0]) + '</h4><div class="rp-planets-grid">' + bodyCards + '</div></article>';
    }).join('');
    const title = result.type === 'tamilNewYear' ? RASI_PALAN_TITLES.tamilNewYear[language]
      : result.type === 'englishNewYear' ? RASI_PALAN_TITLES.englishNewYear[language]
      : L('Rasi Palan', 'ராசி பலன்கள்');
    let context = L('Reference: ', 'கணக்கீட்டு அடிப்படை: ') + fmtDate(result.referenceDate) +
      ' · ' + L('local sunrise', 'உள்ளூர் சூரிய உதயம்') + ' ' + result.sunrise +
      ' · ' + getLocation().place;
    if (result.fallbackSunrise) context += ' · ' + L('Sunrise unavailable; local noon used as fallback.', 'சூரிய உதயம் கிடைக்காததால் உள்ளூர் நண்பகல் மாற்றாகப் பயன்படுத்தப்பட்டது.');
    if (result.moonSign != null) context += ' · ' + L('Moon sign at sunrise: ', 'சூரிய உதயச் சந்திர ராசி: ') + rasiLabel(result.moonSign);
    return '<div class="rp-results-title"><div><h3>' + esc(title) + '</h3><p>' + esc(context) + '</p></div><span class="rp-mode-chip">' + esc(state.mode.toUpperCase()) + '</span></div>' + cards;
  }
  function ingressType(body) {
    return body === 'Jupiter' ? 'jupiterTransit' : body === 'Saturn' ? 'saturnTransit' : 'rahuKetuTransit';
  }
  function renderIngressEvent(event, groupBody) {
    const positions = event.positions;
    const bodies = groupBody === 'Rahu' ? ['Rahu', 'Ketu'] : [groupBody];
    const res = { type: ingressType(groupBody), periodKey: event.date, positions };
    const rangeEnd = event.ends || '—';
    const oldSigns = groupBody === 'Rahu'
      ? L('Rahu ', 'ராகு ') + rasiLabel(event.previousSign) + ' / ' + L('Ketu ', 'கேது ') + rasiLabel((event.previousSign + 6) % 12)
      : rasiLabel(event.previousSign);
    const newSigns = groupBody === 'Rahu'
      ? L('Rahu ', 'ராகு ') + rasiLabel(event.newSign) + ' / ' + L('Ketu ', 'கேது ') + rasiLabel((event.newSign + 6) % 12)
      : rasiLabel(event.newSign);
    const eventMeta = L('Calculated ingress: ', 'கணக்கிடப்பட்ட பெயர்ச்சி: ') + fmtDate(event.date) + ' · ' + esc(event.time) +
      ' · ' + L('From ', 'முந்தைய ராசி ') + oldSigns + ' ' + L('to ', '→ புதிய ராசி ') + newSigns +
      ' · ' + L('Applicable until ', 'பொருந்தும் காலம் ') + fmtDate(rangeEnd);
    const cards = rasiLabels.map((rasi, rasiIndex) => {
      const items = bodies.map(body => {
        const p = positions.planets.find(x => x.key === body);
        if (!p || p.sign == null) return '';
        return renderPlanetCard(res, rasiIndex, p);
      }).join('');
      return '<article class="rp-rasi-card"><h4>' + esc(rasi[isTamil() ? 1 : 0]) + '</h4><div class="rp-planets-grid">' + items + '</div></article>';
    }).join('');
    return '<section class="rp-ingress-event"><div class="rp-event-heading"><h4>' + esc(planetLabel(groupBody === 'Rahu' ? 'Rahu' : groupBody)) + '</h4><p>' + esc(eventMeta) + '</p></div><div class="rp-rasi-grid">' + cards + '</div></section>';
  }
  function renderIngress(result) {
    const config = [
      { key: 'Jupiter', ta: 'குரு', en: 'Jupiter' },
      { key: 'Saturn', ta: 'சனி', en: 'Saturn' },
      { key: 'Rahu', ta: 'ராகு–கேது', en: 'Rahu–Ketu' }
    ];
    return '<div class="rp-results-title"><div><h3>' + esc(L('Jupiter, Saturn and Rahu–Ketu Transit Predictions', 'குரு, சனி, ராகு–கேது பெயர்ச்சி பலன்கள்')) + ' · ' + result.year + '</h3><p>' +
      esc(L('Each ingress date, previous/new sign and effective interval are computed from local Swiss Ephemeris positions.', 'ஒவ்வொரு பெயர்ச்சி தேதியும் முந்தைய/புதிய ராசியும் பொருந்தும் காலமும் உள்ளூர் Swiss Ephemeris கிரக நிலைகளிலிருந்து கணக்கிடப்படுகின்றன.')) +
      '</p></div><span class="rp-mode-chip">' + esc(state.mode.toUpperCase()) + '</span></div>' +
      config.map(group => {
        const events = result.byBody[group.key] || [];
        if (!events.length) return '<section class="rp-ingress-group"><h4>' + esc(isTamil() ? group.ta : group.en) + '</h4><p>' +
          esc(L('No calculated ingress intersects this year window.', 'இந்த ஆண்டு கால வரம்பில் கணக்கிடப்பட்ட பெயர்ச்சி இல்லை.')) + '</p></section>';
        return '<section class="rp-ingress-group"><h4>' + esc(isTamil() ? group.ta : group.en) + '</h4>' +
          events.map(e => renderIngressEvent(e, group.key)).join('') + '</section>';
      }).join('');
  }
  function setStatus(message, error) {
    const el = $('#rpStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', !!error);
  }
  function activeDraftKey() {
    const current = state.lastResult;
    if (!current) return null;
    const lang = $('#rpEditLanguage') ? $('#rpEditLanguage').value : (isTamil() ? 'ta' : 'en');
    const rasi = $('#rpEditRasi') ? Number($('#rpEditRasi').value) : 0;
    const planet = $('#rpEditPlanet') ? $('#rpEditPlanet').value : 'Sun';
    if (current.kind === 'ingress') {
      const selectedBody = $('#rpEditTransitGroup') ? $('#rpEditTransitGroup').value : 'Jupiter';
      const events = current.byBody[selectedBody] || [];
      const eventDate = $('#rpEditEventDate') ? $('#rpEditEventDate').value : (events[0] && events[0].date);
      return eventDate ? readingKey(ingressType(selectedBody), eventDate, rasi, planet, lang) : null;
    }
    return readingKey(current.type, current.periodKey, rasi, planet, lang);
  }
  function refreshEditorText() {
    const key = activeDraftKey();
    const textArea = $('#rpManualText');
    if (textArea) textArea.value = key ? String(localDrafts[key] || publishedEntries[key] || '') : '';
    const hint = $('#rpEditorHint');
    if (hint) hint.textContent = key && publishedEntries[key]
      ? L('A published entry already exists. Saving edits creates a local draft until it is exported and deployed.', 'வெளியிடப்பட்ட பலன் ஏற்கெனவே உள்ளது. திருத்தி சேமித்தால் JSON ஏற்றுமதி செய்து வெளியிடும் வரை இந்தச் சாதனத்தில் வரைவு மட்டுமே இருக்கும்.')
      : L('Drafts remain on this device until exported and included in the published manual JSON file.', 'JSON ஆக ஏற்றுமதி செய்து வெளியிடப்பட்ட manual கோப்பில் சேர்க்கும் வரை வரைவு இந்தச் சாதனத்தில் மட்டுமே இருக்கும்.');
  }
  function renderControls() {
    const date = state.date;
    root.innerHTML = '<div class="rp-heading"><div><p class="rp-eyebrow">SMV CALENDAR</p><h2>' + esc(L('Rasi Palan & Planetary Transits', 'ராசி பலன்கள் & கிரக கோச்சாரம்')) + '</h2><p>' +
      esc(L('Daily, weekly, monthly, Tamil New Year, English New Year and dedicated ingress predictions.', 'தினசரி, வார, மாத, தமிழ் வருடப் பிறப்பு, ஆங்கில வருடப் பிறப்பு மற்றும் தனிப்பட்ட பெயர்ச்சி பலன்கள்.')) + '</p></div></div>' +
      '<div class="rp-tabs" role="tablist" aria-label="Rasi Palan type">' +
      '<button type="button" data-section="period" class="' + (state.section === 'period' ? 'is-active' : '') + '">' + esc(L('Daily / Weekly / Monthly', 'தினசரி / வார / மாத')) + '</button>' +
      '<button type="button" data-section="tamilNewYear" class="' + (state.section === 'tamilNewYear' ? 'is-active' : '') + '">' + esc(annualLabels.tamilNewYear[isTamil() ? 1 : 0]) + '</button>' +
      '<button type="button" data-section="englishNewYear" class="' + (state.section === 'englishNewYear' ? 'is-active' : '') + '">' + esc(annualLabels.englishNewYear[isTamil() ? 1 : 0]) + '</button>' +
      '<button type="button" data-section="ingress" class="' + (state.section === 'ingress' ? 'is-active' : '') + '">' + esc(L('Jupiter / Saturn / Rahu–Ketu', 'குரு / சனி / ராகு–கேது')) + '</button></div>' +
      '<div class="rp-toolbar">' +
      '<label>' + esc(L('Prediction mode', 'பலன் முறை')) + '<select id="rpMode"><option value="automatic">' + esc(L('Automatic · Swiss Ephemeris', 'தானியங்கி · Swiss Ephemeris')) + '</option><option value="manual">' + esc(L('Manual Entry', 'கையேடு பதிவு')) + '</option><option value="hybrid">' + esc(L('Hybrid · Manual first', 'கலப்பு · கையேடு முன்னுரிமை')) + '</option></select></label>' +
      '<label class="rp-period-control">' + esc(L('Period', 'கால அளவு')) + '<select id="rpPeriod"><option value="daily">' + esc(L('Daily', 'தினசரி')) + '</option><option value="weekly">' + esc(L('Weekly', 'வாரம்')) + '</option><option value="monthly">' + esc(L('Monthly', 'மாதம்')) + '</option></select></label>' +
      '<label>' + esc(L('Date', 'தேதி')) + '<input id="rpDate" type="date" min="1800-01-01" max="2399-12-31" value="' + esc(date) + '"></label>' +
      '<label class="rp-year-control">' + esc(L('Year', 'ஆண்டு')) + '<input id="rpYear" type="number" min="1800" max="2399" step="1" value="' + state.year + '"></label>' +
      '<button type="button" id="rpRun" class="rp-primary">' + esc(L('Calculate / Show', 'கணக்கிட்டு காண்பி')) + '</button></div>' +
      '<p class="rp-method-note">' + esc(L('Automatic uses local Swiss Ephemeris sidereal positions and programmed transit rules. Moon is used only as the New Year reference sign; no separate Moon transit prediction is shown.', 'தானியங்கி முறையில் உள்ளூர் Swiss Ephemeris நிரயண கிரக நிலைகளும் நிரலாக்கப்பட்ட கோச்சார விதிகளும் பயன்படுத்தப்படும். வருடப் பிறப்பில் சந்திர ராசி அடிப்படையாக மட்டும் பயன்படும்; சந்திரனுக்குத் தனி கோச்சார பலன் காட்டப்படாது.')) + '</p>' +
      '<p id="rpStatus" class="rp-status" role="status"></p>' +
      '<details class="rp-manual-editor"><summary>' + esc(L('Manual Entry editor & publish export', 'கையேடு பதிவு திருத்தி & வெளியீட்டு ஏற்றுமதி')) + '</summary>' +
      '<p id="rpEditorHint" class="rp-method-note"></p><div class="rp-editor-grid">' +
      '<label>' + esc(L('Rasi', 'ராசி')) + '<select id="rpEditRasi">' + rasiLabels.map((r, i) => '<option value="' + i + '">' + esc(r[isTamil() ? 1 : 0]) + '</option>').join('') + '</select></label>' +
      '<label>' + esc(L('Planet', 'கிரகம்')) + '<select id="rpEditPlanet">' + RASI_PALAN_PLANETS.map(p => '<option value="' + p.key + '">' + esc(planetLabel(p.key)) + '</option>').join('') + '</select></label>' +
      '<label>' + esc(L('Content language', 'உள்ளடக்க மொழி')) + '<select id="rpEditLanguage"><option value="ta">தமிழ்</option><option value="en">English</option></select></label>' +
      '<label class="rp-edit-event-control">' + esc(L('Transit group', 'பெயர்ச்சி')) + '<select id="rpEditTransitGroup"><option value="Jupiter">Jupiter / குரு</option><option value="Saturn">Saturn / சனி</option><option value="Rahu">Rahu–Ketu / ராகு–கேது</option></select></label>' +
      '<label class="rp-edit-event-control">' + esc(L('Ingress date', 'பெயர்ச்சி தேதி')) + '<input id="rpEditEventDate" type="date" value="' + esc(date) + '"></label>' +
      '</div><label class="rp-manual-text-label">' + esc(L('Manual prediction text', 'கையேடு பலன்')) + '<textarea id="rpManualText" rows="4" maxlength="4000" placeholder="' + esc(L('Enter a distinct prediction for this Rasi, planet, period and language.', 'இந்த ராசி, கிரகம், கால அளவு மற்றும் மொழிக்கான தனிப்பட்ட பலனை உள்ளிடவும்.')) + '"></textarea></label>' +
      '<div class="rp-editor-actions"><button type="button" id="rpSaveDraft">' + esc(L('Save local draft', 'உள்ளூர் வரைவைச் சேமி')) + '</button><button type="button" id="rpExport">' + esc(L('Export manual JSON for publishing', 'வெளியீட்டிற்கான Manual JSON ஏற்றுமதி')) + '</button></div>' +
      '<p class="rp-method-note">' + esc(L('Draft saving is device-local, not an administrator login or a server publish. Export the JSON and deploy it as calendar-rasi-palan-manual.json to make manual readings available to all visitors.', 'வரைவு இந்தச் சாதனத்தில் மட்டுமே சேமிக்கப்படும்; இது நிர்வாகி உள்நுழைவு அல்லது server publish அல்ல. அனைவருக்கும் பலன்கள் கிடைக்க JSON-ஐ ஏற்றுமதி செய்து calendar-rasi-palan-manual.json ஆக deploy செய்ய வேண்டும்.')) + '</p></details>' +
      '<div id="rpResults" aria-live="polite"></div>';
    $('#rpMode').value = state.mode;
    $('#rpPeriod').value = state.period;
    const periodControl = $('.rp-period-control');
    const dateControl = $('#rpDate').parentElement;
    const yearControl = $('.rp-year-control');
    periodControl.hidden = state.section !== 'period';
    dateControl.hidden = state.section !== 'period';
    yearControl.hidden = state.section === 'period';
    root.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => {
      state.section = button.dataset.section;
      renderControls();
      if (state.lastResult) renderLastResult();
    }));
    $('#rpMode').addEventListener('change', () => {
      state.mode = $('#rpMode').value;
      if (state.lastResult) renderLastResult();
      refreshEditorText();
    });
    $('#rpPeriod').addEventListener('change', () => { state.period = $('#rpPeriod').value; });
    $('#rpDate').addEventListener('change', () => { state.date = $('#rpDate').value; state.year = Number(state.date.slice(0, 4)); $('#rpYear').value = state.year; });
    $('#rpYear').addEventListener('change', () => { state.year = Math.max(1800, Math.min(2399, Number($('#rpYear').value) || new Date().getUTCFullYear())); $('#rpYear').value = state.year; });
    $('#rpRun').addEventListener('click', run);
    ['rpEditRasi', 'rpEditPlanet', 'rpEditLanguage', 'rpEditTransitGroup', 'rpEditEventDate'].forEach(id => $('#' + id).addEventListener('change', refreshEditorText));
    $('#rpSaveDraft').addEventListener('click', () => {
      const key = activeDraftKey();
      const value = String($('#rpManualText').value || '').trim();
      if (!key) return setStatus(L('Calculate or select a forecast first.', 'முதலில் ஒரு பலனைக் கணக்கிடவும் அல்லது தேர்ந்தெடுக்கவும்.'), true);
      if (!value) return setStatus(L('Enter manual prediction text before saving.', 'சேமிக்கும் முன் கையேடு பலனை உள்ளிடவும்.'), true);
      localDrafts[key] = value;
      if (!saveDrafts()) return setStatus(L('Could not save the local draft. Browser storage may be full.', 'உள்ளூர் வரைவைச் சேமிக்க முடியவில்லை. சேமிப்பிடம் நிரம்பியிருக்கலாம்.'), true);
      setStatus(L('Draft saved on this device. Export it to publish.', 'இந்தச் சாதனத்தில் வரைவு சேமிக்கப்பட்டது. வெளியிட ஏற்றுமதி செய்யவும்.'), false);
      if (state.lastResult) renderLastResult();
      refreshEditorText();
    });
    $('#rpExport').addEventListener('click', exportManualJson);
    refreshEditorText();
  }
  function exportManualJson() {
    const merged = { schemaVersion: 1, generatedAt: new Date().toISOString(), entries: { ...publishedEntries, ...localDrafts } };
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar-rasi-palan-manual.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(L('Manual JSON exported. Deploy it at the Calendar manual-data path to publish entries.', 'Manual JSON ஏற்றுமதி செய்யப்பட்டது. பலன்களை வெளியிட Calendar manual-data பாதையில் deploy செய்யவும்.'), false);
  }
  function renderLastResult() {
    const target = $('#rpResults');
    if (!target || !state.lastResult) return;
    const result = state.lastResult;
    if (result.kind === 'rasi') target.innerHTML = renderRasiGrid(result);
    else target.innerHTML = renderIngress(result);
    refreshEditorText();
  }
  async function run() {
    state.date = $('#rpDate') ? $('#rpDate').value : state.date;
    state.year = $('#rpYear') ? Number($('#rpYear').value) : state.year;
    if (state.section === 'period' && !state.date) return setStatus(L('Choose a date first.', 'முதலில் தேதியைத் தேர்வு செய்யவும்.'), true);
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
    try {
      const url = new URL('./calendar-rasi-palan-manual.json', import.meta.url);
      url.searchParams.set('v', '1');
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      publishedEntries = data && data.entries && typeof data.entries === 'object' ? data.entries : {};
    } catch (error) {
      publishedLoadError = true;
      publishedEntries = {};
      console.warn('SMV Calendar published manual readings are unavailable.', error);
    }
  }
  const languageObserver = new MutationObserver(() => {
    const selected = $('#rpMode') ? $('#rpMode').value : state.mode;
    state.mode = selected;
    renderControls();
    if (state.lastResult) renderLastResult();
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  renderControls();
  loadPublishedManual().then(() => {
    if (publishedLoadError) setStatus(L('Published manual data could not be loaded; Automatic mode remains available.', 'வெளியிடப்பட்ட கையேடு தரவை ஏற்ற முடியவில்லை; தானியங்கி முறை தொடர்ந்து கிடைக்கும்.'), false);
  });
}

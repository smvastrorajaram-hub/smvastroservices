import {
  calculateAscendantLongitude,
  calculateAstaPositions,
  calculateAstaPositionsSync,
  calculateSunMoon,
  calculateSunMoonSync
} from './offline/swiss_vedic.browser.mjs';
import { offsetMinutesAt } from './offline/places/timezone.mjs';
import { solarNoaa, tamilSolarDate } from './offline/transit_panchang.browser.mjs';
import { classifyPanchaka, getPushkaraArcIndex } from './calendar-special-muhurtha.mjs';

const norm = value => ((Number(value) % 360) + 360) % 360;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date, days) {
  const value = new Date(String(date) + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + Number(days));
  return value.toISOString().slice(0, 10);
}

function offsetAt(input, date, time = '12:00') {
  if (input.timezone) {
    try { return offsetMinutesAt(input.timezone, date, time); }
    catch (error) { /* retain the verified saved offset below */ }
  }
  return Number(input.utcOffsetMinutes ?? 330);
}

function localPartsAt(timestamp, input) {
  const ts = Math.round(Number(timestamp) / 1000) * 1000;
  if (input.timezone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: String(input.timezone), year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(ts)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    const date = parts.year + '-' + parts.month + '-' + parts.day;
    const time = parts.hour + ':' + parts.minute + ':' + parts.second;
    const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    return { date, time, utcOffsetMinutes: (wall - ts) / 60000 };
  }
  const offset = Number(input.utcOffsetMinutes ?? 330);
  const local = new Date(ts + offset * 60000);
  return {
    date: local.getUTCFullYear() + '-' + String(local.getUTCMonth() + 1).padStart(2, '0') + '-' + String(local.getUTCDate()).padStart(2, '0'),
    time: String(local.getUTCHours()).padStart(2, '0') + ':' + String(local.getUTCMinutes()).padStart(2, '0') + ':' + String(local.getUTCSeconds()).padStart(2, '0'),
    utcOffsetMinutes: offset
  };
}

function timestampAtLocal(date, time, offset) {
  return Date.parse(String(date) + 'T' + String(time) + ':00Z') - Number(offset) * 60000;
}

function panchakaAt(sunLongitude, moonLongitude, ascendantLongitude, weekday) {
  const tithi = Math.floor(norm(moonLongitude - sunLongitude) / 12) + 1;
  const nakshatra = Math.floor(norm(moonLongitude) / (360 / 27)) + 1;
  const lagna = Math.floor(norm(ascendantLongitude) / 30) + 1;
  return classifyPanchaka({ tithi, weekday, nakshatra, lagna });
}

export async function calculatePushkaraPanchakaWindows(input) {
  const date = String(input?.date || '');
  const lat = Number(input?.lat), lon = Number(input?.lon);
  if (!datePattern.test(date) || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { available: false, windows: [], reason: 'இடம் / தேதி சரியாக இல்லை.' };
  }

  const startOffset = offsetAt(input, date, '12:00');
  const rise = solarNoaa(date, lat, lon, startOffset, true);
  const nextDate = addDays(date, 1);
  const nextOffset = offsetAt(input, nextDate, '12:00');
  const nextRise = solarNoaa(nextDate, lat, lon, nextOffset, true);
  if (!rise || !nextRise) return { available: false, windows: [], reason: 'சூரிய உதய நேரம் கிடைக்கவில்லை.' };

  const startTimestamp = timestampAtLocal(date, rise, startOffset);
  const endTimestamp = timestampAtLocal(nextDate, nextRise, nextOffset);
  if (!(endTimestamp > startTimestamp)) return { available: false, windows: [], reason: 'உள்ளூர் நாளின் நேர எல்லை சரிபார்க்க முடியவில்லை.' };

  const weekday = new Date(date + 'T12:00:00Z').getUTCDay() + 1;
  await calculateSunMoon({ ...input, date, time: rise, utcOffsetMinutes: startOffset });
  await calculateAscendantLongitude({ ...input, date, time: rise, utcOffsetMinutes: startOffset });

  const sampleCache = new Map();
  async function evaluate(timestamp) {
    const ts = Math.round(Number(timestamp) / 1000) * 1000;
    if (sampleCache.has(ts)) return sampleCache.get(ts);
    const local = localPartsAt(ts, input);
    const sampleInput = {
      ...input, date: local.date, time: local.time,
      utcOffsetMinutes: local.utcOffsetMinutes
    };
    const ascendant = await calculateAscendantLongitude(sampleInput);
    const luminaries = calculateSunMoonSync(sampleInput);
    const panchaka = panchakaAt(luminaries.sunLongitude, luminaries.moonLongitude, ascendant, weekday);
    const arc = getPushkaraArcIndex(ascendant);
    const signature = arc === null || !panchaka.available ? null : String(arc) + ':' + panchaka.key;
    const result = { timestamp: ts, signature, arc, panchaka, date: local.date, time: local.time.slice(0, 5) };
    sampleCache.set(ts, result);
    return result;
  }

  async function firstTimestampAfterStateChange(loValue, hiValue, oldSignature) {
    let lo = Number(loValue), hi = Number(hiValue);
    for (let index = 0; index < 9 && hi - lo > 1000; index++) {
      const mid = Math.floor((lo + hi) / 2);
      const current = await evaluate(mid);
      if (current.signature === oldSignature) lo = mid;
      else hi = mid;
    }
    return Math.round(hi / 60000) * 60000;
  }

  const step = 2 * 60000;
  let previous = await evaluate(startTimestamp);
  let open = previous.signature ? { start: startTimestamp, state: previous } : null;
  const windows = [];
  for (let timestamp = Math.min(startTimestamp + step, endTimestamp); ; timestamp = Math.min(timestamp + step, endTimestamp)) {
    const current = await evaluate(timestamp);
    if (current.signature !== previous.signature) {
      const boundary = await firstTimestampAfterStateChange(previous.timestamp, current.timestamp, previous.signature);
      if (previous.signature && open) {
        const start = localPartsAt(open.start, input), end = localPartsAt(boundary, input);
        windows.push({
          startDate: start.date, startTime: start.time.slice(0, 5),
          endDate: end.date, endTime: end.time.slice(0, 5),
          panchakaKey: open.state.panchaka.key,
          panchakaLabelTa: open.state.panchaka.labelTa,
          panchakaLabelEn: open.state.panchaka.labelEn,
          cautionTa: open.state.panchaka.cautionTa,
          cautionEn: open.state.panchaka.cautionEn,
          isRahita: open.state.panchaka.isRahita
        });
        open = null;
      }
      if (current.signature) open = { start: boundary, state: current };
    }
    previous = current;
    if (timestamp >= endTimestamp) break;
  }
  if (open) {
    const start = localPartsAt(open.start, input), end = localPartsAt(endTimestamp, input);
    windows.push({
      startDate: start.date, startTime: start.time.slice(0, 5),
      endDate: end.date, endTime: end.time.slice(0, 5),
      panchakaKey: open.state.panchaka.key,
      panchakaLabelTa: open.state.panchaka.labelTa,
      panchakaLabelEn: open.state.panchaka.labelEn,
      cautionTa: open.state.panchaka.cautionTa,
      cautionEn: open.state.panchaka.cautionEn,
      isRahita: open.state.panchaka.isRahita
    });
  }
  return { available: true, sunrise: rise, nextSunrise: nextRise, windows };
}

function angularDistance(a, b) {
  const difference = norm(Number(a) - Number(b));
  return Math.min(difference, 360 - difference);
}

function moudhyaState(positions, planet) {
  const target = planet === 'guru' ? positions.guruLongitude : positions.sukraLongitude;
  const distance = angularDistance(target, positions.sunLongitude);
  const threshold = planet === 'guru' ? 11 : (Number(positions.sukraSpeed) < 0 ? 8 : 10);
  return distance <= threshold;
}

export async function calculateSelectedTamilMonthMoudhya(input) {
  const selectedDate = String(input?.date || '');
  const lat = Number(input?.lat), lon = Number(input?.lon);
  if (!datePattern.test(selectedDate) || selectedDate < '2026-04-14' || selectedDate > '2028-04-13' ||
      !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { available: false, windows: [], tamilMonth: null };
  }

  const solar = tamilSolarDate({ ...input, date: selectedDate, time: '12:00' });
  if (!solar?.monthStartDate || !Number.isInteger(Number(solar.monthDays)) ||
      Number(solar.monthDays) < 28 || Number(solar.monthDays) > 33) {
    return { available: false, windows: [], tamilMonth: solar?.monthTa || null };
  }
  const startDate = solar.monthStartDate;
  const endDate = addDays(startDate, Number(solar.monthDays));
  const startRiseOffset = offsetAt(input, startDate, '12:00');
  const endRiseOffset = offsetAt(input, endDate, '12:00');
  const startRise = solarNoaa(startDate, lat, lon, startRiseOffset, true);
  const endRise = solarNoaa(endDate, lat, lon, endRiseOffset, true);
  if (!startRise || !endRise) return { available: false, windows: [], tamilMonth: solar.monthTa || null };

  const monthStart = timestampAtLocal(startDate, startRise, startRiseOffset);
  const monthEnd = timestampAtLocal(endDate, endRise, endRiseOffset);
  const scanStart = monthStart - 100 * 86400000;
  const scanEnd = monthEnd + 100 * 86400000;
  const seed = localPartsAt(scanStart, input);
  await calculateAstaPositions({ ...input, date: seed.date, time: seed.time.slice(0, 5), utcOffsetMinutes: seed.utcOffsetMinutes });

  const cache = new Map();
  function evaluate(timestamp) {
    const ts = Math.round(Number(timestamp) / 60000) * 60000;
    if (cache.has(ts)) return cache.get(ts);
    const local = localPartsAt(ts, input);
    const positions = calculateAstaPositionsSync({
      ...input, date: local.date, time: local.time, utcOffsetMinutes: local.utcOffsetMinutes
    });
    const state = {
      guru: moudhyaState(positions, 'guru'),
      sukra: moudhyaState(positions, 'sukra')
    };
    cache.set(ts, state);
    return state;
  }

  function refineBoundary(loValue, hiValue, planet, oldState) {
    let lo = Number(loValue), hi = Number(hiValue);
    for (let index = 0; index < 18 && hi - lo > 60000; index++) {
      const mid = Math.floor((lo + hi) / 2 / 60000) * 60000;
      if (evaluate(mid)[planet] === oldState) lo = mid;
      else hi = mid;
    }
    return Math.round(hi / 60000) * 60000;
  }

  const windows = [];
  const step = 12 * 60 * 60000;
  for (const planet of ['guru', 'sukra']) {
    let previousTimestamp = scanStart;
    let previousState = evaluate(scanStart)[planet];
    let activeStart = null;
    for (let timestamp = Math.min(scanStart + step, scanEnd); ; timestamp = Math.min(timestamp + step, scanEnd)) {
      const currentState = evaluate(timestamp)[planet];
      if (currentState !== previousState) {
        const boundary = refineBoundary(previousTimestamp, timestamp, planet, previousState);
        if (!previousState) activeStart = boundary;
        else if (activeStart !== null) {
          const start = localPartsAt(activeStart, input), end = localPartsAt(boundary, input);
          if (activeStart < monthEnd && boundary > monthStart) {
            windows.push({
              planet,
              startDate: start.date, startTime: start.time.slice(0, 5),
              endDate: end.date, endTime: end.time.slice(0, 5)
            });
          }
          activeStart = null;
        }
      }
      previousTimestamp = timestamp;
      previousState = currentState;
      if (timestamp >= scanEnd) break;
    }
  }
  const ordered = windows.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime));
  return {
    available: true,
    tamilMonth: solar.monthTa,
    tamilMonthStart: startDate,
    tamilMonthEnd: endDate,
    windows: ordered
  };
}

import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  initializeSwissEphemeris,
  calculateSunMoonLongitudesSync,
  calculateSwissSync
} from '../public/horoscope/offline/swiss_vedic.browser.mjs';

const input = {
  date: '2026-10-24',
  time: '12:00',
  lat: 11.2342,
  lon: 78.8808,
  timezone: 'Asia/Kolkata',
  utcOffsetMinutes: 330
};

await initializeSwissEphemeris();

const fullStart = performance.now();
const full = calculateSwissSync(input);
const fullMs = performance.now() - fullStart;

const lightStart = performance.now();
const light = calculateSunMoonLongitudesSync(input);
const lightMs = performance.now() - lightStart;

const fullSun = full.planets.find(p => p.name === 'சூரியன்')?.longitude;
const fullMoon = full.planets.find(p => p.name === 'சந்திரன்')?.longitude;
assert.ok(Number.isFinite(fullSun), 'Full chart must return the Sun longitude');
assert.ok(Number.isFinite(fullMoon), 'Full chart must return the Moon longitude');
assert.equal(light.sun, fullSun, 'Fast-path Sun longitude must exactly match the full chart');
assert.equal(light.moon, fullMoon, 'Fast-path Moon longitude must exactly match the full chart');

console.log(JSON.stringify({
  pass: true,
  test: 'Calendar Sun/Moon-only calculation matches full Swiss Ephemeris chart',
  reference: input,
  sunLongitude: light.sun,
  moonLongitude: light.moon,
  fullChartMilliseconds: Number(fullMs.toFixed(2)),
  sunMoonOnlyMilliseconds: Number(lightMs.toFixed(2)),
  measuredSpeedup: Number((fullMs / Math.max(lightMs, 0.001)).toFixed(2))
}));

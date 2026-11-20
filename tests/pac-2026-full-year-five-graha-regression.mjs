/**
 * Full 2026 daily cross-check: official Government of India PAC Nirayana
 * longitude PDFs against the bundled Swiss Ephemeris WASM (Lahiri).
 *
 * CI downloads the five official PDFs and converts their selectable text
 * with poppler pdftotext -layout. Every Gregorian day in 2026 is required
 * exactly once for every tested planet (365 x 5 = 1,825 comparisons).
 *
 * The source PDFs identify daily Nirayana longitudes and dates. Their
 * headers do not explicitly identify the row epoch or named ayanamsa.
 * This comparison fixes each PAC civil-date row at 00:00:00 UTC as the
 * project comparison convention, per the requested audit decision. PAC
 * has not explicitly confirmed this epoch in the PDF metadata. UTC is
 * converted to TT through Swiss Ephemeris utcToJd() before swe.calc().
 * Lahiri remains the separately inferred sidereal comparison convention.
 *
 * This is an audit/regression only. It does not certify historical Saura
 * Mean/True/Sheeghroccheya triplets, BPHS Cheshta or production calculations.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const pdfDirectory = process.env.PAC_PDF_DIR;
assert.ok(pdfDirectory, 'CI must set PAC_PDF_DIR to the downloaded official PAC PDFs');
const sourceManifest = JSON.parse(readFileSync(
  new URL('./fixtures/pac-2026-official-daily-pdf-manifest.json', import.meta.url),
  'utf8'
));
assert.equal(sourceManifest.schema, 'SMV_ASTRO_PAC_2026_OFFICIAL_DAILY_NIRAYANA_PDF_SHA256_V1');
assert.equal(sourceManifest.publisher,
  'Positional Astronomy Centre, Kolkata — India Meteorological Department, Government of India');

const planets = Object.freeze({
  Mercury: { body: 2, url: 'https://packolkata.imd.gov.in/download/nirlon/Mercury.pdf' },
  Venus: { body: 3, url: 'https://packolkata.imd.gov.in/download/nirlon/Venus.pdf' },
  Mars: { body: 4, url: 'https://packolkata.imd.gov.in/download/nirlon/Mars.pdf' },
  Jupiter: { body: 5, url: 'https://packolkata.imd.gov.in/download/nirlon/Jupiter.pdf' },
  Saturn: { body: 6, url: 'https://packolkata.imd.gov.in/download/nirlon/Saturn.pdf' }
});
const months = Object.freeze({
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
});
const monthNames = Object.freeze([
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]);
const isoDate = (year, month, day) =>
  year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
const wrap = value => ((value % 360) + 360) % 360;
const signedDifference = (candidate, reference) =>
  ((candidate - reference + 540) % 360) - 180;

function extractPdfText(filePath) {
  const result = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', filePath, '-'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(result.status, 0,
    'pdftotext must read ' + path.basename(filePath) + ': ' + (result.stderr || ''));
  return result.stdout;
}

function parseDailyRows(text, planet) {
  const rows = [];
  const rowPattern = /^\s*(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s+(2025|2026|2027)\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s*$/gm;
  for (const match of text.matchAll(rowPattern)) {
    const year = Number(match[4]);
    if (year !== 2026) continue;
    const degree = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3]);
    const month = months[match[5]];
    const day = Number(match[6]);
    assert.ok(degree >= 0 && degree < 360, planet + ' degree range ' + match[0]);
    assert.ok(minute >= 0 && minute < 60, planet + ' minute range ' + match[0]);
    assert.ok(second >= 0 && second < 60, planet + ' second range ' + match[0]);
    const date = isoDate(year, month, day);
    const decimalDegrees = degree + minute / 60 + second / 3600;
    rows.push({ date, year, month, day, degree, minute, second, decimalDegrees });
  }
  return rows;
}

const sourceRows = {};
const sourceHashes = {};
for (const [planet, metadata] of Object.entries(planets)) {
  const filePath = path.join(pdfDirectory, planet + '.pdf');
  const bytes = readFileSync(filePath);
  assert.ok(bytes.length > 10_000, planet + ' official PAC PDF is non-empty');
  const expectedSource = sourceManifest.files[planet];
  assert.ok(expectedSource, planet + ' must be pinned in the official-PDF manifest');
  assert.equal(metadata.url, expectedSource.url, planet + ' official PAC source URL is pinned');
  assert.equal(bytes.length, expectedSource.bytes, planet + ' PDF byte length matches the pinned source manifest');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, expectedSource.sha256, planet + ' PDF SHA-256 matches the pinned official source');
  sourceHashes[planet] = {
    url: metadata.url,
    bytes: bytes.length,
    sha256
  };
  const rows = parseDailyRows(extractPdfText(filePath), planet);
  assert.equal(rows.length, 365, planet + ' must contain exactly 365 Gregorian 2026 daily rows');
  const byDate = new Map(rows.map(row => [row.date, row]));
  assert.equal(byDate.size, 365, planet + ' must not contain duplicate 2026 dates');
  for (let dayOfYear = 0; dayOfYear < 365; dayOfYear++) {
    const d = new Date(Date.UTC(2026, 0, 1 + dayOfYear));
    const date = isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    assert.ok(byDate.has(date), planet + ' missing daily source row ' + date);
  }
  sourceRows[planet] = rows;
}

const swe = await getSwe();
swe.setSiderealLahiri();
const flags = swe.siderealSpeedFlags();
assert.equal(flags & 2, 2, 'all calculations must use Swiss Ephemeris data, never Moshier fallback');

const observations = [];
const byPlanetAndDate = {};
const monthStats = {};
const datesByMonth = new Map();
for (const planet of Object.keys(planets)) {
  byPlanetAndDate[planet] = new Map();
  for (const row of sourceRows[planet]) {
    const utcJd = swe.utcToJd(row.year, row.month, row.day, 0, 0, 0);
    assert.ok(Number.isFinite(utcJd?.ut) && Number.isFinite(utcJd?.et),
      row.date + ' UTC midnight converts to valid UT and TT Julian days');
    const expectedJdUt = Date.UTC(row.year, row.month - 1, row.day) / 86_400_000 + 2_440_587.5;
    assert.ok(Math.abs(utcJd.ut - expectedJdUt) < 1e-9,
      row.date + ' UTC instant is exactly 00:00:00 UTC');
    const actual = swe.calc(utcJd.et, planets[planet].body, flags);
    assert.ok(Number.isFinite(actual.longitude),
      row.date + ' ' + planet + ' Swiss longitude is finite');
    assert.equal(actual.retFlag & 2, 2,
      row.date + ' ' + planet + ' calculation returned Swiss data flag');
    const delta = signedDifference(wrap(actual.longitude), row.decimalDegrees);
    const residualArcseconds = Math.abs(delta) * 3600;
    const observed = {
      date: row.date,
      utcEpoch: row.date + 'T00:00:00Z',
      julianDayUT: utcJd.ut,
      julianDayTT: utcJd.et,
      planet,
      pacNirayanaDegrees: row.decimalDegrees,
      swissLahiriSiderealDegrees: wrap(actual.longitude),
      signedDifferenceDegrees: delta,
      absoluteDifferenceArcseconds: residualArcseconds
    };
    observations.push(observed);
    byPlanetAndDate[planet].set(row.date, row);
    const monthKey = String(row.month).padStart(2, '0');
    if (!datesByMonth.has(monthKey)) datesByMonth.set(monthKey, new Set());
    datesByMonth.get(monthKey).add(row.date);
    const statKey = monthKey + ':' + planet;
    if (!monthStats[statKey]) monthStats[statKey] = [];
    monthStats[statKey].push(delta);
  }
}

assert.equal(observations.length, 1_825, '365 dates x five grahas');
for (let month = 1; month <= 12; month++) {
  const days = new Date(Date.UTC(2026, month, 0)).getUTCDate();
  assert.equal(datesByMonth.get(String(month).padStart(2, '0'))?.size, days,
    monthNames[month - 1] + ' must have complete daily coverage');
}

const stationEvents = [];
const signBoundaryEvents = [];
const conjunctionEvents = [];
const dailySeries = {};
for (const [planet, rows] of Object.entries(sourceRows)) {
  const speed = [];
  for (let i = 0; i < rows.length - 1; i++) {
    speed.push(signedDifference(rows[i + 1].decimalDegrees, rows[i].decimalDegrees));
  }
  dailySeries[planet] = rows;
  for (let i = 1; i < speed.length; i++) {
    if (speed[i - 1] * speed[i] < 0) {
      stationEvents.push({
        planet,
        beforeInterval: rows[i - 1].date,
        stationBracketStart: rows[i].date,
        stationBracketEnd: rows[i + 1].date,
        directionBefore: speed[i - 1] > 0 ? 'direct' : 'retrograde',
        directionAfter: speed[i] > 0 ? 'direct' : 'retrograde'
      });
    }
  }
  for (let i = 1; i < rows.length; i++) {
    const before = rows[i - 1];
    const after = rows[i];
    if (Math.floor(before.decimalDegrees / 30) !== Math.floor(after.decimalDegrees / 30)) {
      signBoundaryEvents.push({
        planet,
        beforeDate: before.date,
        beforeLongitude: before.decimalDegrees,
        afterDate: after.date,
        afterLongitude: after.decimalDegrees,
        fromRasiIndex: Math.floor(before.decimalDegrees / 30),
        toRasiIndex: Math.floor(after.decimalDegrees / 30)
      });
    }
  }
}

const names = Object.keys(planets);
for (let aIndex = 0; aIndex < names.length; aIndex++) {
  for (let bIndex = aIndex + 1; bIndex < names.length; bIndex++) {
    const a = names[aIndex], b = names[bIndex];
    const series = [];
    for (let i = 0; i < 365; i++) {
      const la = dailySeries[a][i].decimalDegrees;
      const lb = dailySeries[b][i].decimalDegrees;
      const separation = Math.abs(signedDifference(la, lb));
      series.push({ date: dailySeries[a][i].date, separation });
    }
    for (let i = 1; i < series.length - 1; i++) {
      if (series[i].separation <= series[i - 1].separation &&
          series[i].separation <= series[i + 1].separation &&
          series[i].separation <= 2) {
        conjunctionEvents.push({
          planets: [a, b],
          date: series[i].date,
          separationDegrees: series[i].separation
        });
      }
    }
  }
}

assert.ok(stationEvents.length >= 8,
  '2026 daily rows must expose multiple planetary retrograde stations');
assert.ok(signBoundaryEvents.length >= 20,
  '2026 daily rows must expose sign-boundary transitions across the five grahas');
assert.ok(conjunctionEvents.length >= 8,
  '2026 daily rows must expose close conjunction windows among the five grahas');

const stationCountsByPlanet = Object.fromEntries(names.map(planet =>
  [planet, stationEvents.filter(event => event.planet === planet).length]));
const signBoundaryCountsByPlanet = Object.fromEntries(names.map(planet =>
  [planet, signBoundaryEvents.filter(event => event.planet === planet).length]));
const expectedStationCounts = { Mercury: 6, Venus: 2, Mars: 0, Jupiter: 2, Saturn: 2 };
const expectedSignBoundaryCounts = { Mercury: 14, Venus: 12, Mars: 8, Jupiter: 2, Saturn: 0 };
for (const planet of names) {
  assert.equal(stationCountsByPlanet[planet], expectedStationCounts[planet],
    planet + ' 2026 daily PAC series station-window count');
  assert.equal(signBoundaryCountsByPlanet[planet], expectedSignBoundaryCounts[planet],
    planet + ' 2026 daily PAC series sign-boundary crossing count');
}

const maxAbsResidualArcseconds = Math.max(
  ...observations.map(row => row.absoluteDifferenceArcseconds)
);
const rmsResidualArcseconds = Math.sqrt(
  observations.reduce((sum, row) => sum + row.signedDifferenceDegrees ** 2, 0) /
    observations.length
) * 3600;
const perPlanet = Object.fromEntries(names.map(planet => {
  const rows = observations.filter(row => row.planet === planet);
  return [planet, {
    samples: rows.length,
    maxAbsResidualArcseconds: Math.max(...rows.map(row => row.absoluteDifferenceArcseconds)),
    rmsResidualArcseconds: Math.sqrt(
      rows.reduce((sum, row) => sum + row.signedDifferenceDegrees ** 2, 0) / rows.length
    ) * 3600
  }];
}));
const worstObservation = observations.reduce((worst, row) =>
  row.absoluteDifferenceArcseconds > worst.absoluteDifferenceArcseconds ? row : worst);
const worstByPlanet = Object.fromEntries(names.map(planet => {
  const rows = observations.filter(row => row.planet === planet);
  return [planet, rows.reduce((worst, row) =>
    row.absoluteDifferenceArcseconds > worst.absoluteDifferenceArcseconds ? row : worst)];
}));
const perMonth = Object.fromEntries(Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, '0');
  const all = names.flatMap(planet => monthStats[month + ':' + planet]);
  return [month, {
    samples: all.length,
    maxAbsResidualArcseconds: Math.max(...all.map(value => Math.abs(value) * 3600)),
    rmsResidualArcseconds: Math.sqrt(
      all.reduce((sum, value) => sum + value * value, 0) / all.length
    ) * 3600
  }];
}));

console.log(JSON.stringify({
  test: 'PAC 2026 full-year five-graha daily Nirayana longitude cross-check',
  pass: true,
  sourceRowsPerPlanet: 365,
  comparedSamples: observations.length,
  assertions: 'dynamic; includes all 1,825 finite/flag/residual checks plus exact daily coverage',
  sourceHashes,
  assumptions: {
    dailyEpoch: '00:00:00 UTC (fixed project comparison convention; not confirmed in the daily PDF headings)',
    SwissCalculationTimeScale: 'UTC is converted to TT using Swiss Ephemeris utcToJd(); swe.calc receives the returned TT Julian Day',
    ayanamsa: 'Lahiri (empirically inferred; PDF headings say Nirayana but do not name the ayanamsa)',
    sourceUnderlyingEphemerisIndependence: 'not established from the public PDF metadata'
  },
  acceptanceGateArcseconds: 0.36,
  comparisonGatePass: maxAbsResidualArcseconds <= 0.36,
  comparisonGateMeaning: 'This strict sub-arcsecond gate is retained unchanged; a failure is reported rather than hidden by widening the tolerance.',
  maximumAbsoluteResidualArcseconds: maxAbsResidualArcseconds,
  rmsResidualArcseconds,
  perPlanet,
  perMonth,
  monthlyCoverageDays: Object.fromEntries(Array.from(datesByMonth.entries()).map(([month, days]) => [month, days.size])),
  worstObservation,
  worstByPlanet,
  stationEventCount: stationEvents.length,
  stationCountsByPlanet,
  stationEvents,
  signBoundaryEventCount: signBoundaryEvents.length,
  signBoundaryCountsByPlanet,
  signBoundaryEvents,
  closeConjunctionEventCount: conjunctionEvents.length,
  closeConjunctionEvents: conjunctionEvents,
  officialPacFullYearDailyCrossCheck: true,
  historicalSauraTrueLongitudeCertified: false,
  classicalFiveGrahaCheshtaCertified: false,
  productionIntegrationAllowed: false
}, null, 2));
if (maxAbsResidualArcseconds > 0.36) {
  console.error('FAIL: UTC-midnight PAC comparison exceeds the unchanged 0.36 arc-second gate.');
  process.exitCode = 1;
} else {
  console.log('PASS: all 1,825 PAC 2026 daily values parse and match the Swiss Lahiri sidereal calculation within 0.36 arc-second at the fixed 00:00:00 UTC convention.');
}

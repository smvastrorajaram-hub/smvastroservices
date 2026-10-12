'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('../public/horoscope/d1-v311-judgement.js');
const Timing = require('../public/horoscope/d1-v311-timing.js');

function fixture(period = {}, year = {}) {
  return {
    d: {
      houses: [{ no: 5, lord: 'Sun' }],
      planets: { Sun: { house: 10 }, Moon: { house: 4 }, Mercury: { house: 3 } }
    },
    claims: [{
      house: 5, lord: 'Sun', location: 10, otherLordships: [],
      houseAspects: [], positive: [], negative: [], all: [],
      conclusion: 'support', ageUnder18: false
    }],
    data: {
      dasha: [{
        from: '2030-01-01', to: '2030-06-01',
        md: 'Sun', ad: 'Moon', pd: 'Mercury', ...period
      }],
      transitYears: [{
        from: '2030-01-01', to: '2031-01-01', date: '2030-05-01', forecastYear: 1,
        notes: [{
          focus: 5, planet: 'Jupiter', strength: 2,
          evidence: { marks: ['computed'], signal: 1 }
        }],
        ...year
      }]
    }
  };
}

function report(f) {
  return Timing.timeline(f.d, f.claims, f.data, '1990-01-01');
}

function assertUncorroborated(r) {
  assert.equal(r.years.length, 1, 'Keep the forecast window visible');
  assert.equal(r.years[0].pass, false);
  assert.equal(r.years[0].confirmedConvergence, false);
  assert.equal(r.years[0].period, null);
  assert.equal(r.chronology[0].transit, null);
  assert.equal(r.meta.convergedYears, 0);
  const groups = Timing.groupYears(r.years);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, 'insufficient');
}

test('A sampled transit inside the active MD/AD retains its real PD', () => {
  const r = report(fixture());
  assert.equal(r.years[0].pass, true);
  assert.equal(r.years[0].period.ad, 'Moon');
  assert.equal(r.years[0].period.pd, 'Mercury');
  assert.equal(r.chronology[0].transit.observedOn, '2030-05-01');
  assert.equal(r.meta.convergedYears, 1);
  assert.equal(Timing.groupYears(r.years)[0].kind, 'event');
});

test('An overlapping forecast year cannot revive an expired dasha', () => {
  assertUncorroborated(report(fixture({}, { date: '2030-09-01' })));
});

test('The dasha end is exclusive when no following period is supplied', () => {
  assertUncorroborated(report(fixture({}, { date: '2030-06-01' })));
});

test('At an adjoining dasha boundary, select the newly active sub-period', () => {
  const f = fixture({}, { date: '2030-06-01' });
  f.d.planets.Mars = { house: 5 };
  f.data.dasha.push({
    from: '2030-06-01', to: '2031-01-01', md: 'Sun', ad: 'Mars'
  });
  const r = report(f);
  assert.equal(r.years[0].pass, true);
  assert.equal(r.years[0].period.ad, 'Mars');
  assert.equal(r.years[0].period.pd, null);
  assert.equal(r.meta.pdAvailable, true);
});

for (const [label, date] of [
  ['missing', undefined],
  ['malformed', 'not-a-date'],
  ['impossible calendar day', '2030-02-30'],
  ['non-leap February 29', '2030-02-29'],
  ['array rather than date text', ['2030-05-01']]
]) {
  test('The ' + label + ' observation cannot corroborate a period', () => {
    assertUncorroborated(report(fixture({}, { date })));
  });
}

test('A sample at the forecast-year end is outside that year', () => {
  assertUncorroborated(report(fixture(
    { to: '2032-01-01' }, { date: '2031-01-01' }
  )));
});

test('A sample before its forecast year is not linked to the chronology', () => {
  assertUncorroborated(report(fixture(
    { from: '2029-01-01' }, { date: '2029-12-31' }
  )));
});

test('The dasha and forecast-year starts are inclusive', () => {
  const r = report(fixture({}, { date: '2030-01-01' }));
  assert.equal(r.years[0].pass, true);
  assert.equal(r.chronology[0].transit.observedOn, '2030-01-01');
});

test('Missing pratyantara is not replaced by an invented PD', () => {
  const r = report(fixture({ pd: undefined }));
  assert.equal(r.years[0].pass, true);
  assert.equal(r.years[0].period.pd, null);
  assert.equal(r.meta.pdAvailable, false);
});

test('Invalid period dates and empty entries are ignored', () => {
  const f = fixture();
  f.data.dasha.unshift(
    null,
    { from: '2030-02-30', to: '2030-05-01', md: 'Sun', ad: 'Mars' },
    { from: '2030-05-01', to: '2030-01-01', md: 'Sun', ad: 'Mars' }
  );
  const r = report(f);
  assert.equal(r.all.length, 1);
  assert.equal(r.years[0].period.ad, 'Moon');
});

test('Reversed forecast windows are not counted as computed years', () => {
  const r = report(fixture({}, { from: '2031-01-01', to: '2030-01-01' }));
  assert.equal(r.years.length, 0);
  assert.equal(r.meta.convergedYears, 0);
});

test('Calendar validation respects Gregorian leap years and birth order', () => {
  assert.equal(Timing.ageAt('2000-02-29', '2024-02-29'), 24);
  assert.equal(Timing.ageAt('2000-02-29', '2023-02-28'), 22);
  assert.equal(Timing.ageAt('2000-02-29', '2100-02-29'), null);
  assert.equal(Timing.ageAt('2000-13-01', '2030-05-01'), null);
  assert.equal(Timing.ageAt('2031-01-01', '2030-05-01'), null);
});

test('Tamil planet names preserve the same timing facts', () => {
  const r = report(fixture({ md: 'சூரியன்', ad: 'சந்திரன்', pd: 'புதன்' }));
  assert.equal(r.years[0].pass, true);
  assert.equal(r.years[0].period.md, 'Sun');
  assert.equal(r.years[0].period.ad, 'Moon');
  assert.equal(r.years[0].period.pd, 'Mercury');
});

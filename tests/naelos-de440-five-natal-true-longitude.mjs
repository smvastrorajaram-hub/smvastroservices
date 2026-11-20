import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  NaelosEphemeris, julday,
  SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN
} from 'naelos-ephemeris';
import { getSwe, C } from '../public/horoscope/offline/wasm-provider.mjs';
import { sauraFivePlanetCheshtaInputs } from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import { bphsCheshtaFromOrbitalElements } from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import { sauraSiderealOffsetFromLahiri } from '../research/saura-bija/saura-de441-apparent-true.mjs';

const ROOT = new URL('../naelos-ephemeris/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', ROOT), 'utf8'));
const requiredFiles = ['ne-1900.bin', 'ne-2000.bin'];
const buffers = requiredFiles.map(name => {
  const entry = manifest.files.find(x => x.name === name);
  assert.ok(entry, 'manifest contains ' + name);
  const bytes = fs.readFileSync(new URL(name, ROOT));
  assert.equal(bytes.length, entry.bytes, name + ' exact byte length');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
    name + ' SHA-256 matches owner repository manifest');
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
});
assert.equal(manifest.source.name, 'JPL DE440', 'checked-in NAELOS source is JPL DE440');
assert.equal(manifest.format, 2, 'format-2 NAELOS binary tables');

const eph = NaelosEphemeris.fromBuffers(buffers);
const swe = await getSwe();
swe.setSiderealLahiri();

const bodies = Object.freeze([
  ['புதன்', 'Mercury', SE_MERCURY, C.MERCURY],
  ['சுக்கிரன்', 'Venus', SE_VENUS, C.VENUS],
  ['செவ்வாய்', 'Mars', SE_MARS, C.MARS],
  ['குரு', 'Jupiter', SE_JUPITER, C.JUPITER],
  ['சனி', 'Saturn', SE_SATURN, C.SATURN]
]);
const births = Object.freeze([
  ['1971-05-04', '05:05'],
  ['1974-01-11', '16:04'],
  ['1992-07-31', '22:05'],
  ['1994-06-15', '13:03'],
  ['2015-09-06', '09:30']
]);
const UTC_OFFSET_MINUTES = 330;
const MAX_ABS_RESIDUAL_ARCSEC = 5;
const norm = x => ((x % 360) + 360) % 360;
const signedArcsec = (a, b) => {
  const d = ((a - b + 540) % 360) - 180;
  return d * 3600;
};
const lahiriAyanamsaAt1860 = swe.ayanamsa(julday(1860, 1, 1, 0));
assert.ok(Number.isFinite(lahiriAyanamsaAt1860), 'Lahiri 1860 epoch ayanamsa finite');
const rows = [];
let maxAbsResidualArcsec = 0;
let sumSquares = 0;

for (const [date, time] of births) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // Independently convert the recorded Indian civil time into UTC JD.
  // Swiss utcToJd returns UT1 and ET; the small UTC↔UT1 difference is expected
  // and is bounded separately below. Both ephemerides are then evaluated at
  // the exact same ET/TT epoch.
  const localDecimalHour = hh + mm / 60;
  const civilDerivedJdUTC = julday(y, m, d, localDecimalHour - UTC_OFFSET_MINUTES / 60);
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh, mm) - UTC_OFFSET_MINUTES * 60_000);
  const swissJD = swe.utcToJd(
    utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(),
    utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds()
  );
  assert.ok(Number.isFinite(swissJD?.ut) && Number.isFinite(swissJD?.et),
    date + ' Swiss UTC-to-UT/ET conversion available');
  const ut1MinusUtcSeconds = (swissJD.ut - civilDerivedJdUTC) * 86400;
  assert.ok(Math.abs(ut1MinusUtcSeconds) < 2,
    date + ' Swiss UT1 versus civil UTC stays within the 2-second rotation-time allowance');
  // NAELOS calc() and Swiss swe_calc() both accept TT/ET Julian Day. Use
  // Swiss's UTC conversion result so both engines evaluate the exact same
  // dynamical instant; never pass UT to the direct calc() interface.
  const jdUT = swissJD.ut;
  const jdTT = swissJD.et;

  const ayanamsa = swe.ayanamsa(jdUT);
  assert.ok(Number.isFinite(ayanamsa), date + ' Lahiri ayanamsa finite');

  const chart = { date, time, jdUTC: civilDerivedJdUTC, jdUT, jdTT, ut1MinusUtcSeconds, ayanamsa, planets: {} };
  for (const [ta, en, naelosBody, swissBody] of bodies) {
    const naelos = eph.calc(jdTT, naelosBody, 0);
    assert.ok(!('error' in naelos), date + ' ' + en + ' NAELOS DE440 position available');
    assert.ok(Number.isFinite(naelos.longitude), date + ' ' + en + ' NAELOS true longitude finite');

    // NAELOS returns apparent geocentric longitude on the true ecliptic of
    // date. Subtract the same Lahiri ayanamsa used by SMV's Swiss chart engine
    // so the two longitudes are in the same sidereal coordinate frame.
    const naelosLahiri = norm(naelos.longitude - ayanamsa);
    const swiss = swe.calc(jdTT, swissBody, swe.siderealSpeedFlags());
    assert.ok(Number.isFinite(swiss?.longitude), date + ' ' + en + ' Swiss Lahiri position finite');
    const residualArcsec = signedArcsec(naelosLahiri, swiss.longitude);
    maxAbsResidualArcsec = Math.max(maxAbsResidualArcsec, Math.abs(residualArcsec));
    sumSquares += residualArcsec * residualArcsec;

    // Preserve the already-audited mean-longitude / Sheeghrocca input selector;
    // only the true geocentric input is independently replaced for this audit.
    const orbital = sauraFivePlanetCheshtaInputs(jdUT, en);
    // The already-certified Saura mean/Sheeghrocca pair is NOT Lahiri.
    // Transfer the DE440 apparent tropical true longitude into that same
    // Saura nirayana frame using the source-audited Burgess 1860 zero-point
    // carried by the date-specific Lahiri precession delta.
    const sauraSiderealOffset = sauraSiderealOffsetFromLahiri(
      ayanamsa, lahiriAyanamsaAt1860
    );
    const trueLongitudeSaura = norm(naelos.longitude - sauraSiderealOffset);
    const cheshta = bphsCheshtaFromOrbitalElements(
      orbital.meanLongitude, trueLongitudeSaura, orbital.sheeghrocha
    );
    assert.ok(Number.isFinite(cheshta.virupa) &&
      cheshta.virupa >= 0 && cheshta.virupa <= 60,
      date + ' ' + en + ' BPHS Chesta formula valid');

    chart.planets[en] = {
      trueLongitudeTropicalApparent: naelos.longitude,
      lahiriAyanamsa: ayanamsa,
      trueLongitudeLahiri: naelosLahiri,
      swissLahiriReference: swiss.longitude,
      sauraSiderealOffset,
      trueLongitudeSaura,
      signedResidualArcsec: residualArcsec,
      meanLongitudeSaura: orbital.meanLongitude,
      sheeghroccaSaura: orbital.sheeghrocha,
      cheshtaVirupaUsingNaelosTrue: cheshta.virupa,
      trueLongitudeSource: 'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440'
    };
  }
  rows.push(chart);
}

const comparisons = rows.length * bodies.length;
assert.equal(comparisons, 25, 'five births × five non-luminary grahas = 25 checks');
const perPlanetResiduals = Object.fromEntries(bodies.map(([, en]) => {
  const values = rows.map(r => Math.abs(r.planets[en].signedResidualArcsec));
  return [en, {
    maxAbsArcsec: Math.max(...values),
    rmsArcsec: Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length),
    rows: rows.map(r => ({ date: r.date, signedArcsec: r.planets[en].signedResidualArcsec }))
  }];
}));
console.log(JSON.stringify({
  diagnostic: 'NAELOS_DE440_VS_SWISS_LAHIRI_SAME_ET',
  maxAbsResidualArcsec,
  rmsResidualArcsec: Math.sqrt(sumSquares / comparisons),
  perPlanetResiduals,
  cheshtaRows: rows.map(r => ({
    date: r.date,
    planets: Object.fromEntries(Object.entries(r.planets).map(([name, p]) =>
      [name, { trueLongitudeSaura: p.trueLongitudeSaura,
        meanLongitudeSaura: p.meanLongitudeSaura,
        sheeghroccaSaura: p.sheeghroccaSaura,
        cheshtaVirupa: p.cheshtaVirupaUsingNaelosTrue }]))
  }))
}, null, 2));
assert.ok(maxAbsResidualArcsec <= MAX_ABS_RESIDUAL_ARCSEC,
  'all 25 NAELOS-vs-Swiss Lahiri true-longitude residuals <= 5 arcsec; max=' +
  maxAbsResidualArcsec);

console.log(JSON.stringify({
  pass: true,
  certificateScope: 'five specified Perambalur natal epochs; five BPHS Chesta grahas; true-longitude source parity only',
  engine: 'NAELOS Ephemeris 0.1.3',
  independentEphemeris: 'NASA/JPL DE440',
  checkedBinaryFiles: requiredFiles.map(name => {
    const x = manifest.files.find(f => f.name === name);
    return { name, bytes: x.bytes, sha256: x.sha256 };
  }),
  timeConvention: 'Birth IST converted to UTC JD; Swiss utcToJd supplies UT1/ET; UTC−UT1 is independently bounded to 2 seconds; NAELOS and Swiss calc are both evaluated at the same ET/TT instant',
  positionDefinition: 'NAELOS apparent geocentric tropical true longitude on true ecliptic of date; same-instant NAELOS/Swiss Lahiri parity check; Chesta input separately transferred into the source-audited Saura sidereal frame using the Burgess 1860 zero point plus date-specific Lahiri precession delta',
  frameTransfer: 'sauraSiderealOffsetFromLahiri(lahiriAyanamsaAtDate, lahiriAyanamsaAt1860)',
  lahiriAyanamsaAt1860,
  reference: 'SMV local Swiss Ephemeris Lahiri sidereal calc at the exact same TT/ET instant',
  comparisonCount: comparisons,
  maxAbsResidualArcsec,
  rmsResidualArcsec: Math.sqrt(sumSquares / comparisons),
  acceptanceMaxArcsec: MAX_ABS_RESIDUAL_ARCSEC,
  cheshtaInputPolicy: 'existing Saura-paksha mean longitude and Sheeghrocca retained; NAELOS DE440 true longitude used as independent true-position evidence',
  rows
}, null, 2));

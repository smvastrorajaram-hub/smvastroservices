import assert from 'node:assert/strict';
import {
  fetchSauraDe441Reference,
  sauraDe441ApparentTrueLongitude,
  sauraBijaLongitudeProducts,
  sauraSiderealOffsetFromLahiri,
  sauraIau76PrecessionLongitudeFromBurgessEpoch,
  sauraSiderealOffsetFromBurgessIau76,
  jplEclipticJ2000VectorToMeanEclipticOfDateLongitude,
  SAURA_DE441_TARGET_IDS
} from '../research/saura-bija/saura-de441-apparent-true.mjs';

const jdUt = 2458849.5;
const jd1860 = Date.UTC(1860,0,1)/86400000 + 2440587.5;
const jd2020 = Date.UTC(2020,0,1)/86400000 + 2440587.5;
assert.ok(Math.abs(sauraSiderealOffsetFromBurgessIau76(jd1860) - (18+5/60+8.25/3600)) < 1e-10);
assert.ok(Math.abs(sauraIau76PrecessionLongitudeFromBurgessEpoch(jd2020) - 2.234522726663259) < 1e-7);
assert.ok(Math.abs(sauraSiderealOffsetFromBurgessIau76(jd2020) - 20.32014772666326) < 1e-7);
const mercuryVector2020 = {
  x:0.1030424868682581,
  y:-1.429965253154608,
  z:-0.03180814613136105
};
assert.ok(Math.abs(
  jplEclipticJ2000VectorToMeanEclipticOfDateLongitude(mercuryVector2020,jd2020) -
  274.400974286077
) < 1e-7);
const jplResult = [
  'Ephemeris / API_USER test / Horizons',
  'Target body name: Mercury (199)                   {source: DE441}',
  'Center body name: Earth (399)                     {source: DE441}',
  'Center-site name: GEOCENTRIC',
  ' Date__(UT)__HR:MN:SC.fff, , ,    ObsEcLon,   ObsEcLat,',
  '$$SOE',
  ' 2020-Jan-01 00:00:00.000, , , 274.3833145, -1.2728377,',
  '$$EOE',
  "'ObsEcLon,   ObsEcLat,' =",
  'Observer-centered IAU76/80 ecliptic-of-date longitude and latitude'
].join('\n');

let requestedUrl = null;
const fakeFetch = async (url, options) => {
  requestedUrl = new URL(url);
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.accept, 'application/json');
  return {
    ok: true,
    status: 200,
    json: async () => ({
      signature: { version: 'test' },
      result: jplResult
    })
  };
};

const ref = await fetchSauraDe441Reference({
  planet: 'Mercury',
  jdUt,
  fetchImpl: fakeFetch
});
assert.equal(requestedUrl.origin, 'https://ssd.jpl.nasa.gov');
assert.equal(requestedUrl.pathname, '/api/horizons.api');
assert.equal(requestedUrl.searchParams.get('COMMAND'), "'199'");
assert.equal(requestedUrl.searchParams.get('CENTER'), "'500@399'");
assert.equal(requestedUrl.searchParams.get('TLIST_TYPE'), "'JD'");
assert.equal(requestedUrl.searchParams.get('TLIST'), "'" + jdUt.toFixed(8) + "'");
assert.equal(requestedUrl.searchParams.get('QUANTITIES'), "'31'");
assert.equal(requestedUrl.searchParams.get('TIME_TYPE'), "'UT'");
assert.equal(ref.ephemeris, 'DE441');
assert.equal(ref.quantity, 31);
assert.equal(ref.longitude, 274.3833145);
assert.equal(ref.latitude, -1.2728377);
assert.equal(ref.interpolated, false);
assert.equal(ref.observerCenter, '500@399');
assert.equal(SAURA_DE441_TARGET_IDS.Mercury,'199');
assert.equal(SAURA_DE441_TARGET_IDS.Venus,'299');
assert.equal(SAURA_DE441_TARGET_IDS.Mars,'4');
assert.equal(SAURA_DE441_TARGET_IDS.Jupiter,'5');
assert.equal(SAURA_DE441_TARGET_IDS.Saturn,'6');
assert.ok(Math.abs(sauraSiderealOffsetFromLahiri(23.9,23.3)-(18+5/60+8.25/3600+0.6))<1e-12);

const transformed = sauraDe441ApparentTrueLongitude(ref, 23.5);
assert.ok(Math.abs(transformed.trueLongitude - 250.8833145) < 1e-10);
assert.equal(transformed.kind, 'DE441_GEOCENTRIC_APPARENT_TRUE');
assert.equal(transformed.siderealOffsetDegrees, 23.5);
assert.throws(() => sauraDe441ApparentTrueLongitude({...ref, ephemeris:'DE430'},23.5), /DE441/);
assert.throws(() => sauraDe441ApparentTrueLongitude(ref,undefined), /offset/);

const products = sauraBijaLongitudeProducts(jdUt, 'Mercury', {
  de441Reference: ref,
  sauraSiderealOffsetDegrees: 23.5
});
assert.equal(products.outputsAreSeparate, true);
assert.equal(products.classicalBijaMean.kind, 'CLASSICAL_BIJA_MEAN');
assert.equal(products.classicalBijaTrue.kind, 'CLASSICAL_BIJA_TRUE');
assert.equal(products.de441ApparentTrue.kind, 'DE441_GEOCENTRIC_APPARENT_TRUE');
assert.notEqual(products.classicalBijaMean.frame, products.de441ApparentTrue.frame);
assert.notEqual(products.classicalBijaTrue.source, products.de441ApparentTrue.source);
assert.ok(Number.isFinite(products.classicalTrueMinusDe441Degrees));
assert.equal(products.productionEligible, false);
assert.throws(() => sauraBijaLongitudeProducts(jdUt + 1, 'Mercury', {
  de441Reference: ref, sauraSiderealOffsetDegrees: 23.5
}), /epoch must exactly match/);

await assert.rejects(
  () => fetchSauraDe441Reference({planet:'Mercury',jdUt,fetchImpl:async()=>({
    ok:true,status:200,json:async()=>({result:jplResult.replaceAll('DE441','DE430')})
  })}),
  /did not confirm/
);
await assert.rejects(
  () => fetchSauraDe441Reference({planet:'Mercury',jdUt,fetchImpl:async()=>({ok:false,status:503})}),
  /HTTP status 503/
);

console.log(JSON.stringify({
  pass:true,
  checks:38,
  liveApiFetchMocked:true,
  sourceHeaderEnforced:'DE441 target + Earth centre',
  request:'single discrete JD; Earth-geocentric observer quantity 31',
  outputProducts:['CLASSICAL_BIJA_MEAN','CLASSICAL_BIJA_TRUE','DE441_GEOCENTRIC_APPARENT_TRUE'],
  productionChanged:false
}));

import assert from 'node:assert/strict';
import {
  bvRamanIshtaKashta,
  bvRamanChestaForPhala,
  BV_RAMAN_ISHTA_KASHTA_SOURCE
} from '../public/horoscope/offline/bv-raman-ishta-kashta.browser.mjs';

let assertions = 0;
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); assertions++; };
const throws = (fn, pattern, label) => { assert.throws(fn, pattern, label); assertions++; };

// The method identity is explicit; do not call the square-root algorithm BPHS Ch.28.
eq(BV_RAMAN_ISHTA_KASHTA_SOURCE.method, 'BV_RAMAN_SQRT_ISHTA_KASHTA', 'source-specific method identifier');
eq(BV_RAMAN_ISHTA_KASHTA_SOURCE.notEquivalentTo, 'The distinct Rasmis procedure in BPHS Chapter 28', 'Rasmi method is not silently mixed');
eq(BV_RAMAN_ISHTA_KASHTA_SOURCE.sixfoldShadbalaIncluded, false, 'Ishta/Kashta is separate from the sixfold Shadbala sum');

// Exact mathematical oracle: U=36, C=25 => Ishta=30; Kashta=sqrt(840).
const exact = bvRamanIshtaKashta({ uchchaBala: 36, cheshtaBala: 25 });
eq(exact.ishtaPhala, 30, 'exact Ishta numeric oracle');
eq(exact.kashtaPhala, 28.98, 'exact Kashta numeric oracle');
eq(exact.chartInputsCertified, false, 'math unit test does not certify real chart inputs');
eq(exact.formulaVerified, true, 'formula code independently identified as verified');

// Boundary behavior: all four corners of the defined 0..60 domain.
const corners = [
  [{uchchaBala:0,cheshtaBala:0},0,60],
  [{uchchaBala:0,cheshtaBala:60},0,0],
  [{uchchaBala:60,cheshtaBala:0},0,0],
  [{uchchaBala:60,cheshtaBala:60},60,0]
];
for (const [input,ishta,kashta] of corners) {
  const r = bvRamanIshtaKashta(input);
  eq(r.ishtaPhala, ishta, 'boundary Ishta ' + JSON.stringify(input));
  eq(r.kashtaPhala, kashta, 'boundary Kashta ' + JSON.stringify(input));
}
throws(() => bvRamanIshtaKashta({uchchaBala:-0.01,cheshtaBala:20}), /0\.\.60/, 'negative Uchcha rejected');
throws(() => bvRamanIshtaKashta({uchchaBala:61,cheshtaBala:20}), /0\.\.60/, 'over-range Uchcha rejected');
throws(() => bvRamanIshtaKashta({uchchaBala:20,cheshtaBala:NaN}), /Finite/, 'NaN Chesta rejected');
throws(() => bvRamanIshtaKashta({uchchaBala:20}), /Finite/, 'missing Chesta rejected');

// Sun/Moon special Chesta-for-Phala formulas are separate from sixfold Chesta.
const sun = bvRamanChestaForPhala({
  planet:'சூரியன்',
  sunSayanaLongitude:202 + 10/60
});
eq(sun.reducedChestaKendra, 67 + 50/60, 'Sun special reduced Chesta Kendra');
eq(Math.round(sun.cheshtaForPhalaRaw * 1000000) / 1000000, 22.611111, 'Sun exact divide-by-three arithmetic');
eq(sun.astronomicalInputsCertified, false, 'Sun source formula does not certify ephemeris input');

const moon = bvRamanChestaForPhala({
  planet:'சந்திரன்',
  sunNirayanaLongitude:180 + 53/60 + 55/3600,
  moonNirayanaLongitude:311 + 17/60 + 19/3600
});
eq(Math.round(moon.cheshtaForPhalaRaw * 1000000) / 1000000, 43.463333, 'Moon longitude-difference arithmetic');

// Circular midpoint across 0 degrees, which naive arithmetic averaging mishandles.
const mars = bvRamanChestaForPhala({
  planet:'செவ்வாய்',
  meanLongitude:350,
  trueLongitude:10,
  sheeghroccaLongitude:60
});
eq(mars.midpoint, 0, 'mean/true midpoint crosses zero correctly');
eq(mars.cheshtaForPhalaRaw, 20, 'Sighrocca midpoint difference / 3');
throws(() => bvRamanChestaForPhala({
  planet:'குரு',meanLongitude:0,trueLongitude:180,sheeghroccaLongitude:90
}), /ambiguous/, 'ambiguous 180-degree arc rejected instead of guessed');
throws(() => bvRamanChestaForPhala({planet:'சூரியன்'}), /Sayana solar/, 'Sun missing longitude rejected');
throws(() => bvRamanChestaForPhala({planet:'சந்திரன்',sunNirayanaLongitude:100}), /Nirayana longitudes/, 'Moon missing longitude rejected');
throws(() => bvRamanChestaForPhala({planet:'சனி',meanLongitude:1,trueLongitude:2}), /Sighrocca/, 'five-graha missing Sighrocca rejected');

console.log(JSON.stringify({
  pass:true,
  assertions,
  scope:'B.V. Raman square-root Ishta/Kashta formula + separate Sun/Moon/five-graha Chesta-for-Phala arithmetic',
  sixfoldShadbalaCertified:false,
  natalInputsCertified:false,
  sourceExampleReconciliation:'separately blocked: printed/transcribed input/output inconsistencies must be reconciled before chart integration'
}));

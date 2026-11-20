import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bvRamanIshtaKashta,
  bvRamanChestaForPhala,
  BV_RAMAN_ISHTA_KASHTA_SOURCE
} from '../public/horoscope/offline/bv-raman-ishta-kashta.browser.mjs';

let assertions = 0;
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); assertions++; };
const throws = (fn, pattern, label) => { assert.throws(fn, pattern, label); assertions++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    label + ': expected ' + expected + ' ± ' + tolerance + ', received ' + actual);
  assertions++;
};

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
near(sun.reducedChestaKendra, 67 + 50/60, 1e-9, 'Sun special reduced Chesta Kendra');
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

const horoscopeSource=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const browserEngineSource=fs.readFileSync(new URL('../public/horoscope/offline/true-bphs-naelos-engine.browser.mjs',import.meta.url),'utf8');
const wrapperSource=fs.readFileSync(new URL('../public/horoscope/offline/server-wrapper.browser.mjs',import.meta.url),'utf8');
const horoscopeCss=fs.readFileSync(new URL('../public/horoscope/horoscope.css',import.meta.url),'utf8');
assert.ok(horoscopeSource.includes('data-smv-ishta-kashta="1"'),'BPHS result panel is mounted in Advanced Analysis > Chart Analysis'); assertions++;
assert.ok(horoscopeSource.includes('p.strength6?.ishtaKashta')&&horoscopeSource.includes('data-engine-source="TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA"'),'Chart Analysis renders Ishta/Kashta only from the integrated BPHS Chapter 28 engine result'); assertions++;
assert.ok(horoscopeSource.includes('mountTrueBphsIshtaKashta')&&!horoscopeSource.includes('mountBVRamanIshtaKashta'),'the customer UI selects the TRUE BPHS renderer, not the older B.V. Raman renderer'); assertions++;
assert.ok(browserEngineSource.includes('calculateBphsIshtaKashta')&&browserEngineSource.includes('TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA'),'NAELOS engine owns the BPHS Chapter 28 calculation'); assertions++;
assert.ok(wrapperSource.includes('TRUE_BPHS_SHADBALA_NAELOS_DE440')&&wrapperSource.includes('applyTrueBphsResultToChart'),'the Horoscope wrapper attaches NAELOS BPHS strength6 output to the chart'); assertions++;
assert.ok(horoscopeSource.includes("'சேஷ்டா-பலன் உள்ளீடு'")&&!horoscopeSource.includes('சேஷ்டா (இஷ்ட/கஷ்ட)'),'UI keeps Cheshta-for-Phala distinct from the sixfold Shadbala Cheshta label'); assertions++;
assert.ok(horoscopeSource.includes('BPHS அத்தியாயம் 28')&&horoscopeSource.includes('BPHS Chapter 28'),'the visible Tamil and English explanation names the correct BPHS chapter'); assertions++;
assert.ok(horoscopeSource.includes('NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1'),'the UI result identifies the single Effective Lahiri reference frame'); assertions++;
assert.ok(!horoscopeSource.includes('bvRamanChestaForPhala')&&!horoscopeSource.includes('bvRamanIshtaKashta'),'presentation layer does not independently calculate Ishta/Kashta with B.V. Raman formulas'); assertions++;
assert.ok(horoscopeCss.includes('.smv-ayurdaya-scroll')&&horoscopeCss.includes('overflow-x:auto!important'),'Horoscope Ayurdaya scroll style is source-guarded'); assertions++;
assert.ok(!horoscopeSource.includes('strength3'),'old BPHS strength3 is absent from customer Horoscope source'); assertions++;

console.log(JSON.stringify({
  pass:true,
  assertions,
  scope:'B.V. Raman formula unit oracle remains separate; the customer Horoscope UI exclusively renders NAELOS TRUE BPHS Chapter 28 Ishta/Kashta',
  sixfoldShadbalaCertified:false,
  natalInputsCertified:false,
  productionIntegration:true,
  classicalCertified:false
}));

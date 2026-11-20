import assert from 'node:assert/strict';

/**
 * Coverage inventory for BPHS I (R. Santhanam), Vol. I, Chapter 27.
 * A row means a graha/component rule has a named primary-source locator.
 * It does NOT mean that the row has an independent natal numerical oracle.
 */

const grahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const components = ['sthana', 'dig', 'kala', 'cheshta', 'naisargika', 'drik'];
const rule = {
  sthana: {
    source: 'BPHS I, Santhanam, Ch.27, positional-strength verses and subrules',
    algorithm: 'BPHS_STHANA_SOURCE_RULES',
    independentOracle: 'tests/bphs-shadbala-combined-regression.mjs:positional-oracle',
    numericalScope: 'rule/formula regression; not a separately printed complete natal 7-graha matrix'
  },
  dig: {
    source: 'BPHS I, Santhanam, Ch.27, Dig Bala verses',
    algorithm: 'BPHS_DIG_DIRECTIONAL_ARC',
    independentOracle: 'source-derived directional-arc formula checks',
    numericalScope: 'formula-level only; no full independent per-natal printed table'
  },
  kala: {
    source: 'BPHS I, Santhanam, Ch.27, Kala Bala verses; sunrise/day-night and time-lord subrules',
    algorithm: 'BPHS_KALA_NINE_SUBCOMPONENTS',
    independentOracle: 'tests/bphs-shadbala-combined-regression.mjs:temporal-oracle',
    numericalScope: 'five sample chart arithmetic; sunrise approximation remains disclosed'
  },
  cheshta: {
    source: 'BPHS I, Santhanam, Ch.27, vv.24–25',
    algorithm: 'BPHS_CHESHTA_MEAN_TRUE_SHEEGHROCHCHA',
    independentOracle: 'Jacobi 1912 historical tables are only a partial source comparator; no all-epoch exact-time oracle',
    numericalScope: 'BLOCKED: complete coherent historical Mean/True/Sheeghroccheya chain not independently verified'
  },
  naisargika: {
    source: 'BPHS I, Santhanam, Ch.27, Naisargika Bala verse/table',
    algorithm: 'BPHS_NAISARGIKA_FIXED_GRAHA_ORDER',
    independentOracle: 'printed constants and seven-graha constant-order regression',
    numericalScope: 'seven graha constants; this component alone does not certify the complete Shadbala'
  },
  drik: {
    source: 'BPHS I, Santhanam, Ch.27, v.19; printed p.284',
    algorithm: 'BPHS_DRIG_QUARTER_PINDA_PLUS_FULL_MERCURY_JUPITER',
    independentOracle: 'tests/bphs-shadbala-combined-regression.mjs:independent angular interpolation',
    numericalScope: '35 graha/date Drig computations across five births; aggregation regression only'
  }
};
const rows = grahas.flatMap(graha => components.map(component => ({
  graha, component,
  source: rule[component].source,
  algorithm: rule[component].algorithm,
  independentOracle: rule[component].independentOracle,
  numericalScope: rule[component].numericalScope,
  sourceRuleMapped: true,
  independentNatalNumericalCertified: false
})));
assert.equal(rows.length, 42);
assert.equal(new Set(rows.map(x => x.graha + ':' + x.component)).size, 42);
for (const graha of grahas) {
  for (const component of components) {
    assert.ok(rows.some(x => x.graha === graha && x.component === component));
  }
}
const limitations = [
  'The current production strength6 implementation is B.V. Raman, not a BPHS full-six-Bala engine.',
  'The existing BPHS regression suite is research/source-rule testing; it explicitly reports fullShadbalaCertified:false.',
  'The five eligible BPHS Cheshta triples are not yet backed by an independent same-frame historical exact-birth-time oracle.',
  'The Jacobi 1912 source ends at 2000 AD and its tabulated values are for mean sunrise at Lanka; it does not directly certify 2001–2399 or exact birth-time values.',
  'A source locator, arithmetic PASS, modern DE440 parity, or 1912 worked example is not interchangeable with independent per-natal historical proof.'
];
const result = {
  pass: true,
  mappedRows: rows.length,
  grahas: grahas.length,
  components: components.length,
  completeIndependentNumericalMatrix: false,
  classicalCertified: false,
  productionEligible: false,
  limitations,
  rows
};
console.log(JSON.stringify(result));

import assert from 'node:assert/strict';

/**
 * H. Jacobi, "The Planetary Tables", Epigraphia Indica XII (1912), pp.79–120.
 *
 * This is a transcription/arithmetic regression for Jacobi's explicit
 * 12-Apr-1168 mean-longitude table and his worked True-longitude examples
 * for Venus and Saturn (pp.80–82). It is NOT a 600-epoch oracle and it does
 * NOT certify arbitrary birth instants. Jacobi states that his tables are
 * based on the Sūrya-Siddhānta without Bīja and were calculated from Warren's
 * Kalasankalita; that shared source lineage is retained as provenance.
 */

const arc = (degrees, minutes = 0) => degrees * 60 + minutes;
const fromArc = value => ((value % (360 * 60)) + (360 * 60)) % (360 * 60);
const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    label + ': actual=' + actual + ' expected=' + expected + ' tolerance=' + tolerance);

// Jacobi's printed three-row table for mean sunrise at Lanka, 12 April 1168.
// The annual row, 800-year increment and elapsed-day increment are transcribed
// as printed. Values are degrees/minutes, not decimal degrees.
const rows = {
  Mercury: [arc(281, 50), arc(197, 52), arc(57, 25)],
  Venus:   [arc(159, 49), arc(233, 39), arc(163, 25)],
  Mars:    [arc(324, 54), arc(248, 21), arc(53, 27)],
  Jupiter: [arc(123, 51), arc(200, 20), arc(8, 29)],
  Saturn:  [arc(349, 15), arc(309, 28), arc(3, 25)],
  Sun:     [arc(256, 8),  arc(19, 43),  arc(100, 32)]
};
const expectedSums = {
  Mercury: arc(537, 57),
  Venus: arc(556, 53),
  Mars: arc(626, 42),
  Jupiter: arc(332, 40),
  Saturn: arc(662, 8),
  Sun: arc(376, 23)
};
const expectedModulo = {
  Mercury: arc(177, 57),
  Venus: arc(196, 53),
  Mars: arc(266, 42),
  Jupiter: arc(332, 40),
  Saturn: arc(302, 8),
  Sun: arc(16, 23)
};
const rowSums = {};
for (const [planet, parts] of Object.entries(rows)) {
  const sum = parts.reduce((a, b) => a + b, 0);
  rowSums[planet] = sum;
  if (planet === 'Mercury') {
    // Jacobi p.80 prints 281°50′ + 197°52′ + 57°25′ (=537°07′),
    // but the same page's Sum row says 537°57′. Preserve this 50′
    // printed decomposition inconsistency; do not silently repair it.
    assert.equal(sum, arc(537, 7), 'Mercury three printed addends');
    assert.equal(expectedSums[planet] - sum, 50, 'Mercury printed Sum-row discrepancy is exactly 50′');
  } else {
    assert.equal(sum, expectedSums[planet], planet + ' three-row sum');
  }
  assert.equal(fromArc(expectedSums[planet]), expectedModulo[planet],
    planet + ' normalized longitude from the directly printed Sum row');
}
// Jacobi's printed "or" line also appears to carry transcription/printing
// errors for Mercury (177°07′) and Sun (16°32′). The source Sum rows normalize
// to 177°57′ and 16°23′ respectively; keep both strings as audited anomalies.
const printedModuloLine = { Mercury: arc(177, 7), Venus: arc(196, 53),
  Mars: arc(266, 42), Saturn: arc(302, 8), Sun: arc(16, 32) };
assert.equal(expectedModulo.Mercury - printedModuloLine.Mercury, 50,
  'Mercury printed modulo-line discrepancy is 50′');
assert.equal(expectedModulo.Sun - printedModuloLine.Sun, -9,
  'Sun printed modulo-line discrepancy is 9′');

// Jacobi Venus worked example, pp.80–81. Table equations and each rounded
// intermediate are transcribed as printed, then recomposed independently.
const venus = (() => {
  const mean = arc(196, 53), meanSun = arc(16, 23), apsis = arc(79, 51);
  const firstCommutation = -arc(1, 19);
  const once = meanSun - arc(0, 40); // printed half of -1°19′
  assert.equal(once, arc(15, 43));
  assert.equal(apsis - once, arc(64, 8));
  const twice = once + arc(0, 48); // half of +1°36′
  assert.equal(twice, arc(16, 31));
  assert.equal(apsis - twice, arc(63, 20));
  const thrice = meanSun + arc(1, 35);
  assert.equal(thrice, arc(17, 58));
  assert.equal(mean - thrice, arc(178, 55));
  const result = thrice + arc(2, 51);
  return { once, twice, thrice, result };
})();
assert.equal(venus.result, arc(20, 49), 'Jacobi printed true Venus = 20°49′');

// Jacobi Saturn worked example, pp.81–82. All half-equations and whole
// equations follow Jacobi's printed rounding, not a modern recomputation.
const saturn = (() => {
  const mean = arc(302, 8), meanSun = arc(16, 23), apsis = arc(596, 27);
  const once = mean + arc(2, 57); // half of printed +5°55′
  assert.equal(once, arc(305, 5));
  assert.equal(apsis - once, arc(291, 22));
  const twice = once - arc(3, 34); // half of printed -7°09′
  assert.equal(twice, arc(301, 31));
  assert.equal(apsis - twice, arc(294, 56));
  const thrice = mean - arc(6, 57);
  assert.equal(thrice, arc(295, 11));
  const commutation = meanSun + 360 * 60 - thrice;
  assert.equal(commutation, arc(81, 12));
  const result = thrice + arc(6, 9);
  return { once, twice, thrice, commutation, result };
})();
assert.equal(saturn.result, arc(301, 20), 'Jacobi printed true Saturn = 301°20′');

const report = {
  pass: true,
  source: 'H. Jacobi, The Planetary Tables, Epigraphia Indica XII (1912), pp.79–120',
  sourceLocator: 'Mean example p.80; true Venus/Saturn examples pp.80–82; Tables I–V pp.84–120',
  epoch: '1168-04-12, mean sunrise at Lanka',
  meanLongitudesChecked: 6,
  meanTableInternalAnomalies: [
    'Mercury three-row addends total 537°07′ while printed Sum row states 537°57′',
    'Mercury printed modulo row states 177°07′ while printed Sum row normalizes to 177°57′',
    'Sun printed modulo row states 16°32′ while printed Sum row normalizes to 16°23′'
  ],
  directTrueWorkedExamplesChecked: 2,
  trueResults: { VenusDegrees: 20 + 49 / 60, SaturnDegrees: 301 + 20 / 60 },
  sourceLineage: 'Sūrya-Siddhānta without Bīja; Jacobi states tables were calculated from Warren, Kalasankalita',
  independentHistoricalCoverage: false,
  arbitraryNatalEpochCoverage: false,
  exactBirthTimeCoverage: false,
  productionEligible: false
};
console.log(JSON.stringify(report));

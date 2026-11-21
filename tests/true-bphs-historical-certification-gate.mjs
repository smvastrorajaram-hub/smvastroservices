import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const engine = read('../public/horoscope/offline/true-bphs-naelos-engine.browser.mjs');
const ledger = JSON.parse(read('../research/natal-classical-certification/historical-longitude-evidence-ledger.json'));
const audit = read('../research/natal-classical-certification/REMAINING_TWO_PHASE_EVIDENCE_AUDIT.md');

assert.match(engine, /classicalCertified:false/);
assert.match(engine, /trueLongitudeHistoricalCertified:false/);
assert.match(engine, /TRUE_BPHS_CH27_V365_MEAN_NAELOS_TRUE_LONGITUDE/);
assert.match(engine, /sauraFivePlanetCheshtaInputs/);
assert.match(engine, /bphsFivePlanetCheshtaFromClassicalMeans/);

assert.equal(ledger.status, 'PARTIAL_NOT_CERTIFIED');
assert.equal(ledger.productionEligible, false);
assert.equal(ledger.annualCoverage.independentHistoricalOracleVerifiedRows, 0);
assert.equal(ledger.trueLongitudeAudit.strictModernAccuracyGatePass, false);
assert.equal(ledger.sheeghroccheyaAudit.status, 'LIMITED_SOURCE_EXAMPLE_WITH_SATURN_CONFLICT');

assert.match(audit, /independent historical.*oracle/i);
assert.match(audit, /Jupiter Drik/i);
assert.match(audit, /0\.0532318994°/);

console.log(JSON.stringify({
  pass: true,
  verdict: 'NOT_CERTIFIED',
  productionClassicalCertified: false,
  independentHistoricalOracleRows: ledger.annualCoverage.independentHistoricalOracleVerifiedRows,
  modernTrueLongitudeAccuracyGate: ledger.trueLongitudeAudit.strictModernAccuracyGatePass,
  sheeghroccheyaStatus: ledger.sheeghroccheyaAudit.status,
  source: 'TRUE BPHS production source + historical evidence ledger'
}, null, 2));

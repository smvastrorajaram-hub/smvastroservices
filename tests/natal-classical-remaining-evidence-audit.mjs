import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const lon=json('../research/natal-classical-certification/historical-longitude-evidence-ledger.json');
const bala=json('../research/natal-classical-certification/shadbala-source-evidence-42.json');
const eq=(a,b,m)=>assert.equal(a,b,m), ok=(v,m)=>assert.ok(v,m);
eq(lon.scope.civilYears[0],1800,'starts 1800'); eq(lon.scope.civilYears[1],2399,'ends 2399');
eq(lon.scope.oneSeededRandomNatalChartPerYear,600,'600 annual charts');
eq(lon.rows.length,15,'five planets × three longitude types');
eq(lon.annualCoverage.randomNatalCharts,600,'600 chart samples');
eq(lon.annualCoverage.grahaLongitudeCandidateRows,3000,'3,000 candidate rows');
eq(lon.annualCoverage.independentHistoricalOracleVerifiedRows,0,'random coverage not an historical oracle');
eq(lon.meanSourceAudit.maxResidualArcsec,0.9674,'Burgess anchor residual retained');
eq(lon.trueLongitudeAudit.strictModernAccuracyGatePass,false,'modern 0.05 degree gate fails');
eq(lon.sheeghroccheyaAudit.status,'LIMITED_SOURCE_EXAMPLE_WITH_SATURN_CONFLICT','Saturn table conflict retained');
eq(lon.officialGovernmentPAC2026Benchmark.status,'PASS_EXISTING_CERTIFICATE','existing Government PAC 2026 certificate is reused');
eq(lon.officialGovernmentPAC2026Benchmark.scope.comparisons,1825,'PAC 2026 full-year 1,825-row certificate is recorded');
eq(lon.officialGovernmentPAC2026Benchmark.scope.timeScale,'TT','PAC 2026 comparison remains TT-only');
eq(lon.officialGovernmentPAC2026Benchmark.requiredAgain,false,'PAC 2026 certificate is not needlessly repeated');
eq(Object.hasOwn(lon,'independentEphemerisAcquisition'),false,'no unwanted IENA/IAE edition hunt remains');
eq(lon.acquisitionPolicy.status,'NO_ADDITIONAL_ANNUAL_GOVERNMENT_EPHEMERIS_EDITIONS_REQUIRED','no extra annual editions are requested');
for(const p of lon.scope.visiblePlanets) for(const q of ['mean','true','sheeghroccheya'])
 ok(lon.rows.some(r=>r.planet===p&&r.quantity===q),p+' '+q+' row present');
eq(bala.rows.length,42,'42 Bala rows');
eq(bala.counts.sourceExamplePass,36,'36 source example matches');
eq(bala.counts.notApplicableSourceEllipsis,2,'2 Chesta N/A');
eq(bala.counts.sourceDiscrepancy,4,'4 component discrepancies');
eq(bala.genericCertification.classicalCertified,false,'generic natal remains uncertified');
eq(bala.genericCertification.evidenceGateEligibleRows,0,'sample rows not per-natal proof');
const keys=new Set(bala.rows.map(r=>r.graha+':'+r.component)); eq(keys.size,42,'all component pairs unique');
for(const g of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'])
 for(const c of ['sthana','dig','kala','cheshta','naisargika','drik']) ok(keys.has(g+':'+c),g+' '+c);
for(const row of bala.rows){ok(row.sourceBook.includes('B. V. Raman'),row.graha+' source book');ok(row.sourcePage.length>0,row.graha+' page locator');}
for(const id of ['BVR_MARS_KALA_SUMMARY','BVR_SATURN_SHEEGHROCCHEYA','BVR_SUN_TOTAL_ARITHMETIC'])
 ok(bala.sourceDiscrepancies.some(r=>r.id===id),id+' recorded');
console.log(JSON.stringify({pass:true,longitudeRows:lon.rows.length,balaRows:bala.rows.length,balaCounts:bala.counts,ordinaryNatalClassicalCertified:false}));

/** C.G. Rajan Part I research-only natural arithmetic against five real
 * Perambalur natal sidereal Swiss longitudes. These chart positions are
 * NOT independently certified to be identical to the book's epoch model.
 * NEVER add seven components into any human lifespan/death-age number.
 */
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanSevenNaturalResearch as natural}
from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
const births=[
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']
];
let assertions=0,grahaRows=0;
const ok=(v,m)=>{assert.ok(v,m);assertions++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++};
const signatures=[];
for(const [date,time] of births){
 const res=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',
  name:'CG Rajan Ayurdaya PRIVATE research regression'});
 ok(res.ok,date+' chart computed');
 const q=natural({planets:res.chart.planets});
 eq(q.grahaCount,7,date+' all grahas');
 eq(q.publishedToCustomers,false,date+' no customer predictions');
 eq(q.fullAyurdayaCertified,false,date+' whole Ayurdaya NOT certified');
 eq(q.natalTotalYears,null,date+' no combined life expectancy');
 eq(q.predictedDeathAge,null,date+' no death-age forecast');
 eq(q.otherAyurdayaSystemsCombined,false,date+' no Uttara mixed in');
 const sig=[];
 for(const v of Object.values(q.byPlanet)){
  grahaRows++;
  ok(Number.isFinite(v.remainingArcDegrees)&&v.remainingArcDegrees>=180&&
    v.remainingArcDegrees<=360,date+' '+v.planet+' angular range');
  ok(Number.isFinite(v.theoreticalNaturalYearComponent)&&
    v.theoreticalNaturalYearComponent>=v.maximumNaturalYears/2-1e-9&&
    v.theoreticalNaturalYearComponent<=v.maximumNaturalYears+1e-9,
    date+' '+v.planet+' source range');
  eq(v.individualLifespanCertified,false,date+' '+v.planet+' not certified');
  eq(v.predictedDeathAge,null,date+' '+v.planet+' no personal death age');
  sig.push(v.remainingArcDegrees.toFixed(5));
 }
 signatures.push(sig.join(','));
}
eq(grahaRows,35,'5 births × 7 natural components');
eq(new Set(signatures).size,5,'5 natal charts produce distinct outputs');
console.log(JSON.stringify({pass:true,assertions,births:5,sevenGrahaRows:grahaRows,
 positionSource:'existing offline Swiss sidereal chart; NOT independent historical orbiter certification',
 fullLifespanCertificate:false,personalDeathAgesCalculated:0,
 productionOutputChanged:false,uttaraCalculationUsed:false}));

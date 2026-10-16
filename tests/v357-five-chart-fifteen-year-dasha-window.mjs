// V357: real offline Vimshottari MD/AD 15-year report-window invariant.
// Five sample births; does not generate 15 years of Swiss transit forecasts
// and does not certify textual predictions.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {clipPeriods,yearAfter} from '../public/horoscope/d1-15-year-reading.mjs';
const cases=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const ref='2026-10-16';
let assertions=0;
const eq=(a,b,description)=>{assert.deepEqual(a,b,description);assertions++};
const ok=(a,description)=>{assert.ok(a,description);assertions++};
eq(yearAfter('2024-02-29',1),'2025-02-28','Feb 29 next-year normalization');
eq(yearAfter('2024-02-29',4),'2028-02-29','Feb 29 four-year');
eq(yearAfter('2026-10-16',15),'2041-10-16','15-year date cutoff');
const summaries=[];
for(const [date,time] of cases){
 const computed=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:ref,name:'V357 15-year Vimshottari'});
 ok(computed.ok,date+' horoscope full available');
 const output=clipPeriods(computed,ref);
 eq(output.referenceDate,ref,date+' must begin at report date, not birth');
 eq(output.end,'2041-10-16',date+' exactly next 15 years');
 ok(output.periods.length>0,date+' has MD/AD periods');
 eq(output.periods[0].from,ref,date+' first period begins at requested date');
 eq(output.periods.at(-1).to,output.end,date+' last period ends at limit');
 for(let i=0;i<output.periods.length;i++){
  const p=output.periods[i];
  ok(p.md&&p.ad&&p.from<p.to,date+' MD/AD segment has actual lords/positive length '+i);
  ok(p.from>=ref&&p.to<=output.end,date+' segment inside window '+i);
  if(i>0)eq(output.periods[i-1].to,p.from,date+' no MD/AD gap or overlap '+i);
 }
 summaries.push({date,mahadashaBhuktiSegments:output.periods.length,from:output.referenceDate,to:output.end,derivedContinuations:output.continuationCount});
}
console.log(JSON.stringify({pass:true,assertions,scope:'5 natal charts continuous next-15y Vimshottari MD/AD periods; no transit/prediction-quality certification',referenceDate:ref,years:15,cases:summaries,shodhana:'SKIPPED'}));
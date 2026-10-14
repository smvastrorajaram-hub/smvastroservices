/* SMV ASTRO — strictly validate existing V311 MD/AD/PD and transit inputs.
 * This is an interpretation-input boundary, NOT an ephemeris, birth, payment,
 * dasha, chart, or PDF calculation replacement.  Preserve computed PD output.
 * Load after timing.js, before integrated.js.
 */
(function(root){'use strict';
 const original=root.SMVD311Timing;
 if(!original||typeof original.timeline!=='function'||original.strictCalendarGuard===true)return;
 const ISO=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
 function validDate(value){
  if(typeof value!=='string'||!ISO.test(value))return false;
  const timestamp=Date.parse(value+'T00:00:00.000Z');
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===value;
 }
 const validRange=(from,to)=>validDate(from)&&validDate(to)&&from<to;
 const inRange=(date,from,to)=>date>=from&&date<to;
 function prepare(source){
  const t=source&&typeof source==='object'?source:{};
  const reference=validDate(t.referenceDate)?t.referenceDate:validDate(t.from)?t.from:null;
  const end=validDate(t.end)?t.end:null;
  // Explicitly malformed forecast metadata must not silently disable bounds.
  const malformedBounds=(t.referenceDate!=null&&!validDate(t.referenceDate))||
    (t.end!=null&&!validDate(t.end))||Boolean(reference&&end&&reference>=end);
  const dasha=(Array.isArray(t.dasha)?t.dasha:[]).filter(p=>p&&validRange(p.from,p.to));
  const transitYears=(Array.isArray(t.transitYears)?t.transitYears:[])
   .filter(y=>y&&validRange(y.from,y.to)&&(!reference||y.to>reference)&&(!end||y.from<end))
   .map(y=>{
    const validSample=!malformedBounds&&validDate(y.date)&&inRange(y.date,y.from,y.to)&&
      (!reference||y.date>=reference)&&(!end||y.date<end);
    // Retain the forecast-year row so that the original engine explicitly
    // reports an insufficient-evidence window instead of fabricating an event.
    return validSample?y:{...y,date:null,notes:[]};
   });
  return {...t,dasha,transitYears};
 }
 function timeline(d,claims,forecast,birth){
  return original.timeline(d,claims,prepare(forecast),validDate(birth)?birth:null);
 }
 function periods(forecast,birth){return original.periods(prepare(forecast),validDate(birth)?birth:null);}
 function computePD(rows,forecast){
  const validRows=(Array.isArray(rows)?rows:[]).filter(p=>p&&validRange(p.from,p.to));
  return original.computePD(validRows,prepare(forecast));
 }
 function ageAt(birth,on){return validDate(birth)&&validDate(on)&&birth<=on?original.ageAt(birth,on):null;}
 const guarded=Object.freeze({...original,validDate,validRange,prepare,timeline,periods,computePD,ageAt,strictCalendarGuard:true});
 root.SMVD311Timing=guarded;
 if(typeof module==='object'&&module.exports)module.exports=guarded;
})(typeof window==='object'?window:globalThis);

/* V311 / 2 of 4. Verified MD/AD and optional PD, computed slow-planet transit convergence.
 * Never generates fictitious dates/PD; uses upstream offline Swiss forecast once per chart.
 */
(function(g,f){const v=f(g);g.SMVD311Timing=v;if(typeof module==='object'&&module.exports)module.exports=v;})(typeof window==='object'?window:globalThis,function(g){'use strict';
const j=()=>g.SMVD311Judgement;
function valid(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const [year,month,date]=x.split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return year>=1&&month>=1&&month<=12&&date>=1&&date<=days[month-1];
}
const validWindow=y=>valid(y?.from)&&valid(y?.to)&&y.from<y.to;
const validObservation=y=>validWindow(y)&&valid(y?.date)&&y.from<=y.date&&y.date<y.to;
/* P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach, PDF p224:
 * distribute each COMPLETE Antardasha among nine Pratyantaras according to
 * Vimshottari planetary years. Calendar dates are rounded at day precision.
 * Never extrapolate a truncated AD at a forecast boundary.
 */
const DASHA_ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
const DAY=86400000;
function asDay(date){if(!valid(date))return NaN;const d=new Date(date+'T00:00:00Z');return d.toISOString().slice(0,10)===date?d.getTime()/DAY:NaN;}
function fromDay(day){return new Date(day*DAY).toISOString().slice(0,10);}
function computePD(periods,forecast){
 const reference=forecast?.referenceDate||forecast?.from||null;
 const end=forecast?.end||null;const segments=[],skipped=[];
 for(let i=0;i<periods.length;i++){
  const p=periods[i];if(p.pd)continue;const a=asDay(p.from),b=asDay(p.to);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||!DASHA_YEARS[p.ad])continue;
  // A first/last partial AD is NOT its full period, so its PD lord cannot
  // be assigned correctly using the clipped range. Skip instead of guessing.
  if((reference&&p.from===reference)||(end&&p.to===end)){
    skipped.push({from:p.from,to:p.to,md:p.md,ad:p.ad,reason:'clipped forecast-edge AD; original start/end not supplied'});continue;
  }
  const first=DASHA_ORDER.indexOf(p.ad),order=Array.from({length:9},(_,k)=>DASHA_ORDER[(first+k)%9]);
  let day=a,acc=0;
  for(let k=0;k<9;k++){
   acc+=DASHA_YEARS[order[k]];let next=k===8?b:a+Math.round((b-a)*acc/120);
   next=Math.max(day,Math.min(b,next));if(next>day)segments.push({from:fromDay(day),to:fromDay(next),md:p.md,ad:p.ad,pd:order[k],age:p.age,source:'proportional-from-complete-upstream-AD',approximateDayBoundaries:true,planetYears:DASHA_YEARS[order[k]]});day=next;
  }
 }
 return {segments,skipped,algorithm:'PVR Vimshottari AD -> nine proportional PD; exact day boundary depends on calendar convention'};
}

function ageAt(b,d){if(!valid(b)||!valid(d)||d<b)return null;return +d.slice(0,4)-+b.slice(0,4)-(d.slice(5)<b.slice(5)?1:0);}
function periods(t,sourceBirth){const input=Array.isArray(t?.dasha)?t.dasha:[];const rows=input.filter(validWindow).map(p=>{const md=j().norm(p.md),ad=j().norm(p.ad),pd=j().norm(p.pd||p.pratyantar||p.antaram);return {from:p.from,to:p.to,md,ad,pd,age:ageAt(sourceBirth,p.from),source:'verified dasha intervals',derivedContinuation:!!p.derivedContinuation};}).filter(x=>x.md&&x.ad).sort((a,b)=>a.from.localeCompare(b.from));const distinct=[];
 for(const p of rows){const last=distinct[distinct.length-1];if(last&&last.to===p.from&&last.md===p.md&&last.ad===p.ad&&last.pd===p.pd){last.to=p.to;last.ageSwitch=last.ageSwitch||last.age!==p.age;last.joinedCount=(last.joinedCount||1)+1;}else distinct.push({...p});}
 return distinct;}
function activation(d,c,p){let value=0,links=[];function one(k,scale){if(!k||!d.planets[k])return;const x=d.planets[k];const owns=d.houses.filter(h=>h.lord===k).map(h=>h.no);let n=0;
 if(k===c.lord){n+=6;links.push(k+':rules-'+c.house);}
 if(x.house===c.house){n+=4.5;links.push(k+':occupies-'+c.house);}
 if(c.houseAspects.includes(k)){n+=2.5;links.push(k+':aspects-'+c.house);}
 if(c.otherLordships.includes(x.house)){n+=1.1;links.push(k+':also-related');}
 if(owns.some(h=>[c.house,c.location].includes(h))){n+=1.25;links.push(k+':owns-related');}
 if(x.house===c.location&&k!==c.lord){n+=1.1;links.push(k+':with-ruler-house');}
 value+=n*scale;
 }one(p.md,1);if(p.ad!==p.md)one(p.ad,.88);else value*=1.14;if(p.pd&&p.pd!==p.ad)one(p.pd,.30);return {weight:Math.round(value*100)/100,links};}
function transitYear(t,y,house){const notes=(y?.notes||[]).filter(x=>x&&Number(x.focus)===house&&['Jupiter','Saturn','Rahu','Ketu'].includes(j().norm(x.planet))&&x.evidence?.marks?.length);return notes.map(n=>({planet:j().norm(n.planet),focus:house,marks:n.evidence.marks,signal:Number(n.evidence.signal)||0,yearFrom:y.from,yearTo:y.to,observedOn:y.date,score:((n.strength||0)*2)+Math.abs(Number(n.evidence.signal)||0),source:'upstream Swiss transit reading',textEvidence:n.text})).sort((a,b)=>b.score-a.score);}
function inPeriod(y,p){return y.from<p.to&&y.to>p.from;}
function linkedTransits(t,p,house){return (t?.transitYears||[]).filter(y=>validObservation(y)&&inPeriod(y,p)&&y.date>=p.from&&y.date<p.to).flatMap(y=>transitYear(t,y,house)).sort((a,b)=>b.score-a.score);}
function scoreWindow(d,c,p,t){const base=activation(d,c,p),note=linkedTransits(t,p,c.house)[0]||null;return {...base,period:p,periodPlanetHouses:{md:d.planets[p.md]?.house||null,ad:d.planets[p.ad]?.house||null,pd:p.pd?d.planets[p.pd]?.house||null:null},transit:note,coincidence:!!(note&&base.weight>=3),priority:base.weight+(note?Math.min(1.6,note.score/8):0)};}
function timeline(d,claims,t,birth){const all=periods(t,birth),perHouse=Object.fromEntries(claims.map(c=>[c.house,[]])),chronology=[];
 const calculatedPD=computePD(all,t),pdChronology=[],pdRejected={sameRuler:0,noDistinctEvidence:0};
 // Use upstream-supplied PD dates FIRST; do not turn an independently dated
 // PD into a proportional guess. Derived periods fill only complete ADs
 // where an actual PD is not present.
 const actualPD=all.filter(p=>p.pd&&valid(p.from)&&valid(p.to)).map(p=>({...p,source:'upstream dated PD',approximateDayBoundaries:false}));
 const pdInputs=[...actualPD,...calculatedPD.segments].sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
 for(const p of pdInputs){
   // MD/AD alone already explains this same planet's natal connection;
   // without a third independent trigger, printing another lengthy paragraph
   // would only pad the report with a relabelled repetition.
   if(p.pd===p.md||p.pd===p.ad){pdRejected.sameRuler++;continue;}
   const ranked=claims.map(c=>({claim:c,...scoreWindow(d,c,p,t)})).sort((a,b)=>b.priority-a.priority||a.claim.house-b.claim.house);
   const x=ranked.find(w=>{
     if(w.weight<3||!w.links.some(y=>y.startsWith(p.pd+':')))return false;
     const direct=(w.claim.all||[]).some(e=>e.planet===p.pd&&['lord','occupies','aspects'].includes(e.relation)&&Math.abs(e.delta)>=.16);
     return direct;
   });
   if(!x){pdRejected.noDistinctEvidence++;continue;}
   pdChronology.push({period:p,claim:x.claim,house:x.claim.house,weight:x.weight,links:x.links,transit:x.transit,periodPlanetHouses:x.periodPlanetHouses,thirdRulerWitness:(x.claim.all||[]).filter(e=>e.planet===p.pd)});
 }

 for(const p of all){const ranked=claims.map(c=>({...scoreWindow(d,c,p,t),claim:c})).sort((a,b)=>b.priority-a.priority||a.claim.house-b.claim.house);
 const selected=ranked.filter(x=>x.weight>=2.4).slice(0,3); const chosen=selected.length?selected:ranked.slice(0,1).map(x=>({...x,weakConnection:true}));
 const primary=chosen[0];if(primary.weight>=2.4&&primary.links.length)chronology.push({period:p,mainHouse:primary.claim.house,mainWeight:primary.weight,mainClaim:primary.claim,transit:primary.transit,secondaryHouses:chosen.slice(1).map(x=>x.claim.house),weakConnection:false,evidence:primary.links,periodPlanetHouses:primary.periodPlanetHouses});
 for(const x of selected)perHouse[x.claim.house].push(x);
 }
 for(const [key,rows] of Object.entries(perHouse))perHouse[key]=rows.sort((a,b)=>b.priority-a.priority||a.period.from.localeCompare(b.period.from)).slice(0,3).sort((a,b)=>a.period.from.localeCompare(b.period.from));
 // Every supplied forecast year is kept, but only computed transit notes qualify for judgement.
 const years=(t?.transitYears||[]).filter(validWindow).map(y=>{const ranked=claims.flatMap(c=>transitYear(t,y,c.house).slice(0,1).map(n=>({claim:c,n}))).sort((a,b)=>b.n.score-a.n.score);
 const period=validObservation(y)?all.find(p=>p.from<=y.date&&p.to>y.date)||null:null; // never combine a transit sample with an unrelated earlier/later subperiod
 const linked=period?ranked.find(x=>activation(d,x.claim,period).weight>=2.4):null;
 const selected=linked||null;return {from:y.from,to:y.to,date:y.date,age:ageAt(birth,y.date),year:y.forecastYear,period,house:selected?.claim.house||null,claim:selected?.claim||null,transit:selected?.n||null,confirmedConvergence:!!linked,notesAvailable:(y.notes||[]).length,pass:!!linked,sourceSignature:linked?`${linked.claim.house}/${linked.n.planet}/${period?.md}/${period?.ad}`:null};});
 return {all,perHouse,chronology,years,pdChronology,calculatedPD,meta:{calculatedPDRanges:calculatedPD.segments.length,actualPDWindows:actualPD.length,qualifiedPDWindows:pdChronology.length,skippedPDEdges:calculatedPD.skipped.length,pdFilteredAsRepetitive:pdRejected.sameRuler,pdFilteredNoIndependentEvidence:pdRejected.noDistinctEvidence,actualPeriods:all.length,computedTransitYears:years.filter(x=>x.notesAvailable>0).length,convergedYears:years.filter(x=>x.confirmedConvergence).length,pdAvailable:all.some(x=>x.pd!==null),forecastHorizonYears:t?.meta?.forecastHorizonYears||null,samplesChecked:t?.meta?.samplesChecked||0,periodEnd:all.length?all[all.length-1].to:null}};
}
/* Consecutive annual snapshots are NOT fifteen different events. Keep only
 * independently linked natal+dasha+transit windows, merge same signatures.
 * A change in a period ruler or focused house begins a new window.
 */
function groupYears(years){const out=[];
 for(const y of years){
  if(!y.pass||!y.claim||!y.transit||!y.period){const last=out[out.length-1];
   if(last&&last.kind==='insufficient'&&last.to===y.from){last.to=y.to;last.years++;}
   else out.push({kind:'insufficient',from:y.from,to:y.to,years:1});continue;}
  // A transit year can straddle an AD boundary. Its event window must be
  // constrained to the actual MD/AD intersection, never to the full year.
  const eventFrom=y.from>y.period.from?y.from:y.period.from;
  const eventTo=y.to<y.period.to?y.to:y.period.to;
  if(eventTo<=eventFrom)continue;
  const signature=`${y.claim.house}:${y.claim.conclusion}:${y.claim.location}:${y.period.md}:${y.period.ad}:${y.transit.planet}`;
  const last=out[out.length-1];
  // Only truly adjacent intervals with SAME MD/AD, life focus and sampled
  // transit may be merged; non-adjacent recurrences remain separate windows.
  if(last&&last.kind==='event'&&last.signature===signature&&last.to===eventFrom){
   last.to=eventTo;last.years++;last.samples.push(y.date);last.observations.push(y.transit.signal);
  }else out.push({kind:'event',signature,from:eventFrom,to:eventTo,years:1,
   focusHouse:y.house,claim:y.claim,period:y.period,transit:y.transit,
   samples:[y.date],observations:[y.transit.signal],age:y.age,recurrences:[]});
 }
 return out;
}

return Object.freeze({timeline,ageAt,periods,activation,transitYear,groupYears,computePD});
});

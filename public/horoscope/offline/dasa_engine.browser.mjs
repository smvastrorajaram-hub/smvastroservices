// Browser port of the exact V10.7 source logic.
import { pvrLongevitySodhyaTiming } from './pvr-longevity-sodhya-timing.browser.mjs';


const RASI_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const RASI_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const PLANET_EN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const PLANET_TA=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
const OWN={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
const EXALT={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
const DEBIL={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
const NAR_TABLE=[
 [['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'],['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'],['Ar','Pi','Aq','Cp','Sg','Sc','Li','Vi','Le','Cn','Ge','Ta']],
 [['Ta','Sg','Cn','Aq','Vi','Ar','Sc','Ge','Cp','Le','Pi','Li'],['Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar'],['Ta','Li','Pi','Le','Cp','Ge','Sc','Ar','Vi','Aq','Cn','Sg']],
 [['Ge','Aq','Li','Vi','Ta','Cp','Sg','Le','Ar','Pi','Sc','Cn'],['Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta'],['Ge','Li','Aq','Pi','Cn','Sc','Sg','Ar','Le','Vi','Cp','Ta']],
 [['Cn','Ge','Ta','Ar','Pi','Aq','Cp','Sg','Sc','Li','Vi','Le'],['Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge'],['Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge']],
 [['Le','Cp','Ge','Sc','Ar','Vi','Aq','Cn','Sg','Ta','Li','Pi'],['Le','Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn'],['Le','Pi','Li','Ta','Sg','Cn','Aq','Vi','Ar','Sc','Ge','Cp']],
 [['Vi','Cp','Ta','Ge','Li','Aq','Pi','Cn','Sc','Sg','Ar','Le'],['Vi','Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le'],['Vi','Ta','Cp','Sg','Le','Ar','Pi','Sc','Cn','Ge','Aq','Li']],
 [['Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi'],['Li','Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi'],['Li','Vi','Le','Cn','Ge','Ta','Ar','Pi','Aq','Cp','Sg','Sc']],
 [['Sc','Ge','Cp','Le','Pi','Li','Ta','Sg','Cn','Aq','Vi','Ar'],['Sc','Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi','Li'],['Sc','Ar','Vi','Aq','Cn','Sg','Ta','Li','Pi','Le','Cp','Ge']],
 [['Sg','Le','Ar','Pi','Sc','Cn','Ge','Aq','Li','Vi','Ta','Cp'],['Sg','Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi','Li','Sc'],['Sg','Ar','Le','Vi','Cp','Ta','Ge','Li','Aq','Pi','Cn','Sc']],
 [['Cp','Sg','Sc','Li','Vi','Le','Cn','Ge','Ta','Ar','Pi','Aq'],['Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg'],['Cp','Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg']],
 [['Aq','Cn','Sg','Ta','Li','Pi','Le','Cp','Ge','Sc','Ar','Vi'],['Aq','Pi','Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp'],['Aq','Vi','Ar','Sc','Ge','Cp','Le','Pi','Li','Ta','Sg','Cn']],
 [['Pi','Cn','Sc','Sg','Ar','Le','Vi','Cp','Ta','Ge','Li','Aq'],['Pi','Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq'],['Pi','Sc','Cn','Ge','Aq','Li','Vi','Ta','Cp','Sg','Le','Ar']]
];
const SHORT={Ar:0,Ta:1,Ge:2,Cn:3,Le:4,Vi:5,Li:6,Sc:7,Sg:8,Cp:9,Aq:10,Pi:11};
const SHORT_BY_INDEX=['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'];
const KENDRA=[0,3,6,9],PANAPHARA=[1,4,7,10],APOKLIMA=[2,5,8,11];
const KC_GROUPS={
 savya1:[['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg'],['Cp','Aq','Pi','Sc','Li','Vi','Cn','Le','Ge'],['Ta','Ar','Pi','Aq','Cp','Sg','Ar','Ta','Ge'],['Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi']],
 savya2:[['Sc','Li','Vi','Cn','Le','Ge','Ta','Ar','Pi'],['Aq','Cp','Sg','Ar','Ta','Ge','Cn','Le','Vi'],['Li','Sc','Sg','Cp','Aq','Pi','Sc','Li','Vi'],['Cn','Le','Ge','Ta','Ar','Pi','Aq','Cp','Sg']],
 apasavya1:[['Sg','Cp','Aq','Pi','Ar','Ta','Ge','Le','Cn'],['Vi','Li','Sc','Pi','Aq','Cp','Sg','Sc','Li'],['Vi','Le','Cn','Ge','Ta','Ar','Sg','Cp','Aq'],['Pi','Ar','Ta','Ge','Le','Cn','Vi','Li','Sc']],
 apasavya2:[['Pi','Aq','Cp','Sg','Sc','Li','Vi','Le','Cn'],['Ge','Ta','Ar','Sg','Cp','Aq','Pi','Ar','Ta'],['Ge','Le','Cn','Vi','Li','Sc','Pi','Aq','Cp'],['Sg','Sc','Li','Vi','Le','Cn','Ge','Ta','Ar']]
};
const KC_META={savya1:[100,85,83,86],savya2:[100,85,83,86],apasavya1:[86,83,85,100],apasavya2:[86,83,85,100]};
const KC_OWNER_YEARS={Ar:7,Sc:7,Ta:16,Li:16,Ge:9,Vi:9,Sg:10,Pi:10,Le:5,Cn:21,Cp:4,Aq:4};
const ASHT_ARCS=[{start:66+40/60,end:120,planet:'Sun',years:6},{start:120,end:160,planet:'Moon',years:15},{start:160,end:213+20/60,planet:'Mars',years:8},{start:213+20/60,end:253+20/60,planet:'Mercury',years:17},{start:253+20/60,end:293+20/60,planet:'Saturn',years:10},{start:293+20/60,end:333+20/60,planet:'Jupiter',years:19},{start:333+20/60,end:386+40/60,planet:'Rahu',years:12},{start:26+40/60,end:66+40/60,planet:'Venus',years:21}];
const ASHT_ORDER=['Sun','Moon','Mars','Mercury','Saturn','Jupiter','Rahu','Venus'];

function mod12(n){return ((n%12)+12)%12;}
function rasiIndex(lon){if(lon===null||lon===undefined||String(lon).trim()===''||!Number.isFinite(Number(lon)))throw new Error('Planetary longitude unavailable for Rasi Dasa');return mod12(Math.floor(((Number(lon)%360+360)%360)/30));}
function degInSign(lon){if(lon===null||lon===undefined||String(lon).trim()===''||!Number.isFinite(Number(lon)))throw new Error('Planetary longitude unavailable for Rasi Dasa');return ((Number(lon)%30+30)%30);}
function oddSign(i){return [0,2,4,6,8,10].includes(i);}
function oddFootedSign(i){return [0,1,2,6,7,8].includes(mod12(i));}
function signCode(i){return SHORT_BY_INDEX[mod12(i)];}
function parseSign(v){if(typeof v==='number'&&v>=0&&v<12)return v;const s=String(v||'').trim().toLowerCase();const m={ar:0,aries:0,மேஷம்:0,ta:1,taurus:1,ரிஷபம்:1,ge:2,gemini:2,மிதுனம்:2,cn:3,cancer:3,கடகம்:3,le:4,leo:4,சிம்மம்:4,vi:5,virgo:5,கன்னி:5,li:6,libra:6,துலாம்:6,sc:7,scorpio:7,விருச்சிகம்:7,sg:8,sagittarius:8,தனுசு:8,cp:9,capricorn:9,மகரம்:9,aq:10,aquarius:10,கும்பம்:10,pi:11,pisces:11,மீனம்:11};return m[s]??-1;}
function planetKey(v){const s=String(v||'').trim();const m={'சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu'};return m[s]||s;}
function getPlanets(chart){const out={};for(const p of (chart?.planets||[])){const k=planetKey(p.name);out[k]={...p,sign:rasiIndex(p.longitude),degree:degInSign(p.longitude)};}return out;}
function ownLord(sign, planets){const owners=sign===0?['Mars']:sign===1?['Venus']:sign===2?['Mercury']:sign===3?['Moon']:sign===4?['Sun']:sign===5?['Mercury']:sign===6?['Venus']:sign===7?['Mars','Ketu']:sign===8?['Jupiter']:sign===9?['Saturn']:sign===10?['Saturn','Rahu']:['Jupiter'];
 if(owners.length===1)return owners[0];
 const scores=owners.map(pl=>{const p=planets[pl];let s=p?1:0;if(p&&EXALT[pl]===p.sign)s+=3;if(p&&DEBIL[pl]===p.sign)s-=2;if(p&&[0,2,4,6,8,10].includes(p.sign))s+=0.25;return {pl,s};}).sort((a,b)=>b.s-a.s);return scores[0]?.pl||owners[0];}
function occupiedCount(sign,planets){return Object.values(planets).filter(p=>p.sign===sign).length;}
function signStrength(sign,planets){let s=occupiedCount(sign,planets)*10;const l=ownLord(sign,planets),p=planets[l];if(p){s+=5;if(EXALT[l]===p.sign)s+=20;if(DEBIL[l]===p.sign)s-=10;s+=Math.max(0,15-p.degree)/15;}return s+(sign===4?1:0);}
function strongerSign(a,b,planets){if(a<0)return b;if(b<0)return a;const sa=signStrength(a,planets),sb=signStrength(b,planets);if(Math.abs(sa-sb)>1e-9)return sa>sb?a:b;return occupiedCount(a,planets)>=occupiedCount(b,planets)?a:b;}
function rasiAspects(sign){const movable=[0,3,6,9],fixed=[1,4,7,10],dual=[2,5,8,11];if(movable.includes(sign))return fixed.filter(x=>x!==mod12(sign+1));if(fixed.includes(sign))return movable.filter(x=>x!==mod12(sign-1));return dual.filter(x=>x!==sign);}
function narayanaLengthDetail(sign,planets){const si=parseSign(sign);if(si<0)throw new RangeError('Invalid Narayana Dasa sign: '+sign);const lord=ownLord(si,planets),p=planets[lord];if(!p)return {sign:si,lord:null,count:null,baseYears:1,adjustedYears:1,years:1,capped:false};let count;if(oddFootedSign(si))count=mod12(p.sign-si)+1;else count=mod12(si-p.sign)+1;let base=count-1;if(count===1)base=12;let adjusted=base;if(EXALT[lord]===p.sign)adjusted+=1;if(DEBIL[lord]===p.sign)adjusted-=1;const years=Math.min(12,Math.max(0,adjusted));return {sign:si,lord,count,baseYears:base,adjustedYears:adjusted,years,capped:years!==adjusted};}
function narayanaLength(sign,planets){return narayanaLengthDetail(sign,planets).years;}
function progressionByTable(seed,planets){const s=signCode(seed);let mode=0;if(planets.Saturn?.sign===seed)mode=1;else if(planets.Ketu?.sign===seed)mode=2;const row=NAR_TABLE[seed][mode];return row.map(x=>SHORT[x]);}
function addYears(date,years){return new Date(date.getTime()+Number(years||0)*365.2425*86400000);}
function fmt(d){return isNaN(d?.getTime?.())?'—':d.toISOString().slice(0,10);}
function periodRows(order,lengthFn,startDate,firstFraction=1,cycles=1){let cur=new Date(startDate),rows=[];for(let c=0;c<cycles;c++){for(let i=0;i<order.length;i++){const sign=order[i],full=Number(lengthFn(sign,i,c)||0),years=(c===0&&i===0)?full*firstFraction:full;const st=new Date(cur),en=addYears(st,years);rows.push({rasi:sign,years,start:fmt(st),end:fmt(en),fullYears:full,cycle:c+1});cur=en;}}return rows;}
function equalRasiSubs(md,order,lengthFn){const each=md.years/12;let cur=new Date(md.start+'T00:00:00Z');return order.map(r=>{const st=new Date(cur),en=addYears(st,each);cur=en;return {rasi:r,years:each,start:fmt(st),end:fmt(en)};});}
function narayanaSubOrder(dasaRasi,planets){const ds=parseSign(dasaRasi);if(ds<0)throw new RangeError('Invalid Narayana Antardasa Dasa sign: '+dasaRasi);const seed=strongerSign(ds,mod12(ds+6),planets);const lord=ownLord(seed,planets),p=planets[lord];let start=p?.sign??seed;let dir=oddSign(start)?1:-1;if(planets.Saturn?.sign===seed)dir=1;if(planets.Ketu?.sign===seed)dir*=-1;return Array.from({length:12},(_,i)=>mod12(start+i*dir));}
function addSubperiods(rows,orderFn,count){return rows.map(md=>{const order=orderFn(md.rasi).slice(0,count);let cur=new Date(md.start+'T00:00:00Z');const each=md.years/count;const subs=order.map(r=>{const st=new Date(cur),en=addYears(st,each);cur=en;return {rasi:r,years:each,start:fmt(st),end:fmt(en)};});return {...md,antardasas:subs};});}
function ashtottariApplicabilityAudit(chart,planets){
 const lagna=Number.isFinite(Number(chart?.lagna?.longitude))?rasiIndex(chart.lagna.longitude):-1;
 const lagnaLords=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 const lagnaLord=lagna>=0?lagnaLords[lagna]:null;
 const rahu=planets.Rahu;
 const lord=lagnaLord?planets[lagnaLord]:null;
 const qualifiesHouses=[1,4,5,7,9,10];
 let rule2='unknown',houseFromLagnaLord=null,rahuInLagna=null;
 if(lagna>=0&&rahu&&Number.isFinite(rahu.sign)){
  rahuInLagna=rahu.sign===lagna;
  if(!rahuInLagna&&lord&&Number.isFinite(lord.sign)){
   houseFromLagnaLord=mod12(rahu.sign-lord.sign)+1;
   rule2=qualifiesHouses.includes(houseFromLagnaLord)?'met':'not_met';
  }else rule2=rahuInLagna?'not_met':'unknown';
 }
 const moon=Number(planets.Moon?.longitude),sun=Number(planets.Sun?.longitude);
 const elongation=Number.isFinite(moon)&&Number.isFinite(sun)?((moon-sun)%360+360)%360:null;
 const paksha=elongation==null?null:(elongation<180?'Shukla':'Krishna');
 return {
  status:'UNRESOLVED_NO_INTERPRETATION_SELECTED',
  source:'P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach, §17.2.3, printed pp. 197–198',
  selectedInterpretation:null,
  views:[
   {id:'universal',status:'alternative_view_not_selected',rule:'Applicable in all charts.'},
   {id:'rahu_from_lagna_lord',status:rule2,rule:'Rahu must not be in Lagna and must be in a quadrant or trine from Lagna lord.',rahuInLagna,lagnaLord,rahuHouseFromLagnaLord:houseFromLagnaLord,qualifyingHouses},
   {id:'day_night_paksha',status:'not_evaluated',rule:'Daytime birth in Krishna paksha or nighttime birth in Shukla paksha.',birthTimeAvailable:Boolean(chart?.birth?.time||chart?.birthTime||chart?.time),paksha,lunarElongationDegrees:elongation,reason:'The Dasa engine has not independently verified local sunrise/sunset and day/night classification; do not infer applicability from the date/time alone.'}
  ],
  policy:'Calculate as a clearly labelled reference only. Do not mark applicability PASS while classical interpretations conflict and no interpretation has been selected.'
 };
}
function ashtottari(chart,startDate){
 const p=getPlanets(chart),moon=p.Moon?.longitude;
 if(!Number.isFinite(moon))return {available:false,reason:'Moon longitude unavailable'};
 let L=((moon%360)+360)%360,z=L<26+40/60?L+360:L;
 const arc=ASHT_ARCS.find(a=>z>=a.start&&z<a.end);
 if(!arc)return {available:false,reason:'Moon longitude did not match a Table 39 arc'};
 const frac=(arc.end-z)/(arc.end-arc.start),elapsedYears=arc.years*(1-frac);
 const idx=ASHT_ORDER.indexOf(arc.planet),seq=Array.from({length:8},(_,i)=>ASHT_ORDER[(idx+i)%8]);
 let cur=new Date(startDate),rows=[];
 seq.forEach((pl,i)=>{
  const fullYears=ASHT_ARCS.find(a=>a.planet===pl).years,years=i===0?fullYears*frac:fullYears;
  const st=new Date(cur),en=addYears(st,years);
  rows.push({lord:pl,years,fullYears,start:fmt(st),end:fmt(en),partialAtBirth:i===0,elapsedBeforeBirthYears:i===0?elapsedYears:0});
  cur=en;
 });
 const subs=rows.map((md,i)=>{
  const stIdx=seq.indexOf(md.lord),ords=Array.from({length:8},(_,j)=>seq[(stIdx+1+j)%8]);
  const fullMdYears=md.fullYears;
  const wholeDurations=ords.map(pl=>fullMdYears*(ASHT_ARCS.find(a=>a.planet===pl).years/108));
  let elapsed= i===0 ? elapsedYears : 0, passed=0, c=new Date(md.start+'T00:00:00Z');
  const antardasas=[];
  for(let j=0;j<ords.length;j++){
   const whole=wholeDurations[j],endOffset=passed+whole;
   if(i===0&&endOffset<=elapsed+1e-10){passed=endOffset;continue;}
   const elapsedInThis=Math.max(0,elapsed-passed);
   const years=Math.max(0,whole-elapsedInThis);
   if(years>1e-10){
    const s=new Date(c),e=addYears(s,years);
    antardasas.push({lord:ords[j],years,fullYears:whole,start:fmt(s),end:fmt(e),partialAtBirth:i===0&&elapsedInThis>0});
    c=e;
   }
   passed=endOffset;
  }
  return {...md,antardasas};
 });
 return {available:true,title:'Ashtottari Dasa',cycleYears:108,firstLord:arc.planet,birthBalanceFraction:frac,elapsedBeforeBirthYears:elapsedYears,sequence:subs,applicability:'Unresolved: §17.2.3 presents three different interpretations; this is a reference calculation, not a certified applicability decision.',applicabilityAudit:ashtottariApplicabilityAudit(chart,p),sourceOracle:{section:'§17.2.1–17.2.3',printedPages:'196–198',table:'Table 39',example:'Example 59'}};
}
function narayana(chart,startDate){const p=getPlanets(chart),lagna=Number.isFinite(chart?.lagna?.longitude)?rasiIndex(chart.lagna.longitude):-1;if(lagna<0)return {available:false,reason:'Lagna unavailable'};const seed=strongerSign(lagna,mod12(lagna+6),p);const order=progressionByTable(seed,p);const details=order.map(code=>narayanaLengthDetail(code,p));let rows=periodRows(order,(s,_i,cycle)=>{const first=narayanaLengthDetail(s,p).years;return cycle===0?first:12-first;},startDate,1,2);const sourceWarnings=details.filter(d=>d.capped).map(d=>({rasi:d.sign,lord:d.lord,baseYears:d.baseYears,uncappedYears:d.adjustedYears,firstCycleYears:d.years,secondCycleYears:12-d.years,resolution:'The printed PVR rule sequence would produce more than 12 years (most clearly Mercury in Virgo: 12 + 1). A 12-year maximum is applied from Sanjay Rath, Narayana Dasa, printed p. 42, which explicitly discusses this exact Mercury-in-Virgo case. This is an inter-source reconciliation; it is not stated in the supplied PVR page itself.',sourceUrl:'https://scienceoflight.net/wp-content/uploads/extra/Narayana%20Dasa%20by%20Sanjay%20Rath.pdf'}));rows=addSubperiods(rows,r=>narayanaSubOrder(r,p),12);return {available:true,title:'Narayana Dasa',seed,sequence:rows,sourceWarnings,method:'PVR Table 40 sequence and §18.2.2 second-cycle rule; sign duration capped at 12 years using the explicit alternative Narayana Dasa source rule (Sanjay Rath, printed p. 42) for PVR’s contradictory 13-year case.'};}
function kendradi(chart,startDate,seedOverride,sree=false){const p=getPlanets(chart),lagna=rasiIndex(chart.lagna?.longitude);const seed=seedOverride>=0?seedOverride:strongerSign(lagna,mod12(lagna+6),p);let dir=oddSign(sree?seed:lagna)?1:-1;if(p.Saturn?.sign===seed)dir=1;if(p.Ketu?.sign===seed)dir*=-1;const offs=[0,3,6,9,1,4,7,10,2,5,8,11];const order=offs.map(o=>mod12(seed+o*dir));const slDeg=degInSign(chart.__sreeLagnaLongitude||0);const frac=sree?Math.max(0,(30-slDeg)/30):1;const rows=periodRows(order,(sg,_i,cycle)=>{const first=narayanaLength(sg,p);return cycle===0?first:12-first;},startDate,frac,2);return {available:true,title:sree?'Sudasa':'Lagna Kendradi Rasi Dasa',seed,sequence:rows,firstFraction:frac,method:'Rasi durations use Narayana Dasa rules; second-cycle sign length is 12 minus first-cycle length (§19.2/§20.2).'};}
function drigdasa(chart,startDate){
 const p=getPlanets(chart),lagna=rasiIndex(chart.lagna?.longitude);
 const groups=[mod12(lagna+8),mod12(lagna+9),mod12(lagna+10)],groupSequences=[],order=[];
 for(const g of groups){
  const dir=oddFootedSign(g)?1:-1,candidates=[g,...rasiAspects(g)],seen=[];
  for(let step=0;step<12&&seen.length<4;step++){const x=mod12(g+step*dir);if(candidates.includes(x)&&!seen.includes(x))seen.push(x);}
  if(seen.length!==4)throw new Error('Drigdasa source rule requires each 9th/10th/11th-house group to contain the house sign and exactly three aspected signs; got '+seen.length+' for '+signCode(g));
  groupSequences.push(seen.slice());
  order.push(...seen);
 }
 if(order.length!==12||new Set(order).size!==12)throw new Error('Drigdasa source-rule groups did not partition all 12 rasis exactly once: '+order.map(signCode).join(','));
 const sequence=periodRows(order,(sg,_i,cycle)=>{const first=narayanaLength(sg,p);return cycle===0?first:12-first;},startDate,1,2);
 return {available:true,title:'Drigdasa',seed:groups[0],sequence,groups,groupSequences,method:'PVR §21.2, Example 80: group 1 = 9th house plus its three aspects; group 2 = 10th house plus its three aspects; group 3 = 11th house plus its three aspects. Within each group count forward for odd-footed signs and backward for even-footed signs. No arbitrary fill-in or deduplication is permitted.'};
}
function niryaanaShoola(chart,startDate){const p=getPlanets(chart),lagna=rasiIndex(chart.lagna?.longitude),a=mod12(lagna+1),b=mod12(lagna+7),seed=strongerSign(a,b,p);let dir=oddSign(seed)?1:-1;if(p.Saturn?.sign===seed)dir=1;const order=Array.from({length:12},(_,i)=>mod12(seed+i*dir));return {available:true,title:'Niryaana Shoola Dasa',seed,sequence:addSubperiods(periodRows(order,s=>[0,3,6,9].includes(s)?7:[1,4,7,10].includes(s)?8:9,startDate),r=>narayanaSubOrder(r,p),12),note:'PVR §22: stronger of 2nd/8th starts the sequence; Saturn-in-seed forward exception is applied per Example 87. Antardasa follows the author’s Narayana-style suggestion.'};}
function shoola(chart,startDate){const p=getPlanets(chart),lagna=rasiIndex(chart.lagna?.longitude),seed=strongerSign(lagna,mod12(lagna+6),p),order=Array.from({length:12},(_,i)=>mod12(seed+i));return {available:true,title:'Shoola Dasa',seed,sequence:addSubperiods(periodRows(order,()=>9,startDate),r=>{const adSeed=strongerSign(r,mod12(r+6),p);return Array.from({length:12},(_,i)=>mod12(adSeed+i));},12)};}
function sreeLagnaLongitude(chart){const moon=Number(chart.planets?.find(x=>planetKey(x.name)==='Moon')?.longitude),lagna=Number(chart.lagna?.longitude);if(!Number.isFinite(moon)||!Number.isFinite(lagna))return NaN;const nak=13+1/3,adv=((moon%nak)+nak)%nak;return ((lagna+(adv/nak)*360)%360+360)%360;}
function nextKalachakraPosition(group,pada){
 let nextPada=(pada+1)%4,nextGroup=group;
 if(nextPada===0)nextGroup=group==='savya1'?'savya2':group==='savya2'?'savya1':group==='apasavya1'?'apasavya2':'apasavya1';
 return {group:nextGroup,pada:nextPada};
}
function kalachakra(chart,startDate){
 const moon=Number(chart.planets?.find(x=>planetKey(x.name)==='Moon')?.longitude);
 if(!Number.isFinite(moon))return {available:false,reason:'Moon longitude unavailable'};
 const L=((moon%360)+360)%360,nak=Math.floor(L/(13+1/3)),pada=Math.floor((L%(13+1/3))/(3+1/3));
 const savya=[0,1,2,6,7,8,12,13,14,18,19,20,24,25,26].includes(nak);
 const savya1=[0,2,6,8,12,14,18,20,24,26].includes(nak);
 const group=savya?(savya1?'savya1':'savya2'):([3,9,15,21].includes(nak)?'apasavya1':'apasavya2');
 const initialPadaSigns=KC_GROUPS[group][pada],param=KC_META[group][pada];
 const posInPada=(L%(13+1/3))%(3+1/3),elapsed=(posInPada/(3+1/3))*param;
 let cumulative=0,startIndex=-1,remaining=0;
 for(let i=0;i<initialPadaSigns.length;i++){
  const years=KC_OWNER_YEARS[initialPadaSigns[i]];
  if(elapsed<cumulative+years-1e-10){startIndex=i;remaining=years-(elapsed-cumulative);break;}
  cumulative+=years;
 }
 if(startIndex<0)return {available:false,reason:'Kalachakra elapsed years exceeded Table 44–47 paramayush',elapsedYears:elapsed,paramayush:param};
 // Model every rasi as a token tied to its own nakshatra-pada row. This matters
 // when the same rasi recurs and when antardasas cross a pada-row boundary.
 const tokens=[];
 let current={group,pada},first=true;
 while(tokens.length<20){
  const signs=KC_GROUPS[current.group][current.pada],begin=first?startIndex:0;
  for(let i=begin;i<signs.length&&tokens.length<20;i++)tokens.push({rasi:signs[i],group:current.group,pada:current.pada,rowIndex:i,fullYears:KC_OWNER_YEARS[signs[i]]});
  current=nextKalachakraPosition(current.group,current.pada);first=false;
 }
 let cur=new Date(startDate);
 const rows=tokens.slice(0,12).map((token,i)=>{
  const years=i===0?remaining:token.fullYears,st=new Date(cur),en=addYears(st,years);cur=en;
  return {rasi:token.rasi,years,fullYears:token.fullYears,start:fmt(st),end:fmt(en),padaGroup:token.group,pada:token.pada+1,rowIndex:token.rowIndex};
 });
 const withSubs=rows.map((md,i)=>{
  const adTokens=tokens.slice(i,i+9);
  if(adTokens.length!==9)throw new Error('Kalachakra needs 9 continuous rasi tokens for each Antardasa set');
  const weight=adTokens.reduce((sum,t)=>sum+KC_OWNER_YEARS[t.rasi],0);
  if(weight<=0)throw new Error('Invalid Kalachakra Antardasa weighting total');
  let c=new Date(md.start+'T00:00:00Z');
  const antardasas=adTokens.map(t=>{
   const years=md.years*KC_OWNER_YEARS[t.rasi]/weight,s=new Date(c),e=addYears(s,years);c=e;
   return {rasi:t.rasi,years,start:fmt(s),end:fmt(e),padaGroup:t.group,pada:t.pada+1,sourceRowIndex:t.rowIndex};
  });
  return {...md,antardasas};
 });
 return {available:true,title:'Kalachakra Dasa',nakshatraIndex:nak+1,pada:pada+1,group,sequence:withSubs,dehaRasi:initialPadaSigns[0],jeevaRasi:initialPadaSigns[8],paramayush:param,elapsedYearsBeforeBirth:elapsed,birthDasaRemainingYears:remaining,method:'PVR §24.2, Tables 43–48, Examples 95–97: continue through the current pada row and each following pada row; each Antardasa starts at its Mahadasa rasi and takes 9 continuous rasi tokens, crossing to the next pada row as necessary. Weight each Antardasa by Table 48 years for those nine actual signs.'};
}
function phase4Dasa(chart,advancedContext=null){
 const rawDate=chart?.birthDate||chart?.birth?.date||chart?.date;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate||'')))throw new Error('Birth date missing for Phase-4 Rasi Dasa');
 const start=new Date(`${rawDate}T00:00:00Z`);
 if(!Number.isFinite(+start)||start.toISOString().slice(0,10)!==rawDate)throw new Error('Invalid birth date for Phase-4 Rasi Dasa');
 const sl=sreeLagnaLongitude(chart),c=JSON.parse(JSON.stringify(chart));c.__sreeLagnaLongitude=sl;
 const ayurDasa=niryaanaShoola(chart,start),shoolaDasa=shoola(chart,start);
 const pvrResearch=advancedContext?pvrLongevitySodhyaTiming(chart,advancedContext):null;
 const category=pvrResearch?.longevity?.combinedCategory;
 const bands={short:[0,36],middle:[36,72],long:[72,108]};
 if(category&&bands[category]){
  const [bandStart,bandEnd]=bands[category];
  const periodsInBand=(rows)=>{let age=0;const withAges=(rows||[]).map(row=>{const years=Number(row.years??row.fullYears??0),entry={rasi:row.rasi,years,start:row.start,end:row.end,ageStartYears:age,ageEndYears:age+years,overlapsCategoryAgeBand:age<bandEnd&&age+years>bandStart};age+=years;return entry;});return withAges.filter(row=>row.overlapsCategoryAgeBand);};
  pvrResearch.longevity.dasaTiming={
   category,ageBandYears:{start:bandStart,end:bandEnd},
   niryaanaShoola:{periods:periodsInBand(ayurDasa.sequence),rule:'Find the Trishoola sign among Niryaana Shoola Mahadasas whose elapsed-age interval intersects the category band. Rudra/Trishoola selection remains a separate, not fully automated check.'},
   shoola:{periods:periodsInBand(shoolaDasa.sequence),rule:'Use the first/middle/last four fixed 9-year Shoola Mahadasas for short/middle/long category respectively.'},
   researchOnly:true,certified:false,
   caution:'These are age-band/Dasa timing references, not a death prediction. The required Trishoola/AL/maraka corroboration is not automatically certified.'
  };
 }
 return {ashtottari:ashtottari(chart,start),narayana:narayana(chart,start),lagnaKendradi:kendradi(chart,start,-1,false),sudasa:kendradi(c,start,rasiIndex(sl),true),drigdasa:drigdasa(chart,start),niryaanaShoola:ayurDasa,shoola:shoolaDasa,kalachakra:kalachakra(chart,start),pvrResearch,sreeLagnaLongitude:sl};
}
export {phase4Dasa};
